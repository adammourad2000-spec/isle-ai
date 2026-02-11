#!/usr/bin/env npx ts-node --esm

/**
 * ============================================================================
 * ISLE AI - Google Places API Enrichment System
 * ============================================================================
 *
 * Production-grade enrichment system for the Cayman Islands knowledge base.
 * Uses the NEW Google Places API (places.googleapis.com) for comprehensive data.
 *
 * FEATURES:
 * - Searches Google Places API to match existing places
 * - Enriches with ALL available Google Places data
 * - Rate limiting with configurable QPS
 * - Progress tracking with resume capability
 * - Incremental saves (never lose data on crash)
 * - Automatic backup of original data
 * - Comprehensive error handling with retry logic
 * - Detailed logging for debugging
 *
 * USAGE:
 *   npm run enrich:google-places              # Full enrichment
 *   npm run enrich:google-places:dry-run      # Preview without API calls
 *   npm run enrich:google-places:resume       # Resume from last checkpoint
 *   npm run enrich:google-places -- --limit=50    # Limit to 50 places
 *   npm run enrich:google-places -- --category=restaurant  # Filter by category
 *
 * ENVIRONMENT:
 *   GOOGLE_PLACES_API_KEY - Required API key with Places API enabled
 *
 * COST ESTIMATION:
 *   - Text Search: $32 per 1000 requests
 *   - Place Details: $17 per 1000 requests (Basic)
 *   - Place Photos: $7 per 1000 requests
 *   - For 972 places: ~$48 total (worst case with all requests)
 *
 * @author Isle AI Team
 * @version 2.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// ============================================================================
// ES MODULE SETUP
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ============================================================================
// TYPE DEFINITIONS - Google Places API (NEW)
// ============================================================================

/**
 * Google Places API (New) response types
 * Based on: https://developers.google.com/maps/documentation/places/web-service/reference
 */

interface GooglePlacePhoto {
  name: string; // Format: places/{place_id}/photos/{photo_reference}
  widthPx: number;
  heightPx: number;
  authorAttributions: Array<{
    displayName: string;
    uri: string;
    photoUri: string;
  }>;
}

interface GoogleOpeningHours {
  openNow?: boolean;
  periods?: Array<{
    open: { day: number; hour: number; minute: number };
    close?: { day: number; hour: number; minute: number };
  }>;
  weekdayDescriptions?: string[];
  secondaryHoursType?: string;
  specialDays?: Array<{ date: { year: number; month: number; day: number } }>;
}

interface GoogleReview {
  name: string;
  relativePublishTimeDescription: string;
  rating: number;
  text: { text: string; languageCode: string };
  originalText: { text: string; languageCode: string };
  authorAttribution: {
    displayName: string;
    uri: string;
    photoUri: string;
  };
  publishTime: string;
}

interface GooglePlaceResult {
  // Core identifiers
  id: string; // Place ID
  name: string; // places/{place_id}

  // Display info
  displayName: { text: string; languageCode: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;

  // Location
  location?: { latitude: number; longitude: number };
  viewport?: {
    low: { latitude: number; longitude: number };
    high: { latitude: number; longitude: number };
  };

  // Address components
  addressComponents?: Array<{
    longText: string;
    shortText: string;
    types: string[];
    languageCode: string;
  }>;
  plusCode?: { globalCode: string; compoundCode: string };
  adrFormatAddress?: string;

  // Types and categories
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: { text: string; languageCode: string };

  // Business info
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  priceLevel?: 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE';
  priceRange?: { startPrice?: { currencyCode: string; units: string }; endPrice?: { currencyCode: string; units: string } };

  // Contact info
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;

  // Hours
  regularOpeningHours?: GoogleOpeningHours;
  currentOpeningHours?: GoogleOpeningHours;
  currentSecondaryOpeningHours?: GoogleOpeningHours[];

  // Ratings and reviews
  rating?: number;
  userRatingCount?: number;
  reviews?: GoogleReview[];

  // Media
  photos?: GooglePlacePhoto[];

  // Editorial
  editorialSummary?: { text: string; languageCode: string };

  // Reservations and services
  reservable?: boolean;
  servesBeer?: boolean;
  servesWine?: boolean;
  servesBrunch?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  servesVegetarianFood?: boolean;
  delivery?: boolean;
  dineIn?: boolean;
  takeout?: boolean;
  curbsidePickup?: boolean;
  outdoorSeating?: boolean;
  liveMusic?: boolean;
  menuForChildren?: boolean;
  goodForChildren?: boolean;
  goodForGroups?: boolean;
  goodForWatchingSports?: boolean;
  allowsDogs?: boolean;
  restroom?: boolean;
  paymentOptions?: {
    acceptsCreditCards?: boolean;
    acceptsDebitCards?: boolean;
    acceptsCashOnly?: boolean;
    acceptsNfc?: boolean;
  };
  parkingOptions?: {
    freeParkingLot?: boolean;
    paidParkingLot?: boolean;
    freeStreetParking?: boolean;
    paidStreetParking?: boolean;
    valetParking?: boolean;
    freeGarageParking?: boolean;
    paidGarageParking?: boolean;
  };
  accessibilityOptions?: {
    wheelchairAccessibleParking?: boolean;
    wheelchairAccessibleEntrance?: boolean;
    wheelchairAccessibleRestroom?: boolean;
    wheelchairAccessibleSeating?: boolean;
  };

  // Attribution
  attributions?: Array<{ provider: string; providerUri: string }>;

  // UTC offset
  utcOffsetMinutes?: number;
}

// ============================================================================
// TYPE DEFINITIONS - Knowledge Base
// ============================================================================

interface KnowledgeBasePlace {
  id: string;
  name: string;
  slug: string;
  category: string;
  subcategory?: string;
  description?: string;
  shortDescription?: string;
  highlights?: string[];
  location: {
    island: string;
    area: string;
    district: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
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
    priceRange: string | null;
    priceFrom: number | null;
    priceTo: number | null;
    currency: string;
    hours: {
      display: string | null;
      isOpen24Hours: boolean;
      schedule: any | null;
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

// ============================================================================
// TYPE DEFINITIONS - Enriched Data
// ============================================================================

interface GooglePlacesEnrichment {
  // Core Google data
  googlePlaceId: string;
  googleMapsUrl: string;
  matchConfidence: number; // 0-100 based on name/location matching

  // Precise location
  coordinates: {
    lat: number;
    lng: number;
  };
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };

  // Address components
  formattedAddress: string;
  shortAddress?: string;
  plusCode?: string;
  addressComponents?: Array<{
    longName: string;
    shortName: string;
    types: string[];
  }>;

  // Business info
  businessStatus: 'operational' | 'closed_temporarily' | 'closed_permanently' | 'unknown';
  priceLevel?: number; // 0-4
  priceRange?: { min?: number; max?: number; currency: string };

  // Contact
  phone?: string;
  phoneInternational?: string;
  website?: string;

  // Ratings
  rating?: number;
  reviewCount?: number;
  reviews?: Array<{
    rating: number;
    text: string;
    author: string;
    time: string;
  }>;

  // Hours
  openingHours?: {
    isOpen24Hours: boolean;
    weekdayText: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };

  // Photos
  photos?: Array<{
    reference: string;
    url: string;
    width: number;
    height: number;
    attribution?: string;
  }>;

  // Categories
  types: string[];
  primaryType?: string;

  // Editorial
  editorialSummary?: string;

  // Services & amenities
  amenities?: {
    reservable?: boolean;
    delivery?: boolean;
    dineIn?: boolean;
    takeout?: boolean;
    outdoorSeating?: boolean;
    servesAlcohol?: boolean;
    goodForGroups?: boolean;
    goodForChildren?: boolean;
    wheelchairAccessible?: boolean;
    acceptsCreditCards?: boolean;
    freeParking?: boolean;
  };

  // Metadata
  enrichedAt: string;
  apiVersion: string;
}

interface EnrichedPlace extends KnowledgeBasePlace {
  googleEnrichment?: GooglePlacesEnrichment;
}

// ============================================================================
// TYPE DEFINITIONS - Progress & Stats
// ============================================================================

interface EnrichmentProgress {
  version: string;
  startedAt: string;
  lastUpdatedAt: string;
  lastProcessedIndex: number;
  processedIds: string[];
  failedIds: string[];
  skippedIds: string[];
  totalPlaces: number;
  currentPhase: 'initializing' | 'processing' | 'completed' | 'paused' | 'failed';
  errorLog: Array<{
    placeId: string;
    error: string;
    timestamp: string;
    retryCount: number;
  }>;
}

interface EnrichmentStats {
  totalPlaces: number;
  processed: number;
  enriched: number;
  skipped: number;
  failed: number;
  alreadyEnriched: number;

  // Data improvements
  coordinatesUpdated: number;
  phonesAdded: number;
  websitesAdded: number;
  hoursAdded: number;
  photosAdded: number;
  ratingsUpdated: number;
  descriptionsImproved: number;

  // API usage
  searchApiCalls: number;
  detailsApiCalls: number;
  photoApiCalls: number;
  totalApiCalls: number;

  // Cost estimation (in USD)
  estimatedCost: number;

  // Timing
  startTime: number;
  endTime?: number;
  avgTimePerPlace: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // API Settings
  API_BASE_URL: 'https://places.googleapis.com/v1',
  API_VERSION: 'v1',

  // Rate limiting (Google default is 600 QPM for Places API)
  REQUESTS_PER_SECOND: 5, // Conservative to avoid rate limits
  RATE_LIMIT_MS: 200,
  RETRY_DELAYS: [1000, 2000, 5000, 10000], // Exponential backoff
  MAX_RETRIES: 4,

  // Data settings
  MAX_PHOTOS_PER_PLACE: 10,
  MAX_REVIEWS_PER_PLACE: 5,
  PHOTO_MAX_WIDTH: 1200,
  PHOTO_MAX_HEIGHT: 800,

  // File paths
  INPUT_FILE: path.join(PROJECT_ROOT, 'data', 'unified-knowledge-base.json'),
  OUTPUT_FILE: path.join(PROJECT_ROOT, 'data', 'enriched-knowledge-base.json'),
  BACKUP_DIR: path.join(PROJECT_ROOT, 'data', 'backups'),
  PROGRESS_FILE: path.join(PROJECT_ROOT, 'data', 'google-places-enrichment-progress.json'),
  STATS_FILE: path.join(PROJECT_ROOT, 'data', 'google-places-enrichment-stats.json'),
  LOG_FILE: path.join(PROJECT_ROOT, 'data', 'google-places-enrichment.log'),

  // Search settings
  SEARCH_RADIUS_METERS: 500, // Search within 500m of known coordinates
  MIN_MATCH_CONFIDENCE: 60, // Minimum confidence to accept a match

  // Incremental save interval
  SAVE_INTERVAL: 10, // Save every N places

  // Fields to request from Google Places API (NEW)
  PLACE_FIELDS: [
    // Basic
    'id',
    'displayName',
    'formattedAddress',
    'shortFormattedAddress',
    'addressComponents',
    'plusCode',
    'location',
    'viewport',
    'googleMapsUri',

    // Types
    'types',
    'primaryType',
    'primaryTypeDisplayName',

    // Business
    'businessStatus',
    'priceLevel',
    'priceRange',

    // Contact
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'websiteUri',

    // Hours
    'regularOpeningHours',

    // Ratings & Reviews
    'rating',
    'userRatingCount',
    'reviews',

    // Photos
    'photos',

    // Editorial
    'editorialSummary',

    // Services
    'reservable',
    'delivery',
    'dineIn',
    'takeout',
    'outdoorSeating',
    'servesBeer',
    'servesWine',
    'goodForGroups',
    'goodForChildren',
    'allowsDogs',
    'paymentOptions',
    'parkingOptions',
    'accessibilityOptions'
  ],

  // Cost per 1000 requests (USD)
  COST_PER_1000: {
    textSearch: 32,
    placeDetails: 17,
    photos: 7
  }
};

// ============================================================================
// LOGGING UTILITY
// ============================================================================

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class Logger {
  private logFile: string;
  private verbose: boolean;

  constructor(logFile: string, verbose: boolean = false) {
    this.logFile = logFile;
    this.verbose = verbose;

    // Ensure log directory exists
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  private write(level: LogLevel, message: string): void {
    const formatted = this.formatMessage(level, message);

    // Write to file
    fs.appendFileSync(this.logFile, formatted + '\n');

    // Console output based on level
    if (level === 'ERROR') {
      console.error(formatted);
    } else if (level === 'WARN') {
      console.warn(formatted);
    } else if (level === 'INFO' || this.verbose) {
      console.log(formatted);
    }
  }

  debug(message: string): void {
    this.write('DEBUG', message);
  }

  info(message: string): void {
    this.write('INFO', message);
  }

  warn(message: string): void {
    this.write('WARN', message);
  }

  error(message: string, error?: Error): void {
    let fullMessage = message;
    if (error) {
      fullMessage += ` | Error: ${error.message}`;
      if (error.stack) {
        fullMessage += `\n${error.stack}`;
      }
    }
    this.write('ERROR', fullMessage);
  }
}

// ============================================================================
// GOOGLE PLACES API CLIENT (NEW API)
// ============================================================================

class GooglePlacesClient {
  private apiKey: string;
  private logger: Logger;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;

  constructor(apiKey: string, logger: Logger) {
    this.apiKey = apiKey;
    this.logger = logger;
  }

  private async rateLimitedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Enforce rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < CONFIG.RATE_LIMIT_MS) {
      await this.sleep(CONFIG.RATE_LIMIT_MS - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;

    return fetch(url, options);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<any> {
    try {
      const response = await this.rateLimitedFetch(url, options);

      // Handle rate limiting
      if (response.status === 429) {
        if (retryCount < CONFIG.MAX_RETRIES) {
          const delay = CONFIG.RETRY_DELAYS[retryCount] || 10000;
          this.logger.warn(`Rate limited. Waiting ${delay}ms before retry ${retryCount + 1}/${CONFIG.MAX_RETRIES}`);
          await this.sleep(delay);
          return this.fetchWithRetry(url, options, retryCount + 1);
        }
        throw new Error('Rate limit exceeded after max retries');
      }

      // Handle other errors
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API error ${response.status}: ${errorBody}`);
      }

      return response.json();
    } catch (error) {
      if (retryCount < CONFIG.MAX_RETRIES && (error as Error).message.includes('fetch')) {
        const delay = CONFIG.RETRY_DELAYS[retryCount] || 5000;
        this.logger.warn(`Network error. Retrying in ${delay}ms...`);
        await this.sleep(delay);
        return this.fetchWithRetry(url, options, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Search for a place using Text Search (New)
   */
  async searchPlace(
    name: string,
    location?: { lat: number; lng: number }
  ): Promise<GooglePlaceResult | null> {
    const url = `${CONFIG.API_BASE_URL}/places:searchText`;

    // Build request body
    const body: any = {
      textQuery: `${name} Cayman Islands`,
      languageCode: 'en',
      maxResultCount: 5
    };

    // Use locationBias if we have coordinates, otherwise use locationRestriction
    // Google API only allows ONE of these, not both
    if (location && location.lat && location.lng) {
      // Use location bias for more precise matching near known coordinates
      body.locationBias = {
        circle: {
          center: {
            latitude: location.lat,
            longitude: location.lng
          },
          radius: CONFIG.SEARCH_RADIUS_METERS
        }
      };
    } else {
      // Fall back to Cayman Islands region restriction
      body.locationRestriction = {
        rectangle: {
          low: { latitude: 19.2, longitude: -81.5 },
          high: { latitude: 19.8, longitude: -79.7 }
        }
      };
    }

    this.logger.debug(`Searching for: "${name}"`);

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating'
        },
        body: JSON.stringify(body)
      });

      if (response.places && response.places.length > 0) {
        // Find best match based on name similarity
        const bestMatch = this.findBestMatch(name, response.places, location);
        if (bestMatch) {
          this.logger.debug(`Found match: ${bestMatch.displayName?.text} (confidence: ${bestMatch.matchConfidence}%)`);
          return bestMatch;
        }
      }

      this.logger.debug(`No match found for: "${name}"`);
      return null;
    } catch (error) {
      this.logger.error(`Search failed for "${name}"`, error as Error);
      return null;
    }
  }

  /**
   * Get detailed place information
   */
  async getPlaceDetails(placeId: string): Promise<GooglePlaceResult | null> {
    const url = `${CONFIG.API_BASE_URL}/places/${placeId}`;

    this.logger.debug(`Getting details for place: ${placeId}`);

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': CONFIG.PLACE_FIELDS.join(',')
        }
      });

      return response;
    } catch (error) {
      this.logger.error(`Failed to get details for ${placeId}`, error as Error);
      return null;
    }
  }

  /**
   * Get photo URL from photo name
   */
  getPhotoUrl(photoName: string, maxWidth: number = CONFIG.PHOTO_MAX_WIDTH, maxHeight: number = CONFIG.PHOTO_MAX_HEIGHT): string {
    // New API format: https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=400&maxWidthPx=400&key=API_KEY
    return `${CONFIG.API_BASE_URL}/${photoName}/media?maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}&key=${this.apiKey}&skipHttpRedirect=true`;
  }

  /**
   * Resolve photo URL to actual image URL
   */
  async resolvePhotoUrl(photoName: string): Promise<string | null> {
    const url = this.getPhotoUrl(photoName);

    try {
      const response = await this.fetchWithRetry(url);
      // The response contains the actual photo URL
      if (response.photoUri) {
        return response.photoUri;
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to resolve photo URL for ${photoName}`, error as Error);
      return null;
    }
  }

  /**
   * Find best matching place from search results
   */
  private findBestMatch(
    searchName: string,
    places: GooglePlaceResult[],
    knownLocation?: { lat: number; lng: number }
  ): (GooglePlaceResult & { matchConfidence: number }) | null {
    const normalizedSearch = this.normalizeName(searchName);

    let bestMatch: (GooglePlaceResult & { matchConfidence: number }) | null = null;
    let bestScore = 0;

    for (const place of places) {
      const placeName = place.displayName?.text || '';
      const normalizedPlace = this.normalizeName(placeName);

      // Calculate name similarity (0-100)
      const nameSimilarity = this.calculateSimilarity(normalizedSearch, normalizedPlace);

      // Calculate location proximity score if we have coordinates
      let locationScore = 50; // Default neutral score
      if (knownLocation && place.location) {
        const distance = this.calculateDistance(
          knownLocation.lat,
          knownLocation.lng,
          place.location.latitude,
          place.location.longitude
        );
        // Score based on distance (100 if within 50m, 0 if more than 1km)
        locationScore = Math.max(0, 100 - (distance / 10));
      }

      // Combined score (weight name more than location)
      const totalScore = (nameSimilarity * 0.7) + (locationScore * 0.3);

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMatch = { ...place, matchConfidence: Math.round(totalScore) };
      }
    }

    // Only return if confidence is above threshold
    if (bestMatch && bestMatch.matchConfidence >= CONFIG.MIN_MATCH_CONFIDENCE) {
      return bestMatch;
    }

    return null;
  }

  /**
   * Normalize a name for comparison
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 100;

    const distance = this.levenshteinDistance(longer, shorter);
    return Math.round(((longer.length - distance) / longer.length) * 100);
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  getRequestCount(): number {
    return this.requestCount;
  }
}

// ============================================================================
// ENRICHMENT ENGINE
// ============================================================================

class GooglePlacesEnricher {
  private client: GooglePlacesClient;
  private logger: Logger;
  private stats: EnrichmentStats;
  private progress: EnrichmentProgress;
  private places: KnowledgeBasePlace[] = [];
  private enrichedPlaces: Map<string, EnrichedPlace> = new Map();
  private dryRun: boolean;

  constructor(apiKey: string, logger: Logger, dryRun: boolean = false) {
    this.client = new GooglePlacesClient(apiKey, logger);
    this.logger = logger;
    this.dryRun = dryRun;

    this.stats = this.initializeStats();
    this.progress = this.initializeProgress();
  }

  private initializeStats(): EnrichmentStats {
    return {
      totalPlaces: 0,
      processed: 0,
      enriched: 0,
      skipped: 0,
      failed: 0,
      alreadyEnriched: 0,
      coordinatesUpdated: 0,
      phonesAdded: 0,
      websitesAdded: 0,
      hoursAdded: 0,
      photosAdded: 0,
      ratingsUpdated: 0,
      descriptionsImproved: 0,
      searchApiCalls: 0,
      detailsApiCalls: 0,
      photoApiCalls: 0,
      totalApiCalls: 0,
      estimatedCost: 0,
      startTime: Date.now(),
      avgTimePerPlace: 0
    };
  }

  private initializeProgress(): EnrichmentProgress {
    return {
      version: '2.0.0',
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      lastProcessedIndex: -1,
      processedIds: [],
      failedIds: [],
      skippedIds: [],
      totalPlaces: 0,
      currentPhase: 'initializing',
      errorLog: []
    };
  }

  /**
   * Load knowledge base from file
   */
  loadKnowledgeBase(): void {
    this.logger.info(`Loading knowledge base from: ${CONFIG.INPUT_FILE}`);

    if (!fs.existsSync(CONFIG.INPUT_FILE)) {
      throw new Error(`Knowledge base not found: ${CONFIG.INPUT_FILE}`);
    }

    const content = fs.readFileSync(CONFIG.INPUT_FILE, 'utf-8');
    this.places = JSON.parse(content);
    this.stats.totalPlaces = this.places.length;
    this.progress.totalPlaces = this.places.length;

    this.logger.info(`Loaded ${this.places.length} places from knowledge base`);
  }

  /**
   * Create backup of original data
   */
  createBackup(): void {
    // Ensure backup directory exists
    if (!fs.existsSync(CONFIG.BACKUP_DIR)) {
      fs.mkdirSync(CONFIG.BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(CONFIG.BACKUP_DIR, `unified-knowledge-base-${timestamp}.json`);

    fs.copyFileSync(CONFIG.INPUT_FILE, backupPath);
    this.logger.info(`Created backup: ${backupPath}`);
  }

  /**
   * Load existing progress (for resume)
   */
  loadProgress(): boolean {
    if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
      const content = fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf-8');
      this.progress = JSON.parse(content);
      this.logger.info(`Loaded progress: ${this.progress.processedIds.length} places already processed`);
      return true;
    }
    return false;
  }

  /**
   * Load existing enriched data (for resume)
   */
  loadEnrichedData(): void {
    if (fs.existsSync(CONFIG.OUTPUT_FILE)) {
      const content = fs.readFileSync(CONFIG.OUTPUT_FILE, 'utf-8');
      const enrichedArray: EnrichedPlace[] = JSON.parse(content);
      for (const place of enrichedArray) {
        this.enrichedPlaces.set(place.id, place);
      }
      this.logger.info(`Loaded ${this.enrichedPlaces.size} previously enriched places`);
    }
  }

  /**
   * Save progress incrementally
   */
  saveProgress(): void {
    this.progress.lastUpdatedAt = new Date().toISOString();
    fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
  }

  /**
   * Save enriched data incrementally
   */
  saveEnrichedData(): void {
    const enrichedArray = Array.from(this.enrichedPlaces.values());
    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(enrichedArray, null, 2));
  }

  /**
   * Save statistics
   */
  saveStats(): void {
    this.stats.endTime = Date.now();
    this.stats.totalApiCalls = this.stats.searchApiCalls + this.stats.detailsApiCalls + this.stats.photoApiCalls;

    // Calculate estimated cost
    this.stats.estimatedCost =
      (this.stats.searchApiCalls / 1000) * CONFIG.COST_PER_1000.textSearch +
      (this.stats.detailsApiCalls / 1000) * CONFIG.COST_PER_1000.placeDetails +
      (this.stats.photoApiCalls / 1000) * CONFIG.COST_PER_1000.photos;

    fs.writeFileSync(CONFIG.STATS_FILE, JSON.stringify(this.stats, null, 2));
  }

  /**
   * Convert Google price level to our format
   */
  private convertPriceLevel(priceLevel?: string): string | null {
    const mapping: Record<string, string> = {
      'PRICE_LEVEL_FREE': 'Free',
      'PRICE_LEVEL_INEXPENSIVE': '$',
      'PRICE_LEVEL_MODERATE': '$$',
      'PRICE_LEVEL_EXPENSIVE': '$$$',
      'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$'
    };
    return priceLevel ? mapping[priceLevel] || null : null;
  }

  /**
   * Convert Google business status to our format
   */
  private convertBusinessStatus(status?: string): 'operational' | 'closed_temporarily' | 'closed_permanently' | 'unknown' {
    const mapping: Record<string, 'operational' | 'closed_temporarily' | 'closed_permanently'> = {
      'OPERATIONAL': 'operational',
      'CLOSED_TEMPORARILY': 'closed_temporarily',
      'CLOSED_PERMANENTLY': 'closed_permanently'
    };
    return status ? mapping[status] || 'unknown' : 'unknown';
  }

  /**
   * Enrich a single place with Google data
   */
  async enrichPlace(place: KnowledgeBasePlace): Promise<EnrichedPlace> {
    const enriched: EnrichedPlace = { ...place };

    // Skip if already enriched with Google data
    if (place.location.googlePlaceId && this.enrichedPlaces.has(place.id)) {
      const existing = this.enrichedPlaces.get(place.id);
      if (existing?.googleEnrichment) {
        this.stats.alreadyEnriched++;
        return existing;
      }
    }

    // Get coordinates if available
    const coords = place.location.coordinates;

    // Search for the place
    this.stats.searchApiCalls++;
    const searchResult = await this.client.searchPlace(
      place.name,
      coords ? { lat: coords.lat, lng: coords.lng } : undefined
    );

    if (!searchResult) {
      this.stats.failed++;
      return enriched;
    }

    // Get detailed information
    this.stats.detailsApiCalls++;
    const details = await this.client.getPlaceDetails(searchResult.id);

    if (!details) {
      this.stats.failed++;
      return enriched;
    }

    // Build enrichment data
    const enrichment: GooglePlacesEnrichment = {
      googlePlaceId: details.id,
      googleMapsUrl: details.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${details.id}`,
      matchConfidence: (searchResult as any).matchConfidence || 0,

      coordinates: {
        lat: details.location?.latitude || coords?.lat || 0,
        lng: details.location?.longitude || coords?.lng || 0
      },

      formattedAddress: details.formattedAddress || place.location.address || '',
      shortAddress: details.shortFormattedAddress,
      plusCode: details.plusCode?.globalCode,

      businessStatus: this.convertBusinessStatus(details.businessStatus),

      types: details.types || [],
      primaryType: details.primaryType,

      enrichedAt: new Date().toISOString(),
      apiVersion: CONFIG.API_VERSION
    };

    // Add viewport if available
    if (details.viewport) {
      enrichment.viewport = {
        northeast: { lat: details.viewport.high.latitude, lng: details.viewport.high.longitude },
        southwest: { lat: details.viewport.low.latitude, lng: details.viewport.low.longitude }
      };
    }

    // Add address components
    if (details.addressComponents) {
      enrichment.addressComponents = details.addressComponents.map(c => ({
        longName: c.longText,
        shortName: c.shortText,
        types: c.types
      }));
    }

    // Add price level
    if (details.priceLevel) {
      const priceLevelMap: Record<string, number> = {
        'PRICE_LEVEL_FREE': 0,
        'PRICE_LEVEL_INEXPENSIVE': 1,
        'PRICE_LEVEL_MODERATE': 2,
        'PRICE_LEVEL_EXPENSIVE': 3,
        'PRICE_LEVEL_VERY_EXPENSIVE': 4
      };
      enrichment.priceLevel = priceLevelMap[details.priceLevel];
    }

    // Add contact info
    if (details.nationalPhoneNumber || details.internationalPhoneNumber) {
      enrichment.phone = details.nationalPhoneNumber;
      enrichment.phoneInternational = details.internationalPhoneNumber;
      if (!place.contact.phone) {
        this.stats.phonesAdded++;
      }
    }

    if (details.websiteUri) {
      enrichment.website = details.websiteUri;
      if (!place.contact.website) {
        this.stats.websitesAdded++;
      }
    }

    // Add ratings
    if (details.rating !== undefined) {
      enrichment.rating = details.rating;
      enrichment.reviewCount = details.userRatingCount;
      this.stats.ratingsUpdated++;
    }

    // Add reviews (limited)
    if (details.reviews && details.reviews.length > 0) {
      enrichment.reviews = details.reviews.slice(0, CONFIG.MAX_REVIEWS_PER_PLACE).map(r => ({
        rating: r.rating,
        text: r.text?.text || '',
        author: r.authorAttribution?.displayName || 'Anonymous',
        time: r.publishTime
      }));
    }

    // Add opening hours
    if (details.regularOpeningHours) {
      const hours = details.regularOpeningHours;
      enrichment.openingHours = {
        isOpen24Hours: hours.periods?.length === 1 &&
          hours.periods[0].open?.hour === 0 &&
          !hours.periods[0].close,
        weekdayText: hours.weekdayDescriptions || []
      };

      if (hours.periods) {
        enrichment.openingHours.periods = hours.periods.map(p => ({
          open: {
            day: p.open.day,
            time: `${String(p.open.hour).padStart(2, '0')}:${String(p.open.minute).padStart(2, '0')}`
          },
          close: p.close ? {
            day: p.close.day,
            time: `${String(p.close.hour).padStart(2, '0')}:${String(p.close.minute).padStart(2, '0')}`
          } : undefined
        }));
      }

      if (!place.business.hours.display) {
        this.stats.hoursAdded++;
      }
    }

    // Add photos
    if (details.photos && details.photos.length > 0) {
      enrichment.photos = [];

      for (const photo of details.photos.slice(0, CONFIG.MAX_PHOTOS_PER_PLACE)) {
        // Extract photo reference from name (format: places/{place_id}/photos/{photo_reference})
        const photoRef = photo.name;

        // Build direct photo URL
        const photoUrl = `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=${CONFIG.PHOTO_MAX_WIDTH}&maxHeightPx=${CONFIG.PHOTO_MAX_HEIGHT}&key=${process.env.GOOGLE_PLACES_API_KEY}`;

        enrichment.photos.push({
          reference: photoRef,
          url: photoUrl,
          width: photo.widthPx,
          height: photo.heightPx,
          attribution: photo.authorAttributions?.[0]?.displayName
        });

        this.stats.photoApiCalls++;
      }

      if (!place.media.images || place.media.images.length === 0) {
        this.stats.photosAdded++;
      }
    }

    // Add editorial summary
    if (details.editorialSummary?.text) {
      enrichment.editorialSummary = details.editorialSummary.text;
      this.stats.descriptionsImproved++;
    }

    // Add amenities
    enrichment.amenities = {
      reservable: details.reservable,
      delivery: details.delivery,
      dineIn: details.dineIn,
      takeout: details.takeout,
      outdoorSeating: details.outdoorSeating,
      servesAlcohol: details.servesBeer || details.servesWine,
      goodForGroups: details.goodForGroups,
      goodForChildren: details.goodForChildren,
      wheelchairAccessible: details.accessibilityOptions?.wheelchairAccessibleEntrance,
      acceptsCreditCards: details.paymentOptions?.acceptsCreditCards,
      freeParking: details.parkingOptions?.freeParkingLot || details.parkingOptions?.freeStreetParking
    };

    // Update coordinates if we got better precision
    if (details.location && enrichment.matchConfidence >= 80) {
      const newCoords = { lat: details.location.latitude, lng: details.location.longitude };
      if (!coords || (
        Math.abs(newCoords.lat - coords.lat) > 0.0001 ||
        Math.abs(newCoords.lng - coords.lng) > 0.0001
      )) {
        this.stats.coordinatesUpdated++;
      }
    }

    // Attach enrichment to place
    enriched.googleEnrichment = enrichment;

    // Also update the main place fields with Google data
    enriched.location.googlePlaceId = details.id;

    if (enrichment.coordinates) {
      enriched.location.coordinates = enrichment.coordinates;
    }

    if (enrichment.phone && !enriched.contact.phone) {
      enriched.contact.phone = enrichment.phoneInternational || enrichment.phone;
    }

    if (enrichment.website && !enriched.contact.website) {
      enriched.contact.website = enrichment.website;
    }

    if (enrichment.rating !== undefined) {
      enriched.ratings.googleRating = enrichment.rating;
      if (!enriched.ratings.overall || enrichment.rating > enriched.ratings.overall) {
        enriched.ratings.overall = enrichment.rating;
      }
      if (enrichment.reviewCount) {
        enriched.ratings.reviewCount = enrichment.reviewCount;
      }
    }

    if (enrichment.openingHours?.weekdayText?.length) {
      enriched.business.hours.display = enrichment.openingHours.weekdayText.join(', ');
      enriched.business.hours.isOpen24Hours = enrichment.openingHours.isOpen24Hours;
    }

    if (enrichment.photos && enrichment.photos.length > 0) {
      // Don't replace existing good photos, but add Google photos
      const googlePhotoUrls = enrichment.photos.map(p => p.url);
      enriched.media.images = [...new Set([...googlePhotoUrls, ...enriched.media.images])];
      enriched.media.thumbnail = enriched.media.images[0];
    }

    // Update price range
    const googlePriceRange = this.convertPriceLevel(details.priceLevel);
    if (googlePriceRange && !enriched.business.priceRange) {
      enriched.business.priceRange = googlePriceRange;
    }

    // Update quality score
    enriched.quality = {
      score: this.calculateQualityScore(enriched),
      hasPhoto: !!(enriched.media.images && enriched.media.images.length > 0),
      hasPhone: !!enriched.contact.phone,
      hasWebsite: !!enriched.contact.website,
      hasDescription: !!(enriched.description && enriched.description.length > 50),
      hasHours: !!enriched.business.hours.display
    };

    enriched.updatedAt = new Date().toISOString();

    this.stats.enriched++;
    return enriched;
  }

  /**
   * Calculate quality score for a place
   */
  private calculateQualityScore(place: EnrichedPlace): number {
    let score = 0;
    const maxScore = 100;

    // Photos (25 points)
    if (place.media.images && place.media.images.length > 0) {
      score += Math.min(25, place.media.images.length * 5);
    }

    // Contact info (20 points)
    if (place.contact.phone) score += 10;
    if (place.contact.website) score += 10;

    // Description (15 points)
    if (place.description) {
      if (place.description.length > 200) score += 15;
      else if (place.description.length > 100) score += 10;
      else if (place.description.length > 50) score += 5;
    }

    // Hours (10 points)
    if (place.business.hours.display) score += 10;

    // Location (15 points)
    if (place.location.coordinates) score += 10;
    if (place.location.googlePlaceId) score += 5;

    // Ratings (15 points)
    if (place.ratings.overall) score += 10;
    if (place.ratings.reviewCount > 0) score += 5;

    return Math.min(maxScore, score);
  }

  /**
   * Main enrichment process
   */
  async run(options: {
    limit?: number;
    resume?: boolean;
    category?: string;
    verbose?: boolean;
  }): Promise<void> {
    const { limit, resume = false, category, verbose = false } = options;

    this.logger.info('========================================');
    this.logger.info('ISLE AI - Google Places Enrichment');
    this.logger.info('========================================');

    if (this.dryRun) {
      this.logger.info('MODE: Dry Run (no API calls will be made)');
    }

    // Load data
    this.loadKnowledgeBase();

    // Create backup
    if (!this.dryRun) {
      this.createBackup();
    }

    // Load existing progress if resuming
    if (resume) {
      this.loadProgress();
      this.loadEnrichedData();
    }

    // Filter places if category specified
    let placesToProcess = this.places;
    if (category) {
      placesToProcess = placesToProcess.filter(p =>
        p.category.toLowerCase() === category.toLowerCase()
      );
      this.logger.info(`Filtered to category "${category}": ${placesToProcess.length} places`);
    }

    // Apply limit
    if (limit && limit > 0) {
      placesToProcess = placesToProcess.slice(0, limit);
      this.logger.info(`Limited to ${limit} places`);
    }

    // Skip already processed places if resuming
    if (resume && this.progress.processedIds.length > 0) {
      const processedSet = new Set(this.progress.processedIds);
      const beforeCount = placesToProcess.length;
      placesToProcess = placesToProcess.filter(p => !processedSet.has(p.id));
      this.logger.info(`Skipping ${beforeCount - placesToProcess.length} already processed places`);
    }

    this.logger.info(`\nPlaces to process: ${placesToProcess.length}`);

    // Dry run analysis
    if (this.dryRun) {
      this.runDryRunAnalysis(placesToProcess);
      return;
    }

    // Start processing
    this.progress.currentPhase = 'processing';
    this.saveProgress();

    for (let i = 0; i < placesToProcess.length; i++) {
      const place = placesToProcess[i];
      const progressStr = `[${i + 1}/${placesToProcess.length}]`;

      try {
        this.logger.info(`${progressStr} Processing: ${place.name}`);

        const enriched = await this.enrichPlace(place);
        this.enrichedPlaces.set(place.id, enriched);

        this.progress.processedIds.push(place.id);
        this.progress.lastProcessedIndex = i;
        this.stats.processed++;

        // Calculate average time
        const elapsed = Date.now() - this.stats.startTime;
        this.stats.avgTimePerPlace = elapsed / (i + 1);

        // Estimate remaining time
        const remaining = placesToProcess.length - i - 1;
        const etaMs = remaining * this.stats.avgTimePerPlace;
        const etaMin = Math.round(etaMs / 60000);

        this.logger.info(`  -> Enriched (confidence: ${enriched.googleEnrichment?.matchConfidence || 0}%) | ETA: ${etaMin} min`);

        // Incremental save
        if ((i + 1) % CONFIG.SAVE_INTERVAL === 0) {
          this.saveEnrichedData();
          this.saveProgress();
          this.saveStats();
          this.logger.info(`  -> Checkpoint saved (${this.stats.enriched} enriched)`);
        }

      } catch (error) {
        this.logger.error(`Failed to process ${place.name}`, error as Error);
        this.progress.failedIds.push(place.id);
        this.progress.errorLog.push({
          placeId: place.id,
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
          retryCount: 0
        });
        this.stats.failed++;

        // Still save progress on error
        this.saveProgress();
      }
    }

    // Final save
    this.progress.currentPhase = 'completed';
    this.saveEnrichedData();
    this.saveProgress();
    this.saveStats();

    // Print summary
    this.printSummary();
  }

  /**
   * Run dry-run analysis
   */
  private runDryRunAnalysis(places: KnowledgeBasePlace[]): void {
    this.logger.info('\n========================================');
    this.logger.info('DRY RUN ANALYSIS');
    this.logger.info('========================================\n');

    // Analyze current data quality
    let missingCoords = 0;
    let missingPhone = 0;
    let missingWebsite = 0;
    let missingHours = 0;
    let missingPhotos = 0;
    let missingRating = 0;
    let alreadyHasGoogleId = 0;

    const categoryStats: Record<string, number> = {};

    for (const place of places) {
      // Category stats
      categoryStats[place.category] = (categoryStats[place.category] || 0) + 1;

      // Missing data stats
      if (!place.location.coordinates) missingCoords++;
      if (!place.contact.phone) missingPhone++;
      if (!place.contact.website) missingWebsite++;
      if (!place.business.hours.display) missingHours++;
      if (!place.media.images || place.media.images.length === 0) missingPhotos++;
      if (!place.ratings.overall) missingRating++;
      if (place.location.googlePlaceId) alreadyHasGoogleId++;
    }

    this.logger.info('CURRENT DATA QUALITY:');
    this.logger.info(`  Total places: ${places.length}`);
    this.logger.info(`  Already have Google Place ID: ${alreadyHasGoogleId}`);
    this.logger.info(`  Missing coordinates: ${missingCoords}`);
    this.logger.info(`  Missing phone: ${missingPhone}`);
    this.logger.info(`  Missing website: ${missingWebsite}`);
    this.logger.info(`  Missing hours: ${missingHours}`);
    this.logger.info(`  Missing photos: ${missingPhotos}`);
    this.logger.info(`  Missing rating: ${missingRating}`);

    this.logger.info('\nCATEGORY BREAKDOWN:');
    const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);
    for (const [category, count] of sortedCategories) {
      this.logger.info(`  ${category}: ${count}`);
    }

    // Estimate API calls
    const searchCalls = places.length - alreadyHasGoogleId;
    const detailsCalls = places.length;
    const photoCalls = places.length * CONFIG.MAX_PHOTOS_PER_PLACE; // Worst case

    const estimatedCost =
      (searchCalls / 1000) * CONFIG.COST_PER_1000.textSearch +
      (detailsCalls / 1000) * CONFIG.COST_PER_1000.placeDetails +
      (photoCalls / 1000) * CONFIG.COST_PER_1000.photos;

    this.logger.info('\nESTIMATED API USAGE:');
    this.logger.info(`  Text Search calls: ~${searchCalls}`);
    this.logger.info(`  Place Details calls: ~${detailsCalls}`);
    this.logger.info(`  Photo calls (max): ~${photoCalls}`);
    this.logger.info(`  Total API calls: ~${searchCalls + detailsCalls + photoCalls}`);

    this.logger.info('\nESTIMATED COST:');
    this.logger.info(`  Text Search: $${((searchCalls / 1000) * CONFIG.COST_PER_1000.textSearch).toFixed(2)}`);
    this.logger.info(`  Place Details: $${((detailsCalls / 1000) * CONFIG.COST_PER_1000.placeDetails).toFixed(2)}`);
    this.logger.info(`  Photos: $${((photoCalls / 1000) * CONFIG.COST_PER_1000.photos).toFixed(2)}`);
    this.logger.info(`  TOTAL (max): $${estimatedCost.toFixed(2)}`);

    this.logger.info('\nRun without --dry-run to start enrichment.');
    this.logger.info('Use --resume to continue from last checkpoint.');
  }

  /**
   * Print final summary
   */
  private printSummary(): void {
    const duration = (Date.now() - this.stats.startTime) / 1000;
    const durationMin = Math.floor(duration / 60);
    const durationSec = Math.round(duration % 60);

    this.logger.info('\n========================================');
    this.logger.info('ENRICHMENT COMPLETE');
    this.logger.info('========================================\n');

    this.logger.info('RESULTS:');
    this.logger.info(`  Total processed: ${this.stats.processed}`);
    this.logger.info(`  Successfully enriched: ${this.stats.enriched}`);
    this.logger.info(`  Already enriched: ${this.stats.alreadyEnriched}`);
    this.logger.info(`  Skipped: ${this.stats.skipped}`);
    this.logger.info(`  Failed: ${this.stats.failed}`);

    this.logger.info('\nIMPROVEMENTS MADE:');
    this.logger.info(`  Coordinates updated: ${this.stats.coordinatesUpdated}`);
    this.logger.info(`  Phones added: ${this.stats.phonesAdded}`);
    this.logger.info(`  Websites added: ${this.stats.websitesAdded}`);
    this.logger.info(`  Hours added: ${this.stats.hoursAdded}`);
    this.logger.info(`  Photos added: ${this.stats.photosAdded}`);
    this.logger.info(`  Ratings updated: ${this.stats.ratingsUpdated}`);
    this.logger.info(`  Descriptions improved: ${this.stats.descriptionsImproved}`);

    this.logger.info('\nAPI USAGE:');
    this.logger.info(`  Text Search calls: ${this.stats.searchApiCalls}`);
    this.logger.info(`  Place Details calls: ${this.stats.detailsApiCalls}`);
    this.logger.info(`  Photo calls: ${this.stats.photoApiCalls}`);
    this.logger.info(`  Total API calls: ${this.stats.totalApiCalls}`);
    this.logger.info(`  Estimated cost: $${this.stats.estimatedCost.toFixed(2)}`);

    this.logger.info('\nTIMING:');
    this.logger.info(`  Duration: ${durationMin}m ${durationSec}s`);
    this.logger.info(`  Avg time per place: ${Math.round(this.stats.avgTimePerPlace)}ms`);

    this.logger.info('\nOUTPUT FILES:');
    this.logger.info(`  Enriched data: ${CONFIG.OUTPUT_FILE}`);
    this.logger.info(`  Progress: ${CONFIG.PROGRESS_FILE}`);
    this.logger.info(`  Stats: ${CONFIG.STATS_FILE}`);
    this.logger.info(`  Log: ${CONFIG.LOG_FILE}`);
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse arguments
  const dryRun = args.includes('--dry-run');
  const resume = args.includes('--resume');
  const verbose = args.includes('--verbose');

  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  const categoryArg = args.find(a => a.startsWith('--category='));
  const category = categoryArg ? categoryArg.split('=')[1] : undefined;

  // Check for API key
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey && !dryRun) {
    console.error('ERROR: GOOGLE_PLACES_API_KEY environment variable not set');
    console.error('');
    console.error('To set up:');
    console.error('1. Go to https://console.cloud.google.com/apis/credentials');
    console.error('2. Create an API key with Places API (New) enabled');
    console.error('3. Add to .env: GOOGLE_PLACES_API_KEY=your_api_key_here');
    console.error('');
    console.error('Or run with --dry-run to preview without API calls');
    process.exit(1);
  }

  // Initialize logger
  const logger = new Logger(CONFIG.LOG_FILE, verbose);

  // Create enricher
  const enricher = new GooglePlacesEnricher(apiKey || 'dry-run-key', logger, dryRun);

  // Run enrichment
  try {
    await enricher.run({ limit, resume, category, verbose });
  } catch (error) {
    logger.error('Fatal error during enrichment', error as Error);
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
