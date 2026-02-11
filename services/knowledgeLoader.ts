/**
 * Knowledge Base Lazy Loader
 *
 * Implements on-demand loading of knowledge base chunks to reduce initial bundle size.
 * Knowledge is split by category and loaded when needed.
 */

import type { KnowledgeNode, KnowledgeCategory } from '../types/chatbot';

// Cache for loaded knowledge chunks
const loadedChunks: Map<string, KnowledgeNode[]> = new Map();
let fullKnowledgeBase: KnowledgeNode[] | null = null;
let isLoading = false;
let loadPromise: Promise<KnowledgeNode[]> | null = null;

// Priority categories to load first (most commonly searched)
const PRIORITY_CATEGORIES: KnowledgeCategory[] = [
  'hotel',
  'restaurant',
  'beach',
  'attraction',
  'activity'
];

// Categories to lazy load
const LAZY_CATEGORIES: KnowledgeCategory[] = [
  'diving',
  'villa_rental',
  'boat_charter',
  'transport',
  'general',
  'event',
  'concierge',
  'real_estate',
  'private_jet'
];

/**
 * Load the full knowledge base (for initial load or when all data is needed)
 */
export async function loadFullKnowledgeBase(): Promise<KnowledgeNode[]> {
  if (fullKnowledgeBase) {
    return fullKnowledgeBase;
  }

  if (loadPromise) {
    return loadPromise;
  }

  isLoading = true;

  loadPromise = (async () => {
    try {
      // Fetch from public JSON file to avoid bundling large file
      const response = await fetch('/knowledge-base.json');
      if (!response.ok) {
        throw new Error(`Failed to load knowledge base: ${response.status}`);
      }
      fullKnowledgeBase = await response.json();

      // Populate chunk cache
      for (const node of fullKnowledgeBase) {
        const category = node.category;
        if (!loadedChunks.has(category)) {
          loadedChunks.set(category, []);
        }
        loadedChunks.get(category)!.push(node);
      }

      console.log(`📚 Knowledge base loaded: ${fullKnowledgeBase.length} nodes`);
      return fullKnowledgeBase;
    } finally {
      isLoading = false;
    }
  })();

  return loadPromise;
}

/**
 * Load knowledge for specific categories only
 */
export async function loadCategoryKnowledge(categories: KnowledgeCategory[]): Promise<KnowledgeNode[]> {
  // If full KB is loaded, filter from it
  if (fullKnowledgeBase) {
    return fullKnowledgeBase.filter(node => categories.includes(node.category));
  }

  // Check cache first
  const cached: KnowledgeNode[] = [];
  const needsLoading: KnowledgeCategory[] = [];

  for (const category of categories) {
    if (loadedChunks.has(category)) {
      cached.push(...loadedChunks.get(category)!);
    } else {
      needsLoading.push(category);
    }
  }

  // If everything is cached, return it
  if (needsLoading.length === 0) {
    return cached;
  }

  // Need to load full KB to get the categories
  // In a production app, you'd have separate chunk files per category
  const fullKB = await loadFullKnowledgeBase();
  return fullKB.filter(node => categories.includes(node.category));
}

/**
 * Search knowledge base with lazy loading
 * Only loads the full KB if necessary
 */
export async function searchKnowledge(
  query: string,
  categories: KnowledgeCategory[],
  maxResults: number = 5
): Promise<KnowledgeNode[]> {
  // For now, load full KB for search
  // In production, you'd implement server-side search
  const kb = await loadFullKnowledgeBase();
  return kb.filter(node => categories.includes(node.category)).slice(0, maxResults);
}

/**
 * Get knowledge base status
 */
export function getKnowledgeStatus(): {
  loaded: boolean;
  loading: boolean;
  nodeCount: number;
  cachedCategories: string[];
} {
  return {
    loaded: fullKnowledgeBase !== null,
    loading: isLoading,
    nodeCount: fullKnowledgeBase?.length || 0,
    cachedCategories: Array.from(loadedChunks.keys())
  };
}

/**
 * Preload priority categories in the background
 * Call this after initial page load
 */
export function preloadPriorityKnowledge(): void {
  // Use requestIdleCallback for non-blocking load
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      loadFullKnowledgeBase();
    });
  } else {
    // Fallback for Safari
    setTimeout(() => {
      loadFullKnowledgeBase();
    }, 1000);
  }
}

/**
 * Get a single place by ID (loads KB if needed)
 */
export async function getPlaceById(nodeId: string): Promise<KnowledgeNode | undefined> {
  const kb = await loadFullKnowledgeBase();
  return kb.find(node => node.id === nodeId);
}

/**
 * Get places by category (lazy loads)
 */
export async function getPlacesByCategory(category: KnowledgeCategory): Promise<KnowledgeNode[]> {
  return loadCategoryKnowledge([category]);
}

/**
 * Get top rated places (loads KB if needed)
 */
export async function getTopRatedPlaces(limit: number = 5): Promise<KnowledgeNode[]> {
  const kb = await loadFullKnowledgeBase();
  return [...kb]
    .sort((a, b) => b.ratings.overall - a.ratings.overall)
    .slice(0, limit);
}

export default {
  loadFullKnowledgeBase,
  loadCategoryKnowledge,
  searchKnowledge,
  getKnowledgeStatus,
  preloadPriorityKnowledge,
  getPlaceById,
  getPlacesByCategory,
  getTopRatedPlaces
};
