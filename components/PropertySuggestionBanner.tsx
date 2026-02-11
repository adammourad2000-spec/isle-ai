/**
 * PropertySuggestionBanner Component
 * Stealth marketing banner for property suggestions in chatbot
 * Appears naturally in conversation flow
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  X,
  ChevronRight,
  Sparkles,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Star,
  DollarSign,
} from 'lucide-react';
import { PropertyRecommendation } from '../types/property';
import { PropertyCard } from './PropertyCard';

interface PropertySuggestionBannerProps {
  recommendation: PropertyRecommendation;
  onInterested: (interested: boolean) => void;
  onDismiss: () => void;
  compact?: boolean;
}

export const PropertySuggestionBanner: React.FC<PropertySuggestionBannerProps> = ({
  recommendation,
  onInterested,
  onDismiss,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { property, reason, matchedCriteria } = recommendation;

  const handleDismiss = () => {
    setDismissed(true);
    setTimeout(() => onDismiss(), 300);
  };

  const formatPrice = (price: number) => {
    if (property.status === 'for-rent') {
      return `$${price.toLocaleString()}/night`;
    }
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(2)}M`;
    }
    return `$${price.toLocaleString()}`;
  };

  if (dismissed) return null;

  if (expanded) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="my-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-purple-400">
              <Sparkles size={16} />
              <span className="font-semibold">Personalized Property Recommendation</span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <PropertyCard
            property={property}
            reason={reason}
            matchedCriteria={matchedCriteria}
            onInterested={onInterested}
            compact={true}
            showMap={false}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="my-4 relative"
    >
      {/* Subtle Intro Message */}
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
        <Home size={14} className="text-purple-400" />
        <span className="italic">Based on your interests, you might like...</span>
      </div>

      {/* Compact Property Card */}
      <div
        className="bg-gradient-to-br from-purple-900/20 via-indigo-900/20 to-blue-900/20 backdrop-blur-sm rounded-2xl border border-purple-500/20 overflow-hidden cursor-pointer group hover:border-purple-500/40 transition-all duration-300"
        onClick={() => setExpanded(true)}
      >
        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
        >
          <X size={16} />
        </button>

        <div className="flex gap-4 p-4">
          {/* Image */}
          <div className="relative w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden">
            <img
              src={property.media.mainImage}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            {property.category === 'luxury' && (
              <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-400 to-yellow-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <Star size={10} fill="currentColor" />
                LUX
              </div>
            )}
            {property.features.beachfront && (
              <div className="absolute bottom-2 left-2 bg-blue-500/90 text-white text-xs font-semibold px-2 py-1 rounded-full">
                🏖️ Beach
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-bold text-base line-clamp-2 mb-2 group-hover:text-purple-300 transition-colors">
              {property.title}
            </h4>

            <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
              <MapPin size={12} className="flex-shrink-0" />
              <span className="truncate">{property.location.district}</span>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-300 mb-3">
              <span className="flex items-center gap-1">
                <Bed size={12} /> {property.features.bedrooms}
              </span>
              <span className="flex items-center gap-1">
                <Bath size={12} /> {property.features.bathrooms}
              </span>
              <span className="flex items-center gap-1">
                <Maximize2 size={12} /> {property.features.squareFeet}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-purple-400 font-bold text-lg">
                <DollarSign size={16} />
                {formatPrice(property.financials.price)}
              </div>
              <motion.div
                className="flex items-center gap-1 text-purple-400 text-sm font-semibold"
                whileHover={{ x: 5 }}
              >
                View Details
                <ChevronRight size={16} />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Recommendation Reason */}
        {reason && (
          <div className="px-4 pb-3">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2">
              <p className="text-purple-300 text-xs">
                <span className="font-semibold">Perfect for you:</span> {reason}
              </p>
            </div>
          </div>
        )}

        {/* Matched Criteria Tags */}
        {matchedCriteria && matchedCriteria.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {matchedCriteria.slice(0, 3).map((criteria, idx) => (
                <span
                  key={idx}
                  className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full text-xs font-medium"
                >
                  ✓ {criteria}
                </span>
              ))}
              {matchedCriteria.length > 3 && (
                <span className="text-gray-400 text-xs px-2 py-0.5">
                  +{matchedCriteria.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Hover Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* Subtle CTA */}
      <div className="mt-2 text-center">
        <span className="text-xs text-gray-500 italic">
          Tap to view full details or dismiss →
        </span>
      </div>
    </motion.div>
  );
};
