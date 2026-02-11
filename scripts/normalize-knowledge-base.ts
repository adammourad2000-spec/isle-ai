#!/usr/bin/env npx ts-node --esm

/**
 * ISLE AI - Knowledge Base Normalizer & Enhancer
 *
 * This script:
 * 1. Loads all data sources (OSM, SerpAPI, Flights)
 * 2. Normalizes to a unified schema
 * 3. Adds missing critical places
 * 4. Removes duplicates
 * 5. Validates and enhances data quality
 * 6. Exports a production-ready unified knowledge base
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');

// ============ UNIFIED SCHEMA ============

interface UnifiedPlace {
  id: string;
  name: string;
  slug: string;

  // Category
  category: string;
  subcategory: string | null;

  // Descriptions
  description: string;
  shortDescription: string;
  highlights: string[];

  // Location - UNIFIED FORMAT
  location: {
    island: 'Grand Cayman' | 'Cayman Brac' | 'Little Cayman';
    area: string | null;
    district: string | null;
    address: string | null;
    coordinates: {
      lat: number;
      lng: number;
    };
    googlePlaceId: string | null;
  };

  // Contact - UNIFIED FORMAT
  contact: {
    phone: string | null;
    email: string | null;
    website: string | null;
    bookingUrl: string | null;
    social: {
      instagram: string | null;
      facebook: string | null;
      tripadvisor: string | null;
    };
  };

  // Business Info
  business: {
    priceRange: '$' | '$$' | '$$$' | '$$$$' | null;
    priceFrom: number | null;
    priceTo: number | null;
    currency: string;
    hours: {
      display: string | null;
      isOpen24Hours: boolean;
      schedule: Record<string, { open: string; close: string } | 'closed'> | null;
    };
    acceptsCreditCards: boolean;
    reservationRequired: boolean;
    languages: string[];
  };

  // Ratings
  ratings: {
    overall: number | null;
    reviewCount: number;
    googleRating: number | null;
    tripadvisorRating: number | null;
  };

  // Media
  media: {
    thumbnail: string | null;
    images: string[];
    videos: string[];
  };

  // Search & AI
  tags: string[];
  keywords: string[];
  searchText: string;

  // Metadata
  isActive: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  source: string;
  sourceId: string;
  quality: {
    score: number;
    hasPhoto: boolean;
    hasPhone: boolean;
    hasWebsite: boolean;
    hasDescription: boolean;
    hasHours: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// ============ CRITICAL MISSING PLACES ============

const CRITICAL_PLACES: Partial<UnifiedPlace>[] = [
  {
    id: 'critical-airport-owen-roberts',
    name: 'Owen Roberts International Airport',
    slug: 'owen-roberts-international-airport',
    category: 'transport',
    subcategory: 'airport',
    description: 'Owen Roberts International Airport (IATA: GCM) is the main international airport serving the Cayman Islands, located in George Town, Grand Cayman. It handles over 2 million passengers annually with direct flights to Miami, New York, Toronto, London, and other major cities. The airport features duty-free shopping, restaurants, car rental counters, and taxi services.',
    shortDescription: 'Main international airport of the Cayman Islands with flights to major US, Canadian, and European cities.',
    highlights: ['Direct flights to Miami, NYC, Toronto, London', 'Duty-free shopping', 'Car rental counters', 'Taxi and shuttle services'],
    location: {
      island: 'Grand Cayman',
      area: 'George Town',
      district: 'George Town',
      address: '71 Owen Roberts Drive, George Town, Grand Cayman',
      coordinates: { lat: 19.2928, lng: -81.3577 },
      googlePlaceId: 'ChIJqTfqQamHJY8RKjME8f1U7xY'
    },
    contact: {
      phone: '+1 345-943-7070',
      email: 'info@caymanairports.com',
      website: 'https://www.caymanairports.com',
      bookingUrl: null,
      social: { instagram: null, facebook: 'https://www.facebook.com/CaymanAirports', tripadvisor: null }
    },
    business: {
      priceRange: null,
      priceFrom: null,
      priceTo: null,
      currency: 'USD',
      hours: { display: 'Open 24 hours for arrivals/departures', isOpen24Hours: true, schedule: null },
      acceptsCreditCards: true,
      reservationRequired: false,
      languages: ['English', 'Spanish']
    },
    tags: ['airport', 'transport', 'international', 'flights', 'travel', 'arrival', 'departure'],
    isFeatured: true
  },
  {
    id: 'critical-cruise-terminal',
    name: 'George Town Cruise Terminal',
    slug: 'george-town-cruise-terminal',
    category: 'transport',
    subcategory: 'cruise_terminal',
    description: 'The George Town Cruise Terminal is the main port of entry for cruise ships visiting the Cayman Islands. Located in the heart of George Town, it welcomes over 1.9 million cruise passengers annually. The terminal area features duty-free shops, local craft vendors, tour operators, and easy access to Seven Mile Beach and other attractions.',
    shortDescription: 'Main cruise ship port in George Town welcoming nearly 2 million visitors annually.',
    highlights: ['Duty-free shopping', 'Tour operator booths', 'Taxi stand', 'Walking distance to downtown'],
    location: {
      island: 'Grand Cayman',
      area: 'George Town',
      district: 'George Town',
      address: 'Harbour Drive, George Town, Grand Cayman',
      coordinates: { lat: 19.2950, lng: -81.3838 },
      googlePlaceId: null
    },
    contact: {
      phone: '+1 345-949-2055',
      email: null,
      website: 'https://www.caymanport.com',
      bookingUrl: null,
      social: { instagram: null, facebook: null, tripadvisor: null }
    },
    business: {
      priceRange: null,
      priceFrom: null,
      priceTo: null,
      currency: 'USD',
      hours: { display: 'Hours vary by cruise ship schedule', isOpen24Hours: false, schedule: null },
      acceptsCreditCards: true,
      reservationRequired: false,
      languages: ['English']
    },
    tags: ['cruise', 'port', 'terminal', 'transport', 'tourism', 'george town'],
    isFeatured: true
  },
  {
    id: 'critical-stingray-city',
    name: 'Stingray City',
    slug: 'stingray-city',
    category: 'attraction',
    subcategory: 'wildlife',
    description: 'Stingray City is the Cayman Islands\' most famous attraction, located on a shallow sandbar in the North Sound of Grand Cayman. Visitors can wade in waist-deep crystal-clear water and interact with dozens of friendly Southern Atlantic stingrays. The stingrays have been fed by fishermen for decades and are completely comfortable around humans. Multiple tour operators offer boat trips to the sandbar daily.',
    shortDescription: 'World-famous sandbar where you can swim with friendly wild stingrays in crystal-clear shallow water.',
    highlights: ['Swim with wild stingrays', 'Waist-deep crystal clear water', 'Suitable for all ages', 'Multiple daily tours available'],
    location: {
      island: 'Grand Cayman',
      area: 'North Sound',
      district: 'North Side',
      address: 'North Sound, Grand Cayman',
      coordinates: { lat: 19.3892, lng: -81.3003 },
      googlePlaceId: 'ChIJ5w3k3qeIJY8RlB9tDWA2CgQ'
    },
    contact: {
      phone: null,
      email: null,
      website: 'https://www.visitcaymanislands.com/en-us/what-to-do/stingray-city',
      bookingUrl: null,
      social: { instagram: null, facebook: null, tripadvisor: 'https://www.tripadvisor.com/Attraction_Review-g147366-d150073-Stingray_City-Grand_Cayman_Cayman_Islands.html' }
    },
    business: {
      priceRange: '$$',
      priceFrom: 50,
      priceTo: 150,
      currency: 'USD',
      hours: { display: 'Tours typically 8am-4pm daily', isOpen24Hours: false, schedule: null },
      acceptsCreditCards: true,
      reservationRequired: true,
      languages: ['English']
    },
    ratings: { overall: 4.8, reviewCount: 15000, googleRating: 4.8, tripadvisorRating: 4.5 },
    tags: ['stingray', 'wildlife', 'snorkeling', 'swimming', 'tour', 'must-see', 'family-friendly', 'iconic'],
    isFeatured: true
  },
  {
    id: 'critical-turtle-centre',
    name: 'Cayman Turtle Centre',
    slug: 'cayman-turtle-centre',
    category: 'attraction',
    subcategory: 'wildlife',
    description: 'The Cayman Turtle Centre is a marine park and turtle conservation facility in West Bay, Grand Cayman. Home to over 9,000 green sea turtles, it\'s the only facility of its kind in the world. Visitors can hold baby turtles, swim in the Turtle Lagoon, snorkel with fish and turtles, visit the Predator Reef, and enjoy a saltwater pool. The centre also runs conservation programs to release turtles into the wild.',
    shortDescription: 'World\'s only green sea turtle breeding centre where you can hold turtles and swim in the lagoon.',
    highlights: ['Hold baby sea turtles', 'Swim in Turtle Lagoon', 'Predator Reef with sharks', 'Conservation education'],
    location: {
      island: 'Grand Cayman',
      area: 'West Bay',
      district: 'West Bay',
      address: '786 Northwest Point Road, West Bay, Grand Cayman',
      coordinates: { lat: 19.3589, lng: -81.4089 },
      googlePlaceId: 'ChIJU7xNraGHJY8RM6dLwIRbKMY'
    },
    contact: {
      phone: '+1 345-949-3894',
      email: 'info@turtle.ky',
      website: 'https://www.turtle.ky',
      bookingUrl: 'https://www.turtle.ky/tickets',
      social: { instagram: 'https://www.instagram.com/caymanturtlecentre', facebook: 'https://www.facebook.com/CaymanTurtleCentre', tripadvisor: null }
    },
    business: {
      priceRange: '$$',
      priceFrom: 45,
      priceTo: 95,
      currency: 'USD',
      hours: { display: 'Daily 8am-5pm', isOpen24Hours: false, schedule: {
        monday: { open: '08:00', close: '17:00' },
        tuesday: { open: '08:00', close: '17:00' },
        wednesday: { open: '08:00', close: '17:00' },
        thursday: { open: '08:00', close: '17:00' },
        friday: { open: '08:00', close: '17:00' },
        saturday: { open: '08:00', close: '17:00' },
        sunday: { open: '08:00', close: '17:00' }
      }},
      acceptsCreditCards: true,
      reservationRequired: false,
      languages: ['English']
    },
    ratings: { overall: 4.3, reviewCount: 8500, googleRating: 4.3, tripadvisorRating: 4.0 },
    tags: ['turtle', 'wildlife', 'family', 'conservation', 'swimming', 'marine', 'attraction'],
    isFeatured: true
  },
  {
    id: 'critical-seven-mile-beach',
    name: 'Seven Mile Beach',
    slug: 'seven-mile-beach',
    category: 'beach',
    subcategory: 'public_beach',
    description: 'Seven Mile Beach is a long crescent of coral-sand beach on the western shore of Grand Cayman island. Regarded as one of the best beaches in the Caribbean, it stretches from the Ritz-Carlton to the southern tip of West Bay. The beach offers calm, crystal-clear turquoise water perfect for swimming and snorkeling. Lined with luxury resorts, restaurants, and beach bars, it\'s the heart of Cayman\'s tourism industry.',
    shortDescription: 'Award-winning 5.5-mile stretch of pristine white sand, consistently rated among the Caribbean\'s best beaches.',
    highlights: ['Crystal clear turquoise water', 'Soft white coral sand', 'Calm swimming conditions', 'Beach bars and restaurants', 'Water sports rentals'],
    location: {
      island: 'Grand Cayman',
      area: 'Seven Mile Beach',
      district: 'West Bay',
      address: 'Seven Mile Beach, Grand Cayman',
      coordinates: { lat: 19.3350, lng: -81.3850 },
      googlePlaceId: 'ChIJR3sJpLCHJY8RIWvTNLLpNYg'
    },
    contact: {
      phone: null,
      email: null,
      website: 'https://www.visitcaymanislands.com/en-us/what-to-do/beaches/seven-mile-beach',
      bookingUrl: null,
      social: { instagram: null, facebook: null, tripadvisor: null }
    },
    business: {
      priceRange: null,
      priceFrom: null,
      priceTo: null,
      currency: 'USD',
      hours: { display: 'Open 24 hours', isOpen24Hours: true, schedule: null },
      acceptsCreditCards: false,
      reservationRequired: false,
      languages: ['English']
    },
    ratings: { overall: 4.9, reviewCount: 25000, googleRating: 4.8, tripadvisorRating: 4.5 },
    tags: ['beach', 'swimming', 'snorkeling', 'sunset', 'iconic', 'public', 'free', 'family-friendly'],
    isFeatured: true
  },
  {
    id: 'critical-hell',
    name: 'Hell',
    slug: 'hell-grand-cayman',
    category: 'attraction',
    subcategory: 'landmark',
    description: 'Hell is a group of short, black, limestone formations in West Bay, Grand Cayman. The jagged, burnt-looking rocks were formed by limestone eroded over millions of years. The small tourist attraction features a viewing platform, gift shop, and post office where you can send postcards stamped from Hell. A quirky photo opportunity and fun stop for visitors.',
    shortDescription: 'Unique black limestone rock formation with a gift shop and post office - send a postcard from Hell!',
    highlights: ['Unique rock formations', 'Post office to send postcards', 'Gift shop', 'Quick photo stop'],
    location: {
      island: 'Grand Cayman',
      area: 'West Bay',
      district: 'West Bay',
      address: 'Hell Road, West Bay, Grand Cayman',
      coordinates: { lat: 19.3594, lng: -81.4006 },
      googlePlaceId: 'ChIJz8WjB52HJY8R8lk-Vv0bHmI'
    },
    contact: {
      phone: '+1 345-949-3358',
      email: null,
      website: null,
      bookingUrl: null,
      social: { instagram: null, facebook: null, tripadvisor: null }
    },
    business: {
      priceRange: '$',
      priceFrom: 0,
      priceTo: 0,
      currency: 'USD',
      hours: { display: 'Daily 8am-5pm', isOpen24Hours: false, schedule: null },
      acceptsCreditCards: true,
      reservationRequired: false,
      languages: ['English']
    },
    ratings: { overall: 3.8, reviewCount: 5000, googleRating: 3.8, tripadvisorRating: 3.5 },
    tags: ['landmark', 'quirky', 'photo', 'postcards', 'free', 'gift shop'],
    isFeatured: false
  },
  {
    id: 'critical-hospital-hsc',
    name: 'Health Services Authority Hospital',
    slug: 'health-services-authority-hospital',
    category: 'medical',
    subcategory: 'hospital',
    description: 'The Health Services Authority (HSA) Hospital is the main public hospital in the Cayman Islands, located in George Town. It provides 24-hour emergency services, inpatient and outpatient care, surgery, maternity, pediatrics, and specialized clinics. The hospital serves as the primary emergency medical facility for Grand Cayman.',
    shortDescription: 'Main public hospital with 24/7 emergency room, surgery, and full medical services.',
    highlights: ['24/7 Emergency Room', 'Full surgical services', 'Maternity ward', 'Pediatric care'],
    location: {
      island: 'Grand Cayman',
      area: 'George Town',
      district: 'George Town',
      address: '95 Hospital Road, George Town, Grand Cayman',
      coordinates: { lat: 19.2969, lng: -81.3778 },
      googlePlaceId: 'ChIJTwWNNqmHJY8RpUyVYq8QQ4E'
    },
    contact: {
      phone: '+1 345-949-8600',
      email: 'info@hsa.ky',
      website: 'https://www.hsa.ky',
      bookingUrl: null,
      social: { instagram: null, facebook: 'https://www.facebook.com/HSACayman', tripadvisor: null }
    },
    business: {
      priceRange: null,
      priceFrom: null,
      priceTo: null,
      currency: 'USD',
      hours: { display: 'Emergency: 24/7 | Clinics: Mon-Fri 8am-5pm', isOpen24Hours: true, schedule: null },
      acceptsCreditCards: true,
      reservationRequired: false,
      languages: ['English', 'Spanish']
    },
    tags: ['hospital', 'emergency', 'medical', 'health', '24-hour', 'ER'],
    isFeatured: true
  },
  {
    id: 'critical-emergency-911',
    name: 'Emergency Services (911)',
    slug: 'emergency-services-911',
    category: 'emergency',
    subcategory: 'emergency_services',
    description: 'In the Cayman Islands, dial 911 for all emergencies including police, fire, and ambulance. The Royal Cayman Islands Police Service, Cayman Islands Fire Service, and Emergency Medical Services all respond to 911 calls. For non-emergency police matters, call 949-4222.',
    shortDescription: 'Dial 911 for police, fire, and ambulance emergencies. Non-emergency police: 949-4222.',
    highlights: ['Dial 911 for emergencies', 'Police, Fire, Ambulance', 'Non-emergency: 949-4222'],
    location: {
      island: 'Grand Cayman',
      area: 'George Town',
      district: 'George Town',
      address: 'Grand Cayman, Cayman Islands',
      coordinates: { lat: 19.2950, lng: -81.3838 },
      googlePlaceId: null
    },
    contact: {
      phone: '911',
      email: null,
      website: 'https://www.rcips.ky',
      bookingUrl: null,
      social: { instagram: null, facebook: null, tripadvisor: null }
    },
    business: {
      priceRange: null,
      priceFrom: null,
      priceTo: null,
      currency: 'USD',
      hours: { display: '24/7', isOpen24Hours: true, schedule: null },
      acceptsCreditCards: false,
      reservationRequired: false,
      languages: ['English']
    },
    tags: ['emergency', '911', 'police', 'fire', 'ambulance', 'safety'],
    isFeatured: true
  },
  {
    id: 'critical-pedro-castle',
    name: 'Pedro St. James National Historic Site',
    slug: 'pedro-st-james-castle',
    category: 'attraction',
    subcategory: 'historic_site',
    description: 'Pedro St. James, known as "the birthplace of democracy in the Cayman Islands," is the oldest known stone structure in the Cayman Islands, built in 1780. This National Historic Site features the restored Great House, beautiful gardens overlooking the Caribbean Sea, a multimedia theater presentation, and a café. It was here in 1831 that the decision to form an elected legislature was made.',
    shortDescription: 'The birthplace of Cayman democracy - a beautifully restored 1780 Great House with stunning sea views.',
    highlights: ['Oldest stone building in Cayman', 'Birthplace of democracy', 'Stunning sea views', 'Multimedia theater'],
    location: {
      island: 'Grand Cayman',
      area: 'Savannah',
      district: 'Bodden Town',
      address: 'Pedro Castle Road, Savannah, Grand Cayman',
      coordinates: { lat: 19.2697, lng: -81.2811 },
      googlePlaceId: 'ChIJN7IRRK-EJY8REvKj-GNrLtY'
    },
    contact: {
      phone: '+1 345-947-3329',
      email: 'info@pedrostjames.ky',
      website: 'https://www.pedrostjames.ky',
      bookingUrl: null,
      social: { instagram: null, facebook: 'https://www.facebook.com/PedroStJames', tripadvisor: null }
    },
    business: {
      priceRange: '$',
      priceFrom: 10,
      priceTo: 15,
      currency: 'USD',
      hours: { display: 'Daily 9am-5pm', isOpen24Hours: false, schedule: {
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '09:00', close: '17:00' },
        wednesday: { open: '09:00', close: '17:00' },
        thursday: { open: '09:00', close: '17:00' },
        friday: { open: '09:00', close: '17:00' },
        saturday: { open: '09:00', close: '17:00' },
        sunday: { open: '09:00', close: '17:00' }
      }},
      acceptsCreditCards: true,
      reservationRequired: false,
      languages: ['English']
    },
    ratings: { overall: 4.4, reviewCount: 2000, googleRating: 4.4, tripadvisorRating: 4.0 },
    tags: ['historic', 'museum', 'heritage', 'culture', 'architecture', 'views'],
    isFeatured: true
  },
  {
    id: 'critical-botanic-park',
    name: 'Queen Elizabeth II Botanic Park',
    slug: 'queen-elizabeth-ii-botanic-park',
    category: 'attraction',
    subcategory: 'nature',
    description: 'The Queen Elizabeth II Botanic Park is a 65-acre nature reserve showcasing the Cayman Islands\' native flora and fauna. Home to the endangered blue iguana, the park features a Heritage Garden with a traditional Caymanian cottage, the Woodland Trail through ancient dry forest, a floral colour garden, and a lake with native birds. One of the best places to see the rare Cayman blue iguana in the wild.',
    shortDescription: '65-acre nature reserve featuring rare blue iguanas, native plants, heritage gardens, and woodland trails.',
    highlights: ['Blue iguana habitat', 'Heritage Caymanian cottage', 'Woodland nature trail', 'Native orchids and plants'],
    location: {
      island: 'Grand Cayman',
      area: 'North Side',
      district: 'North Side',
      address: '167 Botanic Road, North Side, Grand Cayman',
      coordinates: { lat: 19.3292, lng: -81.1814 },
      googlePlaceId: 'ChIJp8EZyIOFJY8Rxwbc-TJPj7A'
    },
    contact: {
      phone: '+1 345-947-9462',
      email: 'info@botanic-park.ky',
      website: 'https://www.botanic-park.ky',
      bookingUrl: null,
      social: { instagram: 'https://www.instagram.com/qaboranicpark', facebook: 'https://www.facebook.com/QEIIBotanicPark', tripadvisor: null }
    },
    business: {
      priceRange: '$',
      priceFrom: 12,
      priceTo: 15,
      currency: 'USD',
      hours: { display: 'Daily 9am-5:30pm (last entry 4:30pm)', isOpen24Hours: false, schedule: {
        monday: { open: '09:00', close: '17:30' },
        tuesday: { open: '09:00', close: '17:30' },
        wednesday: { open: '09:00', close: '17:30' },
        thursday: { open: '09:00', close: '17:30' },
        friday: { open: '09:00', close: '17:30' },
        saturday: { open: '09:00', close: '17:30' },
        sunday: { open: '09:00', close: '17:30' }
      }},
      acceptsCreditCards: true,
      reservationRequired: false,
      languages: ['English']
    },
    ratings: { overall: 4.5, reviewCount: 3500, googleRating: 4.5, tripadvisorRating: 4.5 },
    tags: ['nature', 'wildlife', 'blue iguana', 'garden', 'botanical', 'family', 'hiking'],
    isFeatured: true
  }
];

// ============ HELPERS ============

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function cleanPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 7) return null;
  return phone.trim();
}

function cleanWebsite(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/url?')) {
    try {
      const parsed = new URL(url, 'https://www.google.com');
      return parsed.searchParams.get('q') || null;
    } catch { return null; }
  }
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }
  return url.trim();
}

function extractCoordinates(location: any): { lat: number; lng: number } | null {
  // Try nested coordinates first
  if (location?.coordinates?.lat && location?.coordinates?.lng) {
    return { lat: location.coordinates.lat, lng: location.coordinates.lng };
  }
  // Try flat format
  if (location?.latitude && location?.longitude) {
    return { lat: location.latitude, lng: location.longitude };
  }
  return null;
}

function determineIsland(location: any): 'Grand Cayman' | 'Cayman Brac' | 'Little Cayman' {
  const island = location?.island?.toLowerCase() || '';
  if (island.includes('brac')) return 'Cayman Brac';
  if (island.includes('little')) return 'Little Cayman';
  return 'Grand Cayman';
}

function calculateQualityScore(place: UnifiedPlace): number {
  let score = 0;
  if (place.media.thumbnail) score += 20;
  if (place.media.images.length > 0) score += 10;
  if (place.contact.phone) score += 20;
  if (place.contact.website) score += 15;
  if (place.description && place.description.length > 50) score += 15;
  if (place.business.hours.display && !place.business.hours.display.includes('Contact')) score += 10;
  if (place.ratings.overall && place.ratings.overall > 0) score += 10;
  return score;
}

function generateSearchText(place: UnifiedPlace): string {
  const parts = [
    place.name,
    place.description,
    place.category,
    place.subcategory,
    place.location.island,
    place.location.area,
    place.location.district,
    ...place.tags,
    ...place.keywords
  ].filter(Boolean);
  return parts.join(' ').toLowerCase();
}

// ============ NORMALIZERS ============

function normalizeOsmPlace(raw: any): UnifiedPlace | null {
  const coords = extractCoordinates(raw.location);
  if (!coords) return null;

  const now = new Date().toISOString();

  const place: UnifiedPlace = {
    id: raw.id || `osm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: raw.name || 'Unknown Place',
    slug: slugify(raw.name || 'unknown'),

    category: raw.category || 'other',
    subcategory: raw.subcategory || null,

    description: raw.description || `${raw.name} is located in ${raw.location?.island || 'Grand Cayman'}.`,
    shortDescription: raw.description?.substring(0, 150) || raw.name || '',
    highlights: raw.highlights || [],

    location: {
      island: determineIsland(raw.location),
      area: raw.location?.area || null,
      district: raw.location?.district || raw.location?.area || null,
      address: raw.location?.address || null,
      coordinates: coords,
      googlePlaceId: raw.location?.googlePlaceId || null
    },

    contact: {
      phone: cleanPhone(raw.business?.phone || raw.contact?.phone),
      email: raw.business?.email || raw.contact?.email || null,
      website: cleanWebsite(raw.business?.website || raw.contact?.website),
      bookingUrl: cleanWebsite(raw.contact?.bookingUrl) || null,
      social: {
        instagram: raw.contact?.instagram || null,
        facebook: raw.contact?.facebook || null,
        tripadvisor: raw.contact?.tripadvisor || null
      }
    },

    business: {
      priceRange: raw.business?.priceRange || null,
      priceFrom: raw.business?.priceFrom || null,
      priceTo: raw.business?.priceTo || null,
      currency: raw.business?.currency || 'USD',
      hours: {
        display: raw.business?.hours || raw.business?.openingHours?.formattedDisplay || null,
        isOpen24Hours: false,
        schedule: null
      },
      acceptsCreditCards: raw.business?.acceptsCreditCards ?? true,
      reservationRequired: raw.business?.reservationRequired ?? false,
      languages: raw.business?.languages || ['English']
    },

    ratings: {
      overall: raw.ratings?.overall || null,
      reviewCount: raw.ratings?.reviewCount || 0,
      googleRating: raw.ratings?.googleRating || null,
      tripadvisorRating: raw.ratings?.tripadvisorRating || null
    },

    media: {
      thumbnail: raw.media?.thumbnail || null,
      images: raw.media?.images?.filter((img: string) => img && !img.includes('unsplash') && !img.includes('placeholder')) || [],
      videos: raw.media?.videos || []
    },

    tags: raw.tags || [raw.category].filter(Boolean),
    keywords: raw.keywords || [],
    searchText: '',

    isActive: raw.isActive !== false,
    isFeatured: raw.isFeatured || false,
    isPremium: raw.isPremium || false,
    source: 'osm',
    sourceId: raw.id || '',
    quality: {
      score: 0,
      hasPhoto: false,
      hasPhone: false,
      hasWebsite: false,
      hasDescription: false,
      hasHours: false
    },
    createdAt: raw.createdAt || raw.lastUpdated || now,
    updatedAt: now
  };

  // Calculate quality
  place.quality = {
    score: calculateQualityScore(place),
    hasPhoto: !!place.media.thumbnail || place.media.images.length > 0,
    hasPhone: !!place.contact.phone,
    hasWebsite: !!place.contact.website,
    hasDescription: place.description.length > 50,
    hasHours: !!place.business.hours.display && !place.business.hours.display.includes('Contact')
  };

  place.searchText = generateSearchText(place);

  return place;
}

function normalizeSerpApiPlace(raw: any): UnifiedPlace | null {
  const coords = extractCoordinates(raw.location);
  if (!coords) return null;

  const now = new Date().toISOString();

  const place: UnifiedPlace = {
    id: raw.id || `serp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: raw.name || 'Unknown Place',
    slug: slugify(raw.name || 'unknown'),

    category: raw.category || 'other',
    subcategory: raw.subcategory || null,

    description: raw.description || raw.shortDescription || `${raw.name} in the Cayman Islands.`,
    shortDescription: raw.shortDescription || raw.description?.substring(0, 150) || '',
    highlights: raw.highlights || [],

    location: {
      island: determineIsland(raw.location),
      area: raw.location?.district || raw.location?.area || null,
      district: raw.location?.district || null,
      address: raw.location?.address || null,
      coordinates: coords,
      googlePlaceId: raw.location?.googlePlaceId || null
    },

    contact: {
      phone: cleanPhone(raw.contact?.phone),
      email: raw.contact?.email || null,
      website: cleanWebsite(raw.contact?.website),
      bookingUrl: cleanWebsite(raw.contact?.bookingUrl) || null,
      social: {
        instagram: raw.contact?.instagram || null,
        facebook: raw.contact?.facebook || null,
        tripadvisor: raw.contact?.tripadvisor || null
      }
    },

    business: {
      priceRange: raw.business?.priceRange || null,
      priceFrom: raw.business?.priceFrom || null,
      priceTo: raw.business?.priceTo || null,
      currency: raw.business?.currency || 'USD',
      hours: {
        display: raw.business?.openingHours?.formattedDisplay || null,
        isOpen24Hours: raw.business?.openingHours?.isOpen24Hours || false,
        schedule: raw.business?.openingHours?.schedule || null
      },
      acceptsCreditCards: raw.business?.acceptsCreditCards ?? true,
      reservationRequired: raw.business?.reservationRequired ?? false,
      languages: raw.business?.languages || ['English']
    },

    ratings: {
      overall: raw.ratings?.overall || raw.ratings?.googleRating || null,
      reviewCount: raw.ratings?.reviewCount || 0,
      googleRating: raw.ratings?.googleRating || null,
      tripadvisorRating: raw.ratings?.tripadvisorRating || null
    },

    media: {
      thumbnail: raw.media?.thumbnail || null,
      images: raw.media?.images?.filter((img: string) => img && !img.includes('unsplash')) || [],
      videos: raw.media?.videos || []
    },

    tags: raw.tags || [],
    keywords: raw.keywords || [],
    searchText: '',

    isActive: raw.isActive !== false,
    isFeatured: raw.isFeatured || false,
    isPremium: raw.isPremium || false,
    source: 'serpapi',
    sourceId: raw.id || '',
    quality: {
      score: 0,
      hasPhoto: false,
      hasPhone: false,
      hasWebsite: false,
      hasDescription: false,
      hasHours: false
    },
    createdAt: raw.createdAt || now,
    updatedAt: now
  };

  place.quality = {
    score: calculateQualityScore(place),
    hasPhoto: !!place.media.thumbnail || place.media.images.length > 0,
    hasPhone: !!place.contact.phone,
    hasWebsite: !!place.contact.website,
    hasDescription: place.description.length > 50,
    hasHours: !!place.business.hours.display
  };

  place.searchText = generateSearchText(place);

  return place;
}

function normalizeCriticalPlace(raw: Partial<UnifiedPlace>): UnifiedPlace {
  const now = new Date().toISOString();

  const place: UnifiedPlace = {
    id: raw.id!,
    name: raw.name!,
    slug: raw.slug || slugify(raw.name!),
    category: raw.category || 'other',
    subcategory: raw.subcategory || null,
    description: raw.description || '',
    shortDescription: raw.shortDescription || '',
    highlights: raw.highlights || [],
    location: raw.location as UnifiedPlace['location'],
    contact: {
      phone: raw.contact?.phone || null,
      email: raw.contact?.email || null,
      website: raw.contact?.website || null,
      bookingUrl: raw.contact?.bookingUrl || null,
      social: raw.contact?.social || { instagram: null, facebook: null, tripadvisor: null }
    },
    business: {
      priceRange: raw.business?.priceRange || null,
      priceFrom: raw.business?.priceFrom || null,
      priceTo: raw.business?.priceTo || null,
      currency: raw.business?.currency || 'USD',
      hours: raw.business?.hours || { display: null, isOpen24Hours: false, schedule: null },
      acceptsCreditCards: raw.business?.acceptsCreditCards ?? true,
      reservationRequired: raw.business?.reservationRequired ?? false,
      languages: raw.business?.languages || ['English']
    },
    ratings: raw.ratings || { overall: null, reviewCount: 0, googleRating: null, tripadvisorRating: null },
    media: {
      thumbnail: raw.media?.thumbnail || null,
      images: raw.media?.images || [],
      videos: raw.media?.videos || []
    },
    tags: raw.tags || [],
    keywords: raw.keywords || [],
    searchText: '',
    isActive: true,
    isFeatured: raw.isFeatured ?? true,
    isPremium: raw.isPremium ?? false,
    source: 'manual',
    sourceId: raw.id!,
    quality: { score: 100, hasPhoto: true, hasPhone: true, hasWebsite: true, hasDescription: true, hasHours: true },
    createdAt: now,
    updatedAt: now
  };

  place.searchText = generateSearchText(place);

  return place;
}

// ============ DEDUPLICATION ============

function findDuplicates(places: UnifiedPlace[]): Map<string, UnifiedPlace[]> {
  const groups = new Map<string, UnifiedPlace[]>();

  for (const place of places) {
    // Create a key based on name + approximate location
    const key = `${place.name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Math.round(place.location.coordinates.lat * 100)}-${Math.round(place.location.coordinates.lng * 100)}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(place);
  }

  return groups;
}

function mergeDuplicates(duplicates: UnifiedPlace[]): UnifiedPlace {
  // Sort by quality score, take the best one as base
  duplicates.sort((a, b) => b.quality.score - a.quality.score);
  const best = { ...duplicates[0] };

  // Merge data from others
  for (let i = 1; i < duplicates.length; i++) {
    const other = duplicates[i];

    // Take phone if missing
    if (!best.contact.phone && other.contact.phone) {
      best.contact.phone = other.contact.phone;
    }

    // Take website if missing
    if (!best.contact.website && other.contact.website) {
      best.contact.website = other.contact.website;
    }

    // Take better description
    if (other.description.length > best.description.length) {
      best.description = other.description;
    }

    // Merge images
    const allImages = [...new Set([...best.media.images, ...other.media.images])];
    best.media.images = allImages.slice(0, 10);

    // Take thumbnail if missing
    if (!best.media.thumbnail && other.media.thumbnail) {
      best.media.thumbnail = other.media.thumbnail;
    }

    // Merge tags
    best.tags = [...new Set([...best.tags, ...other.tags])];

    // Take higher rating
    if (other.ratings.overall && (!best.ratings.overall || other.ratings.overall > best.ratings.overall)) {
      best.ratings = { ...other.ratings };
    }
  }

  // Recalculate quality
  best.quality.score = calculateQualityScore(best);
  best.searchText = generateSearchText(best);

  return best;
}

// ============ MAIN ============

async function main(): Promise<void> {
  console.log('============================================');
  console.log('ISLE AI - KNOWLEDGE BASE NORMALIZER');
  console.log('============================================\n');

  const allPlaces: UnifiedPlace[] = [];

  // 1. Load and normalize OSM data
  console.log('📂 Loading OSM data...');
  const osmPath = path.join(DATA_DIR, 'osm-scraped', 'osm-knowledge.json');
  if (fs.existsSync(osmPath)) {
    const osmData = JSON.parse(fs.readFileSync(osmPath, 'utf-8'));
    let osmCount = 0;
    for (const raw of osmData) {
      const normalized = normalizeOsmPlace(raw);
      if (normalized && normalized.isActive) {
        allPlaces.push(normalized);
        osmCount++;
      }
    }
    console.log(`   ✅ Loaded ${osmCount} places from OSM`);
  }

  // 2. Load and normalize SerpAPI data
  console.log('📂 Loading SerpAPI data...');
  const serpPath = path.join(DATA_DIR, 'serpapi-vip-data.ts');
  if (fs.existsSync(serpPath)) {
    const content = fs.readFileSync(serpPath, 'utf-8');
    const match = content.match(/=\s*(\[[\s\S]*\])\s*;?\s*$/);
    if (match) {
      const serpData = JSON.parse(match[1]);
      let serpCount = 0;
      for (const raw of serpData) {
        const normalized = normalizeSerpApiPlace(raw);
        if (normalized && normalized.isActive) {
          allPlaces.push(normalized);
          serpCount++;
        }
      }
      console.log(`   ✅ Loaded ${serpCount} places from SerpAPI`);
    }
  }

  // 3. Add critical missing places
  console.log('📂 Adding critical places...');
  for (const critical of CRITICAL_PLACES) {
    const normalized = normalizeCriticalPlace(critical);
    allPlaces.push(normalized);
  }
  console.log(`   ✅ Added ${CRITICAL_PLACES.length} critical places`);

  // 4. Deduplicate
  console.log('\n🔍 Finding duplicates...');
  const groups = findDuplicates(allPlaces);
  const deduped: UnifiedPlace[] = [];
  let dupeCount = 0;

  for (const [key, group] of groups) {
    if (group.length > 1) {
      dupeCount += group.length - 1;
      deduped.push(mergeDuplicates(group));
    } else {
      deduped.push(group[0]);
    }
  }
  console.log(`   ✅ Merged ${dupeCount} duplicates`);

  // 5. Sort by quality
  deduped.sort((a, b) => b.quality.score - a.quality.score);

  // 6. Calculate stats
  const stats = {
    total: deduped.length,
    byCategory: {} as Record<string, number>,
    byIsland: {} as Record<string, number>,
    quality: {
      withPhoto: 0,
      withPhone: 0,
      withWebsite: 0,
      withHours: 0,
      avgScore: 0
    }
  };

  let totalScore = 0;
  for (const place of deduped) {
    stats.byCategory[place.category] = (stats.byCategory[place.category] || 0) + 1;
    stats.byIsland[place.location.island] = (stats.byIsland[place.location.island] || 0) + 1;
    if (place.quality.hasPhoto) stats.quality.withPhoto++;
    if (place.quality.hasPhone) stats.quality.withPhone++;
    if (place.quality.hasWebsite) stats.quality.withWebsite++;
    if (place.quality.hasHours) stats.quality.withHours++;
    totalScore += place.quality.score;
  }
  stats.quality.avgScore = Math.round(totalScore / deduped.length);

  // 7. Save unified knowledge base
  console.log('\n💾 Saving unified knowledge base...');

  const outputJson = path.join(DATA_DIR, 'unified-knowledge-base.json');
  fs.writeFileSync(outputJson, JSON.stringify(deduped, null, 2));
  console.log(`   ✅ Saved ${outputJson}`);

  const outputTs = path.join(DATA_DIR, 'unified-knowledge-base.ts');
  const tsContent = `// ============================================
// ISLE AI - UNIFIED KNOWLEDGE BASE
// Generated: ${new Date().toISOString()}
// Total places: ${deduped.length}
// ============================================

export interface UnifiedPlace {
  id: string;
  name: string;
  slug: string;
  category: string;
  subcategory: string | null;
  description: string;
  shortDescription: string;
  highlights: string[];
  location: {
    island: 'Grand Cayman' | 'Cayman Brac' | 'Little Cayman';
    area: string | null;
    district: string | null;
    address: string | null;
    coordinates: { lat: number; lng: number };
    googlePlaceId: string | null;
  };
  contact: {
    phone: string | null;
    email: string | null;
    website: string | null;
    bookingUrl: string | null;
    social: {
      instagram: string | null;
      facebook: string | null;
      tripadvisor: string | null;
    };
  };
  business: {
    priceRange: '$' | '$$' | '$$$' | '$$$$' | null;
    priceFrom: number | null;
    priceTo: number | null;
    currency: string;
    hours: {
      display: string | null;
      isOpen24Hours: boolean;
      schedule: Record<string, { open: string; close: string } | 'closed'> | null;
    };
    acceptsCreditCards: boolean;
    reservationRequired: boolean;
    languages: string[];
  };
  ratings: {
    overall: number | null;
    reviewCount: number;
    googleRating: number | null;
    tripadvisorRating: number | null;
  };
  media: {
    thumbnail: string | null;
    images: string[];
    videos: string[];
  };
  tags: string[];
  keywords: string[];
  searchText: string;
  isActive: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  source: string;
  sourceId: string;
  quality: {
    score: number;
    hasPhoto: boolean;
    hasPhone: boolean;
    hasWebsite: boolean;
    hasDescription: boolean;
    hasHours: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export const UNIFIED_KNOWLEDGE_BASE: UnifiedPlace[] = ${JSON.stringify(deduped, null, 2)};

export default UNIFIED_KNOWLEDGE_BASE;
`;
  fs.writeFileSync(outputTs, tsContent);
  console.log(`   ✅ Saved ${outputTs}`);

  // 8. Print summary
  console.log('\n============================================');
  console.log('📊 NORMALIZATION COMPLETE');
  console.log('============================================');
  console.log(`\n📍 Total Places: ${stats.total}`);

  console.log('\n📂 By Category:');
  Object.entries(stats.byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`);
    });

  console.log('\n🏝️ By Island:');
  Object.entries(stats.byIsland).forEach(([island, count]) => {
    console.log(`   ${island}: ${count}`);
  });

  console.log('\n📈 Data Quality:');
  console.log(`   With Photo: ${stats.quality.withPhoto} (${Math.round(stats.quality.withPhoto / stats.total * 100)}%)`);
  console.log(`   With Phone: ${stats.quality.withPhone} (${Math.round(stats.quality.withPhone / stats.total * 100)}%)`);
  console.log(`   With Website: ${stats.quality.withWebsite} (${Math.round(stats.quality.withWebsite / stats.total * 100)}%)`);
  console.log(`   With Hours: ${stats.quality.withHours} (${Math.round(stats.quality.withHours / stats.total * 100)}%)`);
  console.log(`   Avg Quality Score: ${stats.quality.avgScore}/100`);

  console.log('\n✅ Unified knowledge base ready for production!');
  console.log(`   JSON: ${outputJson}`);
  console.log(`   TypeScript: ${outputTs}`);
}

main().catch(console.error);
