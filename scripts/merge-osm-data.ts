#!/usr/bin/env npx ts-node --esm

/**
 * Merge OSM scraped data with existing knowledge base
 *
 * This script:
 * 1. Loads existing knowledge base
 * 2. Loads OSM scraped data
 * 3. Deduplicates by name similarity + proximity
 * 4. Merges new places
 * 5. Outputs updated knowledge base
 */

import * as fs from 'fs';
import * as path from 'path';

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

// Distance threshold for considering places as duplicates (in km)
const DUPLICATE_DISTANCE_KM = 0.1; // 100 meters

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeString(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function isSimilarName(name1: string, name2: string): boolean {
  const n1 = normalizeString(name1);
  const n2 = normalizeString(name2);

  // Exact match
  if (n1 === n2) return true;

  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Levenshtein similarity > 80%
  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return true;

  const distance = levenshteinDistance(n1, n2);
  const similarity = 1 - distance / maxLen;

  return similarity > 0.8;
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

function isDuplicate(node1: KnowledgeNode, node2: KnowledgeNode): boolean {
  // Same OSM ID = duplicate
  if (node1.location.osmId && node1.location.osmId === node2.location.osmId) {
    return true;
  }

  // Different categories = not duplicate
  if (node1.category !== node2.category) {
    return false;
  }

  // Check name similarity
  if (!isSimilarName(node1.name, node2.name)) {
    return false;
  }

  // Check proximity
  const distance = haversineDistance(
    node1.location.coordinates.lat,
    node1.location.coordinates.lng,
    node2.location.coordinates.lat,
    node2.location.coordinates.lng
  );

  return distance < DUPLICATE_DISTANCE_KM;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('====================================');
  console.log('MERGE OSM DATA WITH KNOWLEDGE BASE');
  console.log('====================================');
  console.log('');

  if (dryRun) {
    console.log('MODE: Dry Run (no files will be modified)');
    console.log('');
  }

  // Load OSM data
  const osmPath = path.join(process.cwd(), 'data', 'osm-scraped', 'osm-knowledge.json');
  if (!fs.existsSync(osmPath)) {
    console.error('ERROR: OSM data not found. Run npm run scrape:osm first.');
    process.exit(1);
  }

  const osmData: KnowledgeNode[] = JSON.parse(fs.readFileSync(osmPath, 'utf-8'));
  console.log(`Loaded ${osmData.length} places from OSM scrape`);

  // Load existing knowledge base
  const kbPath = path.join(process.cwd(), 'data', 'cayman-islands-knowledge.ts');
  if (!fs.existsSync(kbPath)) {
    console.log('No existing knowledge base found, using OSM data only');
    // Just copy OSM data as new KB
    if (!dryRun) {
      const outputPath = path.join(process.cwd(), 'data', 'merged-knowledge.json');
      fs.writeFileSync(outputPath, JSON.stringify(osmData, null, 2));
      console.log(`\nSaved ${osmData.length} places to ${outputPath}`);
    }
    return;
  }

  // Parse existing KB (it's a TypeScript file, so we need to extract the data)
  const kbContent = fs.readFileSync(kbPath, 'utf-8');

  // Extract arrays from the TypeScript file
  // This is a simplified approach - in production you'd want to properly parse
  const existingNodes: KnowledgeNode[] = [];

  // Try to find JSON-like data in the file
  const arrayMatches = kbContent.match(/export const \w+: KnowledgeNode\[\] = (\[[\s\S]*?\]);/g);

  if (arrayMatches) {
    for (const match of arrayMatches) {
      try {
        // Extract the array part
        const arrayStart = match.indexOf('[');
        const arrayContent = match.slice(arrayStart, -1);

        // Convert TypeScript to JSON (handle trailing commas, etc.)
        const jsonStr = arrayContent
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/'/g, '"'); // Single to double quotes

        const nodes = JSON.parse(jsonStr);
        existingNodes.push(...nodes);
      } catch (e) {
        // Skip unparseable arrays
      }
    }
  }

  console.log(`Loaded ${existingNodes.length} places from existing knowledge base`);

  // Find duplicates and new places
  const duplicates: Array<{ osm: KnowledgeNode; existing: KnowledgeNode }> = [];
  const newPlaces: KnowledgeNode[] = [];

  for (const osmNode of osmData) {
    let foundDuplicate = false;

    for (const existingNode of existingNodes) {
      if (isDuplicate(osmNode, existingNode)) {
        duplicates.push({ osm: osmNode, existing: existingNode });
        foundDuplicate = true;
        break;
      }
    }

    if (!foundDuplicate) {
      // Also check against already added new places
      let isNewDuplicate = false;
      for (const newPlace of newPlaces) {
        if (isDuplicate(osmNode, newPlace)) {
          isNewDuplicate = true;
          break;
        }
      }

      if (!isNewDuplicate) {
        newPlaces.push(osmNode);
      }
    }
  }

  console.log(`\nFound ${duplicates.length} duplicates (will be skipped)`);
  console.log(`Found ${newPlaces.length} new unique places to add`);

  // Merge: existing + new places
  const merged = [...existingNodes, ...newPlaces];

  console.log(`\nTotal after merge: ${merged.length} places`);

  // Category breakdown
  const byCat = merged.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\nBy category:');
  for (const [cat, count] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  if (!dryRun) {
    // Save merged data as JSON
    const outputPath = path.join(process.cwd(), 'data', 'merged-knowledge.json');
    fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));
    console.log(`\nSaved merged data to: ${outputPath}`);

    // Also update the OSM knowledge file with unique data
    const uniqueOsmPath = path.join(process.cwd(), 'data', 'osm-scraped', 'osm-unique-places.json');
    fs.writeFileSync(uniqueOsmPath, JSON.stringify(newPlaces, null, 2));
    console.log(`Saved ${newPlaces.length} unique OSM places to: ${uniqueOsmPath}`);

    // Generate TypeScript export
    const tsContent = `/**
 * Merged Knowledge Base
 *
 * Generated: ${new Date().toISOString()}
 * Total places: ${merged.length}
 * Sources: OpenStreetMap + existing knowledge base
 */

import type { KnowledgeNode } from '../types/knowledge';

export const MERGED_KNOWLEDGE: KnowledgeNode[] = ${JSON.stringify(merged, null, 2)};

export default MERGED_KNOWLEDGE;
`;
    const tsPath = path.join(process.cwd(), 'data', 'merged-knowledge.ts');
    fs.writeFileSync(tsPath, tsContent);
    console.log(`Saved TypeScript export to: ${tsPath}`);
  }

  console.log('\n====================================');
  console.log('DONE!');
  console.log('====================================');
}

main().catch(console.error);
