// ============================================
// ISLE AI - CAYMAN ISLANDS KNOWLEDGE BASE
// Complete RAG Data for Grand Cayman, Cayman Brac, Little Cayman
// ============================================

import { KnowledgeNode, ChatbotConfig, Guide, KnowledgeCategory, PriceRange, OpeningHoursInfo } from '../types/chatbot';

// Type for unified place data (loaded at runtime from JSON)
export interface UnifiedPlace {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  shortDescription?: string;
  highlights: string[];
  location: {
    island: string;
    area?: string;
    district?: string;
    address?: string;
    coordinates: { lat: number; lng: number };
    googlePlaceId?: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    bookingUrl?: string;
    social?: {
      instagram?: string;
      facebook?: string;
      tripadvisor?: string;
    };
  };
  business: {
    priceRange?: string;
    priceFrom?: number;
    priceTo?: number;
    currency?: string;
    hours: {
      display?: string;
      schedule?: Record<string, { open: string; close: string } | string>;
    };
    reservationRequired?: boolean;
    acceptsCreditCards?: boolean;
    languages?: string[];
  };
  ratings: {
    overall: number;
    reviewCount: number;
    tripadvisorRating?: number;
    googleRating?: number;
  };
  media: {
    thumbnail?: string;
    images?: string[];
    videos?: string[];
  };
  tags?: string[];
  keywords?: string[];
  searchText?: string;
  isActive?: boolean;
  isPremium?: boolean;
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ============ UNIFIED DATA ADAPTER ============
// Converts UnifiedPlace format to KnowledgeNode format for full compatibility
// EXPORTED for use by island-knowledge.ts async loader

export function convertUnifiedToKnowledgeNode(place: UnifiedPlace): KnowledgeNode {
  // Map category to KnowledgeCategory type
  const categoryMap: Record<string, KnowledgeCategory> = {
    'hotel': 'hotel',
    'restaurant': 'restaurant',
    'beach': 'beach',
    'bar': 'bar',
    'nightlife': 'nightlife',
    'diving_snorkeling': 'diving_snorkeling',
    'water_sports': 'water_sports',
    'boat_charter': 'boat_charter',
    'attraction': 'attraction',
    'activity': 'activity',
    'golf': 'golf',
    'shopping': 'shopping',
    'spa_wellness': 'spa_wellness',
    'spa': 'spa',
    'transport': 'transport',
    'transportation': 'transportation',
    'chauffeur': 'chauffeur',
    'flight': 'flight',
    'concierge': 'concierge',
    'service': 'service',
    'financial_services': 'financial_services',
    'medical_vip': 'medical_vip',
    'real_estate': 'real_estate',
    'villa_rental': 'villa_rental',
    'history': 'history',
    'culture': 'culture',
    'wildlife': 'wildlife',
    'emergency': 'emergency',
    'general_info': 'general_info',
    'event': 'event',
    'festival': 'festival'
  };

  const category = categoryMap[place.category] || 'general_info';

  // Convert business hours to OpeningHoursInfo format
  // Filter out 'closed' string values from schedule, keeping only { open, close } objects
  let schedule: Record<string, { open: string; close: string }> | undefined;
  if (place.business.hours.schedule) {
    schedule = {};
    for (const [day, hours] of Object.entries(place.business.hours.schedule)) {
      if (typeof hours === 'object' && hours !== null) {
        schedule[day] = hours;
      }
    }
    if (Object.keys(schedule).length === 0) {
      schedule = undefined;
    }
  }

  const openingHours: OpeningHoursInfo | undefined = place.business.hours.display ? {
    raw: place.business.hours.display,
    formattedDisplay: place.business.hours.display,
    schedule
  } : undefined;

  // Map price range
  const priceRangeMap: Record<string, PriceRange> = {
    '$': '$',
    '$$': '$$',
    '$$$': '$$$',
    '$$$$': '$$$$'
  };
  const priceRange: PriceRange = priceRangeMap[place.business.priceRange || '$$'] || '$$';

  return {
    id: place.id,
    category,
    subcategory: place.subcategory || undefined,
    name: place.name,
    description: place.description,
    shortDescription: place.shortDescription,
    highlights: place.highlights,
    location: {
      address: place.location.address || undefined,
      district: place.location.district || undefined,
      area: place.location.area || undefined,
      island: place.location.island,
      // Support both coordinate formats for maximum compatibility
      latitude: place.location.coordinates.lat,
      longitude: place.location.coordinates.lng,
      coordinates: {
        lat: place.location.coordinates.lat,
        lng: place.location.coordinates.lng
      },
      googlePlaceId: place.location.googlePlaceId || undefined
    },
    contact: {
      phone: place.contact.phone || undefined,
      email: place.contact.email || undefined,
      website: place.contact.website || undefined,
      bookingUrl: place.contact.bookingUrl || undefined,
      instagram: place.contact.social?.instagram || undefined,
      facebook: place.contact.social?.facebook || undefined,
      tripadvisor: place.contact.social?.tripadvisor || undefined
    },
    media: {
      thumbnail: place.media.thumbnail || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800',
      images: place.media.images || [],
      videos: place.media.videos || []
    },
    business: {
      priceRange,
      priceFrom: place.business.priceFrom,
      priceTo: place.business.priceTo,
      currency: place.business.currency || 'USD',
      openingHours,
      reservationRequired: place.business.reservationRequired,
      acceptsCreditCards: place.business.acceptsCreditCards,
      languages: place.business.languages
    },
    ratings: {
      overall: place.ratings.overall || 4.0,
      reviewCount: place.ratings.reviewCount || 0,
      tripadvisorRating: place.ratings.tripadvisorRating || undefined,
      googleRating: place.ratings.googleRating || undefined
    },
    tags: place.tags || [],
    keywords: place.keywords || [],
    embeddingText: place.searchText || `${place.name} ${place.description} ${place.tags?.join(' ') || ''}`,
    isActive: place.isActive,
    isPremium: place.isPremium,
    isFeatured: place.isFeatured,
    createdAt: place.createdAt,
    updatedAt: place.updatedAt,
    createdBy: 'system'
  };
}

// Knowledge base is now loaded at runtime via island-knowledge.ts loadKnowledgeBase()
// This avoids bundling the large JSON file which caused memory issues
const UNIFIED_KNOWLEDGE_NODES: KnowledgeNode[] = [];

// ============ ISLAND CONFIGURATION ============

export const CAYMAN_CONFIG: ChatbotConfig = {
  island: {
    name: 'Cayman Islands',
    country: 'British Overseas Territory',
    defaultCenter: { lat: 19.3133, lng: -81.2546 },
    defaultZoom: 11,
    bounds: {
      north: 19.75,
      south: 19.25,
      east: -79.7,
      west: -81.45
    }
  },
  welcomeMessage: {
    title: 'Hello from the Cayman Islands!',
    subtitle: 'Crystal waters, world-class diving, and Caribbean luxury await. Tell me what you want to see and do, and let\'s plan your perfect island escape.',
    suggestedPrompts: [
      'Find me the best beaches for snorkeling',
      'I\'m looking for a luxury villa with ocean views',
      'What are the best restaurants in George Town?',
      'Plan a romantic getaway for 2',
      'Show me diving spots for beginners',
      'I need a private yacht charter'
    ]
  },
  ai: {
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: `You are Isle AI, an expert travel concierge for the Cayman Islands. You have deep knowledge of:
- All hotels, resorts, and vacation rentals
- Restaurants from casual beach bars to fine dining
- Beaches, diving sites, and water activities
- Local culture, history, and events
- VIP services: yacht charters, private jets, luxury villas
- Real estate and investment opportunities

Always be helpful, warm, and knowledgeable. When recommending places, include specific details like location, price range, and what makes each place special. Use the knowledge base to provide accurate, up-to-date information.

For luxury/VIP requests, highlight exclusive experiences and premium services. For budget travelers, focus on value and local gems.

Always suggest related places or activities when relevant. If asked about booking, provide direct links when available.`
  },
  features: {
    voiceInput: true,
    fileUpload: true,
    tripPlanning: true,
    collections: true,
    booking: true,
    vipServices: true
  },
  branding: {
    primaryColor: '#0EA5E9',
    logoUrl: '/logo-cayman.svg',
    disclaimerText: 'Isle AI can make mistakes. Please verify important details directly with providers.',
    contactEmail: 'concierge@isleai.com'
  }
};

// ============ GENERAL KNOWLEDGE ============

export const CAYMAN_GENERAL_INFO: KnowledgeNode[] = [
  {
    id: 'gen-001',
    category: 'general_info',
    name: 'Cayman Islands Overview',
    description: `The Cayman Islands is a British Overseas Territory in the western Caribbean Sea comprising three islands: Grand Cayman, Cayman Brac, and Little Cayman. Known for world-class diving, pristine beaches, and as a major offshore financial center.

The islands offer a unique blend of Caribbean relaxation and international sophistication. With no direct taxation, it has become a haven for high-net-worth individuals and international businesses.

**Grand Cayman** is the largest and most developed island, home to the capital George Town, famous Seven Mile Beach, and most tourist facilities.

**Cayman Brac** is known for dramatic bluff formations, excellent diving, and a more laid-back atmosphere.

**Little Cayman** is the smallest and least developed, offering pristine nature and world-famous Bloody Bay Wall diving.`,
    shortDescription: 'Three stunning Caribbean islands offering world-class diving, beaches, and luxury experiences.',
    location: {
      address: 'Cayman Islands',
      district: 'Caribbean',
      island: 'Grand Cayman',
      latitude: 19.3133,
      longitude: -81.2546
    },
    contact: {
      website: 'https://www.visitcaymanislands.com',
      email: 'info@visitcaymanislands.com'
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800',
      images: [
        'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1200',
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200'
      ]
    },
    business: {
      priceRange: '$$',
      currency: 'KYD'
    },
    ratings: {
      overall: 4.9,
      reviewCount: 0
    },
    tags: ['caribbean', 'british overseas territory', 'islands', 'diving', 'beaches', 'offshore finance', 'luxury'],
    keywords: ['cayman islands', 'grand cayman', 'caribbean vacation', 'island paradise'],
    embeddingText: 'Cayman Islands British Overseas Territory Caribbean three islands Grand Cayman Cayman Brac Little Cayman diving beaches luxury offshore finance tax haven Seven Mile Beach George Town pristine waters coral reefs',
    isActive: true,
    isPremium: false,
    isFeatured: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    createdBy: 'system'
  },
  {
    id: 'gen-002',
    category: 'visa_travel',
    name: 'Entry Requirements & Travel Info',
    description: `**Entry Requirements:**
- US, UK, Canadian, and EU citizens: No visa required for stays up to 6 months
- Valid passport required (6 months validity recommended)
- Return/onward ticket required
- Proof of accommodation may be requested
- No COVID-19 vaccination or testing requirements (as of 2024)

**Getting There:**
- Owen Roberts International Airport (GCM) on Grand Cayman
- Direct flights from Miami (1 hr), New York (3.5 hrs), London (10 hrs)
- Major airlines: Cayman Airways, American, Delta, United, JetBlue, British Airways

**Currency:**
- Cayman Islands Dollar (KYD)
- 1 KYD = 1.20 USD (fixed rate)
- US Dollars widely accepted

**Best Time to Visit:**
- Peak Season: December - April (dry, 75-85°F)
- Shoulder Season: May - June, November
- Hurricane Season: July - October (lower prices)

**Getting Around:**
- Rental cars available (drive on LEFT side)
- Taxis available but expensive
- Public buses on Grand Cayman
- Inter-island flights to Cayman Brac and Little Cayman`,
    shortDescription: 'Essential travel information including visas, flights, currency, and best times to visit.',
    location: {
      address: 'Owen Roberts International Airport',
      district: 'George Town',
      island: 'Grand Cayman',
      latitude: 19.2928,
      longitude: -81.3577
    },
    contact: {
      website: 'https://www.caymanairports.com'
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800',
      images: []
    },
    business: {
      priceRange: '$$',
      currency: 'KYD'
    },
    ratings: {
      overall: 4.5,
      reviewCount: 0
    },
    tags: ['travel', 'visa', 'airport', 'flights', 'entry requirements', 'currency'],
    keywords: ['cayman visa', 'travel to cayman', 'cayman airport', 'flights to cayman'],
    embeddingText: 'Cayman Islands entry requirements visa passport travel flights airport Owen Roberts International direct flights Miami New York London currency KYD dollars best time visit weather hurricane season rental cars taxis',
    isActive: true,
    isPremium: false,
    isFeatured: false,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    createdBy: 'system'
  }
];

// ============ LUXURY HOTELS & RESORTS ============

export const CAYMAN_HOTELS: KnowledgeNode[] = [
  // ===== LUXURY TIER =====
  {
    id: 'hotel-001',
    category: 'hotel',
    name: 'The Ritz-Carlton, Grand Cayman',
    description: `The most luxurious resort in the Cayman Islands, The Ritz-Carlton Grand Cayman offers an unparalleled Caribbean experience on the famous Seven Mile Beach.

**Highlights:**
- 375 rooms and suites with ocean or garden views
- La Prairie Spa - the only one in the Caribbean
- Blue by Eric Ripert - Michelin-starred chef's restaurant
- Nine-acre resort with lush tropical gardens
- Silver Rain Spa and wellness programs
- Jean-Michel Cousteau's Ambassadors of the Environment program
- Greg Norman-designed golf course nearby
- Private beach with water sports

**Dining:**
- Blue by Eric Ripert (fine dining seafood)
- Seven (steakhouse)
- Andiamo (Italian)
- Bar Jack (poolside)
- Silver Palm Lounge

Perfect for: Honeymooners, luxury travelers, families seeking premium amenities, golf enthusiasts`,
    shortDescription: 'Iconic luxury resort on Seven Mile Beach with world-class dining and La Prairie Spa.',
    location: {
      address: 'West Bay Road, Seven Mile Beach',
      district: 'Seven Mile Beach',
      island: 'Grand Cayman',
      latitude: 19.3405,
      longitude: -81.3869,
      googlePlaceId: 'ChIJK8nK_eBDQIwRtMCME0qI_00'
    },
    contact: {
      phone: '+1-345-943-9000',
      email: 'reservations.grandcayman@ritzcarlton.com',
      website: 'https://www.ritzcarlton.com/en/hotels/caribbean/grand-cayman',
      bookingUrl: 'https://www.ritzcarlton.com/en/hotels/caribbean/grand-cayman/rooms-suites',
      instagram: 'ritzcarlton',
      tripadvisor: 'https://www.tripadvisor.com/Hotel_Review-g147367-d148527-Reviews-The_Ritz_Carlton_Grand_Cayman'
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200'
      ]
    },
    business: {
      priceRange: '$$$$$',
      priceFrom: 800,
      priceTo: 5000,
      currency: 'USD',
      openingHours: {
        monday: { open: '00:00', close: '23:59' },
        tuesday: { open: '00:00', close: '23:59' },
        wednesday: { open: '00:00', close: '23:59' },
        thursday: { open: '00:00', close: '23:59' },
        friday: { open: '00:00', close: '23:59' },
        saturday: { open: '00:00', close: '23:59' },
        sunday: { open: '00:00', close: '23:59' }
      },
      reservationRequired: true,
      acceptsCreditCards: true,
      languages: ['English', 'Spanish']
    },
    ratings: {
      overall: 4.8,
      reviewCount: 2847,
      tripadvisorRating: 4.5,
      googleRating: 4.6
    },
    tags: ['luxury', 'beachfront', 'spa', 'fine dining', 'golf', 'family friendly', 'honeymoon', 'five star'],
    keywords: ['ritz carlton cayman', 'luxury hotel cayman', 'seven mile beach hotel', 'best hotel cayman'],
    embeddingText: 'Ritz-Carlton Grand Cayman luxury resort Seven Mile Beach five star hotel La Prairie Spa Blue Eric Ripert fine dining beachfront rooms suites golf Jean-Michel Cousteau honeymoon family Caribbean best hotel premium',
    isActive: true,
    isPremium: true,
    isFeatured: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    createdBy: 'system',
    customFields: {
      starRating: 5,
      roomCount: 375,
      amenities: ['spa', 'pool', 'beach', 'golf', 'restaurants', 'fitness center', 'kids club', 'water sports', 'tennis'],
      checkInTime: '16:00',
      checkOutTime: '12:00',
      isBeachfront: true,
      hasPool: true,
      hasSpa: true,
      hasRestaurant: true,
      petFriendly: false,
      childFriendly: true,
      allInclusive: false
    }
  },
  {
    id: 'hotel-002',
    category: 'hotel',
    name: 'Kimpton Seafire Resort + Spa',
    description: `A stunning contemporary resort that redefines Caribbean luxury, Kimpton Seafire offers sophisticated design meets island paradise on Seven Mile Beach.

**Highlights:**
- 266 rooms and suites with floor-to-ceiling windows
- Award-winning FLOAT spa
- Infinity pool overlooking the Caribbean
- Direct beach access on Seven Mile Beach
- Ave restaurant by acclaimed chef Eric Ripert
- Coccoloba beachside dining
- State-of-the-art fitness center
- Complimentary bike rentals

**Unique Features:**
- No resort fees
- Complimentary wine hour daily
- In-room yoga mats
- Pet-friendly

Perfect for: Design enthusiasts, foodies, couples, wellness travelers`,
    shortDescription: 'Contemporary luxury resort with award-winning spa and renowned dining on Seven Mile Beach.',
    location: {
      address: '60 Tanager Way, Seven Mile Beach',
      district: 'Seven Mile Beach',
      island: 'Grand Cayman',
      latitude: 19.3511,
      longitude: -81.3921,
      googlePlaceId: 'ChIJt3LlGOdDQIwRZu8ZdNtE_nY'
    },
    contact: {
      phone: '+1-345-746-0000',
      email: 'reservations@seafireresortandspa.com',
      website: 'https://www.seafireresortandspa.com',
      bookingUrl: 'https://www.seafireresortandspa.com/rooms',
      instagram: 'seafirecayman'
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
      images: []
    },
    business: {
      priceRange: '$$$$',
      priceFrom: 500,
      priceTo: 3000,
      currency: 'USD',
      reservationRequired: true,
      acceptsCreditCards: true,
      languages: ['English', 'Spanish']
    },
    ratings: {
      overall: 4.7,
      reviewCount: 1823,
      tripadvisorRating: 4.5,
      googleRating: 4.5
    },
    tags: ['luxury', 'beachfront', 'spa', 'contemporary', 'fine dining', 'pet friendly', 'wellness'],
    keywords: ['kimpton seafire', 'luxury hotel cayman', 'seven mile beach resort', 'modern hotel'],
    embeddingText: 'Kimpton Seafire Resort Spa Seven Mile Beach luxury contemporary design infinity pool FLOAT spa Ave restaurant Eric Ripert beachfront modern Caribbean pet friendly wellness yoga no resort fees',
    isActive: true,
    isPremium: true,
    isFeatured: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    createdBy: 'system',
    customFields: {
      starRating: 5,
      roomCount: 266,
      amenities: ['spa', 'pool', 'beach', 'restaurants', 'fitness center', 'bikes', 'yoga'],
      checkInTime: '16:00',
      checkOutTime: '11:00',
      isBeachfront: true,
      hasPool: true,
      hasSpa: true,
      hasRestaurant: true,
      petFriendly: true,
      childFriendly: true,
      allInclusive: false
    }
  },
  {
    id: 'hotel-003',
    category: 'hotel',
    name: 'The Westin Grand Cayman Seven Mile Beach Resort & Spa',
    description: `Located directly on Seven Mile Beach, The Westin offers a perfect blend of comfort and Caribbean beauty with extensive facilities and a prime location.

**Highlights:**
- 343 rooms and suites
- Two stunning pools including adults-only
- Hibiscus Spa
- Direct beach access
- Multiple dining options including Ferdinand's
- Kids Club
- Wedding and event facilities
- Water sports center

Perfect for: Families, couples, business travelers, wedding parties`,
    shortDescription: 'Full-service beachfront resort with family-friendly amenities on Seven Mile Beach.',
    location: {
      address: 'West Bay Road, Seven Mile Beach',
      district: 'Seven Mile Beach',
      island: 'Grand Cayman',
      latitude: 19.3285,
      longitude: -81.3795
    },
    contact: {
      phone: '+1-345-945-3800',
      website: 'https://www.marriott.com/hotels/travel/gcmwi-the-westin-grand-cayman-seven-mile-beach-resort-and-spa/',
      bookingUrl: 'https://www.marriott.com/reservation/availabilitySearch.mi'
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800',
      images: []
    },
    business: {
      priceRange: '$$$',
      priceFrom: 350,
      priceTo: 1500,
      currency: 'USD',
      reservationRequired: true,
      acceptsCreditCards: true
    },
    ratings: {
      overall: 4.5,
      reviewCount: 3241,
      tripadvisorRating: 4.0,
      googleRating: 4.3
    },
    tags: ['beachfront', 'family', 'spa', 'pools', 'wedding', 'kids club', 'water sports'],
    keywords: ['westin cayman', 'family hotel cayman', 'seven mile beach westin', 'marriott cayman'],
    embeddingText: 'Westin Grand Cayman Seven Mile Beach Resort Spa beachfront family friendly pools Hibiscus Spa kids club wedding facilities water sports Marriott Caribbean vacation',
    isActive: true,
    isPremium: false,
    isFeatured: false,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    createdBy: 'system',
    customFields: {
      starRating: 4,
      roomCount: 343,
      amenities: ['spa', 'pools', 'beach', 'restaurants', 'fitness', 'kids club', 'water sports'],
      checkInTime: '16:00',
      checkOutTime: '11:00',
      isBeachfront: true,
      hasPool: true,
      hasSpa: true,
      hasRestaurant: true,
      petFriendly: false,
      childFriendly: true,
      allInclusive: false
    }
  },
  // ===== MORE LUXURY HOTELS =====
  {
    id: 'hotel-004',
    category: 'hotel',
    name: 'Palm Heights Grand Cayman',
    description: `A stylish boutique hotel blending Caribbean soul with modern luxury. Palm Heights offers an intimate, design-forward experience on Seven Mile Beach.

**Highlights:**
- 50 individually designed rooms and suites
- Tillies restaurant - farm-to-table Caribbean cuisine
- Coconut Club beach bar
- Fitness center and yoga
- Curated art collection throughout
- Intimate, boutique atmosphere

Perfect for: Design lovers, couples, creative professionals`,
    shortDescription: 'Stylish boutique hotel with Caribbean soul and modern design on Seven Mile Beach.',
    location: {
      address: 'West Bay Road, Seven Mile Beach',
      district: 'Seven Mile Beach',
      island: 'Grand Cayman',
      latitude: 19.3445,
      longitude: -81.3885
    },
    contact: {
      phone: '+1-345-949-4111',
      website: 'https://www.palmheights.com'
    },
    media: { thumbnail: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 450, priceTo: 1200, currency: 'USD', reservationRequired: true, acceptsCreditCards: true },
    ratings: { overall: 4.7, reviewCount: 456 },
    tags: ['boutique', 'design', 'beachfront', 'intimate', 'trendy'],
    keywords: ['palm heights', 'boutique hotel cayman', 'design hotel'],
    embeddingText: 'Palm Heights boutique hotel Seven Mile Beach design Caribbean modern intimate Tillies restaurant Coconut Club trendy couples',
    isActive: true, isPremium: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { starRating: 5, roomCount: 50, isBeachfront: true, hasPool: true, hasSpa: false, hasRestaurant: true }
  },
  {
    id: 'hotel-005',
    category: 'hotel',
    name: 'Grand Cayman Marriott Beach Resort',
    description: `Full-service resort on Seven Mile Beach offering excellent value with premium amenities and a fantastic location.

**Highlights:**
- 295 rooms with ocean or garden views
- Direct beach access
- La Mer Spa
- Anchor & Den restaurant
- Adults-only and family pools
- Water sports center`,
    shortDescription: 'Full-service beach resort with excellent amenities on Seven Mile Beach.',
    location: {
      address: '389 West Bay Road',
      district: 'Seven Mile Beach',
      island: 'Grand Cayman',
      latitude: 19.3320,
      longitude: -81.3810
    },
    contact: { phone: '+1-345-949-0088', website: 'https://www.marriott.com/gcmgc' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 280, priceTo: 800, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 2134 },
    tags: ['beachfront', 'family', 'spa', 'pools', 'value'],
    keywords: ['marriott cayman', 'beach resort cayman'],
    embeddingText: 'Grand Cayman Marriott Beach Resort Seven Mile Beach spa pools family friendly water sports value',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { starRating: 4, roomCount: 295, isBeachfront: true, hasPool: true, hasSpa: true, hasRestaurant: true }
  },
  {
    id: 'hotel-006',
    category: 'hotel',
    name: 'Caribbean Club',
    description: `Exclusive luxury condominiums on Seven Mile Beach offering residential-style accommodations with five-star service.

**Highlights:**
- Spacious 2-4 bedroom oceanfront condos
- Full kitchens and living areas
- Private balconies with ocean views
- Luca restaurant
- Two pools
- Fitness center

Perfect for: Extended stays, families, groups`,
    shortDescription: 'Exclusive luxury condos with full kitchens and oceanfront views.',
    location: {
      address: 'West Bay Road, Seven Mile Beach',
      district: 'Seven Mile Beach',
      island: 'Grand Cayman',
      latitude: 19.3465,
      longitude: -81.3895
    },
    contact: { phone: '+1-345-623-4500', website: 'https://www.caribclub.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 600, priceTo: 2500, currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 342 },
    tags: ['condos', 'oceanfront', 'luxury', 'family', 'extended stay'],
    keywords: ['caribbean club cayman', 'luxury condo cayman'],
    embeddingText: 'Caribbean Club luxury condos Seven Mile Beach oceanfront full kitchen family extended stay pools Luca restaurant',
    isActive: true, isPremium: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { starRating: 5, roomCount: 37, isBeachfront: true, hasPool: true, hasSpa: false, hasRestaurant: true }
  },
  {
    id: 'hotel-007',
    category: 'hotel',
    name: 'Sunset House',
    description: `Legendary dive resort known worldwide among scuba enthusiasts. Home to the famous underwater mermaid statue and house reef.

**Highlights:**
- On-site dive operation
- House reef accessible 24/7
- Underwater bronze mermaid statue
- My Bar - famous seaside bar
- Dive equipment storage
- Camera room for photographers

Perfect for: Divers, underwater photographers, dive groups`,
    shortDescription: 'Legendary dive resort with famous house reef and underwater mermaid statue.',
    location: {
      address: 'S Church Street, George Town',
      district: 'George Town',
      island: 'Grand Cayman',
      latitude: 19.2845,
      longitude: -81.3895
    },
    contact: { phone: '+1-345-949-7111', website: 'https://www.sunsethouse.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 150, priceTo: 350, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 1876 },
    tags: ['diving', 'house reef', 'budget friendly', 'legendary'],
    keywords: ['sunset house cayman', 'dive resort cayman', 'mermaid statue'],
    embeddingText: 'Sunset House dive resort George Town house reef mermaid statue My Bar scuba diving underwater photography',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { starRating: 3, roomCount: 58, isBeachfront: false, hasPool: true, hasSpa: false, hasRestaurant: true }
  },
  {
    id: 'hotel-008',
    category: 'hotel',
    name: 'Compass Point Dive Resort',
    description: `Intimate oceanfront dive resort on the quieter East End, offering exceptional diving and a peaceful retreat.

**Highlights:**
- Ocean Edge dive operation
- Pristine East End diving
- Oceanfront condos
- Full kitchens
- Dock for boat access
- Tranquil atmosphere`,
    shortDescription: 'Intimate East End dive resort with oceanfront condos and excellent diving.',
    location: {
      address: 'Austin Conolly Drive, East End',
      district: 'East End',
      island: 'Grand Cayman',
      latitude: 19.3078,
      longitude: -81.1134
    },
    contact: { phone: '+1-345-947-7500', website: 'https://www.compasspoint.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 175, priceTo: 400, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 567 },
    tags: ['diving', 'east end', 'quiet', 'oceanfront', 'condos'],
    keywords: ['compass point cayman', 'east end hotel', 'dive resort'],
    embeddingText: 'Compass Point Dive Resort East End oceanfront diving quiet peaceful condos Ocean Edge',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { starRating: 3, roomCount: 28, isBeachfront: true, hasPool: true, hasSpa: false, hasRestaurant: false }
  },
  {
    id: 'hotel-009',
    category: 'hotel',
    name: 'Turtle Nest Inn',
    description: `Charming beachside inn on the peaceful East End, offering authentic Caymanian hospitality and stunning reef access.

**Highlights:**
- Direct beach and reef access
- Quiet East End location
- Homestyle breakfast included
- Snorkeling from shore
- Garden setting
- Airport transfers available`,
    shortDescription: 'Charming beachside inn on quiet East End with reef access.',
    location: {
      address: 'Bodden Town Road, Bodden Town',
      district: 'Bodden Town',
      island: 'Grand Cayman',
      latitude: 19.2845,
      longitude: -81.2456
    },
    contact: { phone: '+1-345-947-8665', website: 'https://www.turtlenestinn.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 120, priceTo: 250, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 432 },
    tags: ['budget', 'authentic', 'snorkeling', 'quiet', 'breakfast included'],
    keywords: ['turtle nest inn', 'budget hotel cayman', 'bodden town hotel'],
    embeddingText: 'Turtle Nest Inn Bodden Town beachside inn reef snorkeling breakfast authentic Caymanian hospitality budget friendly',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { starRating: 3, roomCount: 8, isBeachfront: true, hasPool: false, hasSpa: false, hasRestaurant: false }
  },
  {
    id: 'hotel-010',
    category: 'hotel',
    name: 'Wyndham Reef Resort Grand Cayman',
    description: `All-inclusive resort on the East End, offering a complete vacation package with meals, drinks, and activities.

**Highlights:**
- All-inclusive option
- Private beach
- Multiple restaurants
- Water sports included
- Spa services
- Golf nearby`,
    shortDescription: 'All-inclusive resort on East End with private beach and water sports.',
    location: {
      address: '2221 Queens Highway, East End',
      district: 'East End',
      island: 'Grand Cayman',
      latitude: 19.2967,
      longitude: -81.0978
    },
    contact: { phone: '+1-345-947-3100', website: 'https://www.wyndhamreefresort.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 350, priceTo: 700, currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 1567 },
    tags: ['all-inclusive', 'east end', 'beach', 'family', 'water sports'],
    keywords: ['wyndham reef resort', 'all inclusive cayman', 'east end resort'],
    embeddingText: 'Wyndham Reef Resort East End all-inclusive beach water sports family spa golf',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { starRating: 4, roomCount: 152, isBeachfront: true, hasPool: true, hasSpa: true, hasRestaurant: true, allInclusive: true }
  },
  // ===== CAYMAN BRAC HOTELS =====
  {
    id: 'hotel-011',
    category: 'hotel',
    name: 'Cayman Brac Beach Resort',
    description: `Premier dive resort on Cayman Brac, offering exceptional diving, a beautiful beach, and true island tranquility.

**Highlights:**
- Reef Divers on-site
- World-class wall diving
- Private beach
- Pool and hot tub
- All-inclusive packages
- Air-conditioned rooms`,
    shortDescription: 'Premier dive resort on Cayman Brac with world-class wall diving.',
    location: {
      address: 'West End, Cayman Brac',
      district: 'West End',
      island: 'Cayman Brac',
      latitude: 19.6889,
      longitude: -79.8856
    },
    contact: { phone: '+1-345-948-1323', website: 'https://www.caymanbrackbeachresort.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 180, priceTo: 450, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 678 },
    tags: ['diving', 'cayman brac', 'beach', 'quiet', 'all-inclusive'],
    keywords: ['cayman brac resort', 'brac diving', 'sister islands'],
    embeddingText: 'Cayman Brac Beach Resort diving wall diving Reef Divers beach pool Sister Islands quiet tranquil',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { starRating: 3, roomCount: 40, isBeachfront: true, hasPool: true, hasSpa: false, hasRestaurant: true }
  },
  {
    id: 'hotel-012',
    category: 'hotel',
    name: 'Le Soleil d\'Or',
    description: `Unique farm-to-table boutique resort on Cayman Brac, combining organic farming with Caribbean hospitality.

**Highlights:**
- On-site organic farm
- Farm-to-table restaurant
- Cooking classes
- Nature trails
- Eco-friendly practices
- Peaceful retreat`,
    shortDescription: 'Boutique farm-to-table resort with organic farm on Cayman Brac.',
    location: {
      address: 'Spot Bay, Cayman Brac',
      district: 'Spot Bay',
      island: 'Cayman Brac',
      latitude: 19.7234,
      longitude: -79.7567
    },
    contact: { phone: '+1-345-948-0356', website: 'https://www.lesoleilcayman.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 250, priceTo: 500, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 234 },
    tags: ['boutique', 'farm-to-table', 'eco-friendly', 'cayman brac', 'unique'],
    keywords: ['le soleil dor', 'farm resort cayman', 'eco resort'],
    embeddingText: 'Le Soleil dOr Cayman Brac boutique farm-to-table organic cooking classes eco-friendly sustainable',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { starRating: 4, roomCount: 12, isBeachfront: false, hasPool: true, hasSpa: false, hasRestaurant: true }
  },
  // ===== LITTLE CAYMAN HOTELS =====
  {
    id: 'hotel-013',
    category: 'hotel',
    name: 'Little Cayman Beach Resort',
    description: `Premier dive resort on Little Cayman, gateway to the legendary Bloody Bay Wall - consistently rated among the world's best dive sites.

**Highlights:**
- Reef Divers operation
- Bloody Bay Wall access
- All-inclusive packages
- Beachfront location
- Pool and jacuzzi
- Island Bar & Grill`,
    shortDescription: 'Premier dive resort with access to legendary Bloody Bay Wall.',
    location: {
      address: 'Blossom Village, Little Cayman',
      district: 'Blossom Village',
      island: 'Little Cayman',
      latitude: 19.6745,
      longitude: -80.0567
    },
    contact: { phone: '+1-345-948-1033', website: 'https://www.littlecayman.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 300, priceTo: 600, currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 567 },
    tags: ['diving', 'little cayman', 'bloody bay wall', 'all-inclusive', 'world class'],
    keywords: ['little cayman resort', 'bloody bay wall diving', 'best dive resort'],
    embeddingText: 'Little Cayman Beach Resort diving Bloody Bay Wall world best dive site Reef Divers all-inclusive beachfront',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { starRating: 4, roomCount: 40, isBeachfront: true, hasPool: true, hasSpa: false, hasRestaurant: true, allInclusive: true }
  },
  {
    id: 'hotel-014',
    category: 'hotel',
    name: 'Southern Cross Club',
    description: `Exclusive boutique resort on Little Cayman offering world-class diving, fishing, and birding in pristine surroundings.

**Highlights:**
- Private beach bungalows
- World-class diving
- Bonefishing flats
- Bird sanctuary access
- Gourmet dining
- Intimate atmosphere`,
    shortDescription: 'Exclusive boutique resort for diving, fishing, and birding on Little Cayman.',
    location: {
      address: 'South Hole Sound, Little Cayman',
      district: 'South Hole Sound',
      island: 'Little Cayman',
      latitude: 19.6612,
      longitude: -80.0834
    },
    contact: { phone: '+1-345-948-1099', website: 'https://www.southerncrossclub.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 450, priceTo: 900, currency: 'USD' },
    ratings: { overall: 4.9, reviewCount: 345 },
    tags: ['boutique', 'diving', 'fishing', 'birding', 'exclusive', 'little cayman'],
    keywords: ['southern cross club', 'little cayman boutique', 'bonefishing cayman'],
    embeddingText: 'Southern Cross Club Little Cayman boutique exclusive diving bonefishing birding private beach bungalows gourmet',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { starRating: 4, roomCount: 14, isBeachfront: true, hasPool: false, hasSpa: false, hasRestaurant: true }
  }
];

// ============ RESTAURANTS ============

export const CAYMAN_RESTAURANTS: KnowledgeNode[] = [
  {
    id: 'rest-001',
    category: 'restaurant',
    name: 'Blue by Eric Ripert',
    description: `A Caribbean culinary destination by acclaimed Michelin-starred chef Eric Ripert. Located at The Ritz-Carlton, Blue offers an extraordinary seafood-focused dining experience.

**The Experience:**
- Tasting menus showcasing the freshest Caribbean seafood
- Wine pairings curated by expert sommeliers
- Elegant oceanfront setting
- Impeccable service

**Signature Dishes:**
- Yellowfin Tuna "Cayman Style"
- Poached Lobster with truffled pasta
- Local Red Snapper preparations
- Decadent dessert tasting

**Good to Know:**
- Reservations essential (book weeks ahead)
- Smart elegant dress code
- Prix fixe menus starting at $185
- Private dining available

Perfect for: Special occasions, foodies, romantic dinners, culinary experiences`,
    shortDescription: 'Michelin-starred chef Eric Ripert\'s oceanfront fine dining at The Ritz-Carlton.',
    location: {
      address: 'The Ritz-Carlton, West Bay Road',
      district: 'Seven Mile Beach',
      island: 'Grand Cayman',
      latitude: 19.3405,
      longitude: -81.3869
    },
    contact: {
      phone: '+1-345-943-9000',
      website: 'https://www.ritzcarlton.com/en/hotels/caribbean/grand-cayman/dining/blue',
      bookingUrl: 'https://www.opentable.com/blue-by-eric-ripert'
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
      images: []
    },
    business: {
      priceRange: '$$$$$',
      priceFrom: 185,
      priceTo: 400,
      currency: 'USD',
      openingHours: {
        monday: 'closed',
        tuesday: { open: '18:00', close: '22:00' },
        wednesday: { open: '18:00', close: '22:00' },
        thursday: { open: '18:00', close: '22:00' },
        friday: { open: '18:00', close: '22:00' },
        saturday: { open: '18:00', close: '22:00' },
        sunday: 'closed'
      },
      reservationRequired: true,
      acceptsCreditCards: true
    },
    ratings: {
      overall: 4.9,
      reviewCount: 892,
      tripadvisorRating: 4.5,
      googleRating: 4.7
    },
    tags: ['fine dining', 'seafood', 'michelin chef', 'romantic', 'special occasion', 'oceanfront'],
    keywords: ['blue eric ripert', 'fine dining cayman', 'best restaurant cayman', 'ritz carlton restaurant'],
    embeddingText: 'Blue Eric Ripert Ritz-Carlton fine dining seafood Michelin starred chef tasting menu wine pairing oceanfront elegant romantic special occasion best restaurant Grand Cayman Caribbean culinary',
    isActive: true,
    isPremium: true,
    isFeatured: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    createdBy: 'system',
    customFields: {
      cuisine: ['Seafood', 'French', 'Caribbean'],
      mealTypes: ['dinner'],
      dressCode: 'Smart Elegant',
      hasOutdoorSeating: true,
      hasOceanView: true,
      vegetarianFriendly: true,
      veganOptions: true,
      glutenFreeOptions: true,
      servesAlcohol: true,
      reservationRecommended: true,
      averageMealPrice: 250,
      specialties: ['Seafood Tasting Menu', 'Wine Pairing']
    }
  },
  {
    id: 'rest-002',
    category: 'restaurant',
    name: 'Agua Restaurant',
    description: `Contemporary Caribbean cuisine in a stunning oceanfront setting in Camana Bay. Agua combines fresh local ingredients with international techniques.

**The Experience:**
- Open-air dining overlooking the harbor
- Fresh daily catch and local ingredients
- Creative cocktail program
- Sunset views

**Popular Dishes:**
- Ceviche trio
- Grilled local catch with mango salsa
- Caribbean spiced lamb
- Key lime pie

**Good to Know:**
- Great for sunset dinner
- Reservations recommended for weekends
- Happy hour 5-7pm
- Live music some evenings

Perfect for: Casual fine dining, sunset dinners, date nights, foodies`,
    shortDescription: 'Contemporary oceanfront dining with Caribbean-inspired cuisine in Camana Bay.',
    location: {
      address: 'Camana Bay, Grand Cayman',
      district: 'Camana Bay',
      island: 'Grand Cayman',
      latitude: 19.3271,
      longitude: -81.3775
    },
    contact: {
      phone: '+1-345-949-2482',
      website: 'https://agua.ky',
      bookingUrl: 'https://www.opentable.com/agua'
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
      images: []
    },
    business: {
      priceRange: '$$$',
      priceFrom: 50,
      priceTo: 150,
      currency: 'USD',
      openingHours: {
        monday: { open: '11:30', close: '22:00' },
        tuesday: { open: '11:30', close: '22:00' },
        wednesday: { open: '11:30', close: '22:00' },
        thursday: { open: '11:30', close: '22:00' },
        friday: { open: '11:30', close: '23:00' },
        saturday: { open: '11:30', close: '23:00' },
        sunday: { open: '11:30', close: '22:00' }
      },
      reservationRequired: false,
      acceptsCreditCards: true
    },
    ratings: {
      overall: 4.6,
      reviewCount: 1234,
      tripadvisorRating: 4.5,
      googleRating: 4.4
    },
    tags: ['oceanfront', 'caribbean', 'seafood', 'cocktails', 'sunset', 'camana bay'],
    keywords: ['agua restaurant', 'camana bay restaurant', 'caribbean dining', 'sunset dinner cayman'],
    embeddingText: 'Agua Restaurant Camana Bay oceanfront Caribbean cuisine fresh seafood sunset dinner cocktails harbor view contemporary dining Grand Cayman date night',
    isActive: true,
    isPremium: false,
    isFeatured: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    createdBy: 'system',
    customFields: {
      cuisine: ['Caribbean', 'Seafood', 'International'],
      mealTypes: ['lunch', 'dinner'],
      dressCode: 'Smart Casual',
      hasOutdoorSeating: true,
      hasOceanView: true,
      vegetarianFriendly: true,
      veganOptions: true,
      glutenFreeOptions: true,
      servesAlcohol: true,
      reservationRecommended: true,
      averageMealPrice: 75,
      specialties: ['Fresh Ceviche', 'Daily Catch']
    }
  },
  {
    id: 'rest-003',
    category: 'restaurant',
    name: 'Kaibo Beach Bar & Restaurant',
    description: `Iconic beachside restaurant on the North Side, famous for rum punch, fresh seafood, and Caribbean vibes. A must-visit for authentic island atmosphere.

**The Experience:**
- Feet-in-the-sand dining
- Famous rum punch
- Live music weekends
- Stunning Rum Point beach

**Popular Dishes:**
- Conch fritters
- Jerk chicken
- Fish tacos
- Grilled lobster (seasonal)

**Don't Miss:**
- Sunday brunch
- Full moon parties
- Paddleboard rentals
- Hammock lounging

Perfect for: Beach lovers, casual dining, local experience, groups`,
    shortDescription: 'Iconic beach bar at Rum Point serving Caribbean favorites with live music and island vibes.',
    location: {
      address: 'Rum Point, North Side',
      district: 'North Side',
      island: 'Grand Cayman',
      latitude: 19.3697,
      longitude: -81.2631
    },
    contact: {
      phone: '+1-345-947-9975',
      website: 'https://kaibo.ky'
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800',
      images: []
    },
    business: {
      priceRange: '$$',
      priceFrom: 20,
      priceTo: 60,
      currency: 'USD',
      openingHours: {
        monday: { open: '11:00', close: '21:00' },
        tuesday: { open: '11:00', close: '21:00' },
        wednesday: { open: '11:00', close: '21:00' },
        thursday: { open: '11:00', close: '21:00' },
        friday: { open: '11:00', close: '22:00' },
        saturday: { open: '11:00', close: '22:00' },
        sunday: { open: '10:00', close: '21:00' }
      },
      reservationRequired: false,
      acceptsCreditCards: true
    },
    ratings: {
      overall: 4.4,
      reviewCount: 2156,
      tripadvisorRating: 4.0,
      googleRating: 4.3
    },
    tags: ['beach bar', 'casual', 'live music', 'rum point', 'local', 'caribbean', 'family friendly'],
    keywords: ['kaibo', 'rum point restaurant', 'beach bar cayman', 'casual dining cayman'],
    embeddingText: 'Kaibo Beach Bar Rum Point North Side beach restaurant casual dining Caribbean rum punch conch fritters jerk chicken live music local experience feet sand hammocks paddleboard',
    isActive: true,
    isPremium: false,
    isFeatured: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    createdBy: 'system',
    customFields: {
      cuisine: ['Caribbean', 'Seafood', 'American'],
      mealTypes: ['brunch', 'lunch', 'dinner'],
      dressCode: 'Casual',
      hasOutdoorSeating: true,
      hasOceanView: true,
      vegetarianFriendly: true,
      veganOptions: false,
      glutenFreeOptions: true,
      servesAlcohol: true,
      reservationRecommended: false,
      averageMealPrice: 35,
      specialties: ['Rum Punch', 'Conch Fritters', 'Fish Tacos']
    }
  },
  // ===== MORE RESTAURANTS =====
  {
    id: 'rest-004',
    category: 'restaurant',
    name: 'Luca Restaurant',
    description: `Sophisticated Italian cuisine at the Caribbean Club with stunning ocean views. A favorite for romantic dinners.

**Signature Dishes:**
- House-made pasta
- Fresh seafood risotto
- Italian wine selection`,
    shortDescription: 'Sophisticated Italian dining with ocean views at Caribbean Club.',
    location: { address: 'Caribbean Club, West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3465, longitude: -81.3895 },
    contact: { phone: '+1-345-623-4550', website: 'https://lucarestaurant.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 60, priceTo: 150, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 678 },
    tags: ['italian', 'fine dining', 'romantic', 'oceanfront'],
    keywords: ['luca restaurant', 'italian cayman', 'romantic dinner'],
    embeddingText: 'Luca Restaurant Caribbean Club Italian fine dining pasta seafood risotto romantic oceanfront wine',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Italian'], mealTypes: ['dinner'], dressCode: 'Smart Casual', hasOceanView: true }
  },
  {
    id: 'rest-005',
    category: 'restaurant',
    name: 'The Brasserie',
    description: `Upscale Caribbean-European fusion in Cricket Square. Popular for business lunches and elegant dinners.`,
    shortDescription: 'Upscale Caribbean-European fusion in Cricket Square.',
    location: { address: 'Cricket Square, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3812 },
    contact: { phone: '+1-345-945-1815', website: 'https://thebrasserie.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 40, priceTo: 100, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 892 },
    tags: ['fusion', 'business', 'elegant', 'george town'],
    keywords: ['brasserie cayman', 'george town restaurant'],
    embeddingText: 'The Brasserie Cricket Square George Town Caribbean European fusion upscale business lunch dinner elegant',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Caribbean', 'European'], mealTypes: ['lunch', 'dinner'], dressCode: 'Smart Casual' }
  },
  {
    id: 'rest-006',
    category: 'restaurant',
    name: 'Mizu Asian Bistro',
    description: `Contemporary Asian cuisine including sushi, Thai, and Japanese dishes in Camana Bay.`,
    shortDescription: 'Contemporary Asian cuisine and sushi in Camana Bay.',
    location: { address: 'Camana Bay', district: 'Camana Bay', island: 'Grand Cayman', latitude: 19.3285, longitude: -81.3778 },
    contact: { phone: '+1-345-640-0001', website: 'https://mizu.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 35, priceTo: 90, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 567 },
    tags: ['asian', 'sushi', 'japanese', 'thai', 'camana bay'],
    keywords: ['mizu cayman', 'sushi cayman', 'asian food'],
    embeddingText: 'Mizu Asian Bistro Camana Bay sushi Japanese Thai contemporary Asian cuisine',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Asian', 'Japanese', 'Thai'], mealTypes: ['lunch', 'dinner'] }
  },
  {
    id: 'rest-007',
    category: 'restaurant',
    name: 'Abacus',
    description: `Contemporary dining in Camana Bay featuring seasonal menus and creative cocktails.`,
    shortDescription: 'Contemporary seasonal dining and cocktails in Camana Bay.',
    location: { address: 'Camana Bay', district: 'Camana Bay', island: 'Grand Cayman', latitude: 19.3278, longitude: -81.3772 },
    contact: { phone: '+1-345-623-8282', website: 'https://abacus.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 45, priceTo: 120, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 723 },
    tags: ['contemporary', 'seasonal', 'cocktails', 'camana bay'],
    keywords: ['abacus cayman', 'camana bay dining'],
    embeddingText: 'Abacus Camana Bay contemporary seasonal dining creative cocktails modern cuisine',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Contemporary', 'American'], mealTypes: ['lunch', 'dinner'] }
  },
  {
    id: 'rest-008',
    category: 'restaurant',
    name: 'Ristorante Pappagallo',
    description: `Iconic Italian restaurant set in a stunning thatched-roof building surrounded by exotic birds and gardens.`,
    shortDescription: 'Iconic Italian restaurant with exotic birds and tropical gardens.',
    location: { address: 'Conch Point Road, West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3745, longitude: -81.4123 },
    contact: { phone: '+1-345-949-1119', website: 'https://pappagallo.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 55, priceTo: 130, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 1234 },
    tags: ['italian', 'romantic', 'birds', 'gardens', 'unique'],
    keywords: ['pappagallo cayman', 'romantic restaurant', 'west bay dining'],
    embeddingText: 'Ristorante Pappagallo West Bay Italian romantic exotic birds tropical gardens thatched roof unique setting',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Italian'], mealTypes: ['dinner'], dressCode: 'Smart Casual', hasOutdoorSeating: true }
  },
  {
    id: 'rest-009',
    category: 'restaurant',
    name: "Morgan's Seafood Restaurant",
    description: `Classic Caribbean seafood restaurant on the harbor with fresh catch and stunning sunset views.`,
    shortDescription: 'Classic Caribbean seafood on the harbor with sunset views.',
    location: { address: 'N Church Street, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2978, longitude: -81.3856 },
    contact: { phone: '+1-345-946-7049', website: 'https://morgans.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 35, priceTo: 90, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 876 },
    tags: ['seafood', 'caribbean', 'harbor', 'sunset', 'george town'],
    keywords: ['morgans seafood', 'harbor restaurant cayman'],
    embeddingText: 'Morgans Seafood Restaurant George Town harbor Caribbean fresh catch sunset views waterfront',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Caribbean', 'Seafood'], mealTypes: ['lunch', 'dinner'], hasOceanView: true }
  },
  {
    id: 'rest-010',
    category: 'restaurant',
    name: 'The Wharf Restaurant',
    description: `Iconic waterfront restaurant known for tarpon feeding, seafood, and magical sunset dining experience.`,
    shortDescription: 'Iconic waterfront restaurant with tarpon feeding and sunset views.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3356, longitude: -81.3834 },
    contact: { phone: '+1-345-949-2231', website: 'https://wharf.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 40, priceTo: 100, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 2345 },
    tags: ['seafood', 'waterfront', 'tarpon', 'sunset', 'iconic'],
    keywords: ['wharf cayman', 'tarpon feeding', 'sunset dinner'],
    embeddingText: 'The Wharf Restaurant waterfront tarpon feeding seafood sunset iconic Seven Mile Beach West Bay Road',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Seafood', 'Caribbean'], mealTypes: ['lunch', 'dinner'], hasOceanView: true }
  },
  {
    id: 'rest-011',
    category: 'restaurant',
    name: 'Grand Old House',
    description: `Historic plantation house turned fine dining restaurant. Elegant Caribbean cuisine in a romantic 100-year-old setting.`,
    shortDescription: 'Historic plantation house with elegant Caribbean fine dining.',
    location: { address: 'S Church Street, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2823, longitude: -81.3878 },
    contact: { phone: '+1-345-949-9333', website: 'https://grandoldhouse.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 60, priceTo: 140, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 1567 },
    tags: ['fine dining', 'historic', 'romantic', 'caribbean', 'elegant'],
    keywords: ['grand old house', 'historic restaurant cayman', 'romantic fine dining'],
    embeddingText: 'Grand Old House historic plantation fine dining romantic Caribbean elegant George Town 100 years old',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Caribbean', 'International'], mealTypes: ['dinner'], dressCode: 'Smart Elegant' }
  },
  {
    id: 'rest-012',
    category: 'restaurant',
    name: 'Chicken! Chicken!',
    description: `Local favorite for Caribbean-style jerk chicken, cooked over pimento wood. Casual, authentic, delicious.`,
    shortDescription: 'Local favorite for authentic jerk chicken cooked over pimento wood.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3234, longitude: -81.3789 },
    contact: { phone: '+1-345-945-2290', website: 'https://chickenchicken.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 12, priceTo: 25, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 3456 },
    tags: ['jerk chicken', 'local', 'casual', 'authentic', 'budget'],
    keywords: ['chicken chicken cayman', 'jerk chicken', 'local food'],
    embeddingText: 'Chicken Chicken jerk chicken pimento wood local authentic casual budget friendly Caribbean style',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Caribbean', 'Jamaican'], mealTypes: ['lunch', 'dinner'], dressCode: 'Casual' }
  },
  {
    id: 'rest-013',
    category: 'restaurant',
    name: 'Sunshine Grill',
    description: `Popular local spot for authentic Caymanian breakfast and lunch. Try the famous fish tea and fritters.`,
    shortDescription: 'Popular local spot for authentic Caymanian breakfast and lunch.',
    location: { address: 'West Bay Road, Seven Mile Beach', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3456, longitude: -81.3889 },
    contact: { phone: '+1-345-946-5848' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 10, priceTo: 20, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 1234 },
    tags: ['local', 'breakfast', 'caymanian', 'authentic', 'budget'],
    keywords: ['sunshine grill', 'caymanian breakfast', 'local food'],
    embeddingText: 'Sunshine Grill local Caymanian breakfast lunch fish tea fritters authentic budget',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Caymanian'], mealTypes: ['breakfast', 'lunch'], dressCode: 'Casual' }
  },
  {
    id: 'rest-014',
    category: 'restaurant',
    name: 'Peppers Smokehouse',
    description: `Authentic Texas-style BBQ with smoked meats, craft beers, and casual vibes. Live music weekends.`,
    shortDescription: 'Authentic Texas-style BBQ with smoked meats and craft beers.',
    location: { address: 'Camana Bay', district: 'Camana Bay', island: 'Grand Cayman', latitude: 19.3267, longitude: -81.3765 },
    contact: { phone: '+1-345-640-0027', website: 'https://peppers.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 20, priceTo: 50, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 876 },
    tags: ['bbq', 'american', 'craft beer', 'live music', 'casual'],
    keywords: ['peppers smokehouse', 'bbq cayman', 'american food'],
    embeddingText: 'Peppers Smokehouse Texas BBQ smoked meats craft beers live music Camana Bay casual',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['American', 'BBQ'], mealTypes: ['lunch', 'dinner'], dressCode: 'Casual' }
  },
  {
    id: 'rest-015',
    category: 'restaurant',
    name: 'Taikun',
    description: `Modern Asian fine dining at the Kimpton Seafire. Innovative dishes in a stunning setting.`,
    shortDescription: 'Modern Asian fine dining at Kimpton Seafire Resort.',
    location: { address: 'Kimpton Seafire Resort', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3511, longitude: -81.3921 },
    contact: { phone: '+1-345-746-0000', website: 'https://seafireresortandspa.com/taikun' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 65, priceTo: 150, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 456 },
    tags: ['asian', 'fine dining', 'modern', 'seafire'],
    keywords: ['taikun cayman', 'asian fine dining', 'seafire restaurant'],
    embeddingText: 'Taikun modern Asian fine dining Kimpton Seafire innovative contemporary',
    isActive: true, isPremium: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Asian', 'Japanese'], mealTypes: ['dinner'], dressCode: 'Smart Elegant' }
  },
  {
    id: 'rest-016',
    category: 'restaurant',
    name: 'Ragazzi Ristorante',
    description: `Beloved Italian restaurant in the heart of Seven Mile Beach. Known for wood-fired pizzas and fresh pasta.`,
    shortDescription: 'Beloved Italian with wood-fired pizzas and fresh pasta.',
    location: { address: 'Buckingham Square, West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3345, longitude: -81.3823 },
    contact: { phone: '+1-345-945-3484', website: 'https://ragazzi.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 25, priceTo: 60, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 1567 },
    tags: ['italian', 'pizza', 'pasta', 'family friendly', 'casual'],
    keywords: ['ragazzi cayman', 'italian pizza', 'pasta cayman'],
    embeddingText: 'Ragazzi Ristorante Italian wood-fired pizza fresh pasta Seven Mile Beach family friendly casual',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Italian'], mealTypes: ['lunch', 'dinner'], dressCode: 'Casual' }
  },
  {
    id: 'rest-017',
    category: 'restaurant',
    name: 'Thai Orchid',
    description: `Authentic Thai cuisine with traditional recipes and fresh ingredients. A local institution.`,
    shortDescription: 'Authentic Thai cuisine and traditional recipes.',
    location: { address: 'Queens Court Plaza, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2934, longitude: -81.3778 },
    contact: { phone: '+1-345-949-7955' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 18, priceTo: 45, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 678 },
    tags: ['thai', 'authentic', 'asian', 'local favorite'],
    keywords: ['thai orchid', 'thai food cayman', 'asian restaurant'],
    embeddingText: 'Thai Orchid authentic Thai cuisine traditional recipes George Town local favorite',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Thai'], mealTypes: ['lunch', 'dinner'], dressCode: 'Casual' }
  },
  {
    id: 'rest-018',
    category: 'restaurant',
    name: 'Macabuca Tiki Bar',
    description: `Iconic oceanside tiki bar at Cracked Conch. Famous for frozen drinks, conch dishes, and sunset views.`,
    shortDescription: 'Iconic oceanside tiki bar with frozen drinks and sunset views.',
    location: { address: 'NW Point Road, West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3823, longitude: -81.4178 },
    contact: { phone: '+1-345-945-5217', website: 'https://crackedconch.com.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 15, priceTo: 45, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 2134 },
    tags: ['tiki bar', 'cocktails', 'sunset', 'conch', 'west bay'],
    keywords: ['macabuca', 'tiki bar cayman', 'sunset drinks'],
    embeddingText: 'Macabuca Tiki Bar oceanside Cracked Conch frozen drinks sunset West Bay Caribbean cocktails',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Caribbean', 'Seafood'], mealTypes: ['lunch', 'dinner'], dressCode: 'Casual', hasOceanView: true }
  },
  {
    id: 'rest-019',
    category: 'restaurant',
    name: 'Cracked Conch',
    description: `Legendary restaurant in West Bay serving the best conch dishes on the island. A must-visit Cayman institution.`,
    shortDescription: 'Legendary West Bay restaurant serving the best conch dishes.',
    location: { address: 'NW Point Road, West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3823, longitude: -81.4178 },
    contact: { phone: '+1-345-945-5217', website: 'https://crackedconch.com.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 25, priceTo: 65, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 3456 },
    tags: ['conch', 'seafood', 'legendary', 'local', 'west bay'],
    keywords: ['cracked conch', 'conch cayman', 'seafood restaurant'],
    embeddingText: 'Cracked Conch legendary West Bay conch fritters seafood local institution must visit',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Caribbean', 'Seafood'], mealTypes: ['lunch', 'dinner'], dressCode: 'Casual' }
  },
  {
    id: 'rest-020',
    category: 'restaurant',
    name: 'Bread & Chocolate',
    description: `Artisan bakery and café serving fresh pastries, specialty coffee, and healthy breakfast options.`,
    shortDescription: 'Artisan bakery with fresh pastries and specialty coffee.',
    location: { address: 'Camana Bay', district: 'Camana Bay', island: 'Grand Cayman', latitude: 19.3273, longitude: -81.3769 },
    contact: { phone: '+1-345-623-2253' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 8, priceTo: 25, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 567 },
    tags: ['bakery', 'cafe', 'breakfast', 'coffee', 'pastries'],
    keywords: ['bread chocolate cayman', 'bakery cayman', 'coffee camana bay'],
    embeddingText: 'Bread Chocolate artisan bakery cafe pastries specialty coffee breakfast Camana Bay',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system',
    customFields: { cuisine: ['Bakery', 'Cafe'], mealTypes: ['breakfast', 'lunch'], dressCode: 'Casual' }
  },
  // ===== EVEN MORE RESTAURANTS =====
  {
    id: 'rest-021', category: 'restaurant', name: 'Lobster Pot',
    description: 'Famous waterfront restaurant known for fresh lobster and Caribbean seafood.',
    shortDescription: 'Famous waterfront restaurant for fresh lobster.',
    location: { address: 'N Church Street, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2989, longitude: -81.3867 },
    contact: { phone: '+1-345-949-2736' }, media: { thumbnail: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 35, priceTo: 85, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 2345 },
    tags: ['seafood', 'lobster', 'waterfront', 'iconic'], keywords: ['lobster pot', 'lobster cayman'],
    embeddingText: 'Lobster Pot George Town waterfront lobster seafood Caribbean iconic restaurant',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'rest-022', category: 'restaurant', name: 'Catch Restaurant',
    description: 'Modern seafood restaurant in Morgan\'s Harbor with dock-to-table fresh fish.',
    shortDescription: 'Modern dock-to-table seafood in Morgan\'s Harbor.',
    location: { address: "Morgan's Harbour", district: 'West Bay', island: 'Grand Cayman', latitude: 19.3678, longitude: -81.4012 },
    contact: { phone: '+1-345-623-4900' }, media: { thumbnail: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 40, priceTo: 100, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 876 },
    tags: ['seafood', 'modern', 'harbor', 'fresh'], keywords: ['catch restaurant', 'fresh fish cayman'],
    embeddingText: 'Catch Restaurant Morgan Harbour dock-to-table seafood fresh fish West Bay modern',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'rest-023', category: 'restaurant', name: 'Casanova by the Sea',
    description: 'Romantic Italian restaurant on the waterfront with handmade pasta and seafood.',
    shortDescription: 'Romantic Italian waterfront dining.',
    location: { address: 'N Church Street, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2978, longitude: -81.3856 },
    contact: { phone: '+1-345-949-7633' }, media: { thumbnail: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 40, priceTo: 100, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 678 },
    tags: ['italian', 'romantic', 'waterfront', 'pasta'], keywords: ['casanova', 'italian waterfront'],
    embeddingText: 'Casanova by the Sea Italian romantic waterfront pasta seafood George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'rest-024', category: 'restaurant', name: 'Anchor & Den',
    description: 'Modern American gastropub at the Marriott with craft cocktails and comfort food.',
    shortDescription: 'Modern gastropub with craft cocktails.',
    location: { address: 'Grand Cayman Marriott', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3320, longitude: -81.3810 },
    contact: { phone: '+1-345-949-0088' }, media: { thumbnail: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 25, priceTo: 60, currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 456 },
    tags: ['gastropub', 'american', 'cocktails', 'casual'], keywords: ['anchor den', 'gastropub cayman'],
    embeddingText: 'Anchor Den Marriott gastropub craft cocktails comfort food American casual',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'rest-025', category: 'restaurant', name: 'Seven Restaurant',
    description: 'Steakhouse at the Ritz-Carlton featuring premium cuts and fine wines.',
    shortDescription: 'Premium steakhouse at the Ritz-Carlton.',
    location: { address: 'The Ritz-Carlton', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3405, longitude: -81.3869 },
    contact: { phone: '+1-345-943-9000' }, media: { thumbnail: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 60, priceTo: 150, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 567 },
    tags: ['steakhouse', 'fine dining', 'wine', 'luxury'], keywords: ['seven restaurant', 'steakhouse cayman'],
    embeddingText: 'Seven Restaurant Ritz-Carlton steakhouse premium cuts fine wines luxury dining',
    isActive: true, isPremium: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'rest-026', category: 'restaurant', name: 'Casa 43',
    description: 'Authentic Mexican cuisine with fresh margaritas and vibrant atmosphere.',
    shortDescription: 'Authentic Mexican with fresh margaritas.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3345, longitude: -81.3834 },
    contact: { phone: '+1-345-949-4343' }, media: { thumbnail: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 20, priceTo: 50, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 789 },
    tags: ['mexican', 'margaritas', 'vibrant', 'casual'], keywords: ['casa 43', 'mexican cayman'],
    embeddingText: 'Casa 43 authentic Mexican margaritas vibrant atmosphere Seven Mile Beach',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'rest-027', category: 'restaurant', name: 'The Lighthouse Restaurant',
    description: 'Mediterranean and Italian cuisine at Breakers with stunning ocean views.',
    shortDescription: 'Mediterranean dining with ocean views at Breakers.',
    location: { address: 'Breakers, East End', district: 'East End', island: 'Grand Cayman', latitude: 19.2856, longitude: -81.1678 },
    contact: { phone: '+1-345-947-2047' }, media: { thumbnail: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 35, priceTo: 90, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 567 },
    tags: ['mediterranean', 'italian', 'ocean view', 'east end'], keywords: ['lighthouse restaurant', 'east end dining'],
    embeddingText: 'Lighthouse Restaurant Breakers Mediterranean Italian ocean views East End',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'rest-028', category: 'restaurant', name: "Vivine's Kitchen",
    description: 'Authentic Caymanian home cooking with local recipes passed down through generations.',
    shortDescription: 'Authentic Caymanian home cooking and local recipes.',
    location: { address: 'North Side', district: 'North Side', island: 'Grand Cayman', latitude: 19.3523, longitude: -81.2234 },
    contact: { phone: '+1-345-947-7435' }, media: { thumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 12, priceTo: 25, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 456 },
    tags: ['caymanian', 'local', 'authentic', 'home cooking'], keywords: ['vivines kitchen', 'caymanian food'],
    embeddingText: 'Vivines Kitchen authentic Caymanian home cooking local recipes North Side traditional',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'rest-029', category: 'restaurant', name: 'Bar Jack',
    description: 'Poolside dining at the Ritz-Carlton with Caribbean-inspired casual fare.',
    shortDescription: 'Poolside Caribbean dining at the Ritz.',
    location: { address: 'The Ritz-Carlton', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3405, longitude: -81.3869 },
    contact: { phone: '+1-345-943-9000' }, media: { thumbnail: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 20, priceTo: 50, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 345 },
    tags: ['poolside', 'caribbean', 'casual', 'lunch'], keywords: ['bar jack', 'ritz poolside'],
    embeddingText: 'Bar Jack Ritz-Carlton poolside Caribbean casual dining lunch',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'rest-030', category: 'restaurant', name: 'Over the Edge Café',
    description: 'Casual breakfast and lunch spot in East End with ocean views and local flavors.',
    shortDescription: 'Casual breakfast spot with ocean views in East End.',
    location: { address: 'Old Man Bay, East End', district: 'East End', island: 'Grand Cayman', latitude: 19.3478, longitude: -81.1456 },
    contact: { phone: '+1-345-947-9568' }, media: { thumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 10, priceTo: 25, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 234 },
    tags: ['breakfast', 'casual', 'ocean view', 'east end'], keywords: ['over the edge', 'east end breakfast'],
    embeddingText: 'Over the Edge Cafe East End breakfast lunch ocean views local casual',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'rest-031', category: 'restaurant', name: 'Ortanique',
    description: 'Caribbean fusion fine dining with elegant presentations and local ingredients.',
    shortDescription: 'Caribbean fusion fine dining with local ingredients.',
    location: { address: 'Camana Bay', district: 'Camana Bay', island: 'Grand Cayman', latitude: 19.3278, longitude: -81.3772 },
    contact: { phone: '+1-345-640-7700' }, media: { thumbnail: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 50, priceTo: 120, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 456 },
    tags: ['caribbean', 'fusion', 'fine dining', 'elegant'], keywords: ['ortanique', 'caribbean fusion'],
    embeddingText: 'Ortanique Caribbean fusion fine dining elegant local ingredients Camana Bay',
    isActive: true, isPremium: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'rest-032', category: 'restaurant', name: 'YOSHI Sushi',
    description: 'Fresh sushi and Japanese cuisine with omakase options available.',
    shortDescription: 'Fresh sushi and Japanese cuisine with omakase.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3356, longitude: -81.3845 },
    contact: { phone: '+1-345-943-9674' }, media: { thumbnail: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 35, priceTo: 100, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 567 },
    tags: ['sushi', 'japanese', 'omakase', 'fresh'], keywords: ['yoshi sushi', 'japanese cayman'],
    embeddingText: 'YOSHI Sushi fresh Japanese omakase Seven Mile Beach',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'rest-033', category: 'restaurant', name: 'Osetra Bay',
    description: 'Modern European cuisine with extensive wine list in a sophisticated setting.',
    shortDescription: 'Modern European cuisine with extensive wines.',
    location: { address: 'Camana Bay', district: 'Camana Bay', island: 'Grand Cayman', latitude: 19.3267, longitude: -81.3769 },
    contact: { phone: '+1-345-623-3606' }, media: { thumbnail: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 55, priceTo: 130, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 345 },
    tags: ['european', 'wine', 'sophisticated', 'fine dining'], keywords: ['osetra bay', 'european dining cayman'],
    embeddingText: 'Osetra Bay modern European wine sophisticated fine dining Camana Bay',
    isActive: true, isPremium: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'rest-034', category: 'restaurant', name: 'Sunset Grille',
    description: 'Casual American dining with spectacular sunset views from the Westin pool deck.',
    shortDescription: 'Casual American with spectacular sunset views.',
    location: { address: 'The Westin', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3285, longitude: -81.3795 },
    contact: { phone: '+1-345-945-3800' }, media: { thumbnail: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 20, priceTo: 55, currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 456 },
    tags: ['american', 'sunset', 'casual', 'poolside'], keywords: ['sunset grille', 'westin restaurant'],
    embeddingText: 'Sunset Grille Westin American casual sunset views pool deck',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'rest-035', category: 'restaurant', name: 'Hemingways',
    description: 'Beachfront fine dining at Grand Old House with Caribbean elegance.',
    shortDescription: 'Beachfront fine dining with Caribbean elegance.',
    location: { address: 'S Church Street', district: 'George Town', island: 'Grand Cayman', latitude: 19.2823, longitude: -81.3878 },
    contact: { phone: '+1-345-945-4144' }, media: { thumbnail: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 50, priceTo: 120, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 567 },
    tags: ['beachfront', 'fine dining', 'caribbean', 'elegant'], keywords: ['hemingways', 'beachfront dining'],
    embeddingText: 'Hemingways Grand Old House beachfront fine dining Caribbean elegance George Town',
    isActive: true, isPremium: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ BEACHES & DIVING ============

export const CAYMAN_BEACHES: KnowledgeNode[] = [
  {
    id: 'beach-001',
    category: 'beach',
    name: 'Seven Mile Beach',
    description: `Consistently rated one of the best beaches in the Caribbean and the world. Seven Mile Beach (actually 5.5 miles) features pristine white coral sand and crystal-clear turquoise waters.

**Highlights:**
- Calm, crystal-clear water perfect for swimming
- Excellent snorkeling along the reef
- Public beach with free access
- Lined with resorts, restaurants, and bars
- Water sports rentals available
- Stunning sunsets

**Best Spots:**
- Public Beach (most facilities)
- Cemetery Beach (quieter, great snorkeling)
- Governor's Beach (exclusive feel)

**Tips:**
- Best snorkeling at the north end
- Arrive early for best spots on busy days
- Bring reef-safe sunscreen

Perfect for: Everyone - families, couples, solo travelers, water sports`,
    shortDescription: 'World-famous 5.5-mile stretch of pristine white sand and turquoise waters.',
    location: {
      address: 'West Bay Road',
      district: 'Seven Mile Beach',
      island: 'Grand Cayman',
      latitude: 19.3340,
      longitude: -81.3925
    },
    contact: {
      website: 'https://www.visitcaymanislands.com/en-us/seven-mile-beach'
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      images: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
        'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1200'
      ]
    },
    business: {
      priceRange: '$',
      currency: 'USD',
      openingHours: {
        monday: { open: '00:00', close: '23:59' },
        tuesday: { open: '00:00', close: '23:59' },
        wednesday: { open: '00:00', close: '23:59' },
        thursday: { open: '00:00', close: '23:59' },
        friday: { open: '00:00', close: '23:59' },
        saturday: { open: '00:00', close: '23:59' },
        sunday: { open: '00:00', close: '23:59' }
      }
    },
    ratings: {
      overall: 4.9,
      reviewCount: 8934,
      tripadvisorRating: 4.5,
      googleRating: 4.8
    },
    tags: ['beach', 'swimming', 'snorkeling', 'sunset', 'family', 'free', 'iconic'],
    keywords: ['seven mile beach', 'best beach cayman', 'grand cayman beach', 'caribbean beach'],
    embeddingText: 'Seven Mile Beach Grand Cayman white sand turquoise water swimming snorkeling sunset Caribbean best beach world famous public beach free water sports calm water family friendly',
    isActive: true,
    isPremium: false,
    isFeatured: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    createdBy: 'system'
  },
  {
    id: 'beach-002',
    category: 'beach',
    name: 'Starfish Point',
    description: `A magical shallow cove where you can observe (but not touch!) beautiful red cushion starfish in their natural habitat.

**What to Expect:**
- Knee-deep crystal clear water
- Red cushion starfish visible on sandy bottom
- Mangrove-lined shore
- Peaceful, off-the-beaten-path location

**Important Rules:**
- DO NOT touch or pick up starfish (it can kill them)
- Stay in designated areas
- Bring water shoes (rocky entry)

**Tips:**
- Best at low tide for visibility
- Morning visits are quieter
- Combine with Rum Point visit
- Bring your own refreshments

Perfect for: Nature lovers, photographers, families, Instagram moments`,
    shortDescription: 'Magical shallow cove where you can see beautiful red cushion starfish in crystal-clear water.',
    location: {
      address: 'Water Cay Road, North Side',
      district: 'North Side',
      island: 'Grand Cayman',
      latitude: 19.3678,
      longitude: -81.2589
    },
    contact: {},
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800',
      images: []
    },
    business: {
      priceRange: '$',
      currency: 'USD'
    },
    ratings: {
      overall: 4.6,
      reviewCount: 3421,
      tripadvisorRating: 4.5,
      googleRating: 4.4
    },
    tags: ['beach', 'starfish', 'nature', 'photography', 'free', 'unique', 'family'],
    keywords: ['starfish point', 'starfish beach cayman', 'unique beach cayman', 'north side beach'],
    embeddingText: 'Starfish Point Grand Cayman red cushion starfish shallow water nature wildlife photography unique experience North Side mangroves crystal clear free attraction family friendly',
    isActive: true,
    isPremium: false,
    isFeatured: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    createdBy: 'system'
  },
  // ===== MORE BEACHES =====
  {
    id: 'beach-003',
    category: 'beach',
    name: 'Rum Point',
    description: `A tranquil beach getaway on the North Side, famous for its hammocks, mudslide cocktails, and peaceful Caribbean atmosphere.`,
    shortDescription: 'Tranquil North Side beach famous for hammocks and mudslide cocktails.',
    location: { address: 'Rum Point Drive, North Side', district: 'North Side', island: 'Grand Cayman', latitude: 19.3697, longitude: -81.2598 },
    contact: { phone: '+1-345-947-9412' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 5678 },
    tags: ['beach', 'hammocks', 'cocktails', 'peaceful', 'north side', 'family'],
    keywords: ['rum point', 'mudslide cocktail', 'north side beach'],
    embeddingText: 'Rum Point North Side beach hammocks mudslide cocktails peaceful Caribbean tranquil family friendly',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'beach-004',
    category: 'beach',
    name: 'Cemetery Beach',
    description: `Northern end of Seven Mile Beach offering the best snorkeling on the West Side with healthy coral and abundant marine life.`,
    shortDescription: 'Best snorkeling spot on Seven Mile Beach with abundant marine life.',
    location: { address: 'West Bay Road, North End', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3625, longitude: -81.4010 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 2345 },
    tags: ['beach', 'snorkeling', 'marine life', 'free', 'quiet'],
    keywords: ['cemetery beach', 'snorkeling cayman', 'coral reef'],
    embeddingText: 'Cemetery Beach Seven Mile Beach north end snorkeling coral reef marine life free quiet peaceful',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'beach-005',
    category: 'beach',
    name: 'Smith Cove',
    description: `Intimate cove beach with great snorkeling, picnic facilities, and stunning sunset views. Popular for weddings.`,
    shortDescription: 'Intimate cove with great snorkeling, sunsets, and wedding venue.',
    location: { address: 'S Church Street, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2789, longitude: -81.3912 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 1890 },
    tags: ['beach', 'cove', 'snorkeling', 'sunset', 'wedding', 'picnic'],
    keywords: ['smith cove', 'cove beach cayman', 'sunset beach'],
    embeddingText: 'Smith Cove intimate beach snorkeling sunset picnic wedding George Town South Church Street',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'beach-006',
    category: 'beach',
    name: 'Spotts Beach',
    description: `Quiet beach on the South Side known for wild sea turtle sightings. Best for morning swims when turtles feed.`,
    shortDescription: 'Quiet South Side beach with wild sea turtle sightings.',
    location: { address: 'Shamrock Road, Spotts', district: 'Bodden Town', island: 'Grand Cayman', latitude: 19.2723, longitude: -81.3234 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1518467166778-b88f373ffec7?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 1234 },
    tags: ['beach', 'turtles', 'wildlife', 'quiet', 'free', 'snorkeling'],
    keywords: ['spotts beach', 'turtle beach cayman', 'south side beach'],
    embeddingText: 'Spotts Beach South Side wild sea turtles snorkeling quiet peaceful morning swim wildlife',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'beach-007',
    category: 'beach',
    name: "Governor's Beach",
    description: `Beautiful stretch of Seven Mile Beach near the Governor's residence. Less crowded with soft white sand.`,
    shortDescription: 'Less crowded section of Seven Mile Beach with soft white sand.',
    location: { address: 'Seven Mile Beach, West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3178, longitude: -81.3756 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 876 },
    tags: ['beach', 'quiet', 'white sand', 'swimming', 'free'],
    keywords: ['governors beach', 'seven mile beach quiet', 'less crowded beach'],
    embeddingText: 'Governors Beach Seven Mile Beach less crowded quiet white sand swimming peaceful',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'beach-008',
    category: 'beach',
    name: 'Public Beach',
    description: `The most popular section of Seven Mile Beach with full facilities, lifeguards, water sports, and beachside vendors.`,
    shortDescription: 'Popular Seven Mile Beach section with full facilities and water sports.',
    location: { address: 'West Bay Road, Seven Mile Beach', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3345, longitude: -81.3834 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 4567 },
    tags: ['beach', 'facilities', 'lifeguard', 'water sports', 'vendors', 'family'],
    keywords: ['public beach cayman', 'seven mile beach facilities'],
    embeddingText: 'Public Beach Seven Mile Beach facilities lifeguard water sports vendors family friendly popular',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'beach-009',
    category: 'beach',
    name: 'East End Beach',
    description: `Remote and rugged beach on the Eastern tip with dramatic ironshore coastline and excellent snorkeling.`,
    shortDescription: 'Remote East End beach with dramatic coastline and snorkeling.',
    location: { address: 'Queens Highway, East End', district: 'East End', island: 'Grand Cayman', latitude: 19.2934, longitude: -81.0834 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 567 },
    tags: ['beach', 'remote', 'rugged', 'snorkeling', 'adventure'],
    keywords: ['east end beach', 'remote beach cayman', 'ironshore'],
    embeddingText: 'East End Beach remote rugged ironshore snorkeling dramatic coastline adventure off beaten path',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'beach-010',
    category: 'beach',
    name: 'Barefoot Beach',
    description: `Locals' favorite hidden beach near West Bay. Quiet, pristine, and off the tourist path.`,
    shortDescription: 'Hidden locals favorite beach near West Bay.',
    location: { address: 'Boggy Sand Road, West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3734, longitude: -81.4067 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1520942702018-0862c6e6f7f6?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 345 },
    tags: ['beach', 'hidden', 'local', 'quiet', 'pristine'],
    keywords: ['barefoot beach', 'hidden beach cayman', 'local beach'],
    embeddingText: 'Barefoot Beach hidden local West Bay quiet pristine off tourist path secret',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  // ===== CAYMAN BRAC BEACHES =====
  {
    id: 'beach-011',
    category: 'beach',
    name: 'Stake Bay Beach',
    description: `Main beach on Cayman Brac with calm waters and views of the famous Bluff.`,
    shortDescription: 'Main Cayman Brac beach with Bluff views and calm waters.',
    location: { address: 'Stake Bay, Cayman Brac', district: 'Stake Bay', island: 'Cayman Brac', latitude: 19.7123, longitude: -79.8234 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 234 },
    tags: ['beach', 'cayman brac', 'calm', 'bluff views'],
    keywords: ['stake bay beach', 'cayman brac beach'],
    embeddingText: 'Stake Bay Beach Cayman Brac calm waters Bluff views Sister Islands',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  // ===== LITTLE CAYMAN BEACHES =====
  {
    id: 'beach-012',
    category: 'beach',
    name: 'Point of Sand',
    description: `Pristine beach at the eastern tip of Little Cayman. Remote, beautiful, and virtually untouched.`,
    shortDescription: 'Pristine untouched beach at the tip of Little Cayman.',
    location: { address: 'East End, Little Cayman', district: 'East End', island: 'Little Cayman', latitude: 19.6578, longitude: -79.9567 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1509233725247-49e657c54213?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.9, reviewCount: 178 },
    tags: ['beach', 'little cayman', 'pristine', 'remote', 'untouched'],
    keywords: ['point of sand', 'little cayman beach', 'pristine beach'],
    embeddingText: 'Point of Sand Little Cayman pristine remote untouched beautiful Sister Islands',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ DIVING SITES ============

export const CAYMAN_DIVING: KnowledgeNode[] = [
  {
    id: 'dive-001',
    category: 'diving_snorkeling',
    name: 'Stingray City',
    description: `The world's most famous animal encounter - swim with friendly Southern Atlantic stingrays in crystal-clear shallow water.

**The Experience:**
- Interact with dozens of wild stingrays
- Shallow sandbar (3-4 feet deep) - perfect for all ages
- Stingrays accustomed to humans, incredibly gentle
- Feed and pet the stingrays (with guide supervision)
- Snorkeling and diving options available

**Practical Info:**
- Only accessible by boat (numerous tours available)
- Morning trips less crowded
- Bring underwater camera
- Reef-safe sunscreen required

**Booking:**
- Full-day tours from ~$50/person
- Private charters available
- Many hotels offer direct booking

This is the #1 must-do activity in the Cayman Islands!`,
    shortDescription: 'World-famous sandbar where you swim and interact with friendly wild stingrays.',
    location: {
      address: 'North Sound',
      district: 'North Sound',
      island: 'Grand Cayman',
      latitude: 19.3889,
      longitude: -81.3000
    },
    contact: {
      website: 'https://www.visitcaymanislands.com/en-us/things-to-do/attractions/stingray-city'
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
      images: []
    },
    business: {
      priceRange: '$$',
      priceFrom: 50,
      priceTo: 200,
      currency: 'USD'
    },
    ratings: {
      overall: 4.8,
      reviewCount: 12453,
      tripadvisorRating: 4.5,
      googleRating: 4.7
    },
    tags: ['must-do', 'stingrays', 'snorkeling', 'family', 'unique', 'wildlife', 'boat tour'],
    keywords: ['stingray city', 'stingrays cayman', 'best activity cayman', 'swim with stingrays'],
    embeddingText: 'Stingray City Grand Cayman swim stingrays sandbar North Sound snorkeling wildlife encounter family friendly must-do attraction boat tour Caribbean unique experience',
    isActive: true,
    isPremium: false,
    isFeatured: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    createdBy: 'system'
  },
  {
    id: 'dive-002',
    category: 'diving_snorkeling',
    name: 'USS Kittiwake Wreck',
    description: `A purpose-sunk 251-foot former US Navy submarine rescue vessel, now one of the Caribbean's premier wreck dives.

**The Dive:**
- Depth: 15-65 feet
- Visibility: 80-100+ feet typical
- All levels welcome (different access points)
- Penetration opportunities for advanced divers
- Rich marine life including rays, turtles, barracuda

**Key Features:**
- Multiple entry points at different depths
- Intact bridge, engine rooms explorable
- Artificial reef attracting abundant sea life
- Excellent for underwater photography

**Requirements:**
- Open Water certification minimum
- Advanced for penetration
- Nitrox recommended for extended bottom time

Perfect for: Divers of all levels, underwater photographers`,
    shortDescription: '251-foot former Navy vessel purpose-sunk as an artificial reef - premier wreck dive.',
    location: {
      address: 'Off Seven Mile Beach',
      district: 'Seven Mile Beach',
      island: 'Grand Cayman',
      latitude: 19.3651,
      longitude: -81.4012
    },
    contact: {
      website: 'https://kittiwakecayman.com'
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800',
      images: []
    },
    business: {
      priceRange: '$$',
      priceFrom: 100,
      priceTo: 250,
      currency: 'USD'
    },
    ratings: {
      overall: 4.9,
      reviewCount: 2341,
      tripadvisorRating: 5.0,
      googleRating: 4.8
    },
    tags: ['diving', 'wreck dive', 'advanced', 'photography', 'marine life'],
    keywords: ['kittiwake wreck', 'wreck diving cayman', 'scuba diving cayman', 'best dive sites'],
    embeddingText: 'USS Kittiwake wreck dive Grand Cayman scuba diving artificial reef Navy vessel submarine rescue penetration diving marine life underwater photography Seven Mile Beach',
    isActive: true,
    isPremium: false,
    isFeatured: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    createdBy: 'system'
  },
  // ===== MORE DIVE SITES =====
  {
    id: 'dive-003',
    category: 'diving_snorkeling',
    name: 'Eden Rock & Devils Grotto',
    description: `Iconic shore dive in George Town with underwater caves, tunnels, and abundant marine life. Perfect for all levels.`,
    shortDescription: 'Iconic shore dive with caves and tunnels in George Town harbor.',
    location: { address: 'S Church Street, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2889, longitude: -81.3845 },
    contact: { phone: '+1-345-949-7243' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 40, priceTo: 80, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 3456 },
    tags: ['diving', 'snorkeling', 'caves', 'shore dive', 'all levels'],
    keywords: ['eden rock', 'devils grotto', 'shore diving cayman'],
    embeddingText: 'Eden Rock Devils Grotto George Town shore dive caves tunnels snorkeling marine life underwater beginner friendly',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'dive-004',
    category: 'diving_snorkeling',
    name: 'Bloody Bay Wall',
    description: `Legendary wall dive on Little Cayman. Consistently rated among the top 5 dive sites in the world.`,
    shortDescription: 'Legendary wall dive - one of the top 5 dive sites in the world.',
    location: { address: 'North Coast, Little Cayman', district: 'Bloody Bay', island: 'Little Cayman', latitude: 19.6956, longitude: -80.0789 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 150, priceTo: 300, currency: 'USD' },
    ratings: { overall: 5.0, reviewCount: 1234 },
    tags: ['diving', 'wall dive', 'world class', 'little cayman', 'advanced'],
    keywords: ['bloody bay wall', 'best dive site world', 'little cayman diving'],
    embeddingText: 'Bloody Bay Wall Little Cayman legendary wall dive top 5 world best dive site dramatic drop coral',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'dive-005',
    category: 'diving_snorkeling',
    name: 'West Wall - Grand Cayman',
    description: `Dramatic wall diving along the West Side with stunning coral formations and pelagic encounters.`,
    shortDescription: 'Dramatic wall diving with coral formations and pelagic life.',
    location: { address: 'West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3678, longitude: -81.4234 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1559825481-12a05cc00344?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 100, priceTo: 200, currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 987 },
    tags: ['diving', 'wall dive', 'coral', 'pelagics', 'west bay'],
    keywords: ['west wall', 'wall diving cayman', 'coral formations'],
    embeddingText: 'West Wall Grand Cayman wall diving coral formations pelagic encounters dramatic West Bay',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'dive-006',
    category: 'diving_snorkeling',
    name: 'East End Wall',
    description: `Pristine, uncrowded wall diving on the East End with excellent visibility and healthy coral.`,
    shortDescription: 'Pristine uncrowded wall diving with excellent visibility.',
    location: { address: 'East End', district: 'East End', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.0945 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 100, priceTo: 200, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 456 },
    tags: ['diving', 'wall dive', 'uncrowded', 'visibility', 'east end'],
    keywords: ['east end wall', 'uncrowded diving', 'east end diving'],
    embeddingText: 'East End Wall pristine uncrowded wall diving excellent visibility healthy coral Grand Cayman',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'dive-007',
    category: 'diving_snorkeling',
    name: 'Doc Poulson Wreck',
    description: `Shallow wreck dive perfect for beginners. A 60-foot freighter sitting in 55 feet of water.`,
    shortDescription: 'Shallow wreck dive perfect for beginner divers.',
    location: { address: 'West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3567, longitude: -81.4012 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 80, priceTo: 150, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 678 },
    tags: ['diving', 'wreck', 'beginner', 'shallow'],
    keywords: ['doc poulson wreck', 'beginner wreck dive', 'shallow wreck'],
    embeddingText: 'Doc Poulson Wreck shallow beginner friendly wreck dive freighter West Bay',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'dive-008',
    category: 'diving_snorkeling',
    name: 'Cayman Brac Wall',
    description: `Dramatic wall diving off Cayman Brac with pristine conditions and few other divers.`,
    shortDescription: 'Dramatic wall diving with pristine conditions on Cayman Brac.',
    location: { address: 'North Coast, Cayman Brac', district: 'North Coast', island: 'Cayman Brac', latitude: 19.7234, longitude: -79.8456 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 100, priceTo: 200, currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 345 },
    tags: ['diving', 'wall dive', 'cayman brac', 'pristine', 'uncrowded'],
    keywords: ['cayman brac wall', 'sister islands diving'],
    embeddingText: 'Cayman Brac Wall dramatic wall diving pristine uncrowded Sister Islands',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'dive-009',
    category: 'diving_snorkeling',
    name: 'MV Captain Keith Tibbetts',
    description: `Russian frigate sunk as artificial reef off Cayman Brac. One of the most intact wrecks in the Caribbean.`,
    shortDescription: 'Russian frigate wreck - most intact wreck in the Caribbean.',
    location: { address: 'West End, Cayman Brac', district: 'West End', island: 'Cayman Brac', latitude: 19.6912, longitude: -79.8923 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 120, priceTo: 220, currency: 'USD' },
    ratings: { overall: 4.9, reviewCount: 567 },
    tags: ['diving', 'wreck', 'russian frigate', 'cayman brac', 'artificial reef'],
    keywords: ['keith tibbetts wreck', 'russian frigate cayman', 'cayman brac wreck'],
    embeddingText: 'MV Captain Keith Tibbetts Russian frigate wreck dive Cayman Brac artificial reef intact',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'dive-010',
    category: 'diving_snorkeling',
    name: 'Coral Gardens',
    description: `Shallow snorkel site perfect for families with abundant fish, coral, and sea turtles.`,
    shortDescription: 'Family-friendly snorkel site with turtles and abundant marine life.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3523, longitude: -81.3934 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1518467166778-b88f373ffec7?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 30, priceTo: 60, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 2345 },
    tags: ['snorkeling', 'family', 'turtles', 'coral', 'shallow'],
    keywords: ['coral gardens', 'snorkeling cayman', 'family snorkel'],
    embeddingText: 'Coral Gardens snorkeling family friendly shallow turtles fish coral Seven Mile Beach',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ SPAS & WELLNESS ============

export const CAYMAN_SPAS: KnowledgeNode[] = [
  {
    id: 'spa-001',
    category: 'spa',
    name: 'La Prairie Spa at The Ritz-Carlton',
    description: `The only La Prairie Spa in the Caribbean. World-renowned Swiss treatments in a stunning oceanfront setting.`,
    shortDescription: 'Only La Prairie Spa in the Caribbean with Swiss luxury treatments.',
    location: { address: 'The Ritz-Carlton, West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3405, longitude: -81.3869 },
    contact: { phone: '+1-345-943-9000', website: 'https://www.ritzcarlton.com/grand-cayman/spa' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800', images: [] },
    business: { priceRange: '$$$$$', priceFrom: 250, priceTo: 800, currency: 'USD' },
    ratings: { overall: 4.9, reviewCount: 456 },
    tags: ['spa', 'luxury', 'la prairie', 'swiss', 'oceanfront'],
    keywords: ['la prairie spa', 'ritz carlton spa', 'luxury spa cayman'],
    embeddingText: 'La Prairie Spa Ritz-Carlton Swiss luxury treatments oceanfront Caribbean wellness facial massage',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'spa-002',
    category: 'spa',
    name: 'FLOAT Spa at Kimpton Seafire',
    description: `Award-winning spa offering innovative treatments, couples suites, and oceanfront relaxation rooms.`,
    shortDescription: 'Award-winning spa with innovative treatments and ocean views.',
    location: { address: 'Kimpton Seafire Resort', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3511, longitude: -81.3921 },
    contact: { phone: '+1-345-746-0000', website: 'https://seafireresortandspa.com/spa' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 180, priceTo: 500, currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 567 },
    tags: ['spa', 'wellness', 'couples', 'innovative', 'oceanfront'],
    keywords: ['float spa', 'seafire spa', 'couples spa cayman'],
    embeddingText: 'FLOAT Spa Kimpton Seafire innovative wellness couples suite oceanfront relaxation massage',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'spa-003',
    category: 'spa',
    name: 'Hibiscus Spa at The Westin',
    description: `Full-service spa offering Caribbean-inspired treatments, salon services, and fitness facilities.`,
    shortDescription: 'Full-service spa with Caribbean-inspired treatments.',
    location: { address: 'The Westin, West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3285, longitude: -81.3795 },
    contact: { phone: '+1-345-945-3800' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 120, priceTo: 350, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 345 },
    tags: ['spa', 'caribbean', 'massage', 'salon', 'fitness'],
    keywords: ['hibiscus spa', 'westin spa', 'massage cayman'],
    embeddingText: 'Hibiscus Spa Westin Caribbean treatments massage salon fitness wellness',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'spa-004',
    category: 'spa',
    name: 'Botanika Day Spa',
    description: `Locally-owned day spa offering natural treatments, organic products, and personalized service.`,
    shortDescription: 'Locally-owned spa with natural treatments and organic products.',
    location: { address: 'George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2934, longitude: -81.3789 },
    contact: { phone: '+1-345-946-5252' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1552693673-1bf958298935?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 80, priceTo: 200, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 234 },
    tags: ['spa', 'organic', 'natural', 'local', 'day spa'],
    keywords: ['botanika spa', 'organic spa cayman', 'day spa'],
    embeddingText: 'Botanika Day Spa local organic natural treatments personalized service George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ BARS & NIGHTLIFE ============

export const CAYMAN_BARS: KnowledgeNode[] = [
  {
    id: 'bar-001',
    category: 'bar',
    name: 'Coconut Club',
    description: `Trendy beach bar at Palm Heights with craft cocktails, DJ sets, and stylish Caribbean vibes.`,
    shortDescription: 'Trendy beach bar with craft cocktails and DJ sets.',
    location: { address: 'Palm Heights, West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3445, longitude: -81.3885 },
    contact: { phone: '+1-345-949-4111' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 15, priceTo: 30, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 345 },
    tags: ['bar', 'beach bar', 'cocktails', 'dj', 'trendy'],
    keywords: ['coconut club', 'beach bar cayman', 'trendy bar'],
    embeddingText: 'Coconut Club Palm Heights beach bar craft cocktails DJ trendy stylish Seven Mile Beach',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'bar-002',
    category: 'bar',
    name: 'My Bar at Sunset House',
    description: `Legendary dive bar perched on the oceanfront. Famous for strong drinks and incredible sunset views.`,
    shortDescription: 'Legendary dive bar with oceanfront views and strong drinks.',
    location: { address: 'Sunset House, S Church Street', district: 'George Town', island: 'Grand Cayman', latitude: 19.2845, longitude: -81.3895 },
    contact: { phone: '+1-345-949-7111' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 8, priceTo: 18, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 1234 },
    tags: ['bar', 'dive bar', 'sunset', 'oceanfront', 'legendary'],
    keywords: ['my bar', 'sunset house bar', 'dive bar cayman'],
    embeddingText: 'My Bar Sunset House legendary dive bar oceanfront sunset views strong drinks',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'bar-003',
    category: 'bar',
    name: 'Calico Jacks',
    description: `Popular beach bar right on Seven Mile Beach. Great for sunset drinks, live music, and Caribbean vibes.`,
    shortDescription: 'Popular beach bar on Seven Mile Beach with live music.',
    location: { address: 'West Bay Road, Seven Mile Beach', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3367, longitude: -81.3845 },
    contact: { phone: '+1-345-945-7850' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 10, priceTo: 25, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 2345 },
    tags: ['bar', 'beach bar', 'live music', 'sunset', 'popular'],
    keywords: ['calico jacks', 'beach bar seven mile', 'sunset bar'],
    embeddingText: 'Calico Jacks beach bar Seven Mile Beach sunset live music Caribbean popular',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'bar-004',
    category: 'bar',
    name: 'Lone Star Bar & Grill',
    description: `Texas-themed sports bar with big screens, burgers, and cold beer. Popular for watching games.`,
    shortDescription: 'Texas-themed sports bar for watching games.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3312, longitude: -81.3801 },
    contact: { phone: '+1-345-945-5175' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1575037614876-c38a4f44a30c?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 12, priceTo: 30, currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 876 },
    tags: ['bar', 'sports bar', 'american', 'burgers', 'games'],
    keywords: ['lone star bar', 'sports bar cayman', 'american bar'],
    embeddingText: 'Lone Star Bar Grill Texas sports bar big screens burgers beer games',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'bar-005',
    category: 'bar',
    name: "O Bar",
    description: `Upscale lounge in Camana Bay with craft cocktails, premium wines, and sophisticated ambiance.`,
    shortDescription: 'Upscale lounge with craft cocktails and premium wines.',
    location: { address: 'Camana Bay', district: 'Camana Bay', island: 'Grand Cayman', latitude: 19.3269, longitude: -81.3767 },
    contact: { phone: '+1-345-640-0001' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 15, priceTo: 35, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 456 },
    tags: ['bar', 'lounge', 'cocktails', 'wine', 'upscale'],
    keywords: ['o bar', 'camana bay bar', 'cocktail lounge'],
    embeddingText: 'O Bar Camana Bay upscale lounge craft cocktails premium wines sophisticated',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'bar-006',
    category: 'bar',
    name: 'Deckers',
    description: `Double-decker British bus converted into a bar on the beach. Unique atmosphere and fun vibes.`,
    shortDescription: 'Unique double-decker bus bar on the beach.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3378, longitude: -81.3856 },
    contact: { phone: '+1-345-945-6600' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 10, priceTo: 25, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 1234 },
    tags: ['bar', 'unique', 'beach', 'fun', 'british'],
    keywords: ['deckers bar', 'bus bar cayman', 'unique bar'],
    embeddingText: 'Deckers double-decker British bus bar beach unique atmosphere fun Seven Mile Beach',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  // ===== MORE BARS =====
  {
    id: 'bar-007', category: 'bar', name: 'Fidels Café & Wine Bar',
    description: 'Eclectic wine bar and café with live music, art, and creative cocktails.',
    shortDescription: 'Eclectic wine bar with live music and art.',
    location: { address: 'Harbour Drive, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2945, longitude: -81.3823 },
    contact: { phone: '+1-345-945-5522' }, media: { thumbnail: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 12, priceTo: 30, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 567 },
    tags: ['wine bar', 'live music', 'art', 'eclectic'], keywords: ['fidels cafe', 'wine bar cayman'],
    embeddingText: 'Fidels Cafe Wine Bar George Town live music art creative cocktails eclectic',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'bar-008', category: 'bar', name: 'Rackams Waterfront Bar',
    description: 'Lively waterfront bar with tarpon feeding, great drinks, and harbor views.',
    shortDescription: 'Lively waterfront bar with tarpon feeding.',
    location: { address: 'N Church Street, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2989, longitude: -81.3867 },
    contact: { phone: '+1-345-945-3860' }, media: { thumbnail: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 10, priceTo: 25, currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 1234 },
    tags: ['waterfront', 'tarpon', 'lively', 'harbor'], keywords: ['rackams', 'waterfront bar cayman'],
    embeddingText: 'Rackams Waterfront Bar George Town tarpon feeding harbor views lively',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'bar-009', category: 'bar', name: 'The Locale',
    description: 'Trendy bar and restaurant in Camana Bay with craft cocktails and gastropub fare.',
    shortDescription: 'Trendy Camana Bay bar with craft cocktails.',
    location: { address: 'Camana Bay', district: 'Camana Bay', island: 'Grand Cayman', latitude: 19.3271, longitude: -81.3769 },
    contact: { phone: '+1-345-640-5000' }, media: { thumbnail: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 15, priceTo: 35, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 456 },
    tags: ['trendy', 'craft cocktails', 'gastropub', 'camana bay'], keywords: ['the locale', 'camana bay bar'],
    embeddingText: 'The Locale Camana Bay trendy craft cocktails gastropub',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'bar-010', category: 'bar', name: 'Legendz Bar',
    description: 'Local sports bar with big screens, pool tables, and friendly atmosphere.',
    shortDescription: 'Local sports bar with games and pool tables.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3289, longitude: -81.3789 },
    contact: { phone: '+1-345-943-3287' }, media: { thumbnail: 'https://images.unsplash.com/photo-1575037614876-c38a4f44a30c?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 8, priceTo: 20, currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 345 },
    tags: ['sports bar', 'local', 'pool tables', 'games'], keywords: ['legendz bar', 'sports bar cayman'],
    embeddingText: 'Legendz Bar local sports bar pool tables games Seven Mile Beach',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'bar-011', category: 'bar', name: 'Silver Palm Lounge',
    description: 'Elegant cocktail lounge at the Ritz-Carlton with premium spirits and refined ambiance.',
    shortDescription: 'Elegant Ritz-Carlton cocktail lounge.',
    location: { address: 'The Ritz-Carlton', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3405, longitude: -81.3869 },
    contact: { phone: '+1-345-943-9000' }, media: { thumbnail: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 18, priceTo: 45, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 234 },
    tags: ['cocktail lounge', 'elegant', 'luxury', 'premium'], keywords: ['silver palm lounge', 'ritz cocktails'],
    embeddingText: 'Silver Palm Lounge Ritz-Carlton elegant cocktail premium spirits refined luxury',
    isActive: true, isPremium: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'bar-012', category: 'bar', name: 'Tillies at Palm Heights',
    description: 'Stylish restaurant and bar with farm-to-table Caribbean cuisine and creative drinks.',
    shortDescription: 'Stylish farm-to-table Caribbean bar.',
    location: { address: 'Palm Heights', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3445, longitude: -81.3885 },
    contact: { phone: '+1-345-949-4111' }, media: { thumbnail: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 15, priceTo: 40, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 345 },
    tags: ['stylish', 'farm-to-table', 'caribbean', 'trendy'], keywords: ['tillies', 'palm heights bar'],
    embeddingText: 'Tillies Palm Heights stylish farm-to-table Caribbean creative drinks trendy',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'bar-013', category: 'bar', name: 'Wreck Bar at Rum Point',
    description: 'Classic beach bar at Rum Point serving famous mudslides and rum punches.',
    shortDescription: 'Classic beach bar with famous mudslides.',
    location: { address: 'Rum Point', district: 'North Side', island: 'Grand Cayman', latitude: 19.3697, longitude: -81.2598 },
    contact: { phone: '+1-345-947-9412' }, media: { thumbnail: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 8, priceTo: 18, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 2345 },
    tags: ['beach bar', 'mudslide', 'rum point', 'classic'], keywords: ['wreck bar', 'rum point bar'],
    embeddingText: 'Wreck Bar Rum Point beach bar mudslide rum punch North Side classic',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'bar-014', category: 'bar', name: 'Coccoloba at Seafire',
    description: 'Beachfront restaurant and bar at Kimpton Seafire with sunset cocktails.',
    shortDescription: 'Beachfront bar with sunset cocktails at Seafire.',
    location: { address: 'Kimpton Seafire Resort', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3511, longitude: -81.3921 },
    contact: { phone: '+1-345-746-0000' }, media: { thumbnail: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 15, priceTo: 35, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 456 },
    tags: ['beachfront', 'sunset', 'cocktails', 'seafire'], keywords: ['coccoloba', 'seafire bar'],
    embeddingText: 'Coccoloba Kimpton Seafire beachfront sunset cocktails elegant',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ ACTIVITIES & TOURS ============

export const CAYMAN_ACTIVITIES: KnowledgeNode[] = [
  {
    id: 'act-001',
    category: 'activity',
    name: 'Cayman Turtle Centre',
    description: `Interactive marine park and conservation facility. Swim with turtles, snorkel in the lagoon, and learn about conservation.`,
    shortDescription: 'Marine park where you can swim with and learn about sea turtles.',
    location: { address: '786 NW Point Road, West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3823, longitude: -81.4156 },
    contact: { phone: '+1-345-949-3894', website: 'https://www.turtle.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1518467166778-b88f373ffec7?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 35, priceTo: 65, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 5678 },
    tags: ['attraction', 'turtles', 'family', 'conservation', 'swimming'],
    keywords: ['turtle centre', 'swim with turtles', 'family attraction'],
    embeddingText: 'Cayman Turtle Centre marine park swim turtles snorkel lagoon conservation family West Bay',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-002',
    category: 'activity',
    name: 'North Sound Golf Club',
    description: `Championship 18-hole course designed by Roy Case. The only golf course in the Cayman Islands.`,
    shortDescription: 'Championship 18-hole golf course - the only one in Cayman.',
    location: { address: 'Off Esterley Tibbetts Highway', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3512, longitude: -81.3678 },
    contact: { phone: '+1-345-947-4653', website: 'https://www.northsoundclub.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 150, priceTo: 300, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 456 },
    tags: ['golf', 'championship', 'sports', 'exclusive'],
    keywords: ['north sound golf', 'golf cayman', 'golf course'],
    embeddingText: 'North Sound Golf Club championship 18-hole Roy Case only golf course Cayman Islands',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-003',
    category: 'activity',
    name: 'Cayman Crystal Caves',
    description: `Guided tours through ancient crystal caves with stunning stalactite and stalagmite formations.`,
    shortDescription: 'Guided tours through ancient caves with crystal formations.',
    location: { address: 'Old Man Bay, North Side', district: 'North Side', island: 'Grand Cayman', latitude: 19.3545, longitude: -81.2134 },
    contact: { phone: '+1-345-925-3001', website: 'https://www.caymancrystalcaves.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1520357145805-d7dc4b0c0f8a?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 40, priceTo: 80, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 1234 },
    tags: ['caves', 'nature', 'tour', 'unique', 'adventure'],
    keywords: ['crystal caves', 'cave tour cayman', 'stalactites'],
    embeddingText: 'Cayman Crystal Caves guided tour stalactite stalagmite formations nature adventure North Side',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-004',
    category: 'activity',
    name: 'Hell Post Office',
    description: `Famous attraction in West Bay where you can send postcards "from Hell." Unique rock formations.`,
    shortDescription: 'Famous attraction with unique rock formations - send postcards from Hell!',
    location: { address: 'Hell Road, West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3734, longitude: -81.4012 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 0, priceTo: 5, currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 3456 },
    tags: ['attraction', 'quirky', 'postcards', 'free', 'west bay'],
    keywords: ['hell cayman', 'post office hell', 'quirky attraction'],
    embeddingText: 'Hell Post Office West Bay postcards unique rock formations quirky attraction free',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-005',
    category: 'activity',
    name: 'Dolphin Discovery',
    description: `Interactive dolphin experience with swim programs, encounters, and educational presentations.`,
    shortDescription: 'Interactive dolphin encounters and swim programs.',
    location: { address: 'NW Point Road, West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3812, longitude: -81.4145 },
    contact: { phone: '+1-345-949-7946', website: 'https://www.dolphindiscovery.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-8dd44758c2dd?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 100, priceTo: 300, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 2345 },
    tags: ['dolphins', 'swim', 'family', 'interactive', 'marine'],
    keywords: ['dolphin discovery', 'swim with dolphins', 'dolphin encounter'],
    embeddingText: 'Dolphin Discovery swim dolphins interactive encounter family marine West Bay',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-006',
    category: 'activity',
    name: 'Red Sail Sports',
    description: `Full-service water sports operator offering sailing, snorkeling, diving, kayaking, and more.`,
    shortDescription: 'Full-service water sports: sailing, snorkeling, diving, kayaking.',
    location: { address: 'Multiple locations', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3389, longitude: -81.3879 },
    contact: { phone: '+1-345-945-5965', website: 'https://www.redsailcayman.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 50, priceTo: 200, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 3456 },
    tags: ['water sports', 'sailing', 'snorkeling', 'kayaking', 'diving'],
    keywords: ['red sail sports', 'water sports cayman', 'sailing'],
    embeddingText: 'Red Sail Sports water sports sailing snorkeling diving kayaking parasailing Seven Mile Beach',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-007',
    category: 'activity',
    name: 'Cayman Kayaks',
    description: `Eco-tours by kayak through bioluminescent bays and mangrove channels. Magical nighttime experiences.`,
    shortDescription: 'Kayak eco-tours through bioluminescent bays and mangroves.',
    location: { address: 'Rum Point', district: 'North Side', island: 'Grand Cayman', latitude: 19.3697, longitude: -81.2631 },
    contact: { phone: '+1-345-926-4467', website: 'https://www.caymankayaks.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1472608756085-68db755f2c08?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 60, priceTo: 120, currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 1234 },
    tags: ['kayak', 'bioluminescence', 'eco-tour', 'night tour', 'mangroves'],
    keywords: ['cayman kayaks', 'bioluminescent tour', 'night kayak'],
    embeddingText: 'Cayman Kayaks eco-tour bioluminescent bay mangroves night magical Rum Point',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-008',
    category: 'activity',
    name: 'Submarine Tour - Atlantis',
    description: `Dive to 100 feet in a real submarine to explore coral reefs without getting wet. Great for non-swimmers.`,
    shortDescription: 'Submarine tour to 100 feet - explore reefs without getting wet.',
    location: { address: 'George Town Harbor', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3834 },
    contact: { phone: '+1-345-949-7700', website: 'https://www.caymanislandssubmarines.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 100, priceTo: 150, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 987 },
    tags: ['submarine', 'unique', 'family', 'non-swimmers', 'underwater'],
    keywords: ['submarine tour', 'atlantis submarine', 'underwater tour'],
    embeddingText: 'Atlantis Submarine tour 100 feet coral reefs underwater non-swimmers family George Town',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  // ===== MORE ACTIVITIES =====
  {
    id: 'act-009', category: 'activity', name: 'National Gallery of the Cayman Islands',
    description: 'Premier art museum showcasing Caribbean and international contemporary art.',
    shortDescription: 'Premier art museum with Caribbean contemporary art.',
    location: { address: 'Esterley Tibbetts Highway', district: 'George Town', island: 'Grand Cayman', latitude: 19.3156, longitude: -81.3678 },
    contact: { phone: '+1-345-945-8111', website: 'https://www.nationalgallery.org.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1594642133454-54f614e6e1d4?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 0, priceTo: 10, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 345 },
    tags: ['museum', 'art', 'culture', 'free'], keywords: ['national gallery', 'art museum cayman'],
    embeddingText: 'National Gallery Cayman Islands art museum Caribbean contemporary culture',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-010', category: 'activity', name: 'Cayman Motor Museum',
    description: 'Collection of rare and exotic automobiles including Ferrari, Porsche, and classic cars.',
    shortDescription: 'Rare and exotic automobile collection.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3234, longitude: -81.3789 },
    contact: { phone: '+1-345-947-7741', website: 'https://www.caymanmotormuseum.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 15, priceTo: 25, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 234 },
    tags: ['museum', 'cars', 'automotive', 'unique'], keywords: ['motor museum', 'car museum cayman'],
    embeddingText: 'Cayman Motor Museum rare exotic automobiles Ferrari Porsche classic cars',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-011', category: 'activity', name: 'Pedro St. James Historic Site',
    description: 'Birthplace of democracy in the Cayman Islands. Historic great house and gardens.',
    shortDescription: 'Historic great house - birthplace of Cayman democracy.',
    location: { address: 'Pedro Castle Road, Savannah', district: 'Bodden Town', island: 'Grand Cayman', latitude: 19.2678, longitude: -81.2934 },
    contact: { phone: '+1-345-947-3329', website: 'https://www.pedrostjames.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 10, priceTo: 20, currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 567 },
    tags: ['historic', 'culture', 'heritage', 'museum'], keywords: ['pedro st james', 'historic site cayman'],
    embeddingText: 'Pedro St James historic site birthplace democracy Cayman Islands great house Savannah',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-012', category: 'activity', name: 'Mastic Trail',
    description: 'Two-mile nature trail through ancient woodland with native flora and fauna.',
    shortDescription: 'Nature trail through ancient Cayman woodland.',
    location: { address: 'Frank Sound Road', district: 'North Side', island: 'Grand Cayman', latitude: 19.3234, longitude: -81.2456 },
    contact: { phone: '+1-345-749-1121', website: 'https://www.nationaltrust.org.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 15, priceTo: 40, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 345 },
    tags: ['hiking', 'nature', 'wildlife', 'trail'], keywords: ['mastic trail', 'hiking cayman'],
    embeddingText: 'Mastic Trail nature hiking ancient woodland native flora fauna North Side',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-013', category: 'activity', name: 'Queen Elizabeth II Botanic Park',
    description: 'Beautiful botanical gardens showcasing native flora and the endangered Blue Iguana.',
    shortDescription: 'Botanical gardens with Blue Iguana habitat.',
    location: { address: 'Frank Sound Road, North Side', district: 'North Side', island: 'Grand Cayman', latitude: 19.3189, longitude: -81.2167 },
    contact: { phone: '+1-345-947-9462', website: 'https://www.botanic-park.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 10, priceTo: 15, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 1234 },
    tags: ['botanic', 'gardens', 'iguana', 'nature'], keywords: ['botanic park', 'blue iguana', 'gardens cayman'],
    embeddingText: 'Queen Elizabeth II Botanic Park botanical gardens Blue Iguana native flora nature',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-014', category: 'activity', name: 'Parasailing Cayman',
    description: 'Soar above Seven Mile Beach with stunning aerial views of the coastline.',
    shortDescription: 'Parasailing with views of Seven Mile Beach.',
    location: { address: 'Seven Mile Beach', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3389, longitude: -81.3879 },
    contact: { phone: '+1-345-949-5965' }, media: { thumbnail: 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 80, priceTo: 150, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 567 },
    tags: ['parasailing', 'water sports', 'adventure', 'aerial'], keywords: ['parasailing cayman', 'water sports'],
    embeddingText: 'Parasailing Cayman Seven Mile Beach aerial views coastline water sports adventure',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-015', category: 'activity', name: 'Jet Ski Tours',
    description: 'Guided jet ski tours around Grand Cayman with Stingray City and snorkel stops.',
    shortDescription: 'Guided jet ski tours with Stingray City stops.',
    location: { address: 'Seven Mile Beach', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3356, longitude: -81.3845 },
    contact: { phone: '+1-345-916-1144' }, media: { thumbnail: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 100, priceTo: 200, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 456 },
    tags: ['jet ski', 'water sports', 'tour', 'stingray city'], keywords: ['jet ski cayman', 'water sports tour'],
    embeddingText: 'Jet Ski Tours Grand Cayman Stingray City snorkel water sports guided tour',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-016', category: 'activity', name: 'Cayman Spirits Distillery',
    description: 'Rum distillery tour and tasting featuring locally-made Seven Fathoms rum.',
    shortDescription: 'Rum distillery tour with Seven Fathoms tasting.',
    location: { address: 'Bronze Road, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2867, longitude: -81.3612 },
    contact: { phone: '+1-345-925-5379', website: 'https://www.caymanspirits.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 25, priceTo: 50, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 678 },
    tags: ['rum', 'distillery', 'tour', 'tasting'], keywords: ['seven fathoms', 'rum distillery cayman'],
    embeddingText: 'Cayman Spirits Distillery Seven Fathoms rum tour tasting local spirits',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-017', category: 'activity', name: 'Divetech',
    description: 'Premier dive operator offering shore diving, boat dives, and certifications.',
    shortDescription: 'Premier dive operator with shore and boat dives.',
    location: { address: 'NW Point Road, West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3823, longitude: -81.4178 },
    contact: { phone: '+1-345-946-5658', website: 'https://www.divetech.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 80, priceTo: 200, currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 1234 },
    tags: ['diving', 'dive shop', 'certification', 'scuba'], keywords: ['divetech', 'dive operator cayman'],
    embeddingText: 'Divetech premier dive operator shore diving boat dives certifications West Bay',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-018', category: 'activity', name: 'Sunset Divers',
    description: 'Dive operation at Sunset House with access to famous house reef.',
    shortDescription: 'Dive operation with famous house reef access.',
    location: { address: 'Sunset House, S Church Street', district: 'George Town', island: 'Grand Cayman', latitude: 19.2845, longitude: -81.3895 },
    contact: { phone: '+1-345-949-7111', website: 'https://www.sunsethouse.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 70, priceTo: 180, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 876 },
    tags: ['diving', 'dive shop', 'house reef', 'scuba'], keywords: ['sunset divers', 'dive operation'],
    embeddingText: 'Sunset Divers Sunset House house reef diving George Town scuba',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-019', category: 'activity', name: 'Ocean Frontiers',
    description: 'East End dive operator with pristine, uncrowded dive sites.',
    shortDescription: 'East End dive operator with uncrowded sites.',
    location: { address: 'East End', district: 'East End', island: 'Grand Cayman', latitude: 19.3078, longitude: -81.1134 },
    contact: { phone: '+1-345-947-7500', website: 'https://www.oceanfrontiers.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 85, priceTo: 200, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 567 },
    tags: ['diving', 'east end', 'uncrowded', 'scuba'], keywords: ['ocean frontiers', 'east end diving'],
    embeddingText: 'Ocean Frontiers East End dive operator pristine uncrowded dive sites',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-020', category: 'activity', name: 'Cayman Aggressor',
    description: 'Liveaboard dive boat offering multi-day dive adventures around the Cayman Islands.',
    shortDescription: 'Liveaboard dive boat for multi-day adventures.',
    location: { address: 'George Town Harbor', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3834 },
    contact: { phone: '+1-345-949-5551', website: 'https://www.aggressor.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 2500, priceTo: 5000, currency: 'USD' },
    ratings: { overall: 4.9, reviewCount: 234 },
    tags: ['liveaboard', 'diving', 'multi-day', 'luxury'], keywords: ['cayman aggressor', 'liveaboard diving'],
    embeddingText: 'Cayman Aggressor liveaboard dive boat multi-day adventures luxury diving',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-021', category: 'activity', name: 'Paddleboard Cayman',
    description: 'Stand-up paddleboard rentals and tours including sunset and bioluminescent bay tours.',
    shortDescription: 'SUP rentals and tours including bio bay tours.',
    location: { address: 'Seven Mile Beach', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3389, longitude: -81.3879 },
    contact: { phone: '+1-345-916-4449' }, media: { thumbnail: 'https://images.unsplash.com/photo-1472608756085-68db755f2c08?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 40, priceTo: 100, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 345 },
    tags: ['paddleboard', 'sup', 'water sports', 'tours'], keywords: ['paddleboard cayman', 'sup rentals'],
    embeddingText: 'Paddleboard Cayman SUP stand-up paddleboard rentals tours sunset bioluminescent bay',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-022', category: 'activity', name: 'Cayman Islands Brewery',
    description: 'Local craft brewery tours featuring Caybrew and specialty beers.',
    shortDescription: 'Local brewery tours featuring Caybrew.',
    location: { address: 'Red Bay', district: 'George Town', island: 'Grand Cayman', latitude: 19.2812, longitude: -81.3534 },
    contact: { phone: '+1-345-947-6699', website: 'https://www.caymanislandsbrewery.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 15, priceTo: 35, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 456 },
    tags: ['brewery', 'beer', 'tour', 'local'], keywords: ['caybrew', 'brewery tour cayman'],
    embeddingText: 'Cayman Islands Brewery Caybrew craft beer tour local specialty',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-023', category: 'activity', name: 'Cayman Brac Bluff Hiking',
    description: 'Hiking trails along the dramatic 140-foot limestone Bluff with panoramic views.',
    shortDescription: 'Hiking the dramatic 140-foot Bluff with views.',
    location: { address: 'The Bluff, Cayman Brac', district: 'The Bluff', island: 'Cayman Brac', latitude: 19.7345, longitude: -79.7789 },
    contact: {}, media: { thumbnail: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 0, priceTo: 10, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 234 },
    tags: ['hiking', 'bluff', 'nature', 'cayman brac', 'views'], keywords: ['brac bluff', 'hiking cayman brac'],
    embeddingText: 'Cayman Brac Bluff hiking limestone panoramic views nature trails Sister Islands',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-024', category: 'activity', name: 'Booby Pond Nature Reserve',
    description: 'Little Cayman bird sanctuary home to the largest red-footed booby colony in Caribbean.',
    shortDescription: 'Bird sanctuary with red-footed booby colony.',
    location: { address: 'Blossom Village, Little Cayman', district: 'Blossom Village', island: 'Little Cayman', latitude: 19.6712, longitude: -80.0678 },
    contact: { website: 'https://www.nationaltrust.org.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1549608276-5786777e6587?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 0, priceTo: 5, currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 123 },
    tags: ['birding', 'nature', 'wildlife', 'little cayman'], keywords: ['booby pond', 'bird watching cayman'],
    embeddingText: 'Booby Pond Nature Reserve Little Cayman bird sanctuary red-footed booby colony wildlife',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-025', category: 'activity', name: 'Deep Sea Fishing Charter',
    description: 'Full and half-day fishing charters targeting marlin, wahoo, tuna, and mahi-mahi.',
    shortDescription: 'Deep sea fishing for marlin, wahoo, and tuna.',
    location: { address: 'George Town Harbor', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3834 },
    contact: { phone: '+1-345-949-3200' }, media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-92ab472cad5d?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 600, priceTo: 1500, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 345 },
    tags: ['fishing', 'deep sea', 'charter', 'sport fishing'], keywords: ['deep sea fishing', 'fishing charter cayman'],
    embeddingText: 'Deep Sea Fishing Charter marlin wahoo tuna mahi-mahi sport fishing George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-026', category: 'activity', name: 'Pirate Caves',
    description: 'Explore underground caves with stalactites at this family attraction.',
    shortDescription: 'Family underground cave exploration.',
    location: { address: 'Bodden Town', district: 'Bodden Town', island: 'Grand Cayman', latitude: 19.2789, longitude: -81.2534 },
    contact: { phone: '+1-345-947-3122' }, media: { thumbnail: 'https://images.unsplash.com/photo-1520357145805-d7dc4b0c0f8a?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 8, priceTo: 15, currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 567 },
    tags: ['caves', 'family', 'attraction', 'exploration'], keywords: ['pirate caves', 'caves bodden town'],
    embeddingText: 'Pirate Caves underground stalactites family attraction Bodden Town exploration',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-027', category: 'activity', name: 'Mission House',
    description: 'Historic 19th-century Presbyterian mission house museum in Bodden Town.',
    shortDescription: 'Historic 19th-century mission house museum.',
    location: { address: 'Bodden Town', district: 'Bodden Town', island: 'Grand Cayman', latitude: 19.2823, longitude: -81.2567 },
    contact: { phone: '+1-345-947-6051', website: 'https://www.nationaltrust.org.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 5, priceTo: 10, currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 123 },
    tags: ['historic', 'museum', 'culture', 'heritage'], keywords: ['mission house', 'historic bodden town'],
    embeddingText: 'Mission House historic Presbyterian museum Bodden Town 19th century heritage',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-028', category: 'activity', name: 'Kite Beach Kitesurfing',
    description: 'Premier kitesurfing location with lessons and rentals for all skill levels.',
    shortDescription: 'Premier kitesurfing with lessons and rentals.',
    location: { address: 'Barkers Beach, West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3723, longitude: -81.4234 },
    contact: { phone: '+1-345-525-5483' }, media: { thumbnail: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 100, priceTo: 250, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 234 },
    tags: ['kitesurfing', 'water sports', 'lessons', 'adventure'], keywords: ['kitesurfing cayman', 'kite beach'],
    embeddingText: 'Kite Beach kitesurfing Barkers West Bay lessons rentals water sports adventure',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-029', category: 'activity', name: 'Camana Bay Cinema',
    description: 'Modern 6-screen cinema showing latest Hollywood releases.',
    shortDescription: 'Modern cinema with latest Hollywood releases.',
    location: { address: 'Camana Bay', district: 'Camana Bay', island: 'Grand Cayman', latitude: 19.3271, longitude: -81.3775 },
    contact: { phone: '+1-345-640-3456' }, media: { thumbnail: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 12, priceTo: 20, currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 567 },
    tags: ['cinema', 'entertainment', 'movies', 'camana bay'], keywords: ['cinema cayman', 'movies camana bay'],
    embeddingText: 'Camana Bay Cinema movies Hollywood entertainment modern 6-screen',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'act-030', category: 'activity', name: 'Sunset Sail',
    description: 'Romantic catamaran sunset cruises with champagne and Caribbean views.',
    shortDescription: 'Romantic catamaran sunset cruises with champagne.',
    location: { address: 'Seven Mile Beach', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3389, longitude: -81.3879 },
    contact: { phone: '+1-345-949-5965' }, media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-8dd44758c2dd?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 60, priceTo: 120, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 876 },
    tags: ['sailing', 'sunset', 'romantic', 'champagne'], keywords: ['sunset sail', 'catamaran cruise'],
    embeddingText: 'Sunset Sail catamaran romantic champagne Caribbean views Seven Mile Beach',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ VIP SERVICES ============

export const CAYMAN_VIP_SERVICES: KnowledgeNode[] = [
  {
    id: 'vip-001',
    category: 'boat_charter',
    name: 'Cayman Luxury Charters',
    description: `Premium yacht and catamaran charters for the ultimate Caribbean experience. From sunset cruises to multi-day adventures.

**Fleet:**
- 60ft Sunseeker Yacht (12 guests)
- 50ft Catamaran (20 guests)
- 45ft Fishing Yacht
- Various speedboats

**Experiences:**
- Sunset champagne cruises
- Private Stingray City trips
- Multi-island adventures
- Fishing charters
- Wedding ceremonies

**Inclusions:**
- Professional captain and crew
- Premium open bar
- Gourmet catering available
- Water toys and snorkel gear
- Bluetooth sound system

Perfect for: Groups, celebrations, romantic getaways, exclusive experiences`,
    shortDescription: 'Premium yacht and catamaran charters for exclusive Caribbean experiences.',
    location: {
      address: 'Cayman Islands Yacht Club, George Town',
      district: 'George Town',
      island: 'Grand Cayman',
      latitude: 19.2903,
      longitude: -81.3832
    },
    contact: {
      phone: '+1-345-925-8888',
      email: 'charter@caymanluxury.com',
      website: 'https://caymanluxurycharters.com',
      bookingUrl: 'https://caymanluxurycharters.com/book',
      instagram: 'caymanluxurycharters'
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800',
      images: []
    },
    business: {
      priceRange: '$$$$',
      priceFrom: 1500,
      priceTo: 15000,
      currency: 'USD'
    },
    ratings: {
      overall: 4.9,
      reviewCount: 287,
      tripadvisorRating: 5.0,
      googleRating: 4.9
    },
    tags: ['yacht', 'charter', 'luxury', 'private', 'sunset cruise', 'celebration'],
    keywords: ['yacht charter cayman', 'boat rental cayman', 'luxury boat', 'private charter'],
    embeddingText: 'Cayman Luxury Charters yacht catamaran boat charter private cruise sunset champagne Stingray City fishing wedding premium VIP experience crew catering',
    isActive: true,
    isPremium: true,
    isFeatured: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    createdBy: 'system',
    customFields: {
      boatType: 'yacht',
      length: 60,
      capacity: 12,
      crewIncluded: true,
      crewSize: 2,
      pricePerHour: 500,
      pricePerDay: 3500,
      includesFood: true,
      includesDrinks: true,
      includesWaterToys: true,
      waterToys: ['snorkel gear', 'paddleboards', 'floating mats'],
      destinations: ['Stingray City', 'Starfish Point', 'Rum Point', 'Seven Mile Beach']
    }
  },
  {
    id: 'vip-002',
    category: 'villa_rental',
    name: 'Castillo Caribe',
    description: `The most exclusive private estate in the Cayman Islands - a $60 million Caribbean castle on South Sound.

**The Property:**
- 30,000 sq ft main residence
- 10 bedrooms, 12 bathrooms
- 400 feet of private beachfront
- Infinity pools (multiple)
- Private dock with yacht berth
- Tennis court, gym, spa
- Staff quarters

**Included Staff:**
- Butler/House Manager
- Private Chef
- Housekeeping (daily)
- Security
- Groundskeepers

**Amenities:**
- Movie theater
- Wine cellar (1,000+ bottles)
- Commercial kitchen
- Elevator
- 6-car garage

Minimum stay: 7 nights
Perfect for: Ultra-high-net-worth individuals, celebrity retreats, exclusive events`,
    shortDescription: '$60M Caribbean castle estate with 10 bedrooms, private beach, and full staff.',
    location: {
      address: 'South Sound, Grand Cayman',
      district: 'South Sound',
      island: 'Grand Cayman',
      latitude: 19.2789,
      longitude: -81.3654
    },
    contact: {
      email: 'reservations@castillocaribe.com',
      website: 'https://www.castillocaribe.com',
      bookingUrl: 'https://www.castillocaribe.com/inquire'
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
      images: []
    },
    business: {
      priceRange: '$$$$$',
      priceFrom: 25000,
      priceTo: 50000,
      currency: 'USD'
    },
    ratings: {
      overall: 5.0,
      reviewCount: 12
    },
    tags: ['ultra-luxury', 'villa', 'private', 'beachfront', 'staff', 'exclusive', 'celebrity'],
    keywords: ['luxury villa cayman', 'castillo caribe', 'private estate', 'celebrity rental'],
    embeddingText: 'Castillo Caribe ultra-luxury villa private estate beachfront mansion 10 bedrooms full staff butler chef pools tennis South Sound exclusive celebrity wedding event',
    isActive: true,
    isPremium: true,
    isFeatured: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    createdBy: 'system',
    customFields: {
      bedrooms: 10,
      bathrooms: 12,
      maxGuests: 20,
      squareFeet: 30000,
      amenities: ['infinity pools', 'private beach', 'tennis', 'gym', 'spa', 'theater', 'wine cellar', 'dock'],
      hasPool: true,
      isBeachfront: true,
      hasPrivateBeach: true,
      hasStaff: true,
      staffIncludes: ['butler', 'chef', 'housekeeping', 'security', 'groundskeeper'],
      minimumStay: 7,
      pricePerNight: 35000
    }
  },
  // ===== MORE VIP SERVICES =====
  {
    id: 'vip-003', category: 'villa_rental', name: 'Villa Papagayo',
    description: 'Stunning oceanfront villa in West Bay with 6 bedrooms, infinity pool, and private beach.',
    shortDescription: 'Oceanfront 6-bedroom villa with infinity pool.',
    location: { address: 'West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3712, longitude: -81.4089 },
    contact: { email: 'info@villapapagayo.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 2500, priceTo: 5000, currency: 'USD' },
    ratings: { overall: 4.9, reviewCount: 56 },
    tags: ['villa', 'luxury', 'oceanfront', 'pool', 'private'], keywords: ['villa papagayo', 'luxury villa west bay'],
    embeddingText: 'Villa Papagayo luxury oceanfront West Bay 6 bedrooms infinity pool private beach',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'vip-004', category: 'villa_rental', name: 'Coral Stone Club',
    description: 'Exclusive 3-bedroom villas directly on Seven Mile Beach with full concierge.',
    shortDescription: 'Exclusive beachfront villas on Seven Mile Beach.',
    location: { address: 'Seven Mile Beach', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3523, longitude: -81.3923 },
    contact: { phone: '+1-345-945-5820' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 1500, priceTo: 3500, currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 123 },
    tags: ['villa', 'beachfront', 'luxury', 'concierge'], keywords: ['coral stone club', 'beachfront villa'],
    embeddingText: 'Coral Stone Club exclusive villas Seven Mile Beach beachfront concierge luxury',
    isActive: true, isPremium: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'vip-005', category: 'boat_charter', name: 'Captain Marvins',
    description: 'Premium sailing and snorkeling tours including Stingray City with experienced captain.',
    shortDescription: 'Premium sailing tours to Stingray City.',
    location: { address: 'Seven Mile Beach', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3389, longitude: -81.3879 },
    contact: { phone: '+1-345-945-6975' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 50, priceTo: 150, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 2345 },
    tags: ['sailing', 'snorkeling', 'stingray city', 'tour'], keywords: ['captain marvin', 'snorkel tour'],
    embeddingText: 'Captain Marvins sailing snorkeling Stingray City tour premium experienced',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'vip-006', category: 'service', name: 'Cayman Concierge',
    description: 'Personalized concierge services including restaurant reservations, activities, and VIP access.',
    shortDescription: 'Personalized concierge for reservations and VIP access.',
    location: { address: 'Island-wide service', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3812 },
    contact: { phone: '+1-345-916-8888' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 100, priceTo: 500, currency: 'USD' },
    ratings: { overall: 4.9, reviewCount: 123 },
    tags: ['concierge', 'vip', 'reservations', 'service'], keywords: ['concierge service', 'vip cayman'],
    embeddingText: 'Cayman Concierge personalized service reservations VIP access activities luxury',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'vip-007', category: 'service', name: 'Private Chef Cayman',
    description: 'In-villa private chef experiences with customized menus and local ingredients.',
    shortDescription: 'In-villa private chef experiences.',
    location: { address: 'Island-wide service', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3812 },
    contact: { phone: '+1-345-925-4343' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 300, priceTo: 1000, currency: 'USD' },
    ratings: { overall: 4.9, reviewCount: 87 },
    tags: ['private chef', 'dining', 'luxury', 'in-villa'], keywords: ['private chef cayman', 'in-villa dining'],
    embeddingText: 'Private Chef Cayman in-villa dining customized menus local ingredients luxury experience',
    isActive: true, isPremium: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'vip-008', category: 'service', name: 'Cayman Helicopters',
    description: 'Helicopter tours and private transfers around the Cayman Islands.',
    shortDescription: 'Helicopter tours and private transfers.',
    location: { address: 'Owen Roberts Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { phone: '+1-345-949-7799' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1534321238895-da3ab632df3e?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 400, priceTo: 2000, currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 156 },
    tags: ['helicopter', 'tours', 'aerial', 'luxury'], keywords: ['helicopter cayman', 'aerial tour'],
    embeddingText: 'Cayman Helicopters tours aerial private transfers luxury views islands',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ SHOPPING ============

export const CAYMAN_SHOPPING: KnowledgeNode[] = [
  {
    id: 'shop-001',
    category: 'shopping',
    name: 'Camana Bay',
    description: `Upscale waterfront town center with boutiques, restaurants, cinemas, and weekly farmers market.`,
    shortDescription: 'Upscale waterfront town center with boutiques and dining.',
    location: { address: 'Camana Bay', district: 'Camana Bay', island: 'Grand Cayman', latitude: 19.3271, longitude: -81.3775 },
    contact: { website: 'https://www.camanabay.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800', images: [] },
    business: { priceRange: '$$$', currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 2345 },
    tags: ['shopping', 'dining', 'entertainment', 'upscale', 'cinema'],
    keywords: ['camana bay', 'shopping cayman', 'boutiques'],
    embeddingText: 'Camana Bay waterfront town center boutiques restaurants cinema farmers market upscale shopping',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'shop-002',
    category: 'shopping',
    name: 'Kirk Freeport',
    description: `Duty-free luxury shopping for watches, jewelry, and designer goods in George Town.`,
    shortDescription: 'Duty-free luxury watches, jewelry, and designer goods.',
    location: { address: 'Cardinal Avenue, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2934, longitude: -81.3823 },
    contact: { phone: '+1-345-949-7477', website: 'https://www.kirkfreeport.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', images: [] },
    business: { priceRange: '$$$$', currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 1234 },
    tags: ['shopping', 'duty-free', 'luxury', 'watches', 'jewelry'],
    keywords: ['kirk freeport', 'duty free cayman', 'luxury shopping'],
    embeddingText: 'Kirk Freeport duty-free luxury watches jewelry designer goods George Town Rolex Cartier',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'shop-003',
    category: 'shopping',
    name: 'Tortuga Rum Company',
    description: `Famous Cayman rum cakes and Caribbean rum. The iconic Cayman souvenir.`,
    shortDescription: 'Famous Cayman rum cakes - the iconic island souvenir.',
    location: { address: 'Multiple locations', district: 'George Town', island: 'Grand Cayman', latitude: 19.2912, longitude: -81.3801 },
    contact: { phone: '+1-345-949-7701', website: 'https://www.tortugarums.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 3456 },
    tags: ['shopping', 'souvenirs', 'rum', 'rum cake', 'gifts'],
    keywords: ['tortuga rum', 'rum cake cayman', 'souvenirs'],
    embeddingText: 'Tortuga Rum Company rum cakes Caribbean rum souvenirs gifts iconic Cayman',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'shop-004',
    category: 'shopping',
    name: 'Cayman Craft Market',
    description: `Local artisan market with handmade crafts, art, and souvenirs by Caymanian artists.`,
    shortDescription: 'Local artisan market with handmade Caymanian crafts.',
    location: { address: 'Harbour Drive, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2945, longitude: -81.3812 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 567 },
    tags: ['shopping', 'local', 'crafts', 'artisan', 'souvenirs'],
    keywords: ['craft market', 'local crafts cayman', 'artisan market'],
    embeddingText: 'Cayman Craft Market local artisan handmade crafts souvenirs Caymanian artists George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'shop-005',
    category: 'shopping',
    name: 'Pure Art Gallery',
    description: `Fine art gallery featuring Caribbean and Caymanian artists. Original paintings, prints, and sculptures.`,
    shortDescription: 'Fine art gallery featuring Caribbean and Caymanian artists.',
    location: { address: 'S Church Street, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2867, longitude: -81.3878 },
    contact: { phone: '+1-345-949-9133', website: 'https://www.pureart.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1594642133454-54f614e6e1d4?w=800', images: [] },
    business: { priceRange: '$$$', currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 234 },
    tags: ['art', 'gallery', 'caribbean art', 'local artists'],
    keywords: ['pure art', 'art gallery cayman', 'caribbean art'],
    embeddingText: 'Pure Art Gallery fine art Caribbean Caymanian artists paintings prints sculptures George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'shop-006',
    category: 'shopping',
    name: "Guy Harvey Gallery",
    description: `Gallery showcasing world-famous marine artist Guy Harvey's original works and prints.`,
    shortDescription: 'World-famous marine artist Guy Harvey gallery.',
    location: { address: 'S Church Street, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2889, longitude: -81.3856 },
    contact: { phone: '+1-345-943-4891', website: 'https://www.guyharvey.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800', images: [] },
    business: { priceRange: '$$$', currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 456 },
    tags: ['art', 'marine art', 'guy harvey', 'gallery'],
    keywords: ['guy harvey', 'marine art cayman', 'ocean art'],
    embeddingText: 'Guy Harvey Gallery marine artist ocean art original works prints George Town',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  // ===== MORE SHOPPING =====
  {
    id: 'shop-007', category: 'shopping', name: 'Island Jewellers',
    description: 'Duty-free jewelry and watches from leading brands including Rolex and Cartier.',
    shortDescription: 'Duty-free luxury jewelry and watches.',
    location: { address: 'Cardinal Avenue, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2945, longitude: -81.3823 },
    contact: { phone: '+1-345-949-7055' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800', images: [] },
    business: { priceRange: '$$$$', currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 345 },
    tags: ['jewelry', 'watches', 'duty-free', 'luxury'], keywords: ['island jewellers', 'rolex cayman'],
    embeddingText: 'Island Jewellers duty-free luxury jewelry watches Rolex Cartier George Town',
    isActive: true, isPremium: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'shop-008', category: 'shopping', name: 'Foster Food Fair',
    description: 'Main supermarket chain with multiple locations for groceries and supplies.',
    shortDescription: 'Main supermarket chain for groceries.',
    location: { address: 'Multiple locations', district: 'George Town', island: 'Grand Cayman', latitude: 19.2934, longitude: -81.3778 },
    contact: { phone: '+1-345-945-3663' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 567 },
    tags: ['supermarket', 'groceries', 'food', 'supplies'], keywords: ['fosters', 'supermarket cayman'],
    embeddingText: 'Foster Food Fair supermarket groceries supplies multiple locations Grand Cayman',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'shop-009', category: 'shopping', name: 'Books & Books',
    description: 'Independent bookstore in Camana Bay with books, gifts, and café.',
    shortDescription: 'Independent bookstore with café.',
    location: { address: 'Camana Bay', district: 'Camana Bay', island: 'Grand Cayman', latitude: 19.3271, longitude: -81.3775 },
    contact: { phone: '+1-345-640-2665' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 234 },
    tags: ['bookstore', 'books', 'cafe', 'gifts'], keywords: ['books and books', 'bookstore cayman'],
    embeddingText: 'Books & Books independent bookstore Camana Bay cafe gifts reading',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'shop-010', category: 'shopping', name: 'The Cove',
    description: 'Boutique shopping center in West Bay with local shops and eateries.',
    shortDescription: 'Boutique shopping center in West Bay.',
    location: { address: 'Morgan Harbour, West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3678, longitude: -81.4012 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 123 },
    tags: ['shopping center', 'boutiques', 'local'], keywords: ['the cove', 'west bay shopping'],
    embeddingText: 'The Cove boutique shopping center West Bay local shops eateries Morgan Harbour',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'shop-011', category: 'shopping', name: 'Cayman Cigar Company',
    description: 'Premium cigars and accessories with humidor lounge.',
    shortDescription: 'Premium cigars with humidor lounge.',
    location: { address: 'Cardinal Avenue, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2934, longitude: -81.3812 },
    contact: { phone: '+1-345-945-7171' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1486218119243-13883505764c?w=800', images: [] },
    business: { priceRange: '$$$', currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 123 },
    tags: ['cigars', 'premium', 'lounge'], keywords: ['cigar company', 'premium cigars'],
    embeddingText: 'Cayman Cigar Company premium cigars humidor lounge accessories George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'shop-012', category: 'shopping', name: 'Cayman Islands National Museum Gift Shop',
    description: 'Unique Caymanian souvenirs, crafts, and books about local history.',
    shortDescription: 'Unique Caymanian souvenirs and history books.',
    location: { address: 'Harbour Drive, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3823 },
    contact: { phone: '+1-345-949-8368' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 234 },
    tags: ['souvenirs', 'museum', 'crafts', 'history'], keywords: ['museum gift shop', 'caymanian souvenirs'],
    embeddingText: 'National Museum Gift Shop Caymanian souvenirs crafts history books George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'shop-013', category: 'shopping', name: 'Colombian Emeralds',
    description: 'Duty-free emeralds and fine jewelry from South American mines.',
    shortDescription: 'Duty-free emeralds and fine jewelry.',
    location: { address: 'Harbour Drive, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2967, longitude: -81.3834 },
    contact: { phone: '+1-345-949-2880' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800', images: [] },
    business: { priceRange: '$$$$', currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 456 },
    tags: ['emeralds', 'jewelry', 'duty-free', 'luxury'], keywords: ['colombian emeralds', 'emeralds cayman'],
    embeddingText: 'Colombian Emeralds duty-free fine jewelry South American George Town luxury',
    isActive: true, isPremium: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'shop-014', category: 'shopping', name: 'Blackbeards Rum Cakes',
    description: 'Local rum cake bakery with traditional recipes and island flavors.',
    shortDescription: 'Local rum cake bakery with island flavors.',
    location: { address: 'Eastern Avenue, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2889, longitude: -81.3756 },
    contact: { phone: '+1-345-949-4373' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 567 },
    tags: ['rum cake', 'bakery', 'souvenirs', 'local'], keywords: ['blackbeards rum', 'rum cake souvenirs'],
    embeddingText: 'Blackbeards Rum Cakes local bakery traditional recipes island flavors souvenirs',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ TRANSPORTATION ============

export const CAYMAN_TRANSPORTATION: KnowledgeNode[] = [
  {
    id: 'trans-001',
    category: 'transportation',
    name: 'Owen Roberts International Airport',
    description: `Main airport serving Grand Cayman with direct flights to major US cities, UK, and Caribbean.`,
    shortDescription: 'Main airport with direct flights to US, UK, and Caribbean.',
    location: { address: 'Airport Road, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { phone: '+1-345-943-7070', website: 'https://www.caymanairports.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 2345 },
    tags: ['airport', 'transportation', 'flights'],
    keywords: ['owen roberts airport', 'cayman airport', 'flights cayman'],
    embeddingText: 'Owen Roberts International Airport Grand Cayman direct flights Miami New York London George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'trans-002',
    category: 'transportation',
    name: 'Andy\'s Rent A Car',
    description: `Popular local car rental with competitive rates and good selection of vehicles.`,
    shortDescription: 'Popular local car rental with competitive rates.',
    location: { address: 'Multiple locations', district: 'George Town', island: 'Grand Cayman', latitude: 19.2945, longitude: -81.3678 },
    contact: { phone: '+1-345-949-8111', website: 'https://www.andys.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 40, priceTo: 120, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 1234 },
    tags: ['car rental', 'transportation', 'local'],
    keywords: ['andy rental car', 'car rental cayman', 'rent a car'],
    embeddingText: 'Andy Rent A Car car rental competitive rates local vehicles Grand Cayman',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'trans-003',
    category: 'transportation',
    name: 'Budget Rent A Car',
    description: `International car rental chain with airport and hotel locations throughout Grand Cayman.`,
    shortDescription: 'International car rental at airport and hotel locations.',
    location: { address: 'Owen Roberts Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { phone: '+1-345-949-5605', website: 'https://www.budgetcayman.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 50, priceTo: 150, currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 876 },
    tags: ['car rental', 'transportation', 'airport'],
    keywords: ['budget rental', 'car rental airport', 'rent a car'],
    embeddingText: 'Budget Rent A Car international airport hotel locations Grand Cayman',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'trans-004',
    category: 'transportation',
    name: 'Charlie\'s Super Taxi',
    description: `Reliable taxi service for airport transfers and island tours. 24/7 availability.`,
    shortDescription: 'Reliable 24/7 taxi service for transfers and tours.',
    location: { address: 'Island-wide service', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3812 },
    contact: { phone: '+1-345-926-8294' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 25, priceTo: 100, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 567 },
    tags: ['taxi', 'transportation', 'airport transfer', 'tours'],
    keywords: ['charlie taxi', 'taxi cayman', 'airport transfer'],
    embeddingText: 'Charlie Super Taxi reliable airport transfer island tours 24/7 Grand Cayman',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'trans-005',
    category: 'transportation',
    name: 'Cayman Airways',
    description: `National flag carrier with inter-island flights and international routes to Miami, Tampa, and Jamaica.`,
    shortDescription: 'National airline with inter-island and international flights.',
    location: { address: 'Owen Roberts Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { phone: '+1-345-949-2311', website: 'https://www.caymanairways.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 1234 },
    tags: ['airline', 'transportation', 'inter-island', 'flights'],
    keywords: ['cayman airways', 'inter-island flights', 'airline'],
    embeddingText: 'Cayman Airways national airline inter-island flights Miami Tampa Jamaica Little Cayman Cayman Brac',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  // ===== MORE TRANSPORTATION =====
  {
    id: 'trans-006', category: 'transportation', name: 'Hertz Car Rental',
    description: 'International car rental with airport and hotel locations.',
    shortDescription: 'International car rental at multiple locations.',
    location: { address: 'Owen Roberts Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { phone: '+1-345-949-6640' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 55, priceTo: 160, currency: 'USD' },
    ratings: { overall: 4.1, reviewCount: 567 },
    tags: ['car rental', 'transportation', 'international'], keywords: ['hertz cayman', 'car rental'],
    embeddingText: 'Hertz Car Rental international airport hotel locations Grand Cayman',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'trans-007', category: 'transportation', name: 'Avis Car Rental',
    description: 'International car rental with wide selection of vehicles.',
    shortDescription: 'International rental with wide vehicle selection.',
    location: { address: 'Owen Roberts Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { phone: '+1-345-949-2468' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 50, priceTo: 150, currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 456 },
    tags: ['car rental', 'transportation', 'airport'], keywords: ['avis cayman', 'car rental'],
    embeddingText: 'Avis Car Rental international vehicles airport Grand Cayman',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'trans-008', category: 'transportation', name: 'Public Bus Service',
    description: 'Affordable public buses running routes around Grand Cayman.',
    shortDescription: 'Affordable public buses around Grand Cayman.',
    location: { address: 'George Town Bus Terminal', district: 'George Town', island: 'Grand Cayman', latitude: 19.2934, longitude: -81.3789 },
    contact: { phone: '+1-345-945-5100' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 2, priceTo: 5, currency: 'USD' },
    ratings: { overall: 3.8, reviewCount: 234 },
    tags: ['bus', 'public transport', 'budget'], keywords: ['public bus', 'bus service cayman'],
    embeddingText: 'Public Bus Service affordable transport routes Grand Cayman budget',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'trans-009', category: 'transportation', name: 'Scooter Rental Cayman',
    description: 'Scooter and moped rentals for exploring the island.',
    shortDescription: 'Scooter and moped rentals for exploring.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3345, longitude: -81.3823 },
    contact: { phone: '+1-345-946-4646' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 35, priceTo: 75, currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 234 },
    tags: ['scooter', 'moped', 'rental', 'transport'], keywords: ['scooter rental', 'moped cayman'],
    embeddingText: 'Scooter Rental Cayman moped exploring island transport Seven Mile Beach',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'trans-010', category: 'transportation', name: 'AA Taxi Service',
    description: '24/7 taxi service with fixed rates to popular destinations.',
    shortDescription: '24/7 taxi with fixed destination rates.',
    location: { address: 'Island-wide service', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3812 },
    contact: { phone: '+1-345-926-8888' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 20, priceTo: 80, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 345 },
    tags: ['taxi', '24/7', 'fixed rates'], keywords: ['aa taxi', 'taxi service cayman'],
    embeddingText: 'AA Taxi Service 24/7 fixed rates destinations Grand Cayman',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'trans-011', category: 'transportation', name: 'Water Taxi Rum Point',
    description: 'Ferry service to Rum Point from various pickup points.',
    shortDescription: 'Ferry service to Rum Point.',
    location: { address: 'Kaibo Marina', district: 'North Side', island: 'Grand Cayman', latitude: 19.3567, longitude: -81.2712 },
    contact: { phone: '+1-345-947-9975' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-8dd44758c2dd?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 15, priceTo: 30, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 234 },
    tags: ['ferry', 'water taxi', 'rum point'], keywords: ['water taxi', 'rum point ferry'],
    embeddingText: 'Water Taxi Rum Point ferry service North Side Kaibo Marina',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ SERVICES ============

export const CAYMAN_SERVICES: KnowledgeNode[] = [
  {
    id: 'svc-001',
    category: 'service',
    name: 'Health City Cayman Islands',
    description: `World-class medical facility offering cardiac care, orthopedics, and medical tourism services.`,
    shortDescription: 'World-class hospital for cardiac care and medical tourism.',
    location: { address: '2673 Shamrock Road, East End', district: 'East End', island: 'Grand Cayman', latitude: 19.2812, longitude: -81.1567 },
    contact: { phone: '+1-345-640-4040', website: 'https://www.healthcitycaymanislands.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800', images: [] },
    business: { priceRange: '$$$', currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 345 },
    tags: ['hospital', 'medical', 'healthcare', 'cardiac', 'medical tourism'],
    keywords: ['health city', 'hospital cayman', 'medical tourism'],
    embeddingText: 'Health City Cayman Islands world-class hospital cardiac care orthopedics medical tourism East End',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-002',
    category: 'service',
    name: 'Cayman Islands Hospital',
    description: `Main public hospital providing emergency services and general healthcare.`,
    shortDescription: 'Main public hospital with emergency and general care.',
    location: { address: '71 Hospital Road, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2978, longitude: -81.3745 },
    contact: { phone: '+1-345-949-8600', website: 'https://www.hsa.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.0, reviewCount: 567 },
    tags: ['hospital', 'emergency', 'healthcare', 'public'],
    keywords: ['cayman hospital', 'emergency room', 'healthcare'],
    embeddingText: 'Cayman Islands Hospital public emergency services healthcare George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-003',
    category: 'service',
    name: 'Butterfield Bank',
    description: `Major bank in the Cayman Islands offering personal and commercial banking services.`,
    shortDescription: 'Major bank for personal and commercial banking.',
    location: { address: 'Butterfield Place, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2945, longitude: -81.3789 },
    contact: { phone: '+1-345-949-7055', website: 'https://www.butterfieldgroup.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 234 },
    tags: ['bank', 'financial', 'atm'],
    keywords: ['butterfield bank', 'bank cayman', 'atm'],
    embeddingText: 'Butterfield Bank personal commercial banking services George Town ATM',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-004',
    category: 'service',
    name: 'Cayman Islands Visitor Centre',
    description: `Official tourism information center with maps, brochures, and helpful staff.`,
    shortDescription: 'Official tourism info center with maps and assistance.',
    location: { address: 'Harbour Drive, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3823 },
    contact: { phone: '+1-345-949-0623', website: 'https://www.visitcaymanislands.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 456 },
    tags: ['tourism', 'information', 'visitor center', 'maps'],
    keywords: ['visitor centre', 'tourist information', 'maps'],
    embeddingText: 'Cayman Islands Visitor Centre tourism information maps brochures George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  // ===== MORE SERVICES =====
  {
    id: 'svc-005', category: 'service', name: 'Doctors Hospital',
    description: 'Private hospital with 24-hour emergency and specialized care.',
    shortDescription: 'Private hospital with 24-hour emergency.',
    location: { address: 'Hospital Road, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2989, longitude: -81.3756 },
    contact: { phone: '+1-345-949-6066' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800', images: [] },
    business: { priceRange: '$$$', currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 234 },
    tags: ['hospital', 'emergency', 'medical', 'private'], keywords: ['doctors hospital', 'private hospital'],
    embeddingText: 'Doctors Hospital private 24-hour emergency specialized care George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-006', category: 'service', name: 'Island Pharmacy',
    description: 'Pharmacy with prescription services and over-the-counter medications.',
    shortDescription: 'Pharmacy with prescriptions and OTC medications.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3312, longitude: -81.3801 },
    contact: { phone: '+1-345-949-8130' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 123 },
    tags: ['pharmacy', 'medication', 'prescriptions'], keywords: ['pharmacy cayman', 'drugstore'],
    embeddingText: 'Island Pharmacy prescriptions medications Seven Mile Beach',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-007', category: 'service', name: 'Royal Bank of Canada',
    description: 'Major bank with ATMs and full banking services.',
    shortDescription: 'Major bank with ATMs and full services.',
    location: { address: 'Harbour Drive, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3823 },
    contact: { phone: '+1-345-949-4600' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.0, reviewCount: 123 },
    tags: ['bank', 'atm', 'financial'], keywords: ['rbc bank', 'atm cayman'],
    embeddingText: 'Royal Bank of Canada ATMs banking services George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-008', category: 'service', name: 'Post Office George Town',
    description: 'Main post office for mail, stamps, and shipping services.',
    shortDescription: 'Main post office for mail and shipping.',
    location: { address: 'Edward Street, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2945, longitude: -81.3789 },
    contact: { phone: '+1-345-949-2474' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1521999693742-4717d76f97cc?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 3.9, reviewCount: 123 },
    tags: ['post office', 'mail', 'shipping'], keywords: ['post office', 'mail cayman'],
    embeddingText: 'Post Office George Town mail stamps shipping services',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-009', category: 'service', name: 'DHL Express',
    description: 'International courier and shipping services.',
    shortDescription: 'International courier and shipping.',
    location: { address: 'Industrial Park, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2878, longitude: -81.3656 },
    contact: { phone: '+1-345-949-0099' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.1, reviewCount: 89 },
    tags: ['shipping', 'courier', 'international'], keywords: ['dhl cayman', 'shipping service'],
    embeddingText: 'DHL Express international courier shipping George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-010', category: 'service', name: 'Cayman Immigration Office',
    description: 'Government office for visas, permits, and immigration matters.',
    shortDescription: 'Government immigration office.',
    location: { address: 'Government Admin Building, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2945, longitude: -81.3801 },
    contact: { phone: '+1-345-949-8052' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 3.5, reviewCount: 67 },
    tags: ['government', 'immigration', 'visa'], keywords: ['immigration office', 'visa cayman'],
    embeddingText: 'Cayman Immigration Office visas permits government George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-011', category: 'service', name: 'Flow Telecom',
    description: 'Major telecom provider for mobile, internet, and cable services.',
    shortDescription: 'Major telecom for mobile and internet.',
    location: { address: 'Anderson Square, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2934, longitude: -81.3778 },
    contact: { phone: '+1-345-949-4600' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1556155092-490a1ba16284?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 3.8, reviewCount: 234 },
    tags: ['telecom', 'mobile', 'internet', 'sim card'], keywords: ['flow telecom', 'sim card cayman'],
    embeddingText: 'Flow Telecom mobile internet cable SIM card George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-012', category: 'service', name: 'Digicel',
    description: 'Telecom provider with prepaid and postpaid mobile plans.',
    shortDescription: 'Mobile provider with prepaid plans.',
    location: { address: 'Shedden Road, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2923, longitude: -81.3767 },
    contact: { phone: '+1-345-623-0000' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1556155092-490a1ba16284?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 3.9, reviewCount: 178 },
    tags: ['telecom', 'mobile', 'prepaid'], keywords: ['digicel cayman', 'prepaid mobile'],
    embeddingText: 'Digicel telecom prepaid postpaid mobile plans George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-013', category: 'service', name: 'Cayman Islands Currency Exchange',
    description: 'Currency exchange services with competitive rates.',
    shortDescription: 'Currency exchange with competitive rates.',
    location: { address: 'Cardinal Avenue, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2945, longitude: -81.3823 },
    contact: { phone: '+1-345-949-6588' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1580048915913-4f8f5cb481c4?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 123 },
    tags: ['currency', 'exchange', 'money'], keywords: ['currency exchange', 'money exchange'],
    embeddingText: 'Currency Exchange competitive rates George Town KYD USD',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-014', category: 'service', name: 'US Embassy Consular Services',
    description: 'US consular services for American citizens.',
    shortDescription: 'US consular services for Americans.',
    location: { address: 'HSBC Building, George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3812 },
    contact: { phone: '+1-345-945-8173' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.0, reviewCount: 45 },
    tags: ['embassy', 'consular', 'us citizens'], keywords: ['us embassy', 'consular services'],
    embeddingText: 'US Embassy Consular Services American citizens George Town',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-015', category: 'service', name: 'Laundromat Seven Mile',
    description: 'Self-service laundry facilities near Seven Mile Beach.',
    shortDescription: 'Self-service laundry facilities.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3289, longitude: -81.3789 },
    contact: { phone: '+1-345-945-1234' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 5, priceTo: 20, currency: 'USD' },
    ratings: { overall: 4.0, reviewCount: 67 },
    tags: ['laundry', 'self-service', 'utilities'], keywords: ['laundromat', 'laundry service'],
    embeddingText: 'Laundromat Seven Mile self-service laundry facilities',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-016', category: 'service', name: 'Fitness Connection',
    description: 'Modern gym with cardio, weights, and fitness classes.',
    shortDescription: 'Modern gym with fitness classes.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3234, longitude: -81.3789 },
    contact: { phone: '+1-345-949-8485' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 15, priceTo: 30, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 234 },
    tags: ['gym', 'fitness', 'exercise', 'classes'], keywords: ['gym cayman', 'fitness center'],
    embeddingText: 'Fitness Connection gym cardio weights fitness classes Seven Mile Beach',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-017', category: 'service', name: 'Yoga Cayman',
    description: 'Yoga studio offering various styles and outdoor beach sessions.',
    shortDescription: 'Yoga studio with beach sessions.',
    location: { address: 'Seven Mile Beach', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3389, longitude: -81.3879 },
    contact: { phone: '+1-345-926-9642' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 20, priceTo: 40, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 178 },
    tags: ['yoga', 'wellness', 'beach', 'fitness'], keywords: ['yoga cayman', 'beach yoga'],
    embeddingText: 'Yoga Cayman studio beach sessions wellness fitness Seven Mile Beach',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-018', category: 'service', name: 'Pet Care Cayman',
    description: 'Veterinary services, pet sitting, and grooming.',
    shortDescription: 'Veterinary and pet care services.',
    location: { address: 'Industrial Park', district: 'George Town', island: 'Grand Cayman', latitude: 19.2878, longitude: -81.3656 },
    contact: { phone: '+1-345-949-8757' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 123 },
    tags: ['veterinary', 'pets', 'grooming'], keywords: ['vet cayman', 'pet care'],
    embeddingText: 'Pet Care Cayman veterinary services pet sitting grooming',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-019', category: 'service', name: 'Island Dental Care',
    description: 'Full-service dental clinic with emergency services.',
    shortDescription: 'Full-service dental clinic.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3312, longitude: -81.3801 },
    contact: { phone: '+1-345-945-4664' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800', images: [] },
    business: { priceRange: '$$$', currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 178 },
    tags: ['dental', 'medical', 'emergency'], keywords: ['dentist cayman', 'dental clinic'],
    embeddingText: 'Island Dental Care dental clinic emergency services Seven Mile Beach',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-020', category: 'service', name: 'Wedding Planner Cayman',
    description: 'Professional wedding planning services for destination weddings.',
    shortDescription: 'Wedding planning for destination weddings.',
    location: { address: 'Island-wide service', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3812 },
    contact: { phone: '+1-345-916-0099' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 500, priceTo: 5000, currency: 'USD' },
    ratings: { overall: 4.9, reviewCount: 89 },
    tags: ['wedding', 'planning', 'destination'], keywords: ['wedding planner', 'destination wedding'],
    embeddingText: 'Wedding Planner Cayman destination weddings planning services Caribbean',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-021', category: 'service', name: 'Photography Cayman',
    description: 'Professional photography for weddings, portraits, and underwater shoots.',
    shortDescription: 'Professional photography services.',
    location: { address: 'Island-wide service', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3812 },
    contact: { phone: '+1-345-926-7849' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 200, priceTo: 2000, currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 156 },
    tags: ['photography', 'wedding', 'portraits', 'underwater'], keywords: ['photographer cayman', 'wedding photography'],
    embeddingText: 'Photography Cayman professional weddings portraits underwater shoots',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'svc-022', category: 'service', name: 'Hair Salon Seven Mile',
    description: 'Full-service hair salon with styling, coloring, and treatments.',
    shortDescription: 'Full-service hair salon.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3345, longitude: -81.3823 },
    contact: { phone: '+1-345-945-7247' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 40, priceTo: 150, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 234 },
    tags: ['hair', 'salon', 'beauty', 'styling'], keywords: ['hair salon', 'salon cayman'],
    embeddingText: 'Hair Salon Seven Mile styling coloring treatments beauty',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ AIRLINES ============

export const CAYMAN_AIRLINES: KnowledgeNode[] = [
  {
    id: 'airline-001', category: 'transportation', name: 'Air Canada - Toronto to Grand Cayman',
    description: `Direct flights from Toronto (YYZ) to Grand Cayman (GCM).

**Schedule:** October 26 – November 30: 3 flights/week | December 2 – April 30: 4 flights/week
**Flight Time:** Approximately 4.5 hours
**Aircraft:** Various widebody aircraft`,
    shortDescription: 'Direct flights from Toronto to Grand Cayman.',
    location: { address: 'Owen Roberts International Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { website: 'https://www.aircanada.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 567 },
    tags: ['airline', 'flights', 'toronto', 'canada', 'direct'], keywords: ['air canada cayman', 'toronto flights'],
    embeddingText: 'Air Canada Toronto Grand Cayman direct flights YYZ GCM Canada winter seasonal',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'airline-002', category: 'transportation', name: 'American Airlines - US to Grand Cayman',
    description: `Multiple US routes to Grand Cayman from American Airlines hubs.

**Routes:**
- Charlotte (CLT): Seasonal service
- Chicago (ORD): Seasonal service
- Dallas (DFW): Multiple flights weekly
- Miami (MIA): Daily service - most frequent route
- Philadelphia (PHL): Saturdays only

**Miami** is the most frequent route with daily non-stop flights (~1 hour).`,
    shortDescription: 'Daily flights from Miami, plus Charlotte, Chicago, Dallas, Philadelphia.',
    location: { address: 'Owen Roberts International Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { website: 'https://www.aa.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.1, reviewCount: 1234 },
    tags: ['airline', 'flights', 'miami', 'dallas', 'charlotte', 'chicago', 'daily'], keywords: ['american airlines cayman', 'miami flights cayman'],
    embeddingText: 'American Airlines Miami Dallas Charlotte Chicago Philadelphia Grand Cayman daily flights direct US',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'airline-003', category: 'transportation', name: 'British Airways - London to Grand Cayman',
    description: `Direct flights from London Heathrow (LHR) to Grand Cayman (GCM).

**Schedule:** June - December: Up to 5 flights weekly
**Flight Time:** Approximately 10 hours
**Aircraft:** Boeing 777 or similar widebody

The only direct route from Europe to Grand Cayman.`,
    shortDescription: 'Direct flights from London Heathrow, up to 5x weekly.',
    location: { address: 'Owen Roberts International Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { website: 'https://www.britishairways.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800', images: [] },
    business: { priceRange: '$$$', currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 456 },
    tags: ['airline', 'flights', 'london', 'uk', 'europe', 'direct'], keywords: ['british airways cayman', 'london flights'],
    embeddingText: 'British Airways London Heathrow Grand Cayman direct flights UK Europe LHR GCM transatlantic',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'airline-004', category: 'transportation', name: 'Cayman Airways - National Carrier',
    description: `The national flag carrier of the Cayman Islands offering extensive US routes and inter-island service.

**International Routes:**
- Miami (MIA): Daily service
- New York (JFK): Multiple weekly
- Tampa (TPA): Seasonal
- Denver (DEN): Seasonal
- Los Angeles (LAX): Seasonal

**Inter-Island Service:**
- Grand Cayman to Cayman Brac
- Grand Cayman to Little Cayman

Best choice for inter-island travel and reliable US connections.`,
    shortDescription: 'National airline with US routes and inter-island flights.',
    location: { address: 'Owen Roberts International Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { phone: '+1-345-949-2311', website: 'https://www.caymanairways.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 2345 },
    tags: ['airline', 'national carrier', 'inter-island', 'miami', 'new york', 'little cayman', 'cayman brac'], keywords: ['cayman airways', 'inter-island flights', 'national airline'],
    embeddingText: 'Cayman Airways national carrier inter-island flights Miami New York Tampa Denver Los Angeles Little Cayman Cayman Brac flag carrier',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'airline-005', category: 'transportation', name: 'Delta Air Lines - US to Grand Cayman',
    description: `Multiple routes from Delta hubs to Grand Cayman.

**Routes:**
- Atlanta (ATL): Daily service - main hub
- Detroit (DTW): Seasonal Friday-Saturday service
- Minneapolis (MSP): Seasonal service
- New York (JFK): Daily/frequent service

Atlanta offers the most frequent connections.`,
    shortDescription: 'Daily flights from Atlanta and New York, plus Detroit and Minneapolis.',
    location: { address: 'Owen Roberts International Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { website: 'https://www.delta.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 987 },
    tags: ['airline', 'flights', 'atlanta', 'new york', 'detroit', 'minneapolis'], keywords: ['delta cayman', 'atlanta flights'],
    embeddingText: 'Delta Air Lines Atlanta Detroit Minneapolis New York JFK Grand Cayman daily flights direct US',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'airline-006', category: 'transportation', name: 'JetBlue Airways - US to Grand Cayman',
    description: `Service from JetBlue's northeast US hubs to Grand Cayman.

**Routes:**
- Boston (BOS): Seasonal service
- New York (JFK): Expanding winter schedules (beginning November 2025)

Known for affordable fares and comfortable seating.`,
    shortDescription: 'Flights from Boston and New York with expanded winter service.',
    location: { address: 'Owen Roberts International Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { website: 'https://www.jetblue.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 567 },
    tags: ['airline', 'flights', 'boston', 'new york', 'budget friendly'], keywords: ['jetblue cayman', 'boston flights'],
    embeddingText: 'JetBlue Airways Boston New York JFK Grand Cayman flights northeast US winter seasonal affordable',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'airline-007', category: 'transportation', name: 'Porter Airlines - Canada to Grand Cayman',
    description: `Canadian airline with routes from Ottawa and Toronto.

**Routes:**
- Ottawa (YOW): Seasonal service
- Toronto (YYZ): December 16 – April 30: 3 flights/week

Great option for Canadian travelers with competitive fares.`,
    shortDescription: 'Seasonal flights from Ottawa and Toronto.',
    location: { address: 'Owen Roberts International Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { website: 'https://www.flyporter.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 234 },
    tags: ['airline', 'flights', 'ottawa', 'toronto', 'canada', 'seasonal'], keywords: ['porter airlines cayman', 'ottawa flights'],
    embeddingText: 'Porter Airlines Ottawa Toronto Grand Cayman Canada seasonal winter flights YOW YYZ',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'airline-008', category: 'transportation', name: 'Southwest Airlines - US to Grand Cayman',
    description: `Low-cost carrier with service from Florida and Baltimore.

**Routes:**
- Orlando (MCO): Daily service
- Baltimore (BWI): Saturdays only (seasonal)

Known for no baggage fees and flexible booking policies.`,
    shortDescription: 'Daily flights from Orlando, Saturday service from Baltimore.',
    location: { address: 'Owen Roberts International Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { website: 'https://www.southwest.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.1, reviewCount: 765 },
    tags: ['airline', 'flights', 'orlando', 'baltimore', 'low cost', 'budget'], keywords: ['southwest cayman', 'orlando flights'],
    embeddingText: 'Southwest Airlines Orlando Baltimore Grand Cayman daily flights low cost no baggage fees MCO BWI budget',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'airline-009', category: 'transportation', name: 'Spirit Airlines - Fort Lauderdale to Grand Cayman',
    description: `Ultra-low-cost carrier with service from Fort Lauderdale.

**Route:** Fort Lauderdale (FLL) to Grand Cayman
**Schedule:** 3 times weekly (starting December 2025)

Budget-friendly option, note additional fees for bags and seat selection.`,
    shortDescription: 'Budget flights from Fort Lauderdale, 3x weekly.',
    location: { address: 'Owen Roberts International Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { website: 'https://www.spirit.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 3.8, reviewCount: 345 },
    tags: ['airline', 'flights', 'fort lauderdale', 'ultra low cost', 'budget'], keywords: ['spirit airlines cayman', 'fort lauderdale flights'],
    embeddingText: 'Spirit Airlines Fort Lauderdale Grand Cayman ultra low cost budget flights FLL',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'airline-010', category: 'transportation', name: 'Sun Country Airlines - Minneapolis to Grand Cayman',
    description: `Seasonal service from Minneapolis to Grand Cayman.

**Route:** Minneapolis (MSP) to Grand Cayman
**Schedule:** Seasonal Saturday service (December 2025 – April 2026)

Great option for Midwest travelers during winter season.`,
    shortDescription: 'Seasonal Saturday flights from Minneapolis.',
    location: { address: 'Owen Roberts International Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { website: 'https://www.suncountry.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.0, reviewCount: 123 },
    tags: ['airline', 'flights', 'minneapolis', 'midwest', 'seasonal'], keywords: ['sun country cayman', 'minneapolis flights'],
    embeddingText: 'Sun Country Airlines Minneapolis Grand Cayman seasonal winter Saturday flights MSP midwest',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'airline-011', category: 'transportation', name: 'United Airlines - US to Grand Cayman',
    description: `Extensive network of flights from United hubs.

**Routes:**
- Chicago (ORD): Daily/frequent service
- Houston (IAH): 5x weekly or more
- Newark (EWR): Daily service
- Washington DC (IAD): Seasonal service

Strong coverage from major US cities.`,
    shortDescription: 'Daily flights from Chicago, Houston, Newark, plus DC.',
    location: { address: 'Owen Roberts International Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { website: 'https://www.united.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.1, reviewCount: 876 },
    tags: ['airline', 'flights', 'chicago', 'houston', 'newark', 'washington dc'], keywords: ['united airlines cayman', 'chicago flights'],
    embeddingText: 'United Airlines Chicago Houston Newark Washington DC Grand Cayman daily flights ORD IAH EWR IAD',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'airline-012', category: 'transportation', name: 'WestJet - Toronto to Grand Cayman',
    description: `Canadian airline with seasonal service from Toronto.

**Route:** Toronto (YYZ) to Grand Cayman
**Schedule:** November 3 - April 25: 3 flights/week

Popular choice for Canadian travelers escaping winter.`,
    shortDescription: 'Seasonal flights from Toronto, 3x weekly Nov-Apr.',
    location: { address: 'Owen Roberts International Airport', district: 'George Town', island: 'Grand Cayman', latitude: 19.2928, longitude: -81.3577 },
    contact: { website: 'https://www.westjet.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 345 },
    tags: ['airline', 'flights', 'toronto', 'canada', 'seasonal', 'winter'], keywords: ['westjet cayman', 'toronto flights westjet'],
    embeddingText: 'WestJet Toronto Grand Cayman Canada seasonal winter flights YYZ November April',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ EVENTS & FESTIVALS ============

export const CAYMAN_EVENTS: KnowledgeNode[] = [
  {
    id: 'event-001', category: 'event', name: 'Cayman Carnival Batabano',
    description: `The Cayman Islands' premier carnival celebration featuring colorful costumes, music, and street parades.

**Highlights:**
- Grand parade through George Town
- Soca and calypso music
- Elaborate masquerade costumes
- Street parties and jump-ups
- Junior Batabano for kids

Usually held in April/May. The biggest cultural celebration of the year.`,
    shortDescription: 'Annual Caribbean carnival with parades, music, and costumes.',
    location: { address: 'George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3812 },
    contact: { website: 'https://www.caymancarnival.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 567 },
    tags: ['carnival', 'festival', 'parade', 'music', 'culture', 'annual'], keywords: ['cayman carnival', 'batabano', 'caribbean festival'],
    embeddingText: 'Cayman Carnival Batabano parade costumes soca calypso music George Town Caribbean celebration April May cultural',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'event-002', category: 'event', name: 'IslandSoul Festival',
    description: `A celebration of Caribbean music, food, and culture featuring local and international artists.

**Features:**
- Live music performances
- Local and Caribbean cuisine
- Art and craft vendors
- Cultural exhibitions
- Family-friendly activities

A perfect showcase of Caymanian culture and hospitality.`,
    shortDescription: 'Caribbean music, food, and cultural festival.',
    location: { address: 'Various locations', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3812 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 345 },
    tags: ['festival', 'music', 'food', 'culture', 'family'], keywords: ['islandsoul festival', 'cayman music festival'],
    embeddingText: 'IslandSoul Festival Caribbean music food culture live performances art vendors family Cayman',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'event-003', category: 'event', name: 'Cayman Islands Agriculture Show',
    description: `Annual agricultural fair showcasing local farming, livestock, and Caymanian heritage.

**Features:**
- Livestock competitions
- Local produce displays
- Traditional Caymanian food
- Craft demonstrations
- Children's activities
- Heritage exhibits

A window into traditional Caymanian life and agriculture.`,
    shortDescription: 'Annual agricultural fair with livestock, produce, and heritage displays.',
    location: { address: 'Lower Valley', district: 'Bodden Town', island: 'Grand Cayman', latitude: 19.2812, longitude: -81.2456 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 234 },
    tags: ['agriculture', 'fair', 'heritage', 'family', 'traditional'], keywords: ['agriculture show', 'cayman fair'],
    embeddingText: 'Cayman Islands Agriculture Show farming livestock heritage traditional food craft Bodden Town annual fair',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'event-004', category: 'event', name: 'Cayman Orchid Show',
    description: `Annual orchid exhibition featuring stunning displays from local and international growers.

**Features:**
- Orchid competitions and judging
- Rare and exotic species
- Educational workshops
- Plants for sale
- Garden accessories

A must-see for orchid enthusiasts and garden lovers.`,
    shortDescription: 'Annual orchid exhibition with rare species and competitions.',
    location: { address: 'Queen Elizabeth II Botanic Park', district: 'North Side', island: 'Grand Cayman', latitude: 19.3178, longitude: -81.1678 },
    contact: { website: 'https://www.botanic-park.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1566836610593-62a64888c216?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 189 },
    tags: ['orchid', 'show', 'flowers', 'garden', 'botanic'], keywords: ['orchid show', 'cayman flowers'],
    embeddingText: 'Cayman Orchid Show orchid exhibition rare exotic species Botanic Park flowers garden competition',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'event-005', category: 'event', name: 'Capella Music Festival',
    description: `Classical music festival featuring world-renowned musicians in intimate Cayman settings.

**Features:**
- Chamber music performances
- World-class soloists and ensembles
- Multiple venues across the islands
- Meet-the-artist events
- Masterclasses

A cultural highlight bringing international classical talent to the Caribbean.`,
    shortDescription: 'Classical music festival with world-renowned performers.',
    location: { address: 'Various venues', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3812 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800', images: [] },
    business: { priceRange: '$$$', currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 156 },
    tags: ['music', 'classical', 'festival', 'culture', 'arts'], keywords: ['capella music festival', 'classical music cayman'],
    embeddingText: 'Capella Music Festival classical chamber music world-renowned musicians concert performance arts culture',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'event-006', category: 'event', name: 'Pirates Week Festival',
    description: `The Cayman Islands' national festival celebrating the islands' swashbuckling heritage.

**Highlights:**
- Mock pirate invasion of George Town
- Street dances and parties
- Heritage days and parades
- Fireworks displays
- Costume competitions
- Live music and entertainment

Held annually in November - the most fun week of the year!`,
    shortDescription: 'National festival celebrating Cayman pirate heritage.',
    location: { address: 'George Town & island-wide', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3812 },
    contact: { website: 'https://www.piratesweekfestival.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 678 },
    tags: ['pirates', 'festival', 'heritage', 'parade', 'fireworks', 'november'], keywords: ['pirates week', 'cayman festival'],
    embeddingText: 'Pirates Week Festival national celebration pirate invasion George Town street dances fireworks November heritage parades',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'event-007', category: 'event', name: 'Taste of Cayman',
    description: `Premier food and wine festival showcasing the best of Cayman's culinary scene.

**Features:**
- Restaurant tastings
- Wine and spirit sampling
- Cooking demonstrations
- Chef competitions
- Live entertainment

The ultimate event for food lovers visiting the islands.`,
    shortDescription: 'Premier food and wine festival with top restaurants.',
    location: { address: 'Camana Bay', district: 'Camana Bay', island: 'Grand Cayman', latitude: 19.3271, longitude: -81.3775 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', images: [] },
    business: { priceRange: '$$$', currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 345 },
    tags: ['food', 'wine', 'festival', 'culinary', 'restaurants'], keywords: ['taste of cayman', 'food festival'],
    embeddingText: 'Taste of Cayman food wine festival restaurants culinary chef tasting Camana Bay gourmet',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ ADDITIONAL DIVE SITES & OPERATORS ============

export const CAYMAN_DIVE_EXTRAS: KnowledgeNode[] = [
  {
    id: 'dive-extra-001', category: 'diving_snorkeling', name: 'Macabuca Dive Site',
    description: `Shore-accessible dive site in West Bay, perfect for beginners and night dives.

**Highlights:**
- Easy shore entry
- Beginner-friendly depths (15-40 ft)
- Great for night diving
- Abundant marine life
- Near Cracked Conch restaurant

One of the best shore dives on the island.`,
    shortDescription: 'Beginner-friendly shore dive in West Bay.',
    location: { address: 'West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3656, longitude: -81.4123 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 345 },
    tags: ['diving', 'shore dive', 'beginner', 'night dive', 'west bay'], keywords: ['macabuca dive', 'shore diving cayman'],
    embeddingText: 'Macabuca dive site West Bay shore accessible beginner friendly night diving marine life Grand Cayman',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'dive-extra-002', category: 'diving_snorkeling', name: 'Oro Verde Wreck',
    description: `Historic shipwreck on Seven Mile Beach Reef, sunk in 1976.

**Details:**
- Depth: 50-60 feet
- Cargo ship sunk to create artificial reef
- Coral-encrusted structure
- Home to diverse marine life
- Good for intermediate divers

A classic Cayman wreck dive with historical significance.`,
    shortDescription: 'Historic 1976 shipwreck on Seven Mile Beach Reef.',
    location: { address: 'Seven Mile Beach Reef', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3456, longitude: -81.3945 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 234 },
    tags: ['diving', 'wreck dive', 'shipwreck', 'artificial reef'], keywords: ['oro verde wreck', 'wreck diving cayman'],
    embeddingText: 'Oro Verde wreck dive Seven Mile Beach shipwreck 1976 artificial reef coral marine life intermediate',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'dive-extra-003', category: 'diving_snorkeling', name: 'Wilderness Wall - Cayman Brac',
    description: `Dramatic wall dive on Cayman Brac's southern shore.

**Highlights:**
- Deep wall drop-off
- Pristine coral formations
- Sponges and sea fans
- Pelagic fish sightings
- Less crowded than Grand Cayman sites

One of the Caribbean's most impressive wall dives.`,
    shortDescription: 'Dramatic deep wall dive on Cayman Brac.',
    location: { address: 'South Shore', district: 'South Shore', island: 'Cayman Brac', latitude: 19.6912, longitude: -79.8567 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 156 },
    tags: ['diving', 'wall dive', 'cayman brac', 'advanced', 'pristine'], keywords: ['wilderness wall', 'cayman brac diving'],
    embeddingText: 'Wilderness Wall Cayman Brac deep wall dive dramatic coral sponges pelagic fish pristine advanced',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'dive-extra-004', category: 'diving_snorkeling', name: 'Fry Cove - Cayman Brac',
    description: `Unique dive site at Salt Water Point featuring cave and wall features.

**Features:**
- Underwater cave systems
- Wall formations
- Swim-throughs
- Excellent visibility
- Intermediate to advanced

Perfect for divers seeking adventure.`,
    shortDescription: 'Cave and wall dive at Salt Water Point, Cayman Brac.',
    location: { address: 'Salt Water Point', district: 'West End', island: 'Cayman Brac', latitude: 19.7023, longitude: -79.8845 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 123 },
    tags: ['diving', 'cave dive', 'cayman brac', 'wall', 'swim-through'], keywords: ['fry cove dive', 'cayman brac cave'],
    embeddingText: 'Fry Cove Salt Water Point Cayman Brac cave dive wall swim-through underwater adventure',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'dive-extra-005', category: 'diving_snorkeling', name: 'Brac Scuba Shack',
    description: `Local dive operator on Cayman Brac offering personalized service.

**Services:**
- Daily boat dives
- Shore diving guidance
- Equipment rental
- PADI certification courses
- Small group experiences

Known for personal attention and local knowledge.`,
    shortDescription: 'Local dive operator on Cayman Brac with personalized service.',
    location: { address: 'Stake Bay', district: 'Stake Bay', island: 'Cayman Brac', latitude: 19.7234, longitude: -79.8234 },
    contact: { phone: '+1-345-948-0033' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 75, priceTo: 150, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 189 },
    tags: ['dive operator', 'cayman brac', 'padi', 'boat dives', 'local'], keywords: ['brac scuba shack', 'cayman brac diving'],
    embeddingText: 'Brac Scuba Shack Cayman Brac dive operator PADI certification boat dives shore diving equipment rental local',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'dive-extra-006', category: 'diving_snorkeling', name: 'Conch Club Divers - Little Cayman',
    description: `Dive operator on Little Cayman with access to Bloody Bay Wall.

**Services:**
- Bloody Bay Wall dives
- Daily two-tank boat dives
- Night dives
- Equipment rental
- PADI courses

Gateway to some of the world's best diving.`,
    shortDescription: 'Little Cayman dive operator with Bloody Bay Wall access.',
    location: { address: 'Blossom Village', district: 'Blossom Village', island: 'Little Cayman', latitude: 19.6623, longitude: -80.0623 },
    contact: { phone: '+1-345-948-1026' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 100, priceTo: 200, currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 234 },
    tags: ['dive operator', 'little cayman', 'bloody bay wall', 'boat dives'], keywords: ['conch club divers', 'little cayman diving'],
    embeddingText: 'Conch Club Divers Little Cayman Bloody Bay Wall dive operator boat dives PADI world-class diving',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'dive-extra-007', category: 'diving_snorkeling', name: 'Little Cayman Divers',
    description: `Premier dive operation on Little Cayman island.

**Services:**
- Bloody Bay Wall excursions
- Jackson Wall dives
- Three-tank dive trips
- Underwater photography support
- Custom dive itineraries

Experts in Little Cayman's legendary dive sites.`,
    shortDescription: 'Premier dive operation on Little Cayman.',
    location: { address: 'Little Cayman', district: 'Little Cayman', island: 'Little Cayman', latitude: 19.6589, longitude: -80.0534 },
    contact: { phone: '+1-345-948-1010' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', images: [] },
    business: { priceRange: '$$$', priceFrom: 125, priceTo: 250, currency: 'USD' },
    ratings: { overall: 4.9, reviewCount: 178 },
    tags: ['dive operator', 'little cayman', 'bloody bay', 'jackson wall', 'premium'], keywords: ['little cayman divers', 'bloody bay diving'],
    embeddingText: 'Little Cayman Divers premier dive operation Bloody Bay Wall Jackson Wall three-tank dives photography',
    isActive: true, isPremium: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ OFFICIAL TOURISM CONTENT ============
// Content from visitcaymanislands.com for chatbot context

export const CAYMAN_OFFICIAL_CONTENT: KnowledgeNode[] = [
  {
    id: 'official-001', category: 'general_info', name: 'Cayman Islands - Your Caribbean Paradise',
    description: `Discover your own Caribbean paradise in the Cayman Islands. It's more than a vacation—it's vaCay.

The Cayman Islands offer unparalleled natural beauty that meets the warmth and vibrancy of the Caribbean. With sunny skies, warm temps, and turquoise waters, it's the perfect vaCay for every season.

**Why Choose Cayman?**
- World-class scuba diving and snorkeling with 365 dive sites
- Breathtaking coral reefs and historic wrecks
- Some of the world's most breathtaking beaches
- Culinary capital of the Caribbean with diverse flavors
- Safety, hospitality, and relaxation

**Three Unique Islands:**
- **Grand Cayman** - Cosmopolitan heart with art, culture, and nature
- **Cayman Brac** - Adventurous destination with breathtaking bluff
- **Little Cayman** - Tranquil remote island wonderland

Your vaCay is one flight away.`,
    shortDescription: 'Discover your Caribbean paradise in the Cayman Islands.',
    location: { address: 'Cayman Islands', district: 'Caribbean', island: 'Grand Cayman', latitude: 19.3133, longitude: -81.2546 },
    contact: { website: 'https://www.visitcaymanislands.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800', images: [] },
    business: { priceRange: '$$', currency: 'KYD' },
    ratings: { overall: 4.9, reviewCount: 0 },
    tags: ['paradise', 'caribbean', 'vacation', 'beaches', 'diving', 'luxury'], keywords: ['cayman islands vacation', 'caribbean paradise', 'vacay'],
    embeddingText: 'Cayman Islands Caribbean paradise vacation vaCay turquoise waters beaches diving snorkeling coral reefs culinary hospitality Grand Cayman Cayman Brac Little Cayman',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'official-002', category: 'general_info', name: 'Grand Cayman - Cosmopolitan Heart of the Caribbean',
    description: `Grand Cayman is the beating heart of our islands - the Cosmopolitan Heart of the Caribbean, blending vibrant culture, fine dining, and Caribbean shopping.

**Great For:**
- Beach lovers and aquatic adventurers
- Foodies and fine-dining enthusiasts
- Art enthusiasts and cultural explorers

**Must-See Attractions:**

**Seven Mile Beach** - A world-class stretch where crystal-clear Caribbean waters meet pristine coral sand. The island's signature destination and one of the top 25 Best Beaches globally (TripAdvisor 2024).

**Crystal Caves** - Ranked 5th Best Tourist Attraction globally (TripAdvisor 2024), offering underground exploration in North Side.

**Queen Elizabeth II Botanic Park** - A 65-acre sanctuary featuring tropical blooms and natural rejuvenation experiences.

**Pedro St. James** - The oldest surviving stone structure in the Caymans, a heritage site with historical significance.

**Bioluminescent Bay Tours** - Nighttime water experiences showcasing illuminated sea creatures.

**Getting Here:** Owen Roberts International Airport welcomes direct flights from US, Canada, and UK. Cruise ships also arrive regularly at George Town.`,
    shortDescription: 'The cosmopolitan heart of the Caribbean with world-class beaches and culture.',
    location: { address: 'Grand Cayman', district: 'George Town', island: 'Grand Cayman', latitude: 19.3133, longitude: -81.2546 },
    contact: { website: 'https://www.visitcaymanislands.com/en-us/our-islands/grand-cayman' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800', images: [] },
    business: { priceRange: '$$', currency: 'KYD' },
    ratings: { overall: 4.9, reviewCount: 0 },
    tags: ['grand cayman', 'seven mile beach', 'crystal caves', 'cosmopolitan', 'culture'], keywords: ['grand cayman', 'seven mile beach', 'george town'],
    embeddingText: 'Grand Cayman cosmopolitan heart Caribbean Seven Mile Beach Crystal Caves Botanic Park Pedro St James bioluminescent beach lovers foodies culture fine dining George Town',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'official-003', category: 'general_info', name: 'Cayman Brac - The Adventurous Island',
    description: `Cayman Brac is the second-largest island, perfect for thrill-seekers and nature-lovers. Teeming with character and natural wonder ready to be explored.

**Great For:**
- Wildlife lovers
- Cultural enthusiasts
- Those seeking to hit the pause button

**The Bluff:**
The island's signature attraction is its impressive Bluff. Experience the rich history and mettle of Cayman Brackers while traversing the eastern bluff edge. The worn path by Peter's Cave was historically the lifeline of the community.

**Heritage House:**
Located in North East Bay, this modern recreation of a traditional Caymanian home sits on over an acre and provides a living example of Caymanian heritage.

**Activities:**
- World-class diving (proudly showing off our underwater world since 1957)
- Exploring limestone caves
- MV Captain Keith Tibbetts shipwreck diving
- Scenic sunsets
- Artisan shopping
- Authentic Caymanian dining

**Getting Around:** The land of NO stoplights and NO roundabouts—car rentals and taxis available.

**Getting Here:** Direct flights via Cayman Airways, just 25 minutes from Grand Cayman.`,
    shortDescription: 'The adventurous island with dramatic bluff and world-class diving.',
    location: { address: 'Cayman Brac', district: 'Cayman Brac', island: 'Cayman Brac', latitude: 19.7167, longitude: -79.8833 },
    contact: { website: 'https://www.visitcaymanislands.com/en-us/our-islands/cayman-brac' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', images: [] },
    business: { priceRange: '$$', currency: 'KYD' },
    ratings: { overall: 4.8, reviewCount: 0 },
    tags: ['cayman brac', 'bluff', 'adventure', 'diving', 'caves', 'heritage'], keywords: ['cayman brac', 'the bluff', 'sister islands'],
    embeddingText: 'Cayman Brac adventurous island Bluff thrill-seekers nature lovers diving caves Heritage House Keith Tibbetts wreck limestone Peter Cave wildlife',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'official-004', category: 'general_info', name: 'Little Cayman - Remote Island Wonderland',
    description: `Little Cayman is a remote island wonderland measuring just ten miles long and one mile wide. More peace and quiet per-square-inch than most destinations on Earth.

**Great For:**
- Divers of all skill levels
- Travelers seeking solitude
- Those practicing JOMO (joy of missing out)

**Beaches:**
Empty stretches of soft sand with minimal crowds. Experience beaches the way they were meant to be.

**Must-See Attractions:**

**Bloody Bay Wall** - A dramatic underwater formation dropping approximately 2,000 meters to the seafloor. Home to sailfin blennies, arrow crabs, and octopuses. One of the top dive sites in the world.

**Owen Island** - An islet accessible only by sailing or kayaking, offering pristine water sports experiences.

**Booby Pond Nature Reserve** - A National Trust conservation site highlighting wildlife preservation efforts.

**Getting Here:** Cayman Airways Express flights to Edward Bodden Airfield, or private boat charters.

**Getting Around:** No stoplights. Bicycles, scooters, and rental cars are the way to go.`,
    shortDescription: 'Remote island wonderland with world-famous Bloody Bay Wall.',
    location: { address: 'Little Cayman', district: 'Little Cayman', island: 'Little Cayman', latitude: 19.6833, longitude: -80.0667 },
    contact: { website: 'https://www.visitcaymanislands.com/en-us/our-islands/little-cayman' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', images: [] },
    business: { priceRange: '$$', currency: 'KYD' },
    ratings: { overall: 4.9, reviewCount: 0 },
    tags: ['little cayman', 'bloody bay wall', 'tranquil', 'diving', 'nature', 'secluded'], keywords: ['little cayman', 'bloody bay wall', 'owen island'],
    embeddingText: 'Little Cayman remote island wonderland tranquil Bloody Bay Wall diving solitude Owen Island Booby Pond Nature Reserve secluded beaches peace quiet JOMO',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'official-005', category: 'beach', name: 'Seven Mile Beach - World\'s Best',
    description: `Seven Mile Beach is recognized as one of the top 25 Best Beaches globally in TripAdvisor's 2024 Travelers' Choice Awards.

A world-class stretch where crystal-clear Caribbean waters meet pristine coral sand. This is Grand Cayman's signature destination.

**Highlights:**
- Crystal-clear turquoise waters
- Pristine white coral sand
- World-class resorts along the shore
- Water sports and activities
- Sunset views
- Beach bars and restaurants

The beach that defines Caribbean luxury.`,
    shortDescription: 'Award-winning beach with crystal-clear waters and pristine sand.',
    location: { address: 'Seven Mile Beach', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3350, longitude: -81.3850 },
    contact: { website: 'https://www.visitcaymanislands.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.9, reviewCount: 5000 },
    tags: ['beach', 'seven mile', 'award-winning', 'world best', 'turquoise'], keywords: ['seven mile beach', 'best beach', 'grand cayman beach'],
    embeddingText: 'Seven Mile Beach Grand Cayman top 25 best beaches world TripAdvisor crystal-clear turquoise waters pristine coral sand resorts Caribbean luxury sunset',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'official-006', category: 'beach', name: 'Starfish Point',
    description: `Starfish Point is named among the finest beaches in the Caribbean region.

A unique beach experience where you can see wild starfish in their natural habitat in the shallow, crystal-clear waters.

**Highlights:**
- Wild starfish in shallow waters
- Crystal-clear visibility
- Great for families
- Snorkeling opportunities
- Instagram-worthy photos
- Secluded atmosphere

Please remember: Look but don't touch - help protect the starfish!`,
    shortDescription: 'Caribbean\'s finest beach with wild starfish in shallow waters.',
    location: { address: 'Starfish Point', district: 'North Side', island: 'Grand Cayman', latitude: 19.3589, longitude: -81.2612 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 2345 },
    tags: ['beach', 'starfish', 'snorkeling', 'family', 'unique'], keywords: ['starfish point', 'starfish beach', 'north side beach'],
    embeddingText: 'Starfish Point finest beach Caribbean wild starfish shallow crystal-clear waters snorkeling family North Side unique experience',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'official-007', category: 'attraction', name: 'Crystal Caves',
    description: `Crystal Caves is ranked as the 5th Best Tourist Attraction globally by TripAdvisor's 2024 Travelers' Choice Awards.

An underground adventure in Grand Cayman's North Side, exploring ancient cave systems with stunning crystal formations.

**Experience:**
- Guided cave tours
- Ancient geological formations
- Crystal stalactites and stalagmites
- Tropical forest surroundings
- Educational experience
- Photography opportunities

A must-see attraction for visitors to Grand Cayman.`,
    shortDescription: 'Ranked 5th Best Tourist Attraction globally - underground cave exploration.',
    location: { address: 'North Side', district: 'North Side', island: 'Grand Cayman', latitude: 19.3456, longitude: -81.2234 },
    contact: { website: 'https://www.caymancrystalcaves.com' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1558985250-27a9936170c3?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 40, priceTo: 80, currency: 'USD' },
    ratings: { overall: 4.9, reviewCount: 3456 },
    tags: ['caves', 'attraction', 'adventure', 'nature', 'top rated', 'underground'], keywords: ['crystal caves', 'cayman caves', 'underground tour'],
    embeddingText: 'Crystal Caves 5th best tourist attraction world TripAdvisor underground cave tour North Side Grand Cayman stalactites stalagmites geological formations',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'official-008', category: 'attraction', name: 'Queen Elizabeth II Botanic Park',
    description: `A 65-acre sanctuary featuring tropical blooms and natural rejuvenation experiences.

The Queen Elizabeth II Botanic Park showcases the natural beauty and biodiversity of the Cayman Islands.

**Highlights:**
- 65 acres of tropical gardens
- Native Blue Iguana habitat
- Heritage Garden with traditional Caymanian cottage
- Woodland Trail through native forest
- Orchid and bromeliad collections
- Lake and wetland areas
- Educational programs

A peaceful escape into Cayman's natural heritage.`,
    shortDescription: '65-acre sanctuary with tropical gardens and Blue Iguana habitat.',
    location: { address: 'Frank Sound Road, North Side', district: 'North Side', island: 'Grand Cayman', latitude: 19.3178, longitude: -81.1678 },
    contact: { phone: '+1-345-947-9462', website: 'https://www.botanic-park.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 12, priceTo: 25, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 1234 },
    tags: ['botanic', 'garden', 'nature', 'blue iguana', 'heritage', 'family'], keywords: ['botanic park', 'qe2 park', 'blue iguana'],
    embeddingText: 'Queen Elizabeth II Botanic Park 65 acres tropical gardens Blue Iguana Heritage Garden orchids nature sanctuary North Side Grand Cayman',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'official-009', category: 'history', name: 'Pedro St. James - Birthplace of Democracy',
    description: `Pedro St. James is the oldest surviving stone structure in the Cayman Islands, a heritage site with deep historical significance.

Often called the "Birthplace of Democracy in the Cayman Islands," this is where the decision to create an elected legislature was made in 1831.

**Features:**
- Restored Great House (built 1780)
- 7 acres of landscaped grounds
- Multimedia theater show
- Historic artifacts
- Oceanfront cliffs
- Guided tours

Experience where Caymanian democracy began.`,
    shortDescription: 'Oldest stone structure and birthplace of Caymanian democracy.',
    location: { address: 'Pedro Castle Road, Savannah', district: 'Bodden Town', island: 'Grand Cayman', latitude: 19.2678, longitude: -81.2156 },
    contact: { phone: '+1-345-947-3329', website: 'https://www.pedrostjames.ky' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 15, priceTo: 25, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 876 },
    tags: ['heritage', 'history', 'museum', 'democracy', 'historic site'], keywords: ['pedro st james', 'cayman history', 'heritage site'],
    embeddingText: 'Pedro St. James oldest stone structure Cayman Islands birthplace democracy 1831 Great House heritage history Savannah',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'official-010', category: 'activity', name: 'Bioluminescent Bay Tours',
    description: `Experience magical nighttime water tours showcasing illuminated sea creatures in Cayman's bioluminescent bays.

One of the most unique natural phenomena you can witness in the Caribbean.

**The Experience:**
- Kayak or boat tours at night
- Watch the water glow as you paddle
- Bioluminescent organisms light up with movement
- Best on moonless nights
- Magical and romantic
- Educational guides

An unforgettable experience that must be seen to be believed.`,
    shortDescription: 'Magical nighttime tours with glowing bioluminescent waters.',
    location: { address: 'Bio Bay', district: 'North Side', island: 'Grand Cayman', latitude: 19.3456, longitude: -81.2567 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 50, priceTo: 100, currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 567 },
    tags: ['bioluminescent', 'night tour', 'kayak', 'unique', 'romantic', 'nature'], keywords: ['bioluminescent bay', 'bio bay tour', 'night kayak'],
    embeddingText: 'Bioluminescent Bay Tours nighttime kayak boat glowing water sea creatures luminescent romantic unique experience North Side Grand Cayman',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'official-011', category: 'general_info', name: 'Cayman Culinary Scene',
    description: `The Cayman Islands is the culinary capital of the Caribbean, offering diverse flavors where tradition meets innovation.

**Dining Highlights:**
- World-class fine dining restaurants
- Fresh Caribbean seafood
- International cuisine from around the globe
- Farm-to-table experiences
- Local Caymanian dishes
- Celebrity chef restaurants
- Beachfront dining

**Signature Dishes:**
- Fresh conch
- Cayman-style fish
- Jerk chicken and pork
- Caribbean lobster
- Turtle stew (traditional)
- Rum cake

From casual beach bars to Michelin-worthy restaurants, Cayman has it all.`,
    shortDescription: 'Culinary capital of the Caribbean with world-class dining.',
    location: { address: 'Cayman Islands', district: 'Various', island: 'Grand Cayman', latitude: 19.3133, longitude: -81.2546 },
    contact: {},
    media: { thumbnail: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', images: [] },
    business: { priceRange: '$$$', currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 0 },
    tags: ['food', 'dining', 'culinary', 'restaurants', 'caribbean cuisine'], keywords: ['cayman restaurants', 'caribbean food', 'fine dining cayman'],
    embeddingText: 'Cayman Islands culinary capital Caribbean diverse flavors tradition innovation fine dining seafood international farm-to-table local Caymanian dishes conch fish jerk',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'official-012', category: 'diving_snorkeling', name: 'Cayman Islands - 365 Dive Sites',
    description: `The Cayman Islands have been proudly showing off their underwater world since 1957 - over 65 years of world-class diving.

**Diving Highlights:**
- 365 marked dive sites across three islands
- Year-round water temperature of ~25°C (77°F)
- Visibility often exceeds 100 feet
- Coral walls, wrecks, and reef systems
- PADI certification available

**Famous Sites:**
- Bloody Bay Wall (Little Cayman) - 2,000m drop
- USS Kittiwake wreck (Grand Cayman)
- MV Captain Keith Tibbetts (Cayman Brac)
- Eden Rock & Devil's Grotto (Grand Cayman)

**For All Levels:**
- Snorkeling in shallow reefs
- Beginner shore dives
- Advanced wall and wreck dives
- Technical diving

One of the world's premier diving destinations.`,
    shortDescription: '365 dive sites across three islands - world-class diving since 1957.',
    location: { address: 'Cayman Islands', district: 'Various', island: 'Grand Cayman', latitude: 19.3133, longitude: -81.2546 },
    contact: { website: 'https://www.visitcaymanislands.com/en-us/things-to-do/diving' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', images: [] },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.9, reviewCount: 0 },
    tags: ['diving', 'scuba', 'snorkeling', 'underwater', '365 sites', 'world-class'], keywords: ['cayman diving', 'scuba diving', 'dive sites cayman'],
    embeddingText: 'Cayman Islands 365 dive sites world-class diving since 1957 Bloody Bay Wall USS Kittiwake Keith Tibbetts Eden Rock coral walls wrecks PADI snorkeling',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ PUBLIC BUS ROUTES ============

export const CAYMAN_BUS_ROUTES: KnowledgeNode[] = [
  {
    id: 'bus-001', category: 'transportation', name: 'Grand Cayman Public Bus System',
    description: `Affordable public bus service covering Grand Cayman with 9 numbered routes.

**Terminal:** Edward Street, adjacent to Public Library, George Town
**Operating Hours:** Service begins around 6 AM
**Fares:** Starting at CI $2.50 (accepts US and Cayman Islands dollars)

**Routes:**
- Routes 1-2: West Bay & Seven Mile Beach
- Route 3: Bodden Town
- Routes 4-5: East End & North Side
- Routes 6-9: Various areas including George Town

**How to Use:**
- Blue-numbered license plates identify buses
- Flag down buses along roadsides
- Exact change appreciated

**Contact:** 345-945-5100 for schedule information`,
    shortDescription: 'Affordable public buses with 9 routes across Grand Cayman.',
    location: { address: 'Edward Street Bus Terminal', district: 'George Town', island: 'Grand Cayman', latitude: 19.2934, longitude: -81.3789 },
    contact: { phone: '+1-345-945-5100' },
    media: { thumbnail: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 2.5, priceTo: 5, currency: 'KYD' },
    ratings: { overall: 3.9, reviewCount: 456 },
    tags: ['bus', 'public transport', 'budget', 'local', 'routes'], keywords: ['public bus cayman', 'bus routes', 'budget transport'],
    embeddingText: 'Grand Cayman Public Bus System 9 routes Edward Street terminal CI $2.50 West Bay Seven Mile Beach Bodden Town East End North Side George Town affordable local transport',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ ADDITIONAL LOCATIONS ============

export const CAYMAN_ADDITIONAL: KnowledgeNode[] = [
  // More unique locations to reach 200+
  {
    id: 'add-001', category: 'restaurant', name: 'West Bay Fish Fry',
    description: 'Local fish fry with fresh catch and authentic Caymanian sides.',
    shortDescription: 'Authentic local fish fry experience.',
    location: { address: 'West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3712, longitude: -81.4023 },
    contact: {}, media: { thumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 10, priceTo: 20, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 234 },
    tags: ['local', 'fish', 'authentic', 'casual'], keywords: ['fish fry', 'local food'],
    embeddingText: 'West Bay Fish Fry local fresh catch authentic Caymanian casual',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-002', category: 'beach', name: 'Barkers National Park',
    description: 'Protected natural area with mangroves, beaches, and kiteboarding.',
    shortDescription: 'Protected natural area with mangroves and beaches.',
    location: { address: 'Barkers Road, West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3789, longitude: -81.4267 },
    contact: {}, media: { thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 456 },
    tags: ['nature', 'mangroves', 'kiteboarding', 'protected'], keywords: ['barkers national park', 'nature reserve'],
    embeddingText: 'Barkers National Park protected nature mangroves beaches kiteboarding West Bay',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-003', category: 'activity', name: 'Bike Cayman',
    description: 'Bicycle rentals and guided cycling tours around Grand Cayman.',
    shortDescription: 'Bicycle rentals and guided tours.',
    location: { address: 'George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3812 },
    contact: { phone: '+1-345-926-2453' }, media: { thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 25, priceTo: 60, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 189 },
    tags: ['cycling', 'bikes', 'tours', 'eco'], keywords: ['bike rental', 'cycling tour'],
    embeddingText: 'Bike Cayman bicycle rentals guided cycling tours Grand Cayman eco-friendly',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-004', category: 'restaurant', name: 'Coconut Joe\'s',
    description: 'Beach bar and grill with live music and Caribbean cuisine.',
    shortDescription: 'Beach bar with live music and Caribbean food.',
    location: { address: 'Seven Mile Beach', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3423, longitude: -81.3867 },
    contact: { phone: '+1-345-943-5637' }, media: { thumbnail: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 15, priceTo: 40, currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 567 },
    tags: ['beach bar', 'live music', 'caribbean', 'casual'], keywords: ['coconut joes', 'beach bar'],
    embeddingText: 'Coconut Joe\'s beach bar grill live music Caribbean Seven Mile Beach casual',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-005', category: 'activity', name: 'Heritage House Tour',
    description: 'Guided tours of historic Caymanian homes and traditional architecture.',
    shortDescription: 'Tours of historic Caymanian homes.',
    location: { address: 'Bodden Town', district: 'Bodden Town', island: 'Grand Cayman', latitude: 19.2823, longitude: -81.2567 },
    contact: {}, media: { thumbnail: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 15, priceTo: 30, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 123 },
    tags: ['heritage', 'history', 'tour', 'culture'], keywords: ['heritage tour', 'historic homes'],
    embeddingText: 'Heritage House Tour historic Caymanian homes traditional architecture Bodden Town culture',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-006', category: 'spa', name: 'Massage on the Beach',
    description: 'Oceanfront massage and spa services on Seven Mile Beach.',
    shortDescription: 'Oceanfront massage on Seven Mile Beach.',
    location: { address: 'Seven Mile Beach', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3389, longitude: -81.3879 },
    contact: { phone: '+1-345-916-0088' }, media: { thumbnail: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 80, priceTo: 180, currency: 'USD' },
    ratings: { overall: 4.7, reviewCount: 345 },
    tags: ['massage', 'beach', 'spa', 'wellness'], keywords: ['beach massage', 'oceanfront spa'],
    embeddingText: 'Massage on the Beach oceanfront spa wellness Seven Mile Beach relaxation',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-007', category: 'restaurant', name: 'Copper Falls Steakhouse',
    description: 'Premium steakhouse with aged beef and extensive wine list.',
    shortDescription: 'Premium steakhouse with aged beef.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3312, longitude: -81.3801 },
    contact: { phone: '+1-345-945-4755' }, media: { thumbnail: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800', images: [] },
    business: { priceRange: '$$$$', priceFrom: 50, priceTo: 150, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 567 },
    tags: ['steakhouse', 'fine dining', 'wine', 'premium'], keywords: ['copper falls', 'steakhouse cayman'],
    embeddingText: 'Copper Falls Steakhouse premium aged beef wine fine dining Seven Mile Beach',
    isActive: true, isPremium: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-008', category: 'activity', name: 'Horseback Riding Cayman',
    description: 'Beach horseback riding and trail rides through scenic areas.',
    shortDescription: 'Beach horseback riding and trail rides.',
    location: { address: 'Barkers, West Bay', district: 'West Bay', island: 'Grand Cayman', latitude: 19.3756, longitude: -81.4234 },
    contact: { phone: '+1-345-916-2540' }, media: { thumbnail: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 75, priceTo: 150, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 234 },
    tags: ['horseback', 'riding', 'beach', 'adventure'], keywords: ['horseback riding', 'beach horses'],
    embeddingText: 'Horseback Riding Cayman beach trail rides scenic Barkers West Bay adventure',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-009', category: 'diving_snorkeling', name: 'Night Snorkel Tour',
    description: 'Unique nighttime snorkeling to see bioluminescence and nocturnal marine life.',
    shortDescription: 'Nighttime snorkeling with bioluminescence.',
    location: { address: 'George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2889, longitude: -81.3845 },
    contact: { phone: '+1-345-949-4373' }, media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 60, priceTo: 100, currency: 'USD' },
    ratings: { overall: 4.8, reviewCount: 345 },
    tags: ['snorkeling', 'night', 'bioluminescence', 'unique'], keywords: ['night snorkel', 'bioluminescent tour'],
    embeddingText: 'Night Snorkel Tour bioluminescence nocturnal marine life unique experience George Town',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-010', category: 'restaurant', name: 'Rankin\'s Jerk Centre',
    description: 'Authentic jerk chicken and pork cooked on traditional pimento wood.',
    shortDescription: 'Authentic jerk on traditional pimento wood.',
    location: { address: 'Bodden Town', district: 'Bodden Town', island: 'Grand Cayman', latitude: 19.2812, longitude: -81.2545 },
    contact: { phone: '+1-345-947-3155' }, media: { thumbnail: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 10, priceTo: 25, currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 789 },
    tags: ['jerk', 'local', 'authentic', 'casual'], keywords: ['rankins jerk', 'jerk chicken bodden town'],
    embeddingText: 'Rankin\'s Jerk Centre authentic jerk chicken pork pimento wood Bodden Town local',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-011', category: 'hotel', name: 'Holiday Inn Resort',
    description: 'Family-friendly resort on Seven Mile Beach with pool and water sports.',
    shortDescription: 'Family-friendly resort on Seven Mile Beach.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3323, longitude: -81.3812 },
    contact: { phone: '+1-345-946-4433' }, media: { thumbnail: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 200, priceTo: 450, currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 1234 },
    tags: ['resort', 'family', 'beachfront', 'pool'], keywords: ['holiday inn cayman', 'family resort'],
    embeddingText: 'Holiday Inn Resort family-friendly Seven Mile Beach pool water sports beachfront',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-012', category: 'activity', name: 'Glass Bottom Boat Tour',
    description: 'See underwater marine life without getting wet on this family-friendly tour.',
    shortDescription: 'See marine life without getting wet.',
    location: { address: 'George Town Harbor', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3834 },
    contact: { phone: '+1-345-949-8986' }, media: { thumbnail: 'https://images.unsplash.com/photo-1544551763-8dd44758c2dd?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 30, priceTo: 50, currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 567 },
    tags: ['family', 'glass bottom', 'marine life', 'boat tour'], keywords: ['glass bottom boat', 'family tour'],
    embeddingText: 'Glass Bottom Boat Tour marine life family-friendly George Town harbor underwater',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-013', category: 'bar', name: 'Royal Palms Beach Club',
    description: 'Beachfront club with day passes, pools, and full bar service.',
    shortDescription: 'Beachfront club with pools and bar.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3401, longitude: -81.3856 },
    contact: { phone: '+1-345-945-6358' }, media: { thumbnail: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 35, priceTo: 80, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 456 },
    tags: ['beach club', 'pool', 'day pass', 'bar'], keywords: ['royal palms', 'beach club'],
    embeddingText: 'Royal Palms Beach Club beachfront pools day passes bar Seven Mile Beach',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-014', category: 'restaurant', name: 'Singh\'s Roti Shop',
    description: 'Caribbean roti and curry dishes in a casual local setting.',
    shortDescription: 'Caribbean roti and curry dishes.',
    location: { address: 'George Town', district: 'George Town', island: 'Grand Cayman', latitude: 19.2923, longitude: -81.3767 },
    contact: { phone: '+1-345-949-9922' }, media: { thumbnail: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 8, priceTo: 18, currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 345 },
    tags: ['roti', 'caribbean', 'curry', 'local', 'budget'], keywords: ['singh roti', 'caribbean curry'],
    embeddingText: 'Singh\'s Roti Shop Caribbean roti curry dishes local casual George Town budget',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-015', category: 'activity', name: 'Seaworld Observatory',
    description: 'Semi-submarine vessel for viewing coral reefs and marine life.',
    shortDescription: 'Semi-submarine for viewing marine life.',
    location: { address: 'George Town Harbor', district: 'George Town', island: 'Grand Cayman', latitude: 19.2956, longitude: -81.3834 },
    contact: { phone: '+1-345-949-8534' }, media: { thumbnail: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 45, priceTo: 70, currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 345 },
    tags: ['semi-submarine', 'marine life', 'family', 'reef'], keywords: ['seaworld observatory', 'semi-submarine'],
    embeddingText: 'Seaworld Observatory semi-submarine coral reefs marine life George Town family',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-016', category: 'hotel', name: 'Sunshine Suites Resort',
    description: 'Budget-friendly all-suite hotel with kitchenettes near Seven Mile Beach.',
    shortDescription: 'Budget-friendly suites near the beach.',
    location: { address: 'West Bay Road', district: 'Seven Mile Beach', island: 'Grand Cayman', latitude: 19.3267, longitude: -81.3789 },
    contact: { phone: '+1-345-949-3000' }, media: { thumbnail: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 150, priceTo: 280, currency: 'USD' },
    ratings: { overall: 4.3, reviewCount: 876 },
    tags: ['budget', 'suites', 'kitchenette', 'value'], keywords: ['sunshine suites', 'budget hotel cayman'],
    embeddingText: 'Sunshine Suites Resort budget-friendly kitchenettes Seven Mile Beach value',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-017', category: 'beach', name: 'Cayman Kai Beach',
    description: 'Secluded beach in the Cayman Kai area near Rum Point.',
    shortDescription: 'Secluded beach near Rum Point.',
    location: { address: 'Cayman Kai', district: 'North Side', island: 'Grand Cayman', latitude: 19.3634, longitude: -81.2712 },
    contact: {}, media: { thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.5, reviewCount: 234 },
    tags: ['beach', 'secluded', 'quiet', 'north side'], keywords: ['cayman kai beach', 'secluded beach'],
    embeddingText: 'Cayman Kai Beach secluded quiet Rum Point North Side peaceful',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-018', category: 'restaurant', name: 'Full of Beans Café',
    description: 'Coffee shop with breakfast, pastries, and light lunches.',
    shortDescription: 'Coffee shop with breakfast and pastries.',
    location: { address: 'Camana Bay', district: 'Camana Bay', island: 'Grand Cayman', latitude: 19.3271, longitude: -81.3775 },
    contact: { phone: '+1-345-943-2326' }, media: { thumbnail: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800', images: [] },
    business: { priceRange: '$', priceFrom: 5, priceTo: 18, currency: 'USD' },
    ratings: { overall: 4.4, reviewCount: 345 },
    tags: ['coffee', 'breakfast', 'cafe', 'pastries'], keywords: ['full of beans', 'coffee camana bay'],
    embeddingText: 'Full of Beans Cafe coffee breakfast pastries light lunch Camana Bay',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-019', category: 'activity', name: 'Farmers Market Camana Bay',
    description: 'Weekly farmers market with local produce, crafts, and live music.',
    shortDescription: 'Weekly market with local produce and crafts.',
    location: { address: 'Camana Bay', district: 'Camana Bay', island: 'Grand Cayman', latitude: 19.3271, longitude: -81.3775 },
    contact: {}, media: { thumbnail: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800', images: [] },
    business: { priceRange: '$', currency: 'USD' },
    ratings: { overall: 4.6, reviewCount: 567 },
    tags: ['farmers market', 'local', 'produce', 'weekly'], keywords: ['farmers market', 'camana bay market'],
    embeddingText: 'Farmers Market Camana Bay weekly local produce crafts live music',
    isActive: true, isPremium: false, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  },
  {
    id: 'add-020', category: 'villa_rental', name: 'Morritts Resort',
    description: 'Oceanfront timeshare resort on the East End with full amenities.',
    shortDescription: 'Oceanfront resort on the East End.',
    location: { address: 'East End', district: 'East End', island: 'Grand Cayman', latitude: 19.2967, longitude: -81.0978 },
    contact: { phone: '+1-345-947-7449' }, media: { thumbnail: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', images: [] },
    business: { priceRange: '$$', priceFrom: 150, priceTo: 350, currency: 'USD' },
    ratings: { overall: 4.2, reviewCount: 456 },
    tags: ['resort', 'oceanfront', 'east end', 'timeshare'], keywords: ['morritts resort', 'east end resort'],
    embeddingText: 'Morritts Resort oceanfront East End timeshare amenities condos',
    isActive: true, isPremium: false, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', createdBy: 'system'
  }
];

// ============ COMBINE ALL KNOWLEDGE ============

// Merge function to avoid duplicates (static content takes priority)
function mergeKnowledgeNodes(staticNodes: KnowledgeNode[], unifiedNodes: KnowledgeNode[]): KnowledgeNode[] {
  const nodeMap = new Map<string, KnowledgeNode>();
  const idSet = new Set<string>();

  // Add static nodes first (curated content takes priority)
  staticNodes.forEach(node => {
    nodeMap.set(node.name.toLowerCase(), node);
    idSet.add(node.id);
  });

  // Add unified nodes, skip duplicates by name or ID
  unifiedNodes.forEach(node => {
    const nameKey = node.name.toLowerCase();
    if (!nodeMap.has(nameKey) && !idSet.has(node.id)) {
      nodeMap.set(nameKey, node);
      idSet.add(node.id);
    }
  });

  return Array.from(nodeMap.values());
}

// Static knowledge base (curated, hand-crafted content)
const STATIC_KNOWLEDGE: KnowledgeNode[] = [
  ...CAYMAN_GENERAL_INFO,
  ...CAYMAN_OFFICIAL_CONTENT,
  ...CAYMAN_HOTELS,
  ...CAYMAN_RESTAURANTS,
  ...CAYMAN_BEACHES,
  ...CAYMAN_DIVING,
  ...CAYMAN_DIVE_EXTRAS,
  ...CAYMAN_SPAS,
  ...CAYMAN_BARS,
  ...CAYMAN_ACTIVITIES,
  ...CAYMAN_VIP_SERVICES,
  ...CAYMAN_SHOPPING,
  ...CAYMAN_TRANSPORTATION,
  ...CAYMAN_AIRLINES,
  ...CAYMAN_BUS_ROUTES,
  ...CAYMAN_SERVICES,
  ...CAYMAN_EVENTS,
  ...CAYMAN_ADDITIONAL
];

// Knowledge base is loaded at runtime from /knowledge-base.json
// Use loadKnowledgeBase() from island-knowledge.ts to load data
// This empty array is replaced by Proxy in island-knowledge.ts
export const CAYMAN_KNOWLEDGE_BASE: KnowledgeNode[] = UNIFIED_KNOWLEDGE_NODES;

// Stats are now dynamic - use getKnowledgeBase().length
export const KNOWLEDGE_BASE_STATS = {
  staticNodes: 0,
  unifiedNodes: 0, // Loaded at runtime
  totalNodes: 0,   // Loaded at runtime
  lastUpdated: new Date().toISOString()
};

// ============ FEATURED GUIDES ============

export const CAYMAN_GUIDES: Guide[] = [
  {
    id: 'guide-001',
    title: 'The Perfect 72 Hours in Grand Cayman',
    description: 'Experience the best of Grand Cayman in 3 action-packed days - from Seven Mile Beach to Stingray City.',
    thumbnail: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800',
    author: {
      id: 'system',
      name: 'Isle AI',
      isOfficial: true
    },
    destination: 'Grand Cayman',
    duration: '3 days',
    placesCount: 12,
    places: ['beach-001', 'dive-001', 'rest-001', 'rest-003', 'beach-002', 'hotel-001'],
    tags: ['first-time', 'highlights', 'must-see'],
    theme: 'adventure',
    saves: 1234,
    views: 15678,
    images: [
      'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1200',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200'
    ],
    isFeature: true,
    createdAt: '2024-01-01'
  },
  {
    id: 'guide-002',
    title: 'Ultimate Luxury: 5-Star Cayman Experience',
    description: 'The most exclusive experiences the Cayman Islands have to offer - from yacht charters to Michelin-starred dining.',
    thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    author: {
      id: 'system',
      name: 'Isle AI',
      isOfficial: true
    },
    destination: 'Grand Cayman',
    duration: '5 days',
    placesCount: 8,
    places: ['hotel-001', 'hotel-002', 'rest-001', 'vip-001', 'vip-002'],
    tags: ['luxury', 'exclusive', 'vip'],
    theme: 'luxury',
    saves: 567,
    views: 8934,
    images: [],
    isFeature: true,
    createdAt: '2024-01-01'
  },
  {
    id: 'guide-003',
    title: 'Family Fun in the Cayman Islands',
    description: 'Kid-friendly adventures from turtle encounters to beach days - the perfect family vacation guide.',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    author: {
      id: 'system',
      name: 'Isle AI',
      isOfficial: true
    },
    destination: 'Grand Cayman',
    duration: '4 days',
    placesCount: 10,
    places: ['beach-001', 'dive-001', 'beach-002', 'rest-003', 'hotel-003'],
    tags: ['family', 'kids', 'activities'],
    theme: 'family',
    saves: 892,
    views: 12345,
    images: [],
    isFeature: true,
    createdAt: '2024-01-01'
  }
];

export default {
  config: CAYMAN_CONFIG,
  knowledgeBase: CAYMAN_KNOWLEDGE_BASE,
  guides: CAYMAN_GUIDES
};
