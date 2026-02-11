#!/usr/bin/env npx ts-node --esm

/**
 * Enrich OSM Data with Google Places API
 *
 * This script takes the OSM-scraped places and enriches them with:
 * - Real photos from Google Places
 * - Actual ratings and review counts
 * - Verified phone numbers and websites
 * - Better descriptions
 *
 * Usage:
 *   npm run enrich:osm           # Enrich all OSM data
 *   npm run enrich:osm:dry-run   # Preview without API calls
 *
 * Requires: GOOGLE_PLACES_API_KEY in .env
 */

import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

interface KnowledgeNode {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  location: {
    island: string;
    area: string;
    address: string;
    coordinates: { lat: number; lng: number };
    googlePlaceId?: string;
    osmId?: string;
  };
  business: {
    priceRange: string;
    hours: string;
    phone: string;
    website: string;
    email: string;
  };
  ratings: {
    overall: number;
    reviewCount: number;
    source: string;
  };
  media: {
    thumbnail: string;
    images: string[];
  };
  features: string[];
  tags: string[];
  lastUpdated: string;
  source: string;
}

interface GooglePlaceResult {
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
  reviews?: Array<{
    rating: number;
    text: string;
    author_name: string;
  }>;
  editorial_summary?: {
    overview: string;
  };
  types?: string[];
}

// Rate limiting
const REQUESTS_PER_SECOND = 5;
const REQUEST_DELAY_MS = 1000 / REQUESTS_PER_SECOND;
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    await sleep(REQUEST_DELAY_MS - timeSinceLastRequest);
  }

  lastRequestTime = Date.now();
  return fetch(url);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Search for a place by name and location
async function findGooglePlace(
  name: string,
  lat: number,
  lng: number,
  apiKey: string
): Promise<string | null> {
  const query = encodeURIComponent(name);
  const location = `${lat},${lng}`;

  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&locationbias=circle:500@${location}&fields=place_id,name,formatted_address&key=${apiKey}`;

  try {
    const response = await rateLimitedFetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.candidates?.length > 0) {
      return data.candidates[0].place_id;
    }
  } catch (error) {
    console.error(`Error finding place "${name}":`, error);
  }

  return null;
}

// Get detailed place information
async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<GooglePlaceResult | null> {
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
    'types'
  ].join(',');

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

  try {
    const response = await rateLimitedFetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.result) {
      return data.result;
    }
  } catch (error) {
    console.error(`Error getting place details for ${placeId}:`, error);
  }

  return null;
}

// Get photo URL from photo reference
function getPhotoUrl(photoReference: string, apiKey: string, maxWidth: number = 800): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
}

// Convert price level to string
function priceLevelToString(level?: number): string {
  switch (level) {
    case 0: return '$';
    case 1: return '$';
    case 2: return '$$';
    case 3: return '$$$';
    case 4: return '$$$$';
    default: return '$$';
  }
}

// Enrich a single node with Google Places data
async function enrichNode(
  node: KnowledgeNode,
  apiKey: string,
  dryRun: boolean
): Promise<KnowledgeNode> {
  if (dryRun) {
    return node;
  }

  // Skip if already has Google Place ID and good data
  if (node.location.googlePlaceId && node.ratings.reviewCount > 0 && node.media.images.length > 0) {
    return node;
  }

  let placeId = node.location.googlePlaceId;

  // Find the Google Place ID if we don't have it
  if (!placeId) {
    placeId = await findGooglePlace(
      node.name,
      node.location.coordinates.lat,
      node.location.coordinates.lng,
      apiKey
    );

    if (!placeId) {
      console.log(`  ⚠ No Google match for: ${node.name}`);
      return node;
    }
  }

  // Get detailed place information
  const details = await getPlaceDetails(placeId, apiKey);

  if (!details) {
    return node;
  }

  // Enrich the node
  const enrichedNode: KnowledgeNode = {
    ...node,
    location: {
      ...node.location,
      googlePlaceId: placeId,
      address: details.formatted_address || node.location.address
    },
    business: {
      ...node.business,
      priceRange: priceLevelToString(details.price_level),
      hours: details.opening_hours?.weekday_text?.join('; ') || node.business.hours,
      phone: details.formatted_phone_number || details.international_phone_number || node.business.phone,
      website: details.website || node.business.website
    },
    ratings: {
      overall: details.rating || node.ratings.overall,
      reviewCount: details.user_ratings_total || node.ratings.reviewCount,
      source: 'Google'
    },
    description: details.editorial_summary?.overview || node.description,
    lastUpdated: new Date().toISOString()
  };

  // Add photos
  if (details.photos && details.photos.length > 0) {
    const photoUrls = details.photos.slice(0, 5).map(photo =>
      getPhotoUrl(photo.photo_reference, apiKey)
    );

    enrichedNode.media = {
      thumbnail: photoUrls[0],
      images: photoUrls
    };
  }

  console.log(`  ✓ Enriched: ${node.name} (${details.rating}★, ${details.user_ratings_total} reviews)`);

  return enrichedNode;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limit = args.find(a => a.startsWith('--limit='))?.split('=')[1];
  const maxNodes = limit ? parseInt(limit) : Infinity;

  console.log('====================================');
  console.log('ENRICH OSM DATA WITH GOOGLE PLACES');
  console.log('====================================');
  console.log('');

  // Get API key
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey && !dryRun) {
    console.error('ERROR: GOOGLE_PLACES_API_KEY not found in .env');
    console.error('Add: GOOGLE_PLACES_API_KEY=your_key_here');
    process.exit(1);
  }

  if (dryRun) {
    console.log('MODE: Dry Run (no API calls)');
    console.log('');
  }

  // Load OSM data
  const osmPath = path.join(process.cwd(), 'data', 'osm-scraped', 'osm-knowledge.json');

  if (!fs.existsSync(osmPath)) {
    console.error('ERROR: OSM data not found. Run npm run scrape:osm first.');
    process.exit(1);
  }

  const osmData: KnowledgeNode[] = JSON.parse(fs.readFileSync(osmPath, 'utf-8'));
  console.log(`Loaded ${osmData.length} OSM places`);

  // Filter to places worth enriching (skip parking, ATMs, etc.)
  const worthEnriching = osmData.filter(node =>
    ['hotel', 'restaurant', 'bar', 'beach', 'attraction', 'diving_snorkeling', 'activity', 'wellness', 'golf'].includes(node.category)
  );

  const toEnrich = worthEnriching.slice(0, maxNodes);
  console.log(`Will enrich ${toEnrich.length} places (filtered from ${worthEnriching.length} worth enriching)`);

  if (dryRun) {
    console.log('\nCategories to enrich:');
    const cats = toEnrich.reduce((acc, n) => {
      acc[n.category] = (acc[n.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [cat, count] of Object.entries(cats).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${cat}: ${count}`);
    }

    console.log('\nEstimated API costs:');
    console.log(`  Find Place requests: ~${toEnrich.length} ($17/1000 = $${(toEnrich.length * 0.017).toFixed(2)})`);
    console.log(`  Place Details requests: ~${toEnrich.length} ($17/1000 = $${(toEnrich.length * 0.017).toFixed(2)})`);
    console.log(`  Photos (5 per place): ~${toEnrich.length * 5} ($7/1000 = $${(toEnrich.length * 5 * 0.007).toFixed(2)})`);
    console.log(`  TOTAL ESTIMATE: ~$${(toEnrich.length * 0.017 * 2 + toEnrich.length * 5 * 0.007).toFixed(2)}`);

    console.log('\nRun without --dry-run to enrich data.');
    return;
  }

  // Enrich places
  console.log('\nEnriching places...');

  const enrichedNodes: KnowledgeNode[] = [];
  const unchangedNodes: KnowledgeNode[] = [];

  let enrichedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < toEnrich.length; i++) {
    const node = toEnrich[i];
    console.log(`[${i + 1}/${toEnrich.length}] ${node.name}`);

    try {
      const enriched = await enrichNode(node, apiKey!, false);

      if (enriched.location.googlePlaceId && enriched !== node) {
        enrichedNodes.push(enriched);
        enrichedCount++;
      } else {
        unchangedNodes.push(node);
        failedCount++;
      }
    } catch (error) {
      console.error(`  ✗ Error: ${error}`);
      unchangedNodes.push(node);
      failedCount++;
    }

    // Save progress every 50 places
    if ((i + 1) % 50 === 0) {
      saveProgress(enrichedNodes, unchangedNodes, osmData);
    }
  }

  // Add non-enriched categories back
  const otherNodes = osmData.filter(node =>
    !['hotel', 'restaurant', 'bar', 'beach', 'attraction', 'diving_snorkeling', 'activity', 'wellness', 'golf'].includes(node.category)
  );

  // Combine all nodes
  const allNodes = [...enrichedNodes, ...unchangedNodes, ...otherNodes];

  // Save final results
  saveResults(allNodes, enrichedNodes);

  console.log('\n====================================');
  console.log('ENRICHMENT COMPLETE');
  console.log('====================================');
  console.log(`Enriched: ${enrichedCount}`);
  console.log(`Unchanged: ${failedCount}`);
  console.log(`Total: ${allNodes.length}`);
}

function saveProgress(enriched: KnowledgeNode[], unchanged: KnowledgeNode[], original: KnowledgeNode[]) {
  const progressPath = path.join(process.cwd(), 'data', 'osm-scraped', 'enrichment-progress.json');
  fs.writeFileSync(progressPath, JSON.stringify({
    enriched: enriched.length,
    unchanged: unchanged.length,
    timestamp: new Date().toISOString()
  }, null, 2));
  console.log(`  Progress saved (${enriched.length} enriched)`);
}

function saveResults(allNodes: KnowledgeNode[], enrichedNodes: KnowledgeNode[]) {
  const outputDir = path.join(process.cwd(), 'data', 'osm-scraped');

  // Save enriched JSON
  const jsonPath = path.join(outputDir, 'osm-knowledge-enriched.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allNodes, null, 2));
  console.log(`\nSaved: ${jsonPath}`);

  // Save TypeScript
  const tsContent = `/**
 * OpenStreetMap Knowledge Base (Enriched with Google Places)
 *
 * Auto-generated by enrich-osm-data.ts
 * Generated: ${new Date().toISOString()}
 * Total places: ${allNodes.length}
 * Enriched with Google: ${enrichedNodes.length}
 */

import type { KnowledgeNode } from '../../types/chatbot';

export const OSM_KNOWLEDGE: KnowledgeNode[] = ${JSON.stringify(allNodes, null, 2)};

export default OSM_KNOWLEDGE;
`;

  const tsPath = path.join(outputDir, 'osm-knowledge.ts');
  fs.writeFileSync(tsPath, tsContent);
  console.log(`Saved: ${tsPath}`);

  // Save stats
  const statsPath = path.join(outputDir, 'enrichment-stats.json');
  const withRatings = allNodes.filter(n => n.ratings.reviewCount > 0).length;
  const withPhotos = allNodes.filter(n => n.media.images.length > 0).length;
  const withPhone = allNodes.filter(n => n.business.phone).length;
  const withWebsite = allNodes.filter(n => n.business.website).length;

  fs.writeFileSync(statsPath, JSON.stringify({
    total: allNodes.length,
    enrichedWithGoogle: enrichedNodes.length,
    withRatings,
    withPhotos,
    withPhone,
    withWebsite,
    timestamp: new Date().toISOString()
  }, null, 2));
  console.log(`Saved: ${statsPath}`);
}

main().catch(console.error);
