/**
 * SerpAPI Controller
 *
 * Handles API endpoints for SerpAPI integration.
 * Provides search functionality for the RAG chatbot.
 */

import serpApiService from '../services/serpApiService.js';

// Get API key from environment or use provided key
const getApiKey = (req) => {
  return req.headers['x-serpapi-key'] ||
    process.env.SERPAPI_KEY ||
    'd00dd54909ca688bb9340ac04d56449680634ab2f07ea56fc9627023f3129165';
};

/**
 * Search local places (Google Maps)
 * GET /api/serpapi/places
 */
export const searchPlaces = async (req, res) => {
  try {
    const { q, query, location, type, limit } = req.query;
    const searchQuery = q || query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter (q or query) is required'
      });
    }

    const apiKey = getApiKey(req);
    const result = await serpApiService.searchLocalPlaces(searchQuery, apiKey, {
      location: location || 'Cayman Islands',
      type,
      limit: parseInt(limit) || 20
    });

    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] Search places error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Google local search with organic results
 * GET /api/serpapi/local
 */
export const searchLocal = async (req, res) => {
  try {
    const { q, query, location, limit } = req.query;
    const searchQuery = q || query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter (q or query) is required'
      });
    }

    const apiKey = getApiKey(req);
    const result = await serpApiService.searchGoogleLocal(searchQuery, apiKey, {
      location: location || 'Cayman Islands',
      limit: parseInt(limit) || 10
    });

    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] Local search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * General web search
 * GET /api/serpapi/search
 */
export const searchGeneral = async (req, res) => {
  try {
    const { q, query, location, limit } = req.query;
    const searchQuery = q || query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter (q or query) is required'
      });
    }

    const apiKey = getApiKey(req);
    const result = await serpApiService.searchGeneral(searchQuery, apiKey, {
      location: location || 'Cayman Islands',
      limit: parseInt(limit) || 10
    });

    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] General search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * News search
 * GET /api/serpapi/news
 */
export const searchNews = async (req, res) => {
  try {
    const { q, query, location, limit, timeFrame } = req.query;
    const searchQuery = q || query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter (q or query) is required'
      });
    }

    const apiKey = getApiKey(req);
    const result = await serpApiService.searchNews(searchQuery, apiKey, {
      location: location || 'Cayman Islands',
      limit: parseInt(limit) || 10,
      timeFrame: timeFrame || 'week'
    });

    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] News search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Image search
 * GET /api/serpapi/images
 */
export const searchImages = async (req, res) => {
  try {
    const { q, query, location, limit } = req.query;
    const searchQuery = q || query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter (q or query) is required'
      });
    }

    const apiKey = getApiKey(req);
    const result = await serpApiService.searchImages(searchQuery, apiKey, {
      location: location || 'Cayman Islands',
      limit: parseInt(limit) || 20
    });

    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] Image search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Comprehensive search - all data types
 * GET /api/serpapi/comprehensive
 */
export const comprehensiveSearch = async (req, res) => {
  try {
    const { q, query, location } = req.query;
    const searchQuery = q || query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter (q or query) is required'
      });
    }

    const apiKey = getApiKey(req);
    const result = await serpApiService.comprehensiveSearch(searchQuery, apiKey, {
      location: location || 'Cayman Islands'
    });

    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] Comprehensive search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Fetch all Cayman Islands data for knowledge base
 * POST /api/serpapi/fetch-all
 */
export const fetchAllData = async (req, res) => {
  try {
    const apiKey = getApiKey(req);

    // This is a long-running operation, send initial response
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    });

    res.write(JSON.stringify({ status: 'started', message: 'Fetching all Cayman Islands data...' }) + '\n');

    const result = await serpApiService.fetchAllCaymanData(apiKey);

    res.write(JSON.stringify(result));
    res.end();
  } catch (error) {
    console.error('[SerpAPI Controller] Fetch all data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * RAG-optimized search for chatbot queries
 * POST /api/serpapi/rag-search
 *
 * ENHANCED: Now always includes news, images, and enriched place data
 */
export const ragSearch = async (req, res) => {
  try {
    const { query, categories, intent, conversationContext, includeNews = true, includeImages = true } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required in request body'
      });
    }

    const apiKey = getApiKey(req);

    // Build optimized search query based on intent and categories
    let searchQuery = query;

    // Enhance query based on detected categories
    if (categories && categories.length > 0) {
      const categoryKeywords = {
        hotel: 'hotel resort accommodation',
        restaurant: 'restaurant dining food',
        beach: 'beach swimming',
        diving_snorkeling: 'diving snorkeling scuba',
        spa_wellness: 'spa wellness massage',
        bar: 'bar lounge drinks nightlife',
        nightlife: 'nightlife club bar',
        activity: 'tours activities things to do',
        attraction: 'attractions tourist sites',
        boat_charter: 'boat yacht charter fishing',
        villa_rental: 'villa rental vacation home',
        shopping: 'shopping stores boutiques',
        transportation: 'car rental taxi transport',
        golf: 'golf course club',
        water_sports: 'water sports kayak jet ski'
      };

      const categoryHints = categories
        .map(cat => categoryKeywords[cat])
        .filter(Boolean)
        .join(' ');

      if (categoryHints) {
        searchQuery = `${query} ${categoryHints}`.trim();
      }
    }

    // ENHANCED: Always fetch places, news, and images in parallel for complete data
    const searchPromises = [
      // Always fetch places
      serpApiService.searchLocalPlaces(searchQuery, apiKey, {
        location: 'Cayman Islands',
        limit: 15
      }).catch(err => {
        console.error('[RAG] Places search error:', err.message);
        return { places: [] };
      })
    ];

    // Add news search if enabled
    if (includeNews) {
      searchPromises.push(
        serpApiService.searchNews(query, apiKey, {
          location: 'Cayman Islands',
          limit: 5,
          timeFrame: 'week'
        }).catch(err => {
          console.error('[RAG] News search error:', err.message);
          return { news: [] };
        })
      );
    }

    // Add images search if enabled
    if (includeImages) {
      searchPromises.push(
        serpApiService.searchImages(query, apiKey, {
          location: 'Cayman Islands',
          limit: 8
        }).catch(err => {
          console.error('[RAG] Images search error:', err.message);
          return { images: [] };
        })
      );
    }

    // Execute all searches in parallel
    const results = await Promise.all(searchPromises);

    const placesResult = results[0] || { places: [] };
    const newsResult = includeNews ? (results[1] || { news: [] }) : { news: [] };
    const imagesResult = includeImages ? (results[includeNews ? 2 : 1] || { images: [] }) : { images: [] };

    // Format response for RAG system with complete data
    const ragResponse = {
      success: true,
      query: searchQuery,
      originalQuery: query,
      intent,
      categories,
      nodes: placesResult.places || [],
      news: newsResult.news || [],
      images: imagesResult.images || [],
      metadata: {
        searchType: 'enhanced-rag',
        ragOptimized: true,
        fetchedAt: new Date().toISOString(),
        placesCount: (placesResult.places || []).length,
        newsCount: (newsResult.news || []).length,
        imagesCount: (imagesResult.images || []).length,
        dataCompleteness: {
          hasPlaces: (placesResult.places || []).length > 0,
          hasNews: (newsResult.news || []).length > 0,
          hasImages: (imagesResult.images || []).length > 0
        }
      }
    };

    res.json(ragResponse);
  } catch (error) {
    console.error('[SerpAPI Controller] RAG search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get cache statistics
 * GET /api/serpapi/cache-stats
 */
export const getCacheStats = (req, res) => {
  try {
    const stats = serpApiService.getCacheStats();
    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Clear cache
 * POST /api/serpapi/clear-cache
 */
export const clearCache = (req, res) => {
  try {
    serpApiService.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GOOGLE FLIGHTS ENDPOINTS
// ============================================

/**
 * Search flights TO Cayman Islands
 * GET /api/serpapi/flights/to-cayman
 */
export const searchFlightsToCayman = async (req, res) => {
  try {
    const { origin, departure_date, return_date, adults, travel_class } = req.query;

    if (!origin) {
      return res.status(400).json({
        success: false,
        error: 'Origin airport code is required (e.g., MIA, JFK)'
      });
    }

    const apiKey = getApiKey(req);
    const result = await serpApiService.searchFlightsToCayman(origin, apiKey, {
      departureDate: departure_date,
      returnDate: return_date,
      adults: parseInt(adults) || 1,
      travelClass: parseInt(travel_class) || 1
    });

    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] Flights to Cayman error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Search flights FROM Cayman Islands
 * GET /api/serpapi/flights/from-cayman
 */
export const searchFlightsFromCayman = async (req, res) => {
  try {
    const { destination, departure_date, return_date, adults, travel_class } = req.query;

    if (!destination) {
      return res.status(400).json({
        success: false,
        error: 'Destination airport code is required (e.g., MIA, JFK)'
      });
    }

    const apiKey = getApiKey(req);
    const result = await serpApiService.searchFlightsFromCayman(destination, apiKey, {
      departureDate: departure_date,
      returnDate: return_date,
      adults: parseInt(adults) || 1,
      travelClass: parseInt(travel_class) || 1
    });

    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] Flights from Cayman error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Search all flight routes to/from Cayman
 * GET /api/serpapi/flights/all-routes
 */
export const searchAllFlightRoutes = async (req, res) => {
  try {
    const { direction } = req.query;
    const apiKey = getApiKey(req);

    const result = await serpApiService.searchAllCaymanFlights(apiKey, {
      direction: direction || 'both'
    });

    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] All flight routes error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// VIP SERVICES ENDPOINTS
// ============================================

/**
 * Search private jet services
 * GET /api/serpapi/vip/private-jets
 */
export const searchPrivateJets = async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    const result = await serpApiService.searchPrivateJets(apiKey);
    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] Private jets error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Search VIP escort services
 * GET /api/serpapi/vip/escort-services
 */
export const searchVIPEscorts = async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    const result = await serpApiService.searchVIPEscortServices(apiKey);
    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] VIP escort services error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Search financial services
 * GET /api/serpapi/vip/financial-services
 */
export const searchFinancialServices = async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    const result = await serpApiService.searchFinancialServices(apiKey);
    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] Financial services error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Search legal services
 * GET /api/serpapi/vip/legal-services
 */
export const searchLegalServices = async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    const result = await serpApiService.searchLegalServices(apiKey);
    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] Legal services error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Search concierge services
 * GET /api/serpapi/vip/concierge
 */
export const searchConciergeServices = async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    const result = await serpApiService.searchConciergeServices(apiKey);
    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] Concierge services error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Search superyacht services
 * GET /api/serpapi/vip/superyachts
 */
export const searchSuperyachts = async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    const result = await serpApiService.searchSuperyachtServices(apiKey);
    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] Superyacht services error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Search luxury car rentals
 * GET /api/serpapi/vip/luxury-cars
 */
export const searchLuxuryCars = async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    const result = await serpApiService.searchLuxuryCarRentals(apiKey);
    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] Luxury cars error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Search security services
 * GET /api/serpapi/vip/security
 */
export const searchSecurityServices = async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    const result = await serpApiService.searchSecurityServices(apiKey);
    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] Security services error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Search VIP medical services
 * GET /api/serpapi/vip/medical
 */
export const searchMedicalVIP = async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    const result = await serpApiService.searchMedicalVIPServices(apiKey);
    res.json(result);
  } catch (error) {
    console.error('[SerpAPI Controller] Medical VIP services error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Fetch ALL VIP services at once
 * POST /api/serpapi/vip/fetch-all
 */
export const fetchAllVIPServices = async (req, res) => {
  try {
    const apiKey = getApiKey(req);

    // Send streaming response for long operation
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    });

    res.write(JSON.stringify({ status: 'started', message: 'Fetching all VIP services data...' }) + '\n');

    const result = await serpApiService.fetchAllVIPServices(apiKey);

    res.write(JSON.stringify(result));
    res.end();
  } catch (error) {
    console.error('[SerpAPI Controller] Fetch all VIP services error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export default {
  // Core search
  searchPlaces,
  searchLocal,
  searchGeneral,
  searchNews,
  searchImages,
  comprehensiveSearch,
  fetchAllData,
  ragSearch,
  getCacheStats,
  clearCache,

  // Flights
  searchFlightsToCayman,
  searchFlightsFromCayman,
  searchAllFlightRoutes,

  // VIP Services
  searchPrivateJets,
  searchVIPEscorts,
  searchFinancialServices,
  searchLegalServices,
  searchConciergeServices,
  searchSuperyachts,
  searchLuxuryCars,
  searchSecurityServices,
  searchMedicalVIP,
  fetchAllVIPServices
};
