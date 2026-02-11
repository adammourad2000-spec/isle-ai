/**
 * The Bahamas Configuration
 * Custom branding and settings for Bahamas tourism
 */

import type { ChatbotConfig } from '../../../types/chatbot';

const bahamasConfig: ChatbotConfig = {
  island: {
    name: 'The Bahamas',
    country: 'Commonwealth of The Bahamas',
    defaultCenter: { lat: 25.0343, lng: -77.3963 }, // Nassau
    defaultZoom: 10,
    bounds: {
      north: 27.5,
      south: 20.9,
      east: -72.7,
      west: -80.5
    }
  },
  welcomeMessage: {
    title: 'Welcome to The Bahamas!',
    subtitle: '700 islands of paradise await you. From the famous swimming pigs to pristine beaches and world-class resorts, let me help you discover your perfect Bahamian adventure.',
    suggestedPrompts: [
      'Where can I swim with the pigs?',
      'Find me a luxury resort in Nassau',
      'What are the best beaches in the Exumas?',
      'Plan a romantic trip to Harbour Island',
      'Show me the best snorkeling spots',
      'I want to visit Atlantis Paradise Island'
    ]
  },
  ai: {
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: `You are Isle AI, an expert travel concierge for The Bahamas. You have deep knowledge of:
- All 700 islands and cays, from Nassau to the Out Islands
- Luxury resorts including Atlantis, Baha Mar, and boutique properties
- Famous experiences: swimming pigs, shark diving, blue holes
- Pristine beaches: Pink Sands Beach, Cabbage Beach, Treasure Cay
- Local Bahamian culture, Junkanoo, and cuisine
- VIP services: yacht charters, private island rentals, fishing expeditions

Always be helpful, warm, and knowledgeable. When recommending places, include specific details like which island, how to get there, price range, and what makes each place special.

For luxury travelers, highlight exclusive experiences like private island stays and yacht adventures. For families, focus on kid-friendly resorts and activities. For adventure seekers, suggest diving, fishing, and island hopping.

Always suggest related islands or activities when relevant. If asked about booking, provide direct links when available.`
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
    primaryColor: '#00A9CE', // Aquamarine/turquoise (Bahamas flag)
    secondaryColor: '#FFC72C', // Gold (Bahamas flag)
    accentColor: '#00CED1', // Dark turquoise
    logoUrl: '/logo-bahamas.svg',
    faviconUrl: '/favicon-bahamas.ico',
    disclaimerText: 'Isle AI can make mistakes. Please verify important details directly with providers.',
    contactEmail: 'concierge@isleai.com'
  },
  seo: {
    title: 'Isle AI - Your Bahamas Travel Concierge',
    description: 'Discover the best of The Bahamas with AI-powered travel recommendations. Find resorts, beaches, swimming pigs, and island adventures.',
    keywords: ['bahamas', 'nassau', 'paradise island', 'exumas', 'swimming pigs', 'caribbean', 'atlantis', 'harbour island']
  }
};

export default bahamasConfig;
