/**
 * Location Validator Utility for Isle AI
 *
 * This module provides validation functions for geographic coordinates
 * specific to the Cayman Islands. Use this when importing new scraped data
 * or validating user-submitted locations.
 */

// ============ ISLAND BOUNDS ============

export interface IslandBounds {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  centerLat: number;
  centerLng: number;
}

export const CAYMAN_ISLAND_BOUNDS: Record<string, IslandBounds> = {
  'Grand Cayman': {
    name: 'Grand Cayman',
    minLat: 19.25,
    maxLat: 19.40,
    minLng: -81.45,
    maxLng: -81.05,
    centerLat: 19.3133,
    centerLng: -81.2546
  },
  'Cayman Brac': {
    name: 'Cayman Brac',
    minLat: 19.68,
    maxLat: 19.75,
    minLng: -79.95,
    maxLng: -79.70,
    centerLat: 19.7167,
    centerLng: -79.8833
  },
  'Little Cayman': {
    name: 'Little Cayman',
    minLat: 19.65,
    maxLat: 19.70,
    minLng: -80.15,
    maxLng: -79.95,
    centerLat: 19.6833,
    centerLng: -80.0667
  }
};

// Combined bounds for all Cayman Islands
export const CAYMAN_TOTAL_BOUNDS = {
  minLat: 19.25,
  maxLat: 19.75,
  minLng: -81.45,
  maxLng: -79.70,
  centerLat: 19.40,
  centerLng: -80.60
};

// ============ VALIDATION TYPES ============

export interface LocationData {
  latitude: number;
  longitude: number;
  island?: string;
  district?: string;
  address?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedIsland: string | null;
  suggestedIsland: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  fixes?: {
    suggestedLat?: number;
    suggestedLng?: number;
    suggestedIsland?: string;
  };
}

// ============ CORE VALIDATION FUNCTIONS ============

/**
 * Check if coordinates are valid numbers within global bounds
 */
export function isValidCoordinateFormat(lat: number, lng: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }
  if (isNaN(lat) || isNaN(lng)) {
    return false;
  }
  if (!isFinite(lat) || !isFinite(lng)) {
    return false;
  }
  if (lat < -90 || lat > 90) {
    return false;
  }
  if (lng < -180 || lng > 180) {
    return false;
  }
  return true;
}

/**
 * Check if coordinates are within a specific island's bounds
 */
export function isWithinIslandBounds(lat: number, lng: number, islandName: string): boolean {
  const bounds = CAYMAN_ISLAND_BOUNDS[islandName];
  if (!bounds) {
    return false;
  }
  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
}

/**
 * Check if coordinates are within any Cayman Islands bounds
 */
export function isWithinCaymanBounds(lat: number, lng: number): boolean {
  return (
    lat >= CAYMAN_TOTAL_BOUNDS.minLat &&
    lat <= CAYMAN_TOTAL_BOUNDS.maxLat &&
    lng >= CAYMAN_TOTAL_BOUNDS.minLng &&
    lng <= CAYMAN_TOTAL_BOUNDS.maxLng
  );
}

/**
 * Detect which island the coordinates belong to
 */
export function detectIsland(lat: number, lng: number): string | null {
  for (const [islandName, bounds] of Object.entries(CAYMAN_ISLAND_BOUNDS)) {
    if (isWithinIslandBounds(lat, lng, islandName)) {
      return islandName;
    }
  }
  return null;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Find the nearest island center to given coordinates
 */
export function findNearestIsland(lat: number, lng: number): { island: string; distance: number } {
  let nearest = { island: 'Grand Cayman', distance: Infinity };

  for (const [islandName, bounds] of Object.entries(CAYMAN_ISLAND_BOUNDS)) {
    const distance = calculateDistance(lat, lng, bounds.centerLat, bounds.centerLng);
    if (distance < nearest.distance) {
      nearest = { island: islandName, distance };
    }
  }

  return nearest;
}

// ============ SUSPICIOUS COORDINATE DETECTION ============

const SUSPICIOUS_PATTERNS = {
  // Exact zeros
  zeroCoords: (lat: number, lng: number) => lat === 0 || lng === 0,

  // Both whole numbers (likely defaults)
  wholeNumbers: (lat: number, lng: number) =>
    lat === Math.round(lat) && lng === Math.round(lng),

  // Common default/placeholder coordinates
  defaultCoords: (lat: number, lng: number) => {
    const defaults = [
      { lat: 0, lng: 0 },
      { lat: 19.3133, lng: -81.2546 }, // Cayman center
      { lat: 19.2956, lng: -81.3812 }, // George Town generic
      { lat: 19.2928, lng: -81.3577 }, // Airport
    ];
    return defaults.some(d => d.lat === lat && d.lng === lng);
  },

  // Coordinates with suspiciously few decimal places
  lowPrecision: (lat: number, lng: number) => {
    const latDecimals = (lat.toString().split('.')[1] || '').length;
    const lngDecimals = (lng.toString().split('.')[1] || '').length;
    return latDecimals < 3 && lngDecimals < 3;
  }
};

/**
 * Check if coordinates appear to be placeholder or default values
 */
export function detectSuspiciousCoordinates(
  lat: number,
  lng: number
): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (SUSPICIOUS_PATTERNS.zeroCoords(lat, lng)) {
    reasons.push('Contains zero coordinate');
  }

  if (SUSPICIOUS_PATTERNS.wholeNumbers(lat, lng)) {
    reasons.push('Both coordinates are whole numbers');
  }

  if (SUSPICIOUS_PATTERNS.defaultCoords(lat, lng)) {
    reasons.push('Matches common default/placeholder coordinate');
  }

  if (SUSPICIOUS_PATTERNS.lowPrecision(lat, lng)) {
    reasons.push('Low coordinate precision (less than 3 decimal places)');
  }

  return {
    suspicious: reasons.length > 0,
    reasons
  };
}

// ============ COMPREHENSIVE VALIDATION ============

/**
 * Comprehensive validation of location data for Cayman Islands
 */
export function validateLocation(location: LocationData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let detectedIsland: string | null = null;
  let suggestedIsland: string | null = null;
  let confidence: 'high' | 'medium' | 'low' | 'none' = 'none';

  const { latitude, longitude, island, district, address } = location;

  // 1. Check format
  if (!isValidCoordinateFormat(latitude, longitude)) {
    errors.push('Invalid coordinate format');
    return { isValid: false, errors, warnings, detectedIsland, suggestedIsland, confidence };
  }

  // 2. Check Cayman bounds
  if (!isWithinCaymanBounds(latitude, longitude)) {
    errors.push('Coordinates are outside Cayman Islands');
    const nearest = findNearestIsland(latitude, longitude);
    suggestedIsland = nearest.island;

    if (nearest.distance < 100) {
      // Within 100km - might be a minor error
      warnings.push(`Nearest island is ${nearest.island} (${nearest.distance.toFixed(1)}km away)`);
    }

    return {
      isValid: false,
      errors,
      warnings,
      detectedIsland,
      suggestedIsland,
      confidence: 'low',
      fixes: {
        suggestedLat: CAYMAN_ISLAND_BOUNDS[suggestedIsland].centerLat,
        suggestedLng: CAYMAN_ISLAND_BOUNDS[suggestedIsland].centerLng,
        suggestedIsland
      }
    };
  }

  // 3. Detect island
  detectedIsland = detectIsland(latitude, longitude);
  confidence = detectedIsland ? 'high' : 'medium';

  // 4. Check island consistency
  if (island && detectedIsland && island !== detectedIsland) {
    if (island !== 'Cayman Islands' && island !== 'Caribbean') {
      warnings.push(
        `Coordinates suggest ${detectedIsland}, but island is set to ${island}`
      );
      suggestedIsland = detectedIsland;
      confidence = 'medium';
    }
  }

  // 5. Check specific island bounds if island is specified
  if (island && CAYMAN_ISLAND_BOUNDS[island]) {
    if (!isWithinIslandBounds(latitude, longitude, island)) {
      warnings.push(`Coordinates are outside ${island} bounds`);
      if (detectedIsland) {
        suggestedIsland = detectedIsland;
      }
      confidence = 'medium';
    }
  }

  // 6. Check for suspicious patterns
  const suspicious = detectSuspiciousCoordinates(latitude, longitude);
  if (suspicious.suspicious) {
    for (const reason of suspicious.reasons) {
      warnings.push(reason);
    }
    confidence = confidence === 'high' ? 'medium' : 'low';
  }

  // 7. Cross-reference with address/district if provided
  if (district && island) {
    const districtIslandMap: Record<string, string> = {
      'George Town': 'Grand Cayman',
      'Seven Mile Beach': 'Grand Cayman',
      'West Bay': 'Grand Cayman',
      'Bodden Town': 'Grand Cayman',
      'East End': 'Grand Cayman',
      'North Side': 'Grand Cayman',
      'Camana Bay': 'Grand Cayman',
      'Stake Bay': 'Cayman Brac',
      'Creek': 'Cayman Brac',
      'Spot Bay': 'Cayman Brac',
      'Blossom Village': 'Little Cayman'
    };

    const expectedIsland = districtIslandMap[district];
    if (expectedIsland && expectedIsland !== island && island !== 'Cayman Islands') {
      warnings.push(
        `District "${district}" is typically on ${expectedIsland}, not ${island}`
      );
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    detectedIsland,
    suggestedIsland,
    confidence,
    ...(suggestedIsland && {
      fixes: {
        suggestedIsland
      }
    })
  };
}

// ============ BATCH VALIDATION ============

export interface BatchValidationResult {
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  results: Array<{
    location: LocationData;
    validation: ValidationResult;
  }>;
}

/**
 * Validate multiple locations at once
 */
export function validateLocationBatch(locations: LocationData[]): BatchValidationResult {
  const results = locations.map(location => ({
    location,
    validation: validateLocation(location)
  }));

  return {
    total: locations.length,
    valid: results.filter(r => r.validation.isValid && r.validation.warnings.length === 0).length,
    invalid: results.filter(r => !r.validation.isValid).length,
    warnings: results.filter(r => r.validation.isValid && r.validation.warnings.length > 0).length,
    results
  };
}

// ============ COORDINATE FORMATTING ============

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number, precision: number = 4): string {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

/**
 * Parse coordinate string into lat/lng
 * Supports formats: "19.3133, -81.2546" or "19.3133,-81.2546" or "19.3133 -81.2546"
 */
export function parseCoordinateString(coordString: string): { lat: number; lng: number } | null {
  const cleaned = coordString.trim();
  const parts = cleaned.split(/[,\s]+/).filter(Boolean);

  if (parts.length !== 2) {
    return null;
  }

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }

  return { lat, lng };
}

// ============ COORDINATE CORRECTION HELPERS ============

/**
 * Get center coordinates for a given island
 */
export function getIslandCenter(islandName: string): { lat: number; lng: number } | null {
  const bounds = CAYMAN_ISLAND_BOUNDS[islandName];
  if (!bounds) {
    return null;
  }
  return {
    lat: bounds.centerLat,
    lng: bounds.centerLng
  };
}

/**
 * Get default coordinates for a district
 */
export function getDistrictDefaultCoords(district: string): { lat: number; lng: number } | null {
  const districtCoords: Record<string, { lat: number; lng: number }> = {
    // Grand Cayman
    'George Town': { lat: 19.2956, lng: -81.3823 },
    'Seven Mile Beach': { lat: 19.3350, lng: -81.3850 },
    'West Bay': { lat: 19.3700, lng: -81.4050 },
    'Bodden Town': { lat: 19.2800, lng: -81.2500 },
    'East End': { lat: 19.2700, lng: -81.1200 },
    'North Side': { lat: 19.3400, lng: -81.2200 },
    'Camana Bay': { lat: 19.3271, lng: -81.3775 },
    'Savannah': { lat: 19.2700, lng: -81.2200 },

    // Cayman Brac
    'Stake Bay': { lat: 19.7200, lng: -79.8200 },
    'Cotton Tree Bay': { lat: 19.6967, lng: -79.8756 },
    'Creek': { lat: 19.7100, lng: -79.8400 },
    'Spot Bay': { lat: 19.7300, lng: -79.7500 },

    // Little Cayman
    'Blossom Village': { lat: 19.6623, lng: -80.0623 },
    'Point of Sand': { lat: 19.6712, lng: -79.9789 }
  };

  return districtCoords[district] || null;
}

// ============ EXPORTS ============

export default {
  // Bounds data
  CAYMAN_ISLAND_BOUNDS,
  CAYMAN_TOTAL_BOUNDS,

  // Core validation
  isValidCoordinateFormat,
  isWithinIslandBounds,
  isWithinCaymanBounds,
  detectIsland,
  detectSuspiciousCoordinates,
  validateLocation,
  validateLocationBatch,

  // Distance calculations
  calculateDistance,
  findNearestIsland,

  // Formatting
  formatCoordinates,
  parseCoordinateString,

  // Helpers
  getIslandCenter,
  getDistrictDefaultCoords
};
