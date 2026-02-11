/**
 * Cayman Islands Configuration
 * EXACT COPY from data/cayman-islands-knowledge.ts (lines 11-68)
 * NO CHANGES - Just moved to organized location
 */

import type { ChatbotConfig } from '../../../types/chatbot';

const caymanConfig: ChatbotConfig = {
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
    secondaryColor: '#14B8A6',
    accentColor: '#06B6D4',
    logoUrl: '/logo-cayman.svg',
    faviconUrl: '/favicon.ico',
    disclaimerText: 'Isle AI can make mistakes. Please verify important details directly with providers.',
    contactEmail: 'concierge@isleai.com'
  },
  seo: {
    title: 'Isle AI - Your Cayman Islands Travel Concierge',
    description: 'Discover the best of Cayman Islands with AI-powered travel recommendations. Find hotels, restaurants, beaches, and activities.',
    keywords: ['cayman islands', 'travel', 'tourism', 'caribbean', 'vacation', 'diving', 'seven mile beach']
  }
};

export default caymanConfig;
