// ============================================
// ISLE AI - CHATBOT PANEL COMPONENT
// Mindtrip-inspired AI Travel Concierge Interface
// ============================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useIsland } from '../src/lib/island-context';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Briefcase,
  Heart,
  Bell,
  Compass,
  User,
  Info,
  Search,
  Plus,
  Mic,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Star,
  Clock,
  DollarSign,
  ExternalLink,
  Phone,
  Globe,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  Sparkles,
  Calendar,
  Users,
  Sliders,
  Map as MapIcon,
  Navigation,
  Bookmark,
  Share2,
  MoreHorizontal,
  Check,
  Loader2,
  Volume2,
  Upload,
  Trash2,
  Edit3,
  Copy,
  TrendingUp
} from 'lucide-react';
import { ChatMessage, PlaceCard, Chat, ChatFilters, Trip, Collection, Guide, KnowledgeNode, PriceRange, MapMarker, KnowledgeCategory } from '../types/chatbot';
import { config, guides, loadKnowledgeBase, getKnowledgeBase, CAYMAN_KNOWLEDGE_BASE, CAYMAN_CONFIG, CAYMAN_GUIDES } from '../data/island-knowledge';
// Use Google Maps instead of Leaflet for premium map experience
import InteractiveMap from './GoogleMapsInteractive';
import { processQuery, processQueryWithStreaming, RAGResponse, detectCategories } from '../services/ragService';
import { logMessage } from '../services/conversationLogger';
import { trackWebsiteClick, trackDirectionsClick, trackBookingClick, trackPhoneClick } from '../services/interactionTrackingService';
import { useContextualMap } from '../hooks/useContextualMap';
import EnhancedAnalyticsDashboard from './dashboard/EnhancedAnalyticsDashboard';

// ============ TYPES ============

type SidebarTab = 'chat' | 'trips' | 'collections' | 'notifications' | 'inspiration' | 'profile' | 'info';
type ChatView = 'chat' | 'trips' | 'collections' | 'inspiration';

interface ChatbotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceSelect?: (place: KnowledgeNode) => void;
}

// ============ SIDEBAR NAVIGATION ============

const SidebarNav: React.FC<{
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  unreadNotifications?: number;
}> = ({ activeTab, onTabChange, unreadNotifications = 0 }) => {
  const tabs: { id: SidebarTab; icon: React.ReactNode; label: string }[] = [
    { id: 'chat', icon: <Sparkles size={20} />, label: 'AI Chat' },
    { id: 'trips', icon: <Briefcase size={20} />, label: 'Trips' },
    { id: 'collections', icon: <Heart size={20} />, label: 'Collections' },
    { id: 'notifications', icon: <Bell size={20} />, label: 'Notifications' },
    { id: 'inspiration', icon: <Compass size={20} />, label: 'Inspiration' },
  ];

  return (
    <div className="w-14 bg-zinc-900/80 border-r border-white/5 flex flex-col items-center py-4">
      {/* Logo */}
      <div className="mb-6">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
          <Sparkles size={18} className="text-white" />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex-1 flex flex-col gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-zinc-500 hover:text-white hover:bg-white/5'
            }`}
            title={tab.label}
          >
            {tab.icon}
            {tab.id === 'notifications' && unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                {unreadNotifications}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-2 mt-auto">
        <button
          onClick={() => onTabChange('profile')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            activeTab === 'profile' ? 'bg-teal-500/20 text-teal-400' : 'text-zinc-500 hover:text-white hover:bg-white/5'
          }`}
          title="Profile"
        >
          <User size={20} />
        </button>
        <button
          onClick={() => onTabChange('info')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            activeTab === 'info' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'
          }`}
          title="Info"
        >
          <Info size={20} />
        </button>
      </div>
    </div>
  );
};

// ============ CHAT FILTERS BAR ============

const ChatFiltersBar: React.FC<{
  filters: ChatFilters;
  onFiltersChange: (filters: ChatFilters) => void;
}> = ({ filters, onFiltersChange }) => {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-zinc-900/50">
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-sm text-zinc-300 transition-all">
        <MapPin size={14} />
        <span>{filters.destination || 'Where'}</span>
      </button>
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-sm text-zinc-300 transition-all">
        <Calendar size={14} />
        <span>When</span>
      </button>
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-sm text-zinc-300 transition-all">
        <Users size={14} />
        <span>{filters.travelers || 2}</span>
      </button>
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-sm text-zinc-300 transition-all">
        <DollarSign size={14} />
        <span>{filters.budget || 'Budget'}</span>
      </button>
      <div className="flex-1" />
      <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-sm text-white transition-all border border-white/10">
        <Briefcase size={14} />
        <span>Create a trip</span>
      </button>
    </div>
  );
};

// ============ PLACE CARD COMPONENT ============

const PlaceCardComponent: React.FC<{
  place: KnowledgeNode;
  onSelect?: (place: KnowledgeNode) => void;
  onSave?: (place: KnowledgeNode) => void;
  onAddToTrip?: (place: KnowledgeNode) => void;
  onShowOnMap?: (place: KnowledgeNode) => void;  // NEW: Show on map action
  onAskAbout?: (place: KnowledgeNode) => void;   // NEW: Ask about this place
  compact?: boolean;
}> = ({ place, onSelect, onSave, onAddToTrip, onShowOnMap, onAskAbout, compact = false }) => {
  const [isSaved, setIsSaved] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hotel': return '🏨';
      case 'restaurant': return '🍽️';
      case 'beach': return '🏖️';
      case 'diving_snorkeling': return '🤿';
      case 'boat_charter': return '🛥️';
      case 'villa_rental': return '🏠';
      case 'attraction': return '🎯';
      case 'activity': return '🎿';
      case 'bar': return '🍸';
      case 'spa': return '💆';
      case 'spa_wellness': return '💆';
      case 'shopping': return '🛍️';
      default: return '📍';
    }
  };

  // Minimal safety check - only require id and name
  if (!place?.id || !place?.name) {
    return null;
  }

  // Get coordinates for directions - handle both formats
  const lat = place.location?.coordinates?.lat ?? place.location?.latitude;
  const lng = place.location?.coordinates?.lng ?? place.location?.longitude;
  const hasCoordinates = lat !== undefined && lng !== undefined;

  // Get website URL
  const websiteUrl = place.contact?.website;

  // Get thumbnail with fallback
  const thumbnail = place.media?.thumbnail || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800';

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all group border border-white/5"
        onClick={() => {
          onShowOnMap?.(place);  // Always show on map when clicking a place card
          onSelect?.(place);
        }}
      >
        <img
          src={thumbnail}
          alt={place.name}
          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400'; }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span>{getCategoryIcon(place.category || 'general_info')}</span>
            <span className="font-medium text-white text-sm truncate">{place.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
            {place.ratings?.overall && (
              <>
                <span className="flex items-center gap-0.5">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  {place.ratings.overall.toFixed(1)}
                </span>
                <span>•</span>
              </>
            )}
            <span>{place.location?.district || place.location?.island || 'Cayman Islands'}</span>
          </div>
          {/* Action buttons for compact card - ENHANCED with Map & Ask */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Show on Map - Priority action */}
            {hasCoordinates && onShowOnMap && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowOnMap(place);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/20 text-violet-400 text-xs hover:bg-violet-500/30 transition-all group/btn"
              >
                <MapIcon size={10} className="group-hover/btn:animate-pulse" />
                <span>Show on Map</span>
              </button>
            )}
            {/* Ask About - AI integration */}
            {onAskAbout && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAskAbout(place);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-pink-500/20 text-pink-400 text-xs hover:bg-pink-500/30 transition-all"
              >
                <Sparkles size={10} />
                <span>Ask AI</span>
              </button>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  trackWebsiteClick({
                    placeId: place.id,
                    placeName: place.name,
                    placeCategory: place.category || 'general_info',
                    coordinates: hasCoordinates ? { lat: lat!, lng: lng! } : undefined
                  });
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/30 transition-all"
              >
                <Globe size={10} />
                <span>Website</span>
              </a>
            )}
            {hasCoordinates && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  trackDirectionsClick({
                    placeId: place.id,
                    placeName: place.name,
                    placeCategory: place.category || 'general_info',
                    coordinates: { lat: lat!, lng: lng! }
                  });
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-teal-500/20 text-teal-400 text-xs hover:bg-teal-500/30 transition-all"
              >
                <Navigation size={10} />
                <span>Directions</span>
              </a>
            )}
            {place.contact?.bookingUrl && (
              <a
                href={place.contact.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  trackBookingClick({
                    placeId: place.id,
                    placeName: place.name,
                    placeCategory: place.category || 'general_info',
                    coordinates: hasCoordinates ? { lat: lat!, lng: lng! } : undefined
                  });
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/30 transition-all"
              >
                <Calendar size={10} />
                <span>Book</span>
              </a>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsSaved(!isSaved);
            onSave?.(place);
          }}
          className={`p-1.5 rounded-full transition-all flex-shrink-0 ${
            isSaved ? 'text-red-400' : 'text-zinc-500 hover:text-white'
          }`}
        >
          <Heart size={14} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden bg-zinc-800/50 border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
      onClick={() => {
        onShowOnMap?.(place);  // Always show on map when clicking a place card
        onSelect?.(place);
      }}
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={thumbnail}
          alt={place.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Actions overlay */}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsSaved(!isSaved);
              onSave?.(place);
            }}
            className={`p-2 rounded-full backdrop-blur-sm transition-all ${
              isSaved ? 'bg-red-500/80 text-white' : 'bg-black/40 text-white hover:bg-black/60'
            }`}
          >
            <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToTrip?.(place);
            }}
            className="p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Category badge */}
        <div className="absolute bottom-2 left-2">
          <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs text-white">
            {getCategoryIcon(place.category || 'general_info')} {(place.category || 'place').replace(/_/g, ' ')}
          </span>
        </div>

        {/* Rating badge */}
        {place.ratings?.overall && (
          <div className="absolute bottom-2 right-2">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs text-white">
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
              {place.ratings.overall.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h4 className="font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">
          {place.name}
        </h4>
        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
          {place.ratings?.reviewCount && place.ratings.reviewCount > 0 && (
            <>
              <span>({place.ratings.reviewCount} reviews)</span>
              <span>•</span>
            </>
          )}
          <span>{place.business?.priceRange || '$$'}</span>
        </div>
        <p className="text-xs text-zinc-400 line-clamp-2">{place.shortDescription || place.description?.slice(0, 100) || ''}</p>
        <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
          <MapPin size={12} />
          <span>{place.location?.district || place.location?.area || 'Cayman Islands'}{place.location?.island ? `, ${place.location.island}` : ''}</span>
        </div>

        {/* Action Buttons - ENHANCED with Show on Map & Ask AI */}
        <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/5">
          {/* NEW: Map & AI actions row */}
          <div className="flex items-center gap-2">
            {hasCoordinates && onShowOnMap && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowOnMap(place);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500/20 text-violet-400 text-xs font-medium hover:bg-violet-500/30 hover:scale-[1.02] transition-all"
              >
                <MapIcon size={14} />
                <span>Show on Map</span>
              </button>
            )}
            {onAskAbout && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAskAbout(place);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-pink-500/20 text-pink-400 text-xs font-medium hover:bg-pink-500/30 hover:scale-[1.02] transition-all"
              >
                <Sparkles size={14} />
                <span>Ask About This</span>
              </button>
            )}
          </div>
          {/* Primary row - Website and Directions */}
          <div className="flex items-center gap-2">
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  trackWebsiteClick({
                    placeId: place.id,
                    placeName: place.name,
                    placeCategory: place.category || 'general_info',
                    coordinates: hasCoordinates ? { lat: lat!, lng: lng! } : undefined
                  });
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/30 transition-all"
              >
                <Globe size={14} />
                <span>Visit Website</span>
              </a>
            )}
            {hasCoordinates && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  trackDirectionsClick({
                    placeId: place.id,
                    placeName: place.name,
                    placeCategory: place.category || 'general_info',
                    coordinates: { lat: lat!, lng: lng! }
                  });
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-teal-500/20 text-teal-400 text-xs font-medium hover:bg-teal-500/30 transition-all"
              >
                <Navigation size={14} />
                <span>Get Directions</span>
              </a>
            )}
            {!websiteUrl && !hasCoordinates && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(place);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all"
              >
                <ExternalLink size={14} />
                <span>View Details</span>
              </button>
            )}
          </div>
          {/* Booking button - when booking URL is available */}
          {place.contact?.bookingUrl && (
            <a
              href={place.contact.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                trackBookingClick({
                  placeId: place.id,
                  placeName: place.name,
                  placeCategory: place.category || 'general_info',
                  coordinates: hasCoordinates ? { lat: lat!, lng: lng! } : undefined
                });
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-400 text-xs font-semibold hover:from-amber-500/40 hover:to-orange-500/40 transition-all border border-amber-500/20"
            >
              <Calendar size={14} />
              <span>Book Now</span>
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============ HELPER: EXTRACT PLACES FROM AI RESPONSE ============

const extractPlacesFromContent = (content: string): KnowledgeNode[] => {
  const matchedPlaces: KnowledgeNode[] = [];
  const lowerContent = content.toLowerCase();

  console.log('[PlaceCards Debug] extractPlacesFromContent called with content length:', content.length);
  console.log('[PlaceCards Debug] Content preview:', content.slice(0, 200));
  console.log('[PlaceCards Debug] knowledgeBase has', CAYMAN_KNOWLEDGE_BASE.length, 'nodes');

  // Show some place names we're looking for
  console.log('[PlaceCards Debug] First 5 place names in KB:', CAYMAN_KNOWLEDGE_BASE.slice(0, 5).map(n => n.name));
  const kb = getKnowledgeBase();

  // Search through knowledge base for mentions
  for (const node of kb) {
    // Check for exact name match (case insensitive)
    const nameLower = node.name.toLowerCase();

    // Check if the place name appears in the content
    if (lowerContent.includes(nameLower)) {
      if (!matchedPlaces.find(p => p.id === node.id)) {
        matchedPlaces.push(node);
      }
      continue;
    }

    // Check for partial matches (e.g., "Ritz-Carlton" for "The Ritz-Carlton, Grand Cayman")
    const nameWords = nameLower.split(/[\s,]+/).filter(w => w.length > 3);
    const significantWords = nameWords.filter(w =>
      !['the', 'and', 'grand', 'cayman', 'islands', 'beach'].includes(w)
    );

    if (significantWords.length > 0) {
      const matchCount = significantWords.filter(word =>
        lowerContent.includes(word)
      ).length;

      // If most significant words match, consider it a match
      if (matchCount >= Math.ceil(significantWords.length * 0.6) && matchCount >= 1) {
        const firstWordIndex = lowerContent.indexOf(significantWords[0]);
        if (firstWordIndex !== -1 && !matchedPlaces.find(p => p.id === node.id)) {
          matchedPlaces.push(node);
        }
      }
    }
  }

  // If no direct matches found, try to find relevant places based on content categories
  if (matchedPlaces.length === 0) {
    const categoryKeywords: Record<string, string[]> = {
      beach: ['beach', 'beaches', 'sand', 'swimming', 'shore', 'seven mile', 'coastline', 'sunbathe'],
      hotel: ['hotel', 'resort', 'stay', 'accommodation', 'lodging', 'luxury', 'ritz', 'kimpton', 'room', 'suite'],
      restaurant: ['restaurant', 'food', 'eat', 'dining', 'dinner', 'lunch', 'cuisine', 'chef', 'brunch'],
      diving_snorkeling: ['dive', 'diving', 'snorkel', 'snorkeling', 'underwater', 'reef', 'stingray', 'coral', 'scuba'],
      activity: ['activity', 'tour', 'adventure', 'excursion', 'experience', 'things to do', 'explore'],
      attraction: ['attraction', 'visit', 'see', 'turtle', 'museum', 'landmark', 'sight'],
      bar: ['bar', 'cocktail', 'drink', 'nightlife', 'rum', 'happy hour'],
      spa: ['spa', 'massage', 'wellness', 'relax', 'treatment'],
      boat_charter: ['boat', 'yacht', 'charter', 'sailing', 'cruise', 'catamaran', 'fishing'],
      villa_rental: ['villa', 'rental', 'private', 'house', 'mansion', 'estate'],
      shopping: ['shop', 'shopping', 'buy', 'store', 'boutique', 'market'],
    };

    // Detect categories from content
    const detectedCategories: string[] = [];
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => lowerContent.includes(kw))) {
        detectedCategories.push(category);
      }
    }

    // Get top-rated places from detected categories
    if (detectedCategories.length > 0) {
      const categoryPlaces = kb
        .filter(node => detectedCategories.includes(node.category))
        .sort((a, b) => b.ratings.overall - a.ratings.overall)
        .slice(0, 5);

      matchedPlaces.push(...categoryPlaces);
    } else {
      // Final fallback: show top-rated places from popular categories
      const popularCategories = ['beach', 'hotel', 'restaurant', 'activity', 'attraction'];
      const topPlaces = kb
        .filter(node => popularCategories.includes(node.category))
        .sort((a, b) => b.ratings.overall - a.ratings.overall)
        .slice(0, 3);

      matchedPlaces.push(...topPlaces);
    }
  }

  // Increase limit to 10 for more comprehensive place matching
  return matchedPlaces.slice(0, 10);
};

// ============ HELPER: PARSE MARKDOWN AND MAKE PLACES CLICKABLE ============

interface ParsedContent {
  type: 'text' | 'header' | 'place_card' | 'bullet' | 'numbered' | 'emoji_header' | 'break';
  content: string;
  placeId?: string;
  place?: KnowledgeNode;
}

const parseMessageContent = (
  content: string,
  matchedPlaces: KnowledgeNode[]
): ParsedContent[][] => {
  const lines = content.split('\n');
  const parsedLines: ParsedContent[][] = [];

  for (const line of lines) {
    const parsedLine: ParsedContent[] = [];

    // Empty line
    if (!line.trim()) {
      parsedLines.push([{ type: 'break', content: '' }]);
      continue;
    }

    // Markdown ### headers (h3)
    if (line.startsWith('### ')) {
      const headerContent = line.slice(4).replace(/^\*\*|\*\*$/g, ''); // Remove ### and optional **
      parsedLine.push({ type: 'header', content: headerContent });
      parsedLines.push(parsedLine);
      continue;
    }

    // Markdown ## headers (h2)
    if (line.startsWith('## ')) {
      const headerContent = line.slice(3).replace(/^\*\*|\*\*$/g, '');
      parsedLine.push({ type: 'header', content: headerContent });
      parsedLines.push(parsedLine);
      continue;
    }

    // Header with ** at start and end
    if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      const headerContent = line.slice(2, -2);
      parsedLine.push({ type: 'header', content: headerContent });
      parsedLines.push(parsedLine);
      continue;
    }

    // Numbered list items (1. , 2. , etc.)
    if (/^\d+\.\s/.test(line)) {
      parsedLine.push({ type: 'emoji_header', content: '' });
      parsedLine.push(...parseInlineContent(line, matchedPlaces));
      parsedLines.push(parsedLine);
      continue;
    }

    // Bullet point
    if (line.startsWith('- ')) {
      const bulletContent = line.slice(2);
      parsedLine.push({ type: 'bullet', content: '' });
      parsedLine.push(...parseInlineContent(bulletContent, matchedPlaces));
      parsedLines.push(parsedLine);
      continue;
    }

    // Emoji headers (like "1. **Place Name**" or numbered items)
    if (/^[🥇🥈🥉⭐🏆🏖️🏨🍽️🤿🛥️🏠📍✨🚤🐢🌴🎉💰🔥❤️🌅]/.test(line)) {
      parsedLine.push({ type: 'emoji_header', content: '' });
      parsedLine.push(...parseInlineContent(line, matchedPlaces));
      parsedLines.push(parsedLine);
      continue;
    }

    // Regular line - parse inline content
    parsedLine.push(...parseInlineContent(line, matchedPlaces));
    parsedLines.push(parsedLine);
  }

  return parsedLines;
};

/**
 * Clean text of markdown artifacts
 */
function cleanMarkdown(text: string): string {
  return text
    // Remove markdown links [text](url) - keep just the text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bold markers **text** - keep the text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove italic markers *text* - keep the text
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove any remaining ** or *
    .replace(/\*+/g, '')
    // Remove [ and ] brackets
    .replace(/[\[\]]/g, '')
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse inline content - handles place matching
 * Places are rendered as structured cards with contact info from knowledge base
 */
const parseInlineContent = (
  text: string,
  matchedPlaces: KnowledgeNode[]
): ParsedContent[] => {
  // First clean the text of markdown artifacts
  const cleanedText = cleanMarkdown(text);
  const parts: ParsedContent[] = [];

  // Find all place matches in the cleaned text
  const placeMatches: { place: KnowledgeNode; start: number; end: number; matchText: string }[] = [];

  for (const place of matchedPlaces) {
    // Case-insensitive search for place name
    const lowerText = cleanedText.toLowerCase();
    const lowerName = place.name.toLowerCase();
    let searchStart = 0;

    while (true) {
      const idx = lowerText.indexOf(lowerName, searchStart);
      if (idx === -1) break;

      placeMatches.push({
        place,
        start: idx,
        end: idx + place.name.length,
        matchText: cleanedText.slice(idx, idx + place.name.length)
      });
      searchStart = idx + 1;
    }
  }

  // Sort by position and remove overlaps
  placeMatches.sort((a, b) => a.start - b.start);
  const filteredMatches: typeof placeMatches = [];
  let lastEnd = -1;
  for (const m of placeMatches) {
    if (m.start >= lastEnd) {
      filteredMatches.push(m);
      lastEnd = m.end;
    }
  }

  // Build parts - when we find a place, render it as a place_card
  let lastIdx = 0;
  for (const match of filteredMatches) {
    // Add text before this match
    if (match.start > lastIdx) {
      const beforeText = cleanedText.slice(lastIdx, match.start);
      if (beforeText.trim()) {
        parts.push({ type: 'text', content: beforeText });
      }
    }

    // Add the place as a card (includes contact info from knowledge base)
    parts.push({
      type: 'place_card',
      content: match.place.name, // Use the proper place name
      placeId: match.place.id,
      place: match.place
    });

    lastIdx = match.end;
  }

  // Add remaining text
  if (lastIdx < cleanedText.length) {
    const afterText = cleanedText.slice(lastIdx);
    if (afterText.trim()) {
      parts.push({ type: 'text', content: afterText });
    }
  }

  // If no parts, add the cleaned text
  if (parts.length === 0 && cleanedText.trim()) {
    parts.push({ type: 'text', content: cleanedText });
  }

  return parts;
};

// ============ CHAT MESSAGE COMPONENT ============

const ChatMessageComponent: React.FC<{
  message: ChatMessage;
  onPlaceSelect?: (place: KnowledgeNode) => void;
  onShowOnMap?: (place: KnowledgeNode) => void;
  onAskAbout?: (place: KnowledgeNode) => void;
  userQuery?: string;
}> = ({ message, onPlaceSelect, onShowOnMap, onAskAbout, userQuery }) => {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  // ============ ChatGPT-STYLE STREAMING ============
  // Phase 1: Streaming - show raw text exactly as it arrives
  // Phase 2: Just finished - brief transition state
  // Phase 3: Complete - show fully formatted content

  const [phase, setPhase] = useState<'streaming' | 'transitioning' | 'complete'>(
    isStreaming ? 'streaming' : 'complete'
  );
  const [streamedContent, setStreamedContent] = useState(message.content || '');
  const prevIsStreaming = useRef(isStreaming);

  // Update streamed content in real-time (no artificial delay - like ChatGPT)
  useEffect(() => {
    if (isStreaming && message.content) {
      setStreamedContent(message.content);
      setPhase('streaming');
    }
  }, [message.content, isStreaming]);

  // Handle transition from streaming to complete (like ChatGPT's "finish" moment)
  useEffect(() => {
    if (prevIsStreaming.current && !isStreaming) {
      // Just finished streaming - enter transition phase
      setPhase('transitioning');
      setStreamedContent(message.content || '');

      // Brief transition (150ms) then show formatted content
      const timer = setTimeout(() => {
        setPhase('complete');
      }, 150);

      return () => clearTimeout(timer);
    }
    prevIsStreaming.current = isStreaming;
  }, [isStreaming, message.content]);

  // If message was never streaming (e.g., loaded from history), show complete
  useEffect(() => {
    if (!isStreaming && phase === 'streaming') {
      setPhase('complete');
    }
  }, [isStreaming, phase]);

  // Extract places mentioned in the AI response (only when complete)
  const extractedPlaces = React.useMemo(() => {
    try {
      // Only extract when phase is complete (like ChatGPT shows formatted after streaming)
      if (isUser || phase !== 'complete' || !message.content) {
        return [];
      }
      return extractPlacesFromContent(message.content);
    } catch (error) {
      console.error('Error extracting places:', error);
      return [];
    }
  }, [message.content, isUser, phase]);

  // Get only relevant places that match the user's query
  // Prioritize RAG results (they are precisely matched to the query)
  const relevantPlaces = React.useMemo(() => {
    try {
      const placeMap = new Map<string, KnowledgeNode>();
      const kb = getKnowledgeBase();

      // Priority 1: Add places from RAG response (most relevant - matched by hybrid search)
      if (message.places && message.places.length > 0) {
        for (const placeCard of message.places) {
          const node = kb.find(n => n.id === placeCard.nodeId);
          if (node && !placeMap.has(node.id)) {
            placeMap.set(node.id, node);
          }
        }
      }

      // Priority 2: Add extracted places from content (mentioned in AI response)
      for (const place of extractedPlaces) {
        if (!placeMap.has(place.id)) {
          placeMap.set(place.id, place);
        }
      }

      // Filter to only valid nodes with required fields
      const result = Array.from(placeMap.values()).filter(p =>
        p && p.id && p.name && p.ratings?.overall !== undefined
      );

      // Increase limit to 10 for more comprehensive coverage
      return result.slice(0, 10);
    } catch (error) {
      console.error('Error getting relevant places:', error);
      return [];
    }
  }, [extractedPlaces, message.places, isUser, phase]);

  // "Discover Also" suggestions - related places based on categories
  const discoverAlsoPlaces = React.useMemo(() => {
    // Only show when phase is complete
    if (isUser || phase !== 'complete' || relevantPlaces.length === 0) return [];

    try {
      const kb = getKnowledgeBase();
      const relevantIds = new Set(relevantPlaces.map(p => p.id));
      const relevantCategories = [...new Set(relevantPlaces.map(p => p.category))];

      // Find related places from same categories, excluding already shown
      const related = kb
        .filter(p =>
          relevantCategories.includes(p.category) &&
          !relevantIds.has(p.id) &&
          p.ratings?.overall >= 4.0 &&
          p.media?.thumbnail
        )
        .sort((a, b) => (b.ratings?.overall || 0) - (a.ratings?.overall || 0))
        .slice(0, 3);

      return related;
    } catch (error) {
      return [];
    }
  }, [relevantPlaces, isUser, phase]);

  // Parse content with place highlighting (with error handling)
  // IMPORTANT: Only parse when complete (like ChatGPT formats after streaming ends)
  const parsedContent = React.useMemo(() => {
    try {
      if (isUser || phase !== 'complete' || !message.content) return null;
      return parseMessageContent(message.content, relevantPlaces);
    } catch (error) {
      console.error('Error parsing content:', error);
      return null;
    }
  }, [message.content, relevantPlaces, isUser, phase]);

  // Handle place click from text - show on map AND select
  const handlePlaceClick = (place: KnowledgeNode) => {
    onShowOnMap?.(place);  // Always show on map when clicking a place
    onPlaceSelect?.(place);
  };

  // Render parsed content (with error handling)
  const renderParsedContent = () => {
    try {
      if (!parsedContent || !Array.isArray(parsedContent)) {
        return <span>{message.content || ''}</span>;
      }

      return parsedContent.map((line, lineIndex) => {
      // Handle break
      if (line.length === 1 && line[0].type === 'break') {
        return <br key={lineIndex} />;
      }

      // Check if line starts with special types
      const firstPart = line[0];

      if (firstPart.type === 'header') {
        return (
          <h4 key={lineIndex} className="font-bold text-white text-base mt-4 mb-2 first:mt-0">
            {firstPart.content}
          </h4>
        );
      }

      if (firstPart.type === 'bullet') {
        return (
          <div key={lineIndex} className="flex items-start gap-2 ml-2 my-1">
            <span className="text-cyan-400 mt-0.5">-</span>
            <span className="text-zinc-300">
              {line.slice(1).map((part, partIndex) => renderPart(part, `${lineIndex}-${partIndex}`))}
            </span>
          </div>
        );
      }

      if (firstPart.type === 'emoji_header') {
        return (
          <div key={lineIndex} className="font-semibold text-white mt-4 mb-1 first:mt-0">
            {line.slice(1).map((part, partIndex) => renderPart(part, `${lineIndex}-${partIndex}`))}
          </div>
        );
      }

      // Regular paragraph
      return (
        <p key={lineIndex} className="mb-1.5 last:mb-0">
          {line.map((part, partIndex) => renderPart(part, `${lineIndex}-${partIndex}`))}
        </p>
      );
    });
    } catch (error) {
      console.error('Error rendering parsed content:', error);
      return <span>{message.content || ''}</span>;
    }
  };

  const renderPart = (part: ParsedContent, key: string) => {
    switch (part.type) {
      case 'place_card':
        // Structured place card with clickable title and action buttons
        const place = part.place;
        if (!place) return <span key={key}>{part.content}</span>;

        const hasWebsite = place.contact?.website;
        const hasPhone = place.contact?.phone;
        const hasEmail = place.contact?.email;
        const hasActions = hasWebsite || hasPhone || hasEmail;

        // Get opening hours if available
        const hours = place.operatingHours?.todayHours ||
          (place.operatingHours as unknown as { hours?: string })?.hours ||
          (place.details as unknown as { openingHours?: string })?.openingHours;

        return (
          <span key={key} className="inline">
            {/* Clickable place name - triggers map zoom */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePlaceClick(place);
              }}
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold
                         underline decoration-cyan-400/40 hover:decoration-cyan-300/60 underline-offset-2
                         transition-all duration-200 hover:bg-cyan-400/10 rounded px-0.5 -mx-0.5"
            >
              {part.content}
              <MapPin size={12} className="inline opacity-70" />
            </button>

            {/* Action buttons inline after the name */}
            {hasActions && (
              <span className="inline-flex items-center gap-1.5 ml-2">
                {hasWebsite && (
                  <a
                    href={place.contact.website!.startsWith('http') ? place.contact.website : `https://${place.contact.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      const lat = place.location?.coordinates?.lat ?? place.location?.latitude;
                      const lng = place.location?.coordinates?.lng ?? place.location?.longitude;
                      trackWebsiteClick({
                        placeId: place.id,
                        placeName: place.name,
                        placeCategory: place.category || 'general_info',
                        coordinates: lat && lng ? { lat, lng } : undefined
                      });
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                               bg-blue-500/20 hover:bg-blue-500/30
                               text-blue-400 hover:text-blue-300
                               border border-blue-500/30 hover:border-blue-500/50
                               transition-all duration-200 no-underline"
                  >
                    <Globe size={11} />
                    <span>Website</span>
                  </a>
                )}
                {hasPhone && (
                  <a
                    href={`tel:${place.contact.phone!.replace(/[\s.\-()]/g, '')}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const lat = place.location?.coordinates?.lat ?? place.location?.latitude;
                      const lng = place.location?.coordinates?.lng ?? place.location?.longitude;
                      trackPhoneClick({
                        placeId: place.id,
                        placeName: place.name,
                        placeCategory: place.category || 'general_info',
                        coordinates: lat && lng ? { lat, lng } : undefined
                      });
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                               bg-emerald-500/20 hover:bg-emerald-500/30
                               text-emerald-400 hover:text-emerald-300
                               border border-emerald-500/30 hover:border-emerald-500/50
                               transition-all duration-200 no-underline"
                  >
                    <Phone size={11} />
                    <span>Call</span>
                  </a>
                )}
                {hasEmail && (
                  <a
                    href={`mailto:${place.contact.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                               bg-violet-500/20 hover:bg-violet-500/30
                               text-violet-400 hover:text-violet-300
                               border border-violet-500/30 hover:border-violet-500/50
                               transition-all duration-200 no-underline"
                  >
                    <MessageSquare size={11} />
                    <span>Email</span>
                  </a>
                )}
              </span>
            )}

            {/* Hours inline if available */}
            {hours && (
              <span className="ml-2 text-xs text-zinc-400 italic">
                {typeof hours === 'string' ? hours : `${hours.open} - ${hours.close}`}
              </span>
            )}
          </span>
        );

      case 'text':
      default:
        return <span key={key}>{part.content}</span>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
          isUser ? 'bg-teal-500' : 'bg-gradient-to-br from-cyan-400 to-teal-500'
        }`}
      >
        {isUser ? <User size={16} className="text-white" /> : <Sparkles size={16} className="text-white" />}
      </motion.div>

      {/* Message content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`inline-block rounded-2xl px-4 py-3 shadow-md ${
            isUser
              ? 'bg-teal-600 text-white rounded-tr-md'
              : 'bg-zinc-800/80 text-zinc-100 rounded-tl-md border border-white/5'
          }`}
        >
          {/* Message text with enhanced formatting - ChatGPT-style phases */}
          <div className="text-sm leading-relaxed">
            {isUser ? (
              <span>{message.content}</span>
            ) : phase === 'streaming' ? (
              <>
                {/* Phase 1: Streaming - show raw text exactly as it arrives (like ChatGPT) */}
                <span className="whitespace-pre-wrap">{streamedContent}</span>
                {/* Blinking cursor */}
                <span
                  className="inline-block w-0.5 h-4 ml-0.5 align-middle rounded-full animate-pulse"
                  style={{
                    background: 'linear-gradient(180deg, #22d3ee 0%, #06b6d4 100%)',
                    boxShadow: '0 0 8px rgba(34, 211, 238, 0.5)'
                  }}
                />
              </>
            ) : phase === 'transitioning' ? (
              <>
                {/* Phase 2: Transitioning - show full raw text, fade out cursor */}
                <span className="whitespace-pre-wrap">{streamedContent}</span>
                <span
                  className="inline-block w-0.5 h-4 ml-0.5 align-middle rounded-full opacity-0 transition-opacity duration-150"
                  style={{
                    background: 'linear-gradient(180deg, #22d3ee 0%, #06b6d4 100%)'
                  }}
                />
              </>
            ) : (
              // Phase 3: Complete - show fully formatted content with smooth fade-in
              <motion.div
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {renderParsedContent()}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Timestamp */}
        <div className={`text-xs text-zinc-500 mt-1.5 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* Relevant Place Cards - Only show when complete (like ChatGPT) */}
        {!isUser && phase === 'complete' && relevantPlaces.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="mt-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
              <span className="text-xs text-cyan-400 font-medium flex items-center gap-1.5">
                <MapPin size={12} />
                Recommended for you
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            </div>
            <div className="grid grid-cols-1 gap-3">
              {relevantPlaces.map((place, index) => place && (
                <motion.div
                  key={place.id || `place-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 * index }}
                >
                  <PlaceCardComponent
                    place={place}
                    onSelect={onPlaceSelect}
                    onShowOnMap={onShowOnMap}
                    onAskAbout={onAskAbout}
                    compact={relevantPlaces.length > 2}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Discover Also Section - Only show when complete */}
        {!isUser && phase === 'complete' && discoverAlsoPlaces.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="mt-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
              <span className="text-xs text-purple-400 font-medium flex items-center gap-1.5">
                <Sparkles size={12} />
                Discover also
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {discoverAlsoPlaces.map((place, index) => place && (
                <motion.button
                  key={place.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={() => {
                    onShowOnMap?.(place);  // Show on map when clicking discover suggestions
                    onPlaceSelect?.(place);
                  }}
                  className="flex-shrink-0 group bg-zinc-800/60 hover:bg-zinc-700/80 border border-white/5
                             hover:border-purple-500/30 rounded-xl p-2 transition-all duration-200"
                  style={{ width: '140px' }}
                >
                  {place.media?.thumbnail && (
                    <div className="w-full h-16 rounded-lg overflow-hidden mb-2">
                      <img
                        src={place.media.thumbnail}
                        alt={place.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <p className="text-xs text-white font-medium truncate">{place.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={10} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-xs text-zinc-400">{place.ratings?.overall?.toFixed(1)}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Suggested actions */}
        {phase === 'complete' && message.suggestedActions && message.suggestedActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-2 mt-3"
          >
            {message.suggestedActions.map((action) => (
              <motion.button
                key={action.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs text-zinc-300
                           hover:text-white transition-all duration-200 flex items-center gap-1.5
                           border border-white/5 hover:border-white/10"
              >
                {action.type === 'book' && <Calendar size={12} />}
                {action.type === 'directions' && <Navigation size={12} />}
                {action.type === 'website' && <Globe size={12} />}
                {action.type === 'call' && <Phone size={12} />}
                {action.type === 'save' && <Bookmark size={12} />}
                {action.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// ============ CHAT INPUT COMPONENT ============

const ChatInput: React.FC<{
  onSend: (message: string, attachments?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
}> = ({ onSend, isLoading = false, placeholder = "Find your island vibe" }) => {
  const { config } = useIsland();
  const [message, setMessage] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative">
      {/* Attach menu */}
      <AnimatePresence>
        {showAttachMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 mb-2 p-2 rounded-xl bg-zinc-800 border border-white/10 shadow-xl"
          >
            <div className="space-y-1">
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/5 text-left transition-all">
                <Upload size={18} className="text-cyan-400" />
                <div>
                  <div className="text-sm font-medium text-white">Upload a file</div>
                  <div className="text-xs text-zinc-500">Start your journey with a photo or PDF</div>
                </div>
              </button>
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/5 text-left transition-all">
                <LinkIcon size={18} className="text-cyan-400" />
                <div>
                  <div className="text-sm font-medium text-white">Add a link</div>
                  <div className="text-xs text-zinc-500">Convert social posts into trip plans</div>
                </div>
              </button>
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/5 text-left transition-all">
                <FileText size={18} className="text-cyan-400" />
                <div>
                  <div className="text-sm font-medium text-white">Add a receipt</div>
                  <div className="text-xs text-zinc-500">Upload confirmation to get started</div>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input container */}
      <div className="flex items-end gap-2 p-3 rounded-2xl bg-zinc-800/80 border border-white/10 focus-within:border-cyan-500/50 transition-all">
        {/* Attach button */}
        <button
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          className={`p-2 rounded-xl transition-all ${
            showAttachMenu ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Plus size={20} />
        </button>

        {/* Text input */}
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent text-white placeholder-zinc-500 resize-none outline-none text-sm py-2 max-h-32"
          style={{ minHeight: '24px' }}
        />

        {/* Voice input button */}
        <button
          onClick={() => setIsRecording(!isRecording)}
          className={`p-2 rounded-xl transition-all ${
            isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Mic size={20} />
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          className={`p-2 rounded-xl transition-all ${
            message.trim() && !isLoading
              ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:opacity-90'
              : 'text-zinc-600 cursor-not-allowed'
          }`}
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-zinc-500">
        <Info size={10} />
        <span>{CAYMAN_CONFIG.branding.disclaimerText}</span>
      </div>
    </div>
  );
};

// ============ WELCOME MESSAGE ============

const WelcomeMessage: React.FC<{
  onPromptSelect: (prompt: string) => void;
}> = ({ onPromptSelect }) => {
  const { config } = useIsland();
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg"
      >
        <h1 className="text-3xl font-bold text-white mb-4">
          {CAYMAN_CONFIG.welcomeMessage.title}
        </h1>
        <p className="text-zinc-400 mb-8 flex items-start gap-2">
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles size={14} className="text-white" />
          </span>
          <span className="text-left">{CAYMAN_CONFIG.welcomeMessage.subtitle}</span>
        </p>

        {/* Suggested prompts */}
        <div className="flex flex-wrap justify-center gap-2">
          {CAYMAN_CONFIG.welcomeMessage.suggestedPrompts.slice(0, 4).map((prompt, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onPromptSelect(prompt)}
              className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-sm text-zinc-300 hover:text-white transition-all border border-white/5 hover:border-white/10"
            >
              {prompt}
            </motion.button>
          ))}
        </div>

        {/* Quick action */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 mx-auto"
        >
          <span>Help me get started?</span>
          <ChevronRight size={14} />
        </motion.button>
      </motion.div>
    </div>
  );
};

// ============ TRIPS VIEW ============

const TripsView: React.FC<{
  trips: Trip[];
  onCreateTrip: () => void;
}> = ({ trips, onCreateTrip }) => {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Your trips</h2>
        <button
          onClick={onCreateTrip}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-sm text-white transition-all border border-white/10"
        >
          <Plus size={16} />
          <span>New trip</span>
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input type="checkbox" className="rounded bg-zinc-800 border-white/10" />
          <span>Booked only</span>
        </label>
        <select className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white">
          <option>All</option>
          <option>Upcoming</option>
          <option>Past</option>
        </select>
      </div>

      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400/20 to-teal-500/20 flex items-center justify-center mb-6">
            <Briefcase size={40} className="text-cyan-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No trips yet? No problem.</h3>
          <p className="text-zinc-400 text-center max-w-sm mb-6">
            Create one now — access your plans from here anytime.
          </p>
          <button
            onClick={onCreateTrip}
            className="px-6 py-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-all"
          >
            Create a trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="p-4 rounded-xl bg-zinc-800/50 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
            >
              <h3 className="font-semibold text-white">{trip.title}</h3>
              <p className="text-sm text-zinc-400">{trip.destination.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============ COLLECTIONS VIEW ============

const CollectionsView: React.FC<{
  collections: Collection[];
  onCreateCollection: () => void;
}> = ({ collections, onCreateCollection }) => {
  const [activeTab, setActiveTab] = useState<'collections' | 'places' | 'guides'>('collections');

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Your collections</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mb-6 border-b border-white/5">
        {(['collections', 'places', 'guides'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition-all relative ${
              activeTab === tab ? 'text-white' : 'text-zinc-500 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-2 text-zinc-500">0</span>
            {activeTab === tab && (
              <motion.div
                layoutId="collectionsTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
              />
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400/20 to-teal-500/20 flex items-center justify-center mb-6">
          <Heart size={40} className="text-cyan-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No collections yet? Let's fix that.</h3>
        <p className="text-zinc-400 text-center max-w-sm mb-6">
          Save travel inspo to a themed collection so it's easy to find when it's time to plan.
        </p>
        <button
          onClick={onCreateCollection}
          className="px-6 py-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-all"
        >
          Create a collection
        </button>
      </div>
    </div>
  );
};

// ============ INSPIRATION VIEW ============

const InspirationView: React.FC<{
  guides: Guide[];
  onGuideSelect: (guide: Guide) => void;
}> = ({ guides, onGuideSelect }) => {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Inspiration</h2>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search for location or username"
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-800/50 border border-white/5 text-white placeholder-zinc-500 outline-none focus:border-cyan-500/50 transition-all"
        />
      </div>

      {/* Featured guides */}
      <h3 className="text-lg font-semibold text-white mb-4">Featured guides</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {guides.filter(g => g.isFeature).map((guide) => (
          <motion.div
            key={guide.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden bg-zinc-800/50 border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
            onClick={() => onGuideSelect(guide)}
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={guide.thumbnail}
                alt={guide.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Badge */}
              <div className="absolute top-3 left-3">
                <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs text-white">
                  {guide.placesCount} places
                </span>
              </div>

              {/* Actions */}
              <div className="absolute top-3 right-3 flex gap-1">
                <button className="p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all">
                  <Heart size={16} />
                </button>
                <button className="p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all">
                  <Plus size={16} />
                </button>
              </div>

              {/* Carousel dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
            </div>

            <div className="p-4">
              <h4 className="font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                {guide.title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <MapPin size={12} />
                <span>{guide.destination}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 rounded-full bg-pink-500" />
                <span className="text-xs text-zinc-500">{guide.destination.toLowerCase()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ============ MAIN CHATBOT PANEL ============

const ChatbotPanel: React.FC<ChatbotPanelProps> = ({ isOpen, onClose, onPlaceSelect }) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('chat');
  const [chatView, setChatView] = useState<ChatView>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [filters, setFilters] = useState<ChatFilters>({ destination: 'Cayman Islands', travelers: 2 });
  const [trips, setTrips] = useState<Trip[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showMap, setShowMap] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<KnowledgeNode | null>(null);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeNode[]>([]);
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Intelligent context-aware map hook
  const {
    markers: mapMarkers,
    highlightedMarkerIds,
    markerStates,
    focusPoint,
    updateContextFromMessage,
    highlightPlace,
    highlightPlaces,
    clearHighlights,
    smoothZoomToPlace,
    smoothZoomToPlaces,
    addTemporaryMarker,
    isLoading: isMapLoading,
    isEmbeddingsReady
  } = useContextualMap({
    knowledgeBase,
    enabled: !isKnowledgeLoading,
    maxMarkers: 35,
    maxHighlighted: 8
  });

  // Load knowledge base on mount
  useEffect(() => {
    loadKnowledgeBase()
      .then(data => {
        setKnowledgeBase(data);
        setIsKnowledgeLoading(false);
        console.log(`📚 Knowledge base ready: ${data.length} places`);
      })
      .catch(err => {
        console.error('Failed to load knowledge base:', err);
        setIsKnowledgeLoading(false);
      });
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle tab changes
  useEffect(() => {
    if (activeTab === 'chat') setChatView('chat');
    else if (activeTab === 'trips') setChatView('trips');
    else if (activeTab === 'collections') setChatView('collections');
    else if (activeTab === 'inspiration') setChatView('inspiration');
  }, [activeTab]);

  // Note: Initial map markers are now handled by useContextualMap hook
  // The hook intelligently selects relevant points based on conversation context

  // Process message using RAG service with streaming
  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      chatId: 'current',
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    // Generate a unique ID for the assistant message
    const assistantMessageId = `msg-${Date.now() + 1}`;

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Big Data: Log user message for wealth intelligence analytics
    logMessage(userMessage);

    // Create initial streaming message (empty content, will be updated)
    const streamingMessage: ChatMessage = {
      id: assistantMessageId,
      chatId: 'current',
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true
    };

    // Add the streaming message placeholder
    setMessages(prev => [...prev, streamingMessage]);

    // Use streaming RAG service with batched updates for smooth rendering
    let lastUpdateTime = 0;
    let pendingContent = '';
    const UPDATE_INTERVAL = 50; // Update UI every 50ms max for smooth animation

    await processQueryWithStreaming(content, messages, {
      onChunk: (chunkContent: string) => {
        pendingContent = chunkContent;
        const now = Date.now();

        // Batch updates to reduce re-renders and make streaming smoother
        if (now - lastUpdateTime >= UPDATE_INTERVAL) {
          lastUpdateTime = now;
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: pendingContent }
              : msg
          ));
        }
      },
      onComplete: async (ragResponse: RAGResponse) => {
        // Small delay to ensure smooth transition from streaming to complete
        requestAnimationFrame(() => {
          // Finalize the message with full content and metadata
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: ragResponse.content,
                  places: ragResponse.places,
                  mapMarkers: ragResponse.mapMarkers,
                  suggestedActions: ragResponse.suggestedActions,
                  isStreaming: false
                }
              : msg
          ));
        });

        // Update map context with the conversation - this intelligently selects relevant points
        const mentionedPlaceIds = ragResponse.sourceNodeIds || [];
        const categories = ragResponse.detectedCategories || [];

        // Update the intelligent map context
        await updateContextFromMessage(
          content,
          ragResponse.content,
          mentionedPlaceIds,
          categories as KnowledgeCategory[]
        );

        // Highlight the specific places mentioned in the response
        if (ragResponse.mapMarkers.length > 0) {
          const relevantNodeIds = ragResponse.mapMarkers.map(m => m.nodeId).filter(Boolean) as string[];
          highlightPlaces(relevantNodeIds);
        }

        setIsLoading(false);

        // Big Data: Log assistant response for wealth intelligence analytics
        const assistantMessage: ChatMessage = {
          id: assistantMessageId,
          chatId: 'current',
          role: 'assistant',
          content: ragResponse.content,
          timestamp: new Date().toISOString()
        };
        logMessage(assistantMessage);
      },
      onError: (error: Error) => {
        console.error('Error processing message:', error);

        // Update the streaming message with error content
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `I apologize, but I encountered an issue processing your request. Please try again, or feel free to ask me about:

- **Beaches** - Seven Mile Beach, Starfish Point, and more
- **Hotels** - From The Ritz-Carlton to private villas
- **Restaurants** - Fine dining to beach bars
- **Activities** - Stingray City, diving, and adventures

How can I help you explore the Cayman Islands?`,
                isStreaming: false
              }
            : msg
        ));
        setIsLoading(false);
      }
    });
  };

  const handlePlaceSelectInternal = useCallback((place: KnowledgeNode) => {
    // Call parent handler if provided
    onPlaceSelect?.(place);

    // Set the selected place to display the place card
    setSelectedPlace(place);

    // Use smooth zoom for a premium map experience
    smoothZoomToPlace(place, {
      animate: true,
      highlightDuration: 8000
    });
  }, [onPlaceSelect, smoothZoomToPlace]);

  // ============ SHOW ON MAP HANDLER - Hyper-Fluid Map Integration ============
  const handleShowOnMap = useCallback((place: KnowledgeNode) => {
    // Show map if hidden (with slight delay to allow animation)
    if (!showMap) {
      setShowMap(true);
      // Small delay to let map render before zooming
      setTimeout(() => {
        smoothZoomToPlace(place, {
          animate: true,
          highlightDuration: 10000,
          pulseEffect: true
        });
      }, 100);
    } else {
      // Map is visible, zoom immediately with smooth animation
      smoothZoomToPlace(place, {
        animate: true,
        highlightDuration: 10000,
        pulseEffect: true
      });
    }

    console.log(`🗺️ Zooming to: ${place.name}`);
  }, [showMap, smoothZoomToPlace]);

  // ============ ASK ABOUT HANDLER - AI Integration ============
  const handleAskAbout = useCallback((place: KnowledgeNode) => {
    // Generate a natural question about the place
    const category = place.category || 'place';
    const categoryQuestions: Record<string, string[]> = {
      restaurant: [
        `What's special about ${place.name}?`,
        `Tell me about the menu and atmosphere at ${place.name}`,
        `What should I try at ${place.name}?`
      ],
      hotel: [
        `What makes ${place.name} special?`,
        `Tell me about the amenities at ${place.name}`,
        `What's the experience like at ${place.name}?`
      ],
      beach: [
        `Tell me about ${place.name}`,
        `What activities can I do at ${place.name}?`,
        `What makes ${place.name} special?`
      ],
      diving_snorkeling: [
        `What's the diving like at ${place.name}?`,
        `Tell me about the marine life at ${place.name}`,
        `What should I know before visiting ${place.name}?`
      ],
      activity: [
        `Tell me more about ${place.name}`,
        `What can I expect at ${place.name}?`,
        `What makes ${place.name} a great experience?`
      ],
      attraction: [
        `What should I know about ${place.name}?`,
        `Tell me the story behind ${place.name}`,
        `What makes ${place.name} worth visiting?`
      ],
      bar: [
        `What's the vibe at ${place.name}?`,
        `Tell me about ${place.name}'s signature drinks`,
        `What makes ${place.name} special for nightlife?`
      ],
      spa_wellness: [
        `What treatments are available at ${place.name}?`,
        `Tell me about the wellness experience at ${place.name}`,
        `What makes ${place.name} a great spa?`
      ],
      default: [
        `Tell me more about ${place.name}`,
        `What makes ${place.name} special?`,
        `What should I know about ${place.name}?`
      ]
    };

    // Pick a random question from the category
    const questions = categoryQuestions[category] || categoryQuestions.default;
    const question = questions[Math.floor(Math.random() * questions.length)];

    // Send the question to the AI
    handleSendMessage(question);

    // Also highlight on map if coordinates exist
    const lat = place.location?.coordinates?.lat ?? place.location?.latitude;
    const lng = place.location?.coordinates?.lng ?? place.location?.longitude;
    if (lat !== undefined && lng !== undefined) {
      const existingMarker = mapMarkers.find(m => m.nodeId === place.id);
      if (existingMarker) {
        highlightPlace(existingMarker.id);
        setTimeout(() => clearHighlights(), 6000);
      }
    }
  }, [handleSendMessage, mapMarkers, highlightPlace, clearHighlights]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 flex bg-zinc-950"
    >
      {/* Sidebar */}
      <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            {chatView === 'chat' && messages.length > 0 && (
              <h2 className="text-sm font-medium text-white">New chat</h2>
            )}
          </div>
          <button
            onClick={() => setShowAnalytics(true)}
            className="p-2 rounded-lg hover:bg-purple-500/20 text-zinc-400 hover:text-purple-400 transition-all"
            title="Wealth Analytics Dashboard"
          >
            <TrendingUp size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Enhanced Analytics Dashboard (7 tabs) */}
        <EnhancedAnalyticsDashboard
          isOpen={showAnalytics}
          onClose={() => setShowAnalytics(false)}
        />

        {/* Filters bar (only for chat) */}
        {chatView === 'chat' && <ChatFiltersBar filters={filters} onFiltersChange={setFilters} />}

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat/Content area */}
          <div className="flex-1 flex flex-col min-w-0">
            {chatView === 'chat' && (
              <>
                {messages.length === 0 ? (
                  <WelcomeMessage onPromptSelect={handleSendMessage} />
                ) : (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((message) => (
                      <ChatMessageComponent
                        key={message.id}
                        message={message}
                        onPlaceSelect={handlePlaceSelectInternal}
                        onShowOnMap={handleShowOnMap}
                        onAskAbout={handleAskAbout}
                      />
                    ))}
                    {isLoading && !messages.some(m => m.isStreaming) && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
                          <Sparkles size={16} className="text-white" />
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
                {/* Input */}
                <div className="p-4 border-t border-white/5">
                  <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
                </div>
              </>
            )}
            {chatView === 'trips' && (
              <TripsView trips={trips} onCreateTrip={() => {}} />
            )}
            {chatView === 'collections' && (
              <CollectionsView collections={collections} onCreateCollection={() => {}} />
            )}
            {chatView === 'inspiration' && (
              <InspirationView guides={CAYMAN_GUIDES} onGuideSelect={() => {}} />
            )}
          </div>

          {/* Map panel (only for chat view) */}
          {chatView === 'chat' && showMap && (
            <div className="w-[45%] border-l border-white/5 bg-zinc-900 relative">
              {/* Map toggle button */}
              <div className="absolute top-4 left-4 z-20">
                <button
                  onClick={() => setShowMap(false)}
                  className="p-2 rounded-lg bg-zinc-800/90 backdrop-blur-sm border border-white/10 text-white hover:bg-zinc-700 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
              </div>

              {/* Interactive Map - Intelligent Context-Aware */}
              <InteractiveMap
                markers={mapMarkers}
                selectedMarkerId={mapMarkers.find(m => m.isActive)?.id}
                highlightedMarkerIds={highlightedMarkerIds}
                markerStates={markerStates}
                focusPoint={focusPoint}
                onMarkerSelect={(markerId) => {
                  // Just highlight the marker - the map card handles the display
                  highlightPlace(markerId);
                }}
                onAskAI={(marker) => {
                  // Convert marker to KnowledgeNode and ask AI about it
                  let place: KnowledgeNode | undefined = knowledgeBase.find(n => n.id === marker.nodeId);

                  if (!place && marker.nodeId?.startsWith('marker-')) {
                    const cleanId = marker.nodeId.replace('marker-', '');
                    place = knowledgeBase.find(n => n.id === cleanId);
                  }

                  // Create synthetic node if not found
                  if (!place) {
                    place = {
                      id: marker.nodeId || marker.id,
                      name: marker.title,
                      category: marker.category as any,
                      description: marker.subtitle || '',
                      shortDescription: marker.subtitle || '',
                      location: {
                        coordinates: { lat: marker.latitude, lng: marker.longitude },
                        address: marker.address,
                        district: '',
                        island: 'Grand Cayman'
                      },
                      contact: { phone: marker.phone, website: marker.website },
                      media: { thumbnail: marker.thumbnail },
                      business: { priceRange: marker.priceRange },
                      ratings: { overall: marker.rating || 0, reviewCount: marker.reviewCount || 0 },
                      tags: [],
                      keywords: [],
                      embeddingText: marker.title,
                      isActive: true,
                      isPremium: false,
                      isFeatured: false,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      createdBy: 'system'
                    } as KnowledgeNode;
                  }

                  handleAskAbout(place);
                }}
                className="w-full h-full"
                showFilters={true}
                showSearch={true}
                autoFitOnChange={true}
              />


            </div>
          )}

          {/* Map toggle button when hidden */}
          {chatView === 'chat' && !showMap && (
            <button
              onClick={() => setShowMap(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-zinc-800 border border-white/10 text-white hover:bg-zinc-700 transition-all"
            >
              <MapIcon size={20} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatbotPanel;
