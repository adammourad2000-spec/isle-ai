/**
 * ISLE AI - Merge Scraped Data with Knowledge Base
 *
 * This script merges scraped Google Maps data with the existing knowledge base:
 * - Takes scraped Google Maps data as input
 * - Merges with existing knowledge base
 * - Handles duplicates (by name similarity + location proximity)
 * - Preserves manually curated data
 * - Updates outdated information
 * - Outputs the merged knowledge base
 *
 * Usage:
 *   npx ts-node scripts/merge-scraped-data.ts --input scraped-data.json
 *   npx ts-node scripts/merge-scraped-data.ts --input scraped-data.json --dry-run
 *   npx ts-node scripts/merge-scraped-data.ts --input scraped-data.json --preserve-curated
 *
 * @author Isle AI Team
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============ TYPES ============

interface ScrapedPlace {
  // Google Maps data structure
  place_id?: string;
  name: string;
  formatted_address?: string;
  address?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  rating?: number;
  user_ratings_total?: number;
  reviews_count?: number;
  price_level?: number;
  types?: string[];
  category?: string;
  phone?: string;
  website?: string;
  opening_hours?: {
    weekday_text?: string[];
    open_now?: boolean;
  };
  photos?: Array<{
    photo_reference?: string;
    url?: string;
  }>;
  description?: string;
  // Custom fields from scraping
  thumbnail?: string;
  images?: string[];
}

interface KnowledgeNode {
  id: string;
  category: string;
  subcategory?: string;
  name: string;
  description: string;
  shortDescription: string;
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
    priceRange: string;
    priceFrom?: number | null;
    priceTo?: number | null;
    currency: string;
    openingHours?: Record<string, unknown>;
  };
  ratings: {
    overall: number;
    reviewCount: number;
    tripadvisorRating?: number;
    googleRating?: number;
  };
  tags: string[];
  keywords: string[];
  embeddingText: string;
  isActive: boolean;
  isPremium: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  customFields?: Record<string, unknown>;
}

interface MergeResult {
  added: KnowledgeNode[];
  updated: KnowledgeNode[];
  skipped: Array<{ name: string; reason: string }>;
  duplicatesFound: Array<{ scraped: string; existing: string; similarity: number }>;
}

interface MergeConfig {
  inputFile: string;
  isDryRun: boolean;
  preserveCurated: boolean;
  similarityThreshold: number;
  proximityMeters: number;
  outputFile?: string;
}

// ============ CONFIGURATION ============

const CONFIG = {
  // Default paths
  OUTPUT_DIR: path.join(__dirname, '../data'),
  BACKUP_DIR: path.join(__dirname, '../data/backups'),

  // Merge settings
  DEFAULT_SIMILARITY_THRESHOLD: 0.85, // Name similarity threshold (0-1)
  DEFAULT_PROXIMITY_METERS: 100, // Distance threshold for same location

  // Category mapping from Google Maps types
  CATEGORY_MAP: {
    // Accommodation
    lodging: 'hotel',
    hotel: 'hotel',
    resort: 'hotel',
    motel: 'hotel',
    guest_house: 'villa_rental',
    vacation_rental: 'villa_rental',

    // Dining
    restaurant: 'restaurant',
    food: 'restaurant',
    cafe: 'restaurant',
    bar: 'bar',
    night_club: 'nightlife',
    bakery: 'restaurant',

    // Beaches & Water
    beach: 'beach',
    natural_feature: 'beach',
    park: 'attraction',
    diving: 'diving_snorkeling',
    scuba_diving: 'diving_snorkeling',

    // Shopping
    shopping_mall: 'shopping',
    store: 'shopping',
    clothing_store: 'shopping',
    jewelry_store: 'shopping',

    // Activities
    tourist_attraction: 'attraction',
    museum: 'attraction',
    art_gallery: 'attraction',
    amusement_park: 'activity',
    aquarium: 'activity',
    zoo: 'activity',
    spa: 'spa_wellness',
    gym: 'activity',
    golf_course: 'golf',

    // Transportation
    car_rental: 'transport',
    taxi_stand: 'transport',
    airport: 'transport',
    travel_agency: 'service',

    // Services
    bank: 'financial_services',
    atm: 'financial_services',
    lawyer: 'legal_services',
    real_estate_agency: 'real_estate',
    hospital: 'emergency',
    pharmacy: 'emergency',
    police: 'emergency',
  } as Record<string, string>,

  // Price level mapping
  PRICE_MAP: {
    0: '$',
    1: '$',
    2: '$$',
    3: '$$$',
    4: '$$$$',
    5: '$$$$$',
  } as Record<number, string>,

  // Districts based on location (approximate bounds)
  DISTRICTS: [
    { name: 'Seven Mile Beach', latMin: 19.32, latMax: 19.36, lngMin: -81.40, lngMax: -81.37 },
    { name: 'George Town', latMin: 19.28, latMax: 19.32, lngMin: -81.40, lngMax: -81.37 },
    { name: 'West Bay', latMin: 19.36, latMax: 19.41, lngMin: -81.42, lngMax: -81.38 },
    { name: 'Bodden Town', latMin: 19.27, latMax: 19.31, lngMin: -81.28, lngMax: -81.22 },
    { name: 'East End', latMin: 19.27, latMax: 19.35, lngMin: -81.18, lngMax: -81.08 },
    { name: 'North Side', latMin: 19.33, latMax: 19.40, lngMin: -81.30, lngMax: -81.18 },
    { name: 'Camana Bay', latMin: 19.32, latMax: 19.34, lngMin: -81.38, lngMax: -81.37 },
  ],

  // Cayman Islands bounds
  BOUNDS: {
    grandCayman: { latMin: 19.25, latMax: 19.41, lngMin: -81.45, lngMax: -81.05 },
    caymanBrac: { latMin: 19.68, latMax: 19.75, lngMin: -79.95, lngMax: -79.72 },
    littleCayman: { latMin: 19.65, latMax: 19.70, lngMin: -80.10, lngMax: -79.95 },
  },
};

// ============ UTILITIES ============

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
  const timestamp = new Date().toISOString().slice(11, 19);
  const prefix = {
    info: '\x1b[36m[INFO]\x1b[0m',
    success: '\x1b[32m[OK]\x1b[0m',
    error: '\x1b[31m[ERROR]\x1b[0m',
    warn: '\x1b[33m[WARN]\x1b[0m',
  }[type];
  console.log(`${timestamp} ${prefix} ${message}`);
}

function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function generateId(prefix: string, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  const hash = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${slug}-${hash}`;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
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

  return matrix[bLower.length][aLower.length];
}

/**
 * Calculate string similarity (0-1)
 */
function calculateSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

/**
 * Calculate distance between two coordinates in meters
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Determine which island based on coordinates
 */
function determineIsland(lat: number, lng: number): string {
  const { grandCayman, caymanBrac, littleCayman } = CONFIG.BOUNDS;

  if (
    lat >= grandCayman.latMin &&
    lat <= grandCayman.latMax &&
    lng >= grandCayman.lngMin &&
    lng <= grandCayman.lngMax
  ) {
    return 'Grand Cayman';
  }

  if (
    lat >= caymanBrac.latMin &&
    lat <= caymanBrac.latMax &&
    lng >= caymanBrac.lngMin &&
    lng <= caymanBrac.lngMax
  ) {
    return 'Cayman Brac';
  }

  if (
    lat >= littleCayman.latMin &&
    lat <= littleCayman.latMax &&
    lng >= littleCayman.lngMin &&
    lng <= littleCayman.lngMax
  ) {
    return 'Little Cayman';
  }

  return 'Grand Cayman'; // Default
}

/**
 * Determine district based on coordinates
 */
function determineDistrict(lat: number, lng: number): string {
  for (const district of CONFIG.DISTRICTS) {
    if (
      lat >= district.latMin &&
      lat <= district.latMax &&
      lng >= district.lngMin &&
      lng <= district.lngMax
    ) {
      return district.name;
    }
  }
  return 'Grand Cayman'; // Default
}

/**
 * Map Google Maps types to our category
 */
function mapCategory(types: string[], name: string): string {
  // Check types first
  for (const type of types) {
    if (CONFIG.CATEGORY_MAP[type]) {
      return CONFIG.CATEGORY_MAP[type];
    }
  }

  // Fall back to name-based detection
  const nameLower = name.toLowerCase();
  if (nameLower.includes('hotel') || nameLower.includes('resort') || nameLower.includes('inn')) {
    return 'hotel';
  }
  if (nameLower.includes('restaurant') || nameLower.includes('grill') || nameLower.includes('cafe')) {
    return 'restaurant';
  }
  if (nameLower.includes('bar') || nameLower.includes('pub')) {
    return 'bar';
  }
  if (nameLower.includes('beach')) {
    return 'beach';
  }
  if (nameLower.includes('dive') || nameLower.includes('snorkel')) {
    return 'diving_snorkeling';
  }
  if (nameLower.includes('spa') || nameLower.includes('wellness')) {
    return 'spa_wellness';
  }
  if (nameLower.includes('yacht') || nameLower.includes('boat') || nameLower.includes('charter')) {
    return 'boat_charter';
  }
  if (nameLower.includes('tour') || nameLower.includes('excursion')) {
    return 'activity';
  }
  if (nameLower.includes('shop') || nameLower.includes('store') || nameLower.includes('boutique')) {
    return 'shopping';
  }

  return 'attraction'; // Default
}

/**
 * Generate embedding text for RAG
 */
function generateEmbeddingText(node: Partial<KnowledgeNode>): string {
  const parts: string[] = [];

  if (node.name) parts.push(node.name);
  if (node.category) parts.push(node.category);
  if (node.shortDescription) parts.push(node.shortDescription);
  if (node.location?.district) parts.push(node.location.district);
  if (node.location?.island) parts.push(node.location.island);
  if (node.tags) parts.push(...node.tags);
  if (node.keywords) parts.push(...node.keywords);

  return parts.join(' ').substring(0, 500);
}

/**
 * Generate keywords from name and description
 */
function generateKeywords(name: string, description: string, category: string): string[] {
  const text = `${name} ${description} ${category}`.toLowerCase();
  const words = text
    .split(/\W+/)
    .filter(w => w.length > 3)
    .filter(w => !['the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'are'].includes(w));

  // Get unique words
  const unique = [...new Set(words)];
  return unique.slice(0, 15);
}

/**
 * Generate tags based on category and description
 */
function generateTags(category: string, description: string, name: string): string[] {
  const tags: string[] = [category];
  const text = `${name} ${description}`.toLowerCase();

  // Common tag patterns
  const tagPatterns: Array<{ pattern: RegExp; tag: string }> = [
    { pattern: /luxury|premium|five star|5 star/i, tag: 'luxury' },
    { pattern: /family|kid|child/i, tag: 'family-friendly' },
    { pattern: /beach|beachfront|oceanfront/i, tag: 'beachfront' },
    { pattern: /romantic|honeymoon|couples/i, tag: 'romantic' },
    { pattern: /dive|diving|scuba/i, tag: 'diving' },
    { pattern: /snorkel/i, tag: 'snorkeling' },
    { pattern: /spa|wellness|massage/i, tag: 'spa' },
    { pattern: /pool/i, tag: 'pool' },
    { pattern: /restaurant|dining|food/i, tag: 'dining' },
    { pattern: /seafood|fish/i, tag: 'seafood' },
    { pattern: /caribbean/i, tag: 'caribbean' },
    { pattern: /local|authentic/i, tag: 'local' },
    { pattern: /sunset/i, tag: 'sunset-views' },
    { pattern: /water sport/i, tag: 'water-sports' },
    { pattern: /golf/i, tag: 'golf' },
    { pattern: /pet friendly|pet-friendly/i, tag: 'pet-friendly' },
    { pattern: /all.?inclusive/i, tag: 'all-inclusive' },
  ];

  for (const { pattern, tag } of tagPatterns) {
    if (pattern.test(text)) {
      tags.push(tag);
    }
  }

  return [...new Set(tags)];
}

// ============ LOADERS ============

async function loadExistingKnowledgeBase(): Promise<KnowledgeNode[]> {
  const nodes: KnowledgeNode[] = [];

  // Load from both files
  const files = [
    path.join(__dirname, '../data/cayman-islands-knowledge.ts'),
    path.join(__dirname, '../data/serpapi-vip-data.ts'),
  ];

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      log(`File not found: ${filePath}`, 'warn');
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract node IDs and basic info using regex
    const idPattern = /id:\s*['"]([^'"]+)['"]/g;
    const namePattern = /name:\s*['"]([^'"]+)['"]/g;
    const categoryPattern = /category:\s*['"]([^'"]+)['"]/g;
    const latPattern = /latitude:\s*([-\d.]+)/g;
    const lngPattern = /longitude:\s*([-\d.]+)/g;

    let idMatch;
    const ids: string[] = [];
    while ((idMatch = idPattern.exec(content)) !== null) {
      ids.push(idMatch[1]);
    }

    log(`Loaded ${ids.length} node IDs from ${path.basename(filePath)}`);
  }

  return nodes;
}

function loadScrapedData(inputFile: string): ScrapedPlace[] {
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Input file not found: ${inputFile}`);
  }

  const content = fs.readFileSync(inputFile, 'utf-8');

  try {
    const data = JSON.parse(content);

    // Handle different data structures
    if (Array.isArray(data)) {
      return data;
    }

    if (data.results && Array.isArray(data.results)) {
      return data.results;
    }

    if (data.places && Array.isArray(data.places)) {
      return data.places;
    }

    throw new Error('Unrecognized data structure');
  } catch (error) {
    throw new Error(`Failed to parse input file: ${error}`);
  }
}

// ============ CONVERTERS ============

function convertScrapedToNode(scraped: ScrapedPlace): KnowledgeNode {
  // Extract coordinates
  const lat =
    scraped.geometry?.location?.lat ||
    scraped.lat ||
    scraped.latitude ||
    0;
  const lng =
    scraped.geometry?.location?.lng ||
    scraped.lng ||
    scraped.longitude ||
    0;

  // Determine location details
  const island = determineIsland(lat, lng);
  const district = determineDistrict(lat, lng);

  // Map category
  const category = scraped.category || mapCategory(scraped.types || [], scraped.name);

  // Generate description if not provided
  const description = scraped.description || `${scraped.name} is a ${category.replace(/_/g, ' ')} located in ${district}, ${island}.`;
  const shortDescription = description.substring(0, 150);

  // Map price level
  const priceRange = scraped.price_level
    ? CONFIG.PRICE_MAP[scraped.price_level] || '$$'
    : '$$';

  // Extract images
  const thumbnail =
    scraped.thumbnail ||
    (scraped.photos && scraped.photos[0]?.url) ||
    'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800';

  const images =
    scraped.images ||
    (scraped.photos?.map(p => p.url).filter(Boolean) as string[]) ||
    [];

  // Generate ID
  const id = generateId(category.substring(0, 4), scraped.name);

  // Create node
  const node: KnowledgeNode = {
    id,
    category,
    name: scraped.name,
    description,
    shortDescription,
    location: {
      address: scraped.formatted_address || scraped.address || '',
      district,
      island,
      latitude: lat,
      longitude: lng,
      googlePlaceId: scraped.place_id,
    },
    contact: {
      phone: scraped.phone || '',
      website: scraped.website || '',
    },
    media: {
      thumbnail,
      images,
    },
    business: {
      priceRange,
      currency: 'USD',
      openingHours: scraped.opening_hours
        ? { raw: scraped.opening_hours.weekday_text?.join(', ') }
        : undefined,
    },
    ratings: {
      overall: scraped.rating || 0,
      reviewCount: scraped.user_ratings_total || scraped.reviews_count || 0,
      googleRating: scraped.rating,
    },
    tags: generateTags(category, description, scraped.name),
    keywords: generateKeywords(scraped.name, description, category),
    embeddingText: '',
    isActive: true,
    isPremium: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'merge-scraped-data',
  };

  // Generate embedding text
  node.embeddingText = generateEmbeddingText(node);

  return node;
}

// ============ MERGER ============

function findDuplicate(
  scraped: ScrapedPlace,
  existing: KnowledgeNode[],
  config: MergeConfig
): KnowledgeNode | null {
  const scrapedLat = scraped.geometry?.location?.lat || scraped.lat || scraped.latitude || 0;
  const scrapedLng = scraped.geometry?.location?.lng || scraped.lng || scraped.longitude || 0;

  for (const node of existing) {
    // Check name similarity
    const similarity = calculateSimilarity(scraped.name, node.name);
    if (similarity >= config.similarityThreshold) {
      return node;
    }

    // Check proximity (only if both have valid coordinates)
    if (scrapedLat && scrapedLng && node.location.latitude && node.location.longitude) {
      const distance = calculateDistance(
        scrapedLat,
        scrapedLng,
        node.location.latitude,
        node.location.longitude
      );

      // If within proximity AND has some name similarity
      if (distance <= config.proximityMeters && similarity >= 0.5) {
        return node;
      }
    }

    // Check Google Place ID match
    if (scraped.place_id && node.location.googlePlaceId === scraped.place_id) {
      return node;
    }
  }

  return null;
}

function mergeNodeData(
  existing: KnowledgeNode,
  scraped: ScrapedPlace,
  preserveCurated: boolean
): KnowledgeNode {
  // Start with existing data
  const merged = { ...existing };

  // Update fields that are commonly better from scraped data
  // (unless preserveCurated is true and existing has manually set data)

  // Always update ratings if scraped is newer
  if (scraped.rating && scraped.rating > 0) {
    merged.ratings.googleRating = scraped.rating;

    // Only update overall if not preserving curated
    if (!preserveCurated || !existing.ratings.overall) {
      merged.ratings.overall = scraped.rating;
    }
  }

  if (scraped.user_ratings_total || scraped.reviews_count) {
    merged.ratings.reviewCount = scraped.user_ratings_total || scraped.reviews_count || 0;
  }

  // Update coordinates if missing
  if (!existing.location.latitude || !existing.location.longitude) {
    const lat = scraped.geometry?.location?.lat || scraped.lat || scraped.latitude;
    const lng = scraped.geometry?.location?.lng || scraped.lng || scraped.longitude;
    if (lat && lng) {
      merged.location.latitude = lat;
      merged.location.longitude = lng;
    }
  }

  // Update Google Place ID if missing
  if (!existing.location.googlePlaceId && scraped.place_id) {
    merged.location.googlePlaceId = scraped.place_id;
  }

  // Update phone if missing
  if (!existing.contact.phone && scraped.phone) {
    merged.contact.phone = scraped.phone;
  }

  // Update website if missing
  if (!existing.contact.website && scraped.website) {
    merged.contact.website = scraped.website;
  }

  // Update opening hours if available
  if (scraped.opening_hours && !existing.business.openingHours) {
    merged.business.openingHours = {
      raw: scraped.opening_hours.weekday_text?.join(', '),
    };
  }

  // Update timestamp
  merged.updatedAt = new Date().toISOString();

  return merged;
}

async function mergeData(config: MergeConfig): Promise<MergeResult> {
  log(`Starting merge process...`);
  log(`Input file: ${config.inputFile}`);
  log(`Dry run: ${config.isDryRun}`);
  log(`Preserve curated: ${config.preserveCurated}`);

  const result: MergeResult = {
    added: [],
    updated: [],
    skipped: [],
    duplicatesFound: [],
  };

  // Load existing data
  const existingNodes = await loadExistingKnowledgeBase();
  log(`Loaded ${existingNodes.length} existing nodes`);

  // Load scraped data
  const scrapedData = loadScrapedData(config.inputFile);
  log(`Loaded ${scrapedData.length} scraped places`);

  // Process each scraped place
  for (const scraped of scrapedData) {
    // Validate required fields
    if (!scraped.name) {
      result.skipped.push({ name: 'Unknown', reason: 'Missing name' });
      continue;
    }

    // Check for duplicate
    const duplicate = findDuplicate(scraped, existingNodes, config);

    if (duplicate) {
      // Found existing entry
      const similarity = calculateSimilarity(scraped.name, duplicate.name);
      result.duplicatesFound.push({
        scraped: scraped.name,
        existing: duplicate.name,
        similarity,
      });

      // Merge data
      const merged = mergeNodeData(duplicate, scraped, config.preserveCurated);
      result.updated.push(merged);
    } else {
      // New entry
      const newNode = convertScrapedToNode(scraped);
      result.added.push(newNode);
    }
  }

  return result;
}

// ============ OUTPUT ============

function generateMergedFile(result: MergeResult, outputPath: string): void {
  const allNodes = [...result.updated, ...result.added];

  const content = `/**
 * ISLE AI - Merged Knowledge Base
 * Generated: ${new Date().toISOString()}
 * Total nodes: ${allNodes.length}
 * - Updated: ${result.updated.length}
 * - Added: ${result.added.length}
 */

import type { KnowledgeNode } from '../types/chatbot';

export const MERGED_KNOWLEDGE_DATA: KnowledgeNode[] = ${JSON.stringify(allNodes, null, 2)};

export default MERGED_KNOWLEDGE_DATA;
`;

  fs.writeFileSync(outputPath, content, 'utf-8');
  log(`Merged data written to: ${outputPath}`, 'success');
}

function generateMergeReport(result: MergeResult, outputPath: string): void {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      added: result.added.length,
      updated: result.updated.length,
      skipped: result.skipped.length,
      duplicatesFound: result.duplicatesFound.length,
    },
    added: result.added.map(n => ({ id: n.id, name: n.name, category: n.category })),
    updated: result.updated.map(n => ({ id: n.id, name: n.name, category: n.category })),
    skipped: result.skipped,
    duplicates: result.duplicatesFound,
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  log(`Merge report written to: ${outputPath}`, 'success');
}

function printResult(result: MergeResult): void {
  console.log('\n' + '='.repeat(50));
  console.log('   MERGE RESULTS');
  console.log('='.repeat(50) + '\n');

  console.log(`Added: ${result.added.length} new entries`);
  console.log(`Updated: ${result.updated.length} existing entries`);
  console.log(`Skipped: ${result.skipped.length} entries`);
  console.log(`Duplicates found: ${result.duplicatesFound.length}`);

  if (result.added.length > 0) {
    console.log('\n--- NEW ENTRIES ---');
    for (const node of result.added.slice(0, 10)) {
      console.log(`  + ${node.name} (${node.category})`);
    }
    if (result.added.length > 10) {
      console.log(`  ... and ${result.added.length - 10} more`);
    }
  }

  if (result.updated.length > 0) {
    console.log('\n--- UPDATED ENTRIES ---');
    for (const node of result.updated.slice(0, 10)) {
      console.log(`  ~ ${node.name} (${node.category})`);
    }
    if (result.updated.length > 10) {
      console.log(`  ... and ${result.updated.length - 10} more`);
    }
  }

  if (result.duplicatesFound.length > 0) {
    console.log('\n--- DUPLICATES MERGED ---');
    for (const dup of result.duplicatesFound.slice(0, 10)) {
      console.log(`  "${dup.scraped}" <-> "${dup.existing}" (${(dup.similarity * 100).toFixed(0)}% similar)`);
    }
    if (result.duplicatesFound.length > 10) {
      console.log(`  ... and ${result.duplicatesFound.length - 10} more`);
    }
  }

  if (result.skipped.length > 0) {
    console.log('\n--- SKIPPED ---');
    for (const skip of result.skipped.slice(0, 5)) {
      console.log(`  - ${skip.name}: ${skip.reason}`);
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');
}

// ============ MAIN ============

function parseArgs(): MergeConfig {
  const args = process.argv.slice(2);

  const config: MergeConfig = {
    inputFile: '',
    isDryRun: args.includes('--dry-run'),
    preserveCurated: args.includes('--preserve-curated'),
    similarityThreshold: CONFIG.DEFAULT_SIMILARITY_THRESHOLD,
    proximityMeters: CONFIG.DEFAULT_PROXIMITY_METERS,
  };

  // Parse input file
  const inputIndex = args.indexOf('--input');
  if (inputIndex !== -1 && args[inputIndex + 1]) {
    config.inputFile = args[inputIndex + 1];
  }

  // Parse output file
  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    config.outputFile = args[outputIndex + 1];
  }

  // Parse similarity threshold
  const simIndex = args.indexOf('--similarity');
  if (simIndex !== -1 && args[simIndex + 1]) {
    config.similarityThreshold = parseFloat(args[simIndex + 1]);
  }

  // Parse proximity
  const proxIndex = args.indexOf('--proximity');
  if (proxIndex !== -1 && args[proxIndex + 1]) {
    config.proximityMeters = parseInt(args[proxIndex + 1], 10);
  }

  return config;
}

async function main(): Promise<void> {
  console.log('\n' + '='.repeat(50));
  console.log('   ISLE AI - MERGE SCRAPED DATA');
  console.log('='.repeat(50) + '\n');

  const config = parseArgs();

  if (!config.inputFile) {
    console.log('Usage: npx ts-node scripts/merge-scraped-data.ts --input <file.json> [options]');
    console.log('\nOptions:');
    console.log('  --input <file>        Input JSON file with scraped data (required)');
    console.log('  --output <file>       Output file path (default: data/merged-knowledge.ts)');
    console.log('  --dry-run             Preview changes without writing files');
    console.log('  --preserve-curated    Preserve manually curated data over scraped');
    console.log('  --similarity <0-1>    Name similarity threshold (default: 0.85)');
    console.log('  --proximity <meters>  Distance threshold for same location (default: 100)');
    console.log('\nExample:');
    console.log('  npx ts-node scripts/merge-scraped-data.ts --input scraped-hotels.json --preserve-curated');
    process.exit(1);
  }

  try {
    const result = await mergeData(config);
    printResult(result);

    if (!config.isDryRun) {
      ensureDirectoryExists(CONFIG.OUTPUT_DIR);

      // Write merged data
      const outputPath = config.outputFile || path.join(CONFIG.OUTPUT_DIR, 'merged-knowledge.ts');
      generateMergedFile(result, outputPath);

      // Write report
      const reportPath = path.join(CONFIG.OUTPUT_DIR, 'merge-report.json');
      generateMergeReport(result, reportPath);
    } else {
      log('[DRY RUN] No files written', 'info');
    }

    log('Merge complete!', 'success');
  } catch (error) {
    log(`Error: ${error}`, 'error');
    process.exit(1);
  }
}

main();
