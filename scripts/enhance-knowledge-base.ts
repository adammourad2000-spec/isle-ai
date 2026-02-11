#!/usr/bin/env npx ts-node --esm

/**
 * ISLE AI - Knowledge Base Enhancer
 *
 * Phase 3: Data Quality Improvements
 * 1. Validate coordinates (bounds check, ocean detection)
 * 2. Improve generic descriptions with templates
 * 3. Standardize categories, phones, cleanup
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');

// ============ TYPES ============

interface UnifiedPlace {
  id: string;
  name: string;
  slug: string;
  category: string;
  subcategory: string | null;
  description: string;
  shortDescription: string;
  highlights: string[];
  location: {
    island: 'Grand Cayman' | 'Cayman Brac' | 'Little Cayman';
    area: string | null;
    district: string | null;
    address: string | null;
    coordinates: { lat: number; lng: number };
    googlePlaceId: string | null;
  };
  contact: {
    phone: string | null;
    email: string | null;
    website: string | null;
    bookingUrl: string | null;
    social: {
      instagram: string | null;
      facebook: string | null;
      tripadvisor: string | null;
    };
  };
  business: {
    priceRange: '$' | '$$' | '$$$' | '$$$$' | null;
    priceFrom: number | null;
    priceTo: number | null;
    currency: string;
    hours: {
      display: string | null;
      isOpen24Hours: boolean;
      schedule: Record<string, { open: string; close: string } | 'closed'> | null;
    };
    acceptsCreditCards: boolean;
    reservationRequired: boolean;
    languages: string[];
  };
  ratings: {
    overall: number | null;
    reviewCount: number;
    googleRating: number | null;
    tripadvisorRating: number | null;
  };
  media: {
    thumbnail: string | null;
    images: string[];
    videos: string[];
  };
  tags: string[];
  keywords: string[];
  searchText: string;
  isActive: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  source: string;
  sourceId: string;
  quality: {
    score: number;
    hasPhoto: boolean;
    hasPhone: boolean;
    hasWebsite: boolean;
    hasDescription: boolean;
    hasHours: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface ValidationIssue {
  id: string;
  name: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  details: string;
}

// ============ CAYMAN ISLANDS GEOGRAPHY ============

const CAYMAN_BOUNDS = {
  // Grand Cayman
  grandCayman: {
    north: 19.40,
    south: 19.25,
    east: -81.05,
    west: -81.45
  },
  // Cayman Brac
  caymanBrac: {
    north: 19.75,
    south: 19.68,
    east: -79.72,
    west: -79.90
  },
  // Little Cayman
  littleCayman: {
    north: 19.72,
    south: 19.65,
    east: -79.95,
    west: -80.15
  }
};

// Key coastal/land reference points for ocean detection
const LAND_REFERENCE_POINTS = [
  // Grand Cayman
  { lat: 19.3200, lng: -81.3800, island: 'Grand Cayman' }, // Seven Mile Beach
  { lat: 19.2950, lng: -81.3838, island: 'Grand Cayman' }, // George Town
  { lat: 19.3500, lng: -81.4000, island: 'Grand Cayman' }, // West Bay
  { lat: 19.2800, lng: -81.1500, island: 'Grand Cayman' }, // East End
  { lat: 19.3300, lng: -81.1800, island: 'Grand Cayman' }, // North Side
  // Cayman Brac
  { lat: 19.7200, lng: -79.8000, island: 'Cayman Brac' },
  { lat: 19.6900, lng: -79.8800, island: 'Cayman Brac' },
  // Little Cayman
  { lat: 19.6800, lng: -80.0500, island: 'Little Cayman' },
  { lat: 19.6600, lng: -80.1000, island: 'Little Cayman' },
];

// ============ DESCRIPTION TEMPLATES ============

const CATEGORY_TEMPLATES: Record<string, (p: UnifiedPlace) => string> = {
  hotel: (p) => {
    const rating = p.ratings.overall ? `Rated ${p.ratings.overall}★` : '';
    const reviews = p.ratings.reviewCount > 0 ? `with ${p.ratings.reviewCount} reviews` : '';
    const price = p.business.priceRange ? `${p.business.priceRange} pricing.` : '';
    const area = p.location.area || p.location.island;
    const type = p.subcategory || 'accommodation';
    return `${p.name} is a ${type} in ${area}, ${p.location.island}. ${rating} ${reviews}. ${price} Perfect for travelers seeking comfortable lodging in the Cayman Islands.`.trim().replace(/\s+/g, ' ');
  },

  villa_rental: (p) => {
    const area = p.location.area || p.location.island;
    const price = p.business.priceRange ? `${p.business.priceRange} pricing.` : '';
    return `${p.name} is a vacation rental property in ${area}, ${p.location.island}. ${price} Ideal for families and groups looking for a home-away-from-home experience in the Caribbean.`.trim();
  },

  restaurant: (p) => {
    const rating = p.ratings.overall ? `Rated ${p.ratings.overall}★` : '';
    const reviews = p.ratings.reviewCount > 0 ? `by ${p.ratings.reviewCount} diners` : '';
    const price = getPriceDescription(p.business.priceRange);
    const area = p.location.area || p.location.island;
    const type = p.subcategory || 'restaurant';
    return `${p.name} is a ${type} in ${area}, ${p.location.island}. ${rating} ${reviews}. ${price} Serving delicious meals to locals and visitors alike.`.trim().replace(/\s+/g, ' ');
  },

  bar: (p) => {
    const area = p.location.area || p.location.island;
    const rating = p.ratings.overall ? `Rated ${p.ratings.overall}★.` : '';
    return `${p.name} is a bar and lounge in ${area}, ${p.location.island}. ${rating} A great spot for drinks, socializing, and enjoying the Caribbean nightlife.`.trim();
  },

  beach: (p) => {
    const area = p.location.area || '';
    const island = p.location.island;
    const rating = p.ratings.overall ? `Rated ${p.ratings.overall}★ by visitors.` : '';
    return `${p.name} is a beautiful beach on ${island}${area ? ` near ${area}` : ''}. ${rating} Enjoy crystal-clear Caribbean waters, white sand, and stunning views. Perfect for swimming, snorkeling, and relaxation.`.trim();
  },

  diving_snorkeling: (p) => {
    const area = p.location.area || p.location.island;
    const rating = p.ratings.overall ? `Rated ${p.ratings.overall}★.` : '';
    return `${p.name} is a diving and snorkeling operator in ${area}, ${p.location.island}. ${rating} Explore the Cayman Islands' world-famous underwater sites, coral reefs, and marine life with experienced guides.`.trim();
  },

  water_sports: (p) => {
    const area = p.location.area || p.location.island;
    return `${p.name} offers water sports and activities in ${area}, ${p.location.island}. Enjoy jet skiing, paddleboarding, kayaking, and more in the beautiful Caribbean waters.`.trim();
  },

  boat_charter: (p) => {
    const area = p.location.area || p.location.island;
    const price = p.business.priceRange ? `${p.business.priceRange} pricing.` : '';
    return `${p.name} provides boat charter and tour services from ${area}, ${p.location.island}. ${price} Explore the islands by sea, visit Stingray City, or enjoy a sunset cruise.`.trim();
  },

  attraction: (p) => {
    const area = p.location.area || p.location.island;
    const rating = p.ratings.overall ? `Rated ${p.ratings.overall}★ by visitors.` : '';
    const price = p.business.priceFrom ? `Admission from $${p.business.priceFrom}.` : '';
    return `${p.name} is a popular attraction in ${area}, ${p.location.island}. ${rating} ${price} A must-visit destination for tourists exploring the Cayman Islands.`.trim().replace(/\s+/g, ' ');
  },

  activity: (p) => {
    const area = p.location.area || p.location.island;
    return `${p.name} offers activities and experiences in ${area}, ${p.location.island}. Perfect for adventure seekers and those looking to explore what the Cayman Islands has to offer.`.trim();
  },

  shopping: (p) => {
    const area = p.location.area || p.location.island;
    const type = p.subcategory || 'shopping destination';
    return `${p.name} is a ${type} in ${area}, ${p.location.island}. Find souvenirs, local crafts, duty-free goods, and more. Great for picking up gifts and Caribbean treasures.`.trim();
  },

  spa_wellness: (p) => {
    const area = p.location.area || p.location.island;
    const price = p.business.priceRange ? `${p.business.priceRange} pricing.` : '';
    return `${p.name} is a spa and wellness center in ${area}, ${p.location.island}. ${price} Relax and rejuvenate with massages, treatments, and therapeutic services.`.trim();
  },

  wellness: (p) => {
    const area = p.location.area || p.location.island;
    return `${p.name} is a wellness facility in ${area}, ${p.location.island}. Focus on your health and fitness during your Cayman Islands visit.`.trim();
  },

  medical: (p) => {
    const area = p.location.area || p.location.island;
    const type = p.subcategory || 'medical facility';
    return `${p.name} is a ${type} in ${area}, ${p.location.island}. Providing healthcare services to residents and visitors. Contact for appointments and emergency services.`.trim();
  },

  transport: (p) => {
    const area = p.location.area || p.location.island;
    const type = p.subcategory || 'transportation service';
    return `${p.name} is a ${type} in ${area}, ${p.location.island}. Providing transportation solutions for getting around the islands safely and conveniently.`.trim();
  },

  financial: (p) => {
    const area = p.location.area || p.location.island;
    const type = p.subcategory || 'financial institution';
    return `${p.name} is a ${type} in ${area}, ${p.location.island}. Offering banking and financial services to residents and visitors.`.trim();
  },

  religious: (p) => {
    const area = p.location.area || p.location.island;
    const type = p.subcategory || 'place of worship';
    return `${p.name} is a ${type} in ${area}, ${p.location.island}. Welcoming worshippers and visitors to join services and community events.`.trim();
  },

  services: (p) => {
    const area = p.location.area || p.location.island;
    return `${p.name} provides services in ${area}, ${p.location.island}. Serving the local community and visitors with professional solutions.`.trim();
  },

  golf: (p) => {
    const area = p.location.area || p.location.island;
    const rating = p.ratings.overall ? `Rated ${p.ratings.overall}★.` : '';
    return `${p.name} is a golf facility in ${area}, ${p.location.island}. ${rating} Enjoy a round of golf in a beautiful Caribbean setting with stunning ocean views.`.trim();
  },

  default: (p) => {
    const area = p.location.area || p.location.island;
    const rating = p.ratings.overall ? `Rated ${p.ratings.overall}★.` : '';
    return `${p.name} is located in ${area}, ${p.location.island}. ${rating} A notable destination in the Cayman Islands.`.trim();
  }
};

function getPriceDescription(priceRange: string | null): string {
  switch (priceRange) {
    case '$': return 'Budget-friendly pricing.';
    case '$$': return 'Moderately priced.';
    case '$$$': return 'Upscale pricing.';
    case '$$$$': return 'Luxury pricing.';
    default: return '';
  }
}

// ============ CATEGORY STANDARDIZATION ============

const CATEGORY_MAPPING: Record<string, string> = {
  'spa': 'spa_wellness',
  'spa_wellness': 'spa_wellness',
  'medical_vip': 'medical',
  'transportation': 'transport',
  'chauffeur': 'transport',
  'private_jet': 'transport',
  'luxury_car_rental': 'transport',
  'nightlife': 'bar',
  'concierge': 'services',
  'vip_escort': 'services',
  'security_services': 'services',
  'service': 'services',
  'financial_services': 'financial',
  'legal_services': 'services',
  'real_estate': 'services',
  'investment': 'financial',
  'superyacht': 'boat_charter',
  'flight': 'transport',
};

// ============ VALIDATION FUNCTIONS ============

function isWithinBounds(lat: number, lng: number): { valid: boolean; island: string | null } {
  // Check Grand Cayman
  if (lat >= CAYMAN_BOUNDS.grandCayman.south && lat <= CAYMAN_BOUNDS.grandCayman.north &&
      lng >= CAYMAN_BOUNDS.grandCayman.west && lng <= CAYMAN_BOUNDS.grandCayman.east) {
    return { valid: true, island: 'Grand Cayman' };
  }

  // Check Cayman Brac
  if (lat >= CAYMAN_BOUNDS.caymanBrac.south && lat <= CAYMAN_BOUNDS.caymanBrac.north &&
      lng >= CAYMAN_BOUNDS.caymanBrac.west && lng <= CAYMAN_BOUNDS.caymanBrac.east) {
    return { valid: true, island: 'Cayman Brac' };
  }

  // Check Little Cayman
  if (lat >= CAYMAN_BOUNDS.littleCayman.south && lat <= CAYMAN_BOUNDS.littleCayman.north &&
      lng >= CAYMAN_BOUNDS.littleCayman.west && lng <= CAYMAN_BOUNDS.littleCayman.east) {
    return { valid: true, island: 'Little Cayman' };
  }

  return { valid: false, island: null };
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function isLikelyInOcean(lat: number, lng: number): boolean {
  // Find minimum distance to any land reference point
  let minDistance = Infinity;
  for (const ref of LAND_REFERENCE_POINTS) {
    const dist = haversineDistance(lat, lng, ref.lat, ref.lng);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  // If more than 15km from any reference point, likely in ocean
  // (Cayman Islands are small - max width ~35km for Grand Cayman)
  return minDistance > 15000;
}

function formatPhone(phone: string | null): string | null {
  if (!phone) return null;

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Cayman Islands format: +1 345-XXX-XXXX
  if (cleaned.startsWith('1345') || cleaned.startsWith('+1345')) {
    cleaned = cleaned.replace(/^\+?1?/, '');
    if (cleaned.length === 10 && cleaned.startsWith('345')) {
      return `+1 ${cleaned.slice(0,3)}-${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
    }
  }

  // If it starts with 345, add country code
  if (cleaned.startsWith('345') && cleaned.length === 10) {
    return `+1 ${cleaned.slice(0,3)}-${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  }

  // Return original if we can't parse
  return phone;
}

function isGenericDescription(desc: string, name: string): boolean {
  if (!desc || desc.length < 30) return true;

  // Check for generic patterns
  const genericPatterns = [
    /^.{1,50} is a .{1,30} located in/i,
    /^.{1,50} is located in/i,
    /^.{1,50} in the Cayman Islands\.?$/i,
  ];

  for (const pattern of genericPatterns) {
    if (pattern.test(desc)) return true;
  }

  return false;
}

// ============ MAIN ENHANCEMENT ============

async function main(): Promise<void> {
  console.log('============================================');
  console.log('ISLE AI - KNOWLEDGE BASE ENHANCER');
  console.log('============================================\n');

  // Load unified knowledge base
  const inputPath = path.join(DATA_DIR, 'unified-knowledge-base.json');
  if (!fs.existsSync(inputPath)) {
    console.error('❌ unified-knowledge-base.json not found. Run normalize:kb first.');
    process.exit(1);
  }

  const places: UnifiedPlace[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  console.log(`📂 Loaded ${places.length} places\n`);

  const issues: ValidationIssue[] = [];
  const stats = {
    coordsFixed: 0,
    coordsInvalid: 0,
    descriptionsImproved: 0,
    categoriesStandardized: 0,
    phonesFormatted: 0,
    placesDeactivated: 0,
  };

  // Process each place
  console.log('🔍 Validating and enhancing...\n');

  for (const place of places) {
    const { lat, lng } = place.location.coordinates;

    // === 1. VALIDATE COORDINATES ===
    const boundsCheck = isWithinBounds(lat, lng);

    if (!boundsCheck.valid) {
      // Check if it's way off (likely bad data)
      if (lat < 19 || lat > 20 || lng < -82 || lng > -79) {
        issues.push({
          id: place.id,
          name: place.name,
          issue: 'coordinates_invalid',
          severity: 'error',
          details: `Coordinates (${lat}, ${lng}) outside Cayman Islands`
        });
        place.isActive = false;
        stats.placesDeactivated++;
        stats.coordsInvalid++;
      }
    }

    // Check if in ocean
    if (place.isActive && isLikelyInOcean(lat, lng)) {
      // Only flag if not a boat/water activity
      if (!['boat_charter', 'diving_snorkeling', 'water_sports', 'beach'].includes(place.category)) {
        issues.push({
          id: place.id,
          name: place.name,
          issue: 'likely_in_ocean',
          severity: 'warning',
          details: `Coordinates (${lat}, ${lng}) appear to be in the ocean`
        });
      }
    }

    // Fix island mismatch
    if (boundsCheck.valid && boundsCheck.island && boundsCheck.island !== place.location.island) {
      place.location.island = boundsCheck.island as any;
      stats.coordsFixed++;
    }

    // === 2. IMPROVE DESCRIPTIONS ===
    if (place.isActive && isGenericDescription(place.description, place.name)) {
      const templateFn = CATEGORY_TEMPLATES[place.category] || CATEGORY_TEMPLATES.default;
      const newDesc = templateFn(place);

      if (newDesc.length > place.description.length) {
        place.description = newDesc;
        place.shortDescription = newDesc.substring(0, 150) + (newDesc.length > 150 ? '...' : '');
        stats.descriptionsImproved++;
      }
    }

    // === 3. STANDARDIZE CATEGORIES ===
    if (CATEGORY_MAPPING[place.category]) {
      place.category = CATEGORY_MAPPING[place.category];
      stats.categoriesStandardized++;
    }

    // === 4. FORMAT PHONES ===
    if (place.contact.phone) {
      const formatted = formatPhone(place.contact.phone);
      if (formatted !== place.contact.phone) {
        place.contact.phone = formatted;
        stats.phonesFormatted++;
      }
    }

    // === 5. CLEAN IMAGES ===
    // Remove tiny images (32x32 thumbnails only)
    place.media.images = place.media.images.filter(img =>
      !img.includes('=w32-h32') || place.media.images.length <= 1
    );

    // === 6. UPDATE QUALITY SCORE ===
    place.quality = {
      score: calculateQualityScore(place),
      hasPhoto: !!place.media.thumbnail || place.media.images.length > 0,
      hasPhone: !!place.contact.phone,
      hasWebsite: !!place.contact.website,
      hasDescription: place.description.length > 50,
      hasHours: !!place.business.hours.display && !place.business.hours.display.includes('Contact')
    };

    // === 7. UPDATE SEARCH TEXT ===
    place.searchText = generateSearchText(place);
    place.updatedAt = new Date().toISOString();
  }

  // Filter out inactive places
  const activePlaces = places.filter(p => p.isActive);

  // Sort by quality
  activePlaces.sort((a, b) => b.quality.score - a.quality.score);

  // === SAVE RESULTS ===
  console.log('💾 Saving enhanced knowledge base...\n');

  // Save JSON
  const outputJson = path.join(DATA_DIR, 'unified-knowledge-base.json');
  fs.writeFileSync(outputJson, JSON.stringify(activePlaces, null, 2));

  // Save TypeScript
  const outputTs = path.join(DATA_DIR, 'unified-knowledge-base.ts');
  const tsContent = `// ============================================
// ISLE AI - UNIFIED KNOWLEDGE BASE (Enhanced)
// Generated: ${new Date().toISOString()}
// Total places: ${activePlaces.length}
// ============================================

export interface UnifiedPlace {
  id: string;
  name: string;
  slug: string;
  category: string;
  subcategory: string | null;
  description: string;
  shortDescription: string;
  highlights: string[];
  location: {
    island: 'Grand Cayman' | 'Cayman Brac' | 'Little Cayman';
    area: string | null;
    district: string | null;
    address: string | null;
    coordinates: { lat: number; lng: number };
    googlePlaceId: string | null;
  };
  contact: {
    phone: string | null;
    email: string | null;
    website: string | null;
    bookingUrl: string | null;
    social: {
      instagram: string | null;
      facebook: string | null;
      tripadvisor: string | null;
    };
  };
  business: {
    priceRange: '$' | '$$' | '$$$' | '$$$$' | null;
    priceFrom: number | null;
    priceTo: number | null;
    currency: string;
    hours: {
      display: string | null;
      isOpen24Hours: boolean;
      schedule: Record<string, { open: string; close: string } | 'closed'> | null;
    };
    acceptsCreditCards: boolean;
    reservationRequired: boolean;
    languages: string[];
  };
  ratings: {
    overall: number | null;
    reviewCount: number;
    googleRating: number | null;
    tripadvisorRating: number | null;
  };
  media: {
    thumbnail: string | null;
    images: string[];
    videos: string[];
  };
  tags: string[];
  keywords: string[];
  searchText: string;
  isActive: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  source: string;
  sourceId: string;
  quality: {
    score: number;
    hasPhoto: boolean;
    hasPhone: boolean;
    hasWebsite: boolean;
    hasDescription: boolean;
    hasHours: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export const UNIFIED_KNOWLEDGE_BASE: UnifiedPlace[] = ${JSON.stringify(activePlaces, null, 2)};

export default UNIFIED_KNOWLEDGE_BASE;
`;
  fs.writeFileSync(outputTs, tsContent);

  // Save issues report
  if (issues.length > 0) {
    const issuesPath = path.join(DATA_DIR, 'data-quality-issues.json');
    fs.writeFileSync(issuesPath, JSON.stringify(issues, null, 2));
  }

  // === PRINT SUMMARY ===
  console.log('============================================');
  console.log('📊 ENHANCEMENT COMPLETE');
  console.log('============================================\n');

  console.log(`📍 Active Places: ${activePlaces.length}`);
  console.log(`❌ Deactivated: ${stats.placesDeactivated}`);

  console.log('\n🔧 Improvements Made:');
  console.log(`   📝 Descriptions improved: ${stats.descriptionsImproved}`);
  console.log(`   📂 Categories standardized: ${stats.categoriesStandardized}`);
  console.log(`   📞 Phones formatted: ${stats.phonesFormatted}`);
  console.log(`   🗺️ Island assignments fixed: ${stats.coordsFixed}`);
  console.log(`   ⚠️ Invalid coordinates: ${stats.coordsInvalid}`);

  if (issues.length > 0) {
    console.log(`\n⚠️ Issues Found: ${issues.length}`);
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    if (errors.length) console.log(`   🔴 Errors: ${errors.length}`);
    if (warnings.length) console.log(`   🟡 Warnings: ${warnings.length}`);
    console.log(`   📄 Details saved to: data/data-quality-issues.json`);
  }

  // Quality stats
  const qualityStats = {
    withPhoto: activePlaces.filter(p => p.quality.hasPhoto).length,
    withPhone: activePlaces.filter(p => p.quality.hasPhone).length,
    withWebsite: activePlaces.filter(p => p.quality.hasWebsite).length,
    withDescription: activePlaces.filter(p => p.quality.hasDescription).length,
    avgScore: Math.round(activePlaces.reduce((sum, p) => sum + p.quality.score, 0) / activePlaces.length)
  };

  console.log('\n📈 Final Quality Metrics:');
  console.log(`   With Photo: ${qualityStats.withPhoto} (${Math.round(qualityStats.withPhoto / activePlaces.length * 100)}%)`);
  console.log(`   With Phone: ${qualityStats.withPhone} (${Math.round(qualityStats.withPhone / activePlaces.length * 100)}%)`);
  console.log(`   With Website: ${qualityStats.withWebsite} (${Math.round(qualityStats.withWebsite / activePlaces.length * 100)}%)`);
  console.log(`   With Description: ${qualityStats.withDescription} (${Math.round(qualityStats.withDescription / activePlaces.length * 100)}%)`);
  console.log(`   Avg Quality Score: ${qualityStats.avgScore}/100`);

  console.log('\n✅ Enhanced knowledge base saved!');
  console.log(`   JSON: ${outputJson}`);
  console.log(`   TypeScript: ${outputTs}`);
}

function calculateQualityScore(place: UnifiedPlace): number {
  let score = 0;
  if (place.media.thumbnail) score += 20;
  if (place.media.images.length > 0) score += 10;
  if (place.contact.phone) score += 20;
  if (place.contact.website) score += 15;
  if (place.description && place.description.length > 50) score += 15;
  if (place.business.hours.display && !place.business.hours.display.includes('Contact')) score += 10;
  if (place.ratings.overall && place.ratings.overall > 0) score += 10;
  return score;
}

function generateSearchText(place: UnifiedPlace): string {
  const parts = [
    place.name,
    place.description,
    place.category,
    place.subcategory,
    place.location.island,
    place.location.area,
    place.location.district,
    ...place.tags,
    ...place.keywords
  ].filter(Boolean);
  return parts.join(' ').toLowerCase();
}

main().catch(console.error);
