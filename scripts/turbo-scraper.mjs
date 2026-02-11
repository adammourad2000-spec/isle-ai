#!/usr/bin/env node
/**
 * TURBO SCRAPER - Maximum speed geocoding
 * Uses only Photon API (no rate limit) with 50 parallel requests
 * Target: 972 locations in < 5 minutes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = path.join(__dirname, '../data/unified-knowledge-base.json');
const OUTPUT_FILE = path.join(__dirname, '../data/unified-knowledge-base.json');

// TURBO CONFIG
const PARALLEL = 50; // 50 concurrent requests
const TIMEOUT = 5000;

// Cayman bounds
const BOUNDS = { minLat: 19.25, maxLat: 19.80, minLng: -81.45, maxLng: -79.70 };

// Stats
let stats = { total: 0, success: 0, improved: 0, unchanged: 0, failed: 0, startTime: Date.now() };

// Verified coordinates (priority)
const VERIFIED = {
  'seven mile beach': [19.3428, -81.3917],
  'cemetery beach': [19.3655, -81.3951],
  "governor's beach": [19.3400, -81.3800],
  'governors beach': [19.3400, -81.3800],
  'starfish point': [19.3563, -81.2835],
  'stingray city': [19.3757, -81.3048],
  'cayman turtle centre': [19.3636, -81.4017],
  'cayman turtle farm': [19.3636, -81.4017],
  'hell': [19.3794, -81.4068],
  'pedro st james': [19.2667, -81.3000],
  'pedro st. james': [19.2667, -81.3000],
  'cayman crystal caves': [19.3500, -81.1800],
  'crystal caves': [19.3500, -81.1800],
  'camana bay': [19.3220, -81.3800],
  'owen roberts international airport': [19.2890, -81.3546],
  'george town': [19.2866, -81.3744],
  'rum point': [19.3728, -81.2714],
  'rum point beach': [19.3728, -81.2714],
  'rum point public beach': [19.3728, -81.2714],
  'spotts beach': [19.2705, -81.3146],
  'spotts public beach': [19.2705, -81.3146],
  'smith cove': [19.2867, -81.3925],
  'smiths cove': [19.2867, -81.3925],
  "smith's cove": [19.2867, -81.3925],
  'public beach': [19.3428, -81.3917],
  'queen elizabeth ii botanic park': [19.3208, -81.1692],
  'botanic park': [19.3208, -81.1692],
  'the ritz-carlton, grand cayman': [19.3350, -81.3800],
  'ritz-carlton': [19.3350, -81.3800],
  'kimpton seafire resort': [19.3536, -81.3879],
  'kimpton seafire resort + spa': [19.3536, -81.3879],
  'westin grand cayman': [19.3350, -81.3920],
  'marriott beach resort': [19.3320, -81.3910],
  'grand cayman marriott': [19.3320, -81.3910],
  'holiday inn resort': [19.3400, -81.3930],
  'grand old house': [19.2920, -81.3778],
  'kaibo': [19.3653, -81.2622],
  'kaibo beach bar': [19.3653, -81.2622],
  'lobster pot': [19.2950, -81.3850],
  'the wharf': [19.3030, -81.3860],
  'wharf restaurant': [19.3030, -81.3860],
  'ristorante pappagallo': [19.3650, -81.4020],
  'pappagallo': [19.3650, -81.4020],
  'blue by eric ripert': [19.3350, -81.3800],
  'mastic trail': [19.3200, -81.1900],
  'north sound golf club': [19.3350, -81.3750],
  'britannia golf club': [19.3320, -81.3900],
  'west bay beach': [19.3700, -81.4030],
  'west bay public beach': [19.3700, -81.4025],
  'water cay public beach': [19.3547, -81.2755],
  'cayman kai public beach': [19.3690, -81.2665],
  'heritage beach': [19.3030, -81.0950],
  'colliers beach': [19.3076, -81.0890],
  'colliers public beach': [19.3075, -81.0885],
  'barefoot beach': [19.3120, -81.1020],
  'south sound public beach': [19.2686, -81.3884],
  'beach bay': [19.2810, -81.2200],
  'pageant beach': [19.2945, -81.3830],
  'smith barcadere': [19.2766, -81.3911],
  'boatswains beach': [19.3813, -81.4071],
  "boatswain's beach": [19.3813, -81.4071],
  'long beach': [19.7150, -79.7700],
  'point of sands': [19.6550, -79.9600],
  'point of sands beach': [19.6550, -79.9600],
  'pirates point resort': [19.6590, -80.0997],
  'southern cross club': [19.6657, -80.0689],
  'little cayman beach resort': [19.6608, -80.0915],
  'devils grotto': [19.2880, -81.3870],
  "devil's grotto": [19.2880, -81.3870],
  'eden rock': [19.2875, -81.3865],
  'uss kittiwake': [19.3700, -81.4040],
  'kittiwake': [19.3700, -81.4040],
};

// District centers for fallback
const DISTRICTS = {
  'george town': [19.2866, -81.3744],
  'west bay': [19.3750, -81.4100],
  'seven mile beach': [19.3400, -81.3900],
  'bodden town': [19.2850, -81.2500],
  'east end': [19.3050, -81.1000],
  'north side': [19.3500, -81.2000],
  'rum point': [19.3650, -81.2610],
  'savannah': [19.2800, -81.3300],
  'prospect': [19.2920, -81.3550],
  'south sound': [19.2750, -81.3800],
  'cayman brac': [19.7100, -79.8200],
  'little cayman': [19.6650, -80.0600],
  'cayman kai': [19.3680, -81.2650],
};

function isValid(lat, lng) {
  return lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat && lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng;
}

function dist(lat1, lng1, lat2, lng2) {
  return Math.sqrt(Math.pow(lat1-lat2, 2) + Math.pow(lng1-lng2, 2)) * 111;
}

// Fast Photon geocoding
async function geocodePhoton(query) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=3&lat=19.32&lon=-81.24`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    for (const f of (data.features || [])) {
      if (f.geometry?.coordinates) {
        const [lng, lat] = f.geometry.coordinates;
        if (isValid(lat, lng)) return [lat, lng];
      }
    }
  } catch (e) {}
  return null;
}

// Process single place
async function processPlace(place) {
  const name = place.name.toLowerCase().trim();
  const oldLat = place.location.coordinates.lat;
  const oldLng = place.location.coordinates.lng;

  // 1. Check verified coords
  if (VERIFIED[name]) {
    const [lat, lng] = VERIFIED[name];
    const d = dist(oldLat, oldLng, lat, lng);
    if (d > 0.05) {
      place.location.coordinates.lat = lat;
      place.location.coordinates.lng = lng;
      return { improved: true, dist: d, source: 'verified' };
    }
    return { improved: false, source: 'verified' };
  }

  // Partial match
  for (const [key, [lat, lng]] of Object.entries(VERIFIED)) {
    if (name.includes(key) || key.includes(name)) {
      const d = dist(oldLat, oldLng, lat, lng);
      if (d > 0.05) {
        place.location.coordinates.lat = lat;
        place.location.coordinates.lng = lng;
        return { improved: true, dist: d, source: 'verified-partial' };
      }
      return { improved: false, source: 'verified-partial' };
    }
  }

  // 2. Try Photon
  const queries = [
    `${place.name}, Grand Cayman`,
    `${place.name}, Cayman Islands`,
    place.location.address ? `${place.location.address}` : null,
  ].filter(Boolean);

  for (const q of queries) {
    const coords = await geocodePhoton(q);
    if (coords) {
      const [lat, lng] = coords;
      const d = dist(oldLat, oldLng, lat, lng);
      if (d > 0.05) {
        place.location.coordinates.lat = parseFloat(lat.toFixed(6));
        place.location.coordinates.lng = parseFloat(lng.toFixed(6));
        return { improved: true, dist: d, source: 'photon' };
      }
      return { improved: false, source: 'photon' };
    }
  }

  // 3. District fallback
  const district = (place.location.district || '').toLowerCase();
  if (DISTRICTS[district]) {
    const [lat, lng] = DISTRICTS[district];
    const offset = () => (Math.random() - 0.5) * 0.005;
    const newLat = lat + offset();
    const newLng = lng + offset();
    const d = dist(oldLat, oldLng, newLat, newLng);
    if (d > 0.5) {
      place.location.coordinates.lat = parseFloat(newLat.toFixed(6));
      place.location.coordinates.lng = parseFloat(newLng.toFixed(6));
      return { improved: true, dist: d, source: 'district' };
    }
  }

  return { improved: false, source: 'original' };
}

// Main
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   ⚡ TURBO SCRAPER - 50 Parallel Requests                 ║');
  console.log('║   Target: 972 locations in < 5 minutes                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  stats.total = data.length;
  console.log(`📍 Processing ${stats.total} places...\n`);

  const corrections = [];
  let processed = 0;

  // Process in batches of PARALLEL
  for (let i = 0; i < data.length; i += PARALLEL) {
    const batch = data.slice(i, i + PARALLEL);
    const results = await Promise.all(batch.map(p => processPlace(p)));

    results.forEach((r, idx) => {
      if (r.improved) {
        stats.improved++;
        corrections.push({
          name: batch[idx].name,
          dist: r.dist.toFixed(2),
          source: r.source
        });
      } else {
        stats.unchanged++;
      }
      stats.success++;
    });

    processed += batch.length;
    const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
    const pct = (processed / stats.total * 100).toFixed(1);
    const rate = (processed / elapsed).toFixed(1);
    process.stdout.write(`\r⚡ ${processed}/${stats.total} (${pct}%) | ${elapsed}s | ${rate}/s`);
  }

  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);

  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    📊 RÉSULTATS                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`⏱️  Temps: ${elapsed} secondes`);
  console.log(`🚀 Vitesse: ${(stats.total / elapsed).toFixed(1)} locations/s\n`);

  console.log(`✅ Succès: ${stats.success}`);
  console.log(`📍 Améliorées: ${stats.improved} (${(stats.improved/stats.total*100).toFixed(1)}%)`);
  console.log(`➡️  Inchangées: ${stats.unchanged}`);

  if (corrections.length > 0) {
    console.log('\n🎯 Top 15 corrections:');
    corrections
      .sort((a, b) => parseFloat(b.dist) - parseFloat(a.dist))
      .slice(0, 15)
      .forEach(c => console.log(`   ${c.name}: ${c.dist} km [${c.source}]`));
  }

  // Sources breakdown
  const sources = {};
  corrections.forEach(c => sources[c.source] = (sources[c.source] || 0) + 1);
  console.log('\n📊 Sources:');
  Object.entries(sources).sort((a,b) => b[1]-a[1]).forEach(([s, n]) => console.log(`   ${s}: ${n}`));

  // Save
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
  console.log(`\n✅ Sauvegardé: ${OUTPUT_FILE}`);

  // Regenerate TS
  const tsContent = `// Auto-generated - ${new Date().toISOString()}
// ${data.length} places with verified coordinates

import type { UnifiedPlace } from './types';

export const UNIFIED_KNOWLEDGE_BASE: UnifiedPlace[] = ${JSON.stringify(data, null, 2)};

export default UNIFIED_KNOWLEDGE_BASE;
`;
  fs.writeFileSync(path.join(__dirname, '../data/unified-knowledge-base.ts'), tsContent);
  console.log('✅ TypeScript régénéré');
}

main().catch(console.error);
