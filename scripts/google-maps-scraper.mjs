#!/usr/bin/env node
/**
 * ULTRA-FAST GOOGLE MAPS COORDINATE SCRAPER
 * Target: 900+ locations in < 10 minutes
 * Method: Parallel requests to multiple geocoding services
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = path.join(__dirname, '../data/unified-knowledge-base.json');
const OUTPUT_FILE = path.join(__dirname, '../data/unified-knowledge-base.json');
const REPORT_FILE = path.join(__dirname, '../data/scraper-report.json');

// Configuration
const CONCURRENT_REQUESTS = 15; // Parallel requests
const TIMEOUT_MS = 8000;
const RETRY_ATTEMPTS = 2;

// Cayman Islands bounds
const BOUNDS = {
  minLat: 19.25, maxLat: 19.80,
  minLng: -81.45, maxLng: -79.70
};

// Stats tracking
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  unchanged: 0,
  improved: 0,
  sources: {},
  errors: [],
  startTime: Date.now()
};

// Rate limiting with token bucket
class RateLimiter {
  constructor(tokensPerSecond) {
    this.tokens = tokensPerSecond;
    this.maxTokens = tokensPerSecond;
    this.lastRefill = Date.now();
  }

  async acquire() {
    while (this.tokens < 1) {
      const now = Date.now();
      const elapsed = (now - this.lastRefill) / 1000;
      this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.maxTokens);
      this.lastRefill = now;
      if (this.tokens < 1) await sleep(50);
    }
    this.tokens--;
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Fetch with timeout and retry
async function fetchWithRetry(url, options = {}, retries = RETRY_ATTEMPTS) {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/html, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          ...options.headers
        }
      });

      clearTimeout(timeout);
      return response;
    } catch (e) {
      if (i === retries) throw e;
      await sleep(500 * (i + 1));
    }
  }
}

// ============= GEOCODING SOURCES =============

// 1. Photon (Komoot) - Fast, no rate limit
async function geocodePhoton(query) {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lat=19.32&lon=-81.24&lang=en`;
    const res = await fetchWithRetry(url);
    if (!res.ok) return null;

    const data = await res.json();
    for (const f of (data.features || [])) {
      if (f.geometry?.coordinates) {
        const [lng, lat] = f.geometry.coordinates;
        if (isValidCoord(lat, lng)) {
          return { lat, lng, source: 'photon', confidence: 0.85 };
        }
      }
    }
  } catch (e) {}
  return null;
}

// 2. Nominatim (OpenStreetMap) - Reliable
async function geocodeNominatim(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
      q: query,
      format: 'json',
      limit: '5',
      countrycodes: 'ky'
    });

    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'IsleAI-Scraper/3.0 (https://isleai.ky)' }
    });
    if (!res.ok) return null;

    const data = await res.json();
    for (const r of data) {
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lon);
      if (isValidCoord(lat, lng)) {
        return { lat, lng, source: 'nominatim', confidence: 0.90, name: r.display_name };
      }
    }
  } catch (e) {}
  return null;
}

// 3. Google Maps Embed (scrape coordinates from embed)
async function geocodeGoogleEmbed(query) {
  try {
    const searchQuery = `${query} Cayman Islands`;
    const url = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(searchQuery)}`;

    // Try alternative: Google Maps search URL parsing
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
    const res = await fetchWithRetry(mapsUrl);
    if (!res.ok) return null;

    const html = await res.text();

    // Extract coordinates from Google Maps HTML
    // Pattern: @19.3456789,-81.3456789
    const coordMatch = html.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (isValidCoord(lat, lng)) {
        return { lat, lng, source: 'google', confidence: 0.95 };
      }
    }

    // Alternative pattern: center: [lat, lng]
    const centerMatch = html.match(/center["\s:]+\[?\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (centerMatch) {
      const lat = parseFloat(centerMatch[1]);
      const lng = parseFloat(centerMatch[2]);
      if (isValidCoord(lat, lng)) {
        return { lat, lng, source: 'google', confidence: 0.95 };
      }
    }
  } catch (e) {}
  return null;
}

// 4. MapQuest Open (backup)
async function geocodeMapQuest(query) {
  try {
    const url = `https://open.mapquestapi.com/nominatim/v1/search.php?` + new URLSearchParams({
      q: query + ', Cayman Islands',
      format: 'json',
      limit: '3'
    });

    const res = await fetchWithRetry(url);
    if (!res.ok) return null;

    const data = await res.json();
    for (const r of data) {
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lon);
      if (isValidCoord(lat, lng)) {
        return { lat, lng, source: 'mapquest', confidence: 0.80 };
      }
    }
  } catch (e) {}
  return null;
}

// 5. LocationIQ (backup)
async function geocodeLocationIQ(query) {
  try {
    const url = `https://us1.locationiq.com/v1/search?` + new URLSearchParams({
      q: query + ', Cayman Islands',
      format: 'json',
      limit: '3',
      countrycodes: 'ky'
    });

    const res = await fetchWithRetry(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data)) {
      for (const r of data) {
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.lon);
        if (isValidCoord(lat, lng)) {
          return { lat, lng, source: 'locationiq', confidence: 0.85 };
        }
      }
    }
  } catch (e) {}
  return null;
}

// Validate coordinates are in Cayman Islands
function isValidCoord(lat, lng) {
  return lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat &&
         lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng;
}

// Calculate distance between two coordinates (km)
function distance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Known verified coordinates (from previous web search)
const VERIFIED_COORDS = {
  'seven mile beach': { lat: 19.3428, lng: -81.3917 },
  'cemetery beach': { lat: 19.3655, lng: -81.3951 },
  "governor's beach": { lat: 19.3400, lng: -81.3800 },
  'governors beach': { lat: 19.3400, lng: -81.3800 },
  'starfish point': { lat: 19.3563, lng: -81.2835 },
  'stingray city': { lat: 19.3757, lng: -81.3048 },
  'cayman turtle centre': { lat: 19.3636, lng: -81.4017 },
  'hell': { lat: 19.3794, lng: -81.4068 },
  'pedro st james': { lat: 19.2667, lng: -81.3000 },
  'pedro st. james': { lat: 19.2667, lng: -81.3000 },
  'cayman crystal caves': { lat: 19.3500, lng: -81.1800 },
  'crystal caves': { lat: 19.3500, lng: -81.1800 },
  'camana bay': { lat: 19.3220, lng: -81.3800 },
  'owen roberts international airport': { lat: 19.2890, lng: -81.3546 },
  'george town': { lat: 19.2866, lng: -81.3744 },
  'rum point': { lat: 19.3728, lng: -81.2714 },
  'rum point beach': { lat: 19.3728, lng: -81.2714 },
  'spotts beach': { lat: 19.2705, lng: -81.3146 },
  'smith cove': { lat: 19.2867, lng: -81.3925 },
  'public beach': { lat: 19.3428, lng: -81.3917 },
  'queen elizabeth ii botanic park': { lat: 19.3208, lng: -81.1692 },
};

// Main geocoding function - tries multiple sources in parallel
async function geocodePlace(place) {
  const name = place.name;
  const nameLower = name.toLowerCase().trim();
  const address = place.location.address || '';
  const district = place.location.district || '';

  // 1. Check verified coordinates first
  if (VERIFIED_COORDS[nameLower]) {
    return { ...VERIFIED_COORDS[nameLower], source: 'verified', confidence: 1.0 };
  }

  // Check partial matches
  for (const [key, coords] of Object.entries(VERIFIED_COORDS)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return { ...coords, source: 'verified-partial', confidence: 0.95 };
    }
  }

  // 2. Build search queries
  const queries = [
    `${name}, Cayman Islands`,
    `${name}, Grand Cayman`,
    address ? `${address}, Cayman Islands` : null,
    district ? `${name}, ${district}, Grand Cayman` : null,
  ].filter(Boolean);

  // 3. Try multiple geocoding services in parallel
  for (const query of queries) {
    const results = await Promise.allSettled([
      geocodePhoton(query),
      geocodeNominatim(query),
      geocodeMapQuest(query),
    ]);

    // Get best result (highest confidence)
    let best = null;
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        if (!best || r.value.confidence > best.confidence) {
          best = r.value;
        }
      }
    }

    if (best) return best;
  }

  // 4. Try Google as last resort (slower)
  for (const query of queries.slice(0, 2)) {
    const googleResult = await geocodeGoogleEmbed(query);
    if (googleResult) return googleResult;
  }

  return null;
}

// Process places in batches
async function processBatch(places, batchIndex, totalBatches) {
  const results = [];

  for (const place of places) {
    const oldLat = place.location.coordinates.lat;
    const oldLng = place.location.coordinates.lng;

    try {
      const result = await geocodePlace(place);

      if (result) {
        const dist = distance(oldLat, oldLng, result.lat, result.lng);

        // Update if new coords are significantly different and valid
        if (dist > 0.05) { // > 50m difference
          place.location.coordinates.lat = parseFloat(result.lat.toFixed(6));
          place.location.coordinates.lng = parseFloat(result.lng.toFixed(6));
          stats.improved++;
          results.push({
            name: place.name,
            old: `${oldLat.toFixed(4)}, ${oldLng.toFixed(4)}`,
            new: `${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`,
            distance: dist.toFixed(2) + ' km',
            source: result.source
          });
        } else {
          stats.unchanged++;
        }

        stats.success++;
        stats.sources[result.source] = (stats.sources[result.source] || 0) + 1;
      } else {
        stats.failed++;
        stats.errors.push({ name: place.name, error: 'No coordinates found' });
      }
    } catch (e) {
      stats.failed++;
      stats.errors.push({ name: place.name, error: e.message });
    }
  }

  return results;
}

// Progress bar
function progressBar(current, total, width = 40) {
  const percent = current / total;
  const filled = Math.round(width * percent);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const rate = (current / elapsed).toFixed(1);
  return `[${bar}] ${current}/${total} (${(percent * 100).toFixed(1)}%) | ${elapsed}s | ${rate}/s`;
}

// Main execution
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 GOOGLE MAPS ULTRA-FAST COORDINATE SCRAPER              ║');
  console.log('║     Target: 900+ locations in < 10 minutes                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Load data
  const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  stats.total = data.length;
  console.log(`📍 Total places to process: ${stats.total}\n`);

  // Split into batches for parallel processing
  const batchSize = CONCURRENT_REQUESTS;
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }

  console.log(`⚡ Processing in ${batches.length} batches of ${batchSize} concurrent requests\n`);

  const allResults = [];
  let processed = 0;

  // Process batches
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    // Process batch in parallel
    const batchPromises = batch.map(place => geocodePlace(place).then(result => ({ place, result })));
    const batchResults = await Promise.allSettled(batchPromises);

    // Update places with results
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) {
        const { place, result } = r.value;
        const oldLat = place.location.coordinates.lat;
        const oldLng = place.location.coordinates.lng;

        if (result) {
          const dist = distance(oldLat, oldLng, result.lat, result.lng);

          if (dist > 0.05) {
            place.location.coordinates.lat = parseFloat(result.lat.toFixed(6));
            place.location.coordinates.lng = parseFloat(result.lng.toFixed(6));
            stats.improved++;
            allResults.push({
              name: place.name,
              old: `${oldLat.toFixed(4)}, ${oldLng.toFixed(4)}`,
              new: `${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`,
              distance: dist.toFixed(2),
              source: result.source
            });
          } else {
            stats.unchanged++;
          }

          stats.success++;
          stats.sources[result.source] = (stats.sources[result.source] || 0) + 1;
        } else {
          stats.failed++;
        }
      } else {
        stats.failed++;
      }

      processed++;
    }

    // Update progress
    process.stdout.write(`\r${progressBar(processed, stats.total)}`);

    // Small delay between batches to be nice to servers
    if (i < batches.length - 1) {
      await sleep(100);
    }
  }

  console.log('\n');

  // Calculate final stats
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const rate = (stats.total / elapsed).toFixed(1);

  // Print results
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                        📊 RÉSULTATS                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`⏱️  Temps total: ${elapsed} secondes`);
  console.log(`🚀 Vitesse: ${rate} locations/seconde\n`);

  console.log('📈 Statistiques:');
  console.log(`   ✅ Succès: ${stats.success} (${(stats.success/stats.total*100).toFixed(1)}%)`);
  console.log(`   📍 Coordonnées améliorées: ${stats.improved}`);
  console.log(`   ➡️  Inchangées (déjà précises): ${stats.unchanged}`);
  console.log(`   ❌ Échecs: ${stats.failed}\n`);

  console.log('🔧 Sources utilisées:');
  Object.entries(stats.sources).sort((a,b) => b[1] - a[1]).forEach(([source, count]) => {
    console.log(`   ${source}: ${count}`);
  });

  // Show top corrections
  if (allResults.length > 0) {
    console.log('\n🎯 Top corrections (plus grande distance):');
    allResults
      .sort((a, b) => parseFloat(b.distance) - parseFloat(a.distance))
      .slice(0, 10)
      .forEach(r => {
        console.log(`   ${r.name}`);
        console.log(`      ${r.old} → ${r.new} (${r.distance} km) [${r.source}]`);
      });
  }

  // Save updated data
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
  console.log(`\n✅ Données sauvegardées: ${OUTPUT_FILE}`);

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    duration: elapsed + 's',
    rate: rate + '/s',
    stats: stats,
    corrections: allResults
  };
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`📄 Rapport sauvegardé: ${REPORT_FILE}`);

  // Final assessment
  const accuracy = ((stats.success - stats.improved) / stats.total * 100).toFixed(1);
  console.log(`\n📊 Précision estimée des données originales: ${accuracy}% étaient déjà correctes`);
  console.log(`📊 ${stats.improved} coordonnées corrigées (${(stats.improved/stats.total*100).toFixed(1)}% du total)`);
}

main().catch(console.error);
