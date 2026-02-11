#!/usr/bin/env node
/**
 * Scrape Financial & Fund Services from Google Places API
 * Cayman Islands is a major financial hub - adds fund admin, law firms, accounting, etc.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Google Places API Key
const API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyC3f6s1y5XuIrAjWjsfRu6-nrlVNRxbPgo';

// Cayman Islands locations for searching
const SEARCH_LOCATIONS = [
  { name: 'George Town', lat: 19.2869, lng: -81.3674 },
  { name: 'Camana Bay', lat: 19.3284, lng: -81.3794 },
  { name: 'Seven Mile Beach', lat: 19.3513, lng: -81.3862 },
];

// Financial service search queries
const FINANCIAL_QUERIES = [
  // Fund Services
  'fund administration cayman islands',
  'hedge fund services cayman',
  'investment fund cayman islands',
  'fund manager cayman',
  'asset management cayman islands',

  // Legal Services
  'law firm cayman islands',
  'corporate lawyer cayman',
  'offshore legal services cayman',
  'funds lawyer cayman islands',

  // Accounting & Audit
  'accounting firm cayman islands',
  'audit firm cayman',
  'big four accounting cayman',
  'tax advisory cayman islands',

  // Corporate Services
  'corporate services cayman islands',
  'registered office cayman',
  'company formation cayman',
  'corporate governance cayman',

  // Trust & Fiduciary
  'trust company cayman islands',
  'fiduciary services cayman',
  'trustee services cayman',

  // Banking
  'private bank cayman islands',
  'investment bank cayman',
  'wealth management cayman islands',

  // Insurance
  'captive insurance cayman',
  'insurance manager cayman islands',

  // Consulting
  'management consulting cayman islands',
  'financial advisory cayman',
];

// Rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(1000 * (i + 1));
    }
  }
}

// Text search for financial services
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

// Get place details for photo
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

// Determine category based on types and name
function categorizePlace(place) {
  const name = place.displayName?.text?.toLowerCase() || '';
  const types = place.types || [];

  // Fund Administration
  if (name.includes('fund') || name.includes('asset') || name.includes('investment')) {
    return { category: 'financial_services', subcategory: 'fund_administration' };
  }

  // Law Firms
  if (types.includes('lawyer') || name.includes('law') || name.includes('legal') ||
      name.includes('attorney') || name.includes('& co') || name.includes('llp')) {
    return { category: 'financial_services', subcategory: 'law_firm' };
  }

  // Accounting
  if (name.includes('accounting') || name.includes('audit') || name.includes('kpmg') ||
      name.includes('deloitte') || name.includes('pwc') || name.includes('ey') ||
      name.includes('ernst') || name.includes('grant thornton')) {
    return { category: 'financial_services', subcategory: 'accounting' };
  }

  // Trust & Fiduciary
  if (name.includes('trust') || name.includes('fiduciary') || name.includes('trustee')) {
    return { category: 'financial_services', subcategory: 'trust_services' };
  }

  // Banking
  if (types.includes('bank') || name.includes('bank') || name.includes('wealth')) {
    return { category: 'financial_services', subcategory: 'banking' };
  }

  // Insurance
  if (name.includes('insurance') || name.includes('captive') || name.includes('reinsurance')) {
    return { category: 'financial_services', subcategory: 'insurance' };
  }

  // Corporate Services
  if (name.includes('corporate') || name.includes('registered') || name.includes('governance')) {
    return { category: 'financial_services', subcategory: 'corporate_services' };
  }

  // Consulting
  if (name.includes('consulting') || name.includes('advisory') || name.includes('consult')) {
    return { category: 'financial_services', subcategory: 'consulting' };
  }

  // Default
  return { category: 'financial_services', subcategory: 'professional_services' };
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
  }

  return {
    id: `google-fin-${place.id}`,
    name: place.displayName?.text || 'Unknown',
    category,
    subcategory,
    description: place.editorialSummary?.text ||
      `Professional ${subcategory.replace('_', ' ')} services in the Cayman Islands.`,
    shortDescription: place.editorialSummary?.text?.slice(0, 150) ||
      `${subcategory.replace('_', ' ')} services`,
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
      priceRange: '$$$',
      priceFrom: null,
      priceTo: null,
      currency: 'USD',
      hours: {
        display: place.regularOpeningHours?.weekdayDescriptions?.join(', ') || null,
        schedule: {}
      },
      reservationRequired: true,
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
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
      images: [],
      videos: []
    },
    tags: [
      'financial',
      'professional',
      subcategory.replace('_', '-'),
      'business',
      'cayman'
    ],
    keywords: [
      subcategory.replace('_', ' '),
      'cayman islands',
      'offshore',
      'financial services'
    ],
    isActive: true,
    isPremium: true,
    isFeatured: place.rating >= 4.5,
    source: 'google-places-financial',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// Main scraping function
async function scrapeFinancialServices() {
  console.log('🏦 Starting Financial Services Scrape...\n');

  const allPlaces = new Map(); // Use Map to dedupe by place ID

  for (const query of FINANCIAL_QUERIES) {
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

        // Only include business places with good ratings
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

  console.log(`\n📊 Total unique financial services found: ${allPlaces.size}`);

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

  console.log(`✨ ${uniqueNew.length} new unique financial services to add`);

  // Merge
  const merged = [...existing, ...uniqueNew];

  // Sort by rating
  merged.sort((a, b) => (b.ratings?.overall || 0) - (a.ratings?.overall || 0));

  return merged;
}

// Main execution
async function main() {
  try {
    // Scrape financial services
    const financialServices = await scrapeFinancialServices();

    if (financialServices.length === 0) {
      console.log('No new financial services found');
      return;
    }

    // Show breakdown by subcategory
    const breakdown = {};
    financialServices.forEach(p => {
      const sub = p.subcategory || 'other';
      breakdown[sub] = (breakdown[sub] || 0) + 1;
    });
    console.log('\n📈 Breakdown by type:');
    Object.entries(breakdown).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Merge with existing
    const merged = await mergeWithExisting(financialServices);

    // Save
    const outputPath = join(rootDir, 'public', 'knowledge-base.json');
    writeFileSync(outputPath, JSON.stringify(merged, null, 2));

    console.log(`\n✅ Saved ${merged.length} total places to ${outputPath}`);

    // Show top rated new services
    console.log('\n🌟 Top rated new financial services:');
    financialServices
      .filter(p => p.ratings?.overall >= 4.5)
      .sort((a, b) => (b.ratings?.overall || 0) - (a.ratings?.overall || 0))
      .slice(0, 10)
      .forEach(p => {
        console.log(`   ⭐ ${p.ratings?.overall?.toFixed(1)} - ${p.name} (${p.subcategory})`);
      });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
