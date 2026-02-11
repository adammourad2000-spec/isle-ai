import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline, Circle, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, X, Star, Phone, Globe, Navigation, Clock, DollarSign,
  Waves, UtensilsCrossed, Building2, Palmtree, Ship, Plane,
  Camera, Compass, ChevronRight, ExternalLink, Heart, Share2,
  Maximize2, Minimize2, Layers, Filter, Search, LocateFixed,
  Route, Loader2, AlertCircle, Satellite, Map as MapIcon,
  Crosshair, ZoomIn, ZoomOut
} from 'lucide-react';
import type { MapMarker, KnowledgeCategory, PriceRange } from '../types/chatbot';
import {
  trackPhoneClick,
  trackWebsiteClick,
  trackDirectionsClick,
  trackBookingClick,
  trackPopupOpen,
  trackPopupClose
} from '../services/interactionTrackingService';

// Route type for GPS navigation
interface RouteInfo {
  coordinates: [number, number][];
  distance: number; // in meters
  duration: number; // in seconds
  instructions?: string[];
}

// Cayman Islands center coordinates (precise)
const CAYMAN_CENTER: [number, number] = [19.3133, -81.2546];
const DEFAULT_ZOOM = 11;
const MIN_ZOOM = 8;
const MAX_ZOOM = 19;

// Mapbox Token - will use environment variable or fallback to free tiles
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

// Premium map tile options - Best quality open source tiles
const MAP_TILES = {
  // ESRI World Imagery - Excellent satellite imagery (DEFAULT)
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19
  },
  // ESRI Satellite + Labels overlay - Best for seeing place names
  satelliteLabels: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    hasLabels: true
  },
  // ESRI Labels overlay (used with satellite)
  labelsOverlay: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: '',
    maxZoom: 19
  },
  // OpenStreetMap Standard - Classic, detailed street maps
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  // OpenTopoMap - Beautiful topographic style
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap, SRTM | &copy; OpenTopoMap (CC-BY-SA)',
    maxZoom: 17
  },
  // CARTO Positron - Clean light style (great for markers visibility)
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
    attribution: '&copy; OSM &copy; CARTO',
    maxZoom: 20
  },
  // CARTO Dark Matter - Dark mode (Retina)
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    attribution: '&copy; OSM &copy; CARTO',
    maxZoom: 20
  },
  // CARTO Voyager - Colorful with labels (Retina)
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    attribution: '&copy; OSM &copy; CARTO',
    maxZoom: 20
  },
  // Stamen Watercolor (via Stadia) - Artistic watercolor style
  watercolor: {
    url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
    attribution: '&copy; Stamen Design &copy; OSM',
    maxZoom: 16
  },
  // Stamen Terrain (via Stadia) - Beautiful terrain with shading
  terrain: {
    url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}@2x.png',
    attribution: '&copy; Stamen Design &copy; OSM',
    maxZoom: 18
  },
  // Mapbox (requires token) - Premium quality
  mapboxSatellite: {
    url: MAPBOX_TOKEN
      ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: MAPBOX_TOKEN ? '&copy; Mapbox' : '&copy; Esri',
    maxZoom: 20,
    tileSize: MAPBOX_TOKEN ? 512 : 256,
    zoomOffset: MAPBOX_TOKEN ? -1 : 0
  }
};

type MapStyleKey = keyof typeof MAP_TILES;

// Default category config
const defaultCategoryConfig = {
  icon: MapPin,
  color: '#6b7280',
  bgColor: 'bg-gray-500',
  label: 'Place',
  emoji: ''
};

// Category icons and colors - enhanced with more detail
const categoryConfig: Partial<Record<KnowledgeCategory, {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bgColor: string;
  label: string;
  emoji: string;
}>> = {
  hotel: {
    icon: Building2,
    color: '#8b5cf6',
    bgColor: 'bg-violet-500',
    label: 'Hotels',
    emoji: ''
  },
  restaurant: {
    icon: UtensilsCrossed,
    color: '#f59e0b',
    bgColor: 'bg-amber-500',
    label: 'Restaurants',
    emoji: ''
  },
  beach: {
    icon: Waves,
    color: '#06b6d4',
    bgColor: 'bg-cyan-500',
    label: 'Beaches',
    emoji: ''
  },
  attraction: {
    icon: Camera,
    color: '#ec4899',
    bgColor: 'bg-pink-500',
    label: 'Attractions',
    emoji: ''
  },
  activity: {
    icon: Compass,
    color: '#10b981',
    bgColor: 'bg-emerald-500',
    label: 'Activities',
    emoji: ''
  },
  diving_snorkeling: {
    icon: Waves,
    color: '#0ea5e9',
    bgColor: 'bg-sky-500',
    label: 'Diving',
    emoji: ''
  },
  villa_rental: {
    icon: Palmtree,
    color: '#84cc16',
    bgColor: 'bg-lime-500',
    label: 'Villas',
    emoji: ''
  },
  boat_charter: {
    icon: Ship,
    color: '#3b82f6',
    bgColor: 'bg-blue-500',
    label: 'Boats',
    emoji: ''
  },
  private_jet: {
    icon: Plane,
    color: '#6366f1',
    bgColor: 'bg-indigo-500',
    label: 'Jets',
    emoji: ''
  },
  concierge: {
    icon: Star,
    color: '#eab308',
    bgColor: 'bg-yellow-500',
    label: 'Concierge',
    emoji: ''
  },
  service: {
    icon: Star,
    color: '#eab308',
    bgColor: 'bg-yellow-500',
    label: 'Services',
    emoji: ''
  },
  real_estate: {
    icon: Building2,
    color: '#64748b',
    bgColor: 'bg-slate-500',
    label: 'Real Estate',
    emoji: ''
  },
  transport: {
    icon: Navigation,
    color: '#14b8a6',
    bgColor: 'bg-teal-500',
    label: 'Transport',
    emoji: ''
  },
  transportation: {
    icon: Navigation,
    color: '#14b8a6',
    bgColor: 'bg-teal-500',
    label: 'Transport',
    emoji: ''
  },
  spa: {
    icon: Waves,
    color: '#a855f7',
    bgColor: 'bg-purple-500',
    label: 'Spa',
    emoji: ''
  },
  spa_wellness: {
    icon: Waves,
    color: '#a855f7',
    bgColor: 'bg-purple-500',
    label: 'Spa & Wellness',
    emoji: ''
  },
  bar: {
    icon: UtensilsCrossed,
    color: '#ef4444',
    bgColor: 'bg-red-500',
    label: 'Bars',
    emoji: ''
  },
  nightlife: {
    icon: Star,
    color: '#ef4444',
    bgColor: 'bg-red-500',
    label: 'Nightlife',
    emoji: ''
  },
  shopping: {
    icon: Building2,
    color: '#f97316',
    bgColor: 'bg-orange-500',
    label: 'Shopping',
    emoji: ''
  },
  golf: {
    icon: Compass,
    color: '#22c55e',
    bgColor: 'bg-green-500',
    label: 'Golf',
    emoji: ''
  },
  water_sports: {
    icon: Waves,
    color: '#0ea5e9',
    bgColor: 'bg-sky-500',
    label: 'Water Sports',
    emoji: ''
  },
  general_info: {
    icon: MapPin,
    color: '#6b7280',
    bgColor: 'bg-gray-500',
    label: 'Info',
    emoji: ''
  }
};

// Helper to get category config with fallback
const getCategoryConfig = (category: KnowledgeCategory) => {
  return categoryConfig[category] || defaultCategoryConfig;
};

// Price range display
const priceRangeDisplay: Record<PriceRange, string> = {
  '$': '$',
  '$$': '$$',
  '$$$': '$$$',
  '$$$$': '$$$$',
  '$$$$$': '$$$$$'
};

// Format distance for display
const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
};

// Format duration for display
const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

// Fetch route from OSRM (Open Source Routing Machine)
const fetchRoute = async (
  start: [number, number],
  end: [number, number]
): Promise<RouteInfo | null> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Route fetch failed');

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes?.[0]) {
      throw new Error('No route found');
    }

    const route = data.routes[0];
    const coordinates = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
    );

    const instructions = route.legs[0]?.steps?.map(
      (step: { maneuver: { instruction: string } }) => step.maneuver.instruction
    );

    return {
      coordinates,
      distance: route.distance,
      duration: route.duration,
      instructions
    };
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
};

// Create SVG marker icon with precise anchor point
const createCustomIcon = (
  category: KnowledgeCategory,
  isSelected: boolean,
  isHovered: boolean,
  isDarkMode: boolean = false,
  isHighlighted: boolean = false  // New: pulsing highlight from chat
) => {
  const config = getCategoryConfig(category);
  // Fixed base size for consistent anchor calculation
  const baseSize = 32;
  const scale = isSelected ? 1.3 : isHovered || isHighlighted ? 1.15 : 1;
  const size = baseSize * scale;
  const height = size * 1.4; // Pin aspect ratio
  const glowOpacity = isSelected ? 0.4 : isHovered || isHighlighted ? 0.25 : 0;
  const strokeWidth = isSelected ? 2.5 : 2;

  // Create gradient ID unique to this marker
  const gradientId = `gradient-${category}-${Math.random().toString(36).substr(2, 9)}`;
  const shadowId = `shadow-${category}-${Math.random().toString(36).substr(2, 9)}`;

  const svg = `
    <svg width="${size}" height="${height}" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${config.color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${adjustColor(config.color, -40)};stop-opacity:1" />
        </linearGradient>
        <filter id="${shadowId}" x="-50%" y="-20%" width="200%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.5)"/>
        </filter>
      </defs>

      <!-- Glow effect for selected/hovered -->
      ${glowOpacity > 0 ? `
        <ellipse cx="20" cy="54" rx="8" ry="3" fill="rgba(0,0,0,0.3)"/>
        <path d="M20 2C10.059 2 2 10.059 2 20c0 12 18 34 18 34s18-22 18-34C38 10.059 29.941 2 20 2z"
              fill="${config.color}" opacity="${glowOpacity}" style="filter:blur(6px);"/>
      ` : ''}

      <!-- Shadow ellipse at ground level -->
      <ellipse cx="20" cy="55" rx="6" ry="2" fill="rgba(0,0,0,0.25)"/>

      <!-- Main marker pin -->
      <g filter="url(#${shadowId})">
        <path d="M20 2C10.059 2 2 10.059 2 20c0 12 18 34 18 34s18-22 18-34C38 10.059 29.941 2 20 2z"
              fill="url(#${gradientId})"
              stroke="${isDarkMode ? '#1f2937' : 'white'}"
              stroke-width="${strokeWidth}"/>

        <!-- Inner white circle for icon -->
        <circle cx="20" cy="17" r="10" fill="${isDarkMode ? '#1f2937' : 'white'}"/>

        <!-- Category indicator dot -->
        <circle cx="20" cy="17" r="5" fill="${config.color}" opacity="0.2"/>
      </g>
    </svg>
  `;

  // CRITICAL: Icon anchor must point to the exact tip of the pin (bottom center)
  // The SVG viewBox is 40x56, pin tip is at (20, 56)
  // Scale to actual size: anchor = (size/2, height) but we offset -100% via CSS
  return L.divIcon({
    className: 'custom-marker-icon',
    html: `
      <div class="marker-wrapper ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isHighlighted ? 'highlighted' : ''}">
        ${isHighlighted ? `<div class="marker-pulse-ring" style="position:absolute;inset:-8px;border-radius:50%;border:2px solid ${config.color};opacity:0.6;animation:markerPulse 1.5s ease-out infinite;"></div>` : ''}
        ${svg}
        <div class="marker-icon" style="
          position: absolute;
          top: ${size * 0.28}px;
          left: 50%;
          transform: translateX(-50%);
          color: ${config.color};
          width: ${size * 0.4}px;
          height: ${size * 0.4}px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        ">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
            ${getCategoryIconPath(category)}
          </svg>
        </div>
      </div>
    `,
    // Icon size matches the SVG dimensions
    iconSize: [size, height],
    // PRECISE ANCHOR: The pin tip is at the bottom center
    // This ensures the marker points exactly to the coordinate
    iconAnchor: [size / 2, height],
    // Popup appears above the marker
    popupAnchor: [0, -height + 8]
  });
};

// Get SVG path for category icon
const getCategoryIconPath = (category: KnowledgeCategory): string => {
  const paths: Record<string, string> = {
    hotel: '<path d="M3 21h18M3 7v14M21 7v14M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 3h12a2 2 0 0 1 2 2v2H4V5a2 2 0 0 1 2-2z"/>',
    restaurant: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    beach: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2M4 20c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0"/><path d="M12 4v8M8 8l4-4 4 4"/>',
    attraction: '<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    activity: '<circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>',
    diving_snorkeling: '<path d="M2 12h6M16 12h6M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"/>',
    villa_rental: '<path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/>',
    boat_charter: '<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76M2 10c.6-.5 1.2-1 2.5-1 2.5 0 2.5 2 5 2 1.3 0 1.9-.5 2.5-1"/>',
    private_jet: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    spa: '<path d="M9 10a5 5 0 0 1 5-5M12 2v3M4.6 12a8 8 0 0 0 2.6 5.8c.6.5 1.4.5 2-.1A10 10 0 0 1 12 15a10 10 0 0 1 2.8 2.7c.6.6 1.4.6 2 .1A8 8 0 0 0 19.4 12M12 22v-3M4 22l4-4M20 22l-4-4"/>',
    concierge: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    default: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'
  };

  return paths[category] || paths.default;
};

// Helper function to darken/lighten colors
const adjustColor = (color: string, amount: number): string => {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));

  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }

  const r = clamp(parseInt(hex.substring(0, 2), 16) + amount);
  const g = clamp(parseInt(hex.substring(2, 4), 16) + amount);
  const b = clamp(parseInt(hex.substring(4, 6), 16) + amount);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// User location marker icon with pulsing effect
const createUserLocationIcon = (isDarkMode: boolean = false) => {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div class="relative" style="width: 24px; height: 24px;">
        <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-40"></div>
        <div class="absolute inset-1 bg-blue-500 rounded-full border-3 ${isDarkMode ? 'border-gray-800' : 'border-white'} shadow-lg"></div>
        <div class="absolute inset-2.5 bg-white rounded-full opacity-50"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

// Create cluster icon - visitabudhabi style with category indicators
const createClusterIcon = (cluster: L.MarkerCluster, isDarkMode: boolean = false) => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 44 : count < 100 ? 52 : 60;

  // Get category distribution for visual indicator
  const markers = cluster.getAllChildMarkers();
  const categoryCounts: Record<string, number> = {};
  markers.forEach(m => {
    const cat = (m.options as any).category || 'general_info';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Get top 3 categories for the ring segments
  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Create gradient ring segments
  const total = sortedCategories.reduce((sum, [, c]) => sum + c, 0);
  let currentAngle = 0;
  const ringSegments = sortedCategories.map(([cat, catCount]) => {
    const config = getCategoryConfig(cat as KnowledgeCategory);
    const angle = (catCount / total) * 360;
    const segment = `
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 3}"
        fill="none"
        stroke="${config.color}"
        stroke-width="4"
        stroke-dasharray="${(angle / 360) * (Math.PI * (size - 6))} ${Math.PI * (size - 6)}"
        stroke-dashoffset="${-(currentAngle / 360) * (Math.PI * (size - 6))}"
        transform="rotate(-90 ${size/2} ${size/2})"
      />
    `;
    currentAngle += angle;
    return segment;
  }).join('');

  // Primary color from most common category
  const primaryCategory = sortedCategories[0]?.[0] || 'general_info';
  const primaryConfig = getCategoryConfig(primaryCategory as KnowledgeCategory);

  return L.divIcon({
    className: 'custom-cluster-icon',
    html: `
      <div class="cluster-wrapper" style="position: relative; width: ${size}px; height: ${size}px;">
        <!-- Pulsing background -->
        <div class="cluster-pulse" style="
          position: absolute;
          inset: -4px;
          background: ${primaryConfig.color};
          border-radius: 50%;
          opacity: 0.2;
          animation: clusterPulse 2s ease-out infinite;
        "></div>

        <!-- Main cluster circle -->
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="position: absolute; top: 0; left: 0;">
          <!-- Base circle -->
          <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 3}"
            fill="${isDarkMode ? '#1f2937' : 'white'}"
            stroke="${isDarkMode ? '#374151' : '#e5e7eb'}"
            stroke-width="1"
          />
          <!-- Category ring segments -->
          ${ringSegments}
          <!-- Inner white circle -->
          <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 8}"
            fill="${isDarkMode ? '#1f2937' : 'white'}"
          />
        </svg>

        <!-- Count number -->
        <div style="
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: ${count < 10 ? 16 : count < 100 ? 15 : 13}px;
          color: ${isDarkMode ? 'white' : '#1f2937'};
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
        ">
          ${count}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

interface InteractiveMapProps {
  markers: MapMarker[];
  selectedMarkerId?: string;
  highlightedMarkerIds?: string[];  // Pulsing markers from chat responses
  onMarkerSelect?: (markerId: string) => void;
  onMarkerHover?: (markerId: string | null) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
  showFilters?: boolean;
  showSearch?: boolean;
  enableRouting?: boolean;
  enableClustering?: boolean;
  defaultStyle?: MapStyleKey;
  autoFitOnChange?: boolean;  // Auto-fit bounds when markers change
}

// User location state
interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

// Map controller component for programmatic control
const MapController: React.FC<{
  markers: MapMarker[];
  selectedMarkerId?: string;
  highlightedMarkerIds?: string[];
  onMapReady: (map: L.Map) => void;
  shouldFitBounds: boolean;
  onFitBoundsComplete: () => void;
}> = ({ markers, selectedMarkerId, highlightedMarkerIds = [], onMapReady, shouldFitBounds, onFitBoundsComplete }) => {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  // Pan to selected marker with smooth animation
  useEffect(() => {
    if (selectedMarkerId) {
      const marker = markers.find(m => m.id === selectedMarkerId);
      if (marker) {
        // Smooth fly animation with Google Maps-like easing
        map.flyTo([marker.latitude, marker.longitude], Math.max(map.getZoom(), 15), {
          duration: 1.2,
          easeLinearity: 0.1  // More dramatic easing curve
        });
      }
    }
  }, [selectedMarkerId, markers, map]);

  // HYPER-FLUID: Fly to highlighted markers (from chatbot interaction)
  useEffect(() => {
    if (highlightedMarkerIds && highlightedMarkerIds.length > 0) {
      // Find the first highlighted marker
      const firstHighlightedId = highlightedMarkerIds[0];
      const marker = markers.find(m => m.id === firstHighlightedId);
      if (marker) {
        // Smooth fly animation with premium easing
        map.flyTo([marker.latitude, marker.longitude], Math.max(map.getZoom(), 16), {
          duration: 1.5,
          easeLinearity: 0.08  // Extra smooth easing for chatbot interactions
        });
      } else if (highlightedMarkerIds.length > 1) {
        // If multiple markers highlighted, fit bounds to show all
        const highlightedMarkers = markers.filter(m => highlightedMarkerIds.includes(m.id));
        if (highlightedMarkers.length > 1) {
          const bounds = L.latLngBounds(
            highlightedMarkers.map(m => [m.latitude, m.longitude] as [number, number])
          );
          map.fitBounds(bounds, {
            padding: [80, 80],
            maxZoom: 15,
            animate: true,
            duration: 1.2
          });
        }
      }
    }
  }, [highlightedMarkerIds, markers, map]);

  // HYPER-FLUID: Fly to highlighted markers (from chatbot interaction)
  useEffect(() => {
    if (highlightedMarkerIds && highlightedMarkerIds.length > 0) {
      // Find the first highlighted marker
      const firstHighlightedId = highlightedMarkerIds[0];
      const marker = markers.find(m => m.id === firstHighlightedId);
      if (marker) {
        // Smooth fly animation with premium easing
        map.flyTo([marker.latitude, marker.longitude], Math.max(map.getZoom(), 16), {
          duration: 1.5,
          easeLinearity: 0.08  // Extra smooth easing for chatbot interactions
        });
      } else if (highlightedMarkerIds.length > 1) {
        // If multiple markers highlighted, fit bounds to show all
        const highlightedMarkers = markers.filter(m => highlightedMarkerIds.includes(m.id));
        if (highlightedMarkers.length > 1) {
          const bounds = L.latLngBounds(
            highlightedMarkers.map(m => [m.latitude, m.longitude] as [number, number])
          );
          map.fitBounds(bounds, {
            padding: [80, 80],
            maxZoom: 15,
            animate: true,
            duration: 1.2
          });
        }
      }
    }
  }, [highlightedMarkerIds, markers, map]);

  // Fit bounds to markers
  useEffect(() => {
    if (shouldFitBounds && markers.length > 0) {
      const bounds = L.latLngBounds(
        markers.map(m => [m.latitude, m.longitude] as [number, number])
      );
      // Smooth bounds fit with fluid animation
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 15,
        animate: true,
        duration: 1.0  // Slightly slower for smoother feel
      });
      onFitBoundsComplete();
    }
  }, [shouldFitBounds, markers, map, onFitBoundsComplete]);

  return null;
};

// Clustered Markers component - handles all marker clustering logic
const ClusteredMarkers: React.FC<{
  markers: MapMarker[];
  selectedMarkerId?: string;
  hoveredMarkerId: string | null;
  highlightedMarkerIds: string[];
  isDarkMode: boolean;
  enableRouting: boolean;
  onMarkerClick: (marker: MapMarker) => void;
  onMarkerHover: (markerId: string | null) => void;
  onGetDirections?: (marker: MapMarker) => void;
  routeLoading: boolean;
  routeDestination: MapMarker | null;
  activeRoute: RouteInfo | null;
}> = ({
  markers,
  selectedMarkerId,
  hoveredMarkerId,
  highlightedMarkerIds,
  isDarkMode,
  enableRouting,
  onMarkerClick,
  onMarkerHover,
  onGetDirections,
  routeLoading,
  routeDestination,
  activeRoute
}) => {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!map) return;

    // Create cluster group with smooth animations
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 60,  // Balanced grouping radius
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      animate: true,
      animateAddingMarkers: false,  // Faster initial load
      disableClusteringAtZoom: 16,  // Uncluster at high zoom
      spiderfyDistanceMultiplier: 1.5,
      spiderLegPolylineOptions: {
        weight: 2,
        color: isDarkMode ? '#64D2FF' : '#0891b2',
        opacity: 0.6
      },
      iconCreateFunction: (cluster) => createClusterIcon(cluster, isDarkMode)
    });

    clusterGroupRef.current = clusterGroup;
    map.addLayer(clusterGroup);

    // Add click event for clusters
    clusterGroup.on('clusterclick', (e: any) => {
      // Smooth zoom animation to cluster bounds
      const cluster = e.layer;
      const bounds = cluster.getBounds();
      map.fitBounds(bounds, {
        padding: [50, 50],
        animate: true,
        duration: 0.5
      });
    });

    return () => {
      clusterGroup.clearLayers();
      map.removeLayer(clusterGroup);
      markersRef.current.clear();
    };
  }, [map, isDarkMode]);

  // Track previous markers for efficient updates
  const prevMarkersRef = useRef<string[]>([]);

  // Update markers when marker data changes (not selection state)
  useEffect(() => {
    if (!clusterGroupRef.current) return;

    const clusterGroup = clusterGroupRef.current;
    const currentMarkerIds = markers.map(m => m.id);
    const prevMarkerIds = prevMarkersRef.current;

    // Check if markers actually changed (not just selection state)
    const markersChanged = currentMarkerIds.length !== prevMarkerIds.length ||
      currentMarkerIds.some((id, i) => id !== prevMarkerIds[i]);

    if (markersChanged) {
      // Clear existing markers only when the actual marker list changes
      clusterGroup.clearLayers();
      markersRef.current.clear();

      // Add new markers
      markers.forEach(marker => {
        const isSelected = marker.id === selectedMarkerId;
        const isHovered = marker.id === hoveredMarkerId;
        const isHighlighted = highlightedMarkerIds.includes(marker.id);

        const leafletMarker = L.marker([marker.latitude, marker.longitude], {
          icon: createCustomIcon(marker.category, isSelected, isHovered, isDarkMode, isHighlighted),
          category: marker.category  // Store for cluster icon
        } as any);

        // Bind popup
        const popupContent = createPopupContent(
          marker,
          isDarkMode,
          enableRouting ? onGetDirections : undefined,
          routeLoading && routeDestination?.id === marker.id,
          routeDestination?.id === marker.id ? activeRoute : null
        );

        leafletMarker.bindPopup(popupContent, {
          maxWidth: 340,
          className: `custom-popup ${isDarkMode ? 'dark-popup' : ''}`
        });

        // Event handlers
        leafletMarker.on('click', () => onMarkerClick(marker));
        leafletMarker.on('mouseover', () => onMarkerHover(marker.id));
        leafletMarker.on('mouseout', () => onMarkerHover(null));

        clusterGroup.addLayer(leafletMarker);
        markersRef.current.set(marker.id, leafletMarker);
      });

      prevMarkersRef.current = currentMarkerIds;
    }
  }, [markers, isDarkMode, enableRouting, onMarkerClick, onMarkerHover, onGetDirections, routeLoading, routeDestination, activeRoute]);

  // Update marker icons when selection/hover/highlight state changes (without clearing all markers)
  useEffect(() => {
    if (!clusterGroupRef.current) return;

    markersRef.current.forEach((leafletMarker, markerId) => {
      const marker = markers.find(m => m.id === markerId);
      if (marker) {
        const isSelected = marker.id === selectedMarkerId;
        const isHovered = marker.id === hoveredMarkerId;
        const isHighlighted = highlightedMarkerIds.includes(marker.id);
        leafletMarker.setIcon(createCustomIcon(marker.category, isSelected, isHovered, isDarkMode, isHighlighted));
      }
    });
  }, [selectedMarkerId, hoveredMarkerId, highlightedMarkerIds, markers, isDarkMode]);

  // Open popup for selected marker
  useEffect(() => {
    if (selectedMarkerId && markersRef.current.has(selectedMarkerId)) {
      const marker = markersRef.current.get(selectedMarkerId);
      marker?.openPopup();
    }
  }, [selectedMarkerId]);

  return null;
};

// Helper function to create popup content as HTML string for clustered markers
const createPopupContent = (
  marker: MapMarker,
  isDarkMode: boolean,
  onGetDirections?: (marker: MapMarker) => void,
  routeLoading?: boolean,
  routeInfo?: RouteInfo | null
): string => {
  const config = getCategoryConfig(marker.category);

  return `
    <div class="min-w-[280px] max-w-[320px] p-0 font-sans ${isDarkMode ? 'text-white' : ''}">
      ${marker.thumbnail ? `
        <div class="relative h-32 -mx-3 -mt-3 mb-3 overflow-hidden">
          <img src="${marker.thumbnail}" alt="${marker.title}" class="w-full h-full object-cover" loading="lazy" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
          <div class="absolute bottom-2 left-2 px-2.5 py-1 rounded-full text-white text-xs font-semibold" style="background-color: ${config.color}">
            ${config.label}
          </div>
          ${marker.rating ? `
            <div class="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full">
              <span class="text-amber-400">★</span>
              <span class="text-white text-xs font-semibold">${marker.rating.toFixed(1)}</span>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="space-y-2.5">
        <div>
          <h3 class="font-bold text-base leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}">${marker.title}</h3>
          ${marker.subtitle ? `<p class="text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${marker.subtitle}</p>` : ''}
        </div>

        ${marker.address ? `
          <div class="flex items-start gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}">
            <span class="mt-0.5 flex-shrink-0">📍</span>
            <span style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${marker.address}</span>
          </div>
        ` : ''}

        ${marker.priceRange ? `
          <div class="flex items-center gap-2 text-sm">
            <span class="${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} font-medium">${marker.priceRange}</span>
            ${marker.reviewCount ? `<span class="${isDarkMode ? 'text-gray-500' : 'text-gray-400'}">(${marker.reviewCount} reviews)</span>` : ''}
          </div>
        ` : ''}

        ${marker.phone ? `
          <div class="flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}">
            <span>📞</span>
            <a href="tel:${marker.phone}" class="hover:text-cyan-500 transition-colors">${marker.phone}</a>
          </div>
        ` : ''}

        ${routeInfo ? `
          <div class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-cyan-900/30' : 'bg-cyan-50'}">
            <span class="text-cyan-500 font-medium">🚗 ${formatDistance(routeInfo.distance)}</span>
            <span class="${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}">⏱ ${formatDuration(routeInfo.duration)}</span>
          </div>
        ` : ''}

        <div class="flex flex-col gap-2 pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}">
          <div class="flex items-center gap-2">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${marker.latitude},${marker.longitude}" target="_blank" rel="noopener noreferrer"
               class="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:from-cyan-600 hover:to-teal-600 transition-all shadow-md"
               style="text-decoration: none;">
              🧭 Directions
            </a>
            ${marker.website ? `
              <a href="${marker.website}" target="_blank" rel="noopener noreferrer"
                 class="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}"
                 style="text-decoration: none;"
                 title="Visit Website">
                🌐 Website
              </a>
            ` : ''}
          </div>
          ${marker.bookingUrl ? `
            <a href="${marker.bookingUrl}" target="_blank" rel="noopener noreferrer"
               class="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isDarkMode ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400' : 'bg-amber-50 hover:bg-amber-100 text-amber-600'}"
               style="text-decoration: none;"
               title="Book Now">
              📅 Book Now
            </a>
          ` : ''}
        </div>
      </div>
    </div>
  `;
};

// Filter Button Component
const FilterButton: React.FC<{
  category: KnowledgeCategory;
  isActive: boolean;
  count: number;
  onClick: () => void;
  isDarkMode: boolean;
}> = ({ category, isActive, count, onClick, isDarkMode }) => {
  const config = getCategoryConfig(category);
  const IconComponent = config.icon;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
        isActive
          ? `text-white shadow-lg`
          : isDarkMode
            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
      }`}
      style={isActive ? { backgroundColor: config.color } : {}}
    >
      <IconComponent size={14} />
      <span>{config.label}</span>
      <span className={`text-xs ${isActive ? 'text-white/80' : isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        {count}
      </span>
    </button>
  );
};

// Enhanced Popup Content Component
const PopupContent: React.FC<{
  marker: MapMarker;
  onGetDirections?: (marker: MapMarker) => void;
  routeLoading?: boolean;
  routeInfo?: RouteInfo | null;
  isDarkMode: boolean;
}> = ({ marker, onGetDirections, routeLoading, routeInfo, isDarkMode }) => {
  const config = getCategoryConfig(marker.category);
  const IconComponent = config.icon;

  return (
    <div className={`min-w-[280px] max-w-[320px] p-0 font-sans ${isDarkMode ? 'text-white' : ''}`}>
      {/* Image Header */}
      {marker.thumbnail && (
        <div className="relative h-32 -mx-3 -mt-3 mb-3 overflow-hidden">
          <img
            src={marker.thumbnail}
            alt={marker.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div
            className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full text-white text-xs font-semibold flex items-center gap-1.5"
            style={{ backgroundColor: config.color }}
          >
            <IconComponent size={12} />
            {config.label}
          </div>
          {marker.rating && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="text-white text-xs font-semibold">{marker.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="space-y-2.5">
        <div>
          <h3 className={`font-bold text-base leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {marker.title}
          </h3>
          {marker.subtitle && (
            <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {marker.subtitle}
            </p>
          )}
        </div>

        {/* Rating and Price - if no thumbnail showed rating */}
        {!marker.thumbnail && (marker.rating || marker.priceRange) && (
          <div className="flex items-center gap-3 text-sm">
            {marker.rating && (
              <div className="flex items-center gap-1">
                <Star size={14} className="text-amber-500 fill-amber-500" />
                <span className="font-medium">{marker.rating.toFixed(1)}</span>
                {marker.reviewCount && (
                  <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                    ({marker.reviewCount})
                  </span>
                )}
              </div>
            )}
            {marker.priceRange && (
              <span className="text-emerald-500 font-medium">
                {priceRangeDisplay[marker.priceRange]}
              </span>
            )}
          </div>
        )}

        {/* Price Range when we have thumbnail */}
        {marker.thumbnail && marker.priceRange && (
          <div className="flex items-center gap-2">
            <DollarSign size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
            <span className="text-emerald-500 font-medium">{priceRangeDisplay[marker.priceRange]}</span>
            {marker.reviewCount && (
              <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                ({marker.reviewCount} reviews)
              </span>
            )}
          </div>
        )}

        {/* Route Info - shown when route is calculated */}
        {routeInfo && (
          <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
            isDarkMode ? 'bg-cyan-900/30' : 'bg-cyan-50'
          }`}>
            <div className="flex items-center gap-1.5 text-cyan-500 font-medium">
              <Route size={14} />
              <span>{formatDistance(routeInfo.distance)}</span>
            </div>
            <div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
              <Clock size={14} />
              <span>{formatDuration(routeInfo.duration)}</span>
            </div>
          </div>
        )}

        {/* Details */}
        <div className={`space-y-1.5 pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          {marker.address && (
            <div className={`flex items-start gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <MapPin size={14} className={`mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <span className="line-clamp-2">{marker.address}</span>
            </div>
          )}
          {marker.openingHours && (
            <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <Clock size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
              <span>{marker.openingHours}</span>
            </div>
          )}
          {marker.phone && (
            <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <Phone size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
              <a
                href={`tel:${marker.phone}`}
                className="hover:text-cyan-500 transition-colors"
                onClick={() => trackPhoneClick({
                  placeId: marker.id,
                  placeName: marker.title,
                  placeCategory: marker.category,
                  coordinates: { lat: marker.latitude, lng: marker.longitude }
                })}
              >
                {marker.phone}
              </a>
            </div>
          )}
        </div>

        {/* Actions - Primary buttons */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          {/* Get Directions - Primary CTA */}
          {onGetDirections ? (
            <button
              onClick={() => {
                trackDirectionsClick({
                  placeId: marker.id,
                  placeName: marker.title,
                  placeCategory: marker.category,
                  coordinates: { lat: marker.latitude, lng: marker.longitude }
                });
                onGetDirections(marker);
              }}
              disabled={routeLoading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:from-cyan-600 hover:to-teal-600 transition-all disabled:opacity-50 shadow-md"
            >
              {routeLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Route size={14} />
              )}
              {routeLoading ? 'Loading...' : routeInfo ? 'Update Route' : 'Directions'}
            </button>
          ) : (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${marker.latitude},${marker.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:from-cyan-600 hover:to-teal-600 transition-all shadow-md"
              onClick={() => trackDirectionsClick({
                placeId: marker.id,
                placeName: marker.title,
                placeCategory: marker.category,
                coordinates: { lat: marker.latitude, lng: marker.longitude }
              })}
            >
              <Navigation size={14} />
              Directions
            </a>
          )}

          {/* Visit Website - Prominent button when available */}
          {marker.website && (
            <a
              href={marker.website}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="Visit Website"
              onClick={() => trackWebsiteClick({
                placeId: marker.id,
                placeName: marker.title,
                placeCategory: marker.category,
                coordinates: { lat: marker.latitude, lng: marker.longitude }
              })}
            >
              <Globe size={14} />
              Website
            </a>
          )}
        </div>

        {/* Secondary actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg transition-colors text-xs ${
              isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-500'
            }`}
            title="Save to collection"
          >
            <Heart size={14} />
            Save
          </button>

          <button
            className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg transition-colors text-xs ${
              isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-500'
            }`}
            title="Share"
          >
            <Share2 size={14} />
            Share
          </button>

          {marker.phone && (
            <a
              href={`tel:${marker.phone}`}
              className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg transition-colors text-xs ${
                isDarkMode
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-500'
              }`}
              title="Call"
              onClick={() => trackPhoneClick({
                placeId: marker.id,
                placeName: marker.title,
                placeCategory: marker.category,
                coordinates: { lat: marker.latitude, lng: marker.longitude }
              })}
            >
              <Phone size={14} />
              Call
            </a>
          )}
        </div>

        {/* Booking button if available */}
        {marker.bookingUrl && (
          <a
            href={marker.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isDarkMode
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
            }`}
            onClick={() => trackBookingClick({
              placeId: marker.id,
              placeName: marker.title,
              placeCategory: marker.category,
              coordinates: { lat: marker.latitude, lng: marker.longitude }
            })}
          >
            <ExternalLink size={14} />
            Book Now
          </a>
        )}
      </div>
    </div>
  );
};

// Layer Toggle Component
const LayerToggle: React.FC<{
  currentStyle: MapStyleKey;
  onStyleChange: (style: MapStyleKey) => void;
  isOpen: boolean;
  onToggle: () => void;
  isDarkMode: boolean;
}> = ({ currentStyle, onStyleChange, isOpen, onToggle, isDarkMode }) => {
  const styles: { key: MapStyleKey; label: string; icon: React.ReactNode }[] = [
    { key: 'satelliteLabels', label: 'Satellite + Labels', icon: <Satellite size={16} /> },
    { key: 'satellite', label: 'Satellite Only', icon: <Satellite size={16} /> },
    { key: 'voyager', label: 'Streets', icon: <MapIcon size={16} /> },
    { key: 'dark', label: 'Dark', icon: <MapIcon size={16} /> },
  ];

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`p-3 rounded-xl shadow-lg transition-all ${
          isDarkMode
            ? 'bg-gray-800 hover:bg-gray-700 text-white'
            : 'bg-white hover:bg-gray-50 text-gray-700'
        }`}
        title="Map Layers"
      >
        <Layers size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.15 }}
            className={`absolute bottom-full right-0 mb-2 p-2 rounded-xl shadow-xl min-w-[140px] ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            {styles.map((style) => (
              <button
                key={style.key}
                onClick={() => {
                  onStyleChange(style.key);
                  onToggle();
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentStyle === style.key
                    ? 'bg-cyan-500 text-white'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {style.icon}
                {style.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Main InteractiveMap Component
const InteractiveMap: React.FC<InteractiveMapProps> = ({
  markers,
  selectedMarkerId,
  highlightedMarkerIds = [],
  onMarkerSelect,
  onMarkerHover,
  isExpanded = false,
  onToggleExpand,
  className = '',
  showFilters = true,
  showSearch = true,
  enableRouting = true,
  enableClustering = true,  // Enabled by default for visitabudhabi-style grouping
  defaultStyle = 'satelliteLabels',
  autoFitOnChange = true
}) => {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<KnowledgeCategory>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [mapStyle, setMapStyle] = useState<MapStyleKey>(defaultStyle);
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const [shouldFitBounds, setShouldFitBounds] = useState(true);
  const markerRefs = useRef<Record<string, L.Marker>>({});

  // GPS Routing state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeDestination, setRouteDestination] = useState<MapMarker | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Determine if using dark theme
  const isDarkMode = mapStyle === 'dark' || mapStyle === 'satellite';

  // Filter markers
  const filteredMarkers = useMemo(() => {
    return markers.filter(marker => {
      // Category filter
      if (activeFilters.size > 0 && !activeFilters.has(marker.category)) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          marker.title.toLowerCase().includes(query) ||
          marker.subtitle?.toLowerCase().includes(query) ||
          marker.address?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [markers, activeFilters, searchQuery]);

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<KnowledgeCategory, number>> = {};
    markers.forEach(marker => {
      counts[marker.category] = (counts[marker.category] || 0) + 1;
    });
    return counts;
  }, [markers]);

  // Toggle filter
  const toggleFilter = (category: KnowledgeCategory) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(category)) {
        newFilters.delete(category);
      } else {
        newFilters.add(category);
      }
      return newFilters;
    });
  };

  // Start tracking user location
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setUserLocation(newLocation);
        setIsLocating(false);

        if (mapInstance) {
          mapInstance.flyTo([newLocation.latitude, newLocation.longitude], 15, { duration: 1 });
        }
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location access denied');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location unavailable');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out');
            break;
          default:
            setLocationError('Unable to get your location');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      () => {},
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  }, [mapInstance]);

  // Stop tracking user location
  const stopLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, [stopLocationTracking]);

  // Get directions to a marker
  const getDirections = useCallback(async (marker: MapMarker) => {
    if (!userLocation) {
      startLocationTracking();
      setRouteDestination(marker);
      return;
    }

    setRouteLoading(true);
    setRouteDestination(marker);

    try {
      const route = await fetchRoute(
        [userLocation.latitude, userLocation.longitude],
        [marker.latitude, marker.longitude]
      );

      setActiveRoute(route);

      if (route && mapInstance) {
        const bounds = L.latLngBounds([
          [userLocation.latitude, userLocation.longitude],
          [marker.latitude, marker.longitude]
        ]);
        mapInstance.fitBounds(bounds, { padding: [80, 80] });
      }

      if (!route) {
        setLocationError('Could not calculate route. Opening in Google Maps...');
        setTimeout(() => {
          window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${marker.latitude},${marker.longitude}`,
            '_blank'
          );
          setLocationError(null);
        }, 1500);
      }
    } catch (error) {
      console.error('Error getting directions:', error);
      setLocationError('Route calculation failed');
      setTimeout(() => setLocationError(null), 3000);
    } finally {
      setRouteLoading(false);
    }
  }, [userLocation, mapInstance, startLocationTracking]);

  // Clear route
  const clearRoute = useCallback(() => {
    setActiveRoute(null);
    setRouteDestination(null);
  }, []);

  // When user location updates and we have a pending destination
  useEffect(() => {
    if (userLocation && routeDestination && !activeRoute && !routeLoading) {
      getDirections(routeDestination);
    }
  }, [userLocation, routeDestination, activeRoute, routeLoading, getDirections]);

  // Center on user location
  const centerOnUser = () => {
    if (userLocation && mapInstance) {
      mapInstance.flyTo([userLocation.latitude, userLocation.longitude], 15, { duration: 1 });
    } else {
      startLocationTracking();
    }
  };

  // Fit all markers
  const fitAllMarkers = () => {
    setShouldFitBounds(true);
  };

  // Handle marker click
  const handleMarkerClick = (marker: MapMarker) => {
    setOpenPopupId(marker.id);
    onMarkerSelect?.(marker.id);
  };

  // Handle marker hover
  const handleMarkerHover = (markerId: string | null) => {
    setHoveredMarkerId(markerId);
    onMarkerHover?.(markerId);
  };

  // Handle map ready
  const handleMapReady = useCallback((map: L.Map) => {
    setMapInstance(map);
  }, []);

  // Open popup for selected marker
  useEffect(() => {
    if (selectedMarkerId && markerRefs.current[selectedMarkerId]) {
      markerRefs.current[selectedMarkerId].openPopup();
      setOpenPopupId(selectedMarkerId);
    }
  }, [selectedMarkerId]);

  // HYPER-FLUID: Auto-fit bounds when markers change (chatbot-map interaction)
  const prevMarkersCountRef = useRef(markers.length);
  useEffect(() => {
    if (autoFitOnChange && mapInstance && markers.length > 0 && markers.length !== prevMarkersCountRef.current) {
      prevMarkersCountRef.current = markers.length;
      const bounds = L.latLngBounds(
        markers.map(m => [m.latitude, m.longitude] as [number, number])
      );
      // Smooth animation with slight delay for visual polish
      requestAnimationFrame(() => {
        mapInstance.fitBounds(bounds, {
          padding: [70, 70],
          maxZoom: 15,
          animate: true,
          duration: 1.2  // Slower for more elegant transition
        });
      });
    }
  }, [markers, mapInstance, autoFitOnChange]);

  const currentTiles = MAP_TILES[mapStyle];
  // Check if we need to add labels overlay (for hybrid satellite view)
  const needsLabelsOverlay = (currentTiles as any).hasLabels === true;

  return (
    <div className={`relative ${className}`}>
      {/* Search Bar */}
      {showSearch && (
        <div className="absolute top-4 left-4 right-16 z-[1000]">
          <div className="relative max-w-md">
            <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-400'
            }`} />
            <input
              type="text"
              placeholder="Search places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl shadow-lg border-0 focus:ring-2 focus:ring-cyan-500 text-sm outline-none transition-all ${
                isDarkMode
                  ? 'bg-gray-800/95 text-white placeholder-gray-400 backdrop-blur-sm'
                  : 'bg-white/95 text-gray-900 placeholder-gray-500 backdrop-blur-sm'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && Object.keys(categoryCounts).length > 1 && (
        <div className="absolute top-16 left-4 right-4 z-[1000] overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-2">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <FilterButton
                key={category}
                category={category as KnowledgeCategory}
                isActive={activeFilters.has(category as KnowledgeCategory)}
                count={count}
                onClick={() => toggleFilter(category as KnowledgeCategory)}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Zoom Controls */}
        <div className={`flex flex-col rounded-xl shadow-lg overflow-hidden ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <button
            onClick={() => mapInstance?.zoomIn()}
            className={`p-2.5 transition-colors ${
              isDarkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-50 text-gray-700'
            }`}
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <div className={`h-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <button
            onClick={() => mapInstance?.zoomOut()}
            className={`p-2.5 transition-colors ${
              isDarkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-50 text-gray-700'
            }`}
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
        </div>

        {/* Location Button */}
        <button
          onClick={centerOnUser}
          disabled={isLocating}
          className={`p-3 rounded-xl shadow-lg transition-all ${
            userLocation
              ? 'bg-cyan-500 text-white hover:bg-cyan-600'
              : isDarkMode
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          title="My Location"
        >
          {isLocating ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Crosshair size={20} />
          )}
        </button>

        {/* Fit All Button */}
        <button
          onClick={fitAllMarkers}
          className={`p-3 rounded-xl shadow-lg transition-colors ${
            isDarkMode
              ? 'bg-gray-800 text-white hover:bg-gray-700'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          title="Fit All Markers"
        >
          <Maximize2 size={20} />
        </button>

        {/* Layer Toggle */}
        <LayerToggle
          currentStyle={mapStyle}
          onStyleChange={setMapStyle}
          isOpen={layerMenuOpen}
          onToggle={() => setLayerMenuOpen(!layerMenuOpen)}
          isDarkMode={isDarkMode}
        />

        {/* Expand Button */}
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className={`p-3 rounded-xl shadow-lg transition-colors ${
              isDarkMode
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        )}
      </div>

      {/* Bottom Info Panel */}
      <div className="absolute bottom-4 left-4 z-[1000] max-w-xs">
        {/* Route Info Panel */}
        {activeRoute && routeDestination && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-2 px-4 py-3 rounded-xl shadow-lg ${
              isDarkMode ? 'bg-gray-800/95 backdrop-blur-sm' : 'bg-white/95 backdrop-blur-sm'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Route to {routeDestination.title}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5 text-cyan-500 font-medium">
                    <Route size={14} />
                    {formatDistance(activeRoute.distance)}
                  </span>
                  <span className={`flex items-center gap-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Clock size={14} />
                    {formatDuration(activeRoute.duration)}
                  </span>
                </div>
              </div>
              <button
                onClick={clearRoute}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
                title="Clear route"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Location Error */}
        {locationError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 px-3 py-2 bg-red-500/90 text-white rounded-xl shadow-lg text-sm flex items-center gap-2 backdrop-blur-sm"
          >
            <AlertCircle size={14} />
            <span className="flex-1">{locationError}</span>
            <button
              onClick={() => setLocationError(null)}
              className="p-1 hover:bg-red-400/50 rounded"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}

        {/* Place Count */}
        <div className={`px-3 py-2 rounded-xl shadow-lg text-sm ${
          isDarkMode ? 'bg-gray-800/90 backdrop-blur-sm' : 'bg-white/90 backdrop-blur-sm'
        }`}>
          <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {filteredMarkers.length}
          </span>
          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}> places</span>
          {userLocation && (
            <span className="ml-2 text-cyan-500">
              <LocateFixed size={12} className="inline mr-1" />
              GPS Active
            </span>
          )}
        </div>
      </div>

      {/* Leaflet Map */}
      <MapContainer
        center={CAYMAN_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        className="w-full h-full"
        zoomControl={false}
        style={{ background: isDarkMode ? '#1a1a2e' : '#e8f4f8' }}
      >
        {/* Base Layer - High resolution tiles */}
        <TileLayer
          key={`base-${mapStyle}`}
          attribution={currentTiles.attribution}
          url={currentTiles.url}
          maxZoom={currentTiles.maxZoom}
          tileSize={(currentTiles as any).tileSize || 256}
          zoomOffset={(currentTiles as any).zoomOffset || 0}
        />

        {/* Labels overlay for hybrid satellite view */}
        {needsLabelsOverlay && (
          <TileLayer
            key="labels-overlay"
            url={MAP_TILES.labelsOverlay.url}
            maxZoom={MAP_TILES.labelsOverlay.maxZoom}
            pane="overlayPane"
          />
        )}

        {/* Labels overlay for hybrid satellite view */}
        {needsLabelsOverlay && (
          <TileLayer
            key="labels-overlay"
            url={MAP_TILES.labelsOverlay.url}
            maxZoom={MAP_TILES.labelsOverlay.maxZoom}
            pane="overlayPane"
          />
        )}

        <MapController
          markers={filteredMarkers}
          selectedMarkerId={selectedMarkerId}
          highlightedMarkerIds={highlightedMarkerIds}
          onMapReady={handleMapReady}
          shouldFitBounds={shouldFitBounds}
          onFitBoundsComplete={() => setShouldFitBounds(false)}
        />

        {/* Route Polyline */}
        {activeRoute && activeRoute.coordinates.length > 0 && (
          <Polyline
            positions={activeRoute.coordinates}
            pathOptions={{
              color: '#0891b2',
              weight: 5,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
              dashArray: undefined
            }}
          />
        )}

        {/* User Location Marker */}
        {userLocation && (
          <>
            <Circle
              center={[userLocation.latitude, userLocation.longitude]}
              radius={userLocation.accuracy}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 1
              }}
            />
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={createUserLocationIcon(isDarkMode)}
            >
              <Popup>
                <div className="text-sm font-medium text-gray-900">Your Location</div>
                <div className="text-xs text-gray-500">Accuracy: {Math.round(userLocation.accuracy)}m</div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Place Markers - Clustered or Individual */}
        {enableClustering ? (
          <ClusteredMarkers
            markers={filteredMarkers}
            selectedMarkerId={selectedMarkerId}
            hoveredMarkerId={hoveredMarkerId}
            highlightedMarkerIds={highlightedMarkerIds}
            isDarkMode={isDarkMode}
            enableRouting={enableRouting}
            onMarkerClick={handleMarkerClick}
            onMarkerHover={handleMarkerHover}
            onGetDirections={enableRouting ? getDirections : undefined}
            routeLoading={routeLoading}
            routeDestination={routeDestination}
            activeRoute={activeRoute}
          />
        ) : (
          filteredMarkers.map(marker => (
            <Marker
              key={marker.id}
              position={[marker.latitude, marker.longitude]}
              icon={createCustomIcon(
                marker.category,
                marker.id === selectedMarkerId || marker.id === openPopupId,
                marker.id === hoveredMarkerId,
                isDarkMode,
                highlightedMarkerIds.includes(marker.id)
              )}
              ref={(ref) => {
                if (ref) markerRefs.current[marker.id] = ref;
              }}
              eventHandlers={{
                click: () => handleMarkerClick(marker),
                mouseover: () => handleMarkerHover(marker.id),
                mouseout: () => handleMarkerHover(null)
              }}
            >
              <Popup
                closeButton={true}
                className={`custom-popup ${isDarkMode ? 'dark-popup' : ''}`}
                maxWidth={340}
              >
                <PopupContent
                  marker={marker}
                  onGetDirections={enableRouting ? getDirections : undefined}
                  routeLoading={routeLoading && routeDestination?.id === marker.id}
                  routeInfo={routeDestination?.id === marker.id ? activeRoute : undefined}
                  isDarkMode={isDarkMode}
                />
              </Popup>
            </Marker>
          ))
        )}
      </MapContainer>

      {/* Custom styles for Leaflet */}
      <style>{`
        /* CRITICAL: Remove default Leaflet icon styles */
        .custom-marker-icon {
          background: transparent !important;
          border: none !important;
        }

        /* HYPER-FLUID MARKER ANIMATIONS - Google Maps Quality */
        .marker-wrapper {
          cursor: pointer;
          transition: filter 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                      transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          will-change: transform, filter;
        }

        .marker-wrapper:hover {
          transform: scale(1.08) translateY(-2px);
        }

        .marker-wrapper.selected {
          z-index: 1000 !important;
          filter: drop-shadow(0 0 12px rgba(100, 210, 255, 0.7));
          transform: scale(1.15) translateY(-4px);
        }

        .marker-wrapper.hovered {
          z-index: 999 !important;
          filter: drop-shadow(0 0 8px rgba(100, 210, 255, 0.5));
          transform: scale(1.1) translateY(-2px);
        }

        .marker-wrapper.highlighted {
          z-index: 1001 !important;
          filter: drop-shadow(0 0 16px rgba(6, 182, 212, 0.8));
          animation: markerHighlightBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Smooth glow ring for highlighted markers */
        .marker-pulse-ring {
          animation: markerGlowPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
        }

        @keyframes markerPulse {
          0% {
            transform: scale(0.9);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.6);
            opacity: 0;
          }
          100% {
            transform: scale(0.9);
            opacity: 0;
          }
        }

        @keyframes markerGlowPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
            box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.4);
          }
          50% {
            transform: scale(1.3);
            opacity: 0.3;
            box-shadow: 0 0 20px 10px rgba(6, 182, 212, 0.2);
          }
        }

        @keyframes markerHighlightBounce {
          0% {
            transform: scale(0.5) translateY(20px);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) translateY(-8px);
          }
          70% {
            transform: scale(0.95) translateY(2px);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        @keyframes markerBounce {
          0%, 100% {
            transform: translateY(0);
          }
          25% {
            transform: translateY(-10px);
          }
          50% {
            transform: translateY(-6px);
          }
          75% {
            transform: translateY(-8px);
          }
        }

        /* Ripple effect on marker click */
        .marker-wrapper::after {
          content: '';
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%);
          opacity: 0;
          transform: scale(0);
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
          pointer-events: none;
        }

        .marker-wrapper.selected::after {
          opacity: 1;
          transform: scale(1.5);
        }

        .custom-cluster-icon {
          background: transparent !important;
          border: none !important;
        }

        /* HYPER-FLUID CLUSTER ANIMATIONS */
        .cluster-marker {
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                      filter 0.2s ease;
          will-change: transform;
        }

        .cluster-marker:hover {
          transform: scale(1.15);
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.25));
        }

        .cluster-marker:active {
          transform: scale(0.95);
        }

        /* Cluster entrance animation */
        .leaflet-marker-icon.cluster-marker {
          animation: clusterEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes clusterEnter {
          0% {
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        /* PREMIUM POPUP STYLING - Google Maps Quality */
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 20px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 12px 48px rgba(0,0,0,0.2),
                      0 4px 16px rgba(0,0,0,0.1);
          animation: popupEnter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          backdrop-filter: blur(8px);
        }

        @keyframes popupEnter {
          0% {
            transform: scale(0.8) translateY(10px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .custom-popup .leaflet-popup-content {
          margin: 14px;
          width: auto !important;
        }

        .custom-popup .leaflet-popup-tip-container {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }

        .custom-popup .leaflet-popup-tip {
          background: white;
          box-shadow: none;
        }

        .custom-popup.dark-popup .leaflet-popup-content-wrapper {
          background: rgba(31, 41, 55, 0.95);
          backdrop-filter: blur(12px);
        }

        .custom-popup.dark-popup .leaflet-popup-tip {
          background: rgba(31, 41, 55, 0.95);
        }

        .custom-popup .leaflet-popup-close-button {
          top: 10px !important;
          right: 10px !important;
          width: 28px !important;
          height: 28px !important;
          font-size: 16px !important;
          line-height: 28px !important;
          color: #6b7280;
          background: rgba(255,255,255,0.95);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .custom-popup.dark-popup .leaflet-popup-close-button {
          background: rgba(55, 65, 81, 0.95);
          color: #9ca3af;
        }

        .custom-popup .leaflet-popup-close-button:hover {
          color: #1f2937;
          background: white;
          transform: scale(1.1) rotate(90deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .custom-popup.dark-popup .leaflet-popup-close-button:hover {
          color: white;
          background: #4b5563;
        }

        /* Leaflet container font */
        .leaflet-container {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif;
        }

        /* Crisp tile rendering */
        .leaflet-tile {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }

        /* User location marker */
        .user-location-marker {
          background: transparent !important;
          border: none !important;
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.5);
            opacity: 0;
          }
          100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
        }

        .user-location-marker .animate-ping {
          animation: pulse-ring 2s ease-out infinite;
        }

        /* Hide scrollbar for filter bar */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Marker transitions */
        .leaflet-marker-icon {
          transition: filter 0.15s ease;
        }

        /* Compact attribution */
        .leaflet-control-attribution {
          background: rgba(0,0,0,0.5) !important;
          backdrop-filter: blur(4px);
          border-radius: 4px;
          font-size: 9px;
          color: rgba(255,255,255,0.7) !important;
          padding: 2px 6px !important;
        }

        .leaflet-control-attribution a {
          color: rgba(255,255,255,0.8) !important;
        }

        /* Disable tile fade for crisper appearance */
        .leaflet-tile-container {
          opacity: 1 !important;
        }

        /* PREMIUM CLUSTER ANIMATIONS - Google Maps Quality */
        @keyframes clusterPulse {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.4);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0.3;
          }
        }

        .cluster-wrapper {
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                      filter 0.2s ease;
        }

        .cluster-wrapper:hover {
          transform: scale(1.12);
          filter: drop-shadow(0 4px 16px rgba(6, 182, 212, 0.3));
        }

        .cluster-wrapper:active {
          transform: scale(0.95);
        }

        .cluster-wrapper:hover .cluster-pulse {
          animation: none;
          transform: scale(1.6);
          opacity: 0.2;
        }

        /* Leaflet MarkerCluster FLUID overrides */
        .leaflet-cluster-anim .leaflet-marker-icon,
        .leaflet-cluster-anim .leaflet-marker-shadow {
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                      opacity 0.3s ease-out;
        }

        .marker-cluster-small,
        .marker-cluster-medium,
        .marker-cluster-large {
          background: transparent !important;
        }

        .marker-cluster div {
          background: transparent !important;
        }

        /* Premium Spiderfy lines with gradient */
        .leaflet-cluster-spider-leg {
          stroke: url(#spiderGradient);
          stroke: rgba(6, 182, 212, 0.7);
          stroke-width: 2;
          stroke-linecap: round;
          transition: stroke 0.2s ease, stroke-width 0.2s ease;
        }

        .leaflet-cluster-spider-leg:hover {
          stroke: rgba(6, 182, 212, 1);
          stroke-width: 3;
        }

        /* Smooth zoom transitions */
        .leaflet-zoom-anim .leaflet-zoom-animated {
          transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        /* Map pan smoothness */
        .leaflet-pan-anim .leaflet-tile,
        .leaflet-pan-anim .leaflet-marker-pane,
        .leaflet-pan-anim .leaflet-shadow-pane,
        .leaflet-pan-anim .leaflet-popup-pane {
          transition: transform 0.25s linear;
        }

        /* Control buttons hover effects */
        .leaflet-control button,
        .map-control-btn {
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .leaflet-control button:hover,
        .map-control-btn:hover {
          transform: scale(1.05);
        }

        .leaflet-control button:active,
        .map-control-btn:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
};

export default InteractiveMap;
