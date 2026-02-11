/**
 * Property Types for Isle AI Real Estate Integration
 * World-class property search and recommendation system
 */

export type PropertyType = 'villa' | 'condo' | 'apartment' | 'house' | 'land' | 'commercial';
export type PropertyStatus = 'for-sale' | 'for-rent' | 'sold' | 'rented';
export type PropertyCategory = 'luxury' | 'mid-level' | 'budget';

export interface PropertyLocation {
  address: string;
  district: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  nearbyAttractions?: string[];
}

export interface PropertyFeatures {
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  lotSize?: number;
  yearBuilt?: number;
  parking?: number;
  pool?: boolean;
  beachfront?: boolean;
  oceanView?: boolean;
  furnished?: boolean;
  petFriendly?: boolean;
  amenities: string[];
}

export interface PropertyFinancials {
  price: number;
  currency: string;
  pricePerSqFt?: number;
  hoa?: number;
  propertyTax?: number;
  insurance?: number;
}

export interface PropertyMedia {
  mainImage: string;
  images: string[];
  virtualTour?: string;
  video?: string;
}

export interface PropertyAgent {
  name: string;
  company: string;
  phone: string;
  email: string;
  photo?: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  type: PropertyType;
  status: PropertyStatus;
  category: PropertyCategory;
  location: PropertyLocation;
  features: PropertyFeatures;
  financials: PropertyFinancials;
  media: PropertyMedia;
  agent?: PropertyAgent;
  source: string; // e.g., "Sotheby's", "Airbnb"
  sourceUrl: string;
  rating?: number;
  reviews?: number;
  availableFrom?: string;
  lastUpdated: string;
  featured?: boolean;
}

export interface PropertySearchParams {
  status?: PropertyStatus[];
  category?: PropertyCategory[];
  type?: PropertyType[];
  district?: string[];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  beachfront?: boolean;
  oceanView?: boolean;
  pool?: boolean;
  furnished?: boolean;
  limit?: number;
}

export interface PropertyRecommendation {
  property: Property;
  relevanceScore: number;
  reason: string;
  matchedCriteria: string[];
}

export interface UserPropertyInterest {
  propertyId: string;
  userId?: string;
  sessionId: string;
  interested: boolean;
  timestamp: string;
  source: 'chatbot-suggestion' | 'manual-search' | 'map-click';
  userMessage?: string;
}

// Real Estate Sources Configuration
export interface RealEstateSource {
  name: string;
  type: 'luxury' | 'mid-level';
  focus: PropertyStatus[];
  website: string;
  logo?: string;
}

export const REAL_ESTATE_SOURCES: RealEstateSource[] = [
  // Luxury Sources
  {
    name: "Cayman Islands Sotheby's International Realty",
    type: 'luxury',
    focus: ['for-sale', 'for-rent'],
    website: 'https://www.sothebysrealty.com/eng/associates/cayman-islands',
  },
  {
    name: "Engel & Völkers Cayman Islands",
    type: 'luxury',
    focus: ['for-sale', 'for-rent'],
    website: 'https://www.engelvoelkers.com/en-ky/',
  },
  {
    name: "Provenance Properties",
    type: 'luxury',
    focus: ['for-sale', 'for-rent'],
    website: 'https://www.provenanceproperties.ky',
  },
  {
    name: "Coldwell Banker Cayman Islands",
    type: 'luxury',
    focus: ['for-sale'],
    website: 'https://www.coldwellbankercayman.com',
  },
  {
    name: "ERA Cayman Islands",
    type: 'luxury',
    focus: ['for-sale', 'for-rent'],
    website: 'https://www.eracayman.com',
  },
  // Mid-Level Sources
  {
    name: "Cayman Property Centre",
    type: 'mid-level',
    focus: ['for-sale', 'for-rent'],
    website: 'https://www.caymanpropertycentre.com',
  },
  {
    name: "Cayman Real Estate",
    type: 'mid-level',
    focus: ['for-sale', 'for-rent'],
    website: 'https://www.caymanrealestate.ky',
  },
  {
    name: "Property Cayman",
    type: 'mid-level',
    focus: ['for-sale', 'for-rent'],
    website: 'https://www.propertycayman.com',
  },
  {
    name: "CaribPro Realty",
    type: 'mid-level',
    focus: ['for-sale'],
    website: 'https://www.caribpro.com',
  },
  {
    name: "Williams2 Real Estate",
    type: 'mid-level',
    focus: ['for-sale', 'for-rent'],
    website: 'https://www.williams2.com',
  },
  // Vacation Rentals
  {
    name: "Airbnb Cayman Islands",
    type: 'mid-level',
    focus: ['for-rent'],
    website: 'https://www.airbnb.com/cayman-islands',
  },
  {
    name: "VRBO Cayman Islands",
    type: 'mid-level',
    focus: ['for-rent'],
    website: 'https://www.vrbo.com/cayman-islands',
  },
];
