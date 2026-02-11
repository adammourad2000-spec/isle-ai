#!/usr/bin/env node

/**
 * Test RAG Service with different query types
 */

import * as fs from 'fs';
import * as path from 'path';

// Types
interface KnowledgeNode {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  location: {
    island: string;
    area: string;
    coordinates: { lat: number; lng: number };
  };
  ratings: {
    overall: number;
    reviewCount: number;
  };
}

// Load OSM knowledge base (JSON)
const osmPath = path.join(process.cwd(), 'data', 'osm-scraped', 'osm-knowledge.json');
const osmData: KnowledgeNode[] = fs.existsSync(osmPath)
  ? JSON.parse(fs.readFileSync(osmPath, 'utf-8'))
  : [];

console.log(`Loaded ${osmData.length} nodes from OSM knowledge base`);

// Known locations for geo search
const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number; radius: number }> = {
  'seven mile beach': { lat: 19.3350, lng: -81.3850, radius: 3 },
  'george town': { lat: 19.2950, lng: -81.3810, radius: 2 },
  'west bay': { lat: 19.3750, lng: -81.4050, radius: 3 },
  'bodden town': { lat: 19.2800, lng: -81.2500, radius: 4 },
  'east end': { lat: 19.3000, lng: -81.1000, radius: 5 },
  'stingray city': { lat: 19.3890, lng: -81.2980, radius: 1 },
  'rum point': { lat: 19.3650, lng: -81.2600, radius: 2 },
  'camana bay': { lat: 19.3280, lng: -81.3780, radius: 1 },
};

// Haversine distance
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Detect location in query
function detectLocation(query: string): { name: string; lat: number; lng: number; radius: number } | null {
  const lower = query.toLowerCase();
  for (const [name, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (lower.includes(name)) return { name, ...coords };
  }
  if (lower.includes('near me')) return { name: 'George Town (default)', ...KNOWN_LOCATIONS['george town'] };
  return null;
}

// Detect category from query
function detectCategory(query: string): string | null {
  const lower = query.toLowerCase();
  if (lower.includes('restaurant') || lower.includes('eat') || lower.includes('food') || lower.includes('dining')) return 'restaurant';
  if (lower.includes('hotel') || lower.includes('resort') || lower.includes('stay') || lower.includes('accommodation')) return 'hotel';
  if (lower.includes('diving') || lower.includes('snorkel') || lower.includes('dive') || lower.includes('scuba')) return 'diving_snorkeling';
  if (lower.includes('beach')) return 'beach';
  if (lower.includes('bar') || lower.includes('nightlife') || lower.includes('drink')) return 'bar';
  if (lower.includes('bank') || lower.includes('atm') || lower.includes('money')) return 'financial';
  if (lower.includes('pharmacy') || lower.includes('hospital') || lower.includes('doctor') || lower.includes('medical')) return 'medical';
  if (lower.includes('things to do') || lower.includes('activity') || lower.includes('tour')) return 'activity';
  if (lower.includes('attraction') || lower.includes('visit') || lower.includes('see')) return 'attraction';
  return null;
}

// Check if needs web search
function needsWebSearch(query: string): { needed: boolean; reason: string } {
  const lower = query.toLowerCase();

  if (lower.includes('flight') || lower.includes('fly') || lower.includes('airline') || lower.includes('airport')) {
    return { needed: true, reason: 'Flight/airline query - needs real-time schedules' };
  }
  if (lower.includes('weather') || lower.includes('forecast')) {
    return { needed: true, reason: 'Weather query - needs current conditions' };
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
    return { needed: true, reason: 'Pricing query - needs current rates' };
  }
  if (lower.includes('open now') || lower.includes('currently') || lower.includes('today')) {
    return { needed: true, reason: 'Real-time availability query' };
  }
  if (lower.includes('news') || lower.includes('event') || lower.includes('happening')) {
    return { needed: true, reason: 'Current events query' };
  }

  return { needed: false, reason: 'Can answer from knowledge base' };
}

// Search knowledge base
function searchKB(query: string, category: string | null, location: { lat: number; lng: number; radius: number } | null, limit = 5): Array<{ node: KnowledgeNode; score: number; distance?: number }> {
  const lower = query.toLowerCase();
  const queryWords = lower.split(/\s+/).filter(w => w.length > 2);

  let results = osmData;

  // Filter by category if specified
  if (category) {
    results = results.filter(n => n.category === category);
  }

  // Score each result
  const scored = results.map(node => {
    let score = 0;
    let distance: number | undefined;

    // Name match (high weight)
    const nameLower = node.name.toLowerCase();
    if (nameLower.includes(lower)) score += 100;
    for (const word of queryWords) {
      if (nameLower.includes(word)) score += 20;
    }

    // Description match
    const descLower = (node.description || '').toLowerCase();
    for (const word of queryWords) {
      if (descLower.includes(word)) score += 5;
    }

    // Category match gives base score
    if (category && node.category === category) score += 30;

    // Rating boost
    if (node.ratings?.overall >= 4.5) score += 15;
    else if (node.ratings?.overall >= 4.0) score += 10;

    // Proximity score (BIG boost for geo queries)
    if (location && node.location?.coordinates?.lat && node.location?.coordinates?.lng) {
      distance = haversineDistance(
        location.lat, location.lng,
        node.location.coordinates.lat, node.location.coordinates.lng
      );

      if (distance <= location.radius) {
        score += 80 - (distance / location.radius) * 30; // 50-80 points
      } else if (distance <= location.radius * 2) {
        score += 30 - (distance / (location.radius * 2)) * 15; // 15-30 points
      } else if (distance <= location.radius * 5) {
        score += 10;
      }
    }

    return { node, score, distance };
  });

  return scored
    .filter(s => s.score > 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Test queries
const TEST_QUERIES = [
  "How do I fly to Grand Cayman from New York?",
  "Best restaurants near Seven Mile Beach",
  "Where can I go scuba diving?",
  "Find me a pharmacy in George Town",
  "What are the best beaches to visit?"
];

function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('                    RAG SERVICE TEST - 5 QUERIES');
  console.log('='.repeat(70));
  console.log(`\nKnowledge Base: ${osmData.length} nodes from OpenStreetMap\n`);

  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const query = TEST_QUERIES[i];

    console.log('\n' + '─'.repeat(70));
    console.log(`\n📝 QUERY ${i + 1}: "${query}"`);
    console.log('─'.repeat(70));

    // Step 1: Check if web search needed
    const webSearch = needsWebSearch(query);
    console.log(`\n1️⃣  WEB SEARCH CHECK:`);
    console.log(`   ${webSearch.needed ? '🌐 YES' : '📚 NO'} - ${webSearch.reason}`);

    // Step 2: Detect location
    const location = detectLocation(query);
    console.log(`\n2️⃣  LOCATION DETECTION:`);
    if (location) {
      console.log(`   📍 Found: "${location.name}" at (${location.lat}, ${location.lng})`);
      console.log(`   📏 Search radius: ${location.radius} km`);
    } else {
      console.log(`   ❌ No specific location mentioned`);
    }

    // Step 3: Detect category
    const category = detectCategory(query);
    console.log(`\n3️⃣  CATEGORY DETECTION:`);
    if (category) {
      console.log(`   🏷️  Detected: "${category}"`);
    } else {
      console.log(`   🔍 No specific category - searching all`);
    }

    // Step 4: Search knowledge base
    console.log(`\n4️⃣  KNOWLEDGE BASE SEARCH:`);

    if (webSearch.needed) {
      console.log(`   ⏭️  Skipping KB search - will use web search instead`);
    } else {
      const results = searchKB(query, category, location);
      console.log(`   Found: ${results.length} relevant results`);

      if (results.length > 0) {
        console.log(`\n   Top 3 Results:`);
        results.slice(0, 3).forEach((r, idx) => {
          const distStr = r.distance !== undefined ? ` | ${r.distance.toFixed(1)}km away` : '';
          console.log(`   ${idx + 1}. ${r.node.name} (score: ${r.score.toFixed(0)})`);
          console.log(`      └─ ${r.node.category} | ${r.node.ratings?.overall || '?'}⭐ | ${r.node.location?.area || 'Unknown'}${distStr}`);
        });
      }
    }

    // Step 5: What AI would do
    console.log(`\n5️⃣  AI RESPONSE STRATEGY:`);
    if (webSearch.needed) {
      console.log(`   🌐 → Call OpenAI Responses API with web_search_preview tool`);
      console.log(`   🔍 → Search: caymanairways.com, american.com, jetblue.com, etc.`);
      console.log(`   ✈️  → Return real-time flight schedules, prices, airlines`);
      console.log(`   📍 → No place cards (flight info is dynamic)`);
    } else {
      const results = searchKB(query, category, location);
      console.log(`   📚 → Use ${results.length} KB results as context for GPT-4o`);
      console.log(`   💬 → Generate personalized recommendations`);
      console.log(`   🗺️  → Show ${Math.min(results.length, 5)} place cards with map markers`);
      if (location) {
        console.log(`   📍 → Sort results by distance from ${location.name}`);
      }
    }
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('                         TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`
┌────────┬─────────────────────────────────┬─────────────────────────────┐
│ Query  │ Detection                       │ Response                    │
├────────┼─────────────────────────────────┼─────────────────────────────┤
│ 1      │ ✈️  Flight query detected        │ 🌐 Web search (real-time)   │
│ 2      │ 📍 Location + 🍽️  Restaurant     │ 📚 KB + Geo sort            │
│ 3      │ 🤿 Diving category              │ 📚 KB category filter       │
│ 4      │ 📍 Location + 💊 Medical        │ 📚 KB + Geo sort            │
│ 5      │ 🏖️  Beach category              │ 📚 KB category filter       │
└────────┴─────────────────────────────────┴─────────────────────────────┘
`);
}

runTests();

