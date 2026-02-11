/**
 * Point Selector Service
 * Intelligently selects which map points to display based on conversation context
 *
 * Features:
 * - Multi-factor scoring algorithm
 * - Semantic similarity from embeddings
 * - Interest-based boosting
 * - Geographic relevance
 * - Quality scoring
 * - Diversity constraints
 */

import { loadEmbeddingStore, isEmbeddingsLoaded, type SimilarityResult } from './embeddingLoader';
import type { ConversationContext } from './contextTracker';
import type { KnowledgeNode, KnowledgeCategory, MapMarker, PriceRange } from '../types/chatbot';

// Types
export interface SelectionConfig {
  maxHighlighted: number;     // Max prominent markers (default: 8)
  maxTotal: number;           // Max total markers (default: 35)
  minSimilarityScore: number; // Min semantic similarity (default: 0.25)
  diversityWeight: number;    // Penalty for same-category clustering (default: 0.15)
  recencyPenalty: number;     // Penalty for recently shown places (default: 0.1)
  enableSemanticSearch: boolean; // Use embeddings if available (default: true)
}

export interface PointSelectionResult {
  markers: MapMarker[];
  highlightedIds: string[];
  clusteredIds: string[];
  focusPoint?: { lat: number; lng: number; zoom: number };
  stats: {
    totalCandidates: number;
    semanticMatches: number;
    interestMatches: number;
    geographicMatches: number;
  };
}

interface ScoredCandidate {
  node: KnowledgeNode;
  semanticScore: number;
  interestScore: number;
  geographicScore: number;
  qualityScore: number;
  diversityPenalty: number;
  recencyPenalty: number;
  totalScore: number;
}

// Default configuration
const DEFAULT_CONFIG: SelectionConfig = {
  maxHighlighted: 8,
  maxTotal: 35,
  minSimilarityScore: 0.2,
  diversityWeight: 0.15,
  recencyPenalty: 0.1,
  enableSemanticSearch: true
};

// Hidden categories that should only appear when explicitly requested
const HIDDEN_CATEGORIES: KnowledgeCategory[] = ['financial_services', 'real_estate'];

// Default categories for when there's no context
const DEFAULT_CATEGORIES: KnowledgeCategory[] = [
  'beach', 'hotel', 'restaurant', 'diving_snorkeling',
  'attraction', 'activity', 'bar', 'spa_wellness'
];

/**
 * Select map points based on conversation context
 */
export async function selectMapPoints(
  context: ConversationContext,
  knowledgeBase: KnowledgeNode[],
  config: Partial<SelectionConfig> = {}
): Promise<PointSelectionResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Filter to valid places with coordinates
  const validPlaces = filterValidPlaces(knowledgeBase, context);

  // Check if we have context to work with
  const hasContext = context.messageCount > 0 ||
    context.interestScores.size > 0 ||
    context.currentEmbedding !== null;

  if (!hasContext) {
    // Return default selection for new sessions
    return getDefaultSelection(validPlaces, cfg);
  }

  // Get semantic similarity scores if embedding is available
  let semanticResults: Map<string, number> = new Map();
  if (cfg.enableSemanticSearch && context.currentEmbedding && isEmbeddingsLoaded()) {
    try {
      const store = await loadEmbeddingStore();
      const results = store.searchSimilar(context.currentEmbedding, 150);
      semanticResults = new Map(results.map(r => [r.id, r.score]));
    } catch (error) {
      console.warn('[PointSelector] Semantic search failed, using interest-based only');
    }
  }

  // Score all candidates
  const scoredCandidates = scoreAllCandidates(
    validPlaces,
    context,
    semanticResults,
    cfg
  );

  // Select with diversity constraint
  const selected = selectWithDiversity(scoredCandidates, cfg);

  // Convert to markers
  const markers = selected.map(s => nodeToMarker(s.node));

  // Split into highlighted and clustered
  const highlightedIds = selected.slice(0, cfg.maxHighlighted).map(s => `marker-${s.node.id}`);
  const clusteredIds = selected.slice(cfg.maxHighlighted).map(s => `marker-${s.node.id}`);

  // Calculate focus point
  const focusPoint = calculateFocusPoint(selected, context);

  return {
    markers,
    highlightedIds,
    clusteredIds,
    focusPoint,
    stats: {
      totalCandidates: validPlaces.length,
      semanticMatches: semanticResults.size,
      interestMatches: scoredCandidates.filter(c => c.interestScore > 0.3).length,
      geographicMatches: scoredCandidates.filter(c => c.geographicScore > 0.5).length
    }
  };
}

/**
 * Filter to valid places with coordinates
 */
function filterValidPlaces(
  knowledgeBase: KnowledgeNode[],
  context: ConversationContext
): KnowledgeNode[] {
  // Determine which categories are allowed
  const hasHiddenInterest = HIDDEN_CATEGORIES.some(
    cat => (context.interestScores.get(cat) || 0) > 0.2
  );

  return knowledgeBase.filter(node => {
    // Must be active
    if (node.isActive === false) return false;

    // Must have valid coordinates
    const lat = node.location?.coordinates?.lat ?? node.location?.latitude;
    const lng = node.location?.coordinates?.lng ?? node.location?.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return false;
    if (isNaN(lat) || isNaN(lng)) return false;

    // Hide professional services unless user has interest
    if (HIDDEN_CATEGORIES.includes(node.category as KnowledgeCategory)) {
      if (!hasHiddenInterest) return false;
      // Only show if user has interest in THIS specific category
      if ((context.interestScores.get(node.category as KnowledgeCategory) || 0) < 0.2) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Score all candidate places
 * PRODUCTION OPTIMIZED: Heavily weights latest conversation context
 */
function scoreAllCandidates(
  places: KnowledgeNode[],
  context: ConversationContext,
  semanticResults: Map<string, number>,
  cfg: SelectionConfig
): ScoredCandidate[] {
  const candidates: ScoredCandidate[] = [];
  const hasSemanticContext = semanticResults.size > 0;

  // Recent place IDs get massive priority boost (these are from latest query)
  const recentPlaceSet = new Set(context.recentPlaceIds.slice(0, 10));

  for (const node of places) {
    // Calculate component scores
    const semanticScore = semanticResults.get(node.id) || 0;
    const interestScore = calculateInterestScore(node, context);
    const geographicScore = calculateGeographicScore(node, context);
    const qualityScore = calculateQualityScore(node);

    // CRITICAL: Recent places from conversation get major boost, not penalty
    const isRecentlyMentioned = recentPlaceSet.has(node.id);
    const recencyBoost = isRecentlyMentioned ? 0.5 : 0;

    // Only penalize if shown many times (stale)
    const showCount = context.recentPlaceIds.filter(id => id === node.id).length;
    const recencyPenalty = showCount > 2 ? cfg.recencyPenalty * (showCount - 2) : 0;

    // Skip if scores are too low (but never skip recently mentioned places)
    const baseScore = Math.max(semanticScore, interestScore * 0.8, geographicScore * 0.6);
    if (!isRecentlyMentioned && baseScore < cfg.minSimilarityScore && qualityScore < 0.5) {
      continue;
    }

    // Weighted combination - PRODUCTION OPTIMIZED
    // Semantic search is king when available, then interest, then geography
    let totalScore: number;

    if (isRecentlyMentioned) {
      // Recently mentioned places get highest priority
      totalScore = 1.0 + recencyBoost + (semanticScore * 0.2) + (qualityScore * 0.1);
    } else if (hasSemanticContext) {
      // Semantic context available - trust the embeddings
      totalScore = (semanticScore * 0.50 +      // Increased semantic weight
                   interestScore * 0.25 +
                   geographicScore * 0.15 +
                   qualityScore * 0.10) - recencyPenalty;
    } else {
      // Fallback to interest-based
      totalScore = (interestScore * 0.50 +
                   geographicScore * 0.30 +
                   qualityScore * 0.20) - recencyPenalty;
    }

    candidates.push({
      node,
      semanticScore,
      interestScore,
      geographicScore,
      qualityScore,
      diversityPenalty: 0, // Calculated later
      recencyPenalty,
      totalScore
    });
  }

  // Sort by total score
  return candidates.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Calculate interest score based on category matching
 */
function calculateInterestScore(node: KnowledgeNode, context: ConversationContext): number {
  let score = 0;

  // Direct category match
  const directScore = context.interestScores.get(node.category as KnowledgeCategory) || 0;
  score += directScore * 0.7;

  // Predicted interest match
  const predictedIndex = context.predictedInterests.indexOf(node.category as KnowledgeCategory);
  if (predictedIndex >= 0) {
    score += (5 - predictedIndex) * 0.1;
  }

  // Subcategory boost for professional services
  if (node.subcategory) {
    const subcat = node.subcategory as KnowledgeCategory;
    const subcatScore = context.interestScores.get(subcat) || 0;
    score += subcatScore * 0.3;
  }

  return Math.min(1, score);
}

/**
 * Calculate geographic relevance score
 */
function calculateGeographicScore(node: KnowledgeNode, context: ConversationContext): number {
  if (!context.geographicFocus) return 0.4; // Neutral if no focus

  const lat = node.location?.coordinates?.lat ?? node.location?.latitude;
  const lng = node.location?.coordinates?.lng ?? node.location?.longitude;
  if (lat === undefined || lng === undefined) return 0;

  // Island match
  if (context.geographicFocus.island) {
    const nodeIsland = node.location?.island || 'Grand Cayman';
    if (nodeIsland.toLowerCase() !== context.geographicFocus.island.toLowerCase()) {
      return 0.1; // Wrong island gets low score
    }
  }

  // Distance from focus coordinates
  if (context.geographicFocus.coordinates) {
    const distance = haversineDistance(
      lat, lng,
      context.geographicFocus.coordinates.lat,
      context.geographicFocus.coordinates.lng
    );

    const radius = context.geographicFocus.radius || 5;

    if (distance <= radius) return 1.0;
    if (distance <= radius * 2) return 0.7;
    if (distance <= radius * 4) return 0.4;
    return 0.15;
  }

  // District match
  if (context.geographicFocus.district) {
    const nodeDistrict = (node.location?.district || node.location?.area || '').toLowerCase();
    const focusDistrict = context.geographicFocus.district.toLowerCase();
    if (nodeDistrict.includes(focusDistrict) || focusDistrict.includes(nodeDistrict)) {
      return 0.9;
    }
  }

  return 0.3;
}

/**
 * Calculate quality score based on ratings and data completeness
 */
function calculateQualityScore(node: KnowledgeNode): number {
  let score = 0;

  // Rating contribution (0-0.4)
  const rating = node.ratings?.overall || 0;
  if (rating >= 4.7) score += 0.4;
  else if (rating >= 4.3) score += 0.3;
  else if (rating >= 4.0) score += 0.2;
  else if (rating >= 3.5) score += 0.1;

  // Review count contribution (0-0.2)
  const reviews = node.ratings?.reviewCount || 0;
  if (reviews > 500) score += 0.2;
  else if (reviews > 100) score += 0.15;
  else if (reviews > 30) score += 0.1;
  else if (reviews > 10) score += 0.05;

  // Data completeness (0-0.2)
  if (node.media?.thumbnail) score += 0.05;
  if (node.contact?.website) score += 0.04;
  if (node.contact?.phone) score += 0.03;
  if (node.description && node.description.length > 100) score += 0.04;
  if (node.shortDescription) score += 0.02;
  if (node.business?.priceRange) score += 0.02;

  // Premium/Featured boost (0-0.2)
  if (node.isFeatured) score += 0.15;
  if (node.isPremium) score += 0.05;

  return Math.min(1, score);
}

/**
 * Select with diversity constraint to avoid category clustering
 */
function selectWithDiversity(
  candidates: ScoredCandidate[],
  cfg: SelectionConfig
): ScoredCandidate[] {
  const selected: ScoredCandidate[] = [];
  const categoryCount = new Map<KnowledgeCategory, number>();

  // Maximum per category scales with total selection
  const maxPerCategory = Math.ceil(cfg.maxTotal / 4);

  for (const candidate of candidates) {
    if (selected.length >= cfg.maxTotal) break;

    const category = candidate.node.category as KnowledgeCategory;
    const catCount = categoryCount.get(category) || 0;

    // Apply diversity penalty
    const diversityPenalty = catCount * cfg.diversityWeight;

    // Skip if category is oversaturated
    if (catCount >= maxPerCategory) continue;

    // Skip if penalty makes score too low
    if (candidate.totalScore - diversityPenalty < cfg.minSimilarityScore * 0.5) {
      continue;
    }

    // Add to selection
    candidate.diversityPenalty = diversityPenalty;
    selected.push(candidate);
    categoryCount.set(category, catCount + 1);
  }

  return selected;
}

/**
 * Calculate optimal focus point for the map camera
 */
function calculateFocusPoint(
  selected: ScoredCandidate[],
  context: ConversationContext
): { lat: number; lng: number; zoom: number } | undefined {
  if (selected.length === 0) return undefined;

  // Use geographic focus if available
  if (context.geographicFocus?.coordinates) {
    const radius = context.geographicFocus.radius || 3;
    const zoom = radius <= 1 ? 16 : radius <= 3 ? 14 : radius <= 5 ? 13 : 12;
    return {
      lat: context.geographicFocus.coordinates.lat,
      lng: context.geographicFocus.coordinates.lng,
      zoom
    };
  }

  // Calculate centroid of top highlighted points
  const topPoints = selected.slice(0, 5);
  let sumLat = 0, sumLng = 0;
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  for (const s of topPoints) {
    const lat = s.node.location?.coordinates?.lat ?? s.node.location?.latitude ?? 0;
    const lng = s.node.location?.coordinates?.lng ?? s.node.location?.longitude ?? 0;
    sumLat += lat;
    sumLng += lng;
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  const centerLat = sumLat / topPoints.length;
  const centerLng = sumLng / topPoints.length;

  // Calculate zoom based on spread
  const latSpread = maxLat - minLat;
  const lngSpread = maxLng - minLng;
  const spread = Math.max(latSpread, lngSpread);

  let zoom = 14;
  if (spread > 0.1) zoom = 11;
  else if (spread > 0.05) zoom = 12;
  else if (spread > 0.02) zoom = 13;
  else if (spread > 0.01) zoom = 14;
  else zoom = 15;

  return { lat: centerLat, lng: centerLng, zoom };
}

/**
 * Convert KnowledgeNode to MapMarker
 */
function nodeToMarker(node: KnowledgeNode): MapMarker {
  const lat = node.location?.coordinates?.lat ?? node.location?.latitude ?? 0;
  const lng = node.location?.coordinates?.lng ?? node.location?.longitude ?? 0;

  return {
    id: `marker-${node.id}`,
    nodeId: node.id,
    latitude: lat,
    longitude: lng,
    title: node.name,
    subtitle: node.shortDescription || node.description?.slice(0, 100),
    category: node.category as KnowledgeCategory,
    thumbnail: node.media?.thumbnail,
    rating: node.ratings?.overall,
    reviewCount: node.ratings?.reviewCount,
    priceRange: node.business?.priceRange as PriceRange,
    address: node.location?.address,
    phone: node.contact?.phone,
    website: node.contact?.website,
    bookingUrl: node.contact?.bookingUrl,
    isActive: true,
    isHighlighted: false
  };
}

/**
 * Get default selection for new sessions
 */
function getDefaultSelection(
  places: KnowledgeNode[],
  cfg: SelectionConfig
): PointSelectionResult {
  const markers: MapMarker[] = [];
  const categoryCount = new Map<KnowledgeCategory, number>();
  const maxPerCategory = 5;

  // Sort by quality
  const sorted = places
    .map(node => ({ node, quality: calculateQualityScore(node) }))
    .sort((a, b) => b.quality - a.quality);

  // Select diverse set from default categories
  for (const { node } of sorted) {
    if (markers.length >= cfg.maxTotal) break;

    const category = node.category as KnowledgeCategory;

    // Skip non-default categories
    if (!DEFAULT_CATEGORIES.includes(category)) continue;

    // Limit per category
    const count = categoryCount.get(category) || 0;
    if (count >= maxPerCategory) continue;

    markers.push(nodeToMarker(node));
    categoryCount.set(category, count + 1);
  }

  return {
    markers,
    highlightedIds: markers.slice(0, cfg.maxHighlighted).map(m => m.id),
    clusteredIds: markers.slice(cfg.maxHighlighted).map(m => m.id),
    focusPoint: {
      lat: 19.313,
      lng: -81.255,
      zoom: 11
    },
    stats: {
      totalCandidates: places.length,
      semanticMatches: 0,
      interestMatches: 0,
      geographicMatches: 0
    }
  };
}

/**
 * Haversine distance calculation (km)
 */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Quick selection for specific place highlight
 */
export function selectForHighlight(
  placeId: string,
  knowledgeBase: KnowledgeNode[],
  currentMarkers: MapMarker[]
): MapMarker | null {
  // Check if already in markers
  const existing = currentMarkers.find(m => m.nodeId === placeId);
  if (existing) return existing;

  // Find in knowledge base
  const node = knowledgeBase.find(n => n.id === placeId);
  if (!node) return null;

  return nodeToMarker(node);
}
