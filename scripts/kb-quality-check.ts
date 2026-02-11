/**
 * ISLE AI - Knowledge Base Quality Check Script
 *
 * This script validates the quality of the knowledge base data:
 * - Validates all nodes have required fields
 * - Checks coordinate validity (within Cayman Islands bounds)
 * - Identifies duplicate entries
 * - Checks for placeholder/broken image URLs
 * - Outputs a comprehensive quality report
 *
 * Usage:
 *   npx ts-node scripts/kb-quality-check.ts
 *   npx ts-node scripts/kb-quality-check.ts --json     # Output as JSON
 *   npx ts-node scripts/kb-quality-check.ts --verbose  # Show all details
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

interface QualityIssue {
  nodeId: string;
  nodeName: string;
  category: string;
  severity: 'critical' | 'warning' | 'info';
  issue: string;
  field?: string;
  value?: unknown;
}

interface CategoryStats {
  count: number;
  withIssues: number;
  avgRating: number;
  avgReviews: number;
  premiumCount: number;
  featuredCount: number;
}

interface QualityReport {
  timestamp: string;
  summary: {
    totalNodes: number;
    validNodes: number;
    nodesWithIssues: number;
    criticalIssues: number;
    warnings: number;
    infoIssues: number;
    qualityScore: number; // 0-100
  };
  categoryStats: Record<string, CategoryStats>;
  issues: QualityIssue[];
  duplicates: Array<{ name: string; ids: string[] }>;
  coordinateIssues: Array<{ id: string; name: string; lat: number; lng: number; issue: string }>;
  imageIssues: Array<{ id: string; name: string; url: string; issue: string }>;
  missingFields: Array<{ id: string; name: string; fields: string[] }>;
  recommendations: string[];
}

// ============ CONFIGURATION ============

const CONFIG = {
  // Cayman Islands geographic bounds
  BOUNDS: {
    lat: { min: 19.25, max: 19.75 },
    lng: { min: -81.45, max: -79.7 },
  },

  // Placeholder/suspicious image patterns
  PLACEHOLDER_PATTERNS: [
    /placeholder/i,
    /default/i,
    /no-image/i,
    /noimage/i,
    /missing/i,
    /example\.com/i,
    /test\./i,
    /localhost/i,
    /127\.0\.0\.1/i,
    /^data:/i,
  ],

  // Valid image URL patterns
  VALID_IMAGE_PATTERNS: [
    /^https?:\/\//i,
  ],

  // Required fields for a valid node
  REQUIRED_FIELDS: [
    'id',
    'category',
    'name',
    'description',
    'shortDescription',
    'location',
    'contact',
    'media',
    'business',
    'ratings',
    'tags',
    'keywords',
    'embeddingText',
    'isActive',
    'createdAt',
    'updatedAt',
  ],

  // Required location fields
  REQUIRED_LOCATION_FIELDS: [
    'address',
    'district',
    'island',
    'latitude',
    'longitude',
  ],

  // Required media fields
  REQUIRED_MEDIA_FIELDS: ['thumbnail', 'images'],

  // Categories that should have coverage
  EXPECTED_CATEGORIES: [
    'hotel',
    'villa_rental',
    'restaurant',
    'bar',
    'nightlife',
    'beach',
    'diving_snorkeling',
    'water_sports',
    'boat_charter',
    'superyacht',
    'attraction',
    'activity',
    'golf',
    'shopping',
    'spa_wellness',
    'spa',
    'transport',
    'transportation',
    'chauffeur',
    'private_jet',
    'flight',
    'luxury_car_rental',
    'concierge',
    'vip_escort',
    'security_services',
    'service',
    'financial_services',
    'legal_services',
    'real_estate',
    'investment',
    'history',
    'culture',
    'wildlife',
    'weather',
    'visa_travel',
    'emergency',
    'general_info',
    'event',
    'festival',
  ],

  // Minimum recommended nodes per major category
  MIN_NODES_PER_CATEGORY: {
    hotel: 10,
    restaurant: 15,
    beach: 5,
    activity: 10,
    attraction: 5,
    diving_snorkeling: 5,
    bar: 5,
    shopping: 5,
  },

  // Output paths
  OUTPUT_DIR: path.join(__dirname, '../reports'),
  REPORT_FILE: 'kb-quality-report.json',
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

function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// ============ LOADERS ============

async function loadKnowledgeBase(): Promise<KnowledgeNode[]> {
  // Dynamic import to handle TypeScript modules
  try {
    // Try importing the combined knowledge base
    const dataPath = path.join(__dirname, '../data/cayman-islands-knowledge.ts');

    if (!fs.existsSync(dataPath)) {
      throw new Error(`Knowledge base file not found: ${dataPath}`);
    }

    // Read and parse the file manually since we can't use dynamic imports easily
    const content = fs.readFileSync(dataPath, 'utf-8');

    // Extract the arrays from the TypeScript file
    const nodes: KnowledgeNode[] = [];

    // Parse each exported array
    const arrayPatterns = [
      { name: 'CAYMAN_GENERAL_INFO', regex: /export const CAYMAN_GENERAL_INFO:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_HOTELS', regex: /export const CAYMAN_HOTELS:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_RESTAURANTS', regex: /export const CAYMAN_RESTAURANTS:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_BEACHES', regex: /export const CAYMAN_BEACHES:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_DIVING', regex: /export const CAYMAN_DIVING:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_SPAS', regex: /export const CAYMAN_SPAS:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_BARS', regex: /export const CAYMAN_BARS:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_ACTIVITIES', regex: /export const CAYMAN_ACTIVITIES:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_VIP_SERVICES', regex: /export const CAYMAN_VIP_SERVICES:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_SHOPPING', regex: /export const CAYMAN_SHOPPING:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_TRANSPORTATION', regex: /export const CAYMAN_TRANSPORTATION:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_SERVICES', regex: /export const CAYMAN_SERVICES:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_AIRLINES', regex: /export const CAYMAN_AIRLINES:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_EVENTS', regex: /export const CAYMAN_EVENTS:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_DIVE_EXTRAS', regex: /export const CAYMAN_DIVE_EXTRAS:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_OFFICIAL_CONTENT', regex: /export const CAYMAN_OFFICIAL_CONTENT:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_BUS_ROUTES', regex: /export const CAYMAN_BUS_ROUTES:\s*KnowledgeNode\[\]\s*=\s*\[/g },
      { name: 'CAYMAN_ADDITIONAL', regex: /export const CAYMAN_ADDITIONAL:\s*KnowledgeNode\[\]\s*=\s*\[/g },
    ];

    // Count nodes by extracting IDs
    const idPattern = /id:\s*['"]([^'"]+)['"]/g;
    let match;
    const ids: string[] = [];
    while ((match = idPattern.exec(content)) !== null) {
      ids.push(match[1]);
    }

    log(`Found ${ids.length} node IDs in knowledge base`);

    // Parse the nodes from the file content
    // This is a simplified parser - for full accuracy, use ts-node with proper imports
    const nodeBlocks = content.split(/\{\s*id:/g).slice(1);

    for (const block of nodeBlocks) {
      try {
        // Reconstruct the object and try to parse key fields
        const idMatch = block.match(/^['"]([^'"]+)['"]/);
        if (!idMatch) continue;

        const id = idMatch[1];
        const categoryMatch = block.match(/category:\s*['"]([^'"]+)['"]/);
        const nameMatch = block.match(/name:\s*['"]([^'"]+)['"]/);
        const descMatch = block.match(/description:\s*[`'"]([^`'"]*)[`'"]/);
        const shortDescMatch = block.match(/shortDescription:\s*['"]([^'"]*)['"]/);
        const latMatch = block.match(/latitude:\s*([-\d.]+)/);
        const lngMatch = block.match(/longitude:\s*([-\d.]+)/);
        const thumbnailMatch = block.match(/thumbnail:\s*['"]([^'"]+)['"]/);
        const ratingMatch = block.match(/overall:\s*([\d.]+)/);
        const reviewMatch = block.match(/reviewCount:\s*(\d+)/);
        const addressMatch = block.match(/address:\s*['"]([^'"]+)['"]/);
        const districtMatch = block.match(/district:\s*['"]([^'"]+)['"]/);
        const islandMatch = block.match(/island:\s*['"]([^'"]+)['"]/);
        const priceRangeMatch = block.match(/priceRange:\s*['"]([^'"]+)['"]/);
        const isActiveMatch = block.match(/isActive:\s*(true|false)/);
        const isPremiumMatch = block.match(/isPremium:\s*(true|false)/);
        const isFeaturedMatch = block.match(/isFeatured:\s*(true|false)/);
        const createdAtMatch = block.match(/createdAt:\s*['"]([^'"]+)['"]/);
        const updatedAtMatch = block.match(/updatedAt:\s*['"]([^'"]+)['"]/);
        const tagsMatch = block.match(/tags:\s*\[([^\]]*)\]/);
        const keywordsMatch = block.match(/keywords:\s*\[([^\]]*)\]/);
        const embeddingMatch = block.match(/embeddingText:\s*['"]([^'"]*)['"]/);
        const imagesMatch = block.match(/images:\s*\[([^\]]*)\]/);
        const websiteMatch = block.match(/website:\s*['"]([^'"]+)['"]/);
        const phoneMatch = block.match(/phone:\s*['"]([^'"]+)['"]/);

        const parseArrayFromMatch = (match: RegExpMatchArray | null): string[] => {
          if (!match || !match[1]) return [];
          return match[1]
            .split(',')
            .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
            .filter(s => s.length > 0);
        };

        const node: KnowledgeNode = {
          id,
          category: categoryMatch?.[1] || 'unknown',
          name: nameMatch?.[1] || 'Unknown',
          description: descMatch?.[1] || '',
          shortDescription: shortDescMatch?.[1] || '',
          location: {
            address: addressMatch?.[1] || '',
            district: districtMatch?.[1] || '',
            island: islandMatch?.[1] || 'Grand Cayman',
            latitude: latMatch ? parseFloat(latMatch[1]) : 0,
            longitude: lngMatch ? parseFloat(lngMatch[1]) : 0,
          },
          contact: {
            website: websiteMatch?.[1] || '',
            phone: phoneMatch?.[1] || '',
          },
          media: {
            thumbnail: thumbnailMatch?.[1] || '',
            images: parseArrayFromMatch(imagesMatch),
          },
          business: {
            priceRange: priceRangeMatch?.[1] || '$$',
            currency: 'USD',
          },
          ratings: {
            overall: ratingMatch ? parseFloat(ratingMatch[1]) : 0,
            reviewCount: reviewMatch ? parseInt(reviewMatch[1], 10) : 0,
          },
          tags: parseArrayFromMatch(tagsMatch),
          keywords: parseArrayFromMatch(keywordsMatch),
          embeddingText: embeddingMatch?.[1] || '',
          isActive: isActiveMatch?.[1] === 'true',
          isPremium: isPremiumMatch?.[1] === 'true',
          isFeatured: isFeaturedMatch?.[1] === 'true',
          createdAt: createdAtMatch?.[1] || new Date().toISOString(),
          updatedAt: updatedAtMatch?.[1] || new Date().toISOString(),
          createdBy: 'system',
        };

        nodes.push(node);
      } catch (err) {
        // Skip malformed nodes
      }
    }

    log(`Successfully parsed ${nodes.length} nodes from knowledge base`);
    return nodes;
  } catch (error) {
    log(`Error loading knowledge base: ${error}`, 'error');
    throw error;
  }
}

async function loadSerpAPIData(): Promise<KnowledgeNode[]> {
  try {
    const dataPath = path.join(__dirname, '../data/serpapi-vip-data.ts');

    if (!fs.existsSync(dataPath)) {
      log('SerpAPI data file not found, skipping', 'warn');
      return [];
    }

    const content = fs.readFileSync(dataPath, 'utf-8');

    // Extract the JSON array from the file
    const jsonMatch = content.match(/export const SERPAPI_ENRICHED_DATA:\s*KnowledgeNode\[\]\s*=\s*(\[[\s\S]*?\]);/);

    if (!jsonMatch) {
      log('Could not parse SerpAPI data format', 'warn');
      return [];
    }

    try {
      // The content is already JSON-like, try to parse
      const jsonStr = jsonMatch[1]
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/(['"])?([a-zA-Z_][a-zA-Z0-9_]*)\1\s*:/g, '"$2":'); // Ensure property names are quoted

      const data = JSON.parse(jsonStr);
      log(`Loaded ${data.length} nodes from SerpAPI data`);
      return data;
    } catch {
      // Fall back to counting IDs
      const idPattern = /"id":\s*"([^"]+)"/g;
      let match;
      let count = 0;
      while ((match = idPattern.exec(content)) !== null) {
        count++;
      }
      log(`Found approximately ${count} nodes in SerpAPI data (parse failed, using estimate)`);
      return [];
    }
  } catch (error) {
    log(`Error loading SerpAPI data: ${error}`, 'warn');
    return [];
  }
}

// ============ VALIDATORS ============

function validateCoordinates(node: KnowledgeNode): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const { latitude, longitude } = node.location;

  // Check for zero/null coordinates
  if (!latitude || !longitude) {
    issues.push({
      nodeId: node.id,
      nodeName: node.name,
      category: node.category,
      severity: 'critical',
      issue: 'Missing coordinates',
      field: 'location',
      value: { latitude, longitude },
    });
    return issues;
  }

  // Check bounds
  if (latitude < CONFIG.BOUNDS.lat.min || latitude > CONFIG.BOUNDS.lat.max) {
    issues.push({
      nodeId: node.id,
      nodeName: node.name,
      category: node.category,
      severity: 'warning',
      issue: `Latitude ${latitude} is outside Cayman Islands bounds (${CONFIG.BOUNDS.lat.min} - ${CONFIG.BOUNDS.lat.max})`,
      field: 'location.latitude',
      value: latitude,
    });
  }

  if (longitude < CONFIG.BOUNDS.lng.min || longitude > CONFIG.BOUNDS.lng.max) {
    issues.push({
      nodeId: node.id,
      nodeName: node.name,
      category: node.category,
      severity: 'warning',
      issue: `Longitude ${longitude} is outside Cayman Islands bounds (${CONFIG.BOUNDS.lng.min} - ${CONFIG.BOUNDS.lng.max})`,
      field: 'location.longitude',
      value: longitude,
    });
  }

  return issues;
}

function validateImageUrl(url: string): { valid: boolean; issue?: string } {
  if (!url || url.trim() === '') {
    return { valid: false, issue: 'Empty URL' };
  }

  // Check for placeholder patterns
  for (const pattern of CONFIG.PLACEHOLDER_PATTERNS) {
    if (pattern.test(url)) {
      return { valid: false, issue: 'Placeholder/test image detected' };
    }
  }

  // Check for valid URL format
  let hasValidPattern = false;
  for (const pattern of CONFIG.VALID_IMAGE_PATTERNS) {
    if (pattern.test(url)) {
      hasValidPattern = true;
      break;
    }
  }

  if (!hasValidPattern) {
    return { valid: false, issue: 'Invalid URL format' };
  }

  return { valid: true };
}

function validateMedia(node: KnowledgeNode): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Check thumbnail
  const thumbnailCheck = validateImageUrl(node.media.thumbnail);
  if (!thumbnailCheck.valid) {
    issues.push({
      nodeId: node.id,
      nodeName: node.name,
      category: node.category,
      severity: 'warning',
      issue: `Invalid thumbnail: ${thumbnailCheck.issue}`,
      field: 'media.thumbnail',
      value: node.media.thumbnail,
    });
  }

  // Check images array
  if (!node.media.images || node.media.images.length === 0) {
    issues.push({
      nodeId: node.id,
      nodeName: node.name,
      category: node.category,
      severity: 'info',
      issue: 'No additional images',
      field: 'media.images',
      value: [],
    });
  } else {
    for (const imageUrl of node.media.images) {
      const check = validateImageUrl(imageUrl);
      if (!check.valid) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          category: node.category,
          severity: 'info',
          issue: `Invalid image in gallery: ${check.issue}`,
          field: 'media.images',
          value: imageUrl,
        });
      }
    }
  }

  return issues;
}

function validateRequiredFields(node: KnowledgeNode): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const missingFields: string[] = [];

  // Check top-level required fields
  for (const field of CONFIG.REQUIRED_FIELDS) {
    const value = (node as Record<string, unknown>)[field];
    if (value === undefined || value === null || value === '') {
      missingFields.push(field);
    }
  }

  // Check location fields
  for (const field of CONFIG.REQUIRED_LOCATION_FIELDS) {
    const value = (node.location as Record<string, unknown>)[field];
    if (value === undefined || value === null || value === '') {
      missingFields.push(`location.${field}`);
    }
  }

  // Check media fields
  for (const field of CONFIG.REQUIRED_MEDIA_FIELDS) {
    const value = (node.media as Record<string, unknown>)[field];
    if (value === undefined || value === null) {
      missingFields.push(`media.${field}`);
    }
  }

  if (missingFields.length > 0) {
    issues.push({
      nodeId: node.id,
      nodeName: node.name,
      category: node.category,
      severity: missingFields.some(f => ['id', 'name', 'category'].includes(f)) ? 'critical' : 'warning',
      issue: `Missing required fields: ${missingFields.join(', ')}`,
      field: 'multiple',
      value: missingFields,
    });
  }

  return issues;
}

function validateDataQuality(node: KnowledgeNode): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Check description quality
  if (node.description && node.description.length < 50) {
    issues.push({
      nodeId: node.id,
      nodeName: node.name,
      category: node.category,
      severity: 'info',
      issue: 'Description is too short (less than 50 characters)',
      field: 'description',
      value: node.description.length,
    });
  }

  // Check for placeholder/generic names
  const genericNames = ['test', 'placeholder', 'sample', 'example', 'untitled'];
  const lowerName = node.name.toLowerCase();
  for (const generic of genericNames) {
    if (lowerName.includes(generic)) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        category: node.category,
        severity: 'warning',
        issue: 'Name appears to be placeholder/generic',
        field: 'name',
        value: node.name,
      });
      break;
    }
  }

  // Check rating validity
  if (node.ratings.overall < 0 || node.ratings.overall > 5) {
    issues.push({
      nodeId: node.id,
      nodeName: node.name,
      category: node.category,
      severity: 'warning',
      issue: 'Rating is outside valid range (0-5)',
      field: 'ratings.overall',
      value: node.ratings.overall,
    });
  }

  // Check for empty tags
  if (!node.tags || node.tags.length === 0) {
    issues.push({
      nodeId: node.id,
      nodeName: node.name,
      category: node.category,
      severity: 'info',
      issue: 'No tags defined',
      field: 'tags',
      value: [],
    });
  }

  // Check for empty keywords
  if (!node.keywords || node.keywords.length === 0) {
    issues.push({
      nodeId: node.id,
      nodeName: node.name,
      category: node.category,
      severity: 'info',
      issue: 'No keywords defined',
      field: 'keywords',
      value: [],
    });
  }

  // Check embedding text
  if (!node.embeddingText || node.embeddingText.length < 20) {
    issues.push({
      nodeId: node.id,
      nodeName: node.name,
      category: node.category,
      severity: 'warning',
      issue: 'Embedding text is missing or too short for effective RAG',
      field: 'embeddingText',
      value: node.embeddingText?.length || 0,
    });
  }

  return issues;
}

function findDuplicates(nodes: KnowledgeNode[]): Array<{ name: string; ids: string[] }> {
  const nameMap = new Map<string, string[]>();
  const duplicates: Array<{ name: string; ids: string[] }> = [];

  // First pass: exact matches
  for (const node of nodes) {
    const normalizedName = normalizeForComparison(node.name);
    if (!nameMap.has(normalizedName)) {
      nameMap.set(normalizedName, []);
    }
    nameMap.get(normalizedName)!.push(node.id);
  }

  // Find exact duplicates
  for (const [name, ids] of nameMap.entries()) {
    if (ids.length > 1) {
      // Find the original name
      const originalName = nodes.find(n => normalizeForComparison(n.name) === name)?.name || name;
      duplicates.push({ name: originalName, ids });
    }
  }

  // Second pass: fuzzy matches (Levenshtein distance <= 3)
  const processedPairs = new Set<string>();
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const pairKey = `${nodes[i].id}-${nodes[j].id}`;
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const distance = levenshteinDistance(nodes[i].name, nodes[j].name);
      const maxLen = Math.max(nodes[i].name.length, nodes[j].name.length);
      const similarity = 1 - distance / maxLen;

      // If names are > 90% similar, flag as potential duplicate
      if (similarity > 0.9 && distance <= 3 && distance > 0) {
        // Check if not already in exact duplicates
        const existingDup = duplicates.find(
          d => d.ids.includes(nodes[i].id) && d.ids.includes(nodes[j].id)
        );
        if (!existingDup) {
          duplicates.push({
            name: `${nodes[i].name} <-> ${nodes[j].name} (fuzzy)`,
            ids: [nodes[i].id, nodes[j].id],
          });
        }
      }
    }
  }

  return duplicates;
}

// ============ MAIN QUALITY CHECK ============

async function runQualityCheck(): Promise<QualityReport> {
  log('Starting knowledge base quality check...');

  // Load data
  const nodes = await loadKnowledgeBase();
  const serpApiNodes = await loadSerpAPIData();
  const allNodes = [...nodes];

  // Initialize report
  const report: QualityReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalNodes: allNodes.length,
      validNodes: 0,
      nodesWithIssues: 0,
      criticalIssues: 0,
      warnings: 0,
      infoIssues: 0,
      qualityScore: 0,
    },
    categoryStats: {},
    issues: [],
    duplicates: [],
    coordinateIssues: [],
    imageIssues: [],
    missingFields: [],
    recommendations: [],
  };

  // Track nodes with issues
  const nodesWithIssues = new Set<string>();

  // Validate each node
  for (const node of allNodes) {
    const nodeIssues: QualityIssue[] = [];

    // Run all validators
    nodeIssues.push(...validateRequiredFields(node));
    nodeIssues.push(...validateCoordinates(node));
    nodeIssues.push(...validateMedia(node));
    nodeIssues.push(...validateDataQuality(node));

    // Add to report
    report.issues.push(...nodeIssues);

    // Track specific issue types
    for (const issue of nodeIssues) {
      nodesWithIssues.add(node.id);

      if (issue.field?.includes('coordinate') || issue.field?.includes('latitude') || issue.field?.includes('longitude') || issue.issue.includes('coordinate') || issue.issue.includes('Latitude') || issue.issue.includes('Longitude')) {
        report.coordinateIssues.push({
          id: node.id,
          name: node.name,
          lat: node.location.latitude,
          lng: node.location.longitude,
          issue: issue.issue,
        });
      }

      if (issue.field?.includes('media') || issue.field?.includes('thumbnail') || issue.field?.includes('image')) {
        report.imageIssues.push({
          id: node.id,
          name: node.name,
          url: String(issue.value),
          issue: issue.issue,
        });
      }

      if (issue.issue.includes('Missing required fields')) {
        report.missingFields.push({
          id: node.id,
          name: node.name,
          fields: issue.value as string[],
        });
      }

      // Count by severity
      switch (issue.severity) {
        case 'critical':
          report.summary.criticalIssues++;
          break;
        case 'warning':
          report.summary.warnings++;
          break;
        case 'info':
          report.summary.infoIssues++;
          break;
      }
    }
  }

  // Find duplicates
  report.duplicates = findDuplicates(allNodes);

  // Calculate category stats
  const categoryGroups = new Map<string, KnowledgeNode[]>();
  for (const node of allNodes) {
    if (!categoryGroups.has(node.category)) {
      categoryGroups.set(node.category, []);
    }
    categoryGroups.get(node.category)!.push(node);
  }

  for (const [category, categoryNodes] of categoryGroups.entries()) {
    const ratings = categoryNodes.filter(n => n.ratings.overall > 0).map(n => n.ratings.overall);
    const reviews = categoryNodes.map(n => n.ratings.reviewCount);

    report.categoryStats[category] = {
      count: categoryNodes.length,
      withIssues: categoryNodes.filter(n => nodesWithIssues.has(n.id)).length,
      avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
      avgReviews: reviews.length > 0 ? reviews.reduce((a, b) => a + b, 0) / reviews.length : 0,
      premiumCount: categoryNodes.filter(n => n.isPremium).length,
      featuredCount: categoryNodes.filter(n => n.isFeatured).length,
    };
  }

  // Calculate summary
  report.summary.nodesWithIssues = nodesWithIssues.size;
  report.summary.validNodes = allNodes.length - nodesWithIssues.size;

  // Calculate quality score (0-100)
  const criticalPenalty = report.summary.criticalIssues * 10;
  const warningPenalty = report.summary.warnings * 2;
  const infoPenalty = report.summary.infoIssues * 0.5;
  const duplicatePenalty = report.duplicates.length * 5;
  const totalPenalty = criticalPenalty + warningPenalty + infoPenalty + duplicatePenalty;
  const maxPenalty = allNodes.length * 15; // Max theoretical penalty
  report.summary.qualityScore = Math.max(0, Math.round(100 - (totalPenalty / maxPenalty) * 100));

  // Generate recommendations
  if (report.summary.criticalIssues > 0) {
    report.recommendations.push(`Fix ${report.summary.criticalIssues} critical issues - these nodes may not function correctly`);
  }

  if (report.duplicates.length > 0) {
    report.recommendations.push(`Review and merge ${report.duplicates.length} potential duplicate entries`);
  }

  if (report.coordinateIssues.length > 0) {
    report.recommendations.push(`Verify coordinates for ${report.coordinateIssues.length} nodes - some may be outside Cayman Islands`);
  }

  if (report.imageIssues.length > 0) {
    report.recommendations.push(`Update ${report.imageIssues.length} placeholder or invalid images`);
  }

  // Check for missing categories
  const existingCategories = new Set(categoryGroups.keys());
  const missingCategories = CONFIG.EXPECTED_CATEGORIES.filter(c => !existingCategories.has(c));
  if (missingCategories.length > 0) {
    report.recommendations.push(`Add content for missing categories: ${missingCategories.join(', ')}`);
  }

  // Check for underpopulated categories
  for (const [category, minCount] of Object.entries(CONFIG.MIN_NODES_PER_CATEGORY)) {
    const currentCount = report.categoryStats[category]?.count || 0;
    if (currentCount < minCount) {
      report.recommendations.push(`Category "${category}" has only ${currentCount}/${minCount} recommended nodes`);
    }
  }

  return report;
}

// ============ OUTPUT ============

function printReport(report: QualityReport, verbose: boolean): void {
  console.log('\n' + '='.repeat(60));
  console.log('   ISLE AI - KNOWLEDGE BASE QUALITY REPORT');
  console.log('='.repeat(60) + '\n');

  console.log(`Generated: ${report.timestamp}`);
  console.log(`Quality Score: ${report.summary.qualityScore}/100\n`);

  console.log('--- SUMMARY ---');
  console.log(`Total Nodes: ${report.summary.totalNodes}`);
  console.log(`Valid Nodes: ${report.summary.validNodes}`);
  console.log(`Nodes with Issues: ${report.summary.nodesWithIssues}`);
  console.log(`  - Critical: ${report.summary.criticalIssues}`);
  console.log(`  - Warnings: ${report.summary.warnings}`);
  console.log(`  - Info: ${report.summary.infoIssues}`);
  console.log(`Potential Duplicates: ${report.duplicates.length}`);

  console.log('\n--- CATEGORY BREAKDOWN ---');
  const sortedCategories = Object.entries(report.categoryStats)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [category, stats] of sortedCategories) {
    console.log(`  ${category}: ${stats.count} nodes (${stats.withIssues} with issues) - Avg rating: ${stats.avgRating.toFixed(1)}`);
  }

  if (report.duplicates.length > 0) {
    console.log('\n--- POTENTIAL DUPLICATES ---');
    for (const dup of report.duplicates.slice(0, 10)) {
      console.log(`  "${dup.name}" - IDs: ${dup.ids.join(', ')}`);
    }
    if (report.duplicates.length > 10) {
      console.log(`  ... and ${report.duplicates.length - 10} more`);
    }
  }

  if (report.coordinateIssues.length > 0 && verbose) {
    console.log('\n--- COORDINATE ISSUES ---');
    for (const issue of report.coordinateIssues.slice(0, 10)) {
      console.log(`  ${issue.name}: (${issue.lat}, ${issue.lng}) - ${issue.issue}`);
    }
    if (report.coordinateIssues.length > 10) {
      console.log(`  ... and ${report.coordinateIssues.length - 10} more`);
    }
  }

  if (report.imageIssues.length > 0 && verbose) {
    console.log('\n--- IMAGE ISSUES ---');
    for (const issue of report.imageIssues.slice(0, 10)) {
      console.log(`  ${issue.name}: ${issue.issue}`);
    }
    if (report.imageIssues.length > 10) {
      console.log(`  ... and ${report.imageIssues.length - 10} more`);
    }
  }

  if (report.recommendations.length > 0) {
    console.log('\n--- RECOMMENDATIONS ---');
    for (const rec of report.recommendations) {
      console.log(`  - ${rec}`);
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

function saveReport(report: QualityReport): void {
  ensureDirectoryExists(CONFIG.OUTPUT_DIR);
  const outputPath = path.join(CONFIG.OUTPUT_DIR, CONFIG.REPORT_FILE);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  log(`Report saved to: ${outputPath}`, 'success');
}

// ============ MAIN ============

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const verbose = args.includes('--verbose');

  try {
    const report = await runQualityCheck();

    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printReport(report, verbose);
    }

    // Always save the full report
    saveReport(report);

    // Exit with error code if critical issues found
    if (report.summary.criticalIssues > 0) {
      process.exit(1);
    }
  } catch (error) {
    log(`Fatal error: ${error}`, 'error');
    process.exit(1);
  }
}

main();
