/**
 * SerpAPI Frontend Service
 *
 * Client-side service for interacting with the SerpAPI backend endpoints.
 * Provides real-time web search capabilities for the RAG chatbot.
 */

import type { KnowledgeNode, KnowledgeCategory, MapMarker, PlaceCard } from '../types/chatbot';
import { normalizeWebsiteUrl, fixCommonUrlIssues } from '../utils/urlUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ============================================
// TYPES
// ============================================

export interface OpeningHoursInfo {
  raw?: string | null;
  isOpen?: boolean | null;
  todayHours?: {
    opens?: string;
    closes?: string;
  } | null;
  schedule?: Record<string, { open: string; close: string }>;
  formattedDisplay?: string | null;
}

export interface PriceInfo {
  priceRange: string;
  priceFrom?: number | null;
  priceTo?: number | null;
  pricePerUnit?: string | null;
  priceDescription?: string | null;
  currency: string;
}

export interface SerpApiPlace {
  id: string;
  category: KnowledgeCategory;
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
    website?: string;
    bookingUrl?: string;
  };
  media: {
    thumbnail: string;
    images: string[];
    videos?: string[];
  };
  business: {
    priceRange: string;
    priceFrom?: number | null;
    priceTo?: number | null;
    pricePerUnit?: string | null;
    priceDescription?: string | null;
    currency: string;
    openingHours?: OpeningHoursInfo;
    reservationRequired?: boolean;
    serviceOptions?: Record<string, boolean>;
  };
  ratings: {
    overall: number;
    reviewCount: number;
    googleRating?: number;
  };
  tags: string[];
  keywords: string[];
  isFromSerpApi: boolean;
  isFeatured?: boolean;
  serpApiData?: {
    originalQuery: string;
    fetchedAt: string;
  };
}

export interface SerpApiSearchResult {
  success: boolean;
  query: string;
  count: number;
  places: SerpApiPlace[];
  metadata: {
    searchEngine: string;
    fetchedAt: string;
  };
}

export interface SerpApiNewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  date: string;
  snippet: string;
  thumbnail?: string;
}

export interface SerpApiImage {
  id: string;
  title: string;
  link: string;
  original: string;
  thumbnail: string;
  source: string;
}

export interface SerpApiComprehensiveResult {
  success: boolean;
  query: string;
  places: SerpApiPlace[];
  generalInfo: any[];
  news: SerpApiNewsItem[];
  images: SerpApiImage[];
  knowledgeGraph?: any;
  metadata: {
    fetchedAt: string;
    totalPlaces: number;
    totalNews: number;
    totalImages: number;
  };
}

export interface SerpApiRAGResponse {
  success: boolean;
  query: string;
  originalQuery: string;
  intent?: string;
  categories?: KnowledgeCategory[];
  nodes: SerpApiPlace[];
  news: SerpApiNewsItem[];
  images: SerpApiImage[];
  metadata: {
    searchType: string;
    ragOptimized: boolean;
    fetchedAt: string;
    placesCount: number;
    newsCount: number;
    imagesCount: number;
    dataCompleteness: {
      hasPlaces: boolean;
      hasNews: boolean;
      hasImages: boolean;
    };
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert SerpAPI place to KnowledgeNode format
 */
export function serpPlaceToKnowledgeNode(place: SerpApiPlace): KnowledgeNode {
  return {
    id: place.id,
    category: place.category,
    subcategory: place.subcategory,
    name: place.name,
    description: place.description,
    shortDescription: place.shortDescription,
    location: {
      address: place.location.address,
      district: place.location.district,
      island: place.location.island,
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      googlePlaceId: place.location.googlePlaceId
    },
    contact: {
      phone: place.contact.phone,
      website: normalizeWebsiteUrl(place.contact.website),
      bookingUrl: normalizeWebsiteUrl(place.contact.bookingUrl)
    },
    media: {
      thumbnail: place.media.thumbnail,
      images: place.media.images,
      videos: place.media.videos || []
    },
    business: {
      priceRange: place.business.priceRange as any,
      priceFrom: place.business.priceFrom,
      priceTo: place.business.priceTo,
      pricePerUnit: place.business.pricePerUnit,
      priceDescription: place.business.priceDescription,
      currency: place.business.currency,
      openingHours: place.business.openingHours,
      reservationRequired: place.business.reservationRequired
    },
    ratings: {
      overall: place.ratings.overall,
      reviewCount: place.ratings.reviewCount,
      googleRating: place.ratings.googleRating
    },
    tags: place.tags,
    keywords: place.keywords,
    embeddingText: `${place.name} ${place.description} ${place.tags.join(' ')}`,
    isActive: true,
    isPremium: false,
    isFeatured: place.isFeatured || (place.ratings.overall >= 4.5 && place.ratings.reviewCount > 100),
    createdAt: place.serpApiData?.fetchedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'serpapi'
  } as KnowledgeNode;
}

/**
 * Convert SerpAPI place to PlaceCard format
 */
export function serpPlaceToPlaceCard(place: SerpApiPlace): PlaceCard {
  return {
    nodeId: place.id,
    name: place.name,
    category: place.category,
    thumbnail: place.media.thumbnail,
    rating: place.ratings.overall,
    reviewCount: place.ratings.reviewCount,
    priceRange: place.business.priceRange as any,
    shortDescription: place.shortDescription,
    location: {
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      district: place.location.district
    },
    bookingUrl: normalizeWebsiteUrl(place.contact.bookingUrl),
    isFeatured: place.ratings.overall >= 4.5
  };
}

/**
 * Convert SerpAPI place to MapMarker format
 */
export function serpPlaceToMapMarker(place: SerpApiPlace): MapMarker {
  return {
    id: `marker-${place.id}`,
    nodeId: place.id,
    latitude: place.location.latitude,
    longitude: place.location.longitude,
    title: place.name,
    category: place.category,
    subtitle: place.shortDescription,
    thumbnail: place.media.thumbnail,
    rating: place.ratings.overall,
    reviewCount: place.ratings.reviewCount,
    priceRange: place.business.priceRange as any,
    address: place.location.address
  };
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Search for local places
 */
export async function searchPlaces(
  query: string,
  options: { location?: string; type?: string; limit?: number } = {}
): Promise<SerpApiSearchResult> {
  const params = new URLSearchParams({
    q: query,
    ...(options.location && { location: options.location }),
    ...(options.type && { type: options.type }),
    ...(options.limit && { limit: options.limit.toString() })
  });

  const response = await fetch(`${API_BASE_URL}/serpapi/places?${params}`);

  if (!response.ok) {
    throw new Error(`SerpAPI search failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Search with Google local results
 */
export async function searchLocal(
  query: string,
  options: { location?: string; limit?: number } = {}
): Promise<SerpApiSearchResult> {
  const params = new URLSearchParams({
    q: query,
    ...(options.location && { location: options.location }),
    ...(options.limit && { limit: options.limit.toString() })
  });

  const response = await fetch(`${API_BASE_URL}/serpapi/local?${params}`);

  if (!response.ok) {
    throw new Error(`SerpAPI local search failed: ${response.status}`);
  }

  return response.json();
}

/**
 * General web search
 */
export async function searchGeneral(
  query: string,
  options: { location?: string; limit?: number } = {}
): Promise<any> {
  const params = new URLSearchParams({
    q: query,
    ...(options.location && { location: options.location }),
    ...(options.limit && { limit: options.limit.toString() })
  });

  const response = await fetch(`${API_BASE_URL}/serpapi/search?${params}`);

  if (!response.ok) {
    throw new Error(`SerpAPI general search failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Search for news
 */
export async function searchNews(
  query: string,
  options: { location?: string; limit?: number; timeFrame?: string } = {}
): Promise<{ success: boolean; news: SerpApiNewsItem[] }> {
  const params = new URLSearchParams({
    q: query,
    ...(options.location && { location: options.location }),
    ...(options.limit && { limit: options.limit.toString() }),
    ...(options.timeFrame && { timeFrame: options.timeFrame })
  });

  const response = await fetch(`${API_BASE_URL}/serpapi/news?${params}`);

  if (!response.ok) {
    throw new Error(`SerpAPI news search failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Search for images
 */
export async function searchImages(
  query: string,
  options: { location?: string; limit?: number } = {}
): Promise<{ success: boolean; images: SerpApiImage[] }> {
  const params = new URLSearchParams({
    q: query,
    ...(options.location && { location: options.location }),
    ...(options.limit && { limit: options.limit.toString() })
  });

  const response = await fetch(`${API_BASE_URL}/serpapi/images?${params}`);

  if (!response.ok) {
    throw new Error(`SerpAPI image search failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Comprehensive search - all data types
 */
export async function comprehensiveSearch(
  query: string,
  options: { location?: string } = {}
): Promise<SerpApiComprehensiveResult> {
  const params = new URLSearchParams({
    q: query,
    ...(options.location && { location: options.location })
  });

  const response = await fetch(`${API_BASE_URL}/serpapi/comprehensive?${params}`);

  if (!response.ok) {
    throw new Error(`SerpAPI comprehensive search failed: ${response.status}`);
  }

  return response.json();
}

/**
 * RAG-optimized search for chatbot
 * This is the main function to use when integrating with the RAG system
 */
export async function ragSearch(
  query: string,
  options: {
    categories?: KnowledgeCategory[];
    intent?: string;
    conversationContext?: string;
  } = {}
): Promise<SerpApiRAGResponse> {
  const response = await fetch(`${API_BASE_URL}/serpapi/rag-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      categories: options.categories,
      intent: options.intent,
      conversationContext: options.conversationContext
    })
  });

  if (!response.ok) {
    throw new Error(`SerpAPI RAG search failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch all Cayman Islands data for knowledge base population
 */
export async function fetchAllCaymanData(): Promise<{
  success: boolean;
  totalPlaces: number;
  places: SerpApiPlace[];
}> {
  const response = await fetch(`${API_BASE_URL}/serpapi/fetch-all`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error(`SerpAPI fetch all failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{ size: number; entries: string[] }> {
  const response = await fetch(`${API_BASE_URL}/serpapi/cache-stats`);

  if (!response.ok) {
    throw new Error(`Failed to get cache stats: ${response.status}`);
  }

  return response.json();
}

/**
 * Clear the SerpAPI cache
 */
export async function clearCache(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/serpapi/clear-cache`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error(`Failed to clear cache: ${response.status}`);
  }

  return response.json();
}

// ============================================
// INTEGRATION HELPERS
// ============================================

/**
 * Merge SerpAPI results with existing knowledge base nodes
 * Deduplicates and ranks by relevance
 */
export function mergeWithKnowledgeBase(
  serpResults: SerpApiPlace[],
  knowledgeNodes: KnowledgeNode[],
  query: string
): KnowledgeNode[] {
  // Convert SerpAPI results to KnowledgeNodes
  const serpNodes = serpResults.map(serpPlaceToKnowledgeNode);

  // Create a map of existing nodes by name (lowercase for comparison)
  const existingNodeMap = new Map<string, KnowledgeNode>();
  knowledgeNodes.forEach(node => {
    existingNodeMap.set(node.name.toLowerCase(), node);
  });

  // Merge results, preferring existing nodes but augmenting with SerpAPI data
  const mergedNodes: KnowledgeNode[] = [];
  const addedNames = new Set<string>();

  // First, add all knowledge base nodes that match the query
  knowledgeNodes.forEach(node => {
    const nameMatch = node.name.toLowerCase().includes(query.toLowerCase());
    const descMatch = node.description?.toLowerCase().includes(query.toLowerCase());
    const tagMatch = node.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()));

    if (nameMatch || descMatch || tagMatch) {
      mergedNodes.push(node);
      addedNames.add(node.name.toLowerCase());
    }
  });

  // Then add SerpAPI nodes that don't duplicate existing ones
  serpNodes.forEach(node => {
    if (!addedNames.has(node.name.toLowerCase())) {
      mergedNodes.push(node);
      addedNames.add(node.name.toLowerCase());
    }
  });

  // Sort by rating and review count
  mergedNodes.sort((a, b) => {
    const scoreA = (a.ratings?.overall || 0) * 10 + Math.log10((a.ratings?.reviewCount || 1) + 1);
    const scoreB = (b.ratings?.overall || 0) * 10 + Math.log10((b.ratings?.reviewCount || 1) + 1);
    return scoreB - scoreA;
  });

  return mergedNodes;
}

/**
 * Check if SerpAPI is available
 */
export async function checkAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/serpapi/cache-stats`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default {
  searchPlaces,
  searchLocal,
  searchGeneral,
  searchNews,
  searchImages,
  comprehensiveSearch,
  ragSearch,
  fetchAllCaymanData,
  getCacheStats,
  clearCache,
  serpPlaceToKnowledgeNode,
  serpPlaceToPlaceCard,
  serpPlaceToMapMarker,
  mergeWithKnowledgeBase,
  checkAvailability
};
