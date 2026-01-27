// ============================================
// ISLE AI - CHATBOT & RAG SYSTEM TYPES
// Inspired by Mindtrip Architecture
// ============================================

// ============ KNOWLEDGE BASE (RAG) ============

export type KnowledgeCategory =
  | 'hotel'
  | 'restaurant'
  | 'beach'
  | 'attraction'
  | 'activity'
  | 'transport'
  | 'nightlife'
  | 'shopping'
  | 'spa_wellness'
  | 'diving_snorkeling'
  | 'water_sports'
  | 'golf'
  | 'real_estate'
  | 'investment'
  | 'villa_rental'
  | 'boat_charter'
  | 'private_jet'
  | 'chauffeur'
  | 'concierge'
  | 'history'
  | 'culture'
  | 'wildlife'
  | 'weather'
  | 'visa_travel'
  | 'emergency'
  | 'general_info';

export type PriceRange = '$' | '$$' | '$$$' | '$$$$' | '$$$$$';

export type ServiceTier = 'standard' | 'premium' | 'luxury' | 'ultra_luxury';

// Core knowledge node - the building block of RAG
export interface KnowledgeNode {
  id: string;
  category: KnowledgeCategory;
  subcategory?: string;

  // Basic info
  name: string;
  description: string;
  shortDescription: string;

  // Location
  location: {
    address: string;
    district: string;
    island: string; // Grand Cayman, Cayman Brac, Little Cayman
    latitude: number;
    longitude: number;
    googlePlaceId?: string;
  };

  // Contact & Links
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    bookingUrl?: string;
    instagram?: string;
    facebook?: string;
    tripadvisor?: string;
  };

  // Media
  media: {
    thumbnail: string;
    images: string[];
    videos?: string[];
    virtualTour?: string;
  };

  // Business info
  business: {
    priceRange: PriceRange;
    priceFrom?: number;
    priceTo?: number;
    currency: string;
    openingHours?: {
      [key: string]: { open: string; close: string } | 'closed';
    };
    reservationRequired?: boolean;
    acceptsCreditCards?: boolean;
    languages?: string[];
  };

  // Ratings & Reviews
  ratings: {
    overall: number;
    reviewCount: number;
    tripadvisorRating?: number;
    googleRating?: number;
    sources?: { name: string; rating: number; url: string }[];
  };

  // Tags for semantic search
  tags: string[];
  keywords: string[];

  // For RAG embedding
  embedding?: number[];
  embeddingText: string; // Text used to generate embedding

  // Relationships
  nearbyPlaces?: string[]; // IDs of nearby knowledge nodes
  relatedServices?: string[];
  partOfItinerary?: string[];

  // Admin
  isActive: boolean;
  isPremium: boolean; // Paid listing
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;

  // Custom fields per category
  customFields?: Record<string, any>;
}

// Specialized types for different categories
export interface HotelNode extends KnowledgeNode {
  category: 'hotel';
  customFields: {
    starRating: number;
    roomCount: number;
    amenities: string[];
    roomTypes: {
      name: string;
      pricePerNight: number;
      maxGuests: number;
      features: string[];
    }[];
    checkInTime: string;
    checkOutTime: string;
    isBeachfront: boolean;
    hasPool: boolean;
    hasSpa: boolean;
    hasRestaurant: boolean;
    petFriendly: boolean;
    childFriendly: boolean;
    allInclusive: boolean;
  };
}

export interface RestaurantNode extends KnowledgeNode {
  category: 'restaurant';
  customFields: {
    cuisine: string[];
    mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'brunch')[];
    dressCode?: string;
    hasOutdoorSeating: boolean;
    hasOceanView: boolean;
    vegetarianFriendly: boolean;
    veganOptions: boolean;
    glutenFreeOptions: boolean;
    servesAlcohol: boolean;
    reservationRecommended: boolean;
    averageMealPrice: number;
    specialties: string[];
    michelinStars?: number;
  };
}

export interface VillaRentalNode extends KnowledgeNode {
  category: 'villa_rental';
  customFields: {
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    squareFeet: number;
    amenities: string[];
    hasPool: boolean;
    isBeachfront: boolean;
    hasPrivateBeach: boolean;
    hasStaff: boolean;
    staffIncludes?: string[];
    minimumStay: number;
    pricePerNight: number;
    pricePerWeek?: number;
    securityDeposit?: number;
  };
}

export interface BoatCharterNode extends KnowledgeNode {
  category: 'boat_charter';
  customFields: {
    boatType: 'yacht' | 'catamaran' | 'sailboat' | 'speedboat' | 'fishing_boat';
    length: number;
    capacity: number;
    cabins?: number;
    crewIncluded: boolean;
    crewSize?: number;
    pricePerHour?: number;
    pricePerDay: number;
    pricePerWeek?: number;
    includesFood: boolean;
    includesDrinks: boolean;
    includesWaterToys: boolean;
    waterToys?: string[];
    destinations: string[];
  };
}

// ============ CHAT SYSTEM ============

export interface ChatMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;

  // Rich content
  attachments?: ChatAttachment[];
  places?: PlaceCard[]; // Places mentioned/recommended
  mapMarkers?: MapMarker[];

  // Metadata
  timestamp: string;
  isStreaming?: boolean;

  // RAG context
  ragContext?: {
    usedNodes: string[]; // IDs of knowledge nodes used
    confidence: number;
    sources: { nodeId: string; relevance: number }[];
  };

  // Actions
  suggestedActions?: ChatAction[];
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'pdf' | 'link' | 'receipt' | 'location';
  url: string;
  name: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

export interface PlaceCard {
  nodeId: string;
  name: string;
  category: KnowledgeCategory;
  thumbnail: string;
  rating: number;
  reviewCount: number;
  priceRange: PriceRange;
  shortDescription: string;
  location: {
    latitude: number;
    longitude: number;
    district: string;
  };
  bookingUrl?: string;
  isFeatured?: boolean;
}

export interface MapMarker {
  id: string;
  nodeId?: string;
  latitude: number;
  longitude: number;
  title: string;
  category: KnowledgeCategory;
  isActive?: boolean;
  clusterId?: string;
}

export interface ChatAction {
  id: string;
  type: 'book' | 'call' | 'directions' | 'website' | 'add_to_trip' | 'save' | 'share';
  label: string;
  url?: string;
  nodeId?: string;
  metadata?: Record<string, any>;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;

  // Filters
  filters: ChatFilters;

  // Messages
  messages: ChatMessage[];

  // State
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Associated trip
  tripId?: string;
}

export interface ChatFilters {
  destination?: string;
  dateFrom?: string;
  dateTo?: string;
  travelers?: number;
  budget?: PriceRange;
  interests?: string[];
}

// ============ TRIPS & ITINERARIES ============

export interface Trip {
  id: string;
  userId: string;
  title: string;
  description?: string;

  // Destination
  destination: {
    name: string;
    country: string;
    islands?: string[];
  };

  // Dates
  dateFrom?: string;
  dateTo?: string;
  duration?: number; // days

  // Travelers
  travelers: {
    adults: number;
    children: number;
    infants: number;
  };

  // Budget
  budget?: {
    total?: number;
    perDay?: number;
    currency: string;
    range: PriceRange;
  };

  // Itinerary
  days: TripDay[];

  // Saved places
  savedPlaces: string[]; // Knowledge node IDs

  // Status
  status: 'planning' | 'booked' | 'ongoing' | 'completed';
  isPublic: boolean;

  // Sharing
  shareCode?: string;
  collaborators?: string[];

  // Metadata
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
  createdFromChatId?: string;
}

export interface TripDay {
  id: string;
  dayNumber: number;
  date?: string;
  title?: string;

  items: TripItem[];
}

export interface TripItem {
  id: string;
  nodeId?: string;
  type: 'place' | 'activity' | 'transport' | 'note' | 'accommodation';

  // Timing
  startTime?: string;
  endTime?: string;
  duration?: number; // minutes

  // Details
  title: string;
  description?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };

  // Booking
  isBooked: boolean;
  bookingReference?: string;
  bookingUrl?: string;
  cost?: number;

  // Notes
  notes?: string;
}

// ============ COLLECTIONS ============

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  thumbnail?: string;

  // Items
  items: CollectionItem[];

  // Visibility
  isPublic: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface CollectionItem {
  id: string;
  nodeId: string;
  addedAt: string;
  notes?: string;
}

// ============ INSPIRATION / GUIDES ============

export interface Guide {
  id: string;
  title: string;
  description: string;
  thumbnail: string;

  // Author
  author: {
    id: string;
    name: string;
    avatar?: string;
    isOfficial: boolean;
  };

  // Content
  destination: string;
  duration?: string; // "4 days", "72 hours"
  placesCount: number;
  places: string[]; // Knowledge node IDs

  // Categorization
  tags: string[];
  theme: 'adventure' | 'relaxation' | 'family' | 'romance' | 'culture' | 'food' | 'luxury';

  // Stats
  saves: number;
  views: number;

  // Media
  images: string[];

  // Metadata
  isFeature: boolean;
  createdAt: string;
}

// ============ ADMIN RAG MANAGEMENT ============

export interface RAGNodeDraft {
  category: KnowledgeCategory;
  data: Partial<KnowledgeNode>;
  status: 'draft' | 'review' | 'approved' | 'rejected';
  reviewNotes?: string;
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface RAGSyncLog {
  id: string;
  nodeId: string;
  action: 'create' | 'update' | 'delete' | 'reindex';
  timestamp: string;
  userId: string;
  changes?: Record<string, { old: any; new: any }>;
}

export interface RAGIndexStatus {
  totalNodes: number;
  indexedNodes: number;
  pendingNodes: number;
  lastIndexedAt: string;
  embeddingModel: string;
  vectorDbStatus: 'healthy' | 'degraded' | 'offline';
}

// ============ CHATBOT CONFIG ============

export interface ChatbotConfig {
  // Island configuration
  island: {
    name: string;
    country: string;
    defaultCenter: { lat: number; lng: number };
    defaultZoom: number;
    bounds?: { north: number; south: number; east: number; west: number };
  };

  // Welcome message
  welcomeMessage: {
    title: string;
    subtitle: string;
    suggestedPrompts: string[];
  };

  // AI behavior
  ai: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };

  // Features
  features: {
    voiceInput: boolean;
    fileUpload: boolean;
    tripPlanning: boolean;
    collections: boolean;
    booking: boolean;
    vipServices: boolean;
  };

  // Branding
  branding: {
    primaryColor: string;
    logoUrl: string;
    disclaimerText: string;
    contactEmail: string;
  };
}

// ============ SEARCH & FILTERS ============

export interface SearchQuery {
  text: string;
  filters: {
    categories?: KnowledgeCategory[];
    priceRange?: PriceRange[];
    rating?: number;
    district?: string;
    tags?: string[];
    isOpen?: boolean;
    hasAvailability?: boolean;
  };
  sort?: 'relevance' | 'rating' | 'price_low' | 'price_high' | 'distance';
  location?: { lat: number; lng: number };
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  nodes: KnowledgeNode[];
  total: number;
  facets: {
    categories: { name: string; count: number }[];
    priceRanges: { range: PriceRange; count: number }[];
    districts: { name: string; count: number }[];
  };
}
