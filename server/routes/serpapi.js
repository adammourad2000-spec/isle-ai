/**
 * SerpAPI Routes
 *
 * API endpoints for SerpAPI integration.
 */

import express from 'express';
import * as serpApiController from '../controllers/serpApiController.js';

const router = express.Router();

// Public search endpoints (no auth required for chatbot)

// Search local places (Google Maps style)
router.get('/places', serpApiController.searchPlaces);

// Google local search with organic results
router.get('/local', serpApiController.searchLocal);

// General web search
router.get('/search', serpApiController.searchGeneral);

// News search
router.get('/news', serpApiController.searchNews);

// Image search
router.get('/images', serpApiController.searchImages);

// Comprehensive search (all data types)
router.get('/comprehensive', serpApiController.comprehensiveSearch);

// RAG-optimized search for chatbot
router.post('/rag-search', serpApiController.ragSearch);

// Fetch all Cayman data (admin operation)
router.post('/fetch-all', serpApiController.fetchAllData);

// ============================================
// GOOGLE FLIGHTS ENDPOINTS
// ============================================

// Search flights TO Cayman Islands
router.get('/flights/to-cayman', serpApiController.searchFlightsToCayman);

// Search flights FROM Cayman Islands
router.get('/flights/from-cayman', serpApiController.searchFlightsFromCayman);

// Search all flight routes (comprehensive)
router.get('/flights/all-routes', serpApiController.searchAllFlightRoutes);

// ============================================
// VIP SERVICES ENDPOINTS
// ============================================

// Private jet charter services
router.get('/vip/private-jets', serpApiController.searchPrivateJets);

// VIP escort and companion services
router.get('/vip/escort-services', serpApiController.searchVIPEscorts);

// Financial services (funds, wealth management, offshore)
router.get('/vip/financial-services', serpApiController.searchFinancialServices);

// Legal services (law firms, attorneys)
router.get('/vip/legal-services', serpApiController.searchLegalServices);

// Concierge and lifestyle management
router.get('/vip/concierge', serpApiController.searchConciergeServices);

// Superyacht services
router.get('/vip/superyachts', serpApiController.searchSuperyachts);

// Luxury car rentals
router.get('/vip/luxury-cars', serpApiController.searchLuxuryCars);

// Security and protection services
router.get('/vip/security', serpApiController.searchSecurityServices);

// VIP medical services
router.get('/vip/medical', serpApiController.searchMedicalVIP);

// Fetch ALL VIP services (admin operation)
router.post('/vip/fetch-all', serpApiController.fetchAllVIPServices);

// ============================================
// CACHE MANAGEMENT
// ============================================

router.get('/cache-stats', serpApiController.getCacheStats);
router.post('/clear-cache', serpApiController.clearCache);

export default router;
