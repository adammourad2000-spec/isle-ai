/**
 * ISLE AI - Knowledge Base Category Definitions
 *
 * Complete category definitions for the RAG system including:
 * - Category icons and colors
 * - Search keywords per category
 * - Display metadata
 * - Hierarchy and groupings
 *
 * This file helps the RAG system better categorize queries and
 * provides consistent UI elements for category display.
 *
 * @author Isle AI Team
 * @version 1.0.0
 */

import type { KnowledgeCategory } from '../types/chatbot';

// ============ TYPES ============

export interface CategoryDefinition {
  id: KnowledgeCategory;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class or hex
  bgColor: string; // Background color for cards
  group: CategoryGroup;
  priority: number; // Higher = more prominent in search
  searchKeywords: string[];
  synonyms: string[];
  relatedCategories: KnowledgeCategory[];
  minQualityScore?: number; // Minimum quality score for display
  isVIP?: boolean; // VIP/premium category
  isActive: boolean;
}

export type CategoryGroup =
  | 'accommodation'
  | 'dining'
  | 'beaches_water'
  | 'activities'
  | 'wellness'
  | 'transportation'
  | 'vip_services'
  | 'professional'
  | 'information'
  | 'events';

export interface CategoryGroupDefinition {
  id: CategoryGroup;
  name: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}

// ============ CATEGORY GROUPS ============

export const CATEGORY_GROUPS: Record<CategoryGroup, CategoryGroupDefinition> = {
  accommodation: {
    id: 'accommodation',
    name: 'Accommodation',
    description: 'Hotels, resorts, villas, and vacation rentals',
    icon: 'Bed',
    color: '#3B82F6', // blue-500
    order: 1,
  },
  dining: {
    id: 'dining',
    name: 'Dining & Nightlife',
    description: 'Restaurants, bars, cafes, and nightlife venues',
    icon: 'UtensilsCrossed',
    color: '#F59E0B', // amber-500
    order: 2,
  },
  beaches_water: {
    id: 'beaches_water',
    name: 'Beaches & Water',
    description: 'Beaches, diving, snorkeling, and water activities',
    icon: 'Waves',
    color: '#06B6D4', // cyan-500
    order: 3,
  },
  activities: {
    id: 'activities',
    name: 'Activities & Attractions',
    description: 'Tours, attractions, shopping, and entertainment',
    icon: 'Compass',
    color: '#10B981', // emerald-500
    order: 4,
  },
  wellness: {
    id: 'wellness',
    name: 'Wellness & Spa',
    description: 'Spas, wellness centers, and medical services',
    icon: 'Heart',
    color: '#EC4899', // pink-500
    order: 5,
  },
  transportation: {
    id: 'transportation',
    name: 'Transportation',
    description: 'Car rentals, taxis, flights, and transfers',
    icon: 'Car',
    color: '#8B5CF6', // violet-500
    order: 6,
  },
  vip_services: {
    id: 'vip_services',
    name: 'VIP & Luxury Services',
    description: 'Yacht charters, private jets, concierge services',
    icon: 'Crown',
    color: '#D4AF37', // Gold
    order: 7,
  },
  professional: {
    id: 'professional',
    name: 'Professional Services',
    description: 'Financial, legal, real estate, and business services',
    icon: 'Briefcase',
    color: '#64748B', // slate-500
    order: 8,
  },
  information: {
    id: 'information',
    name: 'Information',
    description: 'Travel info, history, culture, and general knowledge',
    icon: 'Info',
    color: '#6366F1', // indigo-500
    order: 9,
  },
  events: {
    id: 'events',
    name: 'Events & Festivals',
    description: 'Local events, festivals, and celebrations',
    icon: 'Calendar',
    color: '#EF4444', // red-500
    order: 10,
  },
};

// ============ CATEGORY DEFINITIONS ============

export const CATEGORY_DEFINITIONS: Record<KnowledgeCategory, CategoryDefinition> = {
  // ===== ACCOMMODATION =====
  hotel: {
    id: 'hotel',
    name: 'Hotels & Resorts',
    description: 'Luxury resorts, boutique hotels, and accommodations',
    icon: 'Hotel',
    color: '#3B82F6',
    bgColor: 'bg-blue-50',
    group: 'accommodation',
    priority: 100,
    searchKeywords: [
      'hotel', 'resort', 'stay', 'accommodation', 'room', 'suite', 'lodging',
      'sleep', 'overnight', 'booking', 'check-in', 'check-out', 'reception',
      'five star', '5 star', 'four star', '4 star', 'boutique', 'beachfront',
      'oceanfront', 'pool', 'spa', 'all-inclusive', 'bed and breakfast'
    ],
    synonyms: ['resort', 'inn', 'lodge', 'motel', 'hostel', 'accommodations'],
    relatedCategories: ['villa_rental', 'spa_wellness', 'restaurant'],
    isActive: true,
  },
  villa_rental: {
    id: 'villa_rental',
    name: 'Villa Rentals',
    description: 'Private villas, vacation homes, and luxury estates',
    icon: 'Home',
    color: '#3B82F6',
    bgColor: 'bg-blue-50',
    group: 'accommodation',
    priority: 90,
    searchKeywords: [
      'villa', 'rental', 'vacation home', 'private', 'estate', 'mansion',
      'house', 'condo', 'apartment', 'penthouse', 'beachfront villa',
      'luxury home', 'private pool', 'chef', 'butler', 'staff'
    ],
    synonyms: ['vacation rental', 'holiday home', 'beach house', 'cottage'],
    relatedCategories: ['hotel', 'concierge', 'real_estate'],
    isVIP: true,
    isActive: true,
  },

  // ===== DINING =====
  restaurant: {
    id: 'restaurant',
    name: 'Restaurants',
    description: 'Fine dining, casual restaurants, and eateries',
    icon: 'UtensilsCrossed',
    color: '#F59E0B',
    bgColor: 'bg-amber-50',
    group: 'dining',
    priority: 95,
    searchKeywords: [
      'restaurant', 'food', 'eat', 'dining', 'dinner', 'lunch', 'breakfast',
      'brunch', 'cuisine', 'chef', 'menu', 'reservation', 'table',
      'fine dining', 'casual dining', 'seafood', 'italian', 'caribbean',
      'sushi', 'steakhouse', 'vegetarian', 'vegan', 'local food'
    ],
    synonyms: ['eatery', 'bistro', 'cafe', 'diner', 'grill', 'kitchen'],
    relatedCategories: ['bar', 'nightlife', 'hotel'],
    isActive: true,
  },
  bar: {
    id: 'bar',
    name: 'Bars & Lounges',
    description: 'Beach bars, cocktail lounges, and pubs',
    icon: 'Wine',
    color: '#F59E0B',
    bgColor: 'bg-amber-50',
    group: 'dining',
    priority: 75,
    searchKeywords: [
      'bar', 'cocktail', 'drink', 'beer', 'wine', 'rum', 'lounge',
      'happy hour', 'nightcap', 'beach bar', 'pub', 'tavern',
      'mixology', 'craft cocktails', 'rum punch', 'sunset drinks'
    ],
    synonyms: ['pub', 'tavern', 'lounge', 'cantina', 'taproom'],
    relatedCategories: ['restaurant', 'nightlife', 'beach'],
    isActive: true,
  },
  nightlife: {
    id: 'nightlife',
    name: 'Nightlife',
    description: 'Clubs, night entertainment, and late-night venues',
    icon: 'Music',
    color: '#F59E0B',
    bgColor: 'bg-amber-50',
    group: 'dining',
    priority: 60,
    searchKeywords: [
      'nightlife', 'club', 'nightclub', 'dance', 'dancing', 'dj',
      'party', 'late night', 'live music', 'entertainment',
      'karaoke', 'casino', 'night out'
    ],
    synonyms: ['club', 'disco', 'night spot'],
    relatedCategories: ['bar', 'restaurant', 'event'],
    isActive: true,
  },

  // ===== BEACHES & WATER =====
  beach: {
    id: 'beach',
    name: 'Beaches',
    description: 'Public beaches, private beaches, and coastal areas',
    icon: 'Umbrella',
    color: '#06B6D4',
    bgColor: 'bg-cyan-50',
    group: 'beaches_water',
    priority: 100,
    searchKeywords: [
      'beach', 'sand', 'shore', 'coastline', 'swimming', 'sunbathe',
      'tan', 'ocean', 'sea', 'waves', 'snorkeling', 'seven mile beach',
      'rum point', 'starfish point', 'cemetery beach', 'public beach',
      'private beach', 'secluded', 'calm waters'
    ],
    synonyms: ['shore', 'coast', 'seaside', 'waterfront'],
    relatedCategories: ['diving_snorkeling', 'water_sports', 'bar'],
    isActive: true,
  },
  diving_snorkeling: {
    id: 'diving_snorkeling',
    name: 'Diving & Snorkeling',
    description: 'Dive sites, snorkel spots, and underwater experiences',
    icon: 'Waves',
    color: '#06B6D4',
    bgColor: 'bg-cyan-50',
    group: 'beaches_water',
    priority: 95,
    searchKeywords: [
      'dive', 'diving', 'snorkel', 'snorkeling', 'scuba', 'underwater',
      'reef', 'coral', 'fish', 'marine life', 'stingray city', 'kittiwake',
      'bloody bay wall', 'wreck dive', 'night dive', 'padi', 'certification',
      'beginner dive', 'advanced dive', 'turtle', 'shark'
    ],
    synonyms: ['scuba', 'freediving', 'underwater tour'],
    relatedCategories: ['beach', 'water_sports', 'boat_charter', 'activity'],
    isActive: true,
  },
  water_sports: {
    id: 'water_sports',
    name: 'Water Sports',
    description: 'Jet skis, paddleboarding, kayaking, and water activities',
    icon: 'Anchor',
    color: '#06B6D4',
    bgColor: 'bg-cyan-50',
    group: 'beaches_water',
    priority: 80,
    searchKeywords: [
      'water sports', 'jet ski', 'paddleboard', 'kayak', 'parasailing',
      'wakeboard', 'waterski', 'kiteboard', 'windsurfing', 'sailing',
      'banana boat', 'tubing', 'flyboard', 'seabob'
    ],
    synonyms: ['aquatic sports', 'ocean activities'],
    relatedCategories: ['beach', 'boat_charter', 'activity'],
    isActive: true,
  },
  boat_charter: {
    id: 'boat_charter',
    name: 'Boat Charters',
    description: 'Boat rentals, sailing trips, and fishing charters',
    icon: 'Ship',
    color: '#06B6D4',
    bgColor: 'bg-cyan-50',
    group: 'beaches_water',
    priority: 85,
    searchKeywords: [
      'boat', 'charter', 'yacht', 'sailing', 'cruise', 'catamaran',
      'fishing', 'deep sea fishing', 'sunset cruise', 'private boat',
      'captain', 'crew', 'snorkel trip', 'stingray city tour'
    ],
    synonyms: ['boat rental', 'yacht charter', 'sailing trip'],
    relatedCategories: ['superyacht', 'diving_snorkeling', 'water_sports'],
    isActive: true,
  },
  superyacht: {
    id: 'superyacht',
    name: 'Superyachts',
    description: 'Luxury superyacht charters and services',
    icon: 'Ship',
    color: '#D4AF37',
    bgColor: 'bg-yellow-50',
    group: 'vip_services',
    priority: 70,
    searchKeywords: [
      'superyacht', 'mega yacht', 'luxury yacht', 'yacht charter',
      'private yacht', 'yacht crew', 'yacht captain', 'yacht rental',
      'yacht provisioning', 'yacht services'
    ],
    synonyms: ['mega yacht', 'luxury vessel'],
    relatedCategories: ['boat_charter', 'concierge', 'private_jet'],
    isVIP: true,
    isActive: true,
  },

  // ===== ACTIVITIES =====
  attraction: {
    id: 'attraction',
    name: 'Attractions',
    description: 'Tourist attractions, landmarks, and points of interest',
    icon: 'MapPin',
    color: '#10B981',
    bgColor: 'bg-emerald-50',
    group: 'activities',
    priority: 90,
    searchKeywords: [
      'attraction', 'tourist', 'landmark', 'sight', 'visit', 'museum',
      'turtle centre', 'hell', 'blowhole', 'crystal caves', 'pirate',
      'historic', 'famous', 'must see', 'bucket list'
    ],
    synonyms: ['landmark', 'sight', 'point of interest', 'destination'],
    relatedCategories: ['activity', 'beach', 'shopping'],
    isActive: true,
  },
  activity: {
    id: 'activity',
    name: 'Activities & Tours',
    description: 'Tours, excursions, and recreational activities',
    icon: 'Compass',
    color: '#10B981',
    bgColor: 'bg-emerald-50',
    group: 'activities',
    priority: 85,
    searchKeywords: [
      'activity', 'tour', 'excursion', 'adventure', 'experience',
      'things to do', 'outdoor', 'eco tour', 'island tour', 'helicopter',
      'submarine', 'bioluminescence', 'kayak tour', 'horseback riding'
    ],
    synonyms: ['tour', 'excursion', 'outing', 'adventure'],
    relatedCategories: ['attraction', 'diving_snorkeling', 'water_sports'],
    isActive: true,
  },
  golf: {
    id: 'golf',
    name: 'Golf',
    description: 'Golf courses, clubs, and facilities',
    icon: 'Flag',
    color: '#10B981',
    bgColor: 'bg-emerald-50',
    group: 'activities',
    priority: 65,
    searchKeywords: [
      'golf', 'golf course', 'tee time', 'driving range', 'pro shop',
      'caddy', 'putting green', '18 holes', '9 holes', 'golf club',
      'north sound golf', 'blue tip'
    ],
    synonyms: ['golf club', 'links', 'country club'],
    relatedCategories: ['hotel', 'activity', 'restaurant'],
    isActive: true,
  },
  shopping: {
    id: 'shopping',
    name: 'Shopping',
    description: 'Shops, boutiques, malls, and duty-free stores',
    icon: 'ShoppingBag',
    color: '#10B981',
    bgColor: 'bg-emerald-50',
    group: 'activities',
    priority: 70,
    searchKeywords: [
      'shopping', 'shop', 'store', 'boutique', 'mall', 'duty free',
      'souvenir', 'jewelry', 'watches', 'designer', 'fashion',
      'camana bay', 'george town', 'craft market', 'local crafts'
    ],
    synonyms: ['retail', 'store', 'boutique', 'market'],
    relatedCategories: ['restaurant', 'attraction', 'service'],
    isActive: true,
  },

  // ===== WELLNESS =====
  spa_wellness: {
    id: 'spa_wellness',
    name: 'Spa & Wellness',
    description: 'Spas, wellness centers, and health retreats',
    icon: 'Sparkles',
    color: '#EC4899',
    bgColor: 'bg-pink-50',
    group: 'wellness',
    priority: 80,
    searchKeywords: [
      'spa', 'wellness', 'massage', 'facial', 'treatment', 'relaxation',
      'meditation', 'yoga', 'fitness', 'health', 'rejuvenation',
      'body treatment', 'aromatherapy', 'hot stone', 'couples massage'
    ],
    synonyms: ['spa', 'health spa', 'day spa', 'wellness center'],
    relatedCategories: ['spa', 'hotel', 'medical_vip'],
    isActive: true,
  },
  spa: {
    id: 'spa',
    name: 'Day Spas',
    description: 'Day spa services and treatments',
    icon: 'Droplet',
    color: '#EC4899',
    bgColor: 'bg-pink-50',
    group: 'wellness',
    priority: 75,
    searchKeywords: [
      'day spa', 'spa treatment', 'massage', 'facial', 'manicure',
      'pedicure', 'body wrap', 'scrub', 'sauna', 'steam room'
    ],
    synonyms: ['day spa', 'beauty spa'],
    relatedCategories: ['spa_wellness', 'hotel'],
    isActive: true,
  },
  medical_vip: {
    id: 'medical_vip',
    name: 'VIP Medical Services',
    description: 'Private medical care and health concierge',
    icon: 'Stethoscope',
    color: '#EC4899',
    bgColor: 'bg-pink-50',
    group: 'wellness',
    priority: 50,
    searchKeywords: [
      'medical', 'doctor', 'healthcare', 'private doctor', 'concierge medicine',
      'medical tourism', 'health screening', 'executive health'
    ],
    synonyms: ['private healthcare', 'medical concierge'],
    relatedCategories: ['spa_wellness', 'concierge', 'emergency'],
    isVIP: true,
    isActive: true,
  },

  // ===== TRANSPORTATION =====
  transport: {
    id: 'transport',
    name: 'Transportation',
    description: 'General transportation services',
    icon: 'Car',
    color: '#8B5CF6',
    bgColor: 'bg-violet-50',
    group: 'transportation',
    priority: 70,
    searchKeywords: [
      'transport', 'transportation', 'taxi', 'cab', 'car rental',
      'rental car', 'bus', 'shuttle', 'transfer', 'airport transfer'
    ],
    synonyms: ['transit', 'travel', 'getting around'],
    relatedCategories: ['transportation', 'chauffeur', 'luxury_car_rental'],
    isActive: true,
  },
  transportation: {
    id: 'transportation',
    name: 'Getting Around',
    description: 'All transportation options and services',
    icon: 'Navigation',
    color: '#8B5CF6',
    bgColor: 'bg-violet-50',
    group: 'transportation',
    priority: 65,
    searchKeywords: [
      'getting around', 'how to get', 'directions', 'commute',
      'public transport', 'bus route', 'taxi fare'
    ],
    synonyms: ['mobility', 'commute'],
    relatedCategories: ['transport', 'chauffeur', 'flight'],
    isActive: true,
  },
  chauffeur: {
    id: 'chauffeur',
    name: 'Chauffeur Services',
    description: 'Private drivers and chauffeur services',
    icon: 'User',
    color: '#8B5CF6',
    bgColor: 'bg-violet-50',
    group: 'transportation',
    priority: 55,
    searchKeywords: [
      'chauffeur', 'private driver', 'driver', 'luxury car',
      'limo', 'limousine', 'executive transport', 'vip transport'
    ],
    synonyms: ['private driver', 'personal driver', 'limo service'],
    relatedCategories: ['transport', 'luxury_car_rental', 'concierge'],
    isVIP: true,
    isActive: true,
  },
  private_jet: {
    id: 'private_jet',
    name: 'Private Jets',
    description: 'Private jet charters and aviation services',
    icon: 'Plane',
    color: '#D4AF37',
    bgColor: 'bg-yellow-50',
    group: 'vip_services',
    priority: 60,
    searchKeywords: [
      'private jet', 'jet charter', 'private plane', 'aviation',
      'aircraft', 'charter flight', 'executive jet', 'vip flight'
    ],
    synonyms: ['jet charter', 'private aviation', 'charter plane'],
    relatedCategories: ['flight', 'concierge', 'superyacht'],
    isVIP: true,
    isActive: true,
  },
  flight: {
    id: 'flight',
    name: 'Flights',
    description: 'Commercial flights and airline information',
    icon: 'Plane',
    color: '#8B5CF6',
    bgColor: 'bg-violet-50',
    group: 'transportation',
    priority: 75,
    searchKeywords: [
      'flight', 'airline', 'airport', 'flying', 'ticket',
      'cayman airways', 'american airlines', 'direct flight',
      'connecting flight', 'departure', 'arrival'
    ],
    synonyms: ['air travel', 'airline ticket', 'plane ticket'],
    relatedCategories: ['private_jet', 'transport', 'visa_travel'],
    isActive: true,
  },
  luxury_car_rental: {
    id: 'luxury_car_rental',
    name: 'Luxury Car Rentals',
    description: 'Premium and exotic car rentals',
    icon: 'Car',
    color: '#D4AF37',
    bgColor: 'bg-yellow-50',
    group: 'transportation',
    priority: 50,
    searchKeywords: [
      'luxury car', 'exotic car', 'sports car', 'ferrari', 'lamborghini',
      'porsche', 'mercedes', 'bmw', 'premium rental', 'exotic rental'
    ],
    synonyms: ['exotic car rental', 'premium car rental'],
    relatedCategories: ['transport', 'chauffeur', 'concierge'],
    isVIP: true,
    isActive: true,
  },

  // ===== VIP SERVICES =====
  concierge: {
    id: 'concierge',
    name: 'Concierge Services',
    description: 'Personal concierge and VIP assistance',
    icon: 'Crown',
    color: '#D4AF37',
    bgColor: 'bg-yellow-50',
    group: 'vip_services',
    priority: 85,
    searchKeywords: [
      'concierge', 'vip', 'personal assistant', 'butler', 'lifestyle',
      'luxury services', 'arrangements', 'reservations', 'booking',
      'exclusive access', 'private access'
    ],
    synonyms: ['personal concierge', 'lifestyle manager', 'vip services'],
    relatedCategories: ['villa_rental', 'superyacht', 'private_jet'],
    isVIP: true,
    isActive: true,
  },
  vip_escort: {
    id: 'vip_escort',
    name: 'VIP Escort Services',
    description: 'Airport meet & greet and VIP escort services',
    icon: 'Shield',
    color: '#D4AF37',
    bgColor: 'bg-yellow-50',
    group: 'vip_services',
    priority: 45,
    searchKeywords: [
      'vip escort', 'meet and greet', 'airport escort', 'fast track',
      'customs assistance', 'immigration', 'arrival service'
    ],
    synonyms: ['airport assistance', 'arrival escort'],
    relatedCategories: ['concierge', 'security_services', 'chauffeur'],
    isVIP: true,
    isActive: true,
  },
  security_services: {
    id: 'security_services',
    name: 'Security Services',
    description: 'Personal security and protection services',
    icon: 'Shield',
    color: '#D4AF37',
    bgColor: 'bg-yellow-50',
    group: 'vip_services',
    priority: 40,
    searchKeywords: [
      'security', 'bodyguard', 'protection', 'personal security',
      'executive protection', 'close protection', 'security detail'
    ],
    synonyms: ['personal protection', 'bodyguard service'],
    relatedCategories: ['concierge', 'vip_escort', 'chauffeur'],
    isVIP: true,
    isActive: true,
  },
  service: {
    id: 'service',
    name: 'General Services',
    description: 'Miscellaneous services and assistance',
    icon: 'Wrench',
    color: '#64748B',
    bgColor: 'bg-slate-50',
    group: 'professional',
    priority: 30,
    searchKeywords: [
      'service', 'assistance', 'help', 'support', 'provider'
    ],
    synonyms: ['provider', 'company', 'business'],
    relatedCategories: ['concierge', 'shopping'],
    isActive: true,
  },

  // ===== PROFESSIONAL SERVICES =====
  financial_services: {
    id: 'financial_services',
    name: 'Financial Services',
    description: 'Banks, investment firms, and financial advisors',
    icon: 'Landmark',
    color: '#64748B',
    bgColor: 'bg-slate-50',
    group: 'professional',
    priority: 50,
    searchKeywords: [
      'bank', 'banking', 'finance', 'investment', 'wealth management',
      'offshore', 'account', 'fund', 'asset management', 'private banking'
    ],
    synonyms: ['banking', 'finance', 'investment services'],
    relatedCategories: ['legal_services', 'real_estate', 'investment'],
    isActive: true,
  },
  legal_services: {
    id: 'legal_services',
    name: 'Legal Services',
    description: 'Law firms and legal professionals',
    icon: 'Scale',
    color: '#64748B',
    bgColor: 'bg-slate-50',
    group: 'professional',
    priority: 45,
    searchKeywords: [
      'lawyer', 'attorney', 'law firm', 'legal', 'solicitor',
      'corporate law', 'immigration law', 'real estate law'
    ],
    synonyms: ['law firm', 'attorney services', 'legal counsel'],
    relatedCategories: ['financial_services', 'real_estate'],
    isActive: true,
  },
  real_estate: {
    id: 'real_estate',
    name: 'Real Estate',
    description: 'Property sales, rentals, and real estate services',
    icon: 'Building2',
    color: '#64748B',
    bgColor: 'bg-slate-50',
    group: 'professional',
    priority: 55,
    searchKeywords: [
      'real estate', 'property', 'buy', 'sell', 'invest', 'land',
      'condo', 'apartment', 'house', 'beachfront property', 'investment property'
    ],
    synonyms: ['property', 'realty', 'property services'],
    relatedCategories: ['villa_rental', 'financial_services', 'investment'],
    isActive: true,
  },
  investment: {
    id: 'investment',
    name: 'Investment Opportunities',
    description: 'Investment options and opportunities',
    icon: 'TrendingUp',
    color: '#64748B',
    bgColor: 'bg-slate-50',
    group: 'professional',
    priority: 40,
    searchKeywords: [
      'investment', 'invest', 'opportunity', 'fund', 'portfolio',
      'returns', 'capital', 'hedge fund', 'private equity'
    ],
    synonyms: ['investment opportunity', 'investment option'],
    relatedCategories: ['financial_services', 'real_estate'],
    isActive: true,
  },

  // ===== INFORMATION =====
  history: {
    id: 'history',
    name: 'History',
    description: 'Historical information and heritage sites',
    icon: 'Scroll',
    color: '#6366F1',
    bgColor: 'bg-indigo-50',
    group: 'information',
    priority: 35,
    searchKeywords: [
      'history', 'historical', 'heritage', 'past', 'pirate', 'colonial',
      'museum', 'old', 'traditional', 'culture'
    ],
    synonyms: ['heritage', 'historical'],
    relatedCategories: ['culture', 'attraction', 'general_info'],
    isActive: true,
  },
  culture: {
    id: 'culture',
    name: 'Culture',
    description: 'Local culture, traditions, and customs',
    icon: 'Music2',
    color: '#6366F1',
    bgColor: 'bg-indigo-50',
    group: 'information',
    priority: 35,
    searchKeywords: [
      'culture', 'tradition', 'custom', 'local', 'caymanian',
      'art', 'music', 'dance', 'festival', 'heritage'
    ],
    synonyms: ['traditions', 'customs', 'heritage'],
    relatedCategories: ['history', 'event', 'festival'],
    isActive: true,
  },
  wildlife: {
    id: 'wildlife',
    name: 'Wildlife',
    description: 'Local wildlife, nature, and conservation',
    icon: 'Bird',
    color: '#6366F1',
    bgColor: 'bg-indigo-50',
    group: 'information',
    priority: 40,
    searchKeywords: [
      'wildlife', 'animal', 'bird', 'turtle', 'iguana', 'parrot',
      'nature', 'conservation', 'sanctuary', 'marine life'
    ],
    synonyms: ['animals', 'nature', 'fauna'],
    relatedCategories: ['attraction', 'diving_snorkeling', 'activity'],
    isActive: true,
  },
  weather: {
    id: 'weather',
    name: 'Weather',
    description: 'Weather information and climate details',
    icon: 'Sun',
    color: '#6366F1',
    bgColor: 'bg-indigo-50',
    group: 'information',
    priority: 45,
    searchKeywords: [
      'weather', 'climate', 'temperature', 'rain', 'sun', 'hurricane',
      'season', 'best time', 'forecast', 'tropical'
    ],
    synonyms: ['climate', 'conditions', 'forecast'],
    relatedCategories: ['general_info', 'visa_travel'],
    isActive: true,
  },
  visa_travel: {
    id: 'visa_travel',
    name: 'Travel Information',
    description: 'Visas, entry requirements, and travel tips',
    icon: 'Ticket',
    color: '#6366F1',
    bgColor: 'bg-indigo-50',
    group: 'information',
    priority: 60,
    searchKeywords: [
      'visa', 'travel', 'entry', 'passport', 'requirement', 'immigration',
      'customs', 'arrival', 'departure', 'documentation'
    ],
    synonyms: ['entry requirements', 'travel info', 'documentation'],
    relatedCategories: ['general_info', 'flight', 'transport'],
    isActive: true,
  },
  emergency: {
    id: 'emergency',
    name: 'Emergency Services',
    description: 'Emergency contacts and essential services',
    icon: 'AlertCircle',
    color: '#EF4444',
    bgColor: 'bg-red-50',
    group: 'information',
    priority: 100,
    searchKeywords: [
      'emergency', 'hospital', 'police', 'ambulance', 'fire',
      'doctor', 'pharmacy', 'urgent', 'help', '911'
    ],
    synonyms: ['urgent', 'emergency services', 'help'],
    relatedCategories: ['medical_vip', 'general_info'],
    isActive: true,
  },
  general_info: {
    id: 'general_info',
    name: 'General Information',
    description: 'General knowledge and overview',
    icon: 'Info',
    color: '#6366F1',
    bgColor: 'bg-indigo-50',
    group: 'information',
    priority: 50,
    searchKeywords: [
      'information', 'about', 'overview', 'general', 'facts',
      'guide', 'tips', 'basics', 'essentials'
    ],
    synonyms: ['info', 'overview', 'guide'],
    relatedCategories: ['visa_travel', 'weather', 'history'],
    isActive: true,
  },

  // ===== EVENTS =====
  event: {
    id: 'event',
    name: 'Events',
    description: 'Local events, shows, and happenings',
    icon: 'Calendar',
    color: '#EF4444',
    bgColor: 'bg-red-50',
    group: 'events',
    priority: 55,
    searchKeywords: [
      'event', 'happening', 'show', 'concert', 'exhibition',
      'performance', 'whats on', 'calendar', 'schedule'
    ],
    synonyms: ['happening', 'show', 'occasion'],
    relatedCategories: ['festival', 'nightlife', 'culture'],
    isActive: true,
  },
  festival: {
    id: 'festival',
    name: 'Festivals',
    description: 'Annual festivals and celebrations',
    icon: 'PartyPopper',
    color: '#EF4444',
    bgColor: 'bg-red-50',
    group: 'events',
    priority: 50,
    searchKeywords: [
      'festival', 'carnival', 'celebration', 'batabano', 'pirates week',
      'cayfest', 'jazz', 'food festival', 'annual event'
    ],
    synonyms: ['celebration', 'carnival', 'fair'],
    relatedCategories: ['event', 'culture', 'nightlife'],
    isActive: true,
  },
};

// ============ HELPER FUNCTIONS ============

/**
 * Get all categories for a given group
 */
export function getCategoriesByGroup(group: CategoryGroup): CategoryDefinition[] {
  return Object.values(CATEGORY_DEFINITIONS).filter(cat => cat.group === group);
}

/**
 * Get category definition by ID
 */
export function getCategoryById(id: KnowledgeCategory): CategoryDefinition | undefined {
  return CATEGORY_DEFINITIONS[id];
}

/**
 * Get all VIP categories
 */
export function getVIPCategories(): CategoryDefinition[] {
  return Object.values(CATEGORY_DEFINITIONS).filter(cat => cat.isVIP);
}

/**
 * Get active categories sorted by priority
 */
export function getActiveCategoriesByPriority(): CategoryDefinition[] {
  return Object.values(CATEGORY_DEFINITIONS)
    .filter(cat => cat.isActive)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Find matching categories for a search query
 */
export function findCategoriesForQuery(query: string): CategoryDefinition[] {
  const lowerQuery = query.toLowerCase();
  const matches: Array<{ category: CategoryDefinition; score: number }> = [];

  for (const category of Object.values(CATEGORY_DEFINITIONS)) {
    if (!category.isActive) continue;

    let score = 0;

    // Check name match
    if (category.name.toLowerCase().includes(lowerQuery)) {
      score += 50;
    }

    // Check keywords
    for (const keyword of category.searchKeywords) {
      if (lowerQuery.includes(keyword)) {
        score += 10;
      }
      if (keyword.includes(lowerQuery)) {
        score += 5;
      }
    }

    // Check synonyms
    for (const synonym of category.synonyms) {
      if (lowerQuery.includes(synonym)) {
        score += 8;
      }
    }

    if (score > 0) {
      matches.push({ category, score });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .map(m => m.category);
}

/**
 * Get all search keywords for a category
 */
export function getAllKeywordsForCategory(id: KnowledgeCategory): string[] {
  const category = CATEGORY_DEFINITIONS[id];
  if (!category) return [];

  return [
    category.name.toLowerCase(),
    ...category.searchKeywords,
    ...category.synonyms,
  ];
}

/**
 * Get related categories
 */
export function getRelatedCategories(id: KnowledgeCategory): CategoryDefinition[] {
  const category = CATEGORY_DEFINITIONS[id];
  if (!category) return [];

  return category.relatedCategories
    .map(relId => CATEGORY_DEFINITIONS[relId])
    .filter(Boolean) as CategoryDefinition[];
}

// ============ EXPORTS ============

export const ALL_CATEGORIES = Object.keys(CATEGORY_DEFINITIONS) as KnowledgeCategory[];

export const CATEGORY_COUNT = ALL_CATEGORIES.length;

export default {
  definitions: CATEGORY_DEFINITIONS,
  groups: CATEGORY_GROUPS,
  allCategories: ALL_CATEGORIES,
  getCategoriesByGroup,
  getCategoryById,
  getVIPCategories,
  getActiveCategoriesByPriority,
  findCategoriesForQuery,
  getAllKeywordsForCategory,
  getRelatedCategories,
};
