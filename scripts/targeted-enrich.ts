#!/usr/bin/env npx ts-node --esm

/**
 * Targeted Google Places Enrichment
 * Re-enriches specific places that should have Google data but don't
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Explicitly load .env from project root
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const API_BASE_URL = 'https://places.googleapis.com/v1';

// Target IDs that need re-enrichment - Round 2
const TARGET_IDS = [
  'osm-way/369024903',       // Cracked Conch
  'osm-way/373660954',       // Rackam's Waterfront Bar & Grill
  'osm-node/775748060',      // Morgans Harbour Marina
  'osm-way/369704446',       // Dolphin Cove
  'osm-node/697199527',      // Kaibo
  'osm-way/369190560',       // Hell Post Office
  'osm-node/1550931122',     // Hell
  'osm-node/8817882426',     // USS Kittiwake Shipwreck
  'osm-node/5396260622',     // Hell's Souvenirs
  'critical-stingray-city',  // Stingray City
  'osm-way/62064817',        // Grand Old House Restaurant
  'osm-node/6954160312',     // West Bay Public Beach
  'osm-way/62225858',        // Boatswains Beach
  'osm-node/3773731579',     // Captain Marvin's
  'osm-node/10281454009',    // Smith Cove Snorkel Area
  'osm-way/1025039746',      // Point of Sands Beach
  'osm-way/373441713',       // Colliers Beach
  'osm-way/1135229187',      // Smiths Cove
  'critical-pedro-castle',   // Pedro St. James
  'critical-cruise-terminal', // George Town Cruise Terminal
];

// Alternative search names for better matching
const SEARCH_NAMES: Record<string, string> = {
  'osm-way/369024903': 'Cracked Conch Restaurant Grand Cayman West Bay',
  'osm-way/373660954': "Rackam's Waterfront Bar Grill Grand Cayman George Town",
  'osm-node/775748060': "Morgan's Harbour Marina Grand Cayman West Bay",
  'osm-way/369704446': 'Dolphin Discovery Grand Cayman',
  'osm-node/697199527': 'Kaibo Beach Bar Grand Cayman Rum Point',
  'osm-way/369190560': 'Hell Post Office Grand Cayman West Bay',
  'osm-node/1550931122': 'Hell Grand Cayman tourist attraction',
  'osm-node/8817882426': 'USS Kittiwake Dive Site Grand Cayman',
  'osm-node/5396260622': "Hell's Souvenirs Gift Shop Grand Cayman",
  'critical-stingray-city': 'Stingray City Sandbar Grand Cayman',
  'osm-way/62064817': 'Grand Old House Restaurant Grand Cayman',
  'osm-node/6954160312': 'West Bay Public Beach Grand Cayman',
  'osm-way/62225858': "Boatswain's Beach Grand Cayman Turtle Centre",
  'osm-node/3773731579': "Captain Marvin's Stingray City Tours Grand Cayman",
  'osm-node/10281454009': 'Smith Cove Beach Grand Cayman snorkeling',
  'osm-way/1025039746': 'Point of Sand Beach Little Cayman',
  'osm-way/373441713': 'Colliers Beach East End Grand Cayman',
  'osm-way/1135229187': "Smith's Cove Beach Grand Cayman George Town",
  'critical-pedro-castle': 'Pedro St James Castle Grand Cayman',
  'critical-cruise-terminal': 'George Town Cruise Terminal Grand Cayman',
};

interface Place {
  id: string;
  name: string;
  location?: {
    coordinates?: { lat: number; lng: number };
    [key: string]: any;
  };
  googleEnrichment?: any;
  [key: string]: any;
}

const PLACE_FIELDS = [
  'id', 'displayName', 'formattedAddress', 'shortFormattedAddress',
  'addressComponents', 'plusCode', 'location', 'viewport', 'googleMapsUri',
  'types', 'primaryType', 'businessStatus', 'priceLevel',
  'nationalPhoneNumber', 'internationalPhoneNumber', 'websiteUri',
  'regularOpeningHours', 'rating', 'userRatingCount', 'reviews',
  'photos', 'editorialSummary', 'accessibilityOptions', 'parkingOptions'
];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getApiKey(): string {
  return (global as any).API_KEY_OVERRIDE || API_KEY || '';
}

async function searchPlace(name: string, location?: { lat: number; lng: number }) {
  const url = `${API_BASE_URL}/places:searchText`;
  const apiKey = getApiKey();

  const body: any = {
    textQuery: name,
    languageCode: 'en',
    maxResultCount: 5,
  };

  if (location?.lat && location?.lng) {
    body.locationBias = {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radius: 1000
      }
    };
  } else {
    body.locationRestriction = {
      rectangle: {
        low: { latitude: 19.2, longitude: -81.5 },
        high: { latitude: 19.8, longitude: -79.7 }
      }
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Search failed: ${response.status} - ${error}`);
  }

  return response.json();
}

async function getPlaceDetails(placeId: string) {
  const url = `${API_BASE_URL}/places/${placeId}`;
  const apiKey = getApiKey();

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACE_FIELDS.join(',')
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Details failed: ${response.status} - ${error}`);
  }

  return response.json();
}

function buildEnrichment(details: any, matchConfidence: number) {
  return {
    googlePlaceId: details.id,
    googleMapsUrl: details.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${details.id}`,
    matchConfidence,
    coordinates: {
      lat: details.location?.latitude,
      lng: details.location?.longitude
    },
    formattedAddress: details.formattedAddress,
    shortAddress: details.shortFormattedAddress,
    plusCode: details.plusCode?.globalCode,
    businessStatus: (details.businessStatus || 'OPERATIONAL').toLowerCase().replace(/_/g, '_'),
    types: details.types || [],
    primaryType: details.primaryType,
    enrichedAt: new Date().toISOString(),
    apiVersion: 'v1',
    ...(details.viewport && {
      viewport: {
        northeast: { lat: details.viewport.high?.latitude, lng: details.viewport.high?.longitude },
        southwest: { lat: details.viewport.low?.latitude, lng: details.viewport.low?.longitude }
      }
    }),
    ...(details.addressComponents && {
      addressComponents: details.addressComponents.map((c: any) => ({
        longName: c.longText,
        shortName: c.shortText,
        types: c.types
      }))
    }),
    ...(details.nationalPhoneNumber && { phone: details.nationalPhoneNumber }),
    ...(details.internationalPhoneNumber && { phoneInternational: details.internationalPhoneNumber }),
    ...(details.websiteUri && { website: details.websiteUri }),
    ...(details.rating !== undefined && { rating: details.rating }),
    ...(details.userRatingCount && { reviewCount: details.userRatingCount }),
    ...(details.reviews && {
      reviews: details.reviews.slice(0, 5).map((r: any) => ({
        rating: r.rating,
        text: r.text?.text || '',
        author: r.authorAttribution?.displayName || 'Anonymous',
        time: r.publishTime
      }))
    }),
    ...(details.regularOpeningHours && {
      openingHours: {
        isOpen24Hours: false,
        weekdayText: details.regularOpeningHours.weekdayDescriptions || [],
        ...(details.regularOpeningHours.periods && {
          periods: details.regularOpeningHours.periods.map((p: any) => ({
            open: { day: p.open?.day, time: `${String(p.open?.hour || 0).padStart(2, '0')}:${String(p.open?.minute || 0).padStart(2, '0')}` },
            ...(p.close && { close: { day: p.close.day, time: `${String(p.close.hour || 0).padStart(2, '0')}:${String(p.close.minute || 0).padStart(2, '0')}` } })
          }))
        })
      }
    }),
    ...(details.photos && details.photos.length > 0 && {
      photos: details.photos.slice(0, 10).map((p: any) => ({
        reference: p.name,
        url: `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=1200&maxHeightPx=800&key=${getApiKey()}`,
        width: p.widthPx,
        height: p.heightPx,
        attribution: p.authorAttributions?.[0]?.displayName
      }))
    }),
    amenities: {
      wheelchairAccessible: details.accessibilityOptions?.wheelchairAccessibleEntrance,
      freeParking: details.parkingOptions?.freeParkingLot || details.parkingOptions?.freeStreetParking
    }
  };
}

async function main() {
  console.log('API Key loaded:', API_KEY ? `Yes (${API_KEY.slice(0, 8)}...)` : 'No');

  if (!API_KEY) {
    // Try reading directly from .env file
    const envPath = path.join(PROJECT_ROOT, '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/GOOGLE_PLACES_API_KEY=(.+)/);
    if (match) {
      (global as any).API_KEY_OVERRIDE = match[1].trim();
      console.log('Loaded API key from .env file directly');
    } else {
      console.error('ERROR: GOOGLE_PLACES_API_KEY not set');
      process.exit(1);
    }
  }

  console.log('=== TARGETED GOOGLE PLACES ENRICHMENT ===\n');

  // Load knowledge base
  const kbPath = path.join(PROJECT_ROOT, 'data', 'unified-knowledge-base.json');
  const data = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
  const places: Place[] = data.places || data;

  console.log(`Loaded ${places.length} places from knowledge base`);
  console.log(`Targeting ${TARGET_IDS.length} places for re-enrichment\n`);

  let enrichedCount = 0;
  let failedCount = 0;

  for (const targetId of TARGET_IDS) {
    const place = places.find(p => p.id === targetId);
    if (!place) {
      console.log(`⚠️  Not found: ${targetId}`);
      continue;
    }

    const searchName = SEARCH_NAMES[targetId] || place.name;
    console.log(`\n🔍 Searching: "${searchName}"`);

    try {
      // Search for the place
      const searchResult = await searchPlace(searchName, place.location?.coordinates);
      await sleep(200);

      if (!searchResult.places || searchResult.places.length === 0) {
        console.log(`   ❌ No results found`);
        failedCount++;
        continue;
      }

      // Take the best match
      const match = searchResult.places[0];
      console.log(`   📍 Found: ${match.displayName?.text}`);
      console.log(`   📍 Address: ${match.formattedAddress}`);

      // Get full details
      const details = await getPlaceDetails(match.id);
      await sleep(200);

      // Build enrichment
      const enrichment = buildEnrichment(details, 95);

      // Update the place
      place.googleEnrichment = enrichment;
      place.location = {
        ...place.location,
        coordinates: enrichment.coordinates,
        googlePlaceId: details.id
      };

      console.log(`   ✅ Enriched with coords: ${enrichment.coordinates.lat.toFixed(7)}, ${enrichment.coordinates.lng.toFixed(7)}`);
      console.log(`   ⭐ Rating: ${enrichment.rating || 'N/A'} (${enrichment.reviewCount || 0} reviews)`);

      enrichedCount++;

    } catch (error) {
      console.log(`   ❌ Error: ${(error as Error).message}`);
      failedCount++;
    }
  }

  // Save updated data
  console.log('\n=== SAVING UPDATES ===\n');

  fs.writeFileSync(kbPath, JSON.stringify(places, null, 2));
  console.log(`✅ Saved to: ${kbPath}`);

  // Also update enriched-knowledge-base.json
  const enrichedPath = path.join(PROJECT_ROOT, 'data', 'enriched-knowledge-base.json');
  fs.writeFileSync(enrichedPath, JSON.stringify(places, null, 2));
  console.log(`✅ Saved to: ${enrichedPath}`);

  console.log(`\n=== RESULTS ===`);
  console.log(`Enriched: ${enrichedCount}`);
  console.log(`Failed: ${failedCount}`);
}

main().catch(console.error);
