#!/usr/bin/env node
/**
 * ISLE AI - Google Places New Data Scraper
 *
 * Scrapes 500+ new places from Google Maps for Cayman Islands
 * Uses Google Places API (New) - places.googleapis.com
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ============ CONFIGURATION ============

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const API_BASE = 'https://places.googleapis.com/v1';

// Rate limiting
const RATE_LIMIT_MS = 200; // 5 requests per second
const MAX_RETRIES = 3;

// Cayman Islands locations for searching
const SEARCH_LOCATIONS = [
  // Grand Cayman
  { name: 'George Town', lat: 19.2866, lng: -81.3744 },
  { name: 'Seven Mile Beach', lat: 19.3500, lng: -81.3900 },
  { name: 'West Bay', lat: 19.3833, lng: -81.4167 },
  { name: 'Bodden Town', lat: 19.2833, lng: -81.2500 },
  { name: 'East End', lat: 19.3000, lng: -81.1167 },
  { name: 'North Side', lat: 19.3500, lng: -81.2000 },
  { name: 'Rum Point', lat: 19.3667, lng: -81.2667 },
  { name: 'Camana Bay', lat: 19.3300, lng: -81.3800 },
  // Cayman Brac
  { name: 'Cayman Brac West', lat: 19.7167, lng: -79.8833 },
  { name: 'Cayman Brac East', lat: 19.7000, lng: -79.7500 },
  // Little Cayman
  { name: 'Little Cayman', lat: 19.6833, lng: -80.0667 },
];

// Place types to search for
const SEARCH_CATEGORIES = [
  // Dining & Nightlife
  { type: 'restaurant', category: 'restaurant', priority: 1 },
  { type: 'bar', category: 'bar', priority: 1 },
  { type: 'cafe', category: 'restaurant', priority: 2 },
  { type: 'bakery', category: 'restaurant', priority: 3 },
  { type: 'night_club', category: 'nightlife', priority: 2 },

  // Accommodation
  { type: 'lodging', category: 'hotel', priority: 1 },
  { type: 'resort_hotel', category: 'hotel', priority: 1 },

  // Attractions & Activities
  { type: 'tourist_attraction', category: 'attraction', priority: 1 },
  { type: 'museum', category: 'attraction', priority: 1 },
  { type: 'art_gallery', category: 'attraction', priority: 2 },
  { type: 'aquarium', category: 'attraction', priority: 1 },
  { type: 'zoo', category: 'attraction', priority: 2 },
  { type: 'amusement_park', category: 'activity', priority: 2 },

  // Shopping
  { type: 'shopping_mall', category: 'shopping', priority: 1 },
  { type: 'jewelry_store', category: 'shopping', priority: 2 },
  { type: 'gift_shop', category: 'shopping', priority: 3 },
  { type: 'clothing_store', category: 'shopping', priority: 3 },

  // Services
  { type: 'car_rental', category: 'transport', priority: 1 },
  { type: 'travel_agency', category: 'concierge', priority: 2 },
  { type: 'spa', category: 'spa_wellness', priority: 1 },
  { type: 'gym', category: 'activity', priority: 3 },

  // Water Activities
  { type: 'marina', category: 'boat_charter', priority: 1 },
  { type: 'scuba_diving', category: 'diving_snorkeling', priority: 1 },

  // Nature & Outdoors
  { type: 'park', category: 'attraction', priority: 2 },
  { type: 'beach', category: 'beach', priority: 1 },

  // Sports
  { type: 'golf_course', category: 'golf', priority: 1 },

  // Essential Services
  { type: 'bank', category: 'financial', priority: 2 },
  { type: 'atm', category: 'financial', priority: 3 },
  { type: 'pharmacy', category: 'medical', priority: 2 },
  { type: 'hospital', category: 'medical', priority: 1 },
  { type: 'doctor', category: 'medical', priority: 2 },
];

// Fields to request
const PLACE_FIELDS = [
  'id', 'displayName', 'formattedAddress', 'shortFormattedAddress',
  'location', 'viewport', 'googleMapsUri', 'types', 'primaryType',
  'businessStatus', 'priceLevel', 'nationalPhoneNumber', 'internationalPhoneNumber',
  'websiteUri', 'regularOpeningHours', 'rating', 'userRatingCount',
  'photos', 'editorialSummary', 'reviews',
  'delivery', 'dineIn', 'takeout', 'outdoorSeating',
  'servesBeer', 'servesWine', 'goodForGroups', 'goodForChildren',
  'accessibilityOptions', 'paymentOptions', 'parkingOptions'
];

// ============ UTILITIES ============

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let lastRequestTime = 0;

async function rateLimitedFetch(url, options = {}) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await sleep(RATE_LIMIT_MS - timeSinceLastRequest);
  }

  lastRequestTime = Date.now();
  return fetch(url, options);
}

async function fetchWithRetry(url, options = {}, retries = 0) {
  try {
    const response = await rateLimitedFetch(url, options);

    if (response.status === 429) {
      if (retries < MAX_RETRIES) {
        console.log(`  Rate limited, waiting 5s before retry ${retries + 1}...`);
        await sleep(5000);
        return fetchWithRetry(url, options, retries + 1);
      }
      throw new Error('Rate limit exceeded');
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error ${response.status}: ${error}`);
    }

    return response.json();
  } catch (error) {
    if (retries < MAX_RETRIES && error.message.includes('fetch')) {
      await sleep(2000);
      return fetchWithRetry(url, options, retries + 1);
    }
    throw error;
  }
}

// ============ GOOGLE PLACES API ============

async function searchNearby(location, type, radius = 5000) {
  const url = `${API_BASE}/places:searchNearby`;

  const body = {
    includedTypes: [type],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radius: radius
      }
    }
  };

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.userRatingCount'
    },
    body: JSON.stringify(body)
  });

  return response.places || [];
}

async function textSearch(query, location) {
  const url = `${API_BASE}/places:searchText`;

  const body = {
    textQuery: query,
    maxResultCount: 20,
    locationBias: {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radius: 10000
      }
    }
  };

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.userRatingCount'
    },
    body: JSON.stringify(body)
  });

  return response.places || [];
}

async function getPlaceDetails(placeId) {
  const url = `${API_BASE}/places/${placeId}`;

  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': PLACE_FIELDS.join(',')
    }
  });

  return response;
}

// ============ DATA CONVERSION ============

function convertPriceLevel(priceLevel) {
  const map = {
    'PRICE_LEVEL_FREE': 'Free',
    'PRICE_LEVEL_INEXPENSIVE': '$',
    'PRICE_LEVEL_MODERATE': '$$',
    'PRICE_LEVEL_EXPENSIVE': '$$$',
    'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$'
  };
  return map[priceLevel] || '$$';
}

function convertToKnowledgeNode(place, category) {
  const id = `google-${place.id}`;
  const name = place.displayName?.text || 'Unknown';
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Build photo URLs
  const photos = (place.photos || []).slice(0, 10).map(photo => ({
    reference: photo.name,
    url: `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1200&maxHeightPx=800&key=${API_KEY}`,
    width: photo.widthPx,
    height: photo.heightPx
  }));

  // Opening hours
  let hoursDisplay = null;
  let schedule = null;
  if (place.regularOpeningHours?.weekdayDescriptions) {
    hoursDisplay = place.regularOpeningHours.weekdayDescriptions.join(', ');
  }

  // Build reviews
  const reviews = (place.reviews || []).slice(0, 5).map(r => ({
    rating: r.rating,
    text: r.text?.text || '',
    author: r.authorAttribution?.displayName || 'Anonymous',
    time: r.publishTime
  }));

  return {
    id,
    name,
    slug,
    category,
    subcategory: place.primaryType || null,
    description: place.editorialSummary?.text || `${name} is a ${category} in ${place.shortFormattedAddress || 'Cayman Islands'}.`,
    shortDescription: place.editorialSummary?.text?.slice(0, 150) || `${name} - ${place.shortFormattedAddress || 'Cayman Islands'}`,
    highlights: [],
    location: {
      island: determineIsland(place.location?.latitude, place.location?.longitude),
      area: extractArea(place.formattedAddress),
      district: extractDistrict(place.formattedAddress),
      address: place.formattedAddress || null,
      coordinates: {
        lat: place.location?.latitude || 0,
        lng: place.location?.longitude || 0
      },
      googlePlaceId: place.id
    },
    contact: {
      phone: place.internationalPhoneNumber || place.nationalPhoneNumber || null,
      email: null,
      website: place.websiteUri || null,
      bookingUrl: null,
      social: { instagram: null, facebook: null, tripadvisor: null }
    },
    business: {
      priceRange: convertPriceLevel(place.priceLevel),
      priceFrom: null,
      priceTo: null,
      currency: 'USD',
      hours: {
        display: hoursDisplay,
        isOpen24Hours: false,
        schedule
      },
      acceptsCreditCards: place.paymentOptions?.acceptsCreditCards || true,
      reservationRequired: false,
      languages: ['English']
    },
    ratings: {
      overall: place.rating || null,
      reviewCount: place.userRatingCount || 0,
      googleRating: place.rating || null,
      tripadvisorRating: null
    },
    media: {
      thumbnail: photos[0]?.url || null,
      images: photos.map(p => p.url),
      videos: []
    },
    tags: [category, ...(place.types || []).slice(0, 5)],
    keywords: [],
    searchText: `${name} ${place.formattedAddress || ''} ${category}`.toLowerCase(),
    isActive: true,
    isFeatured: false,
    isPremium: false,
    source: 'google-places',
    sourceId: place.id,
    quality: {
      score: calculateQualityScore(place, photos),
      hasPhoto: photos.length > 0,
      hasPhone: !!place.nationalPhoneNumber,
      hasWebsite: !!place.websiteUri,
      hasDescription: !!place.editorialSummary?.text,
      hasHours: !!hoursDisplay
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    googleEnrichment: {
      googlePlaceId: place.id,
      googleMapsUrl: place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${place.id}`,
      matchConfidence: 100,
      coordinates: {
        lat: place.location?.latitude || 0,
        lng: place.location?.longitude || 0
      },
      formattedAddress: place.formattedAddress || '',
      businessStatus: place.businessStatus === 'OPERATIONAL' ? 'operational' : 'unknown',
      types: place.types || [],
      primaryType: place.primaryType,
      rating: place.rating,
      reviewCount: place.userRatingCount,
      reviews,
      photos,
      amenities: {
        delivery: place.delivery,
        dineIn: place.dineIn,
        takeout: place.takeout,
        outdoorSeating: place.outdoorSeating,
        servesAlcohol: place.servesBeer || place.servesWine,
        goodForGroups: place.goodForGroups,
        goodForChildren: place.goodForChildren,
        wheelchairAccessible: place.accessibilityOptions?.wheelchairAccessibleEntrance,
        freeParking: place.parkingOptions?.freeParkingLot || place.parkingOptions?.freeStreetParking
      },
      enrichedAt: new Date().toISOString(),
      apiVersion: 'v1'
    }
  };
}

function determineIsland(lat, lng) {
  if (!lat || !lng) return 'Grand Cayman';

  // Little Cayman: roughly 19.65-19.72 lat, -80.10 to -79.95 lng
  if (lat >= 19.65 && lat <= 19.72 && lng >= -80.10 && lng <= -79.95) {
    return 'Little Cayman';
  }

  // Cayman Brac: roughly 19.68-19.75 lat, -79.95 to -79.70 lng
  if (lat >= 19.68 && lat <= 19.76 && lng >= -79.95 && lng <= -79.70) {
    return 'Cayman Brac';
  }

  return 'Grand Cayman';
}

function extractArea(address) {
  if (!address) return 'Grand Cayman';
  const parts = address.split(',').map(p => p.trim());
  return parts[1] || parts[0] || 'Grand Cayman';
}

function extractDistrict(address) {
  if (!address) return 'George Town';

  const districts = ['George Town', 'West Bay', 'Bodden Town', 'East End', 'North Side',
                     'Seven Mile Beach', 'Camana Bay', 'Rum Point', 'Stake Bay', 'Spot Bay'];

  for (const district of districts) {
    if (address.includes(district)) return district;
  }

  return 'George Town';
}

function calculateQualityScore(place, photos) {
  let score = 0;

  if (photos.length > 0) score += Math.min(25, photos.length * 5);
  if (place.nationalPhoneNumber) score += 10;
  if (place.websiteUri) score += 10;
  if (place.editorialSummary?.text) score += 15;
  if (place.regularOpeningHours) score += 10;
  if (place.location) score += 10;
  if (place.rating) score += 10;
  if (place.userRatingCount > 0) score += 5;

  return Math.min(100, score);
}

// ============ MAIN SCRAPER ============

async function main() {
  console.log('========================================');
  console.log('ISLE AI - Google Places Scraper');
  console.log('========================================\n');

  if (!API_KEY) {
    console.error('ERROR: GOOGLE_PLACES_API_KEY not set');
    process.exit(1);
  }

  // Load existing knowledge base to check for duplicates
  const kbPath = path.join(PROJECT_ROOT, 'data', 'unified-knowledge-base.json');
  const existingKB = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
  const existingPlaceIds = new Set(existingKB.map(p => p.location.googlePlaceId).filter(Boolean));

  console.log(`Existing places: ${existingKB.length}`);
  console.log(`Existing Google Place IDs: ${existingPlaceIds.size}`);

  const newPlaces = new Map(); // placeId -> place data
  const TARGET_NEW_PLACES = 500;

  let apiCalls = 0;

  // Search each location + category combination
  for (const location of SEARCH_LOCATIONS) {
    if (newPlaces.size >= TARGET_NEW_PLACES) break;

    console.log(`\n📍 Searching: ${location.name}`);

    for (const searchCat of SEARCH_CATEGORIES) {
      if (newPlaces.size >= TARGET_NEW_PLACES) break;

      try {
        // Nearby search
        const results = await searchNearby(location, searchCat.type, 8000);
        apiCalls++;

        for (const place of results) {
          if (newPlaces.size >= TARGET_NEW_PLACES) break;
          if (existingPlaceIds.has(place.id)) continue;
          if (newPlaces.has(place.id)) continue;

          // Skip low-rated places
          if (place.rating && place.rating < 3.5) continue;

          // Get full details
          try {
            console.log(`  → Fetching: ${place.displayName?.text || place.id}`);
            const details = await getPlaceDetails(place.id);
            apiCalls++;

            // Skip if closed permanently
            if (details.businessStatus === 'CLOSED_PERMANENTLY') continue;

            // Convert to knowledge node
            const node = convertToKnowledgeNode(details, searchCat.category);
            newPlaces.set(place.id, node);

            console.log(`  ✓ Added: ${node.name} (${newPlaces.size}/${TARGET_NEW_PLACES})`);

          } catch (error) {
            console.log(`  ✗ Failed to get details: ${error.message}`);
          }
        }

      } catch (error) {
        console.log(`  ✗ Search failed: ${error.message}`);
      }
    }
  }

  // Also do text searches for specific queries
  const textQueries = [
    'best restaurants Cayman Islands',
    'luxury hotels Grand Cayman',
    'scuba diving Cayman',
    'snorkeling spots Cayman',
    'beach bars Grand Cayman',
    'water sports Cayman',
    'boat tours Cayman',
    'fishing charters Grand Cayman',
    'spa and wellness Cayman',
    'shopping Cayman Islands',
    'attractions Grand Cayman',
    'things to do Cayman',
    'nightlife George Town',
    'cafes Cayman Islands',
    'car rental Grand Cayman',
    'golf course Cayman',
    'yoga studio Cayman',
    'jet ski rental Cayman',
    'parasailing Grand Cayman',
    'stingray city tours',
  ];

  console.log('\n\n📝 Text searches...');

  for (const query of textQueries) {
    if (newPlaces.size >= TARGET_NEW_PLACES) break;

    try {
      console.log(`  Searching: "${query}"`);
      const results = await textSearch(query, SEARCH_LOCATIONS[0]);
      apiCalls++;

      for (const place of results) {
        if (newPlaces.size >= TARGET_NEW_PLACES) break;
        if (existingPlaceIds.has(place.id)) continue;
        if (newPlaces.has(place.id)) continue;

        if (place.rating && place.rating < 3.5) continue;

        try {
          const details = await getPlaceDetails(place.id);
          apiCalls++;

          if (details.businessStatus === 'CLOSED_PERMANENTLY') continue;

          // Determine category from types
          let category = 'attraction';
          const types = details.types || [];
          if (types.includes('restaurant') || types.includes('food')) category = 'restaurant';
          else if (types.includes('bar')) category = 'bar';
          else if (types.includes('lodging')) category = 'hotel';
          else if (types.includes('spa')) category = 'spa_wellness';
          else if (types.includes('shopping_mall') || types.includes('store')) category = 'shopping';
          else if (types.includes('car_rental')) category = 'transport';

          const node = convertToKnowledgeNode(details, category);
          newPlaces.set(place.id, node);

          console.log(`  ✓ Added: ${node.name} (${newPlaces.size}/${TARGET_NEW_PLACES})`);

        } catch (error) {
          // Skip
        }
      }

    } catch (error) {
      console.log(`  ✗ Search failed: ${error.message}`);
    }
  }

  // Save results
  console.log('\n\n========================================');
  console.log('RESULTS');
  console.log('========================================');
  console.log(`New places found: ${newPlaces.size}`);
  console.log(`API calls made: ${apiCalls}`);

  // Merge with existing
  const allPlaces = [...existingKB, ...Array.from(newPlaces.values())];

  // Sort by quality score
  allPlaces.sort((a, b) => (b.quality?.score || 0) - (a.quality?.score || 0));

  // Save
  fs.writeFileSync(kbPath, JSON.stringify(allPlaces, null, 2));
  console.log(`\nSaved: ${allPlaces.length} total places`);

  // Stats
  const byCategory = {};
  for (const p of allPlaces) {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  }
  console.log('\nBy category:');
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));

  // Estimate cost
  const cost = (apiCalls / 1000) * 32; // Text/Nearby search cost
  console.log(`\nEstimated API cost: $${cost.toFixed(2)}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
