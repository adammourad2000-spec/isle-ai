#!/usr/bin/env npx ts-node --esm

/**
 * OpenStreetMap Scraper for Cayman Islands
 *
 * Uses the free Overpass API to fetch places data.
 * No API key required - completely free!
 *
 * Usage:
 *   npm run scrape:osm           # Full scrape
 *   npm run scrape:osm:dry-run   # Preview without fetching
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPES
// ============================================

interface OSMNode {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OSMNode[];
}

interface ScrapedPlace {
  osmId: string;
  name: string;
  category: string;
  subcategory: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  island: string;
}

interface KnowledgeNode {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  location: {
    island: string;
    area: string;
    address: string;
    coordinates: { lat: number; lng: number };
    googlePlaceId?: string;
    osmId?: string;
  };
  business: {
    priceRange: string;
    hours: string;
    phone: string;
    website: string;
    email: string;
  };
  ratings: {
    overall: number;
    reviewCount: number;
    source: string;
  };
  media: {
    thumbnail: string;
    images: string[];
  };
  features: string[];
  tags: string[];
  lastUpdated: string;
  source: string;
}

// ============================================
// CONFIGURATION
// ============================================

// Cayman Islands bounding box
const CAYMAN_BBOX = {
  south: 19.25,
  west: -81.45,
  north: 19.80,
  east: -79.70,
};

// Island boundaries for classification
const ISLAND_BOUNDS = {
  'Grand Cayman': { south: 19.25, north: 19.40, west: -81.45, east: -81.05 },
  'Cayman Brac': { south: 19.68, north: 19.76, west: -79.90, east: -79.70 },
  'Little Cayman': { south: 19.65, north: 19.72, west: -80.10, east: -79.95 },
};

// Area classification within Grand Cayman
const GRAND_CAYMAN_AREAS: Array<{ name: string; lat: number; lon: number; radius: number }> = [
  { name: 'George Town', lat: 19.295, lon: -81.381, radius: 3 },
  { name: 'Seven Mile Beach', lat: 19.345, lon: -81.385, radius: 2 },
  { name: 'West Bay', lat: 19.375, lon: -81.405, radius: 3 },
  { name: 'Bodden Town', lat: 19.28, lon: -81.25, radius: 4 },
  { name: 'East End', lat: 19.30, lon: -81.10, radius: 5 },
  { name: 'North Side', lat: 19.35, lon: -81.15, radius: 4 },
  { name: 'Rum Point', lat: 19.36, lon: -81.25, radius: 3 },
];

// Categories to scrape with their OSM tags
const CATEGORIES = [
  // Accommodation
  {
    name: 'Hotels & Resorts',
    category: 'hotel',
    subcategory: 'resort',
    osmTags: ['tourism=hotel', 'tourism=resort', 'tourism=motel'],
  },
  {
    name: 'Vacation Rentals',
    category: 'villa_rental',
    subcategory: 'vacation_rental',
    osmTags: ['tourism=apartment', 'tourism=guest_house', 'building=apartments'],
  },
  {
    name: 'Hostels & B&Bs',
    category: 'hotel',
    subcategory: 'hostel',
    osmTags: ['tourism=hostel', 'tourism=bed_and_breakfast'],
  },

  // Food & Drink
  {
    name: 'Restaurants',
    category: 'restaurant',
    subcategory: 'restaurant',
    osmTags: ['amenity=restaurant'],
  },
  {
    name: 'Cafes & Coffee',
    category: 'restaurant',
    subcategory: 'cafe',
    osmTags: ['amenity=cafe', 'amenity=ice_cream'],
  },
  {
    name: 'Fast Food',
    category: 'restaurant',
    subcategory: 'fast_food',
    osmTags: ['amenity=fast_food'],
  },
  {
    name: 'Bars & Nightlife',
    category: 'bar',
    subcategory: 'bar',
    osmTags: ['amenity=bar', 'amenity=pub', 'amenity=nightclub'],
  },

  // Activities & Attractions
  {
    name: 'Beaches',
    category: 'beach',
    subcategory: 'beach',
    osmTags: ['natural=beach', 'leisure=beach_resort'],
  },
  {
    name: 'Tourist Attractions',
    category: 'attraction',
    subcategory: 'attraction',
    osmTags: ['tourism=attraction', 'tourism=viewpoint', 'historic=monument'],
  },
  {
    name: 'Museums & Galleries',
    category: 'attraction',
    subcategory: 'museum',
    osmTags: ['tourism=museum', 'tourism=gallery', 'amenity=arts_centre'],
  },
  {
    name: 'Diving & Water Sports',
    category: 'diving_snorkeling',
    subcategory: 'diving',
    osmTags: ['sport=scuba_diving', 'sport=diving', 'leisure=diving'],
  },
  {
    name: 'Marinas & Boat Services',
    category: 'boat_charter',
    subcategory: 'marina',
    osmTags: ['leisure=marina', 'waterway=boatyard', 'amenity=boat_rental'],
  },
  {
    name: 'Golf Courses',
    category: 'golf',
    subcategory: 'golf_course',
    osmTags: ['leisure=golf_course', 'sport=golf'],
  },
  {
    name: 'Parks & Nature',
    category: 'activity',
    subcategory: 'nature',
    osmTags: ['leisure=park', 'leisure=nature_reserve', 'boundary=national_park'],
  },

  // Health & Medical
  {
    name: 'Hospitals',
    category: 'medical',
    subcategory: 'hospital',
    osmTags: ['amenity=hospital'],
  },
  {
    name: 'Clinics & Doctors',
    category: 'medical',
    subcategory: 'clinic',
    osmTags: ['amenity=clinic', 'amenity=doctors', 'healthcare=clinic'],
  },
  {
    name: 'Pharmacies',
    category: 'medical',
    subcategory: 'pharmacy',
    osmTags: ['amenity=pharmacy'],
  },
  {
    name: 'Dentists',
    category: 'medical',
    subcategory: 'dentist',
    osmTags: ['amenity=dentist', 'healthcare=dentist'],
  },

  // Financial Services
  {
    name: 'Banks',
    category: 'financial',
    subcategory: 'bank',
    osmTags: ['amenity=bank'],
  },
  {
    name: 'ATMs',
    category: 'financial',
    subcategory: 'atm',
    osmTags: ['amenity=atm'],
  },
  {
    name: 'Money Exchange',
    category: 'financial',
    subcategory: 'exchange',
    osmTags: ['amenity=bureau_de_change'],
  },

  // Transport
  {
    name: 'Car Rentals',
    category: 'transport',
    subcategory: 'car_rental',
    osmTags: ['amenity=car_rental'],
  },
  {
    name: 'Gas Stations',
    category: 'transport',
    subcategory: 'fuel',
    osmTags: ['amenity=fuel'],
  },
  {
    name: 'Parking',
    category: 'transport',
    subcategory: 'parking',
    osmTags: ['amenity=parking'],
  },
  {
    name: 'Bus Stops',
    category: 'transport',
    subcategory: 'bus',
    osmTags: ['highway=bus_stop', 'amenity=bus_station'],
  },
  {
    name: 'Taxi Stands',
    category: 'transport',
    subcategory: 'taxi',
    osmTags: ['amenity=taxi'],
  },

  // Shopping
  {
    name: 'Supermarkets',
    category: 'shopping',
    subcategory: 'supermarket',
    osmTags: ['shop=supermarket', 'shop=grocery'],
  },
  {
    name: 'Convenience Stores',
    category: 'shopping',
    subcategory: 'convenience',
    osmTags: ['shop=convenience'],
  },
  {
    name: 'Shopping Centers',
    category: 'shopping',
    subcategory: 'mall',
    osmTags: ['shop=mall', 'shop=department_store'],
  },
  {
    name: 'Jewelry & Duty Free',
    category: 'shopping',
    subcategory: 'jewelry',
    osmTags: ['shop=jewelry', 'shop=duty_free'],
  },
  {
    name: 'Gift Shops',
    category: 'shopping',
    subcategory: 'gift',
    osmTags: ['shop=gift', 'shop=souvenir'],
  },

  // Services
  {
    name: 'Post Offices',
    category: 'services',
    subcategory: 'post_office',
    osmTags: ['amenity=post_office'],
  },
  {
    name: 'Police Stations',
    category: 'services',
    subcategory: 'police',
    osmTags: ['amenity=police'],
  },
  {
    name: 'Government Offices',
    category: 'services',
    subcategory: 'government',
    osmTags: ['amenity=townhall', 'office=government'],
  },
  {
    name: 'Embassies & Consulates',
    category: 'services',
    subcategory: 'embassy',
    osmTags: ['amenity=embassy', 'office=diplomatic'],
  },

  // Wellness
  {
    name: 'Spas',
    category: 'wellness',
    subcategory: 'spa',
    osmTags: ['leisure=spa', 'amenity=spa', 'shop=beauty'],
  },
  {
    name: 'Gyms & Fitness',
    category: 'wellness',
    subcategory: 'gym',
    osmTags: ['leisure=fitness_centre', 'amenity=gym', 'leisure=sports_centre'],
  },

  // Religious
  {
    name: 'Churches',
    category: 'religious',
    subcategory: 'church',
    osmTags: ['amenity=place_of_worship'],
  },

  // Education
  {
    name: 'Schools',
    category: 'education',
    subcategory: 'school',
    osmTags: ['amenity=school', 'amenity=college', 'amenity=university'],
  },
  {
    name: 'Libraries',
    category: 'education',
    subcategory: 'library',
    osmTags: ['amenity=library'],
  },
];

// Overpass API endpoints (multiple for fallback)
const OVERPASS_APIS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

// Rate limiting: Be conservative to avoid rate limits
const REQUEST_DELAY_MS = 3000; // 3 seconds between requests
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds before retry

// ============================================
// HELPER FUNCTIONS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function determineIsland(lat: number, lon: number): string {
  for (const [island, bounds] of Object.entries(ISLAND_BOUNDS)) {
    if (lat >= bounds.south && lat <= bounds.north && lon >= bounds.west && lon <= bounds.east) {
      return island;
    }
  }
  return 'Grand Cayman'; // Default
}

function determineArea(lat: number, lon: number, island: string): string {
  if (island !== 'Grand Cayman') {
    return island;
  }

  // Find closest area in Grand Cayman
  let closestArea = 'Grand Cayman';
  let minDistance = Infinity;

  for (const area of GRAND_CAYMAN_AREAS) {
    const distance = Math.sqrt(Math.pow(lat - area.lat, 2) + Math.pow(lon - area.lon, 2));
    if (distance < minDistance && distance < area.radius * 0.01) {
      minDistance = distance;
      closestArea = area.name;
    }
  }

  return closestArea;
}

function buildOverpassQuery(osmTags: string[]): string {
  const bbox = `${CAYMAN_BBOX.south},${CAYMAN_BBOX.west},${CAYMAN_BBOX.north},${CAYMAN_BBOX.east}`;

  const tagQueries = osmTags.map(tag => {
    const [key, value] = tag.split('=');
    return `
      node["${key}"="${value}"](${bbox});
      way["${key}"="${value}"](${bbox});
      relation["${key}"="${value}"](${bbox});
    `;
  }).join('');

  return `
    [out:json][timeout:60];
    (
      ${tagQueries}
    );
    out center tags;
  `;
}

async function queryOverpass(query: string, retryCount = 0): Promise<OverpassResponse> {
  const apiIndex = retryCount % OVERPASS_APIS.length;
  const apiUrl = OVERPASS_APIS[apiIndex];

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'IsleAI-Scraper/1.0 (tourism data collection)',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (response.status === 429 || response.status === 504 || response.status === 503) {
      // Rate limited or timeout - retry with different endpoint
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * (retryCount + 1);
        console.log(`    Rate limited, waiting ${delay / 1000}s and retrying (attempt ${retryCount + 2}/${MAX_RETRIES + 1})...`);
        await sleep(delay);
        return queryOverpass(query, retryCount + 1);
      }
      throw new Error(`Max retries exceeded: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (retryCount < MAX_RETRIES && error instanceof Error &&
        (error.message.includes('fetch') || error.message.includes('network'))) {
      const delay = RETRY_DELAY_MS * (retryCount + 1);
      console.log(`    Network error, waiting ${delay / 1000}s and retrying...`);
      await sleep(delay);
      return queryOverpass(query, retryCount + 1);
    }
    throw error;
  }
}

function extractAddress(tags: Record<string, string>): string {
  const parts: string[] = [];

  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:postcode']) parts.push(tags['addr:postcode']);

  return parts.join(', ') || '';
}

function generateDescription(place: ScrapedPlace): string {
  const parts: string[] = [];

  // Base description from tags
  if (place.tags.description) {
    return place.tags.description;
  }

  // Generate from available data
  parts.push(`${place.name} is a ${place.subcategory.replace(/_/g, ' ')} located in ${place.island}.`);

  if (place.tags.cuisine) {
    parts.push(`Cuisine: ${place.tags.cuisine}.`);
  }

  if (place.tags.stars) {
    parts.push(`${place.tags.stars}-star rating.`);
  }

  if (place.openingHours) {
    parts.push(`Hours: ${place.openingHours}.`);
  }

  return parts.join(' ');
}

function extractFeatures(tags: Record<string, string>): string[] {
  const features: string[] = [];

  // Common features from OSM tags
  if (tags.wheelchair === 'yes') features.push('Wheelchair accessible');
  if (tags.internet_access === 'wlan' || tags.wifi === 'yes') features.push('Free WiFi');
  if (tags.air_conditioning === 'yes') features.push('Air conditioning');
  if (tags.outdoor_seating === 'yes') features.push('Outdoor seating');
  if (tags.takeaway === 'yes') features.push('Takeaway available');
  if (tags.delivery === 'yes') features.push('Delivery available');
  if (tags.drive_through === 'yes') features.push('Drive-through');
  if (tags.swimming_pool === 'yes') features.push('Swimming pool');
  if (tags.parking) features.push('Parking available');
  if (tags.cuisine) features.push(tags.cuisine.split(';').map(c => c.trim()).join(', '));
  if (tags.payment_credit_cards === 'yes') features.push('Credit cards accepted');
  if (tags.reservation === 'yes' || tags.reservation === 'recommended') features.push('Reservations accepted');

  return features;
}

function extractTags(place: ScrapedPlace): string[] {
  const tags: string[] = [place.category, place.subcategory, place.island.toLowerCase().replace(' ', '-')];

  if (place.tags.cuisine) {
    tags.push(...place.tags.cuisine.split(';').map(c => c.trim().toLowerCase()));
  }

  if (place.tags.brand) {
    tags.push(place.tags.brand.toLowerCase());
  }

  return [...new Set(tags)];
}

function generateThumbnail(place: ScrapedPlace): string {
  // Use placeholder images based on category
  const placeholders: Record<string, string> = {
    hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
    restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
    cafe: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
    bar: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&h=300&fit=crop',
    beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
    attraction: 'https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?w=400&h=300&fit=crop',
    diving_snorkeling: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop',
    medical: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',
    financial: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=400&h=300&fit=crop',
    transport: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=300&fit=crop',
    shopping: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
    services: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
    wellness: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop',
    golf: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=300&fit=crop',
    activity: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=400&h=300&fit=crop',
  };

  return placeholders[place.category] || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop';
}

function toKnowledgeNode(place: ScrapedPlace): KnowledgeNode {
  const area = determineArea(place.lat, place.lon, place.island);

  return {
    id: `osm-${place.osmId}`,
    name: place.name,
    category: place.category,
    subcategory: place.subcategory,
    description: generateDescription(place),
    location: {
      island: place.island,
      area: area,
      address: place.address || `${area}, ${place.island}, Cayman Islands`,
      coordinates: { lat: place.lat, lng: place.lon },
      osmId: place.osmId,
    },
    business: {
      priceRange: place.tags.price_range || '$$',
      hours: place.openingHours || 'Contact for hours',
      phone: place.phone || '',
      website: place.website || '',
      email: place.tags.email || '',
    },
    ratings: {
      overall: 4.0, // Default rating since OSM doesn't have ratings
      reviewCount: 0,
      source: 'OpenStreetMap',
    },
    media: {
      thumbnail: generateThumbnail(place),
      images: [],
    },
    features: extractFeatures(place.tags),
    tags: extractTags(place),
    lastUpdated: new Date().toISOString(),
    source: 'openstreetmap-scraper',
  };
}

// ============================================
// MAIN SCRAPER
// ============================================

async function scrapeCategory(
  categoryConfig: typeof CATEGORIES[0],
  dryRun: boolean
): Promise<ScrapedPlace[]> {
  console.log(`\n  Scraping: ${categoryConfig.name}...`);

  if (dryRun) {
    console.log(`    Tags: ${categoryConfig.osmTags.join(', ')}`);
    return [];
  }

  const query = buildOverpassQuery(categoryConfig.osmTags);

  try {
    const response = await queryOverpass(query);
    const places: ScrapedPlace[] = [];

    for (const element of response.elements) {
      // Skip elements without names
      if (!element.tags?.name) continue;

      // Get coordinates
      const lat = element.lat || element.center?.lat;
      const lon = element.lon || element.center?.lon;

      if (!lat || !lon) continue;

      const island = determineIsland(lat, lon);

      places.push({
        osmId: `${element.type}/${element.id}`,
        name: element.tags.name,
        category: categoryConfig.category,
        subcategory: categoryConfig.subcategory,
        lat,
        lon,
        tags: element.tags,
        address: extractAddress(element.tags),
        phone: element.tags.phone || element.tags['contact:phone'],
        website: element.tags.website || element.tags['contact:website'],
        openingHours: element.tags.opening_hours,
        island,
      });
    }

    console.log(`    Found: ${places.length} places`);
    return places;

  } catch (error) {
    console.error(`    Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  const resume = args.includes('--resume');

  // Progress file for resume capability
  const progressDir = path.join(process.cwd(), 'data', 'osm-scraped');
  const progressFile = path.join(progressDir, 'progress.json');

  console.log('====================================');
  console.log('OPENSTREETMAP SCRAPER - CAYMAN ISLANDS');
  console.log('====================================');
  console.log('');
  console.log('100% FREE - No API key required!');
  console.log('');

  if (dryRun) {
    console.log('MODE: Dry Run (no API calls)');
    console.log('');
  }

  console.log(`Categories to scrape: ${CATEGORIES.length}`);
  console.log(`Bounding box: ${CAYMAN_BBOX.south},${CAYMAN_BBOX.west} to ${CAYMAN_BBOX.north},${CAYMAN_BBOX.east}`);
  console.log(`Delay between requests: ${REQUEST_DELAY_MS / 1000}s`);
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(progressDir)) {
    fs.mkdirSync(progressDir, { recursive: true });
  }

  // Load progress if resuming
  let allPlaces: ScrapedPlace[] = [];
  let completedCategories: string[] = [];
  const stats: Record<string, number> = {};

  if (resume && fs.existsSync(progressFile)) {
    try {
      const progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
      allPlaces = progress.places || [];
      completedCategories = progress.completedCategories || [];
      Object.assign(stats, progress.stats || {});
      console.log(`Resuming from previous run: ${allPlaces.length} places, ${completedCategories.length} categories completed`);
      console.log('');
    } catch (e) {
      console.log('Could not load progress file, starting fresh');
    }
  }

  let categoryIndex = 0;
  for (const category of CATEGORIES) {
    categoryIndex++;

    // Skip already completed categories when resuming
    if (completedCategories.includes(category.name)) {
      console.log(`  [${categoryIndex}/${CATEGORIES.length}] Skipping ${category.name} (already completed)`);
      continue;
    }

    console.log(`  [${categoryIndex}/${CATEGORIES.length}] ${category.name}`);
    const places = await scrapeCategory(category, dryRun);
    allPlaces.push(...places);
    stats[category.name] = places.length;
    completedCategories.push(category.name);

    if (!dryRun) {
      // Save progress after each category
      const progress = {
        places: allPlaces,
        completedCategories,
        stats,
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));

      // Rate limiting
      await sleep(REQUEST_DELAY_MS);
    }
  }

  if (dryRun) {
    console.log('\n====================================');
    console.log('DRY RUN COMPLETE');
    console.log('====================================');
    console.log('\nCategories that will be scraped:');
    for (const cat of CATEGORIES) {
      console.log(`  - ${cat.name} (${cat.osmTags.length} tag queries)`);
    }
    console.log('\nRun without --dry-run to fetch actual data.');
    return;
  }

  // Remove duplicates by OSM ID
  const uniquePlaces = Array.from(
    new Map(allPlaces.map(p => [p.osmId, p])).values()
  );

  console.log('\n====================================');
  console.log('SCRAPING COMPLETE');
  console.log('====================================');
  console.log(`\nTotal unique places found: ${uniquePlaces.length}`);
  console.log('\nBy category:');
  for (const [cat, count] of Object.entries(stats)) {
    if (count > 0) {
      console.log(`  ${cat}: ${count}`);
    }
  }

  // By island
  const byIsland = uniquePlaces.reduce((acc, p) => {
    acc[p.island] = (acc[p.island] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\nBy island:');
  for (const [island, count] of Object.entries(byIsland)) {
    console.log(`  ${island}: ${count}`);
  }

  // Create output directory
  const outputDir = path.join(process.cwd(), 'data', 'osm-scraped');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save raw data
  const rawOutputPath = path.join(outputDir, 'osm-places-raw.json');
  fs.writeFileSync(rawOutputPath, JSON.stringify(uniquePlaces, null, 2));
  console.log(`\nRaw data saved to: ${rawOutputPath}`);

  // Convert to KnowledgeNodes
  const knowledgeNodes = uniquePlaces.map(toKnowledgeNode);

  // Save as JSON
  const jsonOutputPath = path.join(outputDir, 'osm-knowledge.json');
  fs.writeFileSync(jsonOutputPath, JSON.stringify(knowledgeNodes, null, 2));
  console.log(`Knowledge JSON saved to: ${jsonOutputPath}`);

  // Save as TypeScript
  const tsContent = `/**
 * OpenStreetMap Knowledge Base
 *
 * Auto-generated by openstreetmap-scraper.ts
 * Generated: ${new Date().toISOString()}
 * Total places: ${knowledgeNodes.length}
 *
 * Source: OpenStreetMap (https://www.openstreetmap.org/)
 * License: ODbL (https://opendatacommons.org/licenses/odbl/)
 */

import type { KnowledgeNode } from '../../types/knowledge';

export const OSM_KNOWLEDGE: KnowledgeNode[] = ${JSON.stringify(knowledgeNodes, null, 2)};

export default OSM_KNOWLEDGE;
`;

  const tsOutputPath = path.join(outputDir, 'osm-knowledge.ts');
  fs.writeFileSync(tsOutputPath, tsContent);
  console.log(`Knowledge TypeScript saved to: ${tsOutputPath}`);

  // Save stats
  const statsOutput = {
    scrapedAt: new Date().toISOString(),
    totalPlaces: uniquePlaces.length,
    byCategory: stats,
    byIsland,
  };
  const statsPath = path.join(outputDir, 'scrape-stats.json');
  fs.writeFileSync(statsPath, JSON.stringify(statsOutput, null, 2));
  console.log(`Stats saved to: ${statsPath}`);

  console.log('\n====================================');
  console.log('DONE!');
  console.log('====================================');
  console.log('\nNext steps:');
  console.log('1. Review the scraped data in data/osm-scraped/');
  console.log('2. Run: npm run merge:osm to merge with existing knowledge base');
  console.log('3. The data is ready to use in your app!');
}

main().catch(console.error);
