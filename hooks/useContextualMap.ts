/**
 * useContextualMap Hook
 * Bridges ChatbotPanel and InteractiveMap with intelligent point selection
 *
 * Features:
 * - Initializes embedding store on mount
 * - Manages marker states with animations
 * - Updates context from conversation
 * - Provides focus point for camera
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { MapMarker, KnowledgeNode, KnowledgeCategory } from '../types/chatbot';
import { contextTracker, type ConversationContext } from '../services/contextTracker';
import { selectMapPoints, selectForHighlight, type PointSelectionResult } from '../services/pointSelector';
import { loadEmbeddingStore, isEmbeddingsLoaded } from '../services/embeddingLoader';
import { MapTransitionManager, type MarkerState } from '../services/mapTransitionManager';

// Production optimization: Debounce utility for rapid updates
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };

  return debounced;
}

// Types
export interface UseContextualMapOptions {
  knowledgeBase: KnowledgeNode[];
  enabled?: boolean;
  maxMarkers?: number;
  maxHighlighted?: number;
}

export interface MapFocusOptions {
  zoom?: number;
  animate?: boolean;
  highlightDuration?: number;
  pulseEffect?: boolean;
}

export interface UseContextualMapResult {
  // Map state
  markers: MapMarker[];
  highlightedMarkerIds: string[];
  markerStates: Map<string, MarkerState>;
  focusPoint: { lat: number; lng: number; zoom: number } | null;

  // Actions
  updateContextFromMessage: (
    userMessage: string,
    assistantResponse: string,
    mentionedPlaceIds: string[],
    detectedCategories: KnowledgeCategory[]
  ) => Promise<void>;

  highlightPlace: (placeId: string) => void;
  highlightPlaces: (placeIds: string[]) => void;
  clearHighlights: () => void;
  resetContext: () => void;
  refreshSelection: () => Promise<void>;

  // Enhanced zoom functions
  smoothZoomToPlace: (place: KnowledgeNode, options?: MapFocusOptions) => void;
  smoothZoomToPlaces: (places: KnowledgeNode[], options?: MapFocusOptions) => void;
  focusOnCoordinates: (lat: number, lng: number, zoom?: number) => void;

  // For manual marker addition (e.g., "Show on Map")
  addTemporaryMarker: (marker: MapMarker) => void;
  removeTemporaryMarker: (markerId: string) => void;

  // State
  isLoading: boolean;
  isEmbeddingsReady: boolean;
  context: ConversationContext | null;
  selectionStats: PointSelectionResult['stats'] | null;
}

/**
 * Main hook for context-aware map management
 */
export function useContextualMap(options: UseContextualMapOptions): UseContextualMapResult {
  const { knowledgeBase, enabled = true, maxMarkers = 35, maxHighlighted = 8 } = options;

  // State
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [highlightedMarkerIds, setHighlightedMarkerIds] = useState<string[]>([]);
  const [markerStates, setMarkerStates] = useState<Map<string, MarkerState>>(new Map());
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmbeddingsReady, setIsEmbeddingsReady] = useState(false);
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [selectionStats, setSelectionStats] = useState<PointSelectionResult['stats'] | null>(null);

  // Temporary markers (for Show on Map feature)
  const temporaryMarkersRef = useRef<Map<string, MapMarker>>(new Map());

  // Refs
  const transitionManagerRef = useRef<MapTransitionManager | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize transition manager
  useEffect(() => {
    transitionManagerRef.current = new MapTransitionManager(
      (states) => setMarkerStates(new Map(states))
    );

    return () => {
      transitionManagerRef.current?.destroy();
    };
  }, []);

  // Initialize embeddings on mount (lazy load)
  useEffect(() => {
    if (!enabled) return;

    const initEmbeddings = async () => {
      try {
        // Delay loading to not block initial render
        await new Promise(r => setTimeout(r, 500));
        await loadEmbeddingStore();
        setIsEmbeddingsReady(true);
        console.log('[useContextualMap] Embeddings loaded');
      } catch (error) {
        console.warn('[useContextualMap] Embeddings not available, using interest-based selection');
        setIsEmbeddingsReady(false);
      }
    };

    initEmbeddings();
  }, [enabled]);

  // Initialize with default selection when knowledge base is ready
  useEffect(() => {
    if (!enabled || knowledgeBase.length === 0 || isInitializedRef.current) return;

    const initSelection = async () => {
      isInitializedRef.current = true;

      try {
        const result = await selectMapPoints(
          contextTracker.getContext(),
          knowledgeBase,
          { maxTotal: maxMarkers, maxHighlighted }
        );

        applySelection(result, false); // No animation for initial load
        console.log(`[useContextualMap] Initial selection: ${result.markers.length} markers`);
      } catch (error) {
        console.error('[useContextualMap] Failed to initialize selection:', error);
      }
    };

    initSelection();
  }, [enabled, knowledgeBase, maxMarkers, maxHighlighted]);

  /**
   * Apply a selection result to state
   */
  const applySelection = useCallback((
    result: PointSelectionResult,
    animate: boolean = true
  ) => {
    // Merge with temporary markers
    const allMarkers = [...result.markers];
    for (const marker of temporaryMarkersRef.current.values()) {
      if (!allMarkers.find(m => m.id === marker.id)) {
        allMarkers.push(marker);
      }
    }

    setMarkers(allMarkers);
    setHighlightedMarkerIds(result.highlightedIds);
    setSelectionStats(result.stats);

    if (result.focusPoint) {
      setFocusPoint(result.focusPoint);
    }

    // Apply transitions
    transitionManagerRef.current?.transitionTo(
      allMarkers,
      result.highlightedIds,
      animate
    );
  }, []);

  /**
   * Update context from a message exchange
   */
  const updateContextFromMessage = useCallback(async (
    userMessage: string,
    assistantResponse: string,
    mentionedPlaceIds: string[],
    detectedCategories: KnowledgeCategory[]
  ) => {
    if (!enabled || knowledgeBase.length === 0) return;

    setIsLoading(true);

    try {
      // Update context tracker
      const newContext = await contextTracker.updateContext(
        userMessage,
        assistantResponse,
        mentionedPlaceIds,
        detectedCategories
      );

      setContext(newContext);

      // Select new map points based on updated context
      const result = await selectMapPoints(
        newContext,
        knowledgeBase,
        {
          maxTotal: maxMarkers,
          maxHighlighted,
          enableSemanticSearch: isEmbeddingsReady
        }
      );

      applySelection(result, true);

      console.log(
        `[useContextualMap] Context update: ${result.markers.length} markers, ` +
        `${result.highlightedIds.length} highlighted`
      );

    } catch (error) {
      console.error('[useContextualMap] Failed to update context:', error);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, knowledgeBase, maxMarkers, maxHighlighted, isEmbeddingsReady, applySelection]);

  /**
   * Highlight a single place
   */
  const highlightPlace = useCallback((placeId: string) => {
    const markerId = `marker-${placeId}`;

    // Check if marker exists, if not add it temporarily
    const existingMarker = markers.find(m => m.nodeId === placeId);

    if (!existingMarker) {
      const newMarker = selectForHighlight(placeId, knowledgeBase, markers);
      if (newMarker) {
        temporaryMarkersRef.current.set(newMarker.id, newMarker);
        setMarkers(prev => [...prev, newMarker]);

        // Transition the new marker in
        transitionManagerRef.current?.transitionTo(
          [...markers, newMarker],
          [markerId],
          true
        );
      }
    } else {
      // Just highlight existing marker
      transitionManagerRef.current?.setHighlights([markerId]);
    }

    setHighlightedMarkerIds([markerId]);

    // Set focus point to the marker
    const node = knowledgeBase.find(n => n.id === placeId);
    if (node) {
      const lat = node.location?.coordinates?.lat ?? node.location?.latitude;
      const lng = node.location?.coordinates?.lng ?? node.location?.longitude;
      if (lat !== undefined && lng !== undefined) {
        setFocusPoint({ lat, lng, zoom: 15 });
      }

      // Boost category interest
      contextTracker.boostCategory(node.category as KnowledgeCategory, 0.2);
    }

    // Clear highlight after timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      clearHighlights();
    }, 6000);
  }, [markers, knowledgeBase]);

  /**
   * Highlight multiple places
   */
  const highlightPlaces = useCallback((placeIds: string[]) => {
    const markerIds = placeIds.map(id => `marker-${id}`);

    // Add any missing markers temporarily
    const newMarkers: MapMarker[] = [];
    for (const placeId of placeIds) {
      const exists = markers.find(m => m.nodeId === placeId);
      if (!exists) {
        const marker = selectForHighlight(placeId, knowledgeBase, markers);
        if (marker) {
          temporaryMarkersRef.current.set(marker.id, marker);
          newMarkers.push(marker);
        }
      }
    }

    if (newMarkers.length > 0) {
      const allMarkers = [...markers, ...newMarkers];
      setMarkers(allMarkers);
      transitionManagerRef.current?.transitionTo(allMarkers, markerIds, true);
    } else {
      transitionManagerRef.current?.setHighlights(markerIds);
    }

    setHighlightedMarkerIds(markerIds);

    // Calculate focus for all highlighted
    if (placeIds.length > 0) {
      const coords: { lat: number; lng: number }[] = [];
      for (const placeId of placeIds) {
        const node = knowledgeBase.find(n => n.id === placeId);
        if (node) {
          const lat = node.location?.coordinates?.lat ?? node.location?.latitude;
          const lng = node.location?.coordinates?.lng ?? node.location?.longitude;
          if (lat !== undefined && lng !== undefined) {
            coords.push({ lat, lng });
          }
        }
      }

      if (coords.length > 0) {
        const centerLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
        const centerLng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;
        const zoom = coords.length === 1 ? 15 : coords.length <= 3 ? 14 : 13;
        setFocusPoint({ lat: centerLat, lng: centerLng, zoom });
      }
    }

    // Clear after timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      clearHighlights();
    }, 6000);
  }, [markers, knowledgeBase]);

  /**
   * Clear all highlights
   */
  const clearHighlights = useCallback(() => {
    setHighlightedMarkerIds([]);
    transitionManagerRef.current?.clearHighlights();

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
  }, []);

  /**
   * Reset context and return to default selection
   */
  const resetContext = useCallback(async () => {
    contextTracker.reset();
    setContext(null);
    setHighlightedMarkerIds([]);
    temporaryMarkersRef.current.clear();

    if (knowledgeBase.length > 0) {
      const result = await selectMapPoints(
        contextTracker.getContext(),
        knowledgeBase,
        { maxTotal: maxMarkers, maxHighlighted }
      );
      applySelection(result, true);
    }
  }, [knowledgeBase, maxMarkers, maxHighlighted, applySelection]);

  /**
   * Refresh selection with current context
   */
  const refreshSelection = useCallback(async () => {
    if (knowledgeBase.length === 0) return;

    setIsLoading(true);
    try {
      const result = await selectMapPoints(
        contextTracker.getContext(),
        knowledgeBase,
        {
          maxTotal: maxMarkers,
          maxHighlighted,
          enableSemanticSearch: isEmbeddingsReady
        }
      );
      applySelection(result, true);
    } catch (error) {
      console.error('[useContextualMap] Failed to refresh selection:', error);
    } finally {
      setIsLoading(false);
    }
  }, [knowledgeBase, maxMarkers, maxHighlighted, isEmbeddingsReady, applySelection]);

  /**
   * Add a temporary marker (for Show on Map feature)
   */
  const addTemporaryMarker = useCallback((marker: MapMarker) => {
    temporaryMarkersRef.current.set(marker.id, marker);
    setMarkers(prev => {
      if (prev.find(m => m.id === marker.id)) return prev;
      return [...prev, marker];
    });
    transitionManagerRef.current?.transitionTo(
      [...markers, marker],
      highlightedMarkerIds,
      true
    );
  }, [markers, highlightedMarkerIds]);

  /**
   * Remove a temporary marker
   */
  const removeTemporaryMarker = useCallback((markerId: string) => {
    temporaryMarkersRef.current.delete(markerId);
    setMarkers(prev => prev.filter(m => m.id !== markerId));
  }, []);

  /**
   * Calculate optimal zoom level based on place type and context
   */
  const calculateOptimalZoom = useCallback((place: KnowledgeNode): number => {
    const category = place.category;

    // Smaller places need tighter zoom
    if (['restaurant', 'bar', 'spa_wellness', 'shopping'].includes(category)) {
      return 17;
    }
    // Medium places
    if (['hotel', 'villa_rental', 'attraction', 'diving_snorkeling'].includes(category)) {
      return 16;
    }
    // Beaches and larger areas
    if (['beach', 'golf', 'activity'].includes(category)) {
      return 15;
    }
    // Default
    return 15;
  }, []);

  /**
   * Smooth zoom to a single place with animation
   * This is the primary function for interactive place clicks
   */
  const smoothZoomToPlace = useCallback((
    place: KnowledgeNode,
    options: MapFocusOptions = {}
  ) => {
    const {
      zoom = calculateOptimalZoom(place),
      animate = true,
      highlightDuration = 8000,
      pulseEffect = true
    } = options;

    const lat = place.location?.coordinates?.lat ?? (place.location as any)?.latitude;
    const lng = place.location?.coordinates?.lng ?? (place.location as any)?.longitude;

    if (lat === undefined || lng === undefined) {
      console.warn('[useContextualMap] Place has no coordinates:', place.name);
      return;
    }

    const placeId = place.id;
    const markerId = `marker-${placeId}`;

    // Ensure marker exists
    const existingMarker = markers.find(m => m.nodeId === placeId);

    if (!existingMarker) {
      // Create and add marker
      const newMarker = selectForHighlight(placeId, knowledgeBase, markers);
      if (newMarker) {
        temporaryMarkersRef.current.set(newMarker.id, newMarker);
        setMarkers(prev => [...prev, newMarker]);

        // Small delay to ensure marker is rendered before focusing
        setTimeout(() => {
          setFocusPoint({ lat, lng, zoom });
          setHighlightedMarkerIds([markerId]);
          transitionManagerRef.current?.transitionTo(
            [...markers, newMarker],
            [markerId],
            animate
          );
        }, 50);
      }
    } else {
      // Just focus and highlight
      setFocusPoint({ lat, lng, zoom });
      setHighlightedMarkerIds([markerId]);
      transitionManagerRef.current?.setHighlights([markerId]);
    }

    // Boost this category in context
    contextTracker.boostCategory(place.category as KnowledgeCategory, 0.3);

    // Add to recent places
    contextTracker.addRecentPlace(placeId);

    // Clear highlight after duration
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedMarkerIds([]);
      transitionManagerRef.current?.clearHighlights();
    }, highlightDuration);

    console.log(`[useContextualMap] Smooth zoom to: ${place.name} @ zoom ${zoom}`);
  }, [markers, knowledgeBase, calculateOptimalZoom]);

  /**
   * Smooth zoom to multiple places with optimal bounds
   */
  const smoothZoomToPlaces = useCallback((
    places: KnowledgeNode[],
    options: MapFocusOptions = {}
  ) => {
    const {
      animate = true,
      highlightDuration = 8000
    } = options;

    if (places.length === 0) return;

    if (places.length === 1) {
      smoothZoomToPlace(places[0], options);
      return;
    }

    // Collect valid coordinates
    const coords: { lat: number; lng: number }[] = [];
    const placeIds: string[] = [];
    const markerIds: string[] = [];

    for (const place of places) {
      const lat = place.location?.coordinates?.lat ?? (place.location as any)?.latitude;
      const lng = place.location?.coordinates?.lng ?? (place.location as any)?.longitude;

      if (lat !== undefined && lng !== undefined) {
        coords.push({ lat, lng });
        placeIds.push(place.id);
        markerIds.push(`marker-${place.id}`);
      }
    }

    if (coords.length === 0) return;

    // Add missing markers
    const newMarkers: MapMarker[] = [];
    for (const placeId of placeIds) {
      const exists = markers.find(m => m.nodeId === placeId);
      if (!exists) {
        const marker = selectForHighlight(placeId, knowledgeBase, markers);
        if (marker) {
          temporaryMarkersRef.current.set(marker.id, marker);
          newMarkers.push(marker);
        }
      }
    }

    if (newMarkers.length > 0) {
      setMarkers(prev => [...prev, ...newMarkers]);
    }

    // Calculate center and zoom
    const lats = coords.map(c => c.lat);
    const lngs = coords.map(c => c.lng);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    // Calculate zoom based on spread
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lngSpread = Math.max(...lngs) - Math.min(...lngs);
    const maxSpread = Math.max(latSpread, lngSpread);

    let zoom = 15;
    if (maxSpread > 0.005) zoom = 14;
    if (maxSpread > 0.01) zoom = 13;
    if (maxSpread > 0.02) zoom = 12;
    if (maxSpread > 0.05) zoom = 11;
    if (maxSpread > 0.1) zoom = 10;

    // Apply custom zoom if provided
    if (options.zoom) zoom = options.zoom;

    setFocusPoint({ lat: centerLat, lng: centerLng, zoom });
    setHighlightedMarkerIds(markerIds);

    transitionManagerRef.current?.transitionTo(
      [...markers, ...newMarkers],
      markerIds,
      animate
    );

    // Clear highlights after duration
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedMarkerIds([]);
      transitionManagerRef.current?.clearHighlights();
    }, highlightDuration);

    console.log(`[useContextualMap] Smooth zoom to ${places.length} places @ zoom ${zoom}`);
  }, [markers, knowledgeBase, smoothZoomToPlace]);

  /**
   * Focus on specific coordinates
   */
  const focusOnCoordinates = useCallback((
    lat: number,
    lng: number,
    zoom: number = 14
  ) => {
    setFocusPoint({ lat, lng, zoom });
    console.log(`[useContextualMap] Focus on coordinates: ${lat}, ${lng} @ zoom ${zoom}`);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  return {
    markers,
    highlightedMarkerIds,
    markerStates,
    focusPoint,
    updateContextFromMessage,
    highlightPlace,
    highlightPlaces,
    clearHighlights,
    resetContext,
    refreshSelection,
    smoothZoomToPlace,
    smoothZoomToPlaces,
    focusOnCoordinates,
    addTemporaryMarker,
    removeTemporaryMarker,
    isLoading,
    isEmbeddingsReady,
    context,
    selectionStats
  };
}

export default useContextualMap;
