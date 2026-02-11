import { Destination, DestinationStatus, UserRole, User, Journey } from './types';

export const MOCK_USER: User = {
  id: 'u1',
  name: 'Marco Silva',
  email: 'marco.silva@email.com',
  role: UserRole.EXPLORER,
  nationality: 'Portugal',
  savedDestinations: ['d1'],
  completedJourneys: [],
  explorerLevel: 1,
  totalPointsEarned: 0,
  badges: []
};

// Island Zones
export const ISLAND_ZONES = [
  'North Coast',
  'South Coast',
  'East Coast',
  'West Coast',
  'Central Highlands',
  'Capital District',
  'Historic Quarter'
];

// Destination Categories
export const DESTINATION_CATEGORIES = [
  'Beach',
  'Nature',
  'Culture',
  'Adventure',
  'Gastronomy',
  'Nightlife',
  'Historical'
];

// Sample Destinations for a Caribbean Island
export const MOCK_DESTINATIONS: Destination[] = [
  // === BEACHES ===
  {
    id: 'd1',
    title: 'Coral Paradise Beach',
    description: 'Crystal-clear turquoise waters and pristine white sand. Perfect for snorkeling with sea turtles.',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop',
    category: 'Beach',
    zone: 'West Coast',
    totalDuration: '2-4 hours',
    status: DestinationStatus.NOT_VISITED,
    progress: 0,
    visitCount: 12400,
    rating: 4.9,
    reviewCount: 856,
    priceRange: '$',
    isFree: true,
    openingHours: 'Open 24/7',
    activities: [
      { id: 'd1-a1', title: 'Beach Overview', type: 'video', durationMin: 3, isCompleted: false, insiderTip: 'Arrive before 9am for the best spots' },
      { id: 'd1-a2', title: 'Snorkeling Spots Guide', type: 'info', durationMin: 5, isCompleted: false, bestTimeToVisit: 'Morning, 8am-11am' },
      { id: 'd1-a3', title: '360° Beach View', type: 'panorama', durationMin: 2, isCompleted: false },
      { id: 'd1-a4', title: 'Beach Trivia Challenge', type: 'challenge', durationMin: 5, challenge: [
        { id: 'd1-q1', question: 'What type of turtles can you see here?', options: ['Hawksbill turtles', 'Loggerhead turtles', 'Leatherback turtles'], correctAnswer: 0, funFact: 'Hawksbill turtles are critically endangered and this beach is one of their nesting sites!' }
      ], isCompleted: false }
    ]
  },
  {
    id: 'd2',
    title: 'Hidden Cove Bay',
    description: 'A secluded beach accessible only by boat or hiking trail. Untouched natural beauty.',
    thumbnail: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=2070&auto=format&fit=crop',
    category: 'Beach',
    zone: 'North Coast',
    totalDuration: '3-5 hours',
    status: DestinationStatus.NOT_VISITED,
    progress: 0,
    visitCount: 3200,
    rating: 4.8,
    reviewCount: 234,
    priceRange: '$$',
    activities: [
      { id: 'd2-a1', title: 'Getting There', type: 'video', durationMin: 4, isCompleted: false },
      { id: 'd2-a2', title: 'Trail Guide', type: 'info', durationMin: 8, isCompleted: false },
      { id: 'd2-a3', title: 'Hidden Cove Gallery', type: 'gallery', durationMin: 3, isCompleted: false }
    ]
  },

  // === NATURE ===
  {
    id: 'd3',
    title: 'Rainforest Canopy Walk',
    description: 'Walk among the treetops on suspended bridges. Spot exotic birds and wildlife.',
    thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2070&auto=format&fit=crop',
    category: 'Nature',
    zone: 'Central Highlands',
    totalDuration: '2-3 hours',
    status: DestinationStatus.NOT_VISITED,
    progress: 0,
    visitCount: 8900,
    rating: 4.7,
    reviewCount: 567,
    priceRange: '$$',
    openingHours: '7:00 AM - 5:00 PM',
    activities: [
      { id: 'd3-a1', title: 'Canopy Experience', type: 'video', durationMin: 5, isCompleted: false },
      { id: 'd3-a2', title: 'Wildlife Spotting Guide', type: 'info', durationMin: 10, isCompleted: false },
      { id: 'd3-a3', title: 'Bird Species Challenge', type: 'challenge', durationMin: 5, challenge: [
        { id: 'd3-q1', question: 'Which colorful bird is native to this rainforest?', options: ['Bananaquit', 'Penguin', 'Flamingo'], correctAnswer: 0, funFact: 'The Bananaquit is also called the "sugar bird" because it loves nectar!' }
      ], isCompleted: false }
    ]
  },
  {
    id: 'd4',
    title: 'Volcanic Hot Springs',
    description: 'Natural thermal pools heated by volcanic activity. Healing mineral-rich waters.',
    thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=2070&auto=format&fit=crop',
    category: 'Nature',
    zone: 'Central Highlands',
    totalDuration: '2-4 hours',
    status: DestinationStatus.NOT_VISITED,
    progress: 0,
    visitCount: 6700,
    rating: 4.6,
    reviewCount: 445,
    priceRange: '$$',
    openingHours: '9:00 AM - 8:00 PM',
    activities: [
      { id: 'd4-a1', title: 'Hot Springs Tour', type: 'video', durationMin: 4, isCompleted: false },
      { id: 'd4-a2', title: 'Health Benefits', type: 'info', durationMin: 5, isCompleted: false }
    ]
  },

  // === CULTURE ===
  {
    id: 'd5',
    title: 'Heritage Village Museum',
    description: 'Step back in time and discover the island\'s rich history, traditions, and cultural heritage.',
    thumbnail: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=2080&auto=format&fit=crop',
    category: 'Culture',
    zone: 'Historic Quarter',
    totalDuration: '2-3 hours',
    status: DestinationStatus.NOT_VISITED,
    progress: 0,
    visitCount: 5400,
    rating: 4.8,
    reviewCount: 389,
    priceRange: '$',
    openingHours: '10:00 AM - 6:00 PM (Closed Mondays)',
    activities: [
      { id: 'd5-a1', title: 'Museum Virtual Tour', type: 'video', durationMin: 8, isCompleted: false },
      { id: 'd5-a2', title: 'Island History Timeline', type: 'info', durationMin: 15, isCompleted: false },
      { id: 'd5-a3', title: 'Traditional Crafts Gallery', type: 'gallery', durationMin: 5, isCompleted: false },
      { id: 'd5-a4', title: 'History Challenge', type: 'challenge', durationMin: 8, challenge: [
        { id: 'd5-q1', question: 'When was the island first settled?', options: ['1627', '1492', '1776'], correctAnswer: 0 },
        { id: 'd5-q2', question: 'What was the main crop during colonial times?', options: ['Sugar cane', 'Tobacco', 'Cotton'], correctAnswer: 0, funFact: 'Sugar was so valuable it was called "white gold"!' }
      ], isCompleted: false }
    ]
  },
  {
    id: 'd6',
    title: 'Local Market Experience',
    description: 'Immerse yourself in local life. Fresh produce, spices, crafts, and authentic street food.',
    thumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2074&auto=format&fit=crop',
    category: 'Culture',
    zone: 'Capital District',
    totalDuration: '1-3 hours',
    status: DestinationStatus.NOT_VISITED,
    progress: 0,
    visitCount: 9800,
    rating: 4.5,
    reviewCount: 712,
    priceRange: '$',
    openingHours: '6:00 AM - 2:00 PM (Sat only full day)',
    activities: [
      { id: 'd6-a1', title: 'Market Walkthrough', type: 'video', durationMin: 6, isCompleted: false },
      { id: 'd6-a2', title: 'Must-Try Foods Guide', type: 'info', durationMin: 8, isCompleted: false },
      { id: 'd6-a3', title: 'Haggling Tips', type: 'info', durationMin: 3, isCompleted: false }
    ]
  },

  // === ADVENTURE ===
  {
    id: 'd7',
    title: 'Cliff Diving Point',
    description: 'Adrenaline rush guaranteed! Jump from natural rock formations into crystal-clear pools.',
    thumbnail: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?q=80&w=2071&auto=format&fit=crop',
    category: 'Adventure',
    zone: 'East Coast',
    totalDuration: '2-4 hours',
    status: DestinationStatus.NOT_VISITED,
    progress: 0,
    visitCount: 4500,
    rating: 4.9,
    reviewCount: 298,
    priceRange: '$',
    isFree: true,
    activities: [
      { id: 'd7-a1', title: 'Safety Briefing', type: 'video', durationMin: 5, isCompleted: false },
      { id: 'd7-a2', title: 'Jump Levels Guide', type: 'info', durationMin: 4, isCompleted: false },
      { id: 'd7-a3', title: 'Epic Jumps Gallery', type: 'gallery', durationMin: 3, isCompleted: false }
    ]
  },
  {
    id: 'd8',
    title: 'Underwater Cave Diving',
    description: 'Explore mysterious underwater caves with bioluminescent organisms. Certified divers only.',
    thumbnail: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?q=80&w=2070&auto=format&fit=crop',
    category: 'Adventure',
    zone: 'South Coast',
    totalDuration: '4-6 hours',
    status: DestinationStatus.NOT_VISITED,
    progress: 0,
    visitCount: 1200,
    rating: 5.0,
    reviewCount: 89,
    priceRange: '$$$$',
    activities: [
      { id: 'd8-a1', title: 'Cave System Overview', type: 'video', durationMin: 8, isCompleted: false },
      { id: 'd8-a2', title: 'What to Expect', type: 'info', durationMin: 10, isCompleted: false },
      { id: 'd8-a3', title: 'Bioluminescence Explained', type: 'info', durationMin: 5, isCompleted: false }
    ]
  },

  // === GASTRONOMY ===
  {
    id: 'd9',
    title: 'Rum Distillery Tour',
    description: 'Discover the art of rum-making. Tour the historic distillery and taste premium aged rums.',
    thumbnail: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?q=80&w=2071&auto=format&fit=crop',
    category: 'Gastronomy',
    zone: 'North Coast',
    totalDuration: '2-3 hours',
    status: DestinationStatus.NOT_VISITED,
    progress: 0,
    visitCount: 7600,
    rating: 4.7,
    reviewCount: 534,
    priceRange: '$$',
    openingHours: '10:00 AM - 4:00 PM',
    activities: [
      { id: 'd9-a1', title: 'Distillery Tour', type: 'video', durationMin: 10, isCompleted: false },
      { id: 'd9-a2', title: 'Rum History', type: 'info', durationMin: 8, isCompleted: false },
      { id: 'd9-a3', title: 'Tasting Guide', type: 'info', durationMin: 5, isCompleted: false },
      { id: 'd9-a4', title: 'Rum Expert Challenge', type: 'challenge', durationMin: 5, challenge: [
        { id: 'd9-q1', question: 'What gives dark rum its color?', options: ['Barrel aging', 'Added caramel', 'Molasses'], correctAnswer: 0, funFact: 'Premium rums can be aged for over 20 years!' }
      ], isCompleted: false }
    ]
  },
  {
    id: 'd10',
    title: 'Seafood Beach Restaurant Row',
    description: 'Fresh catch of the day prepared right on the beach. Multiple restaurants to choose from.',
    thumbnail: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop',
    category: 'Gastronomy',
    zone: 'West Coast',
    totalDuration: '2-3 hours',
    status: DestinationStatus.NOT_VISITED,
    progress: 0,
    visitCount: 11200,
    rating: 4.6,
    reviewCount: 823,
    priceRange: '$$',
    openingHours: '11:00 AM - 11:00 PM',
    activities: [
      { id: 'd10-a1', title: 'Restaurant Guide', type: 'video', durationMin: 5, isCompleted: false },
      { id: 'd10-a2', title: 'Must-Try Dishes', type: 'info', durationMin: 6, isCompleted: false }
    ]
  },

  // === HISTORICAL ===
  {
    id: 'd11',
    title: 'Colonial Fort & Garrison',
    description: 'UNESCO World Heritage Site. Explore 17th-century fortifications with panoramic ocean views.',
    thumbnail: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?q=80&w=2070&auto=format&fit=crop',
    category: 'Historical',
    zone: 'Historic Quarter',
    totalDuration: '2-3 hours',
    status: DestinationStatus.NOT_VISITED,
    progress: 0,
    visitCount: 6300,
    rating: 4.8,
    reviewCount: 467,
    priceRange: '$',
    openingHours: '9:00 AM - 5:00 PM',
    activities: [
      { id: 'd11-a1', title: 'Fort History', type: 'video', durationMin: 12, isCompleted: false },
      { id: 'd11-a2', title: 'Self-Guided Tour Map', type: 'info', durationMin: 5, isCompleted: false },
      { id: 'd11-a3', title: 'Cannon Deck 360°', type: 'panorama', durationMin: 3, isCompleted: false },
      { id: 'd11-a4', title: 'Military History Challenge', type: 'challenge', durationMin: 8, challenge: [
        { id: 'd11-q1', question: 'What was the fort built to protect against?', options: ['Pirates and invaders', 'Hurricanes', 'Wild animals'], correctAnswer: 0 }
      ], isCompleted: false }
    ]
  },
  {
    id: 'd12',
    title: 'Plantation Great House',
    description: 'Beautifully preserved 18th-century plantation. Learn about the complex history of sugar and slavery.',
    thumbnail: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2070&auto=format&fit=crop',
    category: 'Historical',
    zone: 'Central Highlands',
    totalDuration: '2-3 hours',
    status: DestinationStatus.NOT_VISITED,
    progress: 0,
    visitCount: 4800,
    rating: 4.7,
    reviewCount: 356,
    priceRange: '$$',
    openingHours: '10:00 AM - 4:00 PM',
    activities: [
      { id: 'd12-a1', title: 'House Tour', type: 'video', durationMin: 15, isCompleted: false },
      { id: 'd12-a2', title: 'Plantation History', type: 'info', durationMin: 12, isCompleted: false },
      { id: 'd12-a3', title: 'Garden Walk', type: 'gallery', durationMin: 5, isCompleted: false }
    ]
  }
];

// Curated Journeys (Itineraries)
export const MOCK_JOURNEYS: Journey[] = [
  {
    id: 'j1',
    title: 'Beach Lover\'s Paradise',
    description: 'The ultimate beach experience. Discover the island\'s most stunning coastal spots.',
    destinationIds: ['d1', 'd2', 'd10'],
    theme: 'Relaxation',
    estimatedDays: 2,
    difficulty: 'Easy'
  },
  {
    id: 'j2',
    title: 'Adventure Seeker',
    description: 'For thrill-seekers only. Cliff diving, cave exploration, and rainforest adventures.',
    destinationIds: ['d7', 'd8', 'd3'],
    theme: 'Adventure',
    estimatedDays: 3,
    difficulty: 'Challenging'
  },
  {
    id: 'j3',
    title: 'Cultural Immersion',
    description: 'Dive deep into local culture, history, and traditions.',
    destinationIds: ['d5', 'd6', 'd11', 'd12'],
    theme: 'Culture',
    estimatedDays: 2,
    difficulty: 'Easy'
  },
  {
    id: 'j4',
    title: 'Taste of the Island',
    description: 'A culinary journey through local flavors, from street food to fine dining.',
    destinationIds: ['d6', 'd9', 'd10'],
    theme: 'Relaxation',
    estimatedDays: 2,
    difficulty: 'Easy'
  },
  {
    id: 'j5',
    title: 'Complete Island Explorer',
    description: 'The ultimate island experience. Visit every corner and become a true explorer.',
    destinationIds: ['d1', 'd3', 'd5', 'd7', 'd9', 'd11'],
    theme: 'All',
    estimatedDays: 5,
    difficulty: 'Moderate'
  }
];

// Zone statistics for the exploration map
export const ZONE_STATS = [
  { name: 'North Coast', value: 85 },
  { name: 'South Coast', value: 62 },
  { name: 'East Coast', value: 45 },
  { name: 'West Coast', value: 92 },
  { name: 'Central Highlands', value: 58 },
  { name: 'Capital District', value: 78 },
  { name: 'Historic Quarter', value: 70 }
];

// Popular nationalities visiting
export const VISITOR_NATIONALITIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Germany',
  'France',
  'Brazil',
  'Netherlands',
  'Italy',
  'Spain',
  'Australia'
];

// ============ LEGACY COMPATIBILITY EXPORTS ============
// These maintain backwards compatibility with existing code that uses the Course model.
// The legacy Course model is automatically generated from the new Destination/Activity model.
// This ensures seamless compatibility while using the modern data structure internally.
//
// MIGRATION NOTE: When refactoring services/dataService.ts, replace MOCK_COURSES
// references with MOCK_DESTINATIONS to fully adopt the new model.

// Legacy Course type mapped from Destination
export const MOCK_COURSES = MOCK_DESTINATIONS.map(dest => ({
  id: dest.id,
  code: dest.id.toUpperCase(),
  title: dest.title,
  description: dest.description,
  thumbnail: dest.thumbnail,
  level: dest.category === 'Beach' ? 'Beginner' : dest.category === 'Adventure' ? 'Advanced' : 'Intermediate' as 'Beginner' | 'Intermediate' | 'Advanced',
  totalDuration: dest.totalDuration,
  lessons: dest.activities.map(act => ({
    id: act.id,
    title: act.title,
    type: act.type === 'challenge' ? 'quiz' : act.type === 'info' ? 'text' : 'video' as any,
    durationMin: act.durationMin,
    videoUrl: act.videoUrl,
    content: act.content,
    isCompleted: act.isCompleted || false,
    quiz: act.challenge?.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    }))
  })),
  progress: dest.progress,
  status: dest.status === 'NOT_VISITED' ? 'NOT_STARTED' : dest.status === 'EXPLORING' ? 'IN_PROGRESS' : 'COMPLETED',
  enrolledCount: dest.visitCount,
  rating: dest.rating,
  orderIndex: dest.orderIndex
}));

export const MOCK_PATHS = MOCK_JOURNEYS.map(journey => ({
  id: journey.id,
  title: journey.title,
  description: journey.description,
  courseIds: journey.destinationIds,
  role: 'ALL' as const
}));

export const MINISTRY_STATS = ZONE_STATS;
export const MINISTRIES = ISLAND_ZONES;
