#!/usr/bin/env node
/**
 * Scrape Luxury & Aviation Services from Google Places API
 * Private jets, helicopters, luxury concierge, VIP services, limousines
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Google Places API Key
const API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyC3f6s1y5XuIrAjWjsfRu6-nrlVNRxbPgo';

// Luxury & Aviation search queries
const LUXURY_QUERIES = [
  // Private Aviation
  'private jet charter cayman islands',
  'private jet cayman',
  'charter flight grand cayman',
  'aircraft charter cayman islands',
  'private aviation cayman',
  'jet charter cayman',
  'executive jet cayman',
  'private plane cayman islands',

  // Helicopters
  'helicopter tour cayman islands',
  'helicopter charter cayman',
  'helicopter service grand cayman',
  'aerial tour cayman',

  // Airport Services
  'airport transfer cayman islands',
  'airport vip service cayman',
  'airport lounge grand cayman',
  'fbo cayman islands',
  'fixed base operator cayman',

  // Luxury Transportation
  'limousine service cayman islands',
  'limo cayman',
  'chauffeur service grand cayman',
  'luxury car service cayman',
  'executive car service cayman',
  'private driver cayman islands',
  'rolls royce rental cayman',
  'bentley rental cayman',
  'luxury car rental cayman islands',
  'exotic car rental grand cayman',

  // VIP & Concierge Services
  'vip concierge cayman islands',
  'luxury concierge cayman',
  'personal concierge grand cayman',
  'butler service cayman',
  'private chef cayman islands',
  'celebrity concierge cayman',
  'exclusive experiences cayman',

  // Luxury Yacht & Boat
  'luxury yacht charter cayman islands',
  'superyacht cayman',
  'mega yacht charter cayman',
  'private yacht cayman',
  'catamaran charter cayman islands',
  'sunset cruise cayman',
  'fishing charter cayman islands',

  // Luxury Events
  'private event planner cayman',
  'luxury wedding planner cayman islands',
  'corporate event cayman',
  'private party cayman',

  // Premium Experiences
  'private island experience cayman',
  'exclusive tour cayman islands',
  'luxury spa cayman',
  'private beach cayman',
  'exclusive dining cayman',
];

// Rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Text search
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
          radius: 50000.0
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

// Determine category and subcategory
function categorizePlace(place) {
  const name = place.displayName?.text?.toLowerCase() || '';
  const types = place.types || [];

  // Private Jets & Aviation
  if (name.includes('jet') || name.includes('aviation') || name.includes('aircraft') ||
      name.includes('charter flight') || name.includes('private plane') ||
      name.includes('executive air') || name.includes('air charter')) {
    return { category: 'private_jet', subcategory: 'private_jet_charter' };
  }

  // Helicopters
  if (name.includes('helicopter') || name.includes('heli') || name.includes('aerial')) {
    return { category: 'private_jet', subcategory: 'helicopter_service' };
  }

  // Airport Services
  if (name.includes('airport') || name.includes('fbo') || name.includes('fixed base') ||
      types.includes('airport')) {
    return { category: 'transport', subcategory: 'airport_service' };
  }

  // Limousine & Chauffeur
  if (name.includes('limo') || name.includes('chauffeur') || name.includes('executive car') ||
      name.includes('luxury car') || name.includes('private driver')) {
    return { category: 'transport', subcategory: 'limousine_service' };
  }

  // Luxury Car Rental
  if ((name.includes('rental') || name.includes('rent')) &&
      (name.includes('luxury') || name.includes('exotic') || name.includes('rolls') ||
       name.includes('bentley') || name.includes('mercedes') || name.includes('bmw'))) {
    return { category: 'transport', subcategory: 'luxury_car_rental' };
  }

  // Yacht & Boat Charters
  if (name.includes('yacht') || name.includes('superyacht') || name.includes('mega yacht') ||
      name.includes('catamaran') || name.includes('sailing')) {
    return { category: 'boat_charter', subcategory: 'luxury_yacht' };
  }

  if (name.includes('fishing') && name.includes('charter')) {
    return { category: 'boat_charter', subcategory: 'fishing_charter' };
  }

  if (name.includes('charter') || name.includes('boat') || name.includes('cruise')) {
    return { category: 'boat_charter', subcategory: 'boat_charter' };
  }

  // Concierge & VIP Services
  if (name.includes('concierge') || name.includes('vip') || name.includes('butler') ||
      name.includes('personal service')) {
    return { category: 'concierge', subcategory: 'vip_concierge' };
  }

  // Private Chef
  if (name.includes('chef') || name.includes('private dining') || name.includes('catering')) {
    return { category: 'concierge', subcategory: 'private_chef' };
  }

  // Event Planning
  if (name.includes('event') || name.includes('wedding') || name.includes('party') ||
      name.includes('planner')) {
    return { category: 'event', subcategory: 'luxury_events' };
  }

  // Spa & Wellness
  if (name.includes('spa') || name.includes('wellness') || name.includes('massage')) {
    return { category: 'spa_wellness', subcategory: 'luxury_spa' };
  }

  // Default luxury service
  return { category: 'concierge', subcategory: 'luxury_service' };
}

// Convert Google Place to our format
async function convertPlace(place) {
  const { category, subcategory } = categorizePlace(place);

  // Get photo URL
  let thumbnail = null;
  if (place.photos && place.photos.length > 0) {
    thumbnail = await getPlacePhoto(place.photos[0].name);
  }

  // Default thumbnails by category
  const defaultThumbnails = {
    'private_jet': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800',
    'transport': 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
    'boat_charter': 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800',
    'concierge': 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
    'spa_wellness': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800',
    'event': 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800'
  };

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
  } else if (address.toLowerCase().includes('airport')) {
    area = 'Airport Area';
  }

  const subcategoryLabels = {
    'private_jet_charter': 'Private Jet Charter',
    'helicopter_service': 'Helicopter Service',
    'airport_service': 'Airport Service',
    'limousine_service': 'Limousine & Chauffeur',
    'luxury_car_rental': 'Luxury Car Rental',
    'luxury_yacht': 'Luxury Yacht Charter',
    'fishing_charter': 'Fishing Charter',
    'boat_charter': 'Boat Charter',
    'vip_concierge': 'VIP Concierge',
    'private_chef': 'Private Chef',
    'luxury_events': 'Luxury Events',
    'luxury_spa': 'Luxury Spa',
    'luxury_service': 'Luxury Service'
  };

  return {
    id: `google-lux-${place.id}`,
    name: place.displayName?.text || 'Unknown',
    category,
    subcategory,
    description: place.editorialSummary?.text ||
      `Premium ${subcategoryLabels[subcategory] || 'luxury'} services in the Cayman Islands.`,
    shortDescription: place.editorialSummary?.text?.slice(0, 150) ||
      `${subcategoryLabels[subcategory] || 'Luxury'} services`,
    highlights: ['Premium Service', 'VIP Experience', 'Luxury'],
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
      bookingUrl: place.websiteUri || null,
      social: {}
    },
    business: {
      priceRange: '$$$$',
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
      thumbnail: thumbnail || defaultThumbnails[category] || defaultThumbnails.concierge,
      images: [],
      videos: []
    },
    tags: [
      'luxury',
      'vip',
      'premium',
      subcategory.replace('_', '-'),
      category.replace('_', '-'),
      'cayman'
    ],
    keywords: [
      'luxury',
      'vip',
      'premium service',
      subcategory.replace('_', ' '),
      'cayman islands'
    ],
    isActive: true,
    isPremium: true,
    isFeatured: place.rating >= 4.5,
    source: 'google-places-luxury',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// Main scraping function
async function scrapeLuxuryServices() {
  console.log('✈️ Starting Luxury & Aviation Services Scrape...\n');

  const allPlaces = new Map();

  for (const query of LUXURY_QUERIES) {
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

        // Only include operational businesses
        if (place.businessStatus !== 'OPERATIONAL') {
          continue;
        }

        // Convert and add
        const converted = await convertPlace(place);
        allPlaces.set(place.id, converted);
        console.log(`   ✅ Added: ${converted.name} (${converted.subcategory})`);

        await delay(100);
      }

      await delay(500);

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n📊 Total unique luxury services found: ${allPlaces.size}`);

  return Array.from(allPlaces.values());
}

// Load existing knowledge base and merge
async function mergeWithExisting(newPlaces) {
  const kbPath = join(rootDir, 'public', 'knowledge-base.json');

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

  console.log(`✨ ${uniqueNew.length} new unique luxury services to add`);

  const merged = [...existing, ...uniqueNew];
  merged.sort((a, b) => (b.ratings?.overall || 0) - (a.ratings?.overall || 0));

  return merged;
}

// Main execution
async function main() {
  try {
    const luxuryServices = await scrapeLuxuryServices();

    if (luxuryServices.length === 0) {
      console.log('No new luxury services found');
      return;
    }

    // Show breakdown
    const breakdown = {};
    luxuryServices.forEach(p => {
      const sub = p.subcategory || 'other';
      breakdown[sub] = (breakdown[sub] || 0) + 1;
    });
    console.log('\n📈 Breakdown by type:');
    Object.entries(breakdown).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Merge with existing
    const merged = await mergeWithExisting(luxuryServices);

    // Save
    const outputPath = join(rootDir, 'public', 'knowledge-base.json');
    writeFileSync(outputPath, JSON.stringify(merged, null, 2));

    console.log(`\n✅ Saved ${merged.length} total places to ${outputPath}`);

    // Show top rated
    console.log('\n🌟 Top rated new luxury services:');
    luxuryServices
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
