#!/usr/bin/env npx ts-node --esm

/**
 * ISLE AI - Comprehensive Knowledge Base Enrichment Script
 *
 * This script enriches ALL places in the knowledge base with real data from Google Places:
 * - Replaces Unsplash/placeholder images with real Google Photos
 * - Adds missing phone numbers
 * - Adds missing websites
 * - Updates addresses and coordinates
 * - Gets real ratings and review counts
 *
 * Usage:
 *   npm run enrich:kb              # Enrich all places
 *   npm run enrich:kb:dry-run      # Preview without API calls
 *   npm run enrich:kb -- --limit=100   # Limit to first 100 places
 *
 * Requires: GOOGLE_PLACES_API_KEY in .env
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ============ TYPES ============

interface KnowledgeNodeLocation {
  address?: string;
  district?: string;
  island?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: { lat: number; lng: number };
  googlePlaceId?: string;
}

interface KnowledgeNode {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  shortDescription?: string;
  location: KnowledgeNodeLocation;
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    bookingUrl?: string;
  };
  business?: {
    priceRange?: string;
    openingHours?: any;
    phone?: string;
    website?: string;
    hours?: string;
  };
  media?: {
    thumbnail?: string;
    images?: string[];
  };
  ratings?: {
    overall?: number;
    reviewCount?: number;
    googleRating?: number;
  };
  tags?: string[];
  isActive?: boolean;
  [key: string]: any;
}

interface GooglePlaceDetails {
  place_id: string;
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    weekday_text?: string[];
    open_now?: boolean;
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  editorial_summary?: {
    overview: string;
  };
  geometry?: {
    location: { lat: number; lng: number };
  };
}

interface EnrichmentStats {
  total: number;
  processed: number;
  enriched: number;
  skipped: number;
  failed: number;
  photosReplaced: number;
  phonesAdded: number;
  websitesAdded: number;
  apiCalls: number;
  estimatedCost: number;
}

// ============ CONSTANTS ============

const UNSPLASH_PATTERN = /unsplash\.com/i;
const PLACEHOLDER_PATTERN = /placehold|placeholder|no-image|default/i;

const RATE_LIMIT_MS = 200; // 5 requests per second
let lastRequestTime = 0;

// ============ HELPERS ============

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await sleep(RATE_LIMIT_MS - timeSinceLastRequest);
  }

  lastRequestTime = Date.now();
  return fetch(url);
}

function isPlaceholderImage(url?: string): boolean {
  if (!url) return true;
  return UNSPLASH_PATTERN.test(url) || PLACEHOLDER_PATTERN.test(url);
}

function needsEnrichment(node: KnowledgeNode): boolean {
  if (!node.isActive && node.isActive !== undefined) return false;

  const hasPlaceholderImage = isPlaceholderImage(node.media?.thumbnail);
  const missingPhone = !node.contact?.phone && !node.business?.phone;
  const missingWebsite = !node.contact?.website && !node.business?.website;
  const hasLowReviews = !node.ratings?.reviewCount || node.ratings.reviewCount < 5;

  return hasPlaceholderImage || missingPhone || missingWebsite || hasLowReviews;
}

function getCoordinates(node: KnowledgeNode): { lat: number; lng: number } | null {
  const lat = node.location?.coordinates?.lat ?? node.location?.latitude;
  const lng = node.location?.coordinates?.lng ?? node.location?.longitude;

  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    return { lat, lng };
  }
  return null;
}

// ============ GOOGLE PLACES API ============

async function findGooglePlace(
  name: string,
  lat: number,
  lng: number,
  apiKey: string
): Promise<string | null> {
  const query = encodeURIComponent(name);
  const location = `${lat},${lng}`;

  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&locationbias=circle:1000@${location}&fields=place_id,name,formatted_address&key=${apiKey}`;

  try {
    const response = await rateLimitedFetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.candidates?.length > 0) {
      return data.candidates[0].place_id;
    }
  } catch (error) {
    console.error(`  Error finding place "${name}":`, error);
  }

  return null;
}

async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<GooglePlaceDetails | null> {
  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'formatted_phone_number',
    'international_phone_number',
    'website',
    'rating',
    'user_ratings_total',
    'price_level',
    'opening_hours',
    'photos',
    'editorial_summary',
    'geometry'
  ].join(',');

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

  try {
    const response = await rateLimitedFetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.result) {
      return data.result;
    }
  } catch (error) {
    console.error(`  Error getting details for ${placeId}:`, error);
  }

  return null;
}

function getPhotoUrl(photoReference: string, apiKey: string, maxWidth: number = 800): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
}

// ============ ENRICHMENT ============

async function enrichNode(
  node: KnowledgeNode,
  apiKey: string,
  stats: EnrichmentStats
): Promise<KnowledgeNode> {
  const coords = getCoordinates(node);
  if (!coords) {
    console.log(`  Skip (no coords): ${node.name}`);
    stats.skipped++;
    return node;
  }

  // Find Google Place ID
  let placeId = node.location?.googlePlaceId;

  if (!placeId) {
    stats.apiCalls++;
    placeId = await findGooglePlace(node.name, coords.lat, coords.lng, apiKey);

    if (!placeId) {
      console.log(`  No match: ${node.name}`);
      stats.failed++;
      return node;
    }
  }

  // Get place details
  stats.apiCalls++;
  const details = await getPlaceDetails(placeId, apiKey);

  if (!details) {
    console.log(`  No details: ${node.name}`);
    stats.failed++;
    return node;
  }

  // Create enriched node
  const enriched: KnowledgeNode = { ...node };

  // Update location with Google Place ID
  enriched.location = {
    ...node.location,
    googlePlaceId: placeId,
    address: details.formatted_address || node.location?.address
  };

  // Update phone number
  const newPhone = details.formatted_phone_number || details.international_phone_number;
  if (newPhone && !node.contact?.phone && !node.business?.phone) {
    if (enriched.contact) {
      enriched.contact.phone = newPhone;
    } else if (enriched.business) {
      enriched.business.phone = newPhone;
    } else {
      enriched.contact = { phone: newPhone };
    }
    stats.phonesAdded++;
  }

  // Update website
  if (details.website && !node.contact?.website && !node.business?.website) {
    if (enriched.contact) {
      enriched.contact.website = details.website;
    } else if (enriched.business) {
      enriched.business.website = details.website;
    } else {
      enriched.contact = { ...(enriched.contact || {}), website: details.website };
    }
    stats.websitesAdded++;
  }

  // Update ratings
  if (details.rating !== undefined || details.user_ratings_total !== undefined) {
    enriched.ratings = {
      ...(node.ratings || {}),
      overall: details.rating || node.ratings?.overall || 0,
      reviewCount: details.user_ratings_total || node.ratings?.reviewCount || 0,
      googleRating: details.rating
    };
  }

  // Replace photos if current ones are placeholders
  if (details.photos && details.photos.length > 0 && isPlaceholderImage(node.media?.thumbnail)) {
    const photoUrls = details.photos.slice(0, 5).map(photo =>
      getPhotoUrl(photo.photo_reference, apiKey)
    );

    enriched.media = {
      thumbnail: photoUrls[0],
      images: photoUrls
    };
    stats.photosReplaced++;
  }

  // Update description if we have editorial summary and current is generic
  if (details.editorial_summary?.overview &&
      (!node.description || node.description.includes('located in the Cayman Islands'))) {
    enriched.description = details.editorial_summary.overview;
    enriched.shortDescription = details.editorial_summary.overview.substring(0, 150);
  }

  stats.enriched++;
  console.log(`  + ${node.name} (${details.rating || 0}* ${details.user_ratings_total || 0} reviews)`);

  return enriched;
}

// ============ FILE PROCESSING ============

interface DataSource {
  name: string;
  path: string;
  exportName: string;
  format: 'ts' | 'json';
}

const DATA_SOURCES: DataSource[] = [
  {
    name: 'Curated Knowledge Base',
    path: path.join(PROJECT_ROOT, 'data', 'cayman-islands-knowledge.ts'),
    exportName: 'CAYMAN_KNOWLEDGE_BASE',
    format: 'ts'
  },
  {
    name: 'SerpAPI VIP Data',
    path: path.join(PROJECT_ROOT, 'data', 'serpapi-vip-data.ts'),
    exportName: 'SERPAPI_KNOWLEDGE',
    format: 'ts'
  },
  {
    name: 'OSM Knowledge',
    path: path.join(PROJECT_ROOT, 'data', 'osm-scraped', 'osm-knowledge.ts'),
    exportName: 'OSM_KNOWLEDGE',
    format: 'ts'
  }
];

function loadKnowledgeData(source: DataSource): KnowledgeNode[] {
  if (!fs.existsSync(source.path)) {
    console.log(`Skipping ${source.name} - file not found`);
    return [];
  }

  try {
    const content = fs.readFileSync(source.path, 'utf-8');

    // Extract the array from the TypeScript file
    const match = content.match(/export\s+(?:const|let|var)\s+\w+\s*(?::\s*\w+(?:\[\])?\s*)?=\s*(\[[\s\S]*\]);?\s*(?:export|$)/);

    if (match) {
      // Clean up the JSON-like content
      let jsonContent = match[1];

      // Remove trailing semicolons and clean up
      jsonContent = jsonContent.replace(/;\s*$/, '');

      // Handle template literals by converting to regular strings
      jsonContent = jsonContent.replace(/`([^`]*)`/g, (_, content) => {
        return JSON.stringify(content.replace(/\n/g, ' ').trim());
      });

      try {
        return JSON.parse(jsonContent);
      } catch (parseError) {
        // Try eval as fallback (for complex TypeScript)
        console.log(`  Warning: JSON parse failed for ${source.name}, using dynamic import`);
        return [];
      }
    }
  } catch (error) {
    console.error(`Error loading ${source.name}:`, error);
  }

  return [];
}

function analyzeDataQuality(nodes: KnowledgeNode[]): void {
  const activeNodes = nodes.filter(n => n.isActive !== false);

  let unsplashImages = 0;
  let missingWebsites = 0;
  let missingPhones = 0;
  let lowReviews = 0;

  for (const node of activeNodes) {
    if (isPlaceholderImage(node.media?.thumbnail)) unsplashImages++;
    if (!node.contact?.website && !node.business?.website) missingWebsites++;
    if (!node.contact?.phone && !node.business?.phone) missingPhones++;
    if (!node.ratings?.reviewCount || node.ratings.reviewCount < 5) lowReviews++;
  }

  console.log(`  Active places: ${activeNodes.length}`);
  console.log(`  Placeholder images: ${unsplashImages}`);
  console.log(`  Missing websites: ${missingWebsites}`);
  console.log(`  Missing phones: ${missingPhones}`);
  console.log(`  Low/no reviews: ${lowReviews}`);
}

// ============ MAIN ============

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const maxNodes = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;
  const sourceArg = args.find(a => a.startsWith('--source='));
  const targetSource = sourceArg ? sourceArg.split('=')[1] : null;

  console.log('============================================');
  console.log('ISLE AI - KNOWLEDGE BASE ENRICHMENT');
  console.log('============================================');
  console.log('');

  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey && !dryRun) {
    console.error('ERROR: GOOGLE_PLACES_API_KEY not found in .env');
    console.error('Add: GOOGLE_PLACES_API_KEY=your_key_here');
    process.exit(1);
  }

  if (dryRun) {
    console.log('MODE: Dry Run (no API calls)\n');
  }

  // Analyze each data source
  console.log('Data Quality Analysis:');
  console.log('');

  const allNodesToEnrich: { node: KnowledgeNode; source: DataSource }[] = [];

  for (const source of DATA_SOURCES) {
    if (targetSource && !source.name.toLowerCase().includes(targetSource.toLowerCase())) {
      continue;
    }

    console.log(`${source.name}:`);
    const nodes = loadKnowledgeData(source);

    if (nodes.length === 0) {
      console.log('  (no data loaded)\n');
      continue;
    }

    analyzeDataQuality(nodes);

    // Find nodes that need enrichment
    const needEnrichment = nodes.filter(n => n.isActive !== false && needsEnrichment(n));
    console.log(`  Need enrichment: ${needEnrichment.length}`);
    console.log('');

    for (const node of needEnrichment) {
      allNodesToEnrich.push({ node, source });
    }
  }

  // Sort by priority (places with more data issues first)
  allNodesToEnrich.sort((a, b) => {
    const scoreA = (isPlaceholderImage(a.node.media?.thumbnail) ? 3 : 0) +
                   (!a.node.contact?.website && !a.node.business?.website ? 2 : 0) +
                   (!a.node.contact?.phone && !a.node.business?.phone ? 1 : 0);
    const scoreB = (isPlaceholderImage(b.node.media?.thumbnail) ? 3 : 0) +
                   (!b.node.contact?.website && !b.node.business?.website ? 2 : 0) +
                   (!b.node.contact?.phone && !b.node.business?.phone ? 1 : 0);
    return scoreB - scoreA;
  });

  const toProcess = allNodesToEnrich.slice(0, maxNodes);

  console.log('============================================');
  console.log(`Total places to enrich: ${toProcess.length}`);
  console.log('');

  if (dryRun) {
    const estimatedApiCalls = toProcess.length * 2; // Find + Details
    const estimatedCost = estimatedApiCalls * 0.025; // ~$0.025 per call

    console.log('Estimated API usage:');
    console.log(`  API calls: ~${estimatedApiCalls}`);
    console.log(`  Estimated cost: ~$${estimatedCost.toFixed(2)}`);
    console.log('');
    console.log('Run without --dry-run to enrich data.');
    return;
  }

  // Process enrichment
  const stats: EnrichmentStats = {
    total: toProcess.length,
    processed: 0,
    enriched: 0,
    skipped: 0,
    failed: 0,
    photosReplaced: 0,
    phonesAdded: 0,
    websitesAdded: 0,
    apiCalls: 0,
    estimatedCost: 0
  };

  // Group by source for updating
  const enrichedBySource = new Map<string, KnowledgeNode[]>();

  for (let i = 0; i < toProcess.length; i++) {
    const { node, source } = toProcess[i];
    stats.processed++;

    console.log(`[${i + 1}/${toProcess.length}] ${source.name}:`);

    try {
      const enriched = await enrichNode(node, apiKey!, stats);

      if (!enrichedBySource.has(source.path)) {
        enrichedBySource.set(source.path, []);
      }
      enrichedBySource.get(source.path)!.push(enriched);

    } catch (error) {
      console.error(`  Error: ${error}`);
      stats.failed++;
    }

    // Progress save every 50 places
    if ((i + 1) % 50 === 0) {
      saveProgress(stats);
    }
  }

  // Calculate estimated cost
  stats.estimatedCost = stats.apiCalls * 0.025;

  // Save results
  console.log('');
  console.log('============================================');
  console.log('ENRICHMENT COMPLETE');
  console.log('============================================');
  console.log(`Processed: ${stats.processed}`);
  console.log(`Enriched: ${stats.enriched}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Failed: ${stats.failed}`);
  console.log('');
  console.log('Improvements:');
  console.log(`  Photos replaced: ${stats.photosReplaced}`);
  console.log(`  Phones added: ${stats.phonesAdded}`);
  console.log(`  Websites added: ${stats.websitesAdded}`);
  console.log('');
  console.log(`API calls made: ${stats.apiCalls}`);
  console.log(`Estimated cost: $${stats.estimatedCost.toFixed(2)}`);

  // Save enriched data
  const outputPath = path.join(PROJECT_ROOT, 'data', 'enriched-knowledge.json');
  const allEnriched: KnowledgeNode[] = [];

  for (const nodes of enrichedBySource.values()) {
    allEnriched.push(...nodes);
  }

  fs.writeFileSync(outputPath, JSON.stringify(allEnriched, null, 2));
  console.log(`\nEnriched data saved to: ${outputPath}`);

  // Save stats
  const statsPath = path.join(PROJECT_ROOT, 'data', 'enrichment-stats.json');
  fs.writeFileSync(statsPath, JSON.stringify({
    ...stats,
    completedAt: new Date().toISOString()
  }, null, 2));
  console.log(`Stats saved to: ${statsPath}`);
}

function saveProgress(stats: EnrichmentStats): void {
  const progressPath = path.join(PROJECT_ROOT, 'data', 'enrichment-progress.json');
  fs.writeFileSync(progressPath, JSON.stringify({
    ...stats,
    lastUpdated: new Date().toISOString()
  }, null, 2));
  console.log(`  (progress saved: ${stats.enriched} enriched)`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
