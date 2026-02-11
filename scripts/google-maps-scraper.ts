#!/usr/bin/env npx ts-node --esm
// ============================================
// ISLE AI - GOOGLE MAPS PLACES SCRAPER
// Comprehensive scraper for Cayman Islands tourism data
// ============================================

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ============ TYPES ============

type PriceRange = '$' | '$$' | '$$$' | '$$$$' | '$$$$$';

type KnowledgeCategory =
  | 'hotel' | 'villa_rental' | 'restaurant' | 'bar' | 'nightlife'
  | 'beach' | 'diving_snorkeling' | 'water_sports' | 'boat_charter' | 'superyacht'
  | 'attraction' | 'activity' | 'golf' | 'shopping' | 'spa_wellness' | 'spa' | 'medical_vip'
  | 'transport' | 'transportation' | 'chauffeur' | 'private_jet' | 'flight' | 'luxury_car_rental'
  | 'concierge' | 'vip_escort' | 'security_services' | 'service'
  | 'financial_services' | 'legal_services' | 'real_estate' | 'investment'
  | 'history' | 'culture' | 'wildlife' | 'weather' | 'visa_travel' | 'emergency' | 'general_info'
  | 'event' | 'festival';

interface KnowledgeNode {
  id: string;
  category: KnowledgeCategory | string;
  subcategory?: string;
  name: string;
  description: string;
  shortDescription: string;
  location: {
    address: string;
    district: string;
    island: string;
    latitude: number;
    longitude: number;
    googlePlaceId?: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    bookingUrl?: string;
    instagram?: string;
    facebook?: string;
    tripadvisor?: string;
  };
  media: {
    thumbnail: string;
    images: string[];
    videos?: string[];
    virtualTour?: string;
  };
  business: {
    priceRange: PriceRange;
    priceFrom?: number | null;
    priceTo?: number | null;
    pricePerUnit?: string | null;
    priceDescription?: string | null;
    currency: string;
    openingHours?: any;
    reservationRequired?: boolean;
    acceptsCreditCards?: boolean;
    languages?: string[];
  };
  ratings: {
    overall: number;
    reviewCount: number;
    tripadvisorRating?: number;
    googleRating?: number;
    sources?: { name: string; rating: number; url: string }[];
  };
  tags: string[];
  keywords: string[];
  embedding?: number[];
  embeddingText: string;
  nearbyPlaces?: string[];
  relatedServices?: string[];
  partOfItinerary?: string[];
  isActive: boolean;
  isPremium: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  customFields?: Record<string, any>;
}

// Google Places API types
interface GoogleNearbySearchResponse {
  html_attributions: string[];
  results: GooglePlaceResult[];
  next_page_token?: string;
  status: string;
  error_message?: string;
}

interface GooglePlaceDetailsResponse {
  html_attributions: string[];
  result: GooglePlaceDetails;
  status: string;
  error_message?: string;
}

interface GooglePlaceResult {
  place_id: string;
  name: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  vicinity?: string;
  formatted_address?: string;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  photos?: GooglePlacePhoto[];
  business_status?: string;
}

interface GooglePlaceDetails extends GooglePlaceResult {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
  address_components?: {
    long_name: string;
    short_name: string;
    types: string[];
  }[];
  opening_hours?: {
    open_now?: boolean;
    periods?: {
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }[];
    weekday_text?: string[];
  };
  reviews?: {
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }[];
  editorial_summary?: {
    language: string;
    overview: string;
  };
  serves_vegetarian_food?: boolean;
  wheelchair_accessible_entrance?: boolean;
  reservable?: boolean;
  delivery?: boolean;
  dine_in?: boolean;
  takeout?: boolean;
  serves_breakfast?: boolean;
  serves_lunch?: boolean;
  serves_dinner?: boolean;
  serves_beer?: boolean;
  serves_wine?: boolean;
}

interface GooglePlacePhoto {
  photo_reference: string;
  height: number;
  width: number;
  html_attributions: string[];
}

interface SearchCategory {
  name: string;
  types: string[];
  keywords?: string[];
  knowledgeCategory: string;
  subcategory?: string;
}

interface SearchLocation {
  name: string;
  island: 'Grand Cayman' | 'Cayman Brac' | 'Little Cayman';
  lat: number;
  lng: number;
  radius: number;
}

interface ScraperConfig {
  apiKey: string;
  outputDir: string;
  cacheDir: string;
  requestsPerSecond: number;
  maxRetries: number;
  retryDelayMs: number;
  locations: SearchLocation[];
  categories: SearchCategory[];
  includePhotos: boolean;
  maxPhotosPerPlace: number;
  includeReviews: boolean;
  maxReviewsPerPlace: number;
  skipExisting: boolean;
  verbose: boolean;
}

interface ScrapedPlace {
  placeId: string;
  scrapedAt: string;
  source: 'google_places';
  name: string;
  types: string[];
  location: {
    address: string;
    lat: number;
    lng: number;
    district?: string;
    island: string;
    addressComponents?: any[];
  };
  contact: {
    phone?: string;
    internationalPhone?: string;
    website?: string;
    googleMapsUrl?: string;
  };
  business: {
    status?: string;
    priceLevel?: number;
    openingHours?: {
      isOpenNow?: boolean;
      periods?: any[];
      weekdayText?: string[];
    };
  };
  ratings: {
    googleRating?: number;
    totalReviews?: number;
  };
  media: {
    photos: {
      reference: string;
      url?: string;
      width: number;
      height: number;
    }[];
  };
  reviews?: {
    author: string;
    rating: number;
    text: string;
    time: number;
  }[];
  editorial?: {
    overview?: string;
  };
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
  categoryMapping: {
    primaryCategory: string;
    subcategory?: string;
    allCategories: string[];
  };
}

interface ScraperProgress {
  startedAt: string;
  lastUpdated: string;
  status: 'running' | 'paused' | 'completed' | 'error';
  totalLocations: number;
  completedLocations: number;
  currentLocation?: string;
  totalCategories: number;
  completedCategories: number;
  currentCategory?: string;
  totalPlacesFound: number;
  totalPlacesProcessed: number;
  errors: ScraperError[];
  processedPlaceIds: string[];
}

interface ScraperError {
  timestamp: string;
  type: 'api_error' | 'rate_limit' | 'network' | 'parse_error' | 'unknown';
  message: string;
  details?: any;
}

interface ScraperStats {
  runId: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  totalApiCalls: number;
  nearbySearchCalls: number;
  placeDetailsCalls: number;
  photoFetches: number;
  placesFound: number;
  placesNew: number;
  placesUpdated: number;
  placesSkipped: number;
  estimatedCost: {
    nearbySearch: number;
    placeDetails: number;
    photos: number;
    total: number;
  };
  byCategory: { [key: string]: { count: number; new: number; updated: number } };
  byLocation: { [key: string]: { count: number } };
  errorCount: number;
  rateLimitHits: number;
}

// ============ CONSTANTS ============

const PRICE_LEVEL_MAP: { [key: number]: PriceRange } = {
  0: '$',
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
};

const TYPE_TO_CATEGORY_MAP: { [key: string]: string } = {
  'lodging': 'hotel',
  'hotel': 'hotel',
  'resort': 'hotel',
  'restaurant': 'restaurant',
  'cafe': 'restaurant',
  'bar': 'bar',
  'night_club': 'nightlife',
  'tourist_attraction': 'attraction',
  'museum': 'attraction',
  'zoo': 'attraction',
  'aquarium': 'attraction',
  'golf_course': 'golf',
  'spa': 'spa_wellness',
  'gym': 'spa_wellness',
  'shopping_mall': 'shopping',
  'jewelry_store': 'shopping',
  'clothing_store': 'shopping',
  'car_rental': 'transport',
  'taxi_stand': 'transport',
  'bus_station': 'transport',
  'airport': 'transport',
  'bank': 'financial_services',
  'atm': 'financial_services',
  'insurance_agency': 'financial_services',
  'real_estate_agency': 'real_estate',
  'lawyer': 'legal_services',
  'hospital': 'emergency',
  'doctor': 'medical_vip',
  'pharmacy': 'emergency',
  'post_office': 'general_info',
  'police': 'emergency',
  'park': 'attraction',
  'marina': 'boat_charter',
};

interface DistrictBounds {
  name: string;
  island: 'Grand Cayman' | 'Cayman Brac' | 'Little Cayman';
  bounds: { north: number; south: number; east: number; west: number };
}

const CAYMAN_DISTRICTS: DistrictBounds[] = [
  { name: 'George Town', island: 'Grand Cayman', bounds: { north: 19.32, south: 19.26, east: -81.35, west: -81.42 } },
  { name: 'Seven Mile Beach', island: 'Grand Cayman', bounds: { north: 19.37, south: 19.32, east: -81.36, west: -81.42 } },
  { name: 'West Bay', island: 'Grand Cayman', bounds: { north: 19.42, south: 19.37, east: -81.36, west: -81.45 } },
  { name: 'Bodden Town', island: 'Grand Cayman', bounds: { north: 19.32, south: 19.26, east: -81.15, west: -81.25 } },
  { name: 'East End', island: 'Grand Cayman', bounds: { north: 19.35, south: 19.26, east: -81.05, west: -81.15 } },
  { name: 'North Side', island: 'Grand Cayman', bounds: { north: 19.38, south: 19.32, east: -81.15, west: -81.30 } },
  { name: 'Rum Point', island: 'Grand Cayman', bounds: { north: 19.38, south: 19.34, east: -81.23, west: -81.30 } },
  { name: 'Cayman Brac West', island: 'Cayman Brac', bounds: { north: 19.74, south: 19.68, east: -79.82, west: -79.92 } },
  { name: 'Cayman Brac East', island: 'Cayman Brac', bounds: { north: 19.74, south: 19.68, east: -79.72, west: -79.82 } },
  { name: 'Little Cayman', island: 'Little Cayman', bounds: { north: 19.70, south: 19.65, east: -79.95, west: -80.12 } },
];

function getDistrictFromCoords(lat: number, lng: number): { district: string; island: string } {
  for (const district of CAYMAN_DISTRICTS) {
    if (lat >= district.bounds.south && lat <= district.bounds.north &&
        lng >= district.bounds.west && lng <= district.bounds.east) {
      return { district: district.name, island: district.island };
    }
  }
  if (lat > 19.65 && lat < 19.75 && lng > -80.0 && lng < -79.7) {
    return { district: 'Cayman Brac', island: 'Cayman Brac' };
  }
  if (lat > 19.65 && lat < 19.70 && lng > -80.12 && lng < -79.95) {
    return { district: 'Little Cayman', island: 'Little Cayman' };
  }
  return { district: 'Grand Cayman', island: 'Grand Cayman' };
}

function generateNodeId(category: string, placeId: string): string {
  const prefix = category.replace(/_/g, '-').substring(0, 8);
  const suffix = placeId.substring(0, 12).replace(/[^a-zA-Z0-9]/g, '');
  return `${prefix}-gm-${suffix}`;
}

function buildPhotoUrl(photoReference: string, apiKey: string, maxWidth: number = 800): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
}

// ============ DEFAULT CONFIG ============

const DEFAULT_CONFIG: Omit<ScraperConfig, 'apiKey'> = {
  outputDir: path.join(PROJECT_ROOT, 'data', 'scraped-places'),
  cacheDir: path.join(PROJECT_ROOT, 'data', 'scraper-cache'),
  requestsPerSecond: 5,
  maxRetries: 3,
  retryDelayMs: 1000,
  locations: [
    { name: 'George Town Center', island: 'Grand Cayman', lat: 19.2866, lng: -81.3744, radius: 3000 },
    { name: 'George Town South', island: 'Grand Cayman', lat: 19.2700, lng: -81.3800, radius: 3000 },
    { name: 'Seven Mile Beach North', island: 'Grand Cayman', lat: 19.3500, lng: -81.3900, radius: 3000 },
    { name: 'Seven Mile Beach South', island: 'Grand Cayman', lat: 19.3200, lng: -81.3850, radius: 3000 },
    { name: 'West Bay', island: 'Grand Cayman', lat: 19.3800, lng: -81.4100, radius: 4000 },
    { name: 'Bodden Town', island: 'Grand Cayman', lat: 19.2800, lng: -81.2500, radius: 5000 },
    { name: 'East End', island: 'Grand Cayman', lat: 19.3100, lng: -81.1000, radius: 5000 },
    { name: 'North Side', island: 'Grand Cayman', lat: 19.3500, lng: -81.2500, radius: 5000 },
    { name: 'Rum Point Area', island: 'Grand Cayman', lat: 19.3600, lng: -81.2800, radius: 4000 },
    { name: 'Cayman Brac West', island: 'Cayman Brac', lat: 19.7100, lng: -79.8800, radius: 6000 },
    { name: 'Cayman Brac East', island: 'Cayman Brac', lat: 19.7100, lng: -79.7800, radius: 6000 },
    { name: 'Little Cayman', island: 'Little Cayman', lat: 19.6700, lng: -80.0500, radius: 8000 },
  ],
  categories: [
    { name: 'Hotels & Resorts', types: ['lodging', 'hotel'], keywords: ['resort', 'boutique hotel'], knowledgeCategory: 'hotel' },
    { name: 'Vacation Rentals', types: ['lodging'], keywords: ['villa rental', 'vacation rental', 'condo rental'], knowledgeCategory: 'villa_rental' },
    { name: 'Restaurants', types: ['restaurant', 'cafe'], keywords: ['fine dining', 'seafood restaurant'], knowledgeCategory: 'restaurant' },
    { name: 'Bars & Nightlife', types: ['bar', 'night_club'], keywords: ['beach bar', 'cocktail bar'], knowledgeCategory: 'bar' },
    { name: 'Diving & Snorkeling', types: [], keywords: ['scuba diving', 'snorkeling', 'dive shop', 'dive center'], knowledgeCategory: 'diving_snorkeling' },
    { name: 'Boat Charters', types: ['marina'], keywords: ['boat charter', 'yacht charter', 'fishing charter'], knowledgeCategory: 'boat_charter' },
    { name: 'Water Sports', types: [], keywords: ['water sports', 'jet ski', 'kayak rental', 'paddleboard'], knowledgeCategory: 'water_sports' },
    { name: 'Beaches', types: [], keywords: ['beach', 'public beach'], knowledgeCategory: 'beach' },
    { name: 'Tourist Attractions', types: ['tourist_attraction', 'museum', 'aquarium', 'zoo'], keywords: ['attraction', 'stingray city'], knowledgeCategory: 'attraction' },
    { name: 'Activities & Tours', types: ['travel_agency'], keywords: ['tours', 'excursion', 'adventure'], knowledgeCategory: 'activity' },
    { name: 'Golf', types: ['golf_course'], keywords: ['golf club'], knowledgeCategory: 'golf' },
    { name: 'Spas & Wellness', types: ['spa', 'gym'], keywords: ['spa', 'massage', 'wellness'], knowledgeCategory: 'spa_wellness' },
    { name: 'Shopping', types: ['shopping_mall', 'jewelry_store', 'clothing_store'], keywords: ['duty free', 'boutique'], knowledgeCategory: 'shopping' },
    { name: 'Car Rentals', types: ['car_rental'], keywords: ['car hire'], knowledgeCategory: 'transport', subcategory: 'car_rental' },
    { name: 'Taxi & Transport', types: ['taxi_stand', 'bus_station'], keywords: ['taxi service', 'private transfer'], knowledgeCategory: 'transport', subcategory: 'taxi' },
    { name: 'Hospitals & Clinics', types: ['hospital', 'doctor', 'health'], keywords: ['medical center', 'clinic'], knowledgeCategory: 'emergency', subcategory: 'medical' },
    { name: 'Pharmacies', types: ['pharmacy'], keywords: ['drugstore'], knowledgeCategory: 'emergency', subcategory: 'pharmacy' },
    { name: 'Banks & ATMs', types: ['bank', 'atm'], keywords: [], knowledgeCategory: 'financial_services', subcategory: 'banking' },
    { name: 'Insurance', types: ['insurance_agency'], keywords: ['insurance office'], knowledgeCategory: 'financial_services', subcategory: 'insurance' },
    { name: 'Public Services', types: ['post_office', 'local_government_office'], keywords: ['government office'], knowledgeCategory: 'general_info', subcategory: 'public_services' },
  ],
  includePhotos: true,
  maxPhotosPerPlace: 5,
  includeReviews: true,
  maxReviewsPerPlace: 5,
  skipExisting: true,
  verbose: true,
};

// ============ HELPER FUNCTIONS ============

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class RateLimiter {
  private requestTimes: number[] = [];
  private requestsPerSecond: number;

  constructor(requestsPerSecond: number) {
    this.requestsPerSecond = requestsPerSecond;
  }

  async throttle(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 1000;
    this.requestTimes = this.requestTimes.filter(t => t > windowStart);
    if (this.requestTimes.length >= this.requestsPerSecond) {
      const oldestInWindow = this.requestTimes[0];
      const waitTime = oldestInWindow + 1000 - now;
      if (waitTime > 0) {
        await sleep(waitTime);
      }
    }
    this.requestTimes.push(Date.now());
  }
}

class Logger {
  private verbose: boolean;
  private logFile: string | null;

  constructor(verbose: boolean, logFile?: string) {
    this.verbose = verbose;
    this.logFile = logFile || null;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  private write(message: string): void {
    console.log(message);
    if (this.logFile) {
      fs.appendFileSync(this.logFile, message + '\n');
    }
  }

  info(message: string): void { this.write(this.formatMessage('INFO', message)); }
  debug(message: string): void { if (this.verbose) this.write(this.formatMessage('DEBUG', message)); }
  warn(message: string): void { this.write(this.formatMessage('WARN', message)); }
  error(message: string): void { this.write(this.formatMessage('ERROR', message)); }
  success(message: string): void { this.write(this.formatMessage('SUCCESS', message)); }
}

// ============ GOOGLE PLACES API CLIENT ============

class GooglePlacesClient {
  private apiKey: string;
  private rateLimiter: RateLimiter;
  private maxRetries: number;
  private retryDelayMs: number;
  private logger: Logger;

  constructor(apiKey: string, rateLimiter: RateLimiter, maxRetries: number, retryDelayMs: number, logger: Logger) {
    this.apiKey = apiKey;
    this.rateLimiter = rateLimiter;
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
    this.logger = logger;
  }

  private async makeRequest<T>(url: string): Promise<T | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.rateLimiter.throttle();
        const response = await fetch(url);
        const data = await response.json() as T & { status?: string; error_message?: string };

        if (data.status === 'OVER_QUERY_LIMIT') {
          this.logger.warn(`Rate limit hit, waiting ${this.retryDelayMs * attempt}ms...`);
          await sleep(this.retryDelayMs * attempt);
          continue;
        }

        if (data.status === 'REQUEST_DENIED') {
          this.logger.error(`Request denied: ${data.error_message}`);
          return null;
        }

        return data;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Request failed (attempt ${attempt}/${this.maxRetries}): ${lastError.message}`);
        if (attempt < this.maxRetries) {
          await sleep(this.retryDelayMs * attempt);
        }
      }
    }

    this.logger.error(`All retries failed: ${lastError?.message}`);
    return null;
  }

  async nearbySearch(lat: number, lng: number, radius: number, type?: string, keyword?: string, pageToken?: string): Promise<GoogleNearbySearchResponse | null> {
    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${this.apiKey}`;
    if (type) url += `&type=${type}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
    if (pageToken) url += `&pagetoken=${pageToken}`;
    return this.makeRequest<GoogleNearbySearchResponse>(url);
  }

  async getPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
    const fields = [
      'place_id', 'name', 'formatted_address', 'geometry', 'types', 'rating', 'user_ratings_total',
      'price_level', 'opening_hours', 'formatted_phone_number', 'international_phone_number',
      'website', 'url', 'address_components', 'photos', 'reviews', 'business_status',
      'editorial_summary', 'serves_beer', 'serves_wine', 'serves_breakfast', 'serves_lunch',
      'serves_dinner', 'serves_vegetarian_food', 'wheelchair_accessible_entrance', 'reservable',
      'delivery', 'dine_in', 'takeout',
    ].join(',');
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${this.apiKey}`;
    const response = await this.makeRequest<GooglePlaceDetailsResponse>(url);
    return response?.result || null;
  }

  getPhotoUrl(photoReference: string, maxWidth: number = 800): string {
    return buildPhotoUrl(photoReference, this.apiKey, maxWidth);
  }
}

// ============ SCRAPER CLASS ============

class GoogleMapsScraper {
  private config: ScraperConfig;
  private client: GooglePlacesClient;
  private logger: Logger;
  private progress: ScraperProgress;
  private stats: ScraperStats;
  private processedPlaceIds: Set<string> = new Set();
  private scrapedPlaces: Map<string, ScrapedPlace> = new Map();

  constructor(config: ScraperConfig) {
    this.config = config;
    this.logger = new Logger(config.verbose, path.join(config.cacheDir, 'scraper.log'));

    const rateLimiter = new RateLimiter(config.requestsPerSecond);
    this.client = new GooglePlacesClient(config.apiKey, rateLimiter, config.maxRetries, config.retryDelayMs, this.logger);

    this.progress = {
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      status: 'running',
      totalLocations: config.locations.length,
      completedLocations: 0,
      totalCategories: config.categories.length,
      completedCategories: 0,
      totalPlacesFound: 0,
      totalPlacesProcessed: 0,
      errors: [],
      processedPlaceIds: [],
    };

    this.stats = {
      runId: `run-${Date.now()}`,
      startedAt: new Date().toISOString(),
      totalApiCalls: 0,
      nearbySearchCalls: 0,
      placeDetailsCalls: 0,
      photoFetches: 0,
      placesFound: 0,
      placesNew: 0,
      placesUpdated: 0,
      placesSkipped: 0,
      estimatedCost: { nearbySearch: 0, placeDetails: 0, photos: 0, total: 0 },
      byCategory: {},
      byLocation: {},
      errorCount: 0,
      rateLimitHits: 0,
    };
  }

  private ensureDirectories(): void {
    [this.config.outputDir, this.config.cacheDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.debug(`Created directory: ${dir}`);
      }
    });
  }

  private loadExistingData(): void {
    const outputFile = path.join(this.config.outputDir, 'scraped-places.json');
    if (fs.existsSync(outputFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(outputFile, 'utf-8')) as ScrapedPlace[];
        data.forEach(place => {
          this.scrapedPlaces.set(place.placeId, place);
          this.processedPlaceIds.add(place.placeId);
        });
        this.logger.info(`Loaded ${data.length} existing places`);
      } catch (error) {
        this.logger.warn(`Failed to load existing data: ${(error as Error).message}`);
      }
    }

    const progressFile = path.join(this.config.cacheDir, 'progress.json');
    if (fs.existsSync(progressFile)) {
      try {
        const savedProgress = JSON.parse(fs.readFileSync(progressFile, 'utf-8')) as ScraperProgress;
        if (savedProgress.status !== 'completed') {
          this.progress = savedProgress;
          savedProgress.processedPlaceIds.forEach(id => this.processedPlaceIds.add(id));
          this.logger.info(`Resuming from previous run: ${savedProgress.completedLocations}/${savedProgress.totalLocations} locations`);
        }
      } catch (error) {
        this.logger.warn(`Failed to load progress: ${(error as Error).message}`);
      }
    }
  }

  private saveProgress(): void {
    this.progress.lastUpdated = new Date().toISOString();
    this.progress.processedPlaceIds = Array.from(this.processedPlaceIds);
    const progressFile = path.join(this.config.cacheDir, 'progress.json');
    fs.writeFileSync(progressFile, JSON.stringify(this.progress, null, 2));
  }

  private saveData(): void {
    const places = Array.from(this.scrapedPlaces.values());
    const outputFile = path.join(this.config.outputDir, 'scraped-places.json');
    fs.writeFileSync(outputFile, JSON.stringify(places, null, 2));
    this.logger.info(`Saved ${places.length} places to ${outputFile}`);

    const statsFile = path.join(this.config.cacheDir, 'stats.json');
    fs.writeFileSync(statsFile, JSON.stringify(this.stats, null, 2));
  }

  private transformToScrapedPlace(basic: GooglePlaceResult, details: GooglePlaceDetails | null, category: SearchCategory, location: SearchLocation): ScrapedPlace {
    const lat = basic.geometry.location.lat;
    const lng = basic.geometry.location.lng;
    const { district, island } = getDistrictFromCoords(lat, lng);

    return {
      placeId: basic.place_id,
      scrapedAt: new Date().toISOString(),
      source: 'google_places',
      name: basic.name,
      types: basic.types || [],
      location: {
        address: details?.formatted_address || basic.vicinity || '',
        lat,
        lng,
        district: district || location.name,
        island: island || location.island,
        addressComponents: details?.address_components,
      },
      contact: {
        phone: details?.formatted_phone_number,
        internationalPhone: details?.international_phone_number,
        website: details?.website,
        googleMapsUrl: details?.url,
      },
      business: {
        status: basic.business_status,
        priceLevel: basic.price_level ?? details?.price_level,
        openingHours: details?.opening_hours ? {
          isOpenNow: details.opening_hours.open_now,
          periods: details.opening_hours.periods,
          weekdayText: details.opening_hours.weekday_text,
        } : undefined,
      },
      ratings: {
        googleRating: basic.rating ?? details?.rating,
        totalReviews: basic.user_ratings_total ?? details?.user_ratings_total,
      },
      media: {
        photos: (details?.photos || basic.photos || []).slice(0, this.config.maxPhotosPerPlace).map(p => ({
          reference: p.photo_reference,
          url: this.client.getPhotoUrl(p.photo_reference),
          width: p.width,
          height: p.height,
        })),
      },
      reviews: this.config.includeReviews && details?.reviews
        ? details.reviews.slice(0, this.config.maxReviewsPerPlace).map(r => ({
            author: r.author_name,
            rating: r.rating,
            text: r.text,
            time: r.time,
          }))
        : undefined,
      editorial: details?.editorial_summary ? { overview: details.editorial_summary.overview } : undefined,
      attributes: {
        servesVegetarian: details?.serves_vegetarian_food,
        wheelchair: details?.wheelchair_accessible_entrance,
        reservable: details?.reservable,
        delivery: details?.delivery,
        dineIn: details?.dine_in,
        takeout: details?.takeout,
        servesBreakfast: details?.serves_breakfast,
        servesLunch: details?.serves_lunch,
        servesDinner: details?.serves_dinner,
        servesBeer: details?.serves_beer,
        servesWine: details?.serves_wine,
      },
      categoryMapping: {
        primaryCategory: category.knowledgeCategory,
        subcategory: category.subcategory,
        allCategories: this.inferCategories(basic.types || []),
      },
    };
  }

  private inferCategories(types: string[]): string[] {
    const categories = new Set<string>();
    for (const type of types) {
      if (TYPE_TO_CATEGORY_MAP[type]) {
        categories.add(TYPE_TO_CATEGORY_MAP[type]);
      }
    }
    return Array.from(categories);
  }

  private async processSearch(location: SearchLocation, category: SearchCategory, type?: string, keyword?: string): Promise<void> {
    let pageToken: string | undefined;
    let pageCount = 0;

    do {
      this.stats.nearbySearchCalls++;
      this.stats.totalApiCalls++;

      const response = await this.client.nearbySearch(location.lat, location.lng, location.radius, type, keyword, pageToken);

      if (!response || response.status !== 'OK') {
        if (response?.status === 'ZERO_RESULTS') {
          this.logger.debug(`No results for ${type || keyword} at ${location.name}`);
        } else {
          this.addError('api_error', `Search failed: ${response?.status}`, { location: location.name, type, keyword });
        }
        break;
      }

      for (const place of response.results) {
        if (this.processedPlaceIds.has(place.place_id)) {
          this.stats.placesSkipped++;
          continue;
        }

        this.progress.totalPlacesFound++;
        this.stats.placesFound++;

        this.stats.placeDetailsCalls++;
        this.stats.totalApiCalls++;
        const details = await this.client.getPlaceDetails(place.place_id);

        const scraped = this.transformToScrapedPlace(place, details, category, location);

        if (this.scrapedPlaces.has(place.place_id)) {
          this.stats.placesUpdated++;
        } else {
          this.stats.placesNew++;
        }

        this.scrapedPlaces.set(place.place_id, scraped);
        this.processedPlaceIds.add(place.place_id);
        this.progress.totalPlacesProcessed++;

        if (!this.stats.byCategory[category.name]) {
          this.stats.byCategory[category.name] = { count: 0, new: 0, updated: 0 };
        }
        this.stats.byCategory[category.name].count++;
        this.stats.byCategory[category.name].new++;

        if (!this.stats.byLocation[location.name]) {
          this.stats.byLocation[location.name] = { count: 0 };
        }
        this.stats.byLocation[location.name].count++;

        this.logger.debug(`Processed: ${scraped.name} (${category.name})`);
      }

      pageToken = response.next_page_token;
      pageCount++;

      if (pageToken) {
        await sleep(2000);
      }

      if (this.progress.totalPlacesProcessed % 50 === 0) {
        this.saveProgress();
        this.saveData();
      }

    } while (pageToken && pageCount < 3);
  }

  private async processCategory(location: SearchLocation, category: SearchCategory): Promise<void> {
    this.logger.info(`Searching ${category.name} at ${location.name}...`);
    this.progress.currentCategory = category.name;

    for (const type of category.types) {
      await this.processSearch(location, category, type, undefined);
    }

    for (const keyword of category.keywords || []) {
      await this.processSearch(location, category, undefined, keyword);
    }
  }

  private addError(type: ScraperError['type'], message: string, details?: any): void {
    const error: ScraperError = { timestamp: new Date().toISOString(), type, message, details };
    this.progress.errors.push(error);
    this.stats.errorCount++;
    this.logger.error(`${type}: ${message}`);
  }

  private calculateCosts(): void {
    this.stats.estimatedCost.nearbySearch = this.stats.nearbySearchCalls * 0.032;
    this.stats.estimatedCost.placeDetails = this.stats.placeDetailsCalls * 0.025;
    this.stats.estimatedCost.photos = this.stats.photoFetches * 0.007;
    this.stats.estimatedCost.total = this.stats.estimatedCost.nearbySearch + this.stats.estimatedCost.placeDetails + this.stats.estimatedCost.photos;
  }

  async run(): Promise<void> {
    this.logger.info('====================================');
    this.logger.info('GOOGLE MAPS SCRAPER - Starting');
    this.logger.info('====================================');

    this.ensureDirectories();
    this.loadExistingData();

    try {
      for (let locIdx = this.progress.completedLocations; locIdx < this.config.locations.length; locIdx++) {
        const location = this.config.locations[locIdx];
        this.progress.currentLocation = location.name;

        this.logger.info(`\n[${locIdx + 1}/${this.config.locations.length}] Location: ${location.name} (${location.island})`);

        for (let catIdx = 0; catIdx < this.config.categories.length; catIdx++) {
          const category = this.config.categories[catIdx];
          await this.processCategory(location, category);
        }

        this.progress.completedLocations = locIdx + 1;
        this.saveProgress();
        this.saveData();
      }

      this.progress.status = 'completed';
      this.stats.completedAt = new Date().toISOString();
      this.stats.durationMs = Date.now() - new Date(this.stats.startedAt).getTime();
      this.calculateCosts();

      this.saveProgress();
      this.saveData();

      await this.exportToKnowledgeBase();
      this.printSummary();

    } catch (error) {
      this.progress.status = 'error';
      this.addError('unknown', (error as Error).message, { stack: (error as Error).stack });
      this.saveProgress();
      throw error;
    }
  }

  async exportToKnowledgeBase(): Promise<void> {
    this.logger.info('\nExporting to Knowledge Base format...');

    const knowledgeNodes: KnowledgeNode[] = [];
    for (const scraped of this.scrapedPlaces.values()) {
      const node = this.transformToKnowledgeNode(scraped);
      knowledgeNodes.push(node);
    }

    const outputFile = path.join(this.config.outputDir, 'google-maps-knowledge.ts');
    const content = `// ============================================
// ISLE AI - GOOGLE MAPS SCRAPED KNOWLEDGE BASE
// Auto-generated on ${new Date().toISOString()}
// Total places: ${knowledgeNodes.length}
// ============================================

import { KnowledgeNode } from '../../types/chatbot';

export const GOOGLE_MAPS_KNOWLEDGE: KnowledgeNode[] = ${JSON.stringify(knowledgeNodes, null, 2)};

export default GOOGLE_MAPS_KNOWLEDGE;
`;

    fs.writeFileSync(outputFile, content);
    this.logger.success(`Exported ${knowledgeNodes.length} knowledge nodes to ${outputFile}`);

    const jsonFile = path.join(this.config.outputDir, 'google-maps-knowledge.json');
    fs.writeFileSync(jsonFile, JSON.stringify(knowledgeNodes, null, 2));
  }

  private transformToKnowledgeNode(scraped: ScrapedPlace): KnowledgeNode {
    const priceLevel = scraped.business.priceLevel;
    const priceRange: PriceRange = priceLevel !== undefined ? PRICE_LEVEL_MAP[priceLevel] || '$$' : '$$';

    let description = scraped.editorial?.overview || '';
    if (scraped.reviews && scraped.reviews.length > 0) {
      const topReview = scraped.reviews[0];
      if (!description && topReview.text) {
        description = topReview.text.substring(0, 300) + (topReview.text.length > 300 ? '...' : '');
      }
    }
    if (!description) {
      description = `${scraped.name} located in ${scraped.location.district}, ${scraped.location.island}.`;
    }

    let openingHours: KnowledgeNode['business']['openingHours'] | undefined;
    if (scraped.business.openingHours?.weekdayText) {
      openingHours = {
        raw: scraped.business.openingHours.weekdayText.join('; '),
        isOpen: scraped.business.openingHours.isOpenNow,
        formattedDisplay: scraped.business.openingHours.weekdayText.join('\n'),
      };
    }

    const tags: string[] = [...scraped.types.slice(0, 10)];
    if (scraped.attributes.servesVegetarian) tags.push('vegetarian-friendly');
    if (scraped.attributes.wheelchair) tags.push('wheelchair-accessible');
    if (scraped.attributes.delivery) tags.push('delivery');
    if (scraped.attributes.takeout) tags.push('takeout');
    if (scraped.attributes.reservable) tags.push('reservations');

    const keywords: string[] = [
      scraped.name.toLowerCase(),
      scraped.location.district?.toLowerCase() || '',
      scraped.location.island.toLowerCase(),
      scraped.categoryMapping.primaryCategory,
    ].filter(Boolean);

    const embeddingText = [
      scraped.name,
      scraped.categoryMapping.primaryCategory,
      scraped.location.district || '',
      scraped.location.island,
      description.substring(0, 200),
      tags.join(' '),
    ].join(' ');

    return {
      id: generateNodeId(scraped.categoryMapping.primaryCategory, scraped.placeId),
      category: scraped.categoryMapping.primaryCategory as KnowledgeCategory,
      subcategory: scraped.categoryMapping.subcategory,
      name: scraped.name,
      description,
      shortDescription: description.substring(0, 150) + (description.length > 150 ? '...' : ''),
      location: {
        address: scraped.location.address,
        district: scraped.location.district || 'Grand Cayman',
        island: scraped.location.island,
        latitude: scraped.location.lat,
        longitude: scraped.location.lng,
        googlePlaceId: scraped.placeId,
      },
      contact: {
        phone: scraped.contact.phone,
        website: scraped.contact.website,
      },
      media: {
        thumbnail: scraped.media.photos[0]?.url || 'https://placehold.co/800x600?text=No+Image',
        images: scraped.media.photos.map(p => p.url).filter(Boolean) as string[],
      },
      business: {
        priceRange,
        currency: 'KYD',
        openingHours,
        reservationRequired: scraped.attributes.reservable,
      },
      ratings: {
        overall: scraped.ratings.googleRating || 0,
        reviewCount: scraped.ratings.totalReviews || 0,
        googleRating: scraped.ratings.googleRating,
      },
      tags,
      keywords,
      embeddingText,
      isActive: scraped.business.status !== 'CLOSED_PERMANENTLY',
      isPremium: false,
      isFeatured: false,
      createdAt: scraped.scrapedAt,
      updatedAt: scraped.scrapedAt,
      createdBy: 'google-maps-scraper',
      customFields: {
        googlePlaceTypes: scraped.types,
        scrapedAt: scraped.scrapedAt,
        googleMapsUrl: scraped.contact.googleMapsUrl,
        attributes: scraped.attributes,
      },
    };
  }

  private printSummary(): void {
    const duration = this.stats.durationMs ? Math.round(this.stats.durationMs / 1000 / 60) : 0;

    this.logger.info('\n====================================');
    this.logger.info('SCRAPER SUMMARY');
    this.logger.info('====================================');
    this.logger.info(`Duration: ${duration} minutes`);
    this.logger.info(`Total API Calls: ${this.stats.totalApiCalls}`);
    this.logger.info(`  - Nearby Search: ${this.stats.nearbySearchCalls}`);
    this.logger.info(`  - Place Details: ${this.stats.placeDetailsCalls}`);
    this.logger.info(`Places Found: ${this.stats.placesFound}`);
    this.logger.info(`  - New: ${this.stats.placesNew}`);
    this.logger.info(`  - Updated: ${this.stats.placesUpdated}`);
    this.logger.info(`  - Skipped: ${this.stats.placesSkipped}`);
    this.logger.info(`Errors: ${this.stats.errorCount}`);
    this.logger.info(`\nEstimated Cost: $${this.stats.estimatedCost.total.toFixed(2)}`);
    this.logger.info(`  - Nearby Search: $${this.stats.estimatedCost.nearbySearch.toFixed(2)}`);
    this.logger.info(`  - Place Details: $${this.stats.estimatedCost.placeDetails.toFixed(2)}`);

    this.logger.info('\nBy Category:');
    for (const [cat, stats] of Object.entries(this.stats.byCategory)) {
      this.logger.info(`  - ${cat}: ${stats.count} places`);
    }

    this.logger.info('\nBy Location:');
    for (const [loc, stats] of Object.entries(this.stats.byLocation)) {
      this.logger.info(`  - ${loc}: ${stats.count} places`);
    }

    this.logger.success('\nScraping complete!');
  }
}

// ============ MAIN ============

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const resume = args.includes('--resume');

  // Handle dry run first (doesn't need API key)
  if (dryRun) {
    console.log('====================================');
    console.log('GOOGLE MAPS SCRAPER - DRY RUN');
    console.log('====================================');
    console.log('');
    console.log('No API calls will be made.');
    console.log('');
    console.log('Configuration:');
    console.log(`  Locations: ${DEFAULT_CONFIG.locations.length}`);
    DEFAULT_CONFIG.locations.forEach(loc => console.log(`    - ${loc.name} (${loc.island})`));
    console.log('');
    console.log(`  Categories: ${DEFAULT_CONFIG.categories.length}`);
    DEFAULT_CONFIG.categories.forEach(cat => console.log(`    - ${cat.name} -> ${cat.knowledgeCategory}`));
    console.log('');
    const totalSearches = DEFAULT_CONFIG.locations.length * DEFAULT_CONFIG.categories.reduce((acc, cat) => acc + cat.types.length + (cat.keywords?.length || 0), 0);
    console.log(`  Estimated API calls:`);
    console.log(`    - Nearby Search: ~${totalSearches} (3 pages max each = ${totalSearches * 3} max)`);
    console.log(`    - Place Details: ~${totalSearches * 20} (estimated 20 results per search)`);
    console.log(`    - Total: ~${totalSearches * 3 + totalSearches * 20} API calls`);
    console.log('');
    console.log('  Estimated cost (worst case): $' + ((totalSearches * 3 * 0.032) + (totalSearches * 20 * 0.025)).toFixed(2));
    console.log('');
    console.log('To run the actual scraper:');
    console.log('  1. Add GOOGLE_PLACES_API_KEY to your .env file');
    console.log('  2. Run: npm run scrape:google-maps');
    return;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('ERROR: GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_API_KEY environment variable is required');
    console.error('');
    console.error('To get an API key:');
    console.error('1. Go to https://console.cloud.google.com/');
    console.error('2. Create or select a project');
    console.error('3. Enable the Places API');
    console.error('4. Create credentials (API key)');
    console.error('5. Add to .env: GOOGLE_PLACES_API_KEY=your_key_here');
    process.exit(1);
  }

  const config: ScraperConfig = {
    ...DEFAULT_CONFIG,
    apiKey,
    verbose,
    skipExisting: !resume ? false : DEFAULT_CONFIG.skipExisting,
  };

  const scraper = new GoogleMapsScraper(config);
  await scraper.run();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
