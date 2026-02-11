// ============================================
// ISLE AI - SCRAPER TYPE DEFINITIONS
// TypeScript types for Google Maps & Flight scrapers
// ============================================

// ============ GOOGLE PLACES API TYPES ============

/**
 * Google Places API response for Nearby Search
 */
export interface GoogleNearbySearchResponse {
  html_attributions: string[];
  results: GooglePlaceResult[];
  next_page_token?: string;
  status: GooglePlacesStatus;
  error_message?: string;
}

/**
 * Google Places API response for Place Details
 */
export interface GooglePlaceDetailsResponse {
  html_attributions: string[];
  result: GooglePlaceDetails;
  status: GooglePlacesStatus;
  error_message?: string;
}

/**
 * Status codes from Google Places API
 */
export type GooglePlacesStatus =
  | 'OK'
  | 'ZERO_RESULTS'
  | 'INVALID_REQUEST'
  | 'OVER_QUERY_LIMIT'
  | 'REQUEST_DENIED'
  | 'UNKNOWN_ERROR';

/**
 * Basic place result from Nearby Search
 */
export interface GooglePlaceResult {
  place_id: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    viewport?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  vicinity?: string;
  formatted_address?: string;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  price_level?: number; // 0-4 scale
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  photos?: GooglePlacePhoto[];
  business_status?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  icon?: string;
  icon_background_color?: string;
  icon_mask_base_uri?: string;
  plus_code?: {
    compound_code: string;
    global_code: string;
  };
}

/**
 * Detailed place information from Place Details API
 */
export interface GooglePlaceDetails extends GooglePlaceResult {
  // Contact info
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string; // Google Maps URL

  // Address components
  address_components?: GoogleAddressComponent[];
  adr_address?: string;

  // Opening hours (detailed)
  opening_hours?: {
    open_now?: boolean;
    periods?: GoogleOpeningPeriod[];
    weekday_text?: string[];
  };
  current_opening_hours?: {
    open_now?: boolean;
    periods?: GoogleOpeningPeriod[];
    weekday_text?: string[];
  };

  // Reviews
  reviews?: GooglePlaceReview[];

  // Additional info
  editorial_summary?: {
    language: string;
    overview: string;
  };
  serves_beer?: boolean;
  serves_wine?: boolean;
  serves_breakfast?: boolean;
  serves_lunch?: boolean;
  serves_dinner?: boolean;
  serves_vegetarian_food?: boolean;
  wheelchair_accessible_entrance?: boolean;
  reservable?: boolean;
  delivery?: boolean;
  dine_in?: boolean;
  takeout?: boolean;
  curbside_pickup?: boolean;

  // UTC offset
  utc_offset?: number;
}

/**
 * Address component from Place Details
 */
export interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

/**
 * Opening period from Place Details
 */
export interface GoogleOpeningPeriod {
  open: {
    day: number; // 0-6 (Sunday-Saturday)
    time: string; // HHMM format
  };
  close?: {
    day: number;
    time: string;
  };
}

/**
 * Photo reference from Google Places
 */
export interface GooglePlacePhoto {
  photo_reference: string;
  height: number;
  width: number;
  html_attributions: string[];
}

/**
 * Review from Google Places
 */
export interface GooglePlaceReview {
  author_name: string;
  author_url?: string;
  language: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number; // Unix timestamp
}

// ============ SCRAPER CONFIGURATION ============

/**
 * Search category configuration for the scraper
 */
export interface SearchCategory {
  name: string;
  types: string[]; // Google Place types to search
  keywords?: string[]; // Additional keyword searches
  knowledgeCategory: string; // Maps to KnowledgeCategory
  subcategory?: string;
}

/**
 * Search location configuration
 */
export interface SearchLocation {
  name: string;
  island: 'Grand Cayman' | 'Cayman Brac' | 'Little Cayman';
  lat: number;
  lng: number;
  radius: number; // meters (max 50000)
}

/**
 * Scraper configuration
 */
export interface ScraperConfig {
  apiKey: string;
  outputDir: string;
  cacheDir: string;

  // Rate limiting
  requestsPerSecond: number;
  maxRetries: number;
  retryDelayMs: number;

  // Search config
  locations: SearchLocation[];
  categories: SearchCategory[];

  // Options
  includePhotos: boolean;
  maxPhotosPerPlace: number;
  includeReviews: boolean;
  maxReviewsPerPlace: number;
  skipExisting: boolean;

  // Logging
  verbose: boolean;
}

// ============ SCRAPED DATA OUTPUT ============

/**
 * Raw scraped place data before transformation
 */
export interface ScrapedPlace {
  // Identification
  placeId: string;
  scrapedAt: string;
  source: 'google_places';

  // Basic info
  name: string;
  types: string[];

  // Location
  location: {
    address: string;
    lat: number;
    lng: number;
    district?: string;
    island: string;
    addressComponents?: GoogleAddressComponent[];
  };

  // Contact
  contact: {
    phone?: string;
    internationalPhone?: string;
    website?: string;
    googleMapsUrl?: string;
  };

  // Business info
  business: {
    status?: string;
    priceLevel?: number;
    openingHours?: {
      isOpenNow?: boolean;
      periods?: GoogleOpeningPeriod[];
      weekdayText?: string[];
    };
  };

  // Ratings
  ratings: {
    googleRating?: number;
    totalReviews?: number;
  };

  // Media
  media: {
    photos: {
      reference: string;
      url?: string;
      width: number;
      height: number;
    }[];
  };

  // Reviews
  reviews?: {
    author: string;
    rating: number;
    text: string;
    time: number;
  }[];

  // Editorial
  editorial?: {
    overview?: string;
  };

  // Additional attributes
  attributes: {
    servesVegetarian?: boolean;
    wheelchair?: boolean;
    reservable?: boolean;
    delivery?: boolean;
    dineIn?: boolean;
    takeout?: boolean;
    servesBreakfast?: boolean;
    servesLunch?: boolean;
    servesDinner?: boolean;
    servesBeer?: boolean;
    servesWine?: boolean;
  };

  // Category mapping
  categoryMapping: {
    primaryCategory: string;
    subcategory?: string;
    allCategories: string[];
  };
}

/**
 * Scraper progress state for resuming
 */
export interface ScraperProgress {
  startedAt: string;
  lastUpdated: string;
  status: 'running' | 'paused' | 'completed' | 'error';

  // Progress tracking
  totalLocations: number;
  completedLocations: number;
  currentLocation?: string;

  totalCategories: number;
  completedCategories: number;
  currentCategory?: string;

  // Results
  totalPlacesFound: number;
  totalPlacesProcessed: number;
  errors: ScraperError[];

  // Resume info
  lastPageToken?: string;
  processedPlaceIds: string[];
}

/**
 * Scraper error record
 */
export interface ScraperError {
  timestamp: string;
  type: 'api_error' | 'rate_limit' | 'network' | 'parse_error' | 'unknown';
  message: string;
  details?: any;
  location?: string;
  category?: string;
  placeId?: string;
}

/**
 * Scraper statistics
 */
export interface ScraperStats {
  runId: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;

  // Counts
  totalApiCalls: number;
  nearbySearchCalls: number;
  placeDetailsCalls: number;
  photoFetches: number;

  // Results
  placesFound: number;
  placesNew: number;
  placesUpdated: number;
  placesSkipped: number;

  // Costs
  estimatedCost: {
    nearbySearch: number;
    placeDetails: number;
    photos: number;
    total: number;
  };

  // By category
  byCategory: {
    [category: string]: {
      count: number;
      new: number;
      updated: number;
    };
  };

  // By location
  byLocation: {
    [location: string]: {
      count: number;
    };
  };

  // Errors
  errorCount: number;
  rateLimitHits: number;
}

// ============ FLIGHT SCRAPER TYPES ============

/**
 * Airport information
 */
export interface Airport {
  code: string; // IATA code
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
}

/**
 * Airline information
 */
export interface Airline {
  code: string; // IATA code
  name: string;
  logo?: string;
  country: string;
}

/**
 * Flight route
 */
export interface FlightRoute {
  id: string;
  origin: Airport;
  destination: Airport;
  airline: Airline;

  // Schedule
  frequency: string; // e.g., "Daily", "Mon, Wed, Fri"
  departureTime: string; // Local time HH:MM
  arrivalTime: string; // Local time HH:MM
  duration: string; // e.g., "3h 45m"

  // Aircraft
  aircraft?: string;

  // Seasonal
  seasonal?: boolean;
  seasonStart?: string;
  seasonEnd?: string;

  // Meta
  lastUpdated: string;
  isActive: boolean;
}

/**
 * Flight search result (for real-time pricing)
 */
export interface FlightSearchResult {
  searchId: string;
  searchDate: string;

  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;

  results: FlightOption[];
}

/**
 * Individual flight option
 */
export interface FlightOption {
  id: string;
  airline: Airline;

  // Outbound
  outbound: {
    departure: string; // ISO datetime
    arrival: string;
    duration: string;
    stops: number;
    segments: FlightSegment[];
  };

  // Return (if round trip)
  return?: {
    departure: string;
    arrival: string;
    duration: string;
    stops: number;
    segments: FlightSegment[];
  };

  // Pricing
  price: {
    amount: number;
    currency: string;
    pricePerPerson: number;
  };

  // Booking
  bookingUrl?: string;
  deepLink?: string;
}

/**
 * Flight segment
 */
export interface FlightSegment {
  airline: Airline;
  flightNumber: string;
  origin: Airport;
  destination: Airport;
  departure: string;
  arrival: string;
  duration: string;
  aircraft?: string;
  cabin?: string;
}

// ============ UTILITY TYPES ============

/**
 * Price level mapping
 */
export const PRICE_LEVEL_MAP: { [key: number]: '$' | '$$' | '$$$' | '$$$$' | '$$$$$' } = {
  0: '$',
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
};

/**
 * Google Place type to KnowledgeCategory mapping
 */
export const TYPE_TO_CATEGORY_MAP: { [key: string]: string } = {
  // Accommodation
  'lodging': 'hotel',
  'hotel': 'hotel',
  'resort': 'hotel',
  'motel': 'hotel',
  'guest_house': 'hotel',
  'bed_and_breakfast': 'hotel',

  // Dining
  'restaurant': 'restaurant',
  'cafe': 'restaurant',
  'bar': 'bar',
  'night_club': 'nightlife',
  'bakery': 'restaurant',
  'meal_delivery': 'restaurant',
  'meal_takeaway': 'restaurant',

  // Water activities
  'scuba_diving': 'diving_snorkeling',
  'snorkeling': 'diving_snorkeling',
  'boat_rental': 'boat_charter',
  'marina': 'boat_charter',

  // Attractions
  'tourist_attraction': 'attraction',
  'museum': 'attraction',
  'zoo': 'attraction',
  'aquarium': 'attraction',
  'amusement_park': 'attraction',
  'art_gallery': 'attraction',

  // Activities
  'golf_course': 'golf',
  'spa': 'spa_wellness',
  'gym': 'spa_wellness',
  'casino': 'nightlife',

  // Shopping
  'shopping_mall': 'shopping',
  'jewelry_store': 'shopping',
  'clothing_store': 'shopping',
  'department_store': 'shopping',
  'store': 'shopping',

  // Transport
  'car_rental': 'transport',
  'taxi_stand': 'transport',
  'bus_station': 'transport',
  'airport': 'transport',

  // Services
  'bank': 'financial_services',
  'atm': 'financial_services',
  'insurance_agency': 'financial_services',
  'real_estate_agency': 'real_estate',
  'lawyer': 'legal_services',
  'accounting': 'financial_services',

  // Medical
  'hospital': 'emergency',
  'doctor': 'medical_vip',
  'pharmacy': 'emergency',
  'dentist': 'medical_vip',
  'physiotherapist': 'medical_vip',

  // Government
  'post_office': 'general_info',
  'police': 'emergency',
  'fire_station': 'emergency',
  'local_government_office': 'general_info',
  'embassy': 'general_info',

  // Nature
  'park': 'attraction',
  'natural_feature': 'attraction',
  'beach': 'beach',
};

/**
 * Island district mapping based on coordinates
 */
export interface DistrictBounds {
  name: string;
  island: 'Grand Cayman' | 'Cayman Brac' | 'Little Cayman';
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export const CAYMAN_DISTRICTS: DistrictBounds[] = [
  // Grand Cayman districts
  {
    name: 'George Town',
    island: 'Grand Cayman',
    bounds: { north: 19.32, south: 19.26, east: -81.35, west: -81.42 }
  },
  {
    name: 'Seven Mile Beach',
    island: 'Grand Cayman',
    bounds: { north: 19.37, south: 19.32, east: -81.36, west: -81.42 }
  },
  {
    name: 'West Bay',
    island: 'Grand Cayman',
    bounds: { north: 19.42, south: 19.37, east: -81.36, west: -81.45 }
  },
  {
    name: 'Bodden Town',
    island: 'Grand Cayman',
    bounds: { north: 19.32, south: 19.26, east: -81.15, west: -81.25 }
  },
  {
    name: 'East End',
    island: 'Grand Cayman',
    bounds: { north: 19.35, south: 19.26, east: -81.05, west: -81.15 }
  },
  {
    name: 'North Side',
    island: 'Grand Cayman',
    bounds: { north: 19.38, south: 19.32, east: -81.15, west: -81.30 }
  },
  {
    name: 'Rum Point',
    island: 'Grand Cayman',
    bounds: { north: 19.38, south: 19.34, east: -81.23, west: -81.30 }
  },
  // Cayman Brac
  {
    name: 'Cayman Brac West',
    island: 'Cayman Brac',
    bounds: { north: 19.74, south: 19.68, east: -79.82, west: -79.92 }
  },
  {
    name: 'Cayman Brac East',
    island: 'Cayman Brac',
    bounds: { north: 19.74, south: 19.68, east: -79.72, west: -79.82 }
  },
  // Little Cayman
  {
    name: 'Little Cayman',
    island: 'Little Cayman',
    bounds: { north: 19.70, south: 19.65, east: -79.95, west: -80.12 }
  }
];

/**
 * Helper to get district from coordinates
 */
export function getDistrictFromCoords(lat: number, lng: number): { district: string; island: string } {
  for (const district of CAYMAN_DISTRICTS) {
    if (
      lat >= district.bounds.south &&
      lat <= district.bounds.north &&
      lng >= district.bounds.west &&
      lng <= district.bounds.east
    ) {
      return { district: district.name, island: district.island };
    }
  }

  // Default based on rough coordinates
  if (lat > 19.65 && lat < 19.75 && lng > -80.0 && lng < -79.7) {
    return { district: 'Cayman Brac', island: 'Cayman Brac' };
  }
  if (lat > 19.65 && lat < 19.70 && lng > -80.12 && lng < -79.95) {
    return { district: 'Little Cayman', island: 'Little Cayman' };
  }

  return { district: 'Grand Cayman', island: 'Grand Cayman' };
}

/**
 * Generate a unique ID for a knowledge node
 */
export function generateNodeId(category: string, placeId: string): string {
  const prefix = category.replace(/_/g, '-').substring(0, 8);
  const suffix = placeId.substring(0, 12).replace(/[^a-zA-Z0-9]/g, '');
  return `${prefix}-gm-${suffix}`;
}

/**
 * Build photo URL from Google Places photo reference
 */
export function buildPhotoUrl(
  photoReference: string,
  apiKey: string,
  maxWidth: number = 800
): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
}
