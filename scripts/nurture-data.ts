#!/usr/bin/env npx tsx

/**
 * ============================================
 * ISLE AI - DATA NURTURING PIPELINE
 * Comprehensive data quality, enrichment, and deduplication
 * ============================================
 *
 * Run with: npx tsx scripts/nurture-data.ts
 * Or: npx ts-node --esm scripts/nurture-data.ts
 *
 * This script:
 * 1. Validates all knowledge nodes for required fields and data integrity
 * 2. Enriches missing data (embeddingText, shortDescription, tags)
 * 3. Deduplicates nodes by name similarity
 * 4. Standardizes formats (phone, URLs, categories, islands)
 * 5. Generates quality scores and produces a detailed report
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ TYPES ============

type PriceRange = '$' | '$$' | '$$$' | '$$$$' | '$$$$$';

type KnowledgeCategory =
  | 'hotel' | 'villa_rental' | 'restaurant' | 'bar' | 'nightlife'
  | 'beach' | 'diving_snorkeling' | 'water_sports' | 'boat_charter' | 'superyacht'
  | 'attraction' | 'activity' | 'golf' | 'shopping' | 'spa_wellness' | 'spa' | 'medical_vip'
  | 'transport' | 'transportation' | 'chauffeur' | 'private_jet' | 'flight' | 'luxury_car_rental'
  | 'concierge' | 'vip_escort' | 'security_services' | 'service'
  | 'financial_services' | 'legal_services' | 'real_estate' | 'investment'
  | 'history' | 'culture' | 'wildlife' | 'weather' | 'visa_travel' | 'emergency' | 'general_info'
  | 'event' | 'festival';

interface KnowledgeNode {
  id: string;
  category: KnowledgeCategory | string;
  subcategory?: string;
  name: string;
  description: string;
  shortDescription?: string;
  location: {
    address: string;
    district: string;
    island: string;
    latitude: number;
    longitude: number;
    googlePlaceId?: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    bookingUrl?: string;
    instagram?: string;
    facebook?: string;
    tripadvisor?: string;
  };
  media: {
    thumbnail: string;
    images: string[];
    videos?: string[];
    virtualTour?: string;
  };
  business: {
    priceRange?: PriceRange | string;
    priceFrom?: number | null;
    priceTo?: number | null;
    pricePerUnit?: string | null;
    priceDescription?: string | null;
    currency: string;
    openingHours?: any;
    reservationRequired?: boolean;
    acceptsCreditCards?: boolean;
    languages?: string[];
    serviceOptions?: any;
  };
  ratings: {
    overall: number;
    reviewCount: number;
    tripadvisorRating?: number;
    googleRating?: number;
    sources?: { name: string; rating: number; url: string }[];
  };
  tags: string[];
  keywords: string[];
  embedding?: number[];
  embeddingText?: string;
  nearbyPlaces?: string[];
  relatedServices?: string[];
  partOfItinerary?: string[];
  isActive: boolean;
  isPremium: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  customFields?: Record<string, any>;
}

interface ValidationIssue {
  nodeId: string;
  nodeName: string;
  field: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  autoFixed: boolean;
  oldValue?: any;
  newValue?: any;
}

interface DuplicateGroup {
  canonical: KnowledgeNode;
  duplicates: KnowledgeNode[];
  similarity: number;
  mergedFields: string[];
}

interface QualityScore {
  nodeId: string;
  nodeName: string;
  score: number;
  breakdown: {
    requiredFields: number;
    contactInfo: number;
    mediaContent: number;
    businessInfo: number;
    ratingsReviews: number;
    tagsKeywords: number;
    embeddingQuality: number;
  };
  missingFields: string[];
}

interface NurturingReport {
  timestamp: string;
  summary: {
    totalNodesProcessed: number;
    nodesFixed: number;
    duplicatesRemoved: number;
    averageQualityScore: number;
    nodesNeedingReview: number;
  };
  validationIssues: ValidationIssue[];
  duplicatesFound: DuplicateGroup[];
  qualityScores: QualityScore[];
  scoreDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  remainingIssues: ValidationIssue[];
}

// ============ CONSTANTS ============

const CAYMAN_BOUNDS = {
  north: 19.80,
  south: 19.25,
  east: -79.70,
  west: -81.45
};

const VALID_ISLANDS = ['Grand Cayman', 'Cayman Brac', 'Little Cayman'];

const VALID_CATEGORIES: string[] = [
  'hotel', 'villa_rental', 'restaurant', 'bar', 'nightlife',
  'beach', 'diving_snorkeling', 'water_sports', 'boat_charter', 'superyacht',
  'attraction', 'activity', 'golf', 'shopping', 'spa_wellness', 'spa', 'medical_vip',
  'transport', 'transportation', 'chauffeur', 'private_jet', 'flight', 'luxury_car_rental',
  'concierge', 'vip_escort', 'security_services', 'service',
  'financial_services', 'legal_services', 'real_estate', 'investment',
  'history', 'culture', 'wildlife', 'weather', 'visa_travel', 'emergency', 'general_info',
  'event', 'festival'
];

const CATEGORY_TAG_MAP: Record<string, string[]> = {
  hotel: ['accommodation', 'lodging', 'stay'],
  villa_rental: ['accommodation', 'rental', 'vacation home'],
  restaurant: ['dining', 'food', 'cuisine'],
  bar: ['drinks', 'nightlife', 'social'],
  beach: ['swimming', 'sand', 'ocean', 'relaxation'],
  diving_snorkeling: ['underwater', 'marine life', 'scuba', 'reef'],
  water_sports: ['ocean', 'adventure', 'recreation'],
  boat_charter: ['sailing', 'yacht', 'ocean tour'],
  spa_wellness: ['relaxation', 'wellness', 'treatment'],
  spa: ['relaxation', 'wellness', 'treatment'],
  golf: ['sports', 'recreation', 'outdoor'],
  shopping: ['retail', 'souvenirs', 'gifts'],
  attraction: ['tourism', 'sightseeing', 'must-see'],
  activity: ['things to do', 'experience', 'adventure'],
  flight: ['travel', 'transportation', 'airline'],
  private_jet: ['luxury', 'vip', 'travel'],
  transport: ['travel', 'getting around'],
  transportation: ['travel', 'getting around'],
};

const PRICE_KEYWORDS: Record<string, PriceRange> = {
  'luxury': '$$$$$',
  'ultra luxury': '$$$$$',
  'five star': '$$$$$',
  '5 star': '$$$$$',
  'upscale': '$$$$',
  'premium': '$$$$',
  'fine dining': '$$$$',
  'michelin': '$$$$$',
  'boutique': '$$$',
  'mid-range': '$$',
  'budget': '$',
  'affordable': '$',
  'cheap': '$',
  'casual': '$$',
};

// ============ UTILITY FUNCTIONS ============

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function nameSimilarity(name1: string, name2: string): number {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  if (n1 === n2) return 1;
  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return 1;
  return 1 - (levenshteinDistance(n1, n2) / maxLen);
}

function normalizePhoneNumber(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('1') && cleaned.length === 11) {
    cleaned = '+' + cleaned;
  }
  if (cleaned.length === 10 && !cleaned.startsWith('+')) {
    cleaned = '+1' + cleaned;
  }
  if (cleaned.startsWith('+1') && cleaned.length === 12) {
    return `+1-${cleaned.slice(2, 5)}-${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
  }
  if (cleaned.includes('345')) {
    const idx = cleaned.indexOf('345');
    const localPart = cleaned.slice(idx);
    if (localPart.length >= 10) {
      return `+1-345-${localPart.slice(3, 6)}-${localPart.slice(6, 10)}`;
    }
  }
  return phone;
}

function normalizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  let normalized = url.trim();
  if (!normalized.match(/^https?:\/\//i)) {
    normalized = 'https://' + normalized;
  }
  if (normalized.startsWith('http://')) {
    normalized = normalized.replace('http://', 'https://');
  }
  return normalized;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isWithinCaymanBounds(lat: number, lng: number): boolean {
  return lat >= CAYMAN_BOUNDS.south && lat <= CAYMAN_BOUNDS.north &&
         lng >= CAYMAN_BOUNDS.west && lng <= CAYMAN_BOUNDS.east;
}

function standardizeIsland(island: string): string {
  const normalized = island.toLowerCase().trim();
  if (normalized.includes('grand') || normalized === 'gc') return 'Grand Cayman';
  if (normalized.includes('brac') || normalized === 'cb') return 'Cayman Brac';
  if (normalized.includes('little') || normalized === 'lc') return 'Little Cayman';
  return 'Grand Cayman';
}

function standardizeCategory(category: string): string {
  const normalized = category.toLowerCase().trim();
  const categoryMap: Record<string, string> = {
    'hotels': 'hotel', 'resorts': 'hotel', 'resort': 'hotel',
    'restaurants': 'restaurant', 'dining': 'restaurant',
    'bars': 'bar', 'pub': 'bar', 'beaches': 'beach',
    'diving': 'diving_snorkeling', 'snorkeling': 'diving_snorkeling', 'scuba': 'diving_snorkeling',
    'watersports': 'water_sports', 'water-sports': 'water_sports',
    'yacht': 'boat_charter', 'yachts': 'boat_charter', 'charter': 'boat_charter',
    'spas': 'spa', 'wellness': 'spa_wellness', 'golf_course': 'golf',
    'shops': 'shopping', 'retail': 'shopping',
    'attractions': 'attraction', 'tour': 'activity', 'tours': 'activity', 'activities': 'activity',
    'flights': 'flight', 'airline': 'flight', 'airlines': 'flight',
    'taxi': 'transport', 'car_rental': 'luxury_car_rental', 'car rental': 'luxury_car_rental',
    'events': 'event', 'festivals': 'festival', 'vip': 'concierge', 'services': 'service',
  };
  if (categoryMap[normalized]) return categoryMap[normalized];
  if (VALID_CATEGORIES.includes(normalized)) return normalized;
  return 'activity';
}

function inferPriceRange(node: KnowledgeNode): PriceRange {
  if (node.business?.priceFrom) {
    const price = node.business.priceFrom;
    if (price >= 1000) return '$$$$$';
    if (price >= 500) return '$$$$';
    if (price >= 200) return '$$$';
    if (price >= 50) return '$$';
    return '$';
  }

  const text = `${node.name} ${node.description}`.toLowerCase();
  for (const [keyword, range] of Object.entries(PRICE_KEYWORDS)) {
    if (text.includes(keyword)) return range;
  }

  const luxuryCategories = ['superyacht', 'private_jet', 'vip_escort', 'medical_vip'];
  const midCategories = ['hotel', 'restaurant', 'spa', 'boat_charter'];
  if (luxuryCategories.includes(node.category)) return '$$$$$';
  if (midCategories.includes(node.category)) return '$$$';
  return '$$';
}

function generateEmbeddingText(node: KnowledgeNode): string {
  const parts: string[] = [node.name];
  parts.push(node.category.replace(/_/g, ' '));
  if (node.subcategory) parts.push(node.subcategory);
  if (node.location) {
    parts.push(node.location.island);
    parts.push(node.location.district);
  }
  const desc = node.shortDescription || (node.description?.slice(0, 200) || '');
  parts.push(desc);
  if (node.tags?.length > 0) parts.push(...node.tags.slice(0, 10));
  if (node.keywords?.length > 0) parts.push(...node.keywords.slice(0, 10));

  const priceText: Record<string, string> = {
    '$': 'budget affordable cheap',
    '$$': 'moderate mid-range',
    '$$$': 'upscale premium',
    '$$$$': 'luxury high-end',
    '$$$$$': 'ultra luxury exclusive'
  };
  parts.push(priceText[node.business?.priceRange as string] || '');
  parts.push('Cayman Islands', 'Caribbean');

  return parts.filter(p => p && p.trim()).join(' ');
}

function generateShortDescription(description: string): string {
  if (!description) return '';
  const firstSentence = description.split(/[.!?]/)[0];
  if (firstSentence.length <= 150) return firstSentence.trim() + '.';
  let truncated = description.slice(0, 100);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 50) truncated = truncated.slice(0, lastSpace);
  return truncated.trim() + '...';
}

function generateTagsFromContent(node: KnowledgeNode): string[] {
  const existingTags = new Set(node.tags?.map(t => t.toLowerCase()) || []);
  const newTags: string[] = [];

  const categoryTags = CATEGORY_TAG_MAP[node.category] || [];
  categoryTags.forEach(tag => {
    if (!existingTags.has(tag.toLowerCase())) newTags.push(tag);
  });

  if (node.location && !existingTags.has(node.location.island.toLowerCase())) {
    newTags.push(node.location.island.toLowerCase());
  }
  if (!existingTags.has('cayman islands')) newTags.push('cayman islands');
  if (!existingTags.has('caribbean')) newTags.push('caribbean');

  const text = `${node.name} ${node.description}`.toLowerCase();
  const keywordPatterns = [
    { pattern: /beachfront|beach front|oceanfront|ocean front/, tag: 'beachfront' },
    { pattern: /family[\s-]?friendly|kid[\s-]?friendly|children/, tag: 'family friendly' },
    { pattern: /pet[\s-]?friendly|dogs? (allowed|welcome)/, tag: 'pet friendly' },
    { pattern: /romantic|honeymoon|couples/, tag: 'romantic' },
    { pattern: /snorkel|snorkeling/, tag: 'snorkeling' },
    { pattern: /dive|diving|scuba/, tag: 'diving' },
    { pattern: /pool|swimming pool/, tag: 'pool' },
    { pattern: /spa|massage|wellness/, tag: 'spa' },
    { pattern: /live music|entertainment/, tag: 'entertainment' },
    { pattern: /seafood/, tag: 'seafood' },
    { pattern: /vegan|vegetarian/, tag: 'vegetarian options' },
    { pattern: /outdoor|patio|terrace/, tag: 'outdoor seating' },
    { pattern: /private|exclusive|vip/, tag: 'private' },
    { pattern: /tour|guided|excursion/, tag: 'tours' },
  ];

  keywordPatterns.forEach(({ pattern, tag }) => {
    if (pattern.test(text) && !existingTags.has(tag)) newTags.push(tag);
  });

  return newTags;
}

// ============ VALIDATION ============

function validateNode(node: KnowledgeNode): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!node.id) {
    issues.push({ nodeId: node.id || 'unknown', nodeName: node.name || 'unknown', field: 'id', issue: 'Missing required field: id', severity: 'error', autoFixed: false });
  }
  if (!node.name) {
    issues.push({ nodeId: node.id, nodeName: node.name || 'unknown', field: 'name', issue: 'Missing required field: name', severity: 'error', autoFixed: false });
  }
  if (!node.category) {
    issues.push({ nodeId: node.id, nodeName: node.name, field: 'category', issue: 'Missing required field: category', severity: 'error', autoFixed: false });
  } else if (!VALID_CATEGORIES.includes(node.category)) {
    issues.push({ nodeId: node.id, nodeName: node.name, field: 'category', issue: `Invalid category: ${node.category}`, severity: 'warning', autoFixed: true, oldValue: node.category, newValue: standardizeCategory(node.category) });
  }
  if (!node.description) {
    issues.push({ nodeId: node.id, nodeName: node.name, field: 'description', issue: 'Missing required field: description', severity: 'error', autoFixed: false });
  }

  if (!node.location) {
    issues.push({ nodeId: node.id, nodeName: node.name, field: 'location', issue: 'Missing required field: location', severity: 'error', autoFixed: false });
  } else {
    if (typeof node.location.latitude !== 'number' || typeof node.location.longitude !== 'number') {
      issues.push({ nodeId: node.id, nodeName: node.name, field: 'location.coordinates', issue: 'Missing or invalid coordinates', severity: 'warning', autoFixed: false });
    } else if (!isWithinCaymanBounds(node.location.latitude, node.location.longitude)) {
      issues.push({ nodeId: node.id, nodeName: node.name, field: 'location.coordinates', issue: `Coordinates outside Cayman Islands bounds: ${node.location.latitude}, ${node.location.longitude}`, severity: 'warning', autoFixed: false });
    }
    if (!node.location.island) {
      issues.push({ nodeId: node.id, nodeName: node.name, field: 'location.island', issue: 'Missing island name', severity: 'warning', autoFixed: true, oldValue: node.location.island, newValue: 'Grand Cayman' });
    } else if (!VALID_ISLANDS.includes(node.location.island)) {
      issues.push({ nodeId: node.id, nodeName: node.name, field: 'location.island', issue: `Non-standard island name: ${node.location.island}`, severity: 'info', autoFixed: true, oldValue: node.location.island, newValue: standardizeIsland(node.location.island) });
    }
  }

  if (node.contact?.website && !isValidUrl(node.contact.website)) {
    issues.push({ nodeId: node.id, nodeName: node.name, field: 'contact.website', issue: `Invalid URL format`, severity: 'warning', autoFixed: true, oldValue: node.contact.website, newValue: normalizeUrl(node.contact.website) });
  }
  if (node.contact?.bookingUrl && !isValidUrl(node.contact.bookingUrl)) {
    issues.push({ nodeId: node.id, nodeName: node.name, field: 'contact.bookingUrl', issue: `Invalid booking URL format`, severity: 'warning', autoFixed: true, oldValue: node.contact.bookingUrl, newValue: normalizeUrl(node.contact.bookingUrl) });
  }

  const validPriceRanges = ['$', '$$', '$$$', '$$$$', '$$$$$'];
  if (!node.business?.priceRange || !validPriceRanges.includes(node.business.priceRange as string)) {
    issues.push({ nodeId: node.id, nodeName: node.name, field: 'business.priceRange', issue: `Invalid or missing price range: ${node.business?.priceRange}`, severity: 'warning', autoFixed: true, oldValue: node.business?.priceRange, newValue: inferPriceRange(node) });
  }

  if (!node.shortDescription) {
    issues.push({ nodeId: node.id, nodeName: node.name, field: 'shortDescription', issue: 'Missing shortDescription', severity: 'info', autoFixed: true, newValue: generateShortDescription(node.description || '') });
  }
  if (!node.embeddingText) {
    issues.push({ nodeId: node.id, nodeName: node.name, field: 'embeddingText', issue: 'Missing embeddingText', severity: 'info', autoFixed: true, newValue: generateEmbeddingText(node) });
  }
  if (!node.tags || node.tags.length === 0) {
    issues.push({ nodeId: node.id, nodeName: node.name, field: 'tags', issue: 'Missing or empty tags array', severity: 'info', autoFixed: true, newValue: generateTagsFromContent(node) });
  }

  return issues;
}

// ============ ENRICHMENT ============

function enrichNode(node: KnowledgeNode, issues: ValidationIssue[]): KnowledgeNode {
  const enriched = JSON.parse(JSON.stringify(node)) as KnowledgeNode;

  issues.filter(i => i.autoFixed).forEach(issue => {
    switch (issue.field) {
      case 'category': enriched.category = issue.newValue; break;
      case 'location.island': if (enriched.location) enriched.location.island = issue.newValue; break;
      case 'contact.website': if (enriched.contact) enriched.contact.website = issue.newValue; break;
      case 'contact.bookingUrl': if (enriched.contact) enriched.contact.bookingUrl = issue.newValue; break;
      case 'business.priceRange': if (enriched.business) enriched.business.priceRange = issue.newValue; break;
      case 'shortDescription': enriched.shortDescription = issue.newValue; break;
      case 'embeddingText': enriched.embeddingText = issue.newValue; break;
      case 'tags': enriched.tags = [...(enriched.tags || []), ...issue.newValue]; break;
    }
  });

  if (enriched.contact?.phone) {
    const normalizedPhone = normalizePhoneNumber(enriched.contact.phone);
    if (normalizedPhone) enriched.contact.phone = normalizedPhone;
  }
  if (enriched.contact?.website) enriched.contact.website = normalizeUrl(enriched.contact.website);
  if (enriched.contact?.bookingUrl) enriched.contact.bookingUrl = normalizeUrl(enriched.contact.bookingUrl);

  if ((enriched.tags?.length || 0) < 5) {
    const newTags = generateTagsFromContent(enriched);
    enriched.tags = [...new Set([...(enriched.tags || []), ...newTags])];
  }

  enriched.updatedAt = new Date().toISOString();
  return enriched;
}

// ============ DEDUPLICATION ============

function findDuplicates(nodes: KnowledgeNode[]): DuplicateGroup[] {
  const duplicateGroups: DuplicateGroup[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < nodes.length; i++) {
    if (processed.has(nodes[i].id)) continue;

    const duplicates: KnowledgeNode[] = [];
    let highestSimilarity = 0;

    for (let j = i + 1; j < nodes.length; j++) {
      if (processed.has(nodes[j].id)) continue;
      const similarity = nameSimilarity(nodes[i].name, nodes[j].name);
      if (similarity > 0.85) {
        duplicates.push(nodes[j]);
        processed.add(nodes[j].id);
        highestSimilarity = Math.max(highestSimilarity, similarity);
      }
    }

    if (duplicates.length > 0) {
      processed.add(nodes[i].id);
      const allNodes = [nodes[i], ...duplicates];
      allNodes.sort((a, b) => calculateQualityScore(b).score - calculateQualityScore(a).score);
      duplicateGroups.push({ canonical: allNodes[0], duplicates: allNodes.slice(1), similarity: highestSimilarity, mergedFields: [] });
    }
  }
  return duplicateGroups;
}

function mergeNodes(canonical: KnowledgeNode, duplicate: KnowledgeNode): { merged: KnowledgeNode; mergedFields: string[] } {
  const merged = JSON.parse(JSON.stringify(canonical)) as KnowledgeNode;
  const mergedFields: string[] = [];

  if (duplicate.description && duplicate.description.length > (canonical.description?.length || 0)) {
    merged.description = duplicate.description;
    mergedFields.push('description');
  }

  if (!merged.contact) merged.contact = {};
  if (duplicate.contact) {
    if (!merged.contact.phone && duplicate.contact.phone) { merged.contact.phone = duplicate.contact.phone; mergedFields.push('contact.phone'); }
    if (!merged.contact.email && duplicate.contact.email) { merged.contact.email = duplicate.contact.email; mergedFields.push('contact.email'); }
    if (!merged.contact.website && duplicate.contact.website) { merged.contact.website = duplicate.contact.website; mergedFields.push('contact.website'); }
    if (!merged.contact.bookingUrl && duplicate.contact.bookingUrl) { merged.contact.bookingUrl = duplicate.contact.bookingUrl; mergedFields.push('contact.bookingUrl'); }
    if (!merged.contact.instagram && duplicate.contact.instagram) { merged.contact.instagram = duplicate.contact.instagram; mergedFields.push('contact.instagram'); }
    if (!merged.contact.tripadvisor && duplicate.contact.tripadvisor) { merged.contact.tripadvisor = duplicate.contact.tripadvisor; mergedFields.push('contact.tripadvisor'); }
  }

  if (!merged.media) merged.media = { thumbnail: '', images: [] };
  if (duplicate.media) {
    if (!merged.media.thumbnail && duplicate.media.thumbnail) { merged.media.thumbnail = duplicate.media.thumbnail; mergedFields.push('media.thumbnail'); }
    if (duplicate.media.images?.length > 0) {
      const existingImages = new Set(merged.media.images || []);
      duplicate.media.images.forEach(img => { if (!existingImages.has(img)) merged.media.images.push(img); });
      if (merged.media.images.length > (canonical.media?.images?.length || 0)) mergedFields.push('media.images');
    }
  }

  if (duplicate.ratings && duplicate.ratings.reviewCount > (canonical.ratings?.reviewCount || 0)) {
    merged.ratings = { ...merged.ratings, ...duplicate.ratings };
    mergedFields.push('ratings');
  }

  if (duplicate.tags?.length > 0) {
    const existingTags = new Set(merged.tags?.map(t => t.toLowerCase()) || []);
    const newTags = duplicate.tags.filter(t => !existingTags.has(t.toLowerCase()));
    if (newTags.length > 0) { merged.tags = [...(merged.tags || []), ...newTags]; mergedFields.push('tags'); }
  }

  if (duplicate.customFields && Object.keys(duplicate.customFields).length > 0) {
    merged.customFields = { ...(merged.customFields || {}), ...duplicate.customFields };
    mergedFields.push('customFields');
  }

  merged.embeddingText = generateEmbeddingText(merged);
  return { merged, mergedFields };
}

// ============ QUALITY SCORING ============

function calculateQualityScore(node: KnowledgeNode): QualityScore {
  const breakdown = { requiredFields: 0, contactInfo: 0, mediaContent: 0, businessInfo: 0, ratingsReviews: 0, tagsKeywords: 0, embeddingQuality: 0 };
  const missingFields: string[] = [];

  const requiredChecks = [
    { field: 'id', value: node.id },
    { field: 'name', value: node.name },
    { field: 'category', value: node.category },
    { field: 'description', value: node.description },
    { field: 'location.island', value: node.location?.island },
    { field: 'location.coordinates', value: node.location?.latitude && node.location?.longitude }
  ];
  requiredChecks.forEach(check => { if (check.value) breakdown.requiredFields += 5; else missingFields.push(check.field); });

  if (node.contact?.phone) breakdown.contactInfo += 5; else missingFields.push('contact.phone');
  if (node.contact?.website) breakdown.contactInfo += 5; else missingFields.push('contact.website');
  if (node.contact?.email || node.contact?.bookingUrl) breakdown.contactInfo += 5; else missingFields.push('contact.email/bookingUrl');

  if (node.media?.thumbnail) breakdown.mediaContent += 5; else missingFields.push('media.thumbnail');
  if (node.media?.images?.length > 0) breakdown.mediaContent += Math.min(5, node.media.images.length); else missingFields.push('media.images');
  if (node.media?.images?.length >= 3) breakdown.mediaContent += 5;

  if (node.business?.priceRange) breakdown.businessInfo += 5; else missingFields.push('business.priceRange');
  if (node.business?.currency) breakdown.businessInfo += 3; else missingFields.push('business.currency');
  if (node.business?.priceFrom || node.business?.priceTo) breakdown.businessInfo += 4;
  if (node.business?.openingHours) breakdown.businessInfo += 3;

  if (node.ratings?.overall && node.ratings.overall > 0) breakdown.ratingsReviews += 5; else missingFields.push('ratings.overall');
  if (node.ratings?.reviewCount && node.ratings.reviewCount > 0) breakdown.ratingsReviews += 5; else missingFields.push('ratings.reviewCount');

  if (node.tags?.length >= 3) breakdown.tagsKeywords += 5; else if (node.tags?.length > 0) breakdown.tagsKeywords += 2; else missingFields.push('tags');
  if (node.keywords?.length >= 3) breakdown.tagsKeywords += 5; else if (node.keywords?.length > 0) breakdown.tagsKeywords += 2; else missingFields.push('keywords');

  if (node.embeddingText) {
    const wordCount = node.embeddingText.split(/\s+/).length;
    if (wordCount >= 50) breakdown.embeddingQuality += 5;
    else if (wordCount >= 20) breakdown.embeddingQuality += 3;
    else breakdown.embeddingQuality += 1;
  } else missingFields.push('embeddingText');

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { nodeId: node.id, nodeName: node.name, score, breakdown, missingFields };
}

// ============ FILE OPERATIONS ============

function parseNodesFromFile(content: string, isJson: boolean = false): KnowledgeNode[] {
  const nodes: KnowledgeNode[] = [];

  // Extract JSON array content from TypeScript file
  const match = content.match(/(?:export\s+const\s+\w+\s*:\s*KnowledgeNode\[\]\s*=\s*)(\[[\s\S]*?\]);?\s*(?=export|$)/g);

  if (match) {
    for (const m of match) {
      const arrayMatch = m.match(/=\s*(\[[\s\S]*?\]);?\s*$/);
      if (arrayMatch) {
        try {
          // Use Function constructor to safely evaluate the array
          const arrayStr = arrayMatch[1];
          const fn = new Function(`return ${arrayStr}`);
          const parsed = fn() as KnowledgeNode[];
          nodes.push(...parsed);
        } catch (e) {
          console.log(`  Warning: Could not parse array segment`);
        }
      }
    }
  }

  return nodes;
}

function generateMarkdownReport(report: NurturingReport): string {
  let md = `# Data Nurturing Report

**Generated:** ${report.timestamp}

---

## Summary

| Metric | Value |
|--------|-------|
| Total Nodes Processed | ${report.summary.totalNodesProcessed} |
| Nodes Fixed | ${report.summary.nodesFixed} |
| Duplicates Removed | ${report.summary.duplicatesRemoved} |
| Average Quality Score | ${report.summary.averageQualityScore}/100 |
| Nodes Needing Review | ${report.summary.nodesNeedingReview} |

---

## Quality Score Distribution

| Category | Count | Percentage |
|----------|-------|------------|
| Excellent (80-100) | ${report.scoreDistribution.excellent} | ${((report.scoreDistribution.excellent / Math.max(1, report.summary.totalNodesProcessed)) * 100).toFixed(1)}% |
| Good (60-79) | ${report.scoreDistribution.good} | ${((report.scoreDistribution.good / Math.max(1, report.summary.totalNodesProcessed)) * 100).toFixed(1)}% |
| Fair (40-59) | ${report.scoreDistribution.fair} | ${((report.scoreDistribution.fair / Math.max(1, report.summary.totalNodesProcessed)) * 100).toFixed(1)}% |
| Poor (0-39) | ${report.scoreDistribution.poor} | ${((report.scoreDistribution.poor / Math.max(1, report.summary.totalNodesProcessed)) * 100).toFixed(1)}% |

---

## Duplicates Found and Merged

`;

  if (report.duplicatesFound.length === 0) {
    md += `No duplicates found.\n\n`;
  } else {
    md += `Found and merged ${report.duplicatesFound.length} duplicate groups:\n\n`;
    report.duplicatesFound.forEach((group, idx) => {
      md += `### ${idx + 1}. ${group.canonical.name}\n\n`;
      md += `- **Similarity:** ${(group.similarity * 100).toFixed(1)}%\n`;
      md += `- **Kept ID:** \`${group.canonical.id}\`\n`;
      md += `- **Removed IDs:**\n`;
      group.duplicates.forEach(dup => md += `  - \`${dup.id}\` ("${dup.name}")\n`);
      if (group.mergedFields.length > 0) md += `- **Merged Fields:** ${group.mergedFields.join(', ')}\n`;
      md += `\n`;
    });
  }

  md += `---

## Validation Issues Fixed

`;

  const fixedIssues = report.validationIssues.filter(i => i.autoFixed);
  if (fixedIssues.length === 0) {
    md += `No issues were auto-fixed.\n\n`;
  } else {
    const byField = new Map<string, ValidationIssue[]>();
    fixedIssues.forEach(issue => {
      if (!byField.has(issue.field)) byField.set(issue.field, []);
      byField.get(issue.field)!.push(issue);
    });

    md += `| Field | Count | Sample Node |
|-------|-------|-------------|
`;
    for (const [field, issues] of byField) {
      md += `| ${field} | ${issues.length} | ${issues[0].nodeName.slice(0, 40)} |\n`;
    }
    md += `\n`;
  }

  md += `---

## Remaining Issues (Manual Review Required)

`;

  if (report.remainingIssues.length === 0) {
    md += `No remaining issues require manual review.\n\n`;
  } else {
    const errors = report.remainingIssues.filter(i => i.severity === 'error');
    const warnings = report.remainingIssues.filter(i => i.severity === 'warning' && !i.autoFixed);

    if (errors.length > 0) {
      md += `### Errors (${errors.length})\n\n| Node ID | Node Name | Field | Issue |\n|---------|-----------|-------|-------|\n`;
      errors.slice(0, 20).forEach(issue => md += `| \`${issue.nodeId}\` | ${issue.nodeName.slice(0, 30)} | ${issue.field} | ${issue.issue} |\n`);
      if (errors.length > 20) md += `| ... | ... | ... | +${errors.length - 20} more |\n`;
      md += `\n`;
    }

    if (warnings.length > 0) {
      md += `### Warnings (${warnings.length})\n\n| Node ID | Node Name | Field | Issue |\n|---------|-----------|-------|-------|\n`;
      warnings.slice(0, 20).forEach(issue => md += `| \`${issue.nodeId}\` | ${issue.nodeName.slice(0, 30)} | ${issue.field} | ${issue.issue} |\n`);
      if (warnings.length > 20) md += `| ... | ... | ... | +${warnings.length - 20} more |\n`;
      md += `\n`;
    }
  }

  md += `---

## Nodes Needing Manual Review (Score < 50)

`;

  const lowScoreNodes = report.qualityScores.filter(qs => qs.score < 50).sort((a, b) => a.score - b.score);
  if (lowScoreNodes.length === 0) {
    md += `All nodes have acceptable quality scores.\n\n`;
  } else {
    md += `| Node ID | Name | Score | Missing Fields |\n|---------|------|-------|----------------|\n`;
    lowScoreNodes.slice(0, 30).forEach(qs => md += `| \`${qs.nodeId}\` | ${qs.nodeName.slice(0, 30)} | ${qs.score}/100 | ${qs.missingFields.slice(0, 5).join(', ')}${qs.missingFields.length > 5 ? '...' : ''} |\n`);
    if (lowScoreNodes.length > 30) md += `| ... | ... | ... | +${lowScoreNodes.length - 30} more |\n`;
    md += `\n`;
  }

  md += `---

## Top Quality Nodes (Score >= 80)

`;

  const topNodes = report.qualityScores.filter(qs => qs.score >= 80).sort((a, b) => b.score - a.score).slice(0, 20);
  if (topNodes.length === 0) {
    md += `No nodes achieved excellent quality scores.\n\n`;
  } else {
    md += `| Node ID | Name | Score |\n|---------|------|-------|\n`;
    topNodes.forEach(qs => md += `| \`${qs.nodeId}\` | ${qs.nodeName.slice(0, 40)} | **${qs.score}/100** |\n`);
    md += `\n`;
  }

  md += `---

## Recommendations

1. **Fix Critical Errors:** ${report.remainingIssues.filter(i => i.severity === 'error').length} nodes have errors requiring attention.
2. **Improve Low-Score Nodes:** ${lowScoreNodes.length} nodes scored below 50 and need enrichment.
3. **Add Missing Media:** Consider adding at least 3 images per node.
4. **Complete Contact Info:** Ensure all business nodes have phone, website, and booking URLs.
5. **Verify Coordinates:** Review nodes flagged as outside Cayman Islands bounds.
6. **Regular Re-runs:** Schedule this pipeline weekly to maintain data quality.

---

*Report generated by Isle AI Data Nurturing Pipeline*
`;

  return md;
}

// ============ MAIN PIPELINE ============

async function runNurturingPipeline(): Promise<void> {
  console.log('='.repeat(60));
  console.log('ISLE AI - DATA NURTURING PIPELINE');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}\n`);

  const report: NurturingReport = {
    timestamp: new Date().toISOString(),
    summary: { totalNodesProcessed: 0, nodesFixed: 0, duplicatesRemoved: 0, averageQualityScore: 0, nodesNeedingReview: 0 },
    validationIssues: [],
    duplicatesFound: [],
    qualityScores: [],
    scoreDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
    remainingIssues: []
  };

  const basePath = path.resolve(__dirname, '..');
  const knowledgeFilePath = path.join(basePath, 'data', 'cayman-islands-knowledge.ts');
  const serpApiFilePath = path.join(basePath, 'data', 'serpapi-vip-data.ts');

  console.log('Step 1: Loading data files...');
  console.log(`  Knowledge file: ${knowledgeFilePath}`);
  console.log(`  SerpAPI file: ${serpApiFilePath}\n`);

  let knowledgeContent: string;
  let serpApiContent: string;

  try {
    knowledgeContent = fs.readFileSync(knowledgeFilePath, 'utf-8');
    serpApiContent = fs.readFileSync(serpApiFilePath, 'utf-8');
  } catch (e) {
    console.error('Error reading files:', e);
    return;
  }

  console.log('Step 2: Extracting knowledge nodes...');

  // Parse nodes from both files
  const knowledgeNodes = parseNodesFromFile(knowledgeContent);
  const serpApiNodes = parseNodesFromFile(serpApiContent);

  console.log(`  Extracted ${knowledgeNodes.length} nodes from knowledge base`);
  console.log(`  Extracted ${serpApiNodes.length} nodes from SerpAPI data`);

  const allNodes = [...knowledgeNodes, ...serpApiNodes];
  console.log(`  Total: ${allNodes.length} nodes\n`);

  if (allNodes.length === 0) {
    console.log('Warning: No nodes extracted. Files may have parsing issues.');
    console.log('Generating report with zero nodes...\n');
  }

  report.summary.totalNodesProcessed = allNodes.length;

  console.log('Step 3: Validating nodes...');

  const nodeValidationMap = new Map<string, ValidationIssue[]>();
  for (const node of allNodes) {
    const issues = validateNode(node);
    nodeValidationMap.set(node.id, issues);
    report.validationIssues.push(...issues);
  }

  const errorCount = report.validationIssues.filter(i => i.severity === 'error').length;
  const warningCount = report.validationIssues.filter(i => i.severity === 'warning').length;
  const infoCount = report.validationIssues.filter(i => i.severity === 'info').length;

  console.log(`  Found ${report.validationIssues.length} issues:`);
  console.log(`    - Errors: ${errorCount}`);
  console.log(`    - Warnings: ${warningCount}`);
  console.log(`    - Info: ${infoCount}\n`);

  console.log('Step 4: Enriching and fixing nodes...');

  const enrichedNodes: KnowledgeNode[] = [];
  let fixedCount = 0;

  for (const node of allNodes) {
    const issues = nodeValidationMap.get(node.id) || [];
    if (issues.filter(i => i.autoFixed).length > 0) fixedCount++;
    enrichedNodes.push(enrichNode(node, issues));
  }

  console.log(`  Fixed ${fixedCount} nodes with auto-fixable issues\n`);
  report.summary.nodesFixed = fixedCount;

  console.log('Step 5: Finding duplicates...');

  const duplicateGroups = findDuplicates(enrichedNodes);
  report.duplicatesFound = duplicateGroups;

  console.log(`  Found ${duplicateGroups.length} duplicate groups`);
  if (duplicateGroups.length > 0) {
    duplicateGroups.slice(0, 5).forEach((group, idx) => {
      console.log(`    ${idx + 1}. "${group.canonical.name}" (${group.duplicates.length} dups, ${(group.similarity * 100).toFixed(0)}% similar)`);
    });
    if (duplicateGroups.length > 5) console.log(`    ... and ${duplicateGroups.length - 5} more`);
  }
  console.log();

  // Merge duplicates
  const deduplicatedNodes: KnowledgeNode[] = [];
  const duplicateIds = new Set<string>();

  for (const group of duplicateGroups) {
    let merged = group.canonical;
    const allMergedFields: string[] = [];
    for (const duplicate of group.duplicates) {
      const result = mergeNodes(merged, duplicate);
      merged = result.merged;
      allMergedFields.push(...result.mergedFields);
      duplicateIds.add(duplicate.id);
    }
    group.canonical = merged;
    group.mergedFields = [...new Set(allMergedFields)];
    deduplicatedNodes.push(merged);
  }

  for (const node of enrichedNodes) {
    if (!duplicateIds.has(node.id) && !duplicateGroups.some(g => g.canonical.id === node.id)) {
      deduplicatedNodes.push(node);
    }
  }

  report.summary.duplicatesRemoved = duplicateIds.size;
  console.log(`  Removed ${duplicateIds.size} duplicate nodes\n`);

  console.log('Step 6: Calculating quality scores...');

  let totalScore = 0;
  for (const node of deduplicatedNodes) {
    const qualityScore = calculateQualityScore(node);
    report.qualityScores.push(qualityScore);
    totalScore += qualityScore.score;

    if (qualityScore.score >= 80) report.scoreDistribution.excellent++;
    else if (qualityScore.score >= 60) report.scoreDistribution.good++;
    else if (qualityScore.score >= 40) report.scoreDistribution.fair++;
    else report.scoreDistribution.poor++;

    if (qualityScore.score < 50) report.summary.nodesNeedingReview++;
  }

  report.summary.averageQualityScore = deduplicatedNodes.length > 0 ? Math.round(totalScore / deduplicatedNodes.length) : 0;

  console.log(`  Average quality score: ${report.summary.averageQualityScore}/100`);
  console.log(`  Distribution:`);
  console.log(`    - Excellent (80-100): ${report.scoreDistribution.excellent}`);
  console.log(`    - Good (60-79): ${report.scoreDistribution.good}`);
  console.log(`    - Fair (40-59): ${report.scoreDistribution.fair}`);
  console.log(`    - Poor (0-39): ${report.scoreDistribution.poor}\n`);

  report.remainingIssues = report.validationIssues.filter(i => i.severity === 'error' || (i.severity === 'warning' && !i.autoFixed));

  console.log('Step 7: Writing updated files...');

  // Separate nodes back to their original sources
  const updatedKnowledgeNodes = deduplicatedNodes.filter(n => !n.id.startsWith('serp-'));
  const updatedSerpApiNodes = deduplicatedNodes.filter(n => n.id.startsWith('serp-'));

  // For the knowledge file, we need to update in place preserving structure
  // This is complex due to TypeScript syntax, so we'll create a JSON export approach

  // Write enriched SERPAPI data
  const serpApiExport = `// ============================================
// SERPAPI ENRICHED DATA - VIP SERVICES, FLIGHTS, AND MORE
// Auto-generated from SerpAPI
// ============================================

import type { KnowledgeNode } from '../types/chatbot';

// Type assertion to handle SerpAPI's flexible data format
// The data is runtime-validated but TypeScript strict checking bypassed for openingHours
// Generated at: ${new Date().toISOString()}
// Total nodes: ${updatedSerpApiNodes.length}
// Last nurtured: ${new Date().toISOString()}

export const SERPAPI_ENRICHED_DATA: KnowledgeNode[] = ${JSON.stringify(updatedSerpApiNodes, null, 2)};
`;

  fs.writeFileSync(serpApiFilePath, serpApiExport, 'utf-8');
  console.log(`  Updated: ${serpApiFilePath}`);
  console.log(`    - ${updatedSerpApiNodes.length} nodes written\n`);

  // For knowledge file, create a separate enriched export that can be merged
  const enrichedKnowledgePath = path.join(basePath, 'data', 'enriched-knowledge-nodes.json');
  fs.writeFileSync(enrichedKnowledgePath, JSON.stringify(updatedKnowledgeNodes, null, 2), 'utf-8');
  console.log(`  Created: ${enrichedKnowledgePath}`);
  console.log(`    - ${updatedKnowledgeNodes.length} enriched nodes exported\n`);

  console.log('Step 8: Generating report...');

  const reportPath = path.join(basePath, 'DATA_NURTURING_REPORT.md');
  fs.writeFileSync(reportPath, generateMarkdownReport(report), 'utf-8');
  console.log(`  Report saved to: ${reportPath}\n`);

  console.log('='.repeat(60));
  console.log('PIPELINE COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total nodes processed: ${report.summary.totalNodesProcessed}`);
  console.log(`Nodes fixed: ${report.summary.nodesFixed}`);
  console.log(`Duplicates removed: ${report.summary.duplicatesRemoved}`);
  console.log(`Average quality score: ${report.summary.averageQualityScore}/100`);
  console.log(`Nodes needing manual review: ${report.summary.nodesNeedingReview}`);
  console.log(`Remaining issues: ${report.remainingIssues.length}`);
  console.log('='.repeat(60));
}

// Run
runNurturingPipeline().catch(console.error);
