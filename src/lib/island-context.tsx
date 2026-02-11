/**
 * Island Context Provider
 * Provides island configuration and knowledge base to all components
 *
 * THIS IS A NEW FILE - Does not modify any existing functionality
 * Simply provides the same data through React Context instead of direct imports
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ChatbotConfig, KnowledgeNode, Guide } from '../types/chatbot';
import { loadIslandConfig, loadIslandKnowledgeBase, getCurrentIsland } from '../config/island-loader';

interface IslandContextType {
  config: ChatbotConfig | null;
  knowledgeBase: KnowledgeNode[];
  guides: Guide[];
  isLoading: boolean;
  error: Error | null;
  islandCode: string;
}

const IslandContext = createContext<IslandContextType | undefined>(undefined);

export function IslandProvider({ children }: { children: React.ReactNode }) {
  console.log('🏝️  IslandProvider mounting...');

  const [state, setState] = useState<IslandContextType>({
    config: null,
    knowledgeBase: [],
    guides: [],
    isLoading: true,
    error: null,
    islandCode: getCurrentIsland(),
  });

  useEffect(() => {
    async function loadIslandData() {
      console.log('🏝️  Loading island configuration for:', getCurrentIsland());

      try {
        // Load configuration and knowledge base in parallel
        const [config, { knowledgeBase, guides }] = await Promise.all([
          loadIslandConfig(),
          loadIslandKnowledgeBase(),
        ]);

        console.log('✅ Island data loaded successfully:', {
          island: config.island.name,
          knowledgeNodes: knowledgeBase.length,
          guides: guides.length,
        });

        setState({
          config,
          knowledgeBase,
          guides,
          isLoading: false,
          error: null,
          islandCode: getCurrentIsland(),
        });

        // Update document metadata for SEO
        if (config.seo) {
          document.title = config.seo.title;

          const metaDescription = document.querySelector('meta[name="description"]');
          if (metaDescription) {
            metaDescription.setAttribute('content', config.seo.description);
          } else {
            const meta = document.createElement('meta');
            meta.name = 'description';
            meta.content = config.seo.description;
            document.head.appendChild(meta);
          }
        }

        // Update favicon if specified
        if (config.branding.faviconUrl) {
          let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
          if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
          }
          favicon.href = config.branding.faviconUrl;
        }

        // Apply theme colors as CSS variables
        if (config.branding.primaryColor) {
          document.documentElement.style.setProperty('--island-primary', config.branding.primaryColor);
        }
        if (config.branding.secondaryColor) {
          document.documentElement.style.setProperty('--island-secondary', config.branding.secondaryColor);
        }
        if (config.branding.accentColor) {
          document.documentElement.style.setProperty('--island-accent', config.branding.accentColor);
        }

      } catch (error) {
        console.error('❌ Failed to load island data:', error);

        setState({
          config: null,
          knowledgeBase: [],
          guides: [],
          isLoading: false,
          error: error as Error,
          islandCode: getCurrentIsland(),
        });
      }
    }

    loadIslandData();
  }, []); // Load once on mount

  return (
    <IslandContext.Provider value={state}>
      {children}
    </IslandContext.Provider>
  );
}

/**
 * Hook to access island configuration
 *
 * Usage in components:
 *   const { config, knowledgeBase, guides } = useIsland();
 *
 * This replaces:
 *   import { CAYMAN_CONFIG, CAYMAN_KNOWLEDGE_BASE } from '...';
 *   const config = CAYMAN_CONFIG;
 *   const knowledgeBase = CAYMAN_KNOWLEDGE_BASE;
 */
export function useIsland(): IslandContextType {
  const context = useContext(IslandContext);

  if (!context) {
    throw new Error('useIsland must be used within IslandProvider. Wrap your app with <IslandProvider>');
  }

  return context;
}

/**
 * Loading screen shown while island data loads
 */
export function IslandLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-white">Loading Isle AI...</h2>
        <p className="text-zinc-400 mt-2">Preparing your island experience</p>
      </div>
    </div>
  );
}

/**
 * Error screen shown if island data fails to load
 */
export function IslandErrorScreen({ error }: { error: Error }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Failed to Load Island</h2>
        <p className="text-zinc-400 mb-4">
          We encountered an error loading the island configuration.
        </p>
        <pre className="bg-zinc-800 p-4 rounded-lg text-left text-sm text-zinc-300 mb-4 overflow-auto">
          {error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium transition-colors"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
