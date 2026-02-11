/**
 * ============================================
 * ISLE AI - REFLECTION SERVICE
 * ============================================
 *
 * Intelligent recommendation engine with 3-phase reasoning:
 * 1. Intent Understanding - Deep analysis of user's true needs
 * 2. Multi-Criteria Retrieval - Smart search with weighted scoring
 * 3. LLM Reasoning - AI-powered ranking with justification
 *
 * This creates truly intelligent recommendations, not just keyword matching.
 */

import { KnowledgeNode, KnowledgeCategory, ChatMessage } from '../types/chatbot';
import { getKnowledgeBase } from '../data/island-knowledge';
import { loadEmbeddingStore, generateQueryEmbedding, getEmbeddingStore } from './embeddingLoader';

// ============ TYPES ============

export interface EnrichedIntent {
  // Core intent
  primaryIntent: string;
  naturalLanguageIntent: string;

  // Emotional/experiential context
  atmosphere: string[];
  experience: string[];

  // Explicit constraints
  categories: KnowledgeCategory[];
  location: LocationConstraint | null;
  priceRange: PriceConstraint | null;
  timeContext: TimeContext | null;
  groupContext: GroupContext | null;

  // Implicit needs (inferred)
  implicitNeeds: string[];
  mustHaveFeatures: string[];
  niceToHaveFeatures: string[];

  // Search expansion
  searchQueries: string[];
  relatedCategories: KnowledgeCategory[];

  // Confidence
  confidence: number;
}

export interface LocationConstraint {
  name: string;
  district?: string;
  island?: string;
  coordinates?: { lat: number; lng: number };
  radius: number; // km
}

export interface PriceConstraint {
  level: 'budget' | 'mid' | 'upscale' | 'luxury' | 'ultra-luxury';
  flexibility: 'strict' | 'flexible';
}

export interface TimeContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | null;
  dayType: 'weekday' | 'weekend' | null;
  season: 'high' | 'low' | null;
  specific: string | null;
}

export interface GroupContext {
  type: 'solo' | 'couple' | 'family' | 'friends' | 'business' | null;
  size: number | null;
  hasChildren: boolean;
  hasElderly: boolean;
  specialNeeds: string[];
}

export interface ScoredCandidate {
  node: KnowledgeNode;
  scores: {
    semantic: number;
    quality: number;
    features: number;
    location: number;
    diversity: number;
    freshness: number;
    total: number;
  };
  matchedFeatures: string[];
  reasoning?: string;
}

export interface ReflectionResult {
  intent: EnrichedIntent;
  candidates: ScoredCandidate[];
  topRecommendations: ReasonedRecommendation[];
  discoverAlso: DiscoverySuggestion[];
  mapFocus: MapFocus | null;
}

export interface ReasonedRecommendation {
  place: KnowledgeNode;
  ranking: number;
  reasoning: string;
  highlights: string[];
  matchScore: number;
}

export interface DiscoverySuggestion {
  place: KnowledgeNode;
  reason: string;
  connectionToQuery: string;
  category: string;
}

export interface MapFocus {
  center: { lat: number; lng: number };
  zoom: number;
  bounds?: { ne: { lat: number; lng: number }; sw: { lat: number; lng: number } };
  highlightIds: string[];
}

// ============ CONFIGURATION ============

const CONFIG = {
  // Scoring weights (must sum to 1.0)
  weights: {
    semantic: 0.35,
    quality: 0.20,
    features: 0.20,
    location: 0.15,
    diversity: 0.05,
    freshness: 0.05
  },

  // Retrieval settings
  retrieval: {
    initialCandidates: 80,      // Broad initial search
    afterFiltering: 50,          // After basic filters
    forReasoning: 25,            // Send to LLM for reasoning
    finalRecommendations: 8,     // Top recommendations
    discoverySuggestions: 4      // "Discover Also" items
  },

  // Quality thresholds
  thresholds: {
    minSemanticScore: 0.25,
    minQualityRating: 3.5,
    minTotalScore: 0.4
  }
};

// ============ LOCATION DATABASE ============

const LOCATIONS: Record<string, LocationConstraint> = {
  'seven mile beach': { name: 'Seven Mile Beach', district: 'Seven Mile Beach', island: 'Grand Cayman', coordinates: { lat: 19.335, lng: -81.385 }, radius: 3 },
  'george town': { name: 'George Town', district: 'George Town', island: 'Grand Cayman', coordinates: { lat: 19.295, lng: -81.381 }, radius: 2 },
  'west bay': { name: 'West Bay', district: 'West Bay', island: 'Grand Cayman', coordinates: { lat: 19.375, lng: -81.405 }, radius: 3 },
  'rum point': { name: 'Rum Point', district: 'North Side', island: 'Grand Cayman', coordinates: { lat: 19.365, lng: -81.260 }, radius: 2 },
  'camana bay': { name: 'Camana Bay', district: 'Camana Bay', island: 'Grand Cayman', coordinates: { lat: 19.328, lng: -81.378 }, radius: 1 },
  'stingray city': { name: 'Stingray City', district: 'North Sound', island: 'Grand Cayman', coordinates: { lat: 19.389, lng: -81.298 }, radius: 1 },
  'east end': { name: 'East End', district: 'East End', island: 'Grand Cayman', coordinates: { lat: 19.300, lng: -81.100 }, radius: 5 },
  'north side': { name: 'North Side', district: 'North Side', island: 'Grand Cayman', coordinates: { lat: 19.350, lng: -81.150 }, radius: 4 },
  'bodden town': { name: 'Bodden Town', district: 'Bodden Town', island: 'Grand Cayman', coordinates: { lat: 19.280, lng: -81.250 }, radius: 4 },
  'cayman brac': { name: 'Cayman Brac', island: 'Cayman Brac', coordinates: { lat: 19.720, lng: -79.800 }, radius: 10 },
  'little cayman': { name: 'Little Cayman', island: 'Little Cayman', coordinates: { lat: 19.680, lng: -80.050 }, radius: 8 },
  'grand cayman': { name: 'Grand Cayman', island: 'Grand Cayman', coordinates: { lat: 19.313, lng: -81.255 }, radius: 25 }
};

// ============ ATMOSPHERE & EXPERIENCE MAPPINGS ============

const ATMOSPHERE_KEYWORDS: Record<string, string[]> = {
  romantic: ['romantic', 'intimate', 'couples', 'honeymoon', 'anniversary', 'date night', 'love', 'propose', 'engagement'],
  family: ['family', 'kids', 'children', 'child-friendly', 'family-friendly', 'toddler', 'baby'],
  adventurous: ['adventure', 'thrill', 'exciting', 'extreme', 'adrenaline', 'daring'],
  relaxing: ['relax', 'peaceful', 'quiet', 'calm', 'tranquil', 'serene', 'unwind', 'zen', 'spa'],
  luxurious: ['luxury', 'upscale', 'premium', 'exclusive', 'vip', 'high-end', 'five star', '5 star', 'finest'],
  authentic: ['local', 'authentic', 'traditional', 'genuine', 'hidden gem', 'off the beaten path', 'secret'],
  vibrant: ['lively', 'vibrant', 'energetic', 'party', 'nightlife', 'fun', 'social'],
  scenic: ['view', 'scenic', 'sunset', 'sunrise', 'panoramic', 'oceanfront', 'beachfront', 'waterfront']
};

const EXPERIENCE_KEYWORDS: Record<string, string[]> = {
  dining: ['eat', 'food', 'restaurant', 'dinner', 'lunch', 'breakfast', 'brunch', 'cuisine', 'meal'],
  beach: ['beach', 'sand', 'shore', 'coast', 'sunbathe', 'tan'],
  water_activities: ['swim', 'snorkel', 'dive', 'diving', 'kayak', 'paddleboard', 'jet ski', 'boat'],
  nightlife: ['bar', 'club', 'nightclub', 'drink', 'cocktail', 'party', 'dance'],
  wellness: ['spa', 'massage', 'wellness', 'yoga', 'meditation', 'health'],
  culture: ['museum', 'history', 'culture', 'art', 'heritage', 'gallery'],
  shopping: ['shop', 'shopping', 'buy', 'boutique', 'store', 'market'],
  nature: ['nature', 'wildlife', 'bird', 'turtle', 'botanical', 'garden', 'hiking', 'trail']
};

// ============ CATEGORY MAPPINGS ============

const CATEGORY_KEYWORDS: Record<KnowledgeCategory, string[]> = {
  restaurant: ['restaurant', 'eat', 'food', 'dining', 'dinner', 'lunch', 'breakfast', 'brunch', 'cuisine', 'chef'],
  hotel: ['hotel', 'stay', 'accommodation', 'resort', 'lodge', 'sleep', 'room', 'suite'],
  villa_rental: ['villa', 'rental', 'vacation home', 'airbnb', 'house rental', 'condo'],
  beach: ['beach', 'sand', 'shore', 'coast', 'bay', 'cove'],
  diving_snorkeling: ['dive', 'diving', 'snorkel', 'snorkeling', 'scuba', 'underwater', 'reef', 'coral'],
  water_sports: ['jet ski', 'kayak', 'paddleboard', 'parasail', 'water sports', 'kiteboard', 'windsurf'],
  boat_charter: ['boat', 'yacht', 'charter', 'sail', 'sailing', 'cruise', 'catamaran'],
  fishing: ['fish', 'fishing', 'deep sea', 'sportfishing', 'angling'],
  bar: ['bar', 'pub', 'cocktail', 'drink', 'lounge', 'nightlife'],
  spa_wellness: ['spa', 'massage', 'wellness', 'facial', 'treatment', 'relaxation'],
  activity: ['activity', 'tour', 'excursion', 'adventure', 'experience'],
  attraction: ['attraction', 'see', 'visit', 'landmark', 'sight', 'museum', 'gallery'],
  shopping: ['shop', 'shopping', 'store', 'boutique', 'mall', 'market', 'buy'],
  nightclub: ['club', 'nightclub', 'dance', 'dj', 'party'],
  golf: ['golf', 'golfing', 'course', 'tee', 'fairway'],
  transport: ['transport', 'taxi', 'car rental', 'shuttle', 'transfer'],
  event: ['event', 'wedding', 'conference', 'meeting', 'venue'],
  concierge: ['concierge', 'service', 'assistant', 'help'],
  private_jet: ['private jet', 'charter flight', 'aviation'],
  real_estate: ['real estate', 'property', 'buy house', 'condo', 'investment property'],
  financial_services: ['bank', 'financial', 'investment', 'fund', 'hedge fund', 'offshore']
};

const RELATED_CATEGORIES: Record<KnowledgeCategory, KnowledgeCategory[]> = {
  restaurant: ['bar', 'hotel', 'beach'],
  hotel: ['restaurant', 'spa_wellness', 'beach', 'activity'],
  beach: ['diving_snorkeling', 'water_sports', 'restaurant', 'bar'],
  diving_snorkeling: ['beach', 'boat_charter', 'water_sports'],
  bar: ['restaurant', 'nightclub', 'hotel'],
  spa_wellness: ['hotel', 'beach', 'activity'],
  activity: ['attraction', 'beach', 'water_sports', 'boat_charter'],
  boat_charter: ['diving_snorkeling', 'fishing', 'beach'],
  villa_rental: ['restaurant', 'beach', 'activity'],
  water_sports: ['beach', 'diving_snorkeling', 'boat_charter'],
  fishing: ['boat_charter', 'restaurant', 'beach'],
  attraction: ['activity', 'restaurant', 'shopping'],
  shopping: ['restaurant', 'attraction', 'spa_wellness'],
  nightclub: ['bar', 'restaurant', 'hotel'],
  golf: ['hotel', 'restaurant', 'spa_wellness'],
  transport: ['hotel', 'activity', 'attraction'],
  event: ['hotel', 'restaurant', 'concierge'],
  concierge: ['hotel', 'activity', 'transport'],
  private_jet: ['hotel', 'concierge', 'transport'],
  real_estate: ['financial_services'],
  financial_services: ['real_estate', 'concierge']
};

// ============ PHASE 1: INTENT UNDERSTANDING ============

/**
 * Deep analysis of user query to understand true intent
 * This is the "thinking" phase - understanding what the user REALLY wants
 */
export async function analyzeIntentDeep(
  query: string,
  conversationHistory: ChatMessage[] = []
): Promise<EnrichedIntent> {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);

  // Extract atmosphere
  const atmosphere: string[] = [];
  for (const [atm, keywords] of Object.entries(ATMOSPHERE_KEYWORDS)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      atmosphere.push(atm);
    }
  }

  // Extract experience type
  const experience: string[] = [];
  for (const [exp, keywords] of Object.entries(EXPERIENCE_KEYWORDS)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      experience.push(exp);
    }
  }

  // Detect categories
  const categories: KnowledgeCategory[] = [];
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      categories.push(cat as KnowledgeCategory);
    }
  }

  // Detect location
  let location: LocationConstraint | null = null;
  for (const [locName, locData] of Object.entries(LOCATIONS)) {
    if (lowerQuery.includes(locName)) {
      location = locData;
      break;
    }
  }

  // Detect price range
  let priceRange: PriceConstraint | null = null;
  if (/cheap|budget|affordable|inexpensive|value|economical/i.test(query)) {
    priceRange = { level: 'budget', flexibility: 'flexible' };
  } else if (/mid-range|moderate|reasonable|average/i.test(query)) {
    priceRange = { level: 'mid', flexibility: 'flexible' };
  } else if (/upscale|nice|quality|good/i.test(query)) {
    priceRange = { level: 'upscale', flexibility: 'flexible' };
  } else if (/luxury|luxurious|premium|exclusive|high-end|finest/i.test(query)) {
    priceRange = { level: 'luxury', flexibility: 'flexible' };
  } else if (/ultra|ultimate|money no object|spare no expense|best of the best/i.test(query)) {
    priceRange = { level: 'ultra-luxury', flexibility: 'strict' };
  }

  // Detect time context
  let timeContext: TimeContext | null = null;
  if (/morning|breakfast|sunrise|early/i.test(query)) {
    timeContext = { timeOfDay: 'morning', dayType: null, season: null, specific: null };
  } else if (/afternoon|lunch|midday/i.test(query)) {
    timeContext = { timeOfDay: 'afternoon', dayType: null, season: null, specific: null };
  } else if (/evening|dinner|sunset|dusk/i.test(query)) {
    timeContext = { timeOfDay: 'evening', dayType: null, season: null, specific: null };
  } else if (/night|late|midnight|after dark/i.test(query)) {
    timeContext = { timeOfDay: 'night', dayType: null, season: null, specific: null };
  }

  // Detect group context
  let groupContext: GroupContext | null = null;
  if (/alone|solo|myself|by myself|just me/i.test(query)) {
    groupContext = { type: 'solo', size: 1, hasChildren: false, hasElderly: false, specialNeeds: [] };
  } else if (/couple|partner|wife|husband|girlfriend|boyfriend|two of us|romantic|date/i.test(query)) {
    groupContext = { type: 'couple', size: 2, hasChildren: false, hasElderly: false, specialNeeds: [] };
  } else if (/family|kids|children|child/i.test(query)) {
    groupContext = { type: 'family', size: null, hasChildren: true, hasElderly: false, specialNeeds: [] };
  } else if (/friends|group|party|team|colleagues/i.test(query)) {
    groupContext = { type: 'friends', size: null, hasChildren: false, hasElderly: false, specialNeeds: [] };
  } else if (/business|client|meeting|corporate/i.test(query)) {
    groupContext = { type: 'business', size: null, hasChildren: false, hasElderly: false, specialNeeds: [] };
  }

  // Infer implicit needs based on atmosphere and experience
  const implicitNeeds: string[] = [];
  if (atmosphere.includes('romantic')) {
    implicitNeeds.push('intimate setting', 'good ambiance', 'quality service', 'reservation recommended');
  }
  if (atmosphere.includes('family')) {
    implicitNeeds.push('child-friendly', 'safe environment', 'casual atmosphere', 'varied menu');
  }
  if (atmosphere.includes('luxurious')) {
    implicitNeeds.push('premium service', 'upscale decor', 'exclusive experience', 'high-end amenities');
  }
  if (atmosphere.includes('relaxing')) {
    implicitNeeds.push('peaceful environment', 'not crowded', 'comfortable seating');
  }
  if (atmosphere.includes('scenic')) {
    implicitNeeds.push('good view', 'outdoor seating', 'photo opportunities');
  }

  // Extract must-have features
  const mustHaveFeatures: string[] = [];
  if (/ocean view|sea view|water view|beach view/i.test(query)) mustHaveFeatures.push('ocean view');
  if (/beachfront|on the beach|beach access/i.test(query)) mustHaveFeatures.push('beachfront');
  if (/pool|swimming pool/i.test(query)) mustHaveFeatures.push('pool');
  if (/outdoor|terrace|patio|al fresco/i.test(query)) mustHaveFeatures.push('outdoor seating');
  if (/private|secluded|exclusive/i.test(query)) mustHaveFeatures.push('private');
  if (/live music|entertainment/i.test(query)) mustHaveFeatures.push('live entertainment');
  if (/vegan|vegetarian|plant-based/i.test(query)) mustHaveFeatures.push('vegan options');
  if (/gluten.free/i.test(query)) mustHaveFeatures.push('gluten-free options');
  if (/wheelchair|accessible|disability/i.test(query)) mustHaveFeatures.push('wheelchair accessible');
  if (/pet|dog|cat/i.test(query)) mustHaveFeatures.push('pet-friendly');
  if (/parking/i.test(query)) mustHaveFeatures.push('parking available');
  if (/wifi|internet/i.test(query)) mustHaveFeatures.push('wifi');

  // Nice-to-have features (inferred)
  const niceToHaveFeatures: string[] = [];
  if (categories.includes('restaurant')) {
    niceToHaveFeatures.push('reservations available', 'good reviews');
  }
  if (atmosphere.includes('romantic')) {
    niceToHaveFeatures.push('candlelight', 'quiet music', 'sunset view');
  }

  // Generate search queries for semantic search
  const searchQueries: string[] = [query];

  // Add enriched search query
  if (atmosphere.length > 0 || experience.length > 0) {
    const enrichedQuery = [
      ...atmosphere.map(a => `${a} atmosphere`),
      ...experience,
      ...categories,
      location?.name || ''
    ].filter(Boolean).join(' ');
    if (enrichedQuery !== query) {
      searchQueries.push(enrichedQuery);
    }
  }

  // Add feature-focused query
  if (mustHaveFeatures.length > 0) {
    searchQueries.push(mustHaveFeatures.join(' ') + ' ' + (categories[0] || ''));
  }

  // Get related categories for discovery
  const relatedCategories: KnowledgeCategory[] = [];
  for (const cat of categories) {
    const related = RELATED_CATEGORIES[cat] || [];
    for (const r of related) {
      if (!categories.includes(r) && !relatedCategories.includes(r)) {
        relatedCategories.push(r);
      }
    }
  }

  // Build natural language intent description
  const parts: string[] = [];
  if (groupContext?.type) parts.push(`for ${groupContext.type}`);
  if (atmosphere.length > 0) parts.push(`${atmosphere.join(', ')} atmosphere`);
  if (categories.length > 0) parts.push(categories.join(', '));
  if (location) parts.push(`near ${location.name}`);
  if (priceRange) parts.push(`${priceRange.level} price range`);
  if (timeContext?.timeOfDay) parts.push(`for ${timeContext.timeOfDay}`);

  const naturalLanguageIntent = parts.length > 0
    ? `Looking ${parts.join(', ')}`
    : 'General exploration of Cayman Islands';

  // Determine primary intent
  let primaryIntent = 'explore';
  if (categories.includes('restaurant') || experience.includes('dining')) {
    primaryIntent = 'dining';
  } else if (categories.includes('hotel') || categories.includes('villa_rental')) {
    primaryIntent = 'accommodation';
  } else if (categories.includes('beach') || experience.includes('beach')) {
    primaryIntent = 'beach';
  } else if (categories.includes('diving_snorkeling') || categories.includes('water_sports')) {
    primaryIntent = 'water_activities';
  } else if (categories.includes('bar') || categories.includes('nightclub')) {
    primaryIntent = 'nightlife';
  } else if (categories.includes('spa_wellness')) {
    primaryIntent = 'wellness';
  } else if (categories.includes('activity') || categories.includes('attraction')) {
    primaryIntent = 'activities';
  }

  // Calculate confidence based on how much we understood
  let confidence = 0.5; // Base confidence
  if (categories.length > 0) confidence += 0.15;
  if (location) confidence += 0.15;
  if (atmosphere.length > 0) confidence += 0.1;
  if (groupContext) confidence += 0.05;
  if (priceRange) confidence += 0.05;
  confidence = Math.min(confidence, 1.0);

  return {
    primaryIntent,
    naturalLanguageIntent,
    atmosphere,
    experience,
    categories,
    location,
    priceRange,
    timeContext,
    groupContext,
    implicitNeeds,
    mustHaveFeatures,
    niceToHaveFeatures,
    searchQueries,
    relatedCategories,
    confidence
  };
}

// ============ PHASE 2: MULTI-CRITERIA RETRIEVAL ============

/**
 * Retrieve candidates with sophisticated multi-criteria scoring
 */
export async function retrieveCandidates(
  intent: EnrichedIntent
): Promise<ScoredCandidate[]> {
  const knowledgeBase = getKnowledgeBase();
  const candidates: ScoredCandidate[] = [];

  // Get semantic scores via embedding search
  const semanticScores = new Map<string, number>();

  try {
    const store = getEmbeddingStore();
    if (store?.isLoaded) {
      // Search with multiple queries and combine scores
      for (const searchQuery of intent.searchQueries) {
        const queryEmbedding = await generateQueryEmbedding(searchQuery);
        if (queryEmbedding) {
          const results = store.searchSimilar(queryEmbedding, CONFIG.retrieval.initialCandidates);
          results.forEach((r, idx) => {
            const existingScore = semanticScores.get(r.id) || 0;
            // Boost earlier queries (original query is most important)
            const queryWeight = 1 - (intent.searchQueries.indexOf(searchQuery) * 0.2);
            semanticScores.set(r.id, Math.max(existingScore, r.score * queryWeight));
          });
        }
      }
    }
  } catch (error) {
    console.warn('[Reflection] Semantic search failed:', error);
  }

  // Score all candidates
  for (const node of knowledgeBase) {
    const scores = calculateMultiCriteriaScore(node, intent, semanticScores.get(node.id) || 0);

    // Skip if below threshold
    if (scores.total < CONFIG.thresholds.minTotalScore) continue;
    if (semanticScores.size > 0 && scores.semantic < CONFIG.thresholds.minSemanticScore) continue;

    // Find matched features
    const matchedFeatures: string[] = [];
    const nodeText = `${node.name} ${node.description || ''} ${(node.highlights || []).join(' ')}`.toLowerCase();

    for (const feature of intent.mustHaveFeatures) {
      if (nodeText.includes(feature.toLowerCase().replace(/[^a-z]/g, ' '))) {
        matchedFeatures.push(feature);
      }
    }

    candidates.push({
      node,
      scores,
      matchedFeatures
    });
  }

  // Sort by total score
  candidates.sort((a, b) => b.scores.total - a.scores.total);

  // Return top candidates
  return candidates.slice(0, CONFIG.retrieval.afterFiltering);
}

/**
 * Calculate multi-criteria score for a candidate
 */
function calculateMultiCriteriaScore(
  node: KnowledgeNode,
  intent: EnrichedIntent,
  semanticScore: number
): ScoredCandidate['scores'] {
  // 1. Semantic Score (from embeddings)
  const semantic = semanticScore;

  // 2. Quality Score (rating + review count)
  let quality = 0;
  const rating = node.ratings?.overall || 0;
  const reviewCount = node.ratings?.reviewCount || 0;

  if (rating >= 4.8) quality = 1.0;
  else if (rating >= 4.5) quality = 0.85;
  else if (rating >= 4.0) quality = 0.7;
  else if (rating >= 3.5) quality = 0.5;
  else quality = 0.3;

  // Boost for many reviews (social proof)
  if (reviewCount >= 500) quality = Math.min(1, quality + 0.15);
  else if (reviewCount >= 100) quality = Math.min(1, quality + 0.1);
  else if (reviewCount >= 50) quality = Math.min(1, quality + 0.05);

  // 3. Feature Match Score
  let features = 0;
  const nodeText = `${node.name} ${node.description || ''} ${(node.highlights || []).join(' ')} ${(node.tags || []).join(' ')}`.toLowerCase();

  // Must-have features
  let mustHaveMatches = 0;
  for (const feature of intent.mustHaveFeatures) {
    const featureTerms = feature.toLowerCase().split(/\s+/);
    if (featureTerms.every(term => nodeText.includes(term))) {
      mustHaveMatches++;
    }
  }
  if (intent.mustHaveFeatures.length > 0) {
    features = mustHaveMatches / intent.mustHaveFeatures.length;
  } else {
    features = 0.5; // Neutral if no specific features required
  }

  // Bonus for nice-to-have features
  for (const feature of intent.niceToHaveFeatures) {
    if (nodeText.includes(feature.toLowerCase())) {
      features = Math.min(1, features + 0.1);
    }
  }

  // Atmosphere match
  for (const atm of intent.atmosphere) {
    if (nodeText.includes(atm)) {
      features = Math.min(1, features + 0.15);
    }
  }

  // 4. Location Score
  let location = 0.5; // Neutral if no location preference

  if (intent.location && node.location?.coordinates) {
    const distance = haversineDistance(
      node.location.coordinates.lat,
      node.location.coordinates.lng,
      intent.location.coordinates!.lat,
      intent.location.coordinates!.lng
    );

    if (distance <= intent.location.radius) {
      location = 1.0; // Perfect match
    } else if (distance <= intent.location.radius * 2) {
      location = 0.7; // Close enough
    } else if (distance <= intent.location.radius * 3) {
      location = 0.4; // Somewhat far
    } else {
      location = 0.1; // Too far, but don't exclude completely
    }
  }

  // 5. Diversity Score (penalize if already shown recently - placeholder)
  const diversity = 1.0; // Will be adjusted based on context

  // 6. Freshness Score (based on data quality)
  let freshness = 0.5;
  if (node.media?.thumbnail) freshness += 0.2;
  if (node.contact?.website) freshness += 0.15;
  if (node.business?.openingHours) freshness += 0.15;
  freshness = Math.min(1, freshness);

  // Calculate weighted total
  const total =
    semantic * CONFIG.weights.semantic +
    quality * CONFIG.weights.quality +
    features * CONFIG.weights.features +
    location * CONFIG.weights.location +
    diversity * CONFIG.weights.diversity +
    freshness * CONFIG.weights.freshness;

  return { semantic, quality, features, location, diversity, freshness, total };
}

/**
 * Haversine distance calculation
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============ PHASE 3: LLM REASONING ============

/**
 * Use LLM to reason about candidates and generate final recommendations
 */
export async function reasonAndRank(
  intent: EnrichedIntent,
  candidates: ScoredCandidate[],
  conversationHistory: ChatMessage[] = []
): Promise<{
  recommendations: ReasonedRecommendation[];
  discoveries: DiscoverySuggestion[];
}> {
  // For now, use algorithmic ranking (can be enhanced with actual LLM call)
  // This is a smart fallback that works without additional API calls

  const recommendations: ReasonedRecommendation[] = [];
  const topCandidates = candidates.slice(0, CONFIG.retrieval.forReasoning);

  for (let i = 0; i < Math.min(topCandidates.length, CONFIG.retrieval.finalRecommendations); i++) {
    const candidate = topCandidates[i];
    const node = candidate.node;

    // Generate reasoning based on scores
    const reasoningParts: string[] = [];

    if (candidate.scores.quality >= 0.8) {
      reasoningParts.push(`Highly rated (${node.ratings?.overall?.toFixed(1)}/5)`);
    }
    if (candidate.scores.location >= 0.8) {
      reasoningParts.push(`Perfect location for your needs`);
    }
    if (candidate.matchedFeatures.length > 0) {
      reasoningParts.push(`Has ${candidate.matchedFeatures.join(', ')}`);
    }
    if (candidate.scores.semantic >= 0.7) {
      reasoningParts.push(`Excellent match for what you're looking for`);
    }

    // Generate highlights
    const highlights: string[] = [];
    if (node.ratings?.overall && node.ratings.overall >= 4.5) {
      highlights.push(`${node.ratings.overall.toFixed(1)}★ rating`);
    }
    if (node.ratings?.reviewCount && node.ratings.reviewCount >= 100) {
      highlights.push(`${node.ratings.reviewCount}+ reviews`);
    }
    if (node.location?.district) {
      highlights.push(node.location.district);
    }
    if (node.business?.priceRange) {
      highlights.push(node.business.priceRange);
    }

    recommendations.push({
      place: node,
      ranking: i + 1,
      reasoning: reasoningParts.join('. ') || 'Great option based on your preferences',
      highlights,
      matchScore: Math.round(candidate.scores.total * 100)
    });
  }

  // Generate discovery suggestions from related categories
  const discoveries: DiscoverySuggestion[] = [];
  const usedIds = new Set(recommendations.map(r => r.place.id));
  const knowledgeBase = getKnowledgeBase();

  for (const relatedCategory of intent.relatedCategories.slice(0, 2)) {
    const relatedPlaces = knowledgeBase
      .filter(n =>
        n.category === relatedCategory &&
        !usedIds.has(n.id) &&
        (n.ratings?.overall || 0) >= 4.0 &&
        n.media?.thumbnail
      )
      .sort((a, b) => (b.ratings?.overall || 0) - (a.ratings?.overall || 0))
      .slice(0, 2);

    for (const place of relatedPlaces) {
      usedIds.add(place.id);

      // Generate connection to original query
      let connection = '';
      if (intent.atmosphere.includes('romantic') && relatedCategory === 'spa_wellness') {
        connection = 'Perfect for a romantic wellness experience';
      } else if (intent.atmosphere.includes('romantic') && relatedCategory === 'bar') {
        connection = 'Great for sunset cocktails together';
      } else if (intent.experience.includes('dining') && relatedCategory === 'bar') {
        connection = 'Perfect for drinks before or after dinner';
      } else if (intent.experience.includes('beach') && relatedCategory === 'diving_snorkeling') {
        connection = 'Explore underwater after beach time';
      } else if (intent.experience.includes('beach') && relatedCategory === 'restaurant') {
        connection = 'Beachside dining to complete your day';
      } else {
        connection = `Complements your ${intent.primaryIntent} experience`;
      }

      discoveries.push({
        place,
        reason: `${place.ratings?.overall?.toFixed(1) || '4.5'}★ ${relatedCategory.replace(/_/g, ' ')}`,
        connectionToQuery: connection,
        category: relatedCategory
      });
    }
  }

  return {
    recommendations,
    discoveries: discoveries.slice(0, CONFIG.retrieval.discoverySuggestions)
  };
}

// ============ MAIN REFLECTION FUNCTION ============

/**
 * Main entry point - performs full 3-phase reflection
 */
export async function reflect(
  query: string,
  conversationHistory: ChatMessage[] = []
): Promise<ReflectionResult> {
  console.log('🧠 [Reflection] Starting deep analysis...');
  const startTime = performance.now();

  // Phase 1: Intent Understanding
  const intent = await analyzeIntentDeep(query, conversationHistory);
  console.log('🎯 [Reflection] Intent:', intent.naturalLanguageIntent);
  console.log('   Categories:', intent.categories.join(', ') || 'general');
  console.log('   Atmosphere:', intent.atmosphere.join(', ') || 'none detected');
  console.log('   Location:', intent.location?.name || 'not specified');
  console.log('   Confidence:', (intent.confidence * 100).toFixed(0) + '%');

  // Phase 2: Multi-Criteria Retrieval
  const candidates = await retrieveCandidates(intent);
  console.log('🔍 [Reflection] Found', candidates.length, 'candidates');

  // Phase 3: Reasoning & Ranking
  const { recommendations, discoveries } = await reasonAndRank(intent, candidates, conversationHistory);
  console.log('✨ [Reflection] Generated', recommendations.length, 'recommendations');
  console.log('💡 [Reflection] Generated', discoveries.length, 'discovery suggestions');

  // Calculate map focus
  let mapFocus: MapFocus | null = null;

  if (recommendations.length > 0) {
    const coords = recommendations
      .map(r => r.place.location?.coordinates)
      .filter((c): c is { lat: number; lng: number } => c != null);

    if (coords.length > 0) {
      if (coords.length === 1) {
        // Single place - zoom in tight
        mapFocus = {
          center: coords[0],
          zoom: 15,
          highlightIds: recommendations.map(r => r.place.id)
        };
      } else {
        // Multiple places - calculate bounds
        const lats = coords.map(c => c.lat);
        const lngs = coords.map(c => c.lng);
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

        // Calculate appropriate zoom based on spread
        const latSpread = Math.max(...lats) - Math.min(...lats);
        const lngSpread = Math.max(...lngs) - Math.min(...lngs);
        const maxSpread = Math.max(latSpread, lngSpread);

        let zoom = 14;
        if (maxSpread > 0.1) zoom = 12;
        if (maxSpread > 0.2) zoom = 11;
        if (maxSpread > 0.4) zoom = 10;

        mapFocus = {
          center: { lat: centerLat, lng: centerLng },
          zoom,
          bounds: {
            ne: { lat: Math.max(...lats) + 0.01, lng: Math.max(...lngs) + 0.01 },
            sw: { lat: Math.min(...lats) - 0.01, lng: Math.min(...lngs) - 0.01 }
          },
          highlightIds: recommendations.map(r => r.place.id)
        };
      }
    }
  } else if (intent.location?.coordinates) {
    // Use intent location if no recommendations
    mapFocus = {
      center: intent.location.coordinates,
      zoom: 13,
      highlightIds: []
    };
  }

  const elapsed = (performance.now() - startTime).toFixed(0);
  console.log(`🧠 [Reflection] Complete in ${elapsed}ms`);

  return {
    intent,
    candidates,
    topRecommendations: recommendations,
    discoverAlso: discoveries,
    mapFocus
  };
}

// ============ EXPORTS ============

export default {
  reflect,
  analyzeIntentDeep,
  retrieveCandidates,
  reasonAndRank
};
