/**
 * Island Configuration Switcher
 *
 * This file exports the correct CONFIG, KNOWLEDGE_BASE, and GUIDES
 * based on the VITE_ISLAND environment variable.
 *
 * IMPORTANT: Knowledge base is loaded at runtime via fetch to avoid
 * bundling large JSON files that cause memory issues.
 */

import type { ChatbotConfig, KnowledgeNode, Guide, KnowledgeCategory, PriceRange, OpeningHoursInfo } from '../types/chatbot';

// Import configs (small files, safe to bundle)
import { CAYMAN_CONFIG, CAYMAN_GUIDES, convertUnifiedToKnowledgeNode } from './cayman-islands-knowledge';
import bahamasConfig from '../src/config/islands/bahamas/config';
import { GUIDES as bahamasGuides } from '../src/config/islands/bahamas/knowledge-base';

// Determine current island from environment
const currentIsland = import.meta.env.VITE_ISLAND || 'cayman';

console.log(`🏝️ Isle AI loading configuration for: ${currentIsland}`);

// Cache for loaded knowledge base
let knowledgeBaseCache: KnowledgeNode[] | null = null;
let loadingPromise: Promise<KnowledgeNode[]> | null = null;

/**
 * Load knowledge base asynchronously from public JSON file
 * This avoids bundling the large file and prevents memory issues
 */
export async function loadKnowledgeBase(): Promise<KnowledgeNode[]> {
  // Return cached if available
  if (knowledgeBaseCache) {
    return knowledgeBaseCache;
  }

  // Return existing promise if loading
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  loadingPromise = (async () => {
    try {
      console.log('📚 Loading knowledge base from /knowledge-base.json...');
      const response = await fetch('/knowledge-base.json');

      if (!response.ok) {
        throw new Error(`Failed to load knowledge base: ${response.status}`);
      }

      const rawData = await response.json();

      // Convert to KnowledgeNode format
      knowledgeBaseCache = rawData.map((place: any) => convertUnifiedToKnowledgeNode(place));

      console.log(`✅ Knowledge base loaded: ${knowledgeBaseCache.length} places`);
      return knowledgeBaseCache;
    } catch (error) {
      console.error('❌ Failed to load knowledge base:', error);
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
}

/**
 * Get knowledge base synchronously (returns cached or empty array)
 * Use loadKnowledgeBase() for async loading
 */
export function getKnowledgeBase(): KnowledgeNode[] {
  return knowledgeBaseCache || [];
}

/**
 * Check if knowledge base is loaded
 */
export function isKnowledgeBaseLoaded(): boolean {
  return knowledgeBaseCache !== null;
}

// Island registry for configs (small, safe to bundle)
const ISLAND_CONFIGS: Record<string, {
  config: ChatbotConfig;
  guides: Guide[];
}> = {
  cayman: {
    config: CAYMAN_CONFIG,
    guides: CAYMAN_GUIDES,
  },
  bahamas: {
    config: bahamasConfig,
    guides: bahamasGuides,
  },
};

// Get the island config (fallback to cayman if not found)
const island = ISLAND_CONFIGS[currentIsland] || ISLAND_CONFIGS.cayman;

if (!ISLAND_CONFIGS[currentIsland]) {
  console.warn(`⚠️ Unknown island "${currentIsland}", falling back to cayman`);
}

// Export the selected island's data
export const ISLAND_CONFIG = island.config;
export const ISLAND_GUIDES = island.guides;

// Export as 'config' and 'guides' for direct import
export const config = island.config;
export const guides = island.guides;

// For backward compatibility - initially empty, use loadKnowledgeBase() to populate
// Components should check isKnowledgeBaseLoaded() or use loadKnowledgeBase()
export const ISLAND_KNOWLEDGE_BASE: KnowledgeNode[] = [];

// Export with original CAYMAN_* names for backward compatibility
export {
  ISLAND_CONFIG as CAYMAN_CONFIG,
  ISLAND_GUIDES as CAYMAN_GUIDES,
};

// Dynamic getter that returns cached or empty
export const CAYMAN_KNOWLEDGE_BASE = new Proxy([] as KnowledgeNode[], {
  get(target, prop) {
    const cache = knowledgeBaseCache || target;
    if (prop === 'length') return cache.length;
    if (prop === Symbol.iterator) return cache[Symbol.iterator].bind(cache);
    if (typeof prop === 'string' && !isNaN(Number(prop))) {
      return cache[Number(prop)];
    }
    if (typeof prop === 'string' && typeof (cache as any)[prop] === 'function') {
      return (cache as any)[prop].bind(cache);
    }
    return (cache as any)[prop];
  }
});

// Export metadata
export const CURRENT_ISLAND = currentIsland;
export const AVAILABLE_ISLANDS = Object.keys(ISLAND_CONFIGS);

export default {
  config: island.config,
  guides: island.guides,
  currentIsland,
  loadKnowledgeBase,
  getKnowledgeBase,
  isKnowledgeBaseLoaded,
};
