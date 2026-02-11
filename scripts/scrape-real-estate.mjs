#!/usr/bin/env node
/**
 * Scrape Real Estate Services from Google Places API
 * Cayman Islands real estate - agencies, developers, properties, legal services
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Google Places API Key
const API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyC3f6s1y5XuIrAjWjsfRu6-nrlVNRxbPgo';

// Real estate search queries
const REAL_ESTATE_QUERIES = [
  // Real Estate Agencies
  'real estate agency cayman islands',
  'real estate agent cayman',
  'property agent grand cayman',
  'realtor cayman islands',
  'real estate broker cayman',
  'luxury real estate cayman islands',
  'cayman islands property sales',

  // Property Developers
  'property developer cayman islands',
  'real estate developer grand cayman',
  'construction company cayman islands',
  'home builder cayman',
  'luxury villa developer cayman',
  'condo developer cayman islands',

  // Property Management
  'property management cayman islands',
  'rental management grand cayman',
  'vacation rental management cayman',
  'strata management cayman',

  // Property Types
  'luxury homes cayman islands',
  'beachfront property cayman',
  'seven mile beach condo',
  'oceanfront villa cayman',
  'waterfront property grand cayman',

  // Related Services
  'property lawyer cayman islands',
  'conveyancing cayman',
  'real estate attorney cayman',
  'property valuation cayman islands',
  'surveyor cayman islands',
  'mortgage broker cayman',
  'home insurance cayman islands',

  // Commercial
  'commercial real estate cayman',
  'office space cayman islands',
  'retail space grand cayman',
  'industrial property cayman',
];

// Rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Text search for real estate services
async function textSearch(query) {
  const url = `https://places.googleapis.com/v1/places:searchText`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri,places.internationalPhoneNumber,places.types,places.businessStatus,places.googleMapsUri,places.regularOpeningHours,places.photos,places.editorialSummary'
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: 19.3133, longitude: -81.2546 },
          radius: 50000.0 // 50km radius covers all Cayman Islands
        }
      },
      maxResultCount: 20
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`API Error for "${query}":`, error);
    return [];
  }

  const data = await response.json();
  return data.places || [];
}

// Get place photo
async function getPlacePhoto(photoName) {
  if (!photoName) return null;

  const url = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=800&key=${API_KEY}`;

  try {
    const response = await fetch(url, { redirect: 'follow' });
    return response.url;
  } catch {
    return null;
  }
}

// Determine subcategory based on types and name
function categorizePlace(place) {
  const name = place.displayName?.text?.toLowerCase() || '';
  const types = place.types || [];

  // Real Estate Agencies
  if (types.includes('real_estate_agency') ||
      name.includes('realty') || name.includes('real estate') ||
      name.includes('property') || name.includes('properties') ||
      name.includes('sotheby') || name.includes('christie') ||
      name.includes('coldwell') || name.includes('re/max') ||
      name.includes('keller williams')) {
    return { category: 'real_estate', subcategory: 'real_estate_agency' };
  }

  // Property Developers
  if (name.includes('developer') || name.includes('development') ||
      name.includes('construction') || name.includes('builder') ||
      name.includes('homes ltd') || name.includes('properties ltd')) {
    return { category: 'real_estate', subcategory: 'property_developer' };
  }

  // Property Management
  if (name.includes('management') || name.includes('strata') ||
      name.includes('rental') || name.includes('leasing')) {
    return { category: 'real_estate', subcategory: 'property_management' };
  }

  // Legal Services for Real Estate
  if (types.includes('lawyer') || name.includes('law') ||
      name.includes('legal') || name.includes('attorney') ||
      name.includes('conveyancing')) {
    return { category: 'real_estate', subcategory: 'property_legal' };
  }

  // Surveyors & Valuers
  if (name.includes('survey') || name.includes('valuation') ||
      name.includes('apprais')) {
    return { category: 'real_estate', subcategory: 'property_valuation' };
  }

  // Mortgage & Finance
  if (name.includes('mortgage') || name.includes('finance') ||
      name.includes('lending')) {
    return { category: 'real_estate', subcategory: 'property_finance' };
  }

  // Default
  return { category: 'real_estate', subcategory: 'real_estate_services' };
}

// Convert Google Place to our format
async function convertPlace(place) {
  const { category, subcategory } = categorizePlace(place);

  // Get photo URL
  let thumbnail = null;
  if (place.photos && place.photos.length > 0) {
    thumbnail = await getPlacePhoto(place.photos[0].name);
  }

  // Determine island from address
  const address = place.formattedAddress || '';
  let island = 'Grand Cayman';
  if (address.toLowerCase().includes('cayman brac')) {
    island = 'Cayman Brac';
  } else if (address.toLowerCase().includes('little cayman')) {
    island = 'Little Cayman';
  }

  // Determine area
  let area = 'George Town';
  if (address.toLowerCase().includes('camana bay')) {
    area = 'Camana Bay';
  } else if (address.toLowerCase().includes('seven mile')) {
    area = 'Seven Mile Beach';
  } else if (address.toLowerCase().includes('west bay')) {
    area = 'West Bay';
  }

  const subcategoryLabels = {
    'real_estate_agency': 'Real Estate Agency',
    'property_developer': 'Property Developer',
    'property_management': 'Property Management',
    'property_legal': 'Property Legal Services',
    'property_valuation': 'Property Valuation',
    'property_finance': 'Mortgage & Finance',
    'real_estate_services': 'Real Estate Services'
  };

  return {
    id: `google-re-${place.id}`,
    name: place.displayName?.text || 'Unknown',
    category,
    subcategory,
    description: place.editorialSummary?.text ||
      `Professional ${subcategoryLabels[subcategory] || 'real estate'} services in the Cayman Islands.`,
    shortDescription: place.editorialSummary?.text?.slice(0, 150) ||
      `${subcategoryLabels[subcategory] || 'Real estate'} services`,
    highlights: [],
    location: {
      island,
      area,
      district: area,
      address: place.formattedAddress || '',
      coordinates: {
        lat: place.location?.latitude || 0,
        lng: place.location?.longitude || 0
      },
      googlePlaceId: place.id
    },
    contact: {
      phone: place.internationalPhoneNumber || null,
      website: place.websiteUri || null,
      email: null,
      bookingUrl: null,
      social: {}
    },
    business: {
      priceRange: null,
      priceFrom: null,
      priceTo: null,
      currency: 'USD',
      hours: {
        display: place.regularOpeningHours?.weekdayDescriptions?.join(', ') || null,
        schedule: {}
      },
      reservationRequired: false,
      acceptsCreditCards: true,
      languages: ['English']
    },
    ratings: {
      overall: place.rating || 4.5,
      reviewCount: place.userRatingCount || 0,
      googleRating: place.rating || null,
      tripadvisorRating: null
    },
    media: {
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800',
      images: [],
      videos: []
    },
    tags: [
      'real-estate',
      'property',
      subcategory.replace('_', '-'),
      'cayman',
      'professional'
    ],
    keywords: [
      'real estate',
      'property',
      subcategory.replace('_', ' '),
      'cayman islands',
      'grand cayman'
    ],
    isActive: true,
    isPremium: true,
    isFeatured: place.rating >= 4.5,
    source: 'google-places-real-estate',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// Main scraping function
async function scrapeRealEstate() {
  console.log('🏠 Starting Real Estate Scrape...\n');

  const allPlaces = new Map(); // Use Map to dedupe by place ID

  for (const query of REAL_ESTATE_QUERIES) {
    console.log(`🔍 Searching: "${query}"`);

    try {
      const places = await textSearch(query);
      console.log(`   Found ${places.length} results`);

      for (const place of places) {
        // Only include places in Cayman Islands
        const address = place.formattedAddress?.toLowerCase() || '';
        if (!address.includes('cayman')) {
          continue;
        }

        // Skip if already added
        if (allPlaces.has(place.id)) {
          continue;
        }

        // Only include business places that are operational
        if (place.businessStatus !== 'OPERATIONAL') {
          continue;
        }

        // Convert and add
        const converted = await convertPlace(place);
        allPlaces.set(place.id, converted);
        console.log(`   ✅ Added: ${converted.name} (${converted.subcategory})`);

        // Small delay to avoid rate limiting
        await delay(100);
      }

      // Delay between queries
      await delay(500);

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n📊 Total unique real estate services found: ${allPlaces.size}`);

  return Array.from(allPlaces.values());
}

// Load existing knowledge base and merge
async function mergeWithExisting(newPlaces) {
  const kbPath = join(rootDir, 'public', 'knowledge-base.json');

  // Load existing
  let existing = [];
  try {
    existing = JSON.parse(readFileSync(kbPath, 'utf-8'));
    console.log(`📚 Loaded ${existing.length} existing places`);
  } catch (error) {
    console.error('Could not load existing knowledge base');
    return newPlaces;
  }

  // Create ID set of existing places
  const existingIds = new Set(existing.map(p => p.location?.googlePlaceId).filter(Boolean));
  const existingNames = new Set(existing.map(p => p.name.toLowerCase()));

  // Filter new places to avoid duplicates
  const uniqueNew = newPlaces.filter(p => {
    const placeId = p.location?.googlePlaceId;
    const name = p.name.toLowerCase();

    if (placeId && existingIds.has(placeId)) {
      return false;
    }
    if (existingNames.has(name)) {
      return false;
    }
    return true;
  });

  console.log(`✨ ${uniqueNew.length} new unique real estate services to add`);

  // Merge
  const merged = [...existing, ...uniqueNew];

  // Sort by rating
  merged.sort((a, b) => (b.ratings?.overall || 0) - (a.ratings?.overall || 0));

  return merged;
}

// Main execution
async function main() {
  try {
    // Scrape real estate services
    const realEstateServices = await scrapeRealEstate();

    if (realEstateServices.length === 0) {
      console.log('No new real estate services found');
      return;
    }

    // Show breakdown by subcategory
    const breakdown = {};
    realEstateServices.forEach(p => {
      const sub = p.subcategory || 'other';
      breakdown[sub] = (breakdown[sub] || 0) + 1;
    });
    console.log('\n📈 Breakdown by type:');
    Object.entries(breakdown).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Merge with existing
    const merged = await mergeWithExisting(realEstateServices);

    // Save
    const outputPath = join(rootDir, 'public', 'knowledge-base.json');
    writeFileSync(outputPath, JSON.stringify(merged, null, 2));

    console.log(`\n✅ Saved ${merged.length} total places to ${outputPath}`);

    // Show top rated new services
    console.log('\n🌟 Top rated new real estate services:');
    realEstateServices
      .filter(p => p.ratings?.overall >= 4.0)
      .sort((a, b) => (b.ratings?.overall || 0) - (a.ratings?.overall || 0))
      .slice(0, 15)
      .forEach(p => {
        console.log(`   ⭐ ${p.ratings?.overall?.toFixed(1)} - ${p.name} (${p.subcategory})`);
      });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
