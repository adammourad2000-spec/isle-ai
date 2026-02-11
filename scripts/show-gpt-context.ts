#!/usr/bin/env node

/**
 * Show exactly what context GPT receives for a query
 */

import * as fs from 'fs';
import * as path from 'path';

interface KnowledgeNode {
  id: string;
  name: string;
  category: string;
  description: string;
  location: {
    island: string;
    area?: string;
    district?: string;
    coordinates?: { lat: number; lng: number };
  };
  ratings: { overall: number; reviewCount: number };
  business?: { priceRange?: string };
  shortDescription?: string;
}

// Load OSM knowledge base
const osmPath = path.join(process.cwd(), 'data', 'osm-scraped', 'osm-knowledge.json');
const KB: KnowledgeNode[] = fs.existsSync(osmPath)
  ? JSON.parse(fs.readFileSync(osmPath, 'utf-8'))
  : [];

// Haversine distance
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Get KB stats
function getKBStats() {
  const byCategory: Record<string, number> = {};
  for (const node of KB) {
    byCategory[node.category] = (byCategory[node.category] || 0) + 1;
  }
  return { total: KB.length, byCategory };
}

// Search and score
function search(query: string, category: string | null, location: { lat: number; lng: number; radius: number } | null, limit = 15) {
  const lower = query.toLowerCase();
  const words = lower.split(/\s+/).filter(w => w.length > 2);

  let results = KB;
  if (category) results = results.filter(n => n.category === category);

  const scored = results.map(node => {
    let score = 0;
    let distance: number | undefined;

    const name = node.name.toLowerCase();
    if (name.includes(lower)) score += 100;
    words.forEach(w => { if (name.includes(w)) score += 20; });

    if (category && node.category === category) score += 30;
    if (node.ratings?.overall >= 4.5) score += 15;

    if (location && node.location?.coordinates) {
      distance = haversine(location.lat, location.lng, node.location.coordinates.lat, node.location.coordinates.lng);
      if (distance <= location.radius) score += 80 - (distance / location.radius) * 30;
      else if (distance <= location.radius * 2) score += 30;
    }

    return { node, score, distance };
  });

  return scored.filter(s => s.score > 10).sort((a, b) => b.score - a.score).slice(0, limit);
}

// Build the context prompt (same as RAG service)
function buildContext(query: string, results: Array<{ node: KnowledgeNode; score: number; distance?: number }>) {
  const stats = getKBStats();

  let prompt = `USER QUERY: "${query}"

KNOWLEDGE BASE OVERVIEW:
- Total places in database: ${stats.total} locations across all Cayman Islands
- Categories: ${Object.keys(stats.byCategory).join(', ')}
- Coverage: Hotels (${stats.byCategory.hotel || 0}), Restaurants (${stats.byCategory.restaurant || 0}), Beaches (${stats.byCategory.beach || 0}), Diving (${stats.byCategory.diving_snorkeling || 0}), Bars (${stats.byCategory.bar || 0}), Medical (${stats.byCategory.medical || 0}), Banks (${stats.byCategory.financial || 0})

TOP ${results.length} MOST RELEVANT PLACES FOR THIS QUERY:

`;

  results.forEach((r, i) => {
    const loc = r.node.location?.area || r.node.location?.district || r.node.location?.island || 'Grand Cayman';
    const dist = r.distance !== undefined ? ` [${r.distance.toFixed(1)}km away]` : '';
    prompt += `${i + 1}. **${r.node.name}** (${r.node.category})${dist}
   - Rating: ${r.node.ratings?.overall || 4}/5
   - Location: ${loc}, ${r.node.location?.island || 'Grand Cayman'}
   - Description: ${(r.node.shortDescription || r.node.description || '').slice(0, 100)}

`;
  });

  prompt += `
INSTRUCTIONS:
- Use the above ${results.length} places to provide accurate recommendations
- The database has ${stats.total} total places the user can explore
- Be specific with names, locations, and ratings`;

  return prompt;
}

// Demo
const QUERY = "Best restaurants near Seven Mile Beach";
const LOCATION = { lat: 19.335, lng: -81.385, radius: 3 };
const CATEGORY = 'restaurant';

console.log('='.repeat(70));
console.log('WHAT GPT-4o ACTUALLY RECEIVES');
console.log('='.repeat(70));
console.log(`\nQuery: "${QUERY}"`);
console.log(`Location: Seven Mile Beach (${LOCATION.lat}, ${LOCATION.lng})`);
console.log(`Category: ${CATEGORY}`);
console.log(`Knowledge Base: ${KB.length} total places\n`);

const results = search(QUERY, CATEGORY, LOCATION, 15);

console.log('─'.repeat(70));
console.log('CONTEXT PROMPT SENT TO GPT-4o:');
console.log('─'.repeat(70));
console.log(buildContext(QUERY, results));
console.log('─'.repeat(70));

console.log(`\n✅ GPT now receives:`);
console.log(`   - Knowledge of ${KB.length} total places in database`);
console.log(`   - ${results.length} most relevant places with full details`);
console.log(`   - Distance calculations for geo queries`);
console.log(`   - Category breakdown for context`);
