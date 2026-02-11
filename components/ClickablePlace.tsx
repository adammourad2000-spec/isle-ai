/**
 * ============================================
 * CLICKABLE PLACE COMPONENT
 * ============================================
 *
 * Makes place names in AI responses interactive.
 * When clicked, triggers a smooth zoom on the map.
 *
 * Features:
 * - Fuzzy matching for place names
 * - Hover preview
 * - Smooth click animation
 * - Map zoom trigger
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Star, ExternalLink, Navigation } from 'lucide-react';
import type { KnowledgeNode } from '../types/chatbot';
import { getKnowledgeBase } from '../data/island-knowledge';

// ============ TYPES ============

interface ClickablePlaceProps {
  place: KnowledgeNode;
  onClick: (place: KnowledgeNode) => void;
  onHover?: (place: KnowledgeNode | null) => void;
  variant?: 'inline' | 'chip' | 'card';
  showRating?: boolean;
  showLocation?: boolean;
}

interface PlaceMatch {
  node: KnowledgeNode;
  matchStart: number;
  matchEnd: number;
  matchType: 'exact' | 'partial' | 'fuzzy';
  confidence: number;
}

interface ParsedContent {
  type: 'text' | 'place';
  content: string;
  place?: KnowledgeNode;
}

// ============ FUZZY MATCHING ============

/**
 * Build a lookup map for faster place matching
 */
let placeNameCache: Map<string, KnowledgeNode> | null = null;
let placeAliasCache: Map<string, KnowledgeNode> | null = null;

function buildPlaceCache(): void {
  if (placeNameCache) return;

  placeNameCache = new Map();
  placeAliasCache = new Map();

  const kb = getKnowledgeBase();

  for (const node of kb) {
    // Exact name (lowercase)
    const nameLower = node.name.toLowerCase();
    placeNameCache.set(nameLower, node);

    // Generate aliases
    const aliases = generateAliases(node.name);
    for (const alias of aliases) {
      if (!placeAliasCache.has(alias)) {
        placeAliasCache.set(alias, node);
      }
    }
  }
}

/**
 * Generate common aliases for a place name
 */
function generateAliases(name: string): string[] {
  const aliases: string[] = [];
  const lower = name.toLowerCase();

  // Original lowercase
  aliases.push(lower);

  // Remove common prefixes
  const withoutPrefix = lower
    .replace(/^the\s+/i, '')
    .replace(/^a\s+/i, '');
  if (withoutPrefix !== lower) aliases.push(withoutPrefix);

  // Remove location suffixes
  const withoutSuffix = lower
    .replace(/,?\s*(grand\s+)?cayman(\s+islands?)?$/i, '')
    .replace(/,?\s*seven\s+mile\s+beach$/i, '')
    .replace(/,?\s*george\s+town$/i, '')
    .replace(/,?\s*west\s+bay$/i, '')
    .trim();
  if (withoutSuffix !== lower && withoutSuffix.length > 3) {
    aliases.push(withoutSuffix);
  }

  // Handle "The Ritz-Carlton, Grand Cayman" -> "Ritz Carlton", "Ritz", etc.
  const words = lower.split(/[\s,\-]+/).filter(w => w.length > 2);

  // First significant word (skip "the", "a")
  const significantWords = words.filter(w => !['the', 'a', 'an', 'of', 'at', 'in', 'on'].includes(w));
  if (significantWords.length > 0) {
    // First word only (for "Ritz" from "Ritz-Carlton")
    if (significantWords[0].length >= 4) {
      aliases.push(significantWords[0]);
    }
    // First two words
    if (significantWords.length >= 2) {
      aliases.push(significantWords.slice(0, 2).join(' '));
    }
  }

  // Handle hyphenated names
  const dehyphenated = lower.replace(/-/g, ' ');
  if (dehyphenated !== lower) aliases.push(dehyphenated);

  // Handle possessives
  const withoutPossessive = lower.replace(/'s\s*/g, ' ').replace(/s'\s*/g, 's ');
  if (withoutPossessive !== lower) aliases.push(withoutPossessive.trim());

  return [...new Set(aliases)];
}

/**
 * Find all place matches in a text content
 */
export function findPlaceMatches(content: string): PlaceMatch[] {
  buildPlaceCache();
  if (!placeNameCache || !placeAliasCache) return [];

  const lowerContent = content.toLowerCase();
  const matches: PlaceMatch[] = [];
  const usedRanges: Array<[number, number]> = [];

  // Helper to check if range overlaps with existing matches
  const overlapsExisting = (start: number, end: number): boolean => {
    return usedRanges.some(([s, e]) =>
      (start >= s && start < e) || (end > s && end <= e) || (start <= s && end >= e)
    );
  };

  // First pass: exact matches (highest priority)
  for (const [name, node] of placeNameCache) {
    if (name.length < 4) continue; // Skip very short names

    let searchStart = 0;
    while (true) {
      const idx = lowerContent.indexOf(name, searchStart);
      if (idx === -1) break;

      const end = idx + name.length;

      // Check word boundaries
      const charBefore = idx > 0 ? lowerContent[idx - 1] : ' ';
      const charAfter = end < lowerContent.length ? lowerContent[end] : ' ';
      const isWordBoundary =
        /[\s.,;:!?"'()\[\]{}]/.test(charBefore) &&
        /[\s.,;:!?"'()\[\]{}]/.test(charAfter);

      if (isWordBoundary && !overlapsExisting(idx, end)) {
        matches.push({
          node,
          matchStart: idx,
          matchEnd: end,
          matchType: 'exact',
          confidence: 1.0
        });
        usedRanges.push([idx, end]);
      }

      searchStart = idx + 1;
    }
  }

  // Second pass: alias matches
  for (const [alias, node] of placeAliasCache) {
    if (alias.length < 4) continue;

    let searchStart = 0;
    while (true) {
      const idx = lowerContent.indexOf(alias, searchStart);
      if (idx === -1) break;

      const end = idx + alias.length;

      // Check word boundaries
      const charBefore = idx > 0 ? lowerContent[idx - 1] : ' ';
      const charAfter = end < lowerContent.length ? lowerContent[end] : ' ';
      const isWordBoundary =
        /[\s.,;:!?"'()\[\]{}]/.test(charBefore) &&
        /[\s.,;:!?"'()\[\]{}]/.test(charAfter);

      if (isWordBoundary && !overlapsExisting(idx, end)) {
        // Calculate confidence based on alias type
        const aliasRatio = alias.length / node.name.toLowerCase().length;
        const confidence = Math.min(0.9, 0.5 + aliasRatio * 0.4);

        matches.push({
          node,
          matchStart: idx,
          matchEnd: end,
          matchType: 'partial',
          confidence
        });
        usedRanges.push([idx, end]);
      }

      searchStart = idx + 1;
    }
  }

  // Sort by position in text
  matches.sort((a, b) => a.matchStart - b.matchStart);

  return matches;
}

/**
 * Parse content and split into text/place segments
 */
export function parseContentWithPlaces(content: string): ParsedContent[] {
  const matches = findPlaceMatches(content);
  if (matches.length === 0) {
    return [{ type: 'text', content }];
  }

  const result: ParsedContent[] = [];
  let lastEnd = 0;

  for (const match of matches) {
    // Add text before this match
    if (match.matchStart > lastEnd) {
      result.push({
        type: 'text',
        content: content.slice(lastEnd, match.matchStart)
      });
    }

    // Add the place
    result.push({
      type: 'place',
      content: content.slice(match.matchStart, match.matchEnd),
      place: match.node
    });

    lastEnd = match.matchEnd;
  }

  // Add remaining text
  if (lastEnd < content.length) {
    result.push({
      type: 'text',
      content: content.slice(lastEnd)
    });
  }

  return result;
}

// ============ CLICKABLE PLACE COMPONENT ============

export const ClickablePlace: React.FC<ClickablePlaceProps> = ({
  place,
  onClick,
  onHover,
  variant = 'inline',
  showRating = true,
  showLocation = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(place);
  }, [place, onClick]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setShowTooltip(true);
    onHover?.(place);
  }, [place, onHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowTooltip(false);
    onHover?.(null);
  }, [onHover]);

  const rating = place.ratings?.overall;
  const location = place.location?.district || place.location?.area;

  if (variant === 'inline') {
    return (
      <span className="relative inline">
        <motion.button
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
                     bg-cyan-500/10 hover:bg-cyan-500/20
                     text-cyan-400 hover:text-cyan-300
                     border border-cyan-500/20 hover:border-cyan-500/40
                     transition-all duration-200 cursor-pointer
                     font-medium text-sm"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <MapPin size={12} className="flex-shrink-0" />
          <span>{place.name}</span>
          {showRating && rating && (
            <span className="flex items-center gap-0.5 text-xs text-amber-400">
              <Star size={10} fill="currentColor" />
              {rating.toFixed(1)}
            </span>
          )}
        </motion.button>

        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
                         w-64 p-3 rounded-lg
                         bg-zinc-900 border border-white/10
                         shadow-xl shadow-black/50"
            >
              {/* Thumbnail */}
              {place.media?.thumbnail && (
                <div className="w-full h-24 rounded-md overflow-hidden mb-2">
                  <img
                    src={place.media.thumbnail}
                    alt={place.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Info */}
              <div className="space-y-1">
                <h4 className="font-semibold text-white text-sm">{place.name}</h4>

                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  {rating && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Star size={10} fill="currentColor" />
                      {rating.toFixed(1)}
                      {place.ratings?.reviewCount && (
                        <span className="text-zinc-500">
                          ({place.ratings.reviewCount})
                        </span>
                      )}
                    </span>
                  )}
                  {location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {location}
                    </span>
                  )}
                </div>

                {place.shortDescription && (
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {place.shortDescription}
                  </p>
                )}

                <div className="pt-2 flex items-center gap-1 text-xs text-cyan-400">
                  <Navigation size={10} />
                  <span>Click to view on map</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2
                              w-3 h-3 rotate-45 bg-zinc-900 border-r border-b border-white/10" />
            </motion.div>
          )}
        </AnimatePresence>
      </span>
    );
  }

  if (variant === 'chip') {
    return (
      <motion.button
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                   bg-gradient-to-r from-cyan-500/20 to-teal-500/20
                   hover:from-cyan-500/30 hover:to-teal-500/30
                   border border-cyan-500/30 hover:border-cyan-500/50
                   text-white text-sm font-medium
                   transition-all duration-200 cursor-pointer"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <MapPin size={14} className="text-cyan-400" />
        <span>{place.name}</span>
        {showRating && rating && (
          <span className="flex items-center gap-0.5 text-amber-400">
            <Star size={12} fill="currentColor" />
            {rating.toFixed(1)}
          </span>
        )}
      </motion.button>
    );
  }

  // Card variant
  return (
    <motion.button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flex items-center gap-3 p-3 rounded-xl w-full text-left
                 bg-zinc-800/50 hover:bg-zinc-800
                 border border-white/5 hover:border-cyan-500/30
                 transition-all duration-200 cursor-pointer"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Thumbnail */}
      {place.media?.thumbnail && (
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={place.media.thumbnail}
            alt={place.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-white truncate">{place.name}</h4>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
          {rating && (
            <span className="flex items-center gap-1 text-amber-400">
              <Star size={10} fill="currentColor" />
              {rating.toFixed(1)}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1">
              <MapPin size={10} />
              {location}
            </span>
          )}
        </div>
      </div>

      {/* Action indicator */}
      <div className="flex-shrink-0 text-cyan-400">
        <Navigation size={16} />
      </div>
    </motion.button>
  );
};

// ============ INTERACTIVE TEXT COMPONENT ============

interface InteractiveTextProps {
  content: string;
  onPlaceClick: (place: KnowledgeNode) => void;
  onPlaceHover?: (place: KnowledgeNode | null) => void;
  className?: string;
}

export const InteractiveText: React.FC<InteractiveTextProps> = ({
  content,
  onPlaceClick,
  onPlaceHover,
  className = ''
}) => {
  const parsedContent = useMemo(() => parseContentWithPlaces(content), [content]);

  return (
    <span className={className}>
      {parsedContent.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.content}</span>;
        }

        if (segment.type === 'place' && segment.place) {
          return (
            <ClickablePlace
              key={`${segment.place.id}-${index}`}
              place={segment.place}
              onClick={onPlaceClick}
              onHover={onPlaceHover}
              variant="inline"
            />
          );
        }

        return null;
      })}
    </span>
  );
};

// ============ EXPORTS ============

export default ClickablePlace;
