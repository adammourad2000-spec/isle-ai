/**
 * PropertyCard Component
 * World-class property display with interactive map
 * Inspired by Airbnb, Zillow, and Google Travel UI/UX
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Heart,
  X,
  ExternalLink,
  Star,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Home,
  Waves,
  Sun,
  Car,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Property, UserPropertyInterest } from '../types/property';

interface PropertyCardProps {
  property: Property;
  reason?: string;
  matchedCriteria?: string[];
  onInterested: (interested: boolean) => void;
  compact?: boolean;
  showMap?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  reason,
  matchedCriteria,
  onInterested,
  compact = false,
  showMap = true,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [userChoice, setUserChoice] = useState<boolean | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);

  const formatPrice = (price: number, status: string) => {
    if (status === 'for-rent') {
      return `$${price.toLocaleString()}/night`;
    }
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(2)}M`;
    }
    return `$${price.toLocaleString()}`;
  };

  const handleInterest = (interested: boolean) => {
    setUserChoice(interested);
    onInterested(interested);

    if (interested) {
      setTimeout(() => setShowContactForm(true), 500);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === property.media.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? property.media.images.length - 1 : prev - 1
    );
  };

  const getCategoryBadgeColor = () => {
    switch (property.category) {
      case 'luxury':
        return 'from-amber-400 to-yellow-600';
      case 'mid-level':
        return 'from-cyan-400 to-blue-500';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl rounded-2xl border border-cyan-500/20 overflow-hidden"
      >
        <div className="flex gap-4 p-4">
          {/* Compact Image */}
          <div className="relative w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden group cursor-pointer">
            <img
              src={property.media.mainImage}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onClick={() => setShowFullscreen(true)}
            />
            {property.category === 'luxury' && (
              <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                ★ LUXURY
              </div>
            )}
          </div>

          {/* Compact Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-semibold text-sm line-clamp-2 mb-1">
              {property.title}
            </h4>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
              <MapPin size={12} />
              <span className="truncate">{property.location.district}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-300 mb-2">
              <span className="flex items-center gap-1">
                <Bed size={12} /> {property.features.bedrooms}
              </span>
              <span className="flex items-center gap-1">
                <Bath size={12} /> {property.features.bathrooms}
              </span>
              <span className="flex items-center gap-1">
                <Maximize2 size={12} /> {property.features.squareFeet} sqft
              </span>
            </div>
            <div className="text-cyan-400 font-bold text-lg">
              {formatPrice(property.financials.price, property.status)}
            </div>
          </div>
        </div>

        {/* Interest Buttons */}
        {userChoice === null && (
          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={() => handleInterest(true)}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-2 px-4 rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
            >
              I'm Interested
            </button>
            <button
              onClick={() => handleInterest(false)}
              className="flex-1 bg-slate-700/50 text-gray-300 py-2 px-4 rounded-lg font-semibold text-sm hover:bg-slate-700 transition-all duration-300"
            >
              Not Now
            </button>
          </div>
        )}

        {userChoice !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-4 pb-4"
          >
            <div
              className={`p-3 rounded-lg text-sm ${
                userChoice
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-gray-700/30 text-gray-400 border border-gray-600/30'
              }`}
            >
              {userChoice
                ? '✓ Great choice! An agent will contact you soon.'
                : 'No problem! We have many other properties to explore.'}
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-2xl rounded-3xl border border-cyan-500/30 overflow-hidden shadow-2xl shadow-cyan-500/10"
      >
        {/* Image Carousel */}
        <div className="relative h-96 overflow-hidden group">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex}
              src={property.media.images[currentImageIndex]}
              alt={property.title}
              className="w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </AnimatePresence>

          {/* Image Navigation */}
          {property.media.images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
              >
                <ChevronRight size={24} />
              </button>

              {/* Image Indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {property.media.images.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentImageIndex
                        ? 'w-8 bg-white'
                        : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Category Badge */}
          <div
            className={`absolute top-4 left-4 bg-gradient-to-r ${getCategoryBadgeColor()} text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2`}
          >
            {property.category === 'luxury' && <Star size={16} fill="currentColor" />}
            {property.category.toUpperCase()}
          </div>

          {/* Feature Badges */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {property.features.beachfront && (
              <div className="bg-blue-500/90 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <Waves size={12} /> Beachfront
              </div>
            )}
            {property.features.oceanView && (
              <div className="bg-cyan-500/90 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <Sun size={12} /> Ocean View
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={() => setShowFullscreen(true)}
            className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <Maximize2 size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Title & Price */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2">{property.title}</h3>
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <MapPin size={16} />
                <span>{property.location.address}</span>
              </div>
              {matchedCriteria && matchedCriteria.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {matchedCriteria.map((criteria, idx) => (
                    <span
                      key={idx}
                      className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-xs font-medium"
                    >
                      ✓ {criteria}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {formatPrice(property.financials.price, property.status)}
              </div>
              {property.financials.pricePerSqFt && (
                <div className="text-sm text-gray-400">
                  ${property.financials.pricePerSqFt}/sqft
                </div>
              )}
            </div>
          </div>

          {/* Recommendation Reason */}
          {reason && (
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4 mb-4">
              <p className="text-purple-300 text-sm">
                <span className="font-semibold">Why we recommend this:</span> {reason}
              </p>
            </div>
          )}

          {/* Features Grid */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <Bed size={24} className="mx-auto mb-2 text-cyan-400" />
              <div className="text-2xl font-bold text-white">{property.features.bedrooms}</div>
              <div className="text-xs text-gray-400">Bedrooms</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <Bath size={24} className="mx-auto mb-2 text-cyan-400" />
              <div className="text-2xl font-bold text-white">{property.features.bathrooms}</div>
              <div className="text-xs text-gray-400">Bathrooms</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <Maximize2 size={24} className="mx-auto mb-2 text-cyan-400" />
              <div className="text-2xl font-bold text-white">
                {property.features.squareFeet.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">Sq Ft</div>
            </div>
            {property.features.parking && (
              <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                <Car size={24} className="mx-auto mb-2 text-cyan-400" />
                <div className="text-2xl font-bold text-white">{property.features.parking}</div>
                <div className="text-xs text-gray-400">Parking</div>
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-gray-300 mb-6 leading-relaxed">{property.description}</p>

          {/* Amenities */}
          {property.features.amenities.length > 0 && (
            <div className="mb-6">
              <h4 className="text-white font-semibold mb-3">Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {property.features.amenities.map((amenity, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-700/50 text-gray-300 px-3 py-1.5 rounded-lg text-sm"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Map Preview */}
          {showMap && (
            <div className="mb-6 rounded-xl overflow-hidden h-48 bg-slate-800/50">
              <iframe
                src={`https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${property.location.coordinates.lat},${property.location.coordinates.lng}&zoom=15`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Map of ${property.title}`}
              />
            </div>
          )}

          {/* Agent Info */}
          {property.agent && (
            <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
              <h4 className="text-white font-semibold mb-3">Listed by</h4>
              <div className="flex items-center gap-4">
                {property.agent.photo && (
                  <img
                    src={property.agent.photo}
                    alt={property.agent.name}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <div className="text-white font-medium">{property.agent.name}</div>
                  <div className="text-sm text-gray-400">{property.agent.company}</div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`tel:${property.agent.phone}`}
                    className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 p-2 rounded-lg transition-colors"
                  >
                    <Phone size={18} />
                  </a>
                  <a
                    href={`mailto:${property.agent.email}`}
                    className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 p-2 rounded-lg transition-colors"
                  >
                    <Mail size={18} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {userChoice === null ? (
            <div className="flex gap-4">
              <button
                onClick={() => handleInterest(true)}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Heart size={20} />
                I'm Interested
              </button>
              <button
                onClick={() => handleInterest(false)}
                className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-gray-300 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300"
              >
                Not Now
              </button>
              <a
                href={property.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-700/50 hover:bg-slate-700 text-gray-300 p-4 rounded-xl transition-all duration-300"
              >
                <ExternalLink size={24} />
              </a>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 rounded-xl border ${
                userChoice
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-gray-700/20 border-gray-600/30 text-gray-400'
              }`}
            >
              {userChoice ? (
                <div>
                  <div className="text-xl font-bold mb-2">Excellent choice! 🎉</div>
                  <p className="mb-4">
                    Our team will reach out to you shortly with more details about this property.
                  </p>
                  <div className="text-sm">
                    Property ID: <span className="font-mono">{property.id}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-bold mb-2">No problem!</div>
                  <p>We have many more amazing properties for you to explore.</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Fullscreen Gallery Modal */}
      <AnimatePresence>
        {showFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setShowFullscreen(false)}
          >
            <button
              onClick={() => setShowFullscreen(false)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors z-10"
            >
              <X size={24} />
            </button>
            <img
              src={property.media.images[currentImageIndex]}
              alt={property.title}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
