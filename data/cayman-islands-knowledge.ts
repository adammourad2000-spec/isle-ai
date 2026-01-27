// ============================================
// ISLE AI - CAYMAN ISLANDS KNOWLEDGE BASE
// Complete RAG Data for Grand Cayman, Cayman Brac, Little Cayman
// ============================================

import { KnowledgeNode, ChatbotConfig, Guide } from '../types/chatbot';

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
      latitude: 19.3389,
      longitude: -81.3879
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
  }
];

// ============ COMBINE ALL KNOWLEDGE ============

export const CAYMAN_KNOWLEDGE_BASE: KnowledgeNode[] = [
  ...CAYMAN_GENERAL_INFO,
  ...CAYMAN_HOTELS,
  ...CAYMAN_RESTAURANTS,
  ...CAYMAN_BEACHES,
  ...CAYMAN_DIVING,
  ...CAYMAN_VIP_SERVICES
];

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
