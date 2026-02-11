/**
 * SerpAPI Service - Professional Data Engineering Module
 *
 * This service fetches and organizes data from SerpAPI for the Isle AI
 * travel concierge chatbot's RAG knowledge base.
 *
 * Features:
 * - Google Local/Maps searches for places
 * - Google Search for general information
 * - Google News for current events
 * - Image searches for visuals
 * - Intelligent caching to minimize API calls
 * - Data transformation to KnowledgeNode format
 */

const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Category mapping for SerpAPI results to KnowledgeNode categories
 * ENHANCED: Added VIP services, private aviation, financial services, etc.
 */
const CATEGORY_MAPPING = {
  // Accommodation
  'hotel': 'hotel',
  'hotels': 'hotel',
  'resort': 'hotel',
  'resorts': 'hotel',
  'lodging': 'hotel',
  'motel': 'hotel',
  'inn': 'hotel',
  'bed and breakfast': 'hotel',
  'vacation rental': 'villa_rental',
  'villa': 'villa_rental',
  'apartment': 'villa_rental',
  'condo': 'villa_rental',

  // Dining
  'restaurant': 'restaurant',
  'restaurants': 'restaurant',
  'cafe': 'restaurant',
  'coffee shop': 'restaurant',
  'bakery': 'restaurant',
  'fine dining': 'restaurant',
  'fast food': 'restaurant',
  'bar': 'bar',
  'pub': 'bar',
  'lounge': 'bar',
  'nightclub': 'nightlife',
  'club': 'nightlife',

  // Activities & Attractions
  'beach': 'beach',
  'beaches': 'beach',
  'diving': 'diving_snorkeling',
  'scuba': 'diving_snorkeling',
  'snorkeling': 'diving_snorkeling',
  'water sports': 'water_sports',
  'jet ski': 'water_sports',
  'kayak': 'water_sports',
  'paddleboard': 'water_sports',
  'boat': 'boat_charter',
  'yacht': 'boat_charter',
  'charter': 'boat_charter',
  'fishing': 'boat_charter',
  'tour': 'activity',
  'attraction': 'attraction',
  'museum': 'attraction',
  'park': 'attraction',
  'garden': 'attraction',
  'golf': 'golf',
  'spa': 'spa_wellness',
  'wellness': 'spa_wellness',
  'massage': 'spa_wellness',

  // Services
  'shopping': 'shopping',
  'store': 'shopping',
  'mall': 'shopping',
  'boutique': 'shopping',
  'transportation': 'transportation',
  'taxi': 'transportation',
  'car rental': 'transportation',
  'airport': 'transportation',
  'real estate': 'real_estate',
  'property': 'real_estate',

  // VIP & Premium Services (NEW)
  'private jet': 'private_jet',
  'jet charter': 'private_jet',
  'private aviation': 'private_jet',
  'aircraft charter': 'private_jet',
  'helicopter': 'private_jet',
  'air charter': 'private_jet',
  'fbo': 'private_jet',
  'executive aviation': 'private_jet',

  // Concierge & VIP Services
  'concierge': 'concierge',
  'vip service': 'concierge',
  'luxury service': 'concierge',
  'personal assistant': 'concierge',
  'butler service': 'concierge',
  'lifestyle management': 'concierge',
  'event planning': 'concierge',
  'wedding planner': 'concierge',

  // Premium Escort & Companion Services
  'escort service': 'vip_escort',
  'companion service': 'vip_escort',
  'travel companion': 'vip_escort',
  'executive escort': 'vip_escort',
  'vip hostess': 'vip_escort',
  'model escort': 'vip_escort',
  'luxury escort': 'vip_escort',
  'elite companion': 'vip_escort',

  // Financial Services
  'investment fund': 'financial_services',
  'hedge fund': 'financial_services',
  'private equity': 'financial_services',
  'wealth management': 'financial_services',
  'asset management': 'financial_services',
  'family office': 'financial_services',
  'trust services': 'financial_services',
  'corporate services': 'financial_services',
  'fund administration': 'financial_services',
  'banking': 'financial_services',
  'private banking': 'financial_services',
  'offshore': 'financial_services',
  'tax planning': 'financial_services',
  'legal services': 'legal_services',
  'law firm': 'legal_services',
  'attorney': 'legal_services',
  'corporate law': 'legal_services',

  // Luxury Lifestyle
  'luxury car': 'luxury_car_rental',
  'exotic car': 'luxury_car_rental',
  'supercar': 'luxury_car_rental',
  'bentley': 'luxury_car_rental',
  'rolls royce': 'luxury_car_rental',
  'ferrari': 'luxury_car_rental',
  'lamborghini': 'luxury_car_rental',
  'porsche': 'luxury_car_rental',

  // Superyacht
  'superyacht': 'superyacht',
  'mega yacht': 'superyacht',
  'luxury yacht': 'superyacht',
  'yacht crew': 'superyacht',
  'yacht management': 'superyacht',

  // Security & Protection
  'security service': 'security_services',
  'bodyguard': 'security_services',
  'executive protection': 'security_services',
  'close protection': 'security_services',
  'private security': 'security_services',

  // Medical & Wellness VIP
  'private clinic': 'medical_vip',
  'cosmetic surgery': 'medical_vip',
  'medical tourism': 'medical_vip',
  'executive health': 'medical_vip',
  'concierge medicine': 'medical_vip',

  // Default
  'default': 'attraction'
};

/**
 * Price range mapping based on price level
 */
const PRICE_RANGE_MAPPING = {
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
  5: '$$$$$'
};

/**
 * VIP Services price estimates for categories without standard pricing
 */
const VIP_PRICE_ESTIMATES = {
  private_jet: { from: 5000, to: 50000, range: '$$$$$', unit: '/hour' },
  superyacht: { from: 10000, to: 200000, range: '$$$$$', unit: '/day' },
  vip_escort: { from: 500, to: 5000, range: '$$$$', unit: '/engagement' },
  concierge: { from: 200, to: 2000, range: '$$$', unit: '/day' },
  financial_services: { from: 5000, to: 100000, range: '$$$$$', unit: '/setup' },
  legal_services: { from: 300, to: 1500, range: '$$$$', unit: '/hour' },
  security_services: { from: 500, to: 3000, range: '$$$$', unit: '/day' },
  luxury_car_rental: { from: 500, to: 5000, range: '$$$$', unit: '/day' },
  medical_vip: { from: 1000, to: 50000, range: '$$$$$', unit: '/procedure' }
};

/**
 * Airport codes for flight searches
 */
const CAYMAN_AIRPORTS = {
  'GCM': { name: 'Owen Roberts International Airport', city: 'George Town', island: 'Grand Cayman' },
  'CYB': { name: 'Charles Kirkconnell International Airport', city: 'Cayman Brac', island: 'Cayman Brac' },
  'LYB': { name: 'Edward Bodden Airfield', city: 'Little Cayman', island: 'Little Cayman' }
};

const POPULAR_FLIGHT_ORIGINS = [
  { code: 'MIA', city: 'Miami', country: 'USA' },
  { code: 'JFK', city: 'New York', country: 'USA' },
  { code: 'LAX', city: 'Los Angeles', country: 'USA' },
  { code: 'LHR', city: 'London', country: 'UK' },
  { code: 'YYZ', city: 'Toronto', country: 'Canada' },
  { code: 'ATL', city: 'Atlanta', country: 'USA' },
  { code: 'DFW', city: 'Dallas', country: 'USA' },
  { code: 'ORD', city: 'Chicago', country: 'USA' },
  { code: 'CLT', city: 'Charlotte', country: 'USA' },
  { code: 'DEN', city: 'Denver', country: 'USA' },
  { code: 'PTY', city: 'Panama City', country: 'Panama' },
  { code: 'BOG', city: 'Bogota', country: 'Colombia' },
  { code: 'HAV', city: 'Havana', country: 'Cuba' },
  { code: 'KIN', city: 'Kingston', country: 'Jamaica' }
];

/**
 * Generate cache key from request parameters
 */
function getCacheKey(type, params) {
  return `${type}:${JSON.stringify(params)}`;
}

/**
 * Get cached result if valid
 */
function getFromCache(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

/**
 * Store result in cache
 */
function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Make request to SerpAPI with timeout handling
 */
async function serpApiRequest(params, apiKey) {
  const url = new URL(SERPAPI_BASE_URL);
  url.searchParams.append('api_key', apiKey);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    console.log('[SerpAPI] Making request to:', url.toString().replace(apiKey, '***'));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'IsleAI/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SerpAPI request failed: ${response.status} - ${error}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('SerpAPI request timeout after 30 seconds');
    }
    throw error;
  }
}

/**
 * Detect category from place type or name
 */
function detectCategory(place) {
  const types = place.type?.toLowerCase() || '';
  const name = place.title?.toLowerCase() || '';
  const description = place.description?.toLowerCase() || '';
  const combined = `${types} ${name} ${description}`;

  for (const [keyword, category] of Object.entries(CATEGORY_MAPPING)) {
    if (combined.includes(keyword)) {
      return category;
    }
  }

  return 'attraction';
}

/**
 * Parse and standardize opening hours
 */
function parseOpeningHours(hoursData) {
  const standardized = {
    raw: null,
    isOpen: null,
    todayHours: null,
    schedule: {},
    formattedDisplay: null
  };

  if (!hoursData) return standardized;

  // Handle string format like "Open · Closes 10 pm" or "Closed · Opens 9 am"
  if (typeof hoursData === 'string') {
    standardized.raw = hoursData;

    // Check if open/closed
    if (hoursData.toLowerCase().includes('open')) {
      standardized.isOpen = true;
    } else if (hoursData.toLowerCase().includes('closed')) {
      standardized.isOpen = false;
    }

    // Extract closing time
    const closesMatch = hoursData.match(/closes?\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (closesMatch) {
      standardized.todayHours = { closes: closesMatch[1].trim() };
    }

    // Extract opening time
    const opensMatch = hoursData.match(/opens?\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (opensMatch) {
      standardized.todayHours = { ...standardized.todayHours, opens: opensMatch[1].trim() };
    }

    // Format display
    if (standardized.isOpen === true) {
      standardized.formattedDisplay = standardized.todayHours?.closes
        ? `Open now · Closes ${standardized.todayHours.closes}`
        : 'Open now';
    } else if (standardized.isOpen === false) {
      standardized.formattedDisplay = standardized.todayHours?.opens
        ? `Closed · Opens ${standardized.todayHours.opens}`
        : 'Closed';
    } else {
      standardized.formattedDisplay = hoursData;
    }
  }

  // Handle structured format from API
  if (typeof hoursData === 'object') {
    standardized.raw = JSON.stringify(hoursData);
    standardized.schedule = hoursData;

    // Try to determine if open now
    if (hoursData.is_open !== undefined) {
      standardized.isOpen = hoursData.is_open;
    }

    // Format display from schedule
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const today = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
    if (hoursData[today]) {
      standardized.todayHours = hoursData[today];
      standardized.formattedDisplay = `${today}: ${hoursData[today].open || '?'} - ${hoursData[today].close || '?'}`;
    }
  }

  return standardized;
}

/**
 * Parse and extract price information
 */
function parsePriceInfo(result, category) {
  const priceInfo = {
    priceRange: '$$',
    priceFrom: null,
    priceTo: null,
    pricePerUnit: null,
    currency: 'USD',
    priceDescription: null
  };

  // Extract from price string (e.g., "$50", "$100-200", "$$$$")
  if (result.price) {
    const priceStr = result.price;

    // Count dollar signs for range
    const dollarSigns = (priceStr.match(/\$/g) || []).length;
    if (dollarSigns >= 1 && dollarSigns <= 5) {
      priceInfo.priceRange = PRICE_RANGE_MAPPING[dollarSigns] || '$$';
    }

    // Extract numeric prices
    const priceNumbers = priceStr.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/g);
    if (priceNumbers && priceNumbers.length > 0) {
      const prices = priceNumbers.map(p => parseFloat(p.replace(/[$,]/g, '')));
      priceInfo.priceFrom = Math.min(...prices);
      if (prices.length > 1) {
        priceInfo.priceTo = Math.max(...prices);
      }
    }
  }

  // Extract from price_range object
  if (result.price_range) {
    priceInfo.priceFrom = result.price_range.low || priceInfo.priceFrom;
    priceInfo.priceTo = result.price_range.high || priceInfo.priceTo;
  }

  // Estimate based on category if no price found
  if (!priceInfo.priceFrom) {
    const categoryPriceEstimates = {
      hotel: { from: 200, to: 800, range: '$$$' },
      restaurant: { from: 30, to: 100, range: '$$' },
      bar: { from: 15, to: 50, range: '$$' },
      spa_wellness: { from: 100, to: 300, range: '$$$' },
      diving_snorkeling: { from: 80, to: 200, range: '$$' },
      boat_charter: { from: 500, to: 2000, range: '$$$$' },
      villa_rental: { from: 300, to: 1500, range: '$$$$' },
      beach: { from: 0, to: 0, range: '$' },
      attraction: { from: 20, to: 60, range: '$$' },
      activity: { from: 50, to: 150, range: '$$' },
      golf: { from: 150, to: 400, range: '$$$' },
      // VIP Services (NEW)
      private_jet: { from: 5000, to: 50000, range: '$$$$$' },
      superyacht: { from: 10000, to: 200000, range: '$$$$$' },
      vip_escort: { from: 500, to: 5000, range: '$$$$' },
      concierge: { from: 200, to: 2000, range: '$$$' },
      financial_services: { from: 5000, to: 100000, range: '$$$$$' },
      legal_services: { from: 300, to: 1500, range: '$$$$' },
      security_services: { from: 500, to: 3000, range: '$$$$' },
      luxury_car_rental: { from: 500, to: 5000, range: '$$$$' },
      medical_vip: { from: 1000, to: 50000, range: '$$$$$' }
    };

    const estimate = categoryPriceEstimates[category];
    if (estimate) {
      priceInfo.priceFrom = priceInfo.priceFrom || estimate.from;
      priceInfo.priceTo = priceInfo.priceTo || estimate.to;
      priceInfo.priceRange = priceInfo.priceRange || estimate.range;
      priceInfo.priceDescription = 'Estimated';
    }

    // Add VIP price unit info
    const vipEstimate = VIP_PRICE_ESTIMATES[category];
    if (vipEstimate && vipEstimate.unit) {
      priceInfo.pricePerUnit = vipEstimate.unit;
    }
  }

  // Generate price description
  if (priceInfo.priceFrom !== null) {
    if (priceInfo.priceFrom === 0) {
      priceInfo.priceDescription = 'Free';
    } else if (priceInfo.priceTo && priceInfo.priceTo !== priceInfo.priceFrom) {
      priceInfo.priceDescription = `$${priceInfo.priceFrom} - $${priceInfo.priceTo}`;
    } else {
      priceInfo.priceDescription = `From $${priceInfo.priceFrom}`;
    }

    // Add per unit info based on category
    const perUnitMap = {
      hotel: '/night',
      villa_rental: '/night',
      restaurant: '/person',
      boat_charter: '/trip',
      activity: '/person',
      diving_snorkeling: '/dive',
      golf: '/round'
    };
    if (perUnitMap[category]) {
      priceInfo.pricePerUnit = perUnitMap[category];
      priceInfo.priceDescription += ` ${perUnitMap[category]}`;
    }
  }

  return priceInfo;
}

/**
 * Transform SerpAPI local result to KnowledgeNode format
 * ENHANCED: Better price parsing and standardized hours
 */
function transformLocalResultToNode(result, searchQuery) {
  const category = detectCategory(result);
  const id = `serp-${result.place_id || result.data_id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // ENHANCED: Parse price information
  const priceInfo = parsePriceInfo(result, category);

  // Extract rating
  const rating = result.rating || 0;
  const reviewCount = result.reviews || 0;

  // Extract coordinates
  const latitude = result.gps_coordinates?.latitude || result.latitude || 19.3133;
  const longitude = result.gps_coordinates?.longitude || result.longitude || -81.2546;

  // ENHANCED: Parse opening hours
  const openingHours = parseOpeningHours(result.hours || result.operating_hours);

  // Build thumbnail URL
  const thumbnail = result.thumbnail || result.image ||
    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${result.photos?.[0]?.photo_reference || ''}&key=placeholder`;

  // Extract all available images
  const images = [];
  if (result.thumbnail) images.push(result.thumbnail);
  if (result.image) images.push(result.image);
  if (result.images) {
    result.images.forEach(img => {
      const imgUrl = img.link || img.url || img;
      if (imgUrl && !images.includes(imgUrl)) images.push(imgUrl);
    });
  }
  if (result.photos) {
    result.photos.forEach(photo => {
      if (photo.image) images.push(photo.image);
    });
  }

  return {
    id,
    category,
    subcategory: result.type || '',
    name: result.title || 'Unknown Place',
    description: result.description || result.snippet || `${result.title} located in the Cayman Islands.`,
    shortDescription: result.snippet || result.description?.substring(0, 150) || '',

    location: {
      address: result.address || '',
      district: result.neighborhood || extractDistrict(result.address),
      island: 'Grand Cayman',
      latitude,
      longitude,
      googlePlaceId: result.place_id || result.data_id || ''
    },

    contact: {
      phone: result.phone || '',
      website: result.website || result.link || '',
      bookingUrl: result.booking?.link || result.website || ''
    },

    media: {
      thumbnail,
      images: images.length > 0 ? images : [thumbnail],
      videos: []
    },

    business: {
      priceRange: priceInfo.priceRange,
      priceFrom: priceInfo.priceFrom,
      priceTo: priceInfo.priceTo,
      pricePerUnit: priceInfo.pricePerUnit,
      priceDescription: priceInfo.priceDescription,
      currency: priceInfo.currency,
      openingHours: openingHours,
      reservationRequired: result.reservations === true,
      serviceOptions: result.service_options || {}
    },

    ratings: {
      overall: rating,
      reviewCount,
      googleRating: rating,
      sources: [
        { name: 'Google', rating, url: result.link || '' }
      ]
    },

    tags: extractTags(result, searchQuery),
    keywords: extractKeywords(result, searchQuery),

    embeddingText: `${result.title} ${result.description || ''} ${result.type || ''} ${category} Cayman Islands`,

    nearbyPlaces: [],
    relatedServices: [],

    isActive: true,
    isPremium: false,
    isFeatured: rating >= 4.5 && reviewCount > 100,
    isFromSerpApi: true,
    serpApiData: {
      originalQuery: searchQuery,
      fetchedAt: new Date().toISOString(),
      dataId: result.data_id || result.place_id
    },

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'serpapi-integration'
  };
}

/**
 * Transform SerpAPI organic search result to KnowledgeNode
 */
function transformOrganicResultToNode(result, searchQuery, category = 'general_info') {
  const id = `serp-organic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    category,
    name: result.title || 'Search Result',
    description: result.snippet || '',
    shortDescription: result.snippet?.substring(0, 150) || '',

    location: {
      address: '',
      district: 'Cayman Islands',
      island: 'Grand Cayman',
      latitude: 19.3133,
      longitude: -81.2546
    },

    contact: {
      website: result.link || ''
    },

    media: {
      thumbnail: result.thumbnail || '',
      images: []
    },

    business: {
      priceRange: '$$',
      currency: 'USD'
    },

    ratings: {
      overall: 0,
      reviewCount: 0
    },

    tags: extractTags(result, searchQuery),
    keywords: extractKeywords(result, searchQuery),
    embeddingText: `${result.title} ${result.snippet || ''} Cayman Islands`,

    isActive: true,
    isPremium: false,
    isFeatured: false,
    isFromSerpApi: true,
    serpApiData: {
      originalQuery: searchQuery,
      fetchedAt: new Date().toISOString(),
      source: 'organic_search',
      position: result.position
    },

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'serpapi-integration'
  };
}

/**
 * Extract district from address
 */
function extractDistrict(address) {
  if (!address) return 'Grand Cayman';

  const districts = [
    'George Town', 'West Bay', 'Bodden Town', 'North Side',
    'East End', 'Cayman Brac', 'Little Cayman', 'Seven Mile Beach'
  ];

  for (const district of districts) {
    if (address.toLowerCase().includes(district.toLowerCase())) {
      return district;
    }
  }

  return 'Grand Cayman';
}

/**
 * Extract tags from result
 */
function extractTags(result, searchQuery) {
  const tags = new Set();

  // Add type as tag
  if (result.type) {
    tags.add(result.type.toLowerCase());
  }

  // Add category-related tags
  if (result.category) {
    tags.add(result.category.toLowerCase());
  }

  // Add search query words as tags
  searchQuery.toLowerCase().split(' ').forEach(word => {
    if (word.length > 3) tags.add(word);
  });

  // Add features as tags
  if (result.service_options) {
    Object.keys(result.service_options).forEach(option => {
      if (result.service_options[option]) {
        tags.add(option.replace(/_/g, ' '));
      }
    });
  }

  tags.add('cayman islands');
  tags.add('caribbean');

  return Array.from(tags);
}

/**
 * Extract keywords from result
 */
function extractKeywords(result, searchQuery) {
  const keywords = new Set();

  // Add title words
  if (result.title) {
    result.title.toLowerCase().split(' ').forEach(word => {
      if (word.length > 2) keywords.add(word);
    });
  }

  // Add search query words
  searchQuery.toLowerCase().split(' ').forEach(word => {
    if (word.length > 2) keywords.add(word);
  });

  return Array.from(keywords);
}

// ============================================
// PUBLIC API FUNCTIONS
// ============================================

/**
 * Search for local places (Google Maps)
 */
export async function searchLocalPlaces(query, apiKey, options = {}) {
  const {
    location = 'Cayman Islands',
    type = '',
    limit = 20
  } = options;

  const cacheKey = getCacheKey('local', { query, location, type });
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[SerpAPI] Returning cached local results for:', query);
    return cached;
  }

  const searchQuery = `${query} ${location}`;

  const params = {
    engine: 'google_maps',
    q: searchQuery,
    type: 'search',
    ll: '@19.3133,-81.2546,11z', // Cayman Islands center
    hl: 'en',
    gl: 'ky'
  };

  if (type) {
    params.type = type;
  }

  console.log('[SerpAPI] Searching local places:', searchQuery);

  const data = await serpApiRequest(params, apiKey);

  const places = (data.local_results || [])
    .slice(0, limit)
    .map(result => transformLocalResultToNode(result, query));

  const result = {
    success: true,
    query: searchQuery,
    count: places.length,
    places,
    metadata: {
      searchEngine: 'google_maps',
      fetchedAt: new Date().toISOString()
    }
  };

  setCache(cacheKey, result);
  return result;
}

/**
 * Search for places using Google Local search
 */
export async function searchGoogleLocal(query, apiKey, options = {}) {
  const {
    location = 'Cayman Islands',
    limit = 10
  } = options;

  const cacheKey = getCacheKey('google_local', { query, location });
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[SerpAPI] Returning cached Google local results for:', query);
    return cached;
  }

  const searchQuery = `${query} in ${location}`;

  const params = {
    engine: 'google',
    q: searchQuery,
    location: 'Cayman Islands',
    hl: 'en',
    gl: 'ky',
    google_domain: 'google.com'
  };

  console.log('[SerpAPI] Google local search:', searchQuery);

  const data = await serpApiRequest(params, apiKey);

  // Extract local pack results
  const localPack = data.local_results?.places || [];
  const places = localPack.slice(0, limit).map(result => transformLocalResultToNode(result, query));

  // Also get organic results that might be relevant
  const organicPlaces = (data.organic_results || [])
    .slice(0, 5)
    .map(result => transformOrganicResultToNode(result, query));

  const result = {
    success: true,
    query: searchQuery,
    count: places.length + organicPlaces.length,
    places,
    organicResults: organicPlaces,
    knowledgeGraph: data.knowledge_graph || null,
    metadata: {
      searchEngine: 'google',
      fetchedAt: new Date().toISOString()
    }
  };

  setCache(cacheKey, result);
  return result;
}

/**
 * Search for general information
 */
export async function searchGeneral(query, apiKey, options = {}) {
  const {
    location = 'Cayman Islands',
    limit = 10
  } = options;

  const cacheKey = getCacheKey('general', { query, location });
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[SerpAPI] Returning cached general results for:', query);
    return cached;
  }

  const searchQuery = `${query} ${location}`;

  const params = {
    engine: 'google',
    q: searchQuery,
    hl: 'en',
    gl: 'ky',
    num: limit
  };

  console.log('[SerpAPI] General search:', searchQuery);

  const data = await serpApiRequest(params, apiKey);

  const results = (data.organic_results || [])
    .slice(0, limit)
    .map(result => transformOrganicResultToNode(result, query, 'general_info'));

  const response = {
    success: true,
    query: searchQuery,
    count: results.length,
    results,
    answerBox: data.answer_box || null,
    knowledgeGraph: data.knowledge_graph || null,
    relatedSearches: data.related_searches || [],
    metadata: {
      searchEngine: 'google',
      fetchedAt: new Date().toISOString()
    }
  };

  setCache(cacheKey, response);
  return response;
}

/**
 * Search for news
 */
export async function searchNews(query, apiKey, options = {}) {
  const {
    location = 'Cayman Islands',
    limit = 10,
    timeFrame = 'week' // day, week, month, year
  } = options;

  const cacheKey = getCacheKey('news', { query, location, timeFrame });
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[SerpAPI] Returning cached news results for:', query);
    return cached;
  }

  const searchQuery = `${query} ${location}`;

  const tbsMap = {
    'day': 'qdr:d',
    'week': 'qdr:w',
    'month': 'qdr:m',
    'year': 'qdr:y'
  };

  const params = {
    engine: 'google',
    q: searchQuery,
    tbm: 'nws',
    tbs: tbsMap[timeFrame] || 'qdr:w',
    hl: 'en',
    gl: 'ky',
    num: limit
  };

  console.log('[SerpAPI] News search:', searchQuery);

  const data = await serpApiRequest(params, apiKey);

  const newsResults = (data.news_results || []).slice(0, limit).map(news => ({
    id: `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: news.title,
    link: news.link,
    source: news.source,
    date: news.date,
    snippet: news.snippet,
    thumbnail: news.thumbnail || ''
  }));

  const response = {
    success: true,
    query: searchQuery,
    count: newsResults.length,
    news: newsResults,
    metadata: {
      searchEngine: 'google_news',
      timeFrame,
      fetchedAt: new Date().toISOString()
    }
  };

  setCache(cacheKey, response);
  return response;
}

/**
 * Search for images
 */
export async function searchImages(query, apiKey, options = {}) {
  const {
    location = 'Cayman Islands',
    limit = 20
  } = options;

  const cacheKey = getCacheKey('images', { query, location });
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[SerpAPI] Returning cached image results for:', query);
    return cached;
  }

  const searchQuery = `${query} ${location}`;

  const params = {
    engine: 'google_images',
    q: searchQuery,
    hl: 'en',
    gl: 'ky'
  };

  console.log('[SerpAPI] Image search:', searchQuery);

  const data = await serpApiRequest(params, apiKey);

  const images = (data.images_results || []).slice(0, limit).map(img => ({
    id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: img.title,
    link: img.link,
    original: img.original,
    thumbnail: img.thumbnail,
    source: img.source,
    sourceUrl: img.source_url || img.link
  }));

  const response = {
    success: true,
    query: searchQuery,
    count: images.length,
    images,
    metadata: {
      searchEngine: 'google_images',
      fetchedAt: new Date().toISOString()
    }
  };

  setCache(cacheKey, response);
  return response;
}

/**
 * Comprehensive search - fetches all types of data for a query
 */
export async function comprehensiveSearch(query, apiKey, options = {}) {
  const { location = 'Cayman Islands' } = options;

  console.log('[SerpAPI] Running comprehensive search for:', query);

  // Run searches in parallel for efficiency
  const [localResults, generalResults, newsResults, imageResults] = await Promise.all([
    searchLocalPlaces(query, apiKey, { location, limit: 15 }).catch(err => {
      console.error('[SerpAPI] Local search error:', err.message);
      return { success: false, places: [] };
    }),
    searchGeneral(query, apiKey, { location, limit: 10 }).catch(err => {
      console.error('[SerpAPI] General search error:', err.message);
      return { success: false, results: [] };
    }),
    searchNews(query, apiKey, { location, limit: 5 }).catch(err => {
      console.error('[SerpAPI] News search error:', err.message);
      return { success: false, news: [] };
    }),
    searchImages(query, apiKey, { location, limit: 10 }).catch(err => {
      console.error('[SerpAPI] Image search error:', err.message);
      return { success: false, images: [] };
    })
  ]);

  return {
    success: true,
    query,
    location,
    places: localResults.places || [],
    generalInfo: generalResults.results || [],
    knowledgeGraph: generalResults.knowledgeGraph || localResults.knowledgeGraph || null,
    news: newsResults.news || [],
    images: imageResults.images || [],
    metadata: {
      fetchedAt: new Date().toISOString(),
      totalPlaces: (localResults.places || []).length,
      totalGeneralResults: (generalResults.results || []).length,
      totalNews: (newsResults.news || []).length,
      totalImages: (imageResults.images || []).length
    }
  };
}

/**
 * Fetch all categories for Cayman Islands knowledge base
 */
export async function fetchAllCaymanData(apiKey) {
  const categories = [
    { query: 'luxury hotels resorts', type: 'hotel' },
    { query: 'best restaurants fine dining', type: 'restaurant' },
    { query: 'beaches swimming snorkeling', type: 'beach' },
    { query: 'scuba diving centers', type: 'diving_snorkeling' },
    { query: 'spa wellness massage', type: 'spa_wellness' },
    { query: 'bars nightlife clubs', type: 'bar' },
    { query: 'water sports activities', type: 'water_sports' },
    { query: 'boat yacht charter fishing', type: 'boat_charter' },
    { query: 'tours attractions things to do', type: 'activity' },
    { query: 'shopping malls boutiques', type: 'shopping' },
    { query: 'villa rental vacation homes', type: 'villa_rental' },
    { query: 'car rental transportation taxi', type: 'transportation' },
    { query: 'golf courses clubs', type: 'golf' },
    { query: 'real estate luxury properties', type: 'real_estate' }
  ];

  console.log('[SerpAPI] Fetching all Cayman Islands data...');

  const allResults = [];
  const errors = [];

  // Process in batches to avoid rate limiting
  const batchSize = 3;
  for (let i = 0; i < categories.length; i += batchSize) {
    const batch = categories.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async ({ query, type }) => {
        try {
          const result = await searchLocalPlaces(query, apiKey, {
            location: 'Cayman Islands',
            limit: 20
          });

          // Tag results with their intended category
          const taggedPlaces = (result.places || []).map(place => ({
            ...place,
            category: type,
            searchCategory: type
          }));

          return { success: true, query, type, places: taggedPlaces };
        } catch (error) {
          console.error(`[SerpAPI] Error fetching ${type}:`, error.message);
          errors.push({ query, type, error: error.message });
          return { success: false, query, type, places: [] };
        }
      })
    );

    batchResults.forEach(result => {
      if (result.places) {
        allResults.push(...result.places);
      }
    });

    // Small delay between batches to be nice to the API
    if (i + batchSize < categories.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Deduplicate by place ID
  const uniquePlaces = new Map();
  allResults.forEach(place => {
    const key = place.location?.googlePlaceId || place.name;
    if (!uniquePlaces.has(key)) {
      uniquePlaces.set(key, place);
    }
  });

  const dedupedResults = Array.from(uniquePlaces.values());

  console.log(`[SerpAPI] Fetched ${dedupedResults.length} unique places`);

  return {
    success: true,
    totalPlaces: dedupedResults.length,
    places: dedupedResults,
    categories: categories.map(c => c.type),
    errors: errors.length > 0 ? errors : undefined,
    metadata: {
      fetchedAt: new Date().toISOString(),
      categoriesSearched: categories.length,
      errorsCount: errors.length
    }
  };
}

// ============================================
// GOOGLE FLIGHTS INTEGRATION
// ============================================

/**
 * Search for flights TO Cayman Islands
 * @param {string} origin - Origin airport code (e.g., 'MIA', 'JFK')
 * @param {string} apiKey - SerpAPI key
 * @param {object} options - Search options
 */
export async function searchFlightsToCayman(origin, apiKey, options = {}) {
  const {
    destination = 'GCM', // Owen Roberts International
    departureDate = null, // YYYY-MM-DD format
    returnDate = null,
    adults = 1,
    travelClass = 1, // 1=economy, 2=premium economy, 3=business, 4=first
    currency = 'USD'
  } = options;

  // Default to 7 days from now if no date provided
  const depDate = departureDate || getDateString(7);
  const retDate = returnDate || getDateString(14);

  const cacheKey = getCacheKey('flights_to', { origin, destination, depDate, retDate, travelClass });
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[SerpAPI] Returning cached flights to Cayman for:', origin);
    return cached;
  }

  const params = {
    engine: 'google_flights',
    departure_id: origin,
    arrival_id: destination,
    outbound_date: depDate,
    return_date: retDate,
    adults,
    travel_class: travelClass,
    currency,
    hl: 'en',
    gl: 'us'
  };

  console.log(`[SerpAPI] Searching flights from ${origin} to ${destination}`);

  try {
    const data = await serpApiRequest(params, apiKey);
    const flights = transformFlightResults(data, origin, destination, 'inbound');

    const result = {
      success: true,
      type: 'flights_to_cayman',
      origin,
      destination,
      departureDate: depDate,
      returnDate: retDate,
      flights,
      bestFlights: data.best_flights || [],
      otherFlights: data.other_flights || [],
      priceInsights: data.price_insights || null,
      airports: data.airports || [],
      metadata: {
        searchEngine: 'google_flights',
        currency,
        travelClass: ['Economy', 'Premium Economy', 'Business', 'First'][travelClass - 1],
        fetchedAt: new Date().toISOString()
      }
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[SerpAPI] Flights search error:', error.message);
    return {
      success: false,
      error: error.message,
      origin,
      destination,
      flights: []
    };
  }
}

/**
 * Search for flights FROM Cayman Islands
 */
export async function searchFlightsFromCayman(destination, apiKey, options = {}) {
  const {
    origin = 'GCM',
    departureDate = null,
    returnDate = null,
    adults = 1,
    travelClass = 1,
    currency = 'USD'
  } = options;

  const depDate = departureDate || getDateString(7);
  const retDate = returnDate || getDateString(14);

  const cacheKey = getCacheKey('flights_from', { origin, destination, depDate, retDate, travelClass });
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[SerpAPI] Returning cached flights from Cayman to:', destination);
    return cached;
  }

  const params = {
    engine: 'google_flights',
    departure_id: origin,
    arrival_id: destination,
    outbound_date: depDate,
    return_date: retDate,
    adults,
    travel_class: travelClass,
    currency,
    hl: 'en',
    gl: 'us'
  };

  console.log(`[SerpAPI] Searching flights from ${origin} to ${destination}`);

  try {
    const data = await serpApiRequest(params, apiKey);
    const flights = transformFlightResults(data, origin, destination, 'outbound');

    const result = {
      success: true,
      type: 'flights_from_cayman',
      origin,
      destination,
      departureDate: depDate,
      returnDate: retDate,
      flights,
      bestFlights: data.best_flights || [],
      otherFlights: data.other_flights || [],
      priceInsights: data.price_insights || null,
      airports: data.airports || [],
      metadata: {
        searchEngine: 'google_flights',
        currency,
        travelClass: ['Economy', 'Premium Economy', 'Business', 'First'][travelClass - 1],
        fetchedAt: new Date().toISOString()
      }
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[SerpAPI] Flights search error:', error.message);
    return {
      success: false,
      error: error.message,
      origin,
      destination,
      flights: []
    };
  }
}

/**
 * Search all popular routes to/from Cayman
 */
export async function searchAllCaymanFlights(apiKey, options = {}) {
  const { direction = 'both' } = options;

  console.log('[SerpAPI] Fetching all Cayman flight routes...');

  const results = {
    toCayman: [],
    fromCayman: [],
    metadata: {
      fetchedAt: new Date().toISOString(),
      routesSearched: 0
    }
  };

  // Search flights TO Cayman from popular origins
  if (direction === 'both' || direction === 'to') {
    const toPromises = POPULAR_FLIGHT_ORIGINS.slice(0, 8).map(async (origin) => {
      try {
        const result = await searchFlightsToCayman(origin.code, apiKey, options);
        if (result.success && result.flights.length > 0) {
          return {
            route: `${origin.city} → Cayman Islands`,
            origin: origin,
            ...result
          };
        }
      } catch (err) {
        console.error(`[SerpAPI] Flight search error for ${origin.code}:`, err.message);
      }
      return null;
    });

    const toResults = await Promise.all(toPromises);
    results.toCayman = toResults.filter(r => r !== null);
  }

  // Search flights FROM Cayman to popular destinations
  if (direction === 'both' || direction === 'from') {
    const fromPromises = POPULAR_FLIGHT_ORIGINS.slice(0, 8).map(async (dest) => {
      try {
        const result = await searchFlightsFromCayman(dest.code, apiKey, options);
        if (result.success && result.flights.length > 0) {
          return {
            route: `Cayman Islands → ${dest.city}`,
            destination: dest,
            ...result
          };
        }
      } catch (err) {
        console.error(`[SerpAPI] Flight search error to ${dest.code}:`, err.message);
      }
      return null;
    });

    const fromResults = await Promise.all(fromPromises);
    results.fromCayman = fromResults.filter(r => r !== null);
  }

  results.metadata.routesSearched = results.toCayman.length + results.fromCayman.length;

  return results;
}

/**
 * Transform flight data to standardized format
 */
function transformFlightResults(data, origin, destination, direction) {
  const flights = [];

  // Process best flights
  (data.best_flights || []).forEach(flight => {
    flights.push(transformSingleFlight(flight, origin, destination, direction, true));
  });

  // Process other flights
  (data.other_flights || []).forEach(flight => {
    flights.push(transformSingleFlight(flight, origin, destination, direction, false));
  });

  return flights;
}

function transformSingleFlight(flightData, origin, destination, direction, isBest) {
  const legs = flightData.flights || [];
  const firstLeg = legs[0] || {};
  const lastLeg = legs[legs.length - 1] || firstLeg;

  return {
    id: `flight-${origin}-${destination}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    category: 'flight',
    direction,
    isBestFlight: isBest,

    // Route info
    origin: {
      airport: firstLeg.departure_airport?.id || origin,
      name: firstLeg.departure_airport?.name || '',
      time: firstLeg.departure_airport?.time || ''
    },
    destination: {
      airport: lastLeg.arrival_airport?.id || destination,
      name: lastLeg.arrival_airport?.name || '',
      time: lastLeg.arrival_airport?.time || ''
    },

    // Flight details
    airline: firstLeg.airline || 'Unknown',
    airlineLogo: firstLeg.airline_logo || '',
    flightNumber: firstLeg.flight_number || '',
    aircraft: firstLeg.airplane || '',

    // Duration & stops
    totalDuration: flightData.total_duration || 0,
    durationFormatted: formatDuration(flightData.total_duration),
    stops: legs.length - 1,
    layovers: flightData.layovers || [],

    // Pricing
    price: flightData.price || 0,
    priceFormatted: `$${flightData.price || 0}`,
    currency: 'USD',
    travelClass: firstLeg.travel_class || 'Economy',

    // Additional info
    legroom: firstLeg.legroom || '',
    extensions: firstLeg.extensions || [],
    carbonEmissions: flightData.carbon_emissions || null,

    // All legs for multi-stop flights
    legs: legs.map(leg => ({
      airline: leg.airline,
      flightNumber: leg.flight_number,
      departure: {
        airport: leg.departure_airport?.id,
        name: leg.departure_airport?.name,
        time: leg.departure_airport?.time
      },
      arrival: {
        airport: leg.arrival_airport?.id,
        name: leg.arrival_airport?.name,
        time: leg.arrival_airport?.time
      },
      duration: leg.duration,
      aircraft: leg.airplane,
      travelClass: leg.travel_class
    })),

    // Metadata
    fetchedAt: new Date().toISOString()
  };
}

function formatDuration(minutes) {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function getDateString(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

// ============================================
// VIP SERVICES SEARCH FUNCTIONS
// ============================================

/**
 * Search for private jet charter services
 */
export async function searchPrivateJets(apiKey, options = {}) {
  const queries = [
    'private jet charter Cayman Islands',
    'aircraft charter Grand Cayman',
    'helicopter charter Cayman',
    'executive aviation Cayman Islands',
    'FBO services Grand Cayman airport',
    'private plane rental Caribbean'
  ];

  console.log('[SerpAPI] Searching private jet services...');
  return searchMultipleQueries(queries, apiKey, 'private_jet', options);
}

/**
 * Search for VIP escort and companion services
 */
export async function searchVIPEscortServices(apiKey, options = {}) {
  const queries = [
    'VIP escort service Cayman Islands',
    'luxury companion service Grand Cayman',
    'elite escort Caribbean',
    'high class companion Cayman',
    'premium hostess service Cayman Islands',
    'VIP model escort Caribbean',
    'executive companion service Grand Cayman',
    'travel companion luxury Cayman'
  ];

  console.log('[SerpAPI] Searching VIP escort services...');
  return searchMultipleQueries(queries, apiKey, 'vip_escort', options);
}

/**
 * Search for financial and investment services
 */
export async function searchFinancialServices(apiKey, options = {}) {
  const queries = [
    'investment fund formation Cayman Islands',
    'hedge fund setup Cayman',
    'private equity fund Cayman Islands',
    'wealth management Grand Cayman',
    'family office services Cayman',
    'offshore banking Cayman Islands',
    'fund administration Cayman',
    'trust services Cayman Islands',
    'corporate services Cayman',
    'BVI fund formation',
    'British Virgin Islands investment fund',
    'offshore company formation BVI',
    'asset protection trust Cayman'
  ];

  console.log('[SerpAPI] Searching financial services...');
  return searchMultipleQueries(queries, apiKey, 'financial_services', options);
}

/**
 * Search for legal services
 */
export async function searchLegalServices(apiKey, options = {}) {
  const queries = [
    'law firm Cayman Islands',
    'corporate attorney Grand Cayman',
    'offshore legal services Cayman',
    'investment fund lawyer Cayman Islands',
    'real estate attorney Cayman',
    'immigration lawyer Cayman Islands'
  ];

  console.log('[SerpAPI] Searching legal services...');
  return searchMultipleQueries(queries, apiKey, 'legal_services', options);
}

/**
 * Search for concierge and lifestyle management services
 */
export async function searchConciergeServices(apiKey, options = {}) {
  const queries = [
    'luxury concierge Cayman Islands',
    'VIP concierge service Grand Cayman',
    'lifestyle management Cayman',
    'personal assistant service Cayman Islands',
    'event planning Cayman',
    'wedding planner Cayman Islands',
    'private chef service Grand Cayman',
    'butler service Cayman Islands'
  ];

  console.log('[SerpAPI] Searching concierge services...');
  return searchMultipleQueries(queries, apiKey, 'concierge', options);
}

/**
 * Search for superyacht services
 */
export async function searchSuperyachtServices(apiKey, options = {}) {
  const queries = [
    'superyacht charter Cayman Islands',
    'mega yacht rental Grand Cayman',
    'luxury yacht charter Caribbean',
    'yacht crew services Cayman',
    'yacht management Cayman Islands',
    'yacht provisioning Grand Cayman'
  ];

  console.log('[SerpAPI] Searching superyacht services...');
  return searchMultipleQueries(queries, apiKey, 'superyacht', options);
}

/**
 * Search for luxury car rental services
 */
export async function searchLuxuryCarRentals(apiKey, options = {}) {
  const queries = [
    'luxury car rental Cayman Islands',
    'exotic car rental Grand Cayman',
    'Lamborghini rental Cayman',
    'Ferrari rental Grand Cayman',
    'Bentley rental Cayman Islands',
    'Rolls Royce rental Grand Cayman',
    'Porsche rental Cayman Islands'
  ];

  console.log('[SerpAPI] Searching luxury car rentals...');
  return searchMultipleQueries(queries, apiKey, 'luxury_car_rental', options);
}

/**
 * Search for security services
 */
export async function searchSecurityServices(apiKey, options = {}) {
  const queries = [
    'private security Cayman Islands',
    'bodyguard service Grand Cayman',
    'executive protection Cayman',
    'VIP security Caribbean',
    'close protection officer Cayman Islands'
  ];

  console.log('[SerpAPI] Searching security services...');
  return searchMultipleQueries(queries, apiKey, 'security_services', options);
}

/**
 * Search for VIP medical services
 */
export async function searchMedicalVIPServices(apiKey, options = {}) {
  const queries = [
    'private clinic Cayman Islands',
    'concierge medicine Grand Cayman',
    'cosmetic surgery Cayman',
    'medical tourism Cayman Islands',
    'executive health checkup Cayman',
    'dental tourism Grand Cayman'
  ];

  console.log('[SerpAPI] Searching VIP medical services...');
  return searchMultipleQueries(queries, apiKey, 'medical_vip', options);
}

/**
 * Helper function to search multiple queries and combine results
 */
async function searchMultipleQueries(queries, apiKey, category, options = {}) {
  const { limit = 10 } = options;
  const allResults = [];
  const errors = [];

  // Process queries in batches
  const batchSize = 3;
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (query) => {
        try {
          // Try local places first
          const localResult = await searchLocalPlaces(query, apiKey, {
            location: 'Cayman Islands',
            limit: 5
          });

          // Also do general search for services that might not be in Google Maps
          const generalResult = await searchGeneral(query, apiKey, {
            location: 'Cayman Islands',
            limit: 5
          });

          const places = (localResult.places || []).map(p => ({
            ...p,
            category,
            searchQuery: query
          }));

          const generalPlaces = (generalResult.results || []).map(r => ({
            ...transformOrganicResultToNode(r, query, category),
            category,
            searchQuery: query
          }));

          return { success: true, places: [...places, ...generalPlaces] };
        } catch (error) {
          console.error(`[SerpAPI] Error searching ${category}:`, error.message);
          errors.push({ query, error: error.message });
          return { success: false, places: [] };
        }
      })
    );

    batchResults.forEach(result => {
      if (result.places) {
        allResults.push(...result.places);
      }
    });

    // Small delay between batches
    if (i + batchSize < queries.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // Deduplicate by name
  const uniqueResults = new Map();
  allResults.forEach(place => {
    const key = place.name?.toLowerCase() || place.id;
    if (!uniqueResults.has(key)) {
      uniqueResults.set(key, place);
    }
  });

  const dedupedResults = Array.from(uniqueResults.values()).slice(0, limit);

  return {
    success: true,
    category,
    count: dedupedResults.length,
    places: dedupedResults,
    queriesSearched: queries.length,
    errors: errors.length > 0 ? errors : undefined,
    metadata: {
      fetchedAt: new Date().toISOString()
    }
  };
}

// ============================================
// COMPREHENSIVE VIP DATA FETCH
// ============================================

/**
 * Fetch ALL VIP services data for knowledge base
 */
export async function fetchAllVIPServices(apiKey) {
  console.log('[SerpAPI] Fetching ALL VIP services data...');

  const results = {
    privateJets: [],
    vipEscorts: [],
    financialServices: [],
    legalServices: [],
    concierge: [],
    superyachts: [],
    luxuryCars: [],
    security: [],
    medicalVIP: [],
    flights: { toCayman: [], fromCayman: [] }
  };

  try {
    // Fetch all service categories in parallel
    const [
      privateJets,
      vipEscorts,
      financialServices,
      legalServices,
      concierge,
      superyachts,
      luxuryCars,
      security,
      medicalVIP,
      flights
    ] = await Promise.all([
      searchPrivateJets(apiKey).catch(e => ({ places: [] })),
      searchVIPEscortServices(apiKey).catch(e => ({ places: [] })),
      searchFinancialServices(apiKey).catch(e => ({ places: [] })),
      searchLegalServices(apiKey).catch(e => ({ places: [] })),
      searchConciergeServices(apiKey).catch(e => ({ places: [] })),
      searchSuperyachtServices(apiKey).catch(e => ({ places: [] })),
      searchLuxuryCarRentals(apiKey).catch(e => ({ places: [] })),
      searchSecurityServices(apiKey).catch(e => ({ places: [] })),
      searchMedicalVIPServices(apiKey).catch(e => ({ places: [] })),
      searchAllCaymanFlights(apiKey).catch(e => ({ toCayman: [], fromCayman: [] }))
    ]);

    results.privateJets = privateJets.places || [];
    results.vipEscorts = vipEscorts.places || [];
    results.financialServices = financialServices.places || [];
    results.legalServices = legalServices.places || [];
    results.concierge = concierge.places || [];
    results.superyachts = superyachts.places || [];
    results.luxuryCars = luxuryCars.places || [];
    results.security = security.places || [];
    results.medicalVIP = medicalVIP.places || [];
    results.flights = flights;

  } catch (error) {
    console.error('[SerpAPI] Error fetching VIP services:', error.message);
  }

  // Calculate totals
  const totalServices =
    results.privateJets.length +
    results.vipEscorts.length +
    results.financialServices.length +
    results.legalServices.length +
    results.concierge.length +
    results.superyachts.length +
    results.luxuryCars.length +
    results.security.length +
    results.medicalVIP.length;

  const totalFlights =
    results.flights.toCayman.length +
    results.flights.fromCayman.length;

  console.log(`[SerpAPI] Fetched ${totalServices} VIP services + ${totalFlights} flight routes`);

  return {
    success: true,
    ...results,
    totals: {
      privateJets: results.privateJets.length,
      vipEscorts: results.vipEscorts.length,
      financialServices: results.financialServices.length,
      legalServices: results.legalServices.length,
      concierge: results.concierge.length,
      superyachts: results.superyachts.length,
      luxuryCars: results.luxuryCars.length,
      security: results.security.length,
      medicalVIP: results.medicalVIP.length,
      flightsToCayman: results.flights.toCayman.length,
      flightsFromCayman: results.flights.fromCayman.length,
      totalServices,
      totalFlights
    },
    metadata: {
      fetchedAt: new Date().toISOString()
    }
  };
}

/**
 * Clear the cache
 */
export function clearCache() {
  cache.clear();
  console.log('[SerpAPI] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: cache.size,
    entries: Array.from(cache.keys())
  };
}

export default {
  // Core search functions
  searchLocalPlaces,
  searchGoogleLocal,
  searchGeneral,
  searchNews,
  searchImages,
  comprehensiveSearch,
  fetchAllCaymanData,

  // Google Flights
  searchFlightsToCayman,
  searchFlightsFromCayman,
  searchAllCaymanFlights,

  // VIP Services
  searchPrivateJets,
  searchVIPEscortServices,
  searchFinancialServices,
  searchLegalServices,
  searchConciergeServices,
  searchSuperyachtServices,
  searchLuxuryCarRentals,
  searchSecurityServices,
  searchMedicalVIPServices,
  fetchAllVIPServices,

  // Cache management
  clearCache,
  getCacheStats,

  // Constants (for external use)
  CAYMAN_AIRPORTS,
  POPULAR_FLIGHT_ORIGINS,
  VIP_PRICE_ESTIMATES
};
