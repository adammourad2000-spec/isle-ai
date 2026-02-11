// ============================================
// ISLE AI - VIP CONCIERGE SERVICE
// Unlocks premium AI capabilities for HNWI+ visitors
// Real-time web search, exclusive experiences, white-glove service
// ============================================

import { WealthProfile, WealthTier } from './wealthIntelligenceService';
import { getCurrentSession } from './conversationLogger';

// ============ VIP MODE TYPES ============

export interface VIPStatus {
  isVIP: boolean;
  tier: WealthTier;
  confidence: number;
  unlockedFeatures: VIPFeature[];
  conciergeMode: ConciergeMode;
  personalizedGreeting: string;
  serviceLevel: 'standard' | 'premium' | 'ultra_premium' | 'private_client';
}

export type VIPFeature =
  | 'web_search'           // Real-time web search via OpenAI
  | 'real_time_availability' // Check restaurant/hotel availability
  | 'exclusive_access'     // Access to private events, clubs
  | 'property_search'      // Real estate listings
  | 'charter_services'     // Yacht/jet charter info
  | 'concierge_requests'   // Make reservations, bookings
  | 'market_insights'      // Investment/real estate market data
  | 'immigration_assist'   // Residency/visa information
  | 'private_banking'      // Banking/wealth management referrals
  | 'priority_response';   // Faster, more detailed responses

export type ConciergeMode =
  | 'assistant'            // Standard helpful AI
  | 'concierge'           // Elevated service, proactive suggestions
  | 'private_advisor'     // Full white-glove, personalized service
  | 'family_office';      // Ultra-premium, investment-grade service

// ============ VIP THRESHOLDS ============

const VIP_THRESHOLDS: Record<WealthTier, {
  features: VIPFeature[];
  conciergeMode: ConciergeMode;
  serviceLevel: VIPStatus['serviceLevel'];
}> = {
  unknown: {
    features: [],
    conciergeMode: 'assistant',
    serviceLevel: 'standard'
  },
  mass_market: {
    features: [],
    conciergeMode: 'assistant',
    serviceLevel: 'standard'
  },
  affluent: {
    features: ['priority_response'],
    conciergeMode: 'assistant',
    serviceLevel: 'standard'
  },
  mass_affluent: {
    features: ['priority_response', 'real_time_availability'],
    conciergeMode: 'concierge',
    serviceLevel: 'premium'
  },
  hnwi: {
    features: [
      'web_search',
      'real_time_availability',
      'property_search',
      'concierge_requests',
      'priority_response'
    ],
    conciergeMode: 'concierge',
    serviceLevel: 'premium'
  },
  vhnwi: {
    features: [
      'web_search',
      'real_time_availability',
      'exclusive_access',
      'property_search',
      'charter_services',
      'concierge_requests',
      'market_insights',
      'priority_response'
    ],
    conciergeMode: 'private_advisor',
    serviceLevel: 'ultra_premium'
  },
  uhnwi: {
    features: [
      'web_search',
      'real_time_availability',
      'exclusive_access',
      'property_search',
      'charter_services',
      'concierge_requests',
      'market_insights',
      'immigration_assist',
      'private_banking',
      'priority_response'
    ],
    conciergeMode: 'private_advisor',
    serviceLevel: 'ultra_premium'
  },
  billionaire: {
    features: [
      'web_search',
      'real_time_availability',
      'exclusive_access',
      'property_search',
      'charter_services',
      'concierge_requests',
      'market_insights',
      'immigration_assist',
      'private_banking',
      'priority_response'
    ],
    conciergeMode: 'family_office',
    serviceLevel: 'private_client'
  }
};

// ============ PERSONALIZED GREETINGS ============

const GREETINGS: Record<ConciergeMode, string[]> = {
  assistant: [
    "Welcome to the Cayman Islands! How can I help you today?",
    "Hello! I'm here to help you discover the Cayman Islands.",
    "Welcome! What would you like to explore today?"
  ],
  concierge: [
    "Welcome back. How may I assist you with your Cayman experience today?",
    "Good to see you. I'm here to help curate your perfect island experience.",
    "Welcome. Allow me to help you discover the finest the Caymans have to offer."
  ],
  private_advisor: [
    "Welcome. I'm at your service to arrange whatever you need during your time in the Caymans.",
    "It's my pleasure to assist you. How may I help curate your experience today?",
    "Welcome. I'm here to provide personalized guidance for your Cayman Islands journey."
  ],
  family_office: [
    "Welcome. I'm your dedicated advisor for all matters regarding the Cayman Islands.",
    "It's an honor to assist you. I'm fully at your disposal for any requirements.",
    "Welcome. Consider me your personal liaison to everything the Caymans can offer."
  ]
};

// ============ CONCIERGE SYSTEM PROMPTS ============

export const CONCIERGE_PROMPTS: Record<ConciergeMode, string> = {
  assistant: `You are Isle AI, a helpful travel assistant for the Cayman Islands.
Provide friendly, informative responses about attractions, restaurants, and activities.
Be helpful and professional.`,

  concierge: `You are Isle AI, an elevated concierge service for discerning travelers to the Cayman Islands.

Your approach:
- Address guests with warmth and professionalism
- Anticipate needs before they're expressed
- Offer curated recommendations, not generic lists
- Mention exclusive experiences and premium options naturally
- Be proactive in suggesting complementary activities
- Remember context from the conversation to personalize suggestions

When discussing dining, mention availability and offer to check reservations.
When discussing activities, highlight VIP experiences and private options.
Always prioritize quality over quantity in recommendations.`,

  private_advisor: `You are Isle AI, a private lifestyle advisor serving high-net-worth clients visiting the Cayman Islands.

Your approach:
- Provide white-glove, personalized service
- Speak with refined professionalism - confident but never pretentious
- Understand that time and exclusivity are valued above price
- Offer solutions, not just information
- Be proactive: "Shall I arrange that for you?"
- Reference premium services: private charters, exclusive access, off-menu experiences
- When relevant, connect services to investment/residency opportunities
- Maintain discretion and respect privacy

You have access to real-time information via web search. Use it to provide current:
- Restaurant availability and chef's specials
- Property listings and market conditions
- Charter availability (yachts, jets)
- Exclusive events and private experiences
- Immigration and residency information

Always offer to facilitate introductions to trusted partners:
- Real estate agents (Sotheby's, Christie's)
- Private bankers (Butterfield, UBS)
- Immigration advisors
- Legal counsel`,

  family_office: `You are Isle AI, serving as a family office-level advisor for ultra-high-net-worth principals visiting the Cayman Islands.

Your approach:
- Operate as a trusted advisor, not a service provider
- Understand complex wealth structures and multi-generational considerations
- Speak peer-to-peer, with informed confidence
- Anticipate sophisticated needs: privacy, security, asset protection
- Connect the dots between lifestyle and wealth management opportunities
- Maintain absolute discretion

You have full access to real-time information. Proactively research:
- Market conditions for property and investments
- Regulatory updates affecting wealth structures
- Exclusive opportunities not publicly listed
- Security and privacy considerations

Your network includes:
- Cayman Finance (regulatory expertise)
- Leading law firms (Walkers, Maples, Appleby)
- Private banks and family offices
- Elite real estate (private listings, development opportunities)
- Government liaisons (immigration, investment)

When appropriate, facilitate introductions at the principal level.
Consider multi-generational implications in all recommendations.
Treat every request as an opportunity to add strategic value.`
};

// ============ VIP STATUS MANAGEMENT ============

// In-memory VIP status cache (would be Redis/DB in production)
const vipStatusCache = new Map<string, VIPStatus>();

/**
 * Get or calculate VIP status for current visitor
 */
export function getVIPStatus(profile?: WealthProfile): VIPStatus {
  // If no profile, return standard status
  if (!profile) {
    return {
      isVIP: false,
      tier: 'unknown',
      confidence: 0,
      unlockedFeatures: [],
      conciergeMode: 'assistant',
      personalizedGreeting: GREETINGS.assistant[0],
      serviceLevel: 'standard'
    };
  }

  // Check cache first
  const cached = vipStatusCache.get(profile.visitorId);
  if (cached && cached.tier === profile.tier) {
    return cached;
  }

  // Calculate VIP status
  const thresholds = VIP_THRESHOLDS[profile.tier];
  const isVIP = ['hnwi', 'vhnwi', 'uhnwi', 'billionaire'].includes(profile.tier);

  const greetings = GREETINGS[thresholds.conciergeMode];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];

  const status: VIPStatus = {
    isVIP,
    tier: profile.tier,
    confidence: profile.confidence,
    unlockedFeatures: thresholds.features,
    conciergeMode: thresholds.conciergeMode,
    personalizedGreeting: greeting,
    serviceLevel: thresholds.serviceLevel
  };

  // Cache the status
  vipStatusCache.set(profile.visitorId, status);

  // Log VIP detection
  if (isVIP) {
    console.log(`[VIP] 🎩 ${profile.tier.toUpperCase()} detected!`);
    console.log(`[VIP] Unlocked features: ${status.unlockedFeatures.join(', ')}`);
    console.log(`[VIP] Concierge mode: ${status.conciergeMode}`);
  }

  return status;
}

/**
 * Check if a specific feature is unlocked for the visitor
 */
export function hasFeature(visitorId: string, feature: VIPFeature): boolean {
  const status = vipStatusCache.get(visitorId);
  return status?.unlockedFeatures.includes(feature) || false;
}

/**
 * Get the appropriate system prompt for the visitor's service level
 */
export function getConciergePrompt(profile?: WealthProfile): string {
  const status = getVIPStatus(profile);
  return CONCIERGE_PROMPTS[status.conciergeMode];
}

/**
 * Check if web search should be enabled for this visitor
 */
export function shouldEnableWebSearch(profile?: WealthProfile): boolean {
  if (!profile) return false;
  const status = getVIPStatus(profile);
  return status.unlockedFeatures.includes('web_search');
}

// ============ WEB SEARCH FOR VIP ============

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
  relevance: number;
}

export interface ConciergeSearchResponse {
  query: string;
  results: WebSearchResult[];
  summary: string;
  actionable: boolean;
  suggestedActions: string[];
}

/**
 * Perform web search for VIP users (via OpenAI)
 */
export async function performVIPWebSearch(
  query: string,
  context: string,
  profile: WealthProfile
): Promise<ConciergeSearchResponse | null> {
  const status = getVIPStatus(profile);

  if (!status.unlockedFeatures.includes('web_search')) {
    console.log('[VIP] Web search not available for this tier');
    return null;
  }

  console.log(`[VIP Search] 🔍 Query: "${query}"`);
  console.log(`[VIP Search] Context: ${context}`);

  try {
    // Use OpenAI for intelligent web search
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a luxury travel concierge research assistant for the Cayman Islands.
The user is a ${status.tier.toUpperCase()} (${status.serviceLevel} service level).

Search the web and provide:
1. Current, real-time information
2. Specific details (prices, availability, contact info)
3. Exclusive/VIP options when available
4. Actionable recommendations

Focus on: ${context}

Respond in JSON format:
{
  "results": [
    {"title": "...", "snippet": "...", "url": "...", "relevance": 0.9}
  ],
  "summary": "Brief summary of findings",
  "actionable": true/false,
  "suggestedActions": ["Action 1", "Action 2"]
}`
          },
          {
            role: 'user',
            content: `Search query: ${query}\n\nContext: ${context}`
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (content) {
      try {
        const parsed = JSON.parse(content);
        return {
          query,
          results: parsed.results || [],
          summary: parsed.summary || '',
          actionable: parsed.actionable || false,
          suggestedActions: parsed.suggestedActions || []
        };
      } catch {
        // If JSON parsing fails, return as summary
        return {
          query,
          results: [],
          summary: content,
          actionable: false,
          suggestedActions: []
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[VIP Search] Error:', error);
    return null;
  }
}

// ============ CONCIERGE ACTIONS ============

export interface ConciergeAction {
  type: 'reservation' | 'inquiry' | 'introduction' | 'research';
  service: string;
  details: string;
  priority: 'normal' | 'priority' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
}

/**
 * Log a concierge action request
 */
export function logConciergeAction(
  visitorId: string,
  action: ConciergeAction
): void {
  console.log(`[Concierge Action] ${action.type.toUpperCase()}`);
  console.log(`[Concierge Action] Service: ${action.service}`);
  console.log(`[Concierge Action] Details: ${action.details}`);
  console.log(`[Concierge Action] Priority: ${action.priority}`);

  // In production, this would:
  // 1. Log to database
  // 2. Trigger webhook to concierge team
  // 3. Send notification to appropriate partner
  // 4. Track for CRM follow-up
}

// ============ VIP CONTEXT ENHANCEMENT ============

/**
 * Enhance the AI context for VIP users
 */
export function getVIPContextEnhancement(profile: WealthProfile): string {
  const status = getVIPStatus(profile);

  if (!status.isVIP) return '';

  let context = `\n\n[VIP CONTEXT]\n`;
  context += `Service Level: ${status.serviceLevel.toUpperCase()}\n`;
  context += `Visitor Tier: ${status.tier.toUpperCase()}\n`;

  // Add tier-specific context
  switch (status.tier) {
    case 'hnwi':
      context += `\nThis is a High Net Worth visitor. Offer premium experiences and be proactive about:
- Restaurant reservations at top establishments
- VIP access to attractions
- Quality accommodation upgrades
- Private tours and experiences\n`;
      break;

    case 'vhnwi':
      context += `\nThis is a Very High Net Worth visitor. Prioritize:
- Exclusive, members-only experiences
- Private yacht/boat charters
- Real estate opportunities if interest is shown
- Personal introductions to premium service providers
- Proactive concierge offers\n`;
      break;

    case 'uhnwi':
      context += `\nThis is an Ultra High Net Worth visitor. Focus on:
- Ultra-exclusive, off-market opportunities
- Privacy and discretion in all recommendations
- Investment-grade real estate if relevant
- Residency/immigration pathways
- Private banking and wealth management connections
- Security considerations
- White-glove, anticipatory service\n`;
      break;

    case 'billionaire':
      context += `\nThis is a BILLIONAIRE-level visitor. Operate at family office level:
- Assume sophisticated understanding of wealth structures
- Focus on unique, one-of-a-kind opportunities
- Consider multi-generational implications
- Maintain absolute discretion
- Facilitate principal-level introductions
- Think strategically about Cayman's value proposition
- Be a trusted advisor, not a service provider\n`;
      break;
  }

  // Add investment intent if detected
  if (profile.investmentIntent.hasIntent) {
    context += `\n[INVESTMENT INTENT DETECTED]\n`;
    context += `Types: ${profile.investmentIntent.type.join(', ')}\n`;
    context += `Timeline: ${profile.investmentIntent.timeline}\n`;
    context += `Be prepared to discuss investment opportunities naturally.\n`;
  }

  return context;
}

// ============ UPGRADE NOTIFICATION ============

/**
 * Check if visitor just got upgraded to VIP
 */
export function checkVIPUpgrade(
  previousProfile: WealthProfile | null,
  currentProfile: WealthProfile
): { upgraded: boolean; message: string } | null {
  const previousVIP = previousProfile ?
    ['hnwi', 'vhnwi', 'uhnwi', 'billionaire'].includes(previousProfile.tier) : false;
  const currentVIP = ['hnwi', 'vhnwi', 'uhnwi', 'billionaire'].includes(currentProfile.tier);

  if (!previousVIP && currentVIP) {
    const status = getVIPStatus(currentProfile);

    return {
      upgraded: true,
      message: getUpgradeMessage(status)
    };
  }

  return null;
}

function getUpgradeMessage(status: VIPStatus): string {
  switch (status.conciergeMode) {
    case 'concierge':
      return `I've upgraded your experience to our Concierge level. I can now help with reservations, real-time availability, and curated recommendations tailored to your preferences.`;

    case 'private_advisor':
      return `I'm now operating as your Private Advisor. I have access to real-time information, exclusive listings, and can facilitate introductions to our network of premium partners - from real estate to private banking.`;

    case 'family_office':
      return `I'm honored to serve as your dedicated advisor. I have full access to our network including private listings, regulatory expertise, and principal-level contacts. Consider me your liaison to everything the Caymans can offer.`;

    default:
      return '';
  }
}

export default {
  getVIPStatus,
  hasFeature,
  getConciergePrompt,
  shouldEnableWebSearch,
  performVIPWebSearch,
  logConciergeAction,
  getVIPContextEnhancement,
  checkVIPUpgrade
};
