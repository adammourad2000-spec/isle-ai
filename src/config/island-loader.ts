/**
 * Dynamic Island Configuration Loader
 * Loads the correct island config based on environment
 *
 * THIS IS A NEW FILE - Does not modify any existing functionality
 * Simply provides a new way to access the same configuration data
 */

import type { ChatbotConfig, KnowledgeNode, Guide } from '../types/chatbot';

export type IslandCode = 'cayman' | 'bahamas' | 'barbados' | 'maldives' | 'jamaica';

/**
 * Get current island from environment or default to Cayman
 */
export function getCurrentIsland(): IslandCode {
  // Priority 1: Environment variable
  const envIsland = import.meta.env.VITE_ISLAND;
  if (envIsland && ['cayman', 'bahamas', 'barbados', 'maldives', 'jamaica'].includes(envIsland)) {
    return envIsland as IslandCode;
  }

  // Priority 2: Subdomain detection (e.g., bahamas.isleai.com)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    if (['cayman', 'bahamas', 'barbados', 'maldives', 'jamaica'].includes(subdomain)) {
      return subdomain as IslandCode;
    }
  }

  // Default: Cayman Islands (maintains current behavior)
  return 'cayman';
}

/**
 * Dynamically load island configuration
 * Falls back to Cayman if load fails (safety guarantee)
 */
export async function loadIslandConfig(): Promise<ChatbotConfig> {
  const island = getCurrentIsland();

  try {
    const config = await import(`./islands/${island}/config.ts`);
    console.log(`✅ Loaded ${island} configuration`);
    return config.default;
  } catch (error) {
    console.warn(`⚠️  Failed to load config for "${island}", falling back to Cayman`, error);

    // Safety fallback: Always load Cayman if anything goes wrong
    try {
      const fallback = await import('./islands/cayman/config.ts');
      return fallback.default;
    } catch (fallbackError) {
      console.error('❌ Critical: Could not load Cayman fallback config', fallbackError);
      throw new Error('Failed to load island configuration');
    }
  }
}

/**
 * Dynamically load island knowledge base
 * Falls back to empty arrays if load fails (safety guarantee)
 */
export async function loadIslandKnowledgeBase(): Promise<{
  knowledgeBase: KnowledgeNode[];
  guides: Guide[];
}> {
  const island = getCurrentIsland();

  try {
    const kb = await import(`./islands/${island}/knowledge-base.ts`);
    console.log(`✅ Loaded ${island} knowledge base (${kb.KNOWLEDGE_BASE?.length || 0} nodes)`);

    return {
      knowledgeBase: kb.KNOWLEDGE_BASE || [],
      guides: kb.GUIDES || [],
    };
  } catch (error) {
    console.warn(`⚠️  Failed to load knowledge base for "${island}", falling back to Cayman`, error);

    // Safety fallback: Try Cayman
    try {
      const fallback = await import('./islands/cayman/knowledge-base.ts');
      return {
        knowledgeBase: fallback.KNOWLEDGE_BASE || [],
        guides: fallback.GUIDES || [],
      };
    } catch (fallbackError) {
      console.error('❌ Critical: Could not load Cayman fallback knowledge base', fallbackError);

      // Last resort: Return empty arrays (app still works, just no data)
      return {
        knowledgeBase: [],
        guides: [],
      };
    }
  }
}

/**
 * Get island display name
 */
export function getIslandName(code: IslandCode): string {
  const names: Record<IslandCode, string> = {
    cayman: 'Cayman Islands',
    bahamas: 'The Bahamas',
    barbados: 'Barbados',
    maldives: 'Maldives',
    jamaica: 'Jamaica',
  };
  return names[code] || code;
}
