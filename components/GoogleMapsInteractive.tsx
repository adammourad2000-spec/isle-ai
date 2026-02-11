/**
 * ISLE AI - Google Maps Interactive Component
 * Premium Google Maps with hyper-fluid, liquid interactions
 *
 * Features:
 * - Automatic card dismissal on map interaction
 * - Liquid spring animations for cards
 * - Smooth gesture handling
 * - Premium visual experience
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  MarkerClusterer,
  OverlayView,
} from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Globe, Navigation, X,
  Maximize2, Minimize2, Search, LocateFixed,
  Loader2, AlertCircle, Satellite, Map as MapIcon, ZoomIn, ZoomOut,
  Phone, ExternalLink, MapPin
} from 'lucide-react';
import type { MapMarker, KnowledgeCategory } from '../types/chatbot';
import type { MarkerState } from '../services/mapTransitionManager';

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

// Cayman Islands center
const CAYMAN_CENTER = { lat: 19.3133, lng: -81.2546 };
const DEFAULT_ZOOM = 11;

// Category configuration for markers
const categoryConfig: Record<string, { color: string; label: string; icon: string }> = {
  hotel: { color: '#8b5cf6', label: 'Hotels', icon: '🏨' },
  restaurant: { color: '#f59e0b', label: 'Restaurants', icon: '🍽️' },
  beach: { color: '#06b6d4', label: 'Beaches', icon: '🏖️' },
  attraction: { color: '#ec4899', label: 'Attractions', icon: '📸' },
  activity: { color: '#10b981', label: 'Activities', icon: '🎯' },
  diving_snorkeling: { color: '#0ea5e9', label: 'Diving', icon: '🤿' },
  villa_rental: { color: '#84cc16', label: 'Villas', icon: '🏡' },
  boat_charter: { color: '#3b82f6', label: 'Boats', icon: '⛵' },
  bar: { color: '#a855f7', label: 'Bars', icon: '🍸' },
  nightlife: { color: '#d946ef', label: 'Nightlife', icon: '🌙' },
  shopping: { color: '#f43f5e', label: 'Shopping', icon: '🛍️' },
  spa_wellness: { color: '#14b8a6', label: 'Spa', icon: '💆' },
  spa: { color: '#14b8a6', label: 'Spa', icon: '💆' },
  transport: { color: '#64748b', label: 'Transport', icon: '🚗' },
  transportation: { color: '#64748b', label: 'Transport', icon: '🚗' },
  medical_vip: { color: '#ef4444', label: 'Medical', icon: '🏥' },
  service: { color: '#6b7280', label: 'Services', icon: '🔧' },
  concierge: { color: '#eab308', label: 'Concierge', icon: '⭐' },
  general_info: { color: '#6b7280', label: 'Info', icon: 'ℹ️' },
  water_sports: { color: '#0ea5e9', label: 'Water Sports', icon: '🏄' },
  golf: { color: '#22c55e', label: 'Golf', icon: '⛳' },
};

const defaultCategoryConfig = { color: '#6b7280', label: 'Place', icon: '📍' };

// Props interface
interface GoogleMapsInteractiveProps {
  markers: MapMarker[];
  selectedMarkerId?: string;
  highlightedMarkerIds?: string[];
  markerStates?: Map<string, MarkerState>;
  focusPoint?: { lat: number; lng: number; zoom: number } | null;
  onMarkerSelect?: (markerId: string) => void;
  onMarkerHover?: (markerId: string | null) => void;
  onAskAI?: (marker: MapMarker) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
  showFilters?: boolean;
  showSearch?: boolean;
  enableClustering?: boolean;
  autoFitOnChange?: boolean;
}

// Map container style
const containerStyle = { width: '100%', height: '100%' };

// Libraries to load (includes visualization for heatmap support)
const libraries: ("places" | "visualization")[] = ['places', 'visualization'];

// Premium map styles for a cleaner look
const mapStyles = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#a3ccff' }] },
];

const GoogleMapsInteractive: React.FC<GoogleMapsInteractiveProps> = ({
  markers,
  selectedMarkerId,
  highlightedMarkerIds = [],
  markerStates,
  focusPoint,
  onMarkerSelect,
  onMarkerHover,
  onAskAI,
  isExpanded = false,
  onToggleExpand,
  className = '',
  showFilters = true,
  showSearch = true,
  enableClustering = true,
  autoFitOnChange = true,
}) => {
  // Load Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // State
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeMarker, setActiveMarker] = useState<MapMarker | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);
  const [mapType, setMapType] = useState<string>('roadmap');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Refs for smooth interaction handling
  const prevMarkersLength = useRef(markers.length);
  const interactionTimeout = useRef<NodeJS.Timeout | null>(null);
  const cardDismissTimeout = useRef<NodeJS.Timeout | null>(null);
  const cardShowTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionTime = useRef<number>(0);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Filter markers
  const filteredMarkers = useMemo(() => {
    let filtered = markers;
    if (activeFilters.size > 0) {
      filtered = filtered.filter(m => activeFilters.has(m.category));
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.subtitle?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [markers, activeFilters, searchQuery]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    markers.forEach(m => cats.add(m.category));
    return Array.from(cats);
  }, [markers]);

  // Premium map options for smooth interactions
  const mapOptions = useMemo(() => {
    if (!isLoaded) return {};

    return {
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      minZoom: 9,
      maxZoom: 20,
      mapTypeId: mapType,
      gestureHandling: 'greedy', // Smooth scroll without ctrl
      scrollwheel: true,
      // Restriction to Cayman area
      restriction: {
        latLngBounds: { north: 20.5, south: 19.0, west: -82.5, east: -79.0 },
        strictBounds: false,
      },
      styles: mapType === 'roadmap' ? mapStyles : [],
    };
  }, [mapType, isLoaded]);

  // Dismiss card instantly - hyper responsive
  const dismissCard = useCallback(() => {
    lastInteractionTime.current = Date.now();
    setCardVisible(false);
    // Clear after animation completes
    if (cardDismissTimeout.current) clearTimeout(cardDismissTimeout.current);
    cardDismissTimeout.current = setTimeout(() => {
      setActiveMarker(null);
      setImageLoaded(false);
    }, 150);
  }, []);

  // Map load callback with hyper-fluid interaction handling
  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);

    // INSTANT card dismissal on any map interaction
    mapInstance.addListener('dragstart', () => {
      setIsInteracting(true);
      dismissCard();
    });

    mapInstance.addListener('drag', () => {
      // Keep dismissing during drag for safety
      if (activeMarker) dismissCard();
    });

    mapInstance.addListener('dragend', () => {
      if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
      interactionTimeout.current = setTimeout(() => setIsInteracting(false), 200);
    });

    mapInstance.addListener('zoom_changed', () => {
      setIsInteracting(true);
      dismissCard();
      if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
      interactionTimeout.current = setTimeout(() => setIsInteracting(false), 300);
    });

    // Also dismiss on any click on map (not markers)
    mapInstance.addListener('click', () => {
      dismissCard();
    });

    // Dismiss on right-click too
    mapInstance.addListener('rightclick', () => {
      dismissCard();
    });

    // Dismiss on bounds change (panning, zooming)
    mapInstance.addListener('bounds_changed', () => {
      // Debounce to avoid too many calls
      const now = Date.now();
      if (now - lastInteractionTime.current > 100 && cardVisible) {
        dismissCard();
      }
    });

    // Fit bounds smoothly on initial load
    if (markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(marker => {
        bounds.extend({ lat: marker.latitude, lng: marker.longitude });
      });
      setTimeout(() => {
        mapInstance.fitBounds(bounds, { top: 60, right: 60, bottom: 80, left: 60 });
      }, 100);
    }
  }, [markers, dismissCard, activeMarker, cardVisible]);

  const onUnmount = useCallback(() => {
    if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
    if (cardDismissTimeout.current) clearTimeout(cardDismissTimeout.current);
    if (cardShowTimeout.current) clearTimeout(cardShowTimeout.current);
    setMap(null);
  }, []);

  // Pan to selected marker smoothly
  useEffect(() => {
    if (map && selectedMarkerId) {
      const marker = markers.find(m => m.id === selectedMarkerId);
      if (marker) {
        map.panTo({ lat: marker.latitude, lng: marker.longitude });
        const currentZoom = map.getZoom() || 11;
        if (currentZoom < 15) {
          setTimeout(() => map.setZoom(16), 300);
        }
        setActiveMarker(marker);
      }
    }
  }, [map, selectedMarkerId, markers]);

  // Pan to highlighted markers
  useEffect(() => {
    if (map && highlightedMarkerIds.length > 0 && !isInteracting) {
      const marker = markers.find(m => highlightedMarkerIds.includes(m.id));
      if (marker) {
        map.panTo({ lat: marker.latitude, lng: marker.longitude });
        const currentZoom = map.getZoom() || 11;
        if (currentZoom < 14) {
          setTimeout(() => map.setZoom(15), 300);
        }
      }
    }
  }, [map, highlightedMarkerIds, markers, isInteracting]);

  // Handle focusPoint from intelligent map system
  const prevFocusRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  useEffect(() => {
    if (map && focusPoint && !isInteracting) {
      // Only pan if focus point changed significantly
      const prev = prevFocusRef.current;
      const changed = !prev ||
        Math.abs(prev.lat - focusPoint.lat) > 0.001 ||
        Math.abs(prev.lng - focusPoint.lng) > 0.001 ||
        prev.zoom !== focusPoint.zoom;

      if (changed) {
        map.panTo({ lat: focusPoint.lat, lng: focusPoint.lng });
        setTimeout(() => {
          map.setZoom(focusPoint.zoom);
        }, 300);
        prevFocusRef.current = focusPoint;
      }
    }
  }, [map, focusPoint, isInteracting]);

  // Auto-fit on markers change
  useEffect(() => {
    if (map && autoFitOnChange && markers.length !== prevMarkersLength.current && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(marker => {
        bounds.extend({ lat: marker.latitude, lng: marker.longitude });
      });
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 80, left: 60 });
      prevMarkersLength.current = markers.length;
    }
  }, [map, markers, autoFitOnChange]);

  // Touch event handling for mobile - dismiss card on touch move
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const handleTouchStart = () => {
      // Mark interaction start
      lastInteractionTime.current = Date.now();
    };

    const handleTouchMove = () => {
      // Dismiss card immediately on touch move
      if (cardVisible || activeMarker) {
        dismissCard();
      }
    };

    const handleWheel = () => {
      // Dismiss card on scroll wheel (desktop)
      if (cardVisible || activeMarker) {
        dismissCard();
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [cardVisible, activeMarker, dismissCard]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
      if (cardDismissTimeout.current) clearTimeout(cardDismissTimeout.current);
      if (cardShowTimeout.current) clearTimeout(cardShowTimeout.current);
    };
  }, []);

  // Get user location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(loc);
        if (map) {
          map.panTo(loc);
          setTimeout(() => map.setZoom(15), 300);
        }
        setIsLocating(false);
      },
      () => setIsLocating(false)
    );
  }, [map]);

  // Handle marker click - liquid smooth card display
  const handleMarkerClick = useCallback((marker: MapMarker) => {
    // Clear any pending dismissals
    if (cardDismissTimeout.current) clearTimeout(cardDismissTimeout.current);
    if (cardShowTimeout.current) clearTimeout(cardShowTimeout.current);

    // Reset image loaded state
    setImageLoaded(false);

    // Set marker immediately for positioning
    setActiveMarker(marker);
    onMarkerSelect?.(marker.id);

    // Pan to marker smoothly, then show card
    if (map) {
      map.panTo({ lat: marker.latitude, lng: marker.longitude });
    }

    // Show card with slight delay for smooth animation after pan
    cardShowTimeout.current = setTimeout(() => {
      setCardVisible(true);
    }, 50);
  }, [onMarkerSelect, map]);

  // Handle marker hover
  const handleMarkerHover = useCallback((markerId: string | null) => {
    setHoveredMarker(markerId);
    onMarkerHover?.(markerId);
  }, [onMarkerHover]);

  // Toggle filter
  const toggleFilter = useCallback((category: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  // Get category config
  const getCategoryConfig = (category: string) => categoryConfig[category] || defaultCategoryConfig;

  // Create premium marker icon with smooth scaling
  const createMarkerIcon = useCallback((color: string, isSelected: boolean, isHighlighted: boolean, isHovered: boolean) => {
    if (!isLoaded) return undefined;

    // Smooth size progression
    const size = isSelected ? 48 : isHighlighted ? 42 : isHovered ? 38 : 32;
    const strokeWidth = isSelected ? 3 : isHighlighted ? 2.5 : isHovered ? 2 : 1.5;
    const strokeColor = isSelected || isHighlighted ? '#ffffff' : 'rgba(255,255,255,0.6)';
    const shadowOpacity = isSelected || isHighlighted ? 0.4 : 0.25;

    // Enhanced SVG with better shadow and glow effect
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <defs>
        <filter id="shadow-${size}" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="${shadowOpacity}"/>
        </filter>
        ${isHighlighted || isSelected ? `
        <filter id="glow-${size}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        ` : ''}
      </defs>
      <path filter="url(#${isHighlighted || isSelected ? `glow-${size}` : `shadow-${size}`})" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>`;

    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size / 2, size),
    };
  }, [isLoaded]);

  // Smooth zoom
  const smoothZoom = useCallback((zoomIn: boolean) => {
    if (!map) return;
    const currentZoom = map.getZoom() || 11;
    const targetZoom = zoomIn ? Math.min(currentZoom + 1, 20) : Math.max(currentZoom - 1, 9);
    map.setZoom(targetZoom);
  }, [map]);

  // Loading state
  if (loadError) {
    return (
      <div className={`relative bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white font-medium">Failed to load Google Maps</p>
          <p className="text-gray-400 text-sm mt-2">Check API key configuration</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`relative bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center ${className}`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className={`relative bg-slate-900 rounded-xl overflow-hidden ${className}`}
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={CAYMAN_CENTER}
        zoom={DEFAULT_ZOOM}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {/* Markers with clustering */}
        {enableClustering ? (
          <MarkerClusterer
            options={{
              maxZoom: 14,
              minimumClusterSize: 8,
              averageCenter: true,
              gridSize: 60,
            }}
          >
            {(clusterer) => (
              <>
                {filteredMarkers.map((marker) => {
                  const config = getCategoryConfig(marker.category);
                  const isSelected = marker.id === activeMarker?.id;
                  const isHighlighted = highlightedMarkerIds.includes(marker.id);
                  const isHovered = hoveredMarker === marker.id;
                  return (
                    <Marker
                      key={marker.id}
                      position={{ lat: marker.latitude, lng: marker.longitude }}
                      clusterer={clusterer}
                      onClick={() => handleMarkerClick(marker)}
                      onMouseOver={() => handleMarkerHover(marker.id)}
                      onMouseOut={() => handleMarkerHover(null)}
                      icon={createMarkerIcon(config.color, isSelected, isHighlighted, isHovered)}
                      zIndex={isSelected ? 1000 : isHighlighted ? 999 : isHovered ? 998 : 1}
                      animation={undefined}
                    />
                  );
                })}
              </>
            )}
          </MarkerClusterer>
        ) : (
          filteredMarkers.map((marker) => {
            const config = getCategoryConfig(marker.category);
            const isSelected = marker.id === activeMarker?.id;
            const isHighlighted = highlightedMarkerIds.includes(marker.id);
            const isHovered = hoveredMarker === marker.id;
            return (
              <Marker
                key={marker.id}
                position={{ lat: marker.latitude, lng: marker.longitude }}
                onClick={() => handleMarkerClick(marker)}
                onMouseOver={() => handleMarkerHover(marker.id)}
                onMouseOut={() => handleMarkerHover(null)}
                icon={createMarkerIcon(config.color, isSelected, isHighlighted, isHovered)}
                zIndex={isSelected ? 1000 : isHighlighted ? 999 : isHovered ? 998 : 1}
              />
            );
          })
        )}

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            }}
            zIndex={2000}
          />
        )}

      </GoogleMap>

      {/* Mobile-Friendly Premium Liquid Glass Place Card - Bottom Sheet */}
      <AnimatePresence>
        {activeMarker && cardVisible && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
              mass: 1
            }}
            className="absolute bottom-0 left-0 right-0 z-50 p-4 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Liquid Glass Card */}
            <div className="relative bg-white/95 backdrop-blur-3xl rounded-3xl shadow-[0_-10px_60px_-10px_rgba(0,0,0,0.3)] overflow-hidden border border-white/70">
              {/* Liquid gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-cyan-500/10 pointer-events-none" />

              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              {/* Close button - Always visible */}
              <motion.button
                onClick={(e) => { e.stopPropagation(); dismissCard(); }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute top-3 right-3 z-20 p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-all shadow-md"
              >
                <X className="w-5 h-5 text-gray-600" />
              </motion.button>

              <div className="flex gap-4 p-4 pt-2">
                {/* Image */}
                <div className="relative w-28 h-28 flex-shrink-0 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                  {activeMarker.thumbnail ? (
                    <img
                      src={activeMarker.thumbnail}
                      alt={activeMarker.title}
                      className={`w-full h-full object-cover transition-all duration-500 ${
                        imageLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                      onLoad={() => setImageLoaded(true)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400';
                        setImageLoaded(true);
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-500 to-teal-500">
                      <MapPin className="w-8 h-8 text-white/80" />
                    </div>
                  )}
                  {/* Rating badge */}
                  {activeMarker.rating && activeMarker.rating > 0 && (
                    <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-full">
                      <span className="flex items-center gap-1 text-xs font-bold text-white">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {activeMarker.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-8">
                  {/* Category */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-full text-xs font-semibold mb-1.5">
                    {getCategoryConfig(activeMarker.category).icon} {getCategoryConfig(activeMarker.category).label}
                  </span>

                  {/* Title */}
                  <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1 line-clamp-2">
                    {activeMarker.title}
                  </h3>

                  {/* Meta */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    {activeMarker.reviewCount && activeMarker.reviewCount > 0 && (
                      <span>{activeMarker.reviewCount.toLocaleString()} reviews</span>
                    )}
                    {activeMarker.priceRange && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 font-semibold">{activeMarker.priceRange}</span>
                      </>
                    )}
                  </div>

                  {/* Address */}
                  {activeMarker.address && (
                    <p className="text-gray-500 text-xs flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {activeMarker.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              {activeMarker.subtitle && (
                <div className="px-4 pb-3">
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                    {activeMarker.subtitle}
                  </p>
                </div>
              )}

              {/* Action Buttons - Full Width Premium */}
              <div className="p-4 pt-2 space-y-3">
                {/* Primary Actions Row */}
                <div className="flex gap-2">
                  {/* Ask AI */}
                  {onAskAI && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { onAskAI(activeMarker); dismissCard(); }}
                      className="flex-1 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/25"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                      Ask AI About This
                    </motion.button>
                  )}

                  {/* Directions */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeMarker.latitude},${activeMarker.longitude}`, '_blank')}
                    className="flex-1 py-3.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/25"
                  >
                    <Navigation className="w-5 h-5" /> Directions
                  </motion.button>
                </div>

                {/* Secondary Actions Row - Website & Phone */}
                <div className="flex gap-2">
                  {activeMarker.website && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => window.open(activeMarker.website, '_blank')}
                      className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all"
                    >
                      <Globe className="w-4 h-4" /> Website
                    </motion.button>
                  )}
                  {activeMarker.phone && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => window.open(`tel:${activeMarker.phone}`, '_blank')}
                      className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all"
                    >
                      <Phone className="w-4 h-4" /> Call
                    </motion.button>
                  )}
                  {!activeMarker.website && !activeMarker.phone && (
                    <div className="flex-1" />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center gap-3 z-10">
        {showSearch && (
          <motion.div
            className="relative flex-1 max-w-md"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/95 backdrop-blur-md border-0 rounded-xl shadow-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </motion.div>
        )}

        <motion.div
          className="flex bg-white/95 backdrop-blur-md rounded-xl shadow-lg overflow-hidden"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <button
            onClick={() => setMapType('roadmap')}
            className={`px-3 py-2.5 flex items-center gap-2 transition-colors ${mapType === 'roadmap' ? 'bg-cyan-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <MapIcon className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Map</span>
          </button>
          <button
            onClick={() => setMapType('satellite')}
            className={`px-3 py-2.5 flex items-center gap-2 transition-colors ${mapType === 'satellite' ? 'bg-cyan-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Satellite className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Satellite</span>
          </button>
        </motion.div>

        {onToggleExpand && (
          <motion.button
            onClick={onToggleExpand}
            className="p-2.5 bg-white/95 backdrop-blur-md rounded-xl shadow-lg text-gray-600 hover:text-gray-900 transition-colors"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </motion.button>
        )}
      </div>

      {/* Category filters */}
      {showFilters && categories.length > 0 && (
        <motion.div
          className="absolute bottom-20 left-4 right-4 z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.slice(0, 10).map(category => {
              const config = getCategoryConfig(category);
              const isActive = activeFilters.has(category);
              const count = markers.filter(m => m.category === category).length;
              return (
                <motion.button
                  key={category}
                  onClick={() => toggleFilter(category)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl flex items-center gap-2 shadow-lg transition-all ${
                    isActive
                      ? 'bg-cyan-500 text-white shadow-cyan-500/25'
                      : 'bg-white/95 backdrop-blur-md text-gray-700 hover:bg-white'
                  }`}
                >
                  <span>{config.icon}</span>
                  <span className="text-sm font-medium">{config.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {count}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Right side controls */}
      <motion.div
        className="absolute bottom-4 right-4 flex flex-col gap-2 z-10"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25 }}
      >
        <button
          onClick={getUserLocation}
          disabled={isLocating}
          className="p-3 bg-white/95 backdrop-blur-md rounded-xl shadow-lg text-gray-600 hover:text-cyan-500 disabled:opacity-50 transition-colors"
        >
          {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5" />}
        </button>
        <button
          onClick={() => smoothZoom(true)}
          className="p-3 bg-white/95 backdrop-blur-md rounded-xl shadow-lg text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => smoothZoom(false)}
          className="p-3 bg-white/95 backdrop-blur-md rounded-xl shadow-lg text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </motion.div>

      {/* Stats badge */}
      <motion.div
        className="absolute bottom-4 left-4 z-10"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="px-4 py-2 bg-white/95 backdrop-blur-md rounded-xl shadow-lg">
          <p className="text-sm text-gray-600">
            <span className="font-bold text-gray-900">{filteredMarkers.length}</span> places
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default GoogleMapsInteractive;
