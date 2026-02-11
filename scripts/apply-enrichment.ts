#!/usr/bin/env npx ts-node --esm

/**
 * ISLE AI - Apply Scraped Enrichment to Knowledge Base
 *
 * Takes the scraped data from free-places-scraper and applies it to:
 * - OSM knowledge base (osm-knowledge.ts / osm-knowledge.json)
 * - Updates photos, phone numbers, websites
 *
 * Usage:
 *   npm run apply:enrichment           # Apply all enrichment
 *   npm run apply:enrichment:dry-run   # Preview changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ============ TYPES ============

interface ScrapedData {
  placeId: string;
  name: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
  photos: string[];
  scrapedAt: string;
}

interface KnowledgeNode {
  id: string;
  name: string;
  category: string;
  location: any;
  contact?: { phone?: string; website?: string; email?: string };
  business?: { phone?: string; website?: string };
  media?: { thumbnail?: string; images?: string[] };
  ratings?: { overall?: number; reviewCount?: number };
  [key: string]: any;
}

// ============ CONSTANTS ============

const UNSPLASH_PATTERN = /unsplash\.com/i;
const PLACEHOLDER_PATTERN = /placehold|placeholder|no-image|default/i;

function isPlaceholderImage(url?: string): boolean {
  if (!url) return true;
  return UNSPLASH_PATTERN.test(url) || PLACEHOLDER_PATTERN.test(url);
}

// ============ APPLY ENRICHMENT ============

function applyEnrichmentToNode(node: KnowledgeNode, enrichment: ScrapedData): { node: KnowledgeNode; changes: string[] } {
  const changes: string[] = [];
  const updated = { ...node };

  // Apply photos if current ones are placeholders
  if (enrichment.photos.length > 0 && isPlaceholderImage(node.media?.thumbnail)) {
    updated.media = {
      ...(node.media || {}),
      thumbnail: enrichment.photos[0],
      images: enrichment.photos
    };
    changes.push(`photos: ${enrichment.photos.length} added`);
  }

  // Apply phone if missing
  if (enrichment.phone && !node.contact?.phone && !node.business?.phone) {
    if (updated.contact) {
      updated.contact = { ...updated.contact, phone: enrichment.phone };
    } else if (updated.business) {
      updated.business = { ...updated.business, phone: enrichment.phone };
    } else {
      updated.contact = { phone: enrichment.phone };
    }
    changes.push(`phone: ${enrichment.phone}`);
  }

  // Apply website if missing
  if (enrichment.website && !node.contact?.website && !node.business?.website) {
    if (updated.contact) {
      updated.contact = { ...updated.contact, website: enrichment.website };
    } else if (updated.business) {
      updated.business = { ...updated.business, website: enrichment.website };
    } else {
      updated.contact = { ...(updated.contact || {}), website: enrichment.website };
    }
    changes.push(`website: ${enrichment.website.substring(0, 40)}...`);
  }

  // Apply ratings if available and better
  if (enrichment.rating && (!node.ratings?.overall || node.ratings.overall === 0)) {
    updated.ratings = {
      ...(node.ratings || {}),
      overall: enrichment.rating,
      reviewCount: enrichment.reviewCount || node.ratings?.reviewCount || 0
    };
    changes.push(`rating: ${enrichment.rating}* (${enrichment.reviewCount} reviews)`);
  }

  return { node: updated, changes };
}

function normalizeNameForMatching(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('============================================');
  console.log('ISLE AI - APPLY ENRICHMENT TO KNOWLEDGE BASE');
  console.log('============================================');
  console.log('');

  if (dryRun) {
    console.log('MODE: Dry Run (no changes will be saved)\n');
  }

  // Load scraped enrichment data
  const enrichmentPath = path.join(PROJECT_ROOT, 'data', 'scraped-enrichment.json');

  if (!fs.existsSync(enrichmentPath)) {
    console.error('No enrichment data found at:', enrichmentPath);
    console.error('Run npm run scrape:free first.');
    process.exit(1);
  }

  const enrichmentData: ScrapedData[] = JSON.parse(fs.readFileSync(enrichmentPath, 'utf-8'));
  console.log(`Loaded ${enrichmentData.length} enrichment records`);

  // Create lookup map by normalized name
  const enrichmentByName = new Map<string, ScrapedData>();
  const enrichmentById = new Map<string, ScrapedData>();

  for (const data of enrichmentData) {
    enrichmentByName.set(normalizeNameForMatching(data.name), data);
    if (data.placeId) {
      enrichmentById.set(data.placeId, data);
    }
  }

  // Stats
  let totalUpdated = 0;
  let photosAdded = 0;
  let phonesAdded = 0;
  let websitesAdded = 0;

  // ============ UPDATE OSM DATA ============

  const osmJsonPath = path.join(PROJECT_ROOT, 'data', 'osm-scraped', 'osm-knowledge.json');
  const osmTsPath = path.join(PROJECT_ROOT, 'data', 'osm-scraped', 'osm-knowledge.ts');

  if (fs.existsSync(osmJsonPath)) {
    console.log('\nProcessing OSM Knowledge Base...');

    const osmNodes: KnowledgeNode[] = JSON.parse(fs.readFileSync(osmJsonPath, 'utf-8'));
    const updatedNodes: KnowledgeNode[] = [];
    let osmUpdated = 0;

    for (const node of osmNodes) {
      // Try to find enrichment by ID first, then by name
      let enrichment = enrichmentById.get(node.id);
      if (!enrichment) {
        enrichment = enrichmentByName.get(normalizeNameForMatching(node.name));
      }

      if (enrichment) {
        const { node: updated, changes } = applyEnrichmentToNode(node, enrichment);
        if (changes.length > 0) {
          console.log(`  + ${node.name}: ${changes.join(', ')}`);
          osmUpdated++;
          totalUpdated++;
          if (changes.some(c => c.includes('photos'))) photosAdded++;
          if (changes.some(c => c.includes('phone'))) phonesAdded++;
          if (changes.some(c => c.includes('website'))) websitesAdded++;
        }
        updatedNodes.push(updated);
      } else {
        updatedNodes.push(node);
      }
    }

    console.log(`\nOSM: ${osmUpdated} nodes updated`);

    if (!dryRun && osmUpdated > 0) {
      // Save updated JSON
      fs.writeFileSync(osmJsonPath, JSON.stringify(updatedNodes, null, 2));
      console.log(`Saved: ${osmJsonPath}`);

      // Update TypeScript file
      const tsContent = `/**
 * OpenStreetMap Knowledge Base (Enriched)
 *
 * Auto-updated by apply-enrichment.ts
 * Last updated: ${new Date().toISOString()}
 * Total places: ${updatedNodes.length}
 */

import type { KnowledgeNode } from '../../types/chatbot';

export const OSM_KNOWLEDGE: KnowledgeNode[] = ${JSON.stringify(updatedNodes, null, 2)};

export default OSM_KNOWLEDGE;
`;
      fs.writeFileSync(osmTsPath, tsContent);
      console.log(`Saved: ${osmTsPath}`);
    }
  }

  // ============ SUMMARY ============

  console.log('');
  console.log('============================================');
  console.log('ENRICHMENT APPLIED');
  console.log('============================================');
  console.log(`Total nodes updated: ${totalUpdated}`);
  console.log(`Photos added: ${photosAdded}`);
  console.log(`Phones added: ${phonesAdded}`);
  console.log(`Websites added: ${websitesAdded}`);

  if (dryRun) {
    console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
