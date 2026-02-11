/**
 * The Bahamas Knowledge Base
 * Places, attractions, and services for AI-powered recommendations
 */

import type { KnowledgeNode, Guide } from '../../../types/chatbot';

export const KNOWLEDGE_BASE: KnowledgeNode[] = [
  // ============ LUXURY RESORTS ============
  {
    id: 'bahamas-atlantis',
    name: 'Atlantis Paradise Island',
    category: 'hotel',
    description: 'The iconic Atlantis resort spans 141 acres on Paradise Island, featuring the world\'s largest open-air marine habitat, Aquaventure water park with over 20 swimming areas and waterslides, a casino, golf course, and 11 pools. The resort offers multiple accommodation options from the Beach Tower to the ultra-luxurious The Cove and The Reef residences.',
    shortDescription: 'Iconic mega-resort with marine habitats, water park & casino',
    location: {
      address: '1 Casino Drive, Paradise Island',
      district: 'Paradise Island',
      island: 'New Providence',
      latitude: 25.0867,
      longitude: -77.3189
    },
    business: {
      priceRange: '$$$$',
      priceFrom: 350,
      currency: 'USD'
    },
    ratings: {
      overall: 4.5,
      reviewCount: 28500
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400',
      images: []
    },
    contact: {
      phone: '+1 242-363-3000',
      website: 'https://www.atlantisbahamas.com',
      bookingUrl: 'https://www.atlantisbahamas.com/accommodations'
    },
    hours: {
      display: 'Open 24 hours'
    },
    tags: ['luxury', 'resort', 'water park', 'casino', 'aquarium', 'family-friendly', 'paradise island'],
    embeddingText: 'Atlantis Paradise Island luxury resort water park casino aquarium marine habitat family',
    isFeatured: true
  },
  {
    id: 'bahamas-baha-mar',
    name: 'Baha Mar Resort',
    category: 'hotel',
    description: 'Baha Mar is a stunning $4.2 billion resort destination on Cable Beach featuring three world-class hotels: Grand Hyatt, SLS, and Rosewood. The complex includes the Caribbean\'s largest casino, an 18-hole Jack Nicklaus golf course, ESPA spa, and over 40 restaurants and lounges.',
    shortDescription: 'Luxury mega-resort with 3 hotels, casino & Jack Nicklaus golf',
    location: {
      address: 'West Bay Street, Cable Beach',
      district: 'Cable Beach',
      island: 'New Providence',
      latitude: 25.0719,
      longitude: -77.4217
    },
    business: {
      priceRange: '$$$$$',
      priceFrom: 450,
      currency: 'USD'
    },
    ratings: {
      overall: 4.7,
      reviewCount: 15200
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400',
      images: []
    },
    contact: {
      phone: '+1 242-788-8000',
      website: 'https://www.bahamar.com',
      bookingUrl: 'https://www.bahamar.com/book'
    },
    hours: {
      display: 'Open 24 hours'
    },
    tags: ['luxury', 'resort', 'casino', 'golf', 'spa', 'cable beach', 'fine dining'],
    embeddingText: 'Baha Mar luxury resort casino golf spa Grand Hyatt SLS Rosewood Cable Beach',
    isFeatured: true
  },
  {
    id: 'bahamas-ocean-club',
    name: 'The Ocean Club, A Four Seasons Resort',
    category: 'hotel',
    description: 'This legendary resort on Paradise Island offers refined luxury across 35 acres of manicured Versailles-inspired gardens. Originally the private estate of A&P heir Huntington Hartford, it features a world-class spa, Dune restaurant by Jean-Georges Vongerichten, and pristine beach access.',
    shortDescription: 'Legendary Four Seasons resort with Versailles gardens',
    location: {
      address: 'Ocean Club Drive, Paradise Island',
      district: 'Paradise Island',
      island: 'New Providence',
      latitude: 25.0902,
      longitude: -77.3081
    },
    business: {
      priceRange: '$$$$$',
      priceFrom: 800,
      currency: 'USD'
    },
    ratings: {
      overall: 4.9,
      reviewCount: 3200
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
      images: []
    },
    contact: {
      phone: '+1 242-363-2501',
      website: 'https://www.fourseasons.com/oceanclub/',
      bookingUrl: 'https://www.fourseasons.com/oceanclub/accommodations/'
    },
    hours: {
      display: 'Open 24 hours'
    },
    tags: ['luxury', 'four seasons', 'romantic', 'spa', 'fine dining', 'paradise island', 'celebrity'],
    embeddingText: 'Ocean Club Four Seasons luxury romantic honeymoon spa Jean-Georges Paradise Island',
    isFeatured: true
  },
  {
    id: 'bahamas-sandals-royal',
    name: 'Sandals Royal Bahamian',
    category: 'hotel',
    description: 'This adults-only, all-inclusive luxury resort on Cable Beach features European-style architecture, a private offshore island, 10 restaurants, unlimited premium drinks, and butler service in top suites. Perfect for couples and honeymooners seeking romance in paradise.',
    shortDescription: 'Adults-only all-inclusive with private offshore island',
    location: {
      address: 'West Bay Street, Cable Beach',
      district: 'Cable Beach',
      island: 'New Providence',
      latitude: 25.0735,
      longitude: -77.4089
    },
    business: {
      priceRange: '$$$$',
      priceFrom: 550,
      currency: 'USD'
    },
    ratings: {
      overall: 4.6,
      reviewCount: 8900
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400',
      images: []
    },
    contact: {
      phone: '+1 242-327-6400',
      website: 'https://www.sandals.com/royal-bahamian/',
      bookingUrl: 'https://www.sandals.com/royal-bahamian/'
    },
    hours: {
      display: 'Open 24 hours'
    },
    tags: ['all-inclusive', 'adults-only', 'romantic', 'honeymoon', 'butler service', 'private island'],
    embeddingText: 'Sandals Royal Bahamian all-inclusive adults only honeymoon romantic couples',
    isFeatured: true
  },
  {
    id: 'bahamas-pink-sands',
    name: 'Pink Sands Resort',
    category: 'hotel',
    description: 'This boutique resort on Harbour Island sits on the famous 3-mile Pink Sands Beach. The 25 cottage-style accommodations offer barefoot luxury with world-class dining, spa services, and the charming atmosphere of historic Dunmore Town just steps away.',
    shortDescription: 'Boutique resort on famous pink sand beach',
    location: {
      address: 'Chapel Street, Harbour Island',
      district: 'Dunmore Town',
      island: 'Harbour Island',
      latitude: 25.5023,
      longitude: -76.6347
    },
    business: {
      priceRange: '$$$$$',
      priceFrom: 650,
      currency: 'USD'
    },
    ratings: {
      overall: 4.8,
      reviewCount: 1850
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
      images: []
    },
    contact: {
      phone: '+1 242-333-2030',
      website: 'https://www.pinksandsresort.com',
      bookingUrl: 'https://www.pinksandsresort.com/reservations'
    },
    hours: {
      display: 'Open 24 hours'
    },
    tags: ['boutique', 'pink sand', 'harbour island', 'romantic', 'beach', 'exclusive'],
    embeddingText: 'Pink Sands Resort Harbour Island boutique romantic pink beach exclusive',
    isFeatured: true
  },

  // ============ BEACHES ============
  {
    id: 'bahamas-pink-sands-beach',
    name: 'Pink Sands Beach',
    category: 'beach',
    description: 'One of the world\'s most beautiful beaches, Pink Sands Beach stretches 3 miles along Harbour Island\'s eastern shore. The distinctive pink hue comes from microscopic coral insects called Foraminifera. The beach offers calm, crystal-clear waters perfect for swimming and snorkeling.',
    shortDescription: 'World-famous 3-mile pink sand beach',
    location: {
      address: 'Eastern Shore, Harbour Island',
      district: 'Harbour Island',
      island: 'Harbour Island',
      latitude: 25.5056,
      longitude: -76.6278
    },
    business: {
      priceRange: '$',
      currency: 'USD'
    },
    ratings: {
      overall: 4.9,
      reviewCount: 12400
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400',
      images: []
    },
    contact: {},
    tags: ['pink sand', 'swimming', 'instagram', 'harbour island', 'romantic', 'snorkeling'],
    embeddingText: 'Pink Sands Beach Harbour Island pink sand romantic swimming snorkeling beautiful',
    isFeatured: true
  },
  {
    id: 'bahamas-cabbage-beach',
    name: 'Cabbage Beach',
    category: 'beach',
    description: 'Located on Paradise Island, Cabbage Beach offers 2 miles of pristine white sand and turquoise waters. Less crowded than nearby Atlantis beaches, it\'s perfect for a peaceful day of swimming, sunbathing, and water sports. Beach vendors offer jet skis and parasailing.',
    shortDescription: 'Pristine 2-mile beach on Paradise Island',
    location: {
      address: 'Paradise Island',
      district: 'Paradise Island',
      island: 'New Providence',
      latitude: 25.0889,
      longitude: -77.3122
    },
    business: {
      priceRange: '$',
      currency: 'USD'
    },
    ratings: {
      overall: 4.6,
      reviewCount: 8900
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=400',
      images: []
    },
    contact: {},
    tags: ['white sand', 'swimming', 'paradise island', 'jet ski', 'parasailing', 'water sports'],
    embeddingText: 'Cabbage Beach Paradise Island white sand swimming water sports jet ski',
    isFeatured: false
  },
  {
    id: 'bahamas-treasure-cay',
    name: 'Treasure Cay Beach',
    category: 'beach',
    description: 'Often ranked among the top 10 beaches in the world, Treasure Cay Beach in Abaco features 3.5 miles of powder-soft white sand and impossibly clear turquoise water. The beach is rarely crowded, offering a true escape to paradise.',
    shortDescription: 'World-ranked beach with powder-white sand',
    location: {
      address: 'Treasure Cay, Abaco',
      district: 'Treasure Cay',
      island: 'Great Abaco',
      latitude: 26.6678,
      longitude: -77.2881
    },
    business: {
      priceRange: '$',
      currency: 'USD'
    },
    ratings: {
      overall: 4.9,
      reviewCount: 4200
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=400',
      images: []
    },
    contact: {},
    tags: ['white sand', 'secluded', 'abaco', 'world-class', 'swimming', 'pristine'],
    embeddingText: 'Treasure Cay Beach Abaco white sand pristine secluded world best beach',
    isFeatured: true
  },

  // ============ ATTRACTIONS ============
  {
    id: 'bahamas-swimming-pigs',
    name: 'Swimming Pigs at Big Major Cay',
    category: 'attraction',
    description: 'The famous Swimming Pigs of the Exumas are a bucket-list experience! These friendly pigs swim out to greet visiting boats at Big Major Cay (Pig Beach). Various tour operators offer day trips from Nassau or Staniel Cay that include swimming with the pigs, snorkeling, and island hopping.',
    shortDescription: 'World-famous swimming pigs experience',
    location: {
      address: 'Big Major Cay',
      district: 'Exuma Cays',
      island: 'Big Major Cay',
      latitude: 24.1803,
      longitude: -76.4567
    },
    business: {
      priceRange: '$$$',
      priceFrom: 250,
      currency: 'USD'
    },
    ratings: {
      overall: 4.7,
      reviewCount: 18500
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1536852997322-72c8f0c3d5b3?w=400',
      images: []
    },
    contact: {
      website: 'https://www.bahamas.com/experiences/swimming-pigs'
    },
    tags: ['swimming pigs', 'exumas', 'bucket list', 'unique', 'boat tour', 'instagram'],
    embeddingText: 'Swimming Pigs Exumas Big Major Cay Pig Beach bucket list unique experience tour',
    isFeatured: true
  },
  {
    id: 'bahamas-thunderball-grotto',
    name: 'Thunderball Grotto',
    category: 'diving_snorkeling',
    description: 'This underwater cave system near Staniel Cay was featured in two James Bond films. Swim through the entrance at low tide to discover a magical underwater world filled with colorful fish. Light streams through holes in the ceiling creating an otherworldly atmosphere.',
    shortDescription: 'James Bond filming location underwater cave',
    location: {
      address: 'Near Staniel Cay',
      district: 'Exuma Cays',
      island: 'Staniel Cay',
      latitude: 24.1711,
      longitude: -76.4392
    },
    business: {
      priceRange: '$$',
      priceFrom: 80,
      currency: 'USD'
    },
    ratings: {
      overall: 4.8,
      reviewCount: 6700
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
      images: []
    },
    contact: {},
    tags: ['snorkeling', 'james bond', 'cave', 'exumas', 'underwater', 'unique'],
    embeddingText: 'Thunderball Grotto James Bond cave snorkeling Exumas Staniel Cay underwater',
    isFeatured: true
  },
  {
    id: 'bahamas-queens-staircase',
    name: 'Queen\'s Staircase',
    category: 'attraction',
    description: 'This historic landmark in Nassau features 66 steps carved out of solid limestone by slaves in the late 18th century. Named in honor of Queen Victoria\'s 66-year reign, it\'s a significant historical site and a peaceful escape in the heart of downtown Nassau.',
    shortDescription: 'Historic 66-step limestone staircase',
    location: {
      address: 'Elizabeth Avenue, Nassau',
      district: 'Downtown Nassau',
      island: 'New Providence',
      latitude: 25.0467,
      longitude: -77.3436
    },
    business: {
      priceRange: '$',
      currency: 'USD'
    },
    ratings: {
      overall: 4.3,
      reviewCount: 5400
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=400',
      images: []
    },
    contact: {},
    hours: {
      display: 'Open daily'
    },
    tags: ['historic', 'nassau', 'landmark', 'free', 'walking', 'photography'],
    embeddingText: 'Queens Staircase Nassau historic landmark free attraction photography',
    isFeatured: false
  },

  // ============ RESTAURANTS ============
  {
    id: 'bahamas-graycliff',
    name: 'Graycliff Restaurant',
    category: 'restaurant',
    description: 'Nassau\'s premier fine dining destination housed in a historic 18th-century mansion. The restaurant features classical European cuisine, an award-winning wine cellar with over 250,000 bottles, and the famous Graycliff cigar company. A true taste of old-world elegance.',
    shortDescription: 'Historic mansion with world-class wine cellar',
    location: {
      address: 'West Hill Street, Nassau',
      district: 'Downtown Nassau',
      island: 'New Providence',
      latitude: 25.0469,
      longitude: -77.3467
    },
    business: {
      priceRange: '$$$$',
      priceFrom: 150,
      currency: 'USD'
    },
    ratings: {
      overall: 4.7,
      reviewCount: 3100
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
      images: []
    },
    contact: {
      phone: '+1 242-302-9150',
      website: 'https://www.graycliff.com',
      bookingUrl: 'https://www.graycliff.com/restaurant-reservations'
    },
    hours: {
      display: 'Dinner: 6:00 PM - 10:00 PM'
    },
    tags: ['fine dining', 'wine', 'historic', 'romantic', 'nassau', 'cigars'],
    embeddingText: 'Graycliff Restaurant Nassau fine dining wine cellar historic romantic European cuisine',
    isFeatured: true
  },
  {
    id: 'bahamas-fish-fry',
    name: 'Arawak Cay Fish Fry',
    category: 'restaurant',
    description: 'The authentic Bahamian experience! This collection of colorful shacks on Arawak Cay serves up fresh conch salad, cracked conch, fried fish, and sky juice. Twin Brothers and Oh Andros are local favorites. Come for the food, stay for the live music and Junkanoo atmosphere.',
    shortDescription: 'Authentic Bahamian seafood shacks',
    location: {
      address: 'Arawak Cay, Nassau',
      district: 'Arawak Cay',
      island: 'New Providence',
      latitude: 25.0842,
      longitude: -77.3597
    },
    business: {
      priceRange: '$',
      priceFrom: 15,
      currency: 'USD'
    },
    ratings: {
      overall: 4.5,
      reviewCount: 7200
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
      images: []
    },
    contact: {},
    hours: {
      display: 'Open daily 11:00 AM - late'
    },
    tags: ['local', 'seafood', 'conch', 'authentic', 'casual', 'music', 'budget'],
    embeddingText: 'Fish Fry Arawak Cay conch seafood local authentic Bahamian casual budget',
    isFeatured: true
  },
  {
    id: 'bahamas-nobu',
    name: 'Nobu at Atlantis',
    category: 'restaurant',
    description: 'Chef Nobu Matsuhisa\'s world-renowned Japanese-Peruvian fusion restaurant at Atlantis Paradise Island. Signature dishes include black cod miso, yellowtail sashimi with jalapeno, and rock shrimp tempura. Stunning modern design with views over the marina.',
    shortDescription: 'World-famous Japanese-Peruvian fusion',
    location: {
      address: 'Atlantis Paradise Island',
      district: 'Paradise Island',
      island: 'New Providence',
      latitude: 25.0856,
      longitude: -77.3189
    },
    business: {
      priceRange: '$$$$',
      priceFrom: 100,
      currency: 'USD'
    },
    ratings: {
      overall: 4.6,
      reviewCount: 2800
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=400',
      images: []
    },
    contact: {
      phone: '+1 242-363-3000',
      website: 'https://www.atlantisbahamas.com/dining/nobu',
      bookingUrl: 'https://www.opentable.com'
    },
    hours: {
      display: 'Dinner: 6:00 PM - 11:00 PM'
    },
    tags: ['japanese', 'sushi', 'fine dining', 'atlantis', 'celebrity chef', 'fusion'],
    embeddingText: 'Nobu Atlantis Japanese sushi fine dining celebrity chef Matsuhisa Paradise Island',
    isFeatured: true
  },
  {
    id: 'bahamas-dune',
    name: 'Dune by Jean-Georges',
    category: 'restaurant',
    description: 'Celebrity chef Jean-Georges Vongerichten\'s beachfront restaurant at the Ocean Club. The menu features Asian and French influences with fresh Bahamian ingredients. Dine with your toes in the sand as you watch the sunset over the Atlantic.',
    shortDescription: 'Jean-Georges beachfront fine dining',
    location: {
      address: 'The Ocean Club, Paradise Island',
      district: 'Paradise Island',
      island: 'New Providence',
      latitude: 25.0902,
      longitude: -77.3078
    },
    business: {
      priceRange: '$$$$',
      priceFrom: 120,
      currency: 'USD'
    },
    ratings: {
      overall: 4.8,
      reviewCount: 1950
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400',
      images: []
    },
    contact: {
      phone: '+1 242-363-2501',
      website: 'https://www.fourseasons.com/oceanclub/dining/',
      bookingUrl: 'https://www.opentable.com'
    },
    hours: {
      display: 'Breakfast, Lunch & Dinner'
    },
    tags: ['fine dining', 'beachfront', 'celebrity chef', 'romantic', 'sunset', 'ocean club'],
    embeddingText: 'Dune Jean-Georges Ocean Club beachfront fine dining romantic sunset Paradise Island',
    isFeatured: true
  },

  // ============ ACTIVITIES ============
  {
    id: 'bahamas-shark-diving',
    name: 'Stuart Cove\'s Shark Diving',
    category: 'diving_snorkeling',
    description: 'The premier shark diving operator in the Bahamas, offering close encounters with Caribbean reef sharks in a controlled environment. Options range from snorkeling to certified dive experiences. Featured in numerous documentaries and TV shows.',
    shortDescription: 'World-famous shark diving experiences',
    location: {
      address: 'South Ocean, Nassau',
      district: 'South Ocean',
      island: 'New Providence',
      latitude: 25.0031,
      longitude: -77.5192
    },
    business: {
      priceRange: '$$$',
      priceFrom: 170,
      currency: 'USD'
    },
    ratings: {
      overall: 4.7,
      reviewCount: 4100
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1560275619-4662e36fa65c?w=400',
      images: []
    },
    contact: {
      phone: '+1 242-362-4171',
      website: 'https://www.stuartcove.com',
      bookingUrl: 'https://www.stuartcove.com/scuba-diving/'
    },
    hours: {
      display: 'Daily departures'
    },
    tags: ['shark diving', 'scuba', 'adventure', 'unique', 'bucket list', 'snorkeling'],
    embeddingText: 'Stuart Cove shark diving scuba snorkeling adventure Nassau bucket list',
    isFeatured: true
  },
  {
    id: 'bahamas-exuma-tour',
    name: 'Exuma Day Trip from Nassau',
    category: 'boat_charter',
    description: 'Full-day powerboat excursion from Nassau to the stunning Exuma Cays. Visit the swimming pigs, Thunderball Grotto, nurse shark encounters, iguana island, and pristine sandbars. Includes lunch, drinks, and snorkeling gear. The ultimate Bahamas adventure.',
    shortDescription: 'Full-day adventure to swimming pigs & more',
    location: {
      address: 'Departs from Nassau',
      district: 'Nassau',
      island: 'New Providence',
      latitude: 25.0478,
      longitude: -77.3553
    },
    business: {
      priceRange: '$$$',
      priceFrom: 295,
      currency: 'USD'
    },
    ratings: {
      overall: 4.8,
      reviewCount: 9800
    },
    media: {
      thumbnail: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=400',
      images: []
    },
    contact: {
      website: 'https://www.viator.com'
    },
    hours: {
      display: 'Daily 7:00 AM departure'
    },
    tags: ['exuma', 'day trip', 'swimming pigs', 'boat tour', 'snorkeling', 'all-inclusive'],
    embeddingText: 'Exuma day trip swimming pigs boat tour snorkeling Nassau adventure',
    isFeatured: true
  }
];

export const GUIDES: Guide[] = [
  {
    id: 'bahamas-first-time',
    title: 'First Time in The Bahamas',
    description: 'Essential tips and must-see attractions for your first Bahamas trip',
    thumbnail: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800',
    author: {
      id: 'system',
      name: 'Isle AI',
      isOfficial: true
    },
    destination: 'The Bahamas',
    duration: '5-7 days',
    placesCount: 4,
    places: ['bahamas-atlantis', 'bahamas-swimming-pigs', 'bahamas-pink-sands-beach', 'bahamas-fish-fry'],
    tags: ['first-time', 'highlights', 'must-see'],
    theme: 'adventure',
    saves: 2150,
    views: 18500,
    images: [
      'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1200',
      'https://images.unsplash.com/photo-1536852997322-72c8f0c3d5b3?w=1200'
    ],
    isFeature: true,
    createdAt: '2024-01-15'
  },
  {
    id: 'bahamas-luxury',
    title: 'Luxury Bahamas Experience',
    description: 'The most exclusive resorts, restaurants, and experiences',
    thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    author: {
      id: 'system',
      name: 'Isle AI',
      isOfficial: true
    },
    destination: 'The Bahamas',
    duration: '7-10 days',
    placesCount: 4,
    places: ['bahamas-ocean-club', 'bahamas-baha-mar', 'bahamas-graycliff', 'bahamas-dune'],
    tags: ['luxury', 'exclusive', 'vip', 'fine-dining'],
    theme: 'luxury',
    saves: 890,
    views: 9200,
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200'
    ],
    isFeature: true,
    createdAt: '2024-01-15'
  },
  {
    id: 'bahamas-adventure',
    title: 'Adventure & Wildlife',
    description: 'Swimming pigs, shark diving, and underwater caves',
    thumbnail: 'https://images.unsplash.com/photo-1560275619-4662e36fa65c?w=800',
    author: {
      id: 'system',
      name: 'Isle AI',
      isOfficial: true
    },
    destination: 'Exuma Cays',
    duration: '4-5 days',
    placesCount: 4,
    places: ['bahamas-swimming-pigs', 'bahamas-thunderball-grotto', 'bahamas-shark-diving', 'bahamas-exuma-tour'],
    tags: ['adventure', 'wildlife', 'diving', 'bucket-list'],
    theme: 'adventure',
    saves: 3200,
    views: 28400,
    images: [
      'https://images.unsplash.com/photo-1560275619-4662e36fa65c?w=1200',
      'https://images.unsplash.com/photo-1536852997322-72c8f0c3d5b3?w=1200'
    ],
    isFeature: true,
    createdAt: '2024-01-15'
  }
];
