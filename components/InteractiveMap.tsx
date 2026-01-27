import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, X, Star, Phone, Globe, Navigation, Clock, DollarSign,
  Waves, UtensilsCrossed, Building2, Palmtree, Ship, Plane,
  Camera, Compass, ChevronRight, ExternalLink, Heart, Share2,
  Maximize2, Minimize2, Layers, Filter, Search, LocateFixed
} from 'lucide-react';
import type { MapMarker, KnowledgeCategory, PriceRange } from '../types/chatbot';

// Google Maps API key - In production, this should be in environment variables
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Cayman Islands center coordinates
const CAYMAN_CENTER = {
  lat: 19.3133,
  lng: -81.2546
};

// Custom map styles for a beautiful, modern look
const mapStyles = [
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0891b2' }, { lightness: 40 }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#0e7490' }]
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#f0fdfa' }]
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#ecfdf5' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#d1d5db' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#fef3c7' }]
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#d1fae5' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#bbf7d0' }]
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#94a3b8' }]
  }
];

// Category icons and colors
const categoryConfig: Record<KnowledgeCategory, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}> = {
  hotel: {
    icon: <Building2 size={16} />,
    color: '#8b5cf6',
    bgColor: 'bg-violet-500',
    label: 'Hotels'
  },
  restaurant: {
    icon: <UtensilsCrossed size={16} />,
    color: '#f59e0b',
    bgColor: 'bg-amber-500',
    label: 'Restaurants'
  },
  beach: {
    icon: <Waves size={16} />,
    color: '#06b6d4',
    bgColor: 'bg-cyan-500',
    label: 'Beaches'
  },
  attraction: {
    icon: <Camera size={16} />,
    color: '#ec4899',
    bgColor: 'bg-pink-500',
    label: 'Attractions'
  },
  activity: {
    icon: <Compass size={16} />,
    color: '#10b981',
    bgColor: 'bg-emerald-500',
    label: 'Activities'
  },
  diving: {
    icon: <Waves size={16} />,
    color: '#0ea5e9',
    bgColor: 'bg-sky-500',
    label: 'Diving'
  },
  villa_rental: {
    icon: <Palmtree size={16} />,
    color: '#84cc16',
    bgColor: 'bg-lime-500',
    label: 'Villas'
  },
  boat_charter: {
    icon: <Ship size={16} />,
    color: '#3b82f6',
    bgColor: 'bg-blue-500',
    label: 'Boats'
  },
  private_jet: {
    icon: <Plane size={16} />,
    color: '#6366f1',
    bgColor: 'bg-indigo-500',
    label: 'Jets'
  },
  concierge: {
    icon: <Star size={16} />,
    color: '#eab308',
    bgColor: 'bg-yellow-500',
    label: 'Concierge'
  },
  real_estate: {
    icon: <Building2 size={16} />,
    color: '#64748b',
    bgColor: 'bg-slate-500',
    label: 'Real Estate'
  },
  event: {
    icon: <Camera size={16} />,
    color: '#f43f5e',
    bgColor: 'bg-rose-500',
    label: 'Events'
  },
  transport: {
    icon: <Navigation size={16} />,
    color: '#14b8a6',
    bgColor: 'bg-teal-500',
    label: 'Transport'
  },
  general: {
    icon: <MapPin size={16} />,
    color: '#6b7280',
    bgColor: 'bg-gray-500',
    label: 'General'
  }
};

// Price range display
const priceRangeDisplay: Record<PriceRange, string> = {
  '$': '$',
  '$$': '$$',
  '$$$': '$$$',
  '$$$$': '$$$$',
  '$$$$$': '$$$$$'
};

interface InteractiveMapProps {
  markers: MapMarker[];
  selectedMarkerId?: string;
  onMarkerSelect?: (markerId: string) => void;
  onMarkerHover?: (markerId: string | null) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
  showFilters?: boolean;
  showSearch?: boolean;
}

// Custom marker component for creating styled markers
const createMarkerIcon = (category: KnowledgeCategory, isSelected: boolean, isHovered: boolean) => {
  const config = categoryConfig[category] || categoryConfig.general;
  const size = isSelected ? 48 : isHovered ? 44 : 40;
  const scale = isSelected ? 1.2 : isHovered ? 1.1 : 1;

  // SVG marker with category icon
  const svg = `
    <svg width="${size}" height="${size * 1.3}" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      <g filter="url(#shadow)" transform="scale(${scale})">
        <path d="M20 0C8.954 0 0 8.954 0 20c0 14 20 32 20 32s20-18 20-32C40 8.954 31.046 0 20 0z"
              fill="${config.color}"
              stroke="white"
              stroke-width="2"/>
        <circle cx="20" cy="18" r="12" fill="white" fill-opacity="0.9"/>
      </g>
    </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size * 1.3),
    anchor: new google.maps.Point(size / 2, size * 1.3)
  };
};

// Info Window Content Component
const InfoWindowContent: React.FC<{ marker: MapMarker; onClose: () => void }> = ({ marker, onClose }) => {
  const config = categoryConfig[marker.category] || categoryConfig.general;

  return (
    <div className="min-w-[280px] max-w-[320px] p-0 font-sans">
      {/* Image Header */}
      {marker.thumbnail && (
        <div className="relative h-32 -mx-2 -mt-2 mb-3">
          <img
            src={marker.thumbnail}
            alt={marker.title}
            className="w-full h-full object-cover rounded-t-lg"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1 bg-white/90 rounded-full hover:bg-white transition-colors"
          >
            <X size={16} className="text-gray-600" />
          </button>
          <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-full text-white text-xs font-medium ${config.bgColor}`}>
            {config.label}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-2">
        <h3 className="font-bold text-gray-900 text-lg leading-tight">{marker.title}</h3>

        {marker.subtitle && (
          <p className="text-sm text-gray-600">{marker.subtitle}</p>
        )}

        {/* Rating and Price */}
        <div className="flex items-center gap-3 text-sm">
          {marker.rating && (
            <div className="flex items-center gap-1">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <span className="font-medium">{marker.rating.toFixed(1)}</span>
              {marker.reviewCount && (
                <span className="text-gray-400">({marker.reviewCount})</span>
              )}
            </div>
          )}
          {marker.priceRange && (
            <span className="text-emerald-600 font-medium">
              {priceRangeDisplay[marker.priceRange]}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="space-y-1.5 pt-2 border-t border-gray-100">
          {marker.address && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
              <span>{marker.address}</span>
            </div>
          )}
          {marker.openingHours && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock size={14} className="text-gray-400" />
              <span>{marker.openingHours}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3">
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition-colors">
            <Navigation size={14} />
            Directions
          </button>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Heart size={16} className="text-gray-400" />
          </button>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Share2 size={16} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Filter Button Component
const FilterButton: React.FC<{
  category: KnowledgeCategory;
  isActive: boolean;
  count: number;
  onClick: () => void;
}> = ({ category, isActive, count, onClick }) => {
  const config = categoryConfig[category];

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
        isActive
          ? `${config.bgColor} text-white shadow-md`
          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
      }`}
    >
      {config.icon}
      <span>{config.label}</span>
      <span className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
        {count}
      </span>
    </button>
  );
};

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  markers,
  selectedMarkerId,
  onMarkerSelect,
  onMarkerHover,
  isExpanded = false,
  onToggleExpand,
  className = '',
  showFilters = true,
  showSearch = true
}) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [infoWindowMarker, setInfoWindowMarker] = useState<MapMarker | null>(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<KnowledgeCategory>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');

  // Load Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places']
  });

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

  // Map load callback
  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);

    // Fit bounds to markers if any
    if (markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(marker => {
        bounds.extend({ lat: marker.latitude, lng: marker.longitude });
      });
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [markers]);

  // Pan to selected marker
  useEffect(() => {
    if (map && selectedMarkerId) {
      const marker = markers.find(m => m.id === selectedMarkerId);
      if (marker) {
        map.panTo({ lat: marker.latitude, lng: marker.longitude });
        map.setZoom(15);
        setInfoWindowMarker(marker);
      }
    }
  }, [map, selectedMarkerId, markers]);

  // Handle marker click
  const handleMarkerClick = (marker: MapMarker) => {
    setInfoWindowMarker(marker);
    onMarkerSelect?.(marker.id);
    map?.panTo({ lat: marker.latitude, lng: marker.longitude });
  };

  // Handle marker hover
  const handleMarkerHover = (markerId: string | null) => {
    setHoveredMarkerId(markerId);
    onMarkerHover?.(markerId);
  };

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

  // Center on user location
  const centerOnUser = () => {
    if (navigator.geolocation && map) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.panTo({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          map.setZoom(14);
        },
        () => {
          // Default to Cayman center if location denied
          map.panTo(CAYMAN_CENTER);
          map.setZoom(11);
        }
      );
    }
  };

  // Fit all markers
  const fitAllMarkers = () => {
    if (map && filteredMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      filteredMarkers.forEach(marker => {
        bounds.extend({ lat: marker.latitude, lng: marker.longitude });
      });
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  };

  // Loading state
  if (loadError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center p-8">
          <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium">Unable to load map</p>
          <p className="text-sm text-gray-400 mt-1">Please check your internet connection</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-cyan-50 to-teal-50 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading map...</p>
        </div>
      </div>
    );
  }

  // No API key message
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-cyan-50 to-teal-50 ${className}`}>
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin size={40} className="text-cyan-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Interactive Map</h3>
          <p className="text-gray-600 mb-6">
            To enable the interactive map, add your Google Maps API key to the environment variables.
          </p>

          {/* Preview of markers */}
          {markers.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 mb-3">{markers.length} places to explore</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {Object.entries(categoryCounts).slice(0, 5).map(([cat, count]) => {
                  const config = categoryConfig[cat as KnowledgeCategory];
                  return (
                    <div
                      key={cat}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-white text-xs ${config.bgColor}`}
                    >
                      {config.icon}
                      <span>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Search Bar */}
      {showSearch && (
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl shadow-lg border-0 focus:ring-2 focus:ring-cyan-500 text-sm"
            />
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && Object.keys(categoryCounts).length > 1 && (
        <div className="absolute top-16 left-4 right-4 z-10 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <FilterButton
                key={category}
                category={category as KnowledgeCategory}
                isActive={activeFilters.has(category as KnowledgeCategory)}
                count={count}
                onClick={() => toggleFilter(category as KnowledgeCategory)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={centerOnUser}
          className="p-3 bg-white rounded-xl shadow-lg hover:bg-gray-50 transition-colors"
          title="My Location"
        >
          <LocateFixed size={20} className="text-gray-600" />
        </button>
        <button
          onClick={fitAllMarkers}
          className="p-3 bg-white rounded-xl shadow-lg hover:bg-gray-50 transition-colors"
          title="Fit All"
        >
          <Maximize2 size={20} className="text-gray-600" />
        </button>
        <button
          onClick={() => setMapType(prev => prev === 'roadmap' ? 'satellite' : 'roadmap')}
          className="p-3 bg-white rounded-xl shadow-lg hover:bg-gray-50 transition-colors"
          title="Toggle Map Type"
        >
          <Layers size={20} className="text-gray-600" />
        </button>
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="p-3 bg-white rounded-xl shadow-lg hover:bg-gray-50 transition-colors"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? (
              <Minimize2 size={20} className="text-gray-600" />
            ) : (
              <Maximize2 size={20} className="text-gray-600" />
            )}
          </button>
        )}
      </div>

      {/* Marker Count */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="px-3 py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg text-sm">
          <span className="font-medium text-gray-900">{filteredMarkers.length}</span>
          <span className="text-gray-500"> places</span>
        </div>
      </div>

      {/* Google Map */}
      <GoogleMap
        mapContainerClassName="w-full h-full"
        center={CAYMAN_CENTER}
        zoom={11}
        onLoad={onLoad}
        options={{
          styles: mapStyles,
          mapTypeId: mapType,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER
          },
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          clickableIcons: false
        }}
      >
        <MarkerClusterer
          options={{
            imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
            maxZoom: 14,
            gridSize: 60
          }}
        >
          {(clusterer) => (
            <>
              {filteredMarkers.map(marker => (
                <Marker
                  key={marker.id}
                  position={{ lat: marker.latitude, lng: marker.longitude }}
                  icon={createMarkerIcon(
                    marker.category,
                    marker.id === selectedMarkerId || marker.id === infoWindowMarker?.id,
                    marker.id === hoveredMarkerId
                  )}
                  onClick={() => handleMarkerClick(marker)}
                  onMouseOver={() => handleMarkerHover(marker.id)}
                  onMouseOut={() => handleMarkerHover(null)}
                  clusterer={clusterer}
                  animation={
                    marker.id === selectedMarkerId
                      ? google.maps.Animation.BOUNCE
                      : undefined
                  }
                />
              ))}
            </>
          )}
        </MarkerClusterer>

        {/* Info Window */}
        {infoWindowMarker && (
          <InfoWindow
            position={{
              lat: infoWindowMarker.latitude,
              lng: infoWindowMarker.longitude
            }}
            onCloseClick={() => setInfoWindowMarker(null)}
            options={{
              pixelOffset: new google.maps.Size(0, -45),
              maxWidth: 350
            }}
          >
            <InfoWindowContent
              marker={infoWindowMarker}
              onClose={() => setInfoWindowMarker(null)}
            />
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default InteractiveMap;
