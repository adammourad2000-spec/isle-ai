#!/usr/bin/env node
/**
 * ISLE AI - Fix Coordinate Issues
 * Remove bad places, fix island mismatches, re-enrich suspicious defaults
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const API_BASE = 'https://places.googleapis.com/v1';

// Cayman Islands bounds
const BOUNDS = {
  grandCayman: { minLat: 19.25, maxLat: 19.42, minLng: -81.45, maxLng: -81.05 },
  caymanBrac: { minLat: 19.68, maxLat: 19.76, minLng: -79.92, maxLng: -79.72 },
  littleCayman: { minLat: 19.65, maxLat: 19.72, minLng: -80.10, maxLng: -79.95 }
};

function isInCaymanIslands(lat, lng) {
  const gc = BOUNDS.grandCayman;
  const cb = BOUNDS.caymanBrac;
  const lc = BOUNDS.littleCayman;
  return (
    (lat >= gc.minLat && lat <= gc.maxLat && lng >= gc.minLng && lng <= gc.maxLng) ||
    (lat >= cb.minLat && lat <= cb.maxLat && lng >= cb.minLng && lng <= cb.maxLng) ||
    (lat >= lc.minLat && lat <= lc.maxLat && lng >= lc.minLng && lng <= lc.maxLng)
  );
}

function detectIsland(lat, lng) {
  const gc = BOUNDS.grandCayman;
  const cb = BOUNDS.caymanBrac;
  const lc = BOUNDS.littleCayman;
  if (lat >= gc.minLat && lat <= gc.maxLat && lng >= gc.minLng && lng <= gc.maxLng) return 'Grand Cayman';
  if (lat >= cb.minLat && lat <= cb.maxLat && lng >= cb.minLng && lng <= cb.maxLng) return 'Cayman Brac';
  if (lat >= lc.minLat && lat <= lc.maxLat && lng >= lc.minLng && lng <= lc.maxLng) return 'Little Cayman';
  return null;
}

// Rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function searchPlaceInCayman(name, category) {
  const url = `${API_BASE}/places:searchText`;

  const body = {
    textQuery: `${name} Cayman Islands`,
    maxResultCount: 5,
    locationBias: {
      circle: {
        center: { latitude: 19.3133, longitude: -81.2546 },
        radius: 50000
      }
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.places && data.places.length > 0) {
      // Find a result that's actually in Cayman
      for (const place of data.places) {
        const lat = place.location?.latitude;
        const lng = place.location?.longitude;
        if (lat && lng && isInCaymanIslands(lat, lng)) {
          return {
            lat,
            lng,
            address: place.formattedAddress,
            googlePlaceId: place.id
          };
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('ISLE AI - Fix Coordinate Issues');
  console.log('='.repeat(60));

  const kbPath = path.join(PROJECT_ROOT, 'data', 'unified-knowledge-base.json');
  const data = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));

  console.log(`\nLoaded ${data.length} places`);

  // Track changes
  let removed = 0;
  let fixedIsland = 0;
  let reEnriched = 0;
  let failedReEnrich = 0;

  // Places to keep
  const cleanedData = [];

  // Suspicious default coordinates
  const SUSPICIOUS = [
    { lat: 19.3133, lng: -81.2546 },
    { lat: 19.2866, lng: -81.3744 },
  ];

  for (const place of data) {
    const lat = place.location?.coordinates?.lat;
    const lng = place.location?.coordinates?.lng;

    // Skip places with no coordinates
    if (!lat || !lng) {
      console.log(`❌ Removing (no coords): ${place.name}`);
      removed++;
      continue;
    }

    // Check if outside Cayman Islands
    if (!isInCaymanIslands(lat, lng)) {
      console.log(`❌ Removing (outside Cayman): ${place.name} (${lat}, ${lng})`);
      removed++;
      continue;
    }

    // Fix island mismatch
    const detectedIsland = detectIsland(lat, lng);
    if (detectedIsland && place.location.island !== detectedIsland) {
      console.log(`🔧 Fixing island: ${place.name} (${place.location.island} → ${detectedIsland})`);
      place.location.island = detectedIsland;
      fixedIsland++;
    }

    // Check for suspicious default coordinates
    let isSuspicious = false;
    for (const sus of SUSPICIOUS) {
      if (Math.abs(lat - sus.lat) < 0.001 && Math.abs(lng - sus.lng) < 0.001) {
        isSuspicious = true;
        break;
      }
    }

    if (isSuspicious) {
      console.log(`🔍 Re-enriching (suspicious coords): ${place.name}`);
      await sleep(200);

      const newCoords = await searchPlaceInCayman(place.name, place.category);
      if (newCoords && isInCaymanIslands(newCoords.lat, newCoords.lng)) {
        place.location.coordinates.lat = newCoords.lat;
        place.location.coordinates.lng = newCoords.lng;
        if (newCoords.address) place.location.address = newCoords.address;
        if (newCoords.googlePlaceId) place.location.googlePlaceId = newCoords.googlePlaceId;

        const newIsland = detectIsland(newCoords.lat, newCoords.lng);
        if (newIsland) place.location.island = newIsland;

        console.log(`   ✅ Updated: (${newCoords.lat}, ${newCoords.lng})`);
        reEnriched++;
      } else {
        console.log(`   ⚠️ Could not find better coordinates, removing`);
        removed++;
        failedReEnrich++;
        continue;
      }
    }

    cleanedData.push(place);
  }

  // Save cleaned data
  fs.writeFileSync(kbPath, JSON.stringify(cleanedData, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));
  console.log(`Original places: ${data.length}`);
  console.log(`Removed (bad coords): ${removed}`);
  console.log(`Fixed island mismatch: ${fixedIsland}`);
  console.log(`Re-enriched: ${reEnriched}`);
  console.log(`Failed re-enrich (removed): ${failedReEnrich}`);
  console.log(`Final count: ${cleanedData.length}`);
  console.log(`\nSaved to: ${kbPath}`);
}

main().catch(console.error);
