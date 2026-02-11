/**
 * Context Tracker Service
 * Tracks conversation context, user interests, and geographic focus
 * Builds context embeddings for intelligent map point selection
 *
 * Features:
 * - Interest tracking with decay over time
 * - Geographic focus detection
 * - Interest prediction based on category transitions
 * - Context embedding generation
 */

import { generateQueryEmbedding, generateCombinedEmbedding } from './embeddingLoader';
import type { KnowledgeCategory } from '../types/chatbot';

// Types
export interface GeographicFocus {
  district?: string;
  island?: string;
  coordinates?: { lat: number; lng: number };
  radius?: number; // km
}

export interface ConversationContext {
  // Current semantic embedding
  currentEmbedding: Float32Array | null;

  // Interest scores by category (0-1)
  interestScores: Map<KnowledgeCategory, number>;

  // Geographic focus
  geographicFocus: GeographicFocus | null;

  // Recently mentioned/shown place IDs (for diversity)
  recentPlaceIds: string[];

  // Predicted next interests
  predictedInterests: KnowledgeCategory[];

  // Session metadata
  messageCount: number;
  lastQuery: string;
  lastUpdated: Date;
}

// Configuration
const INTEREST_DECAY = 0.8; // Decay factor per message
const MAX_RECENT_PLACES = 30;
const MIN_INTEREST_THRESHOLD = 0.05;

// Known locations in Cayman Islands with coordinates
const KNOWN_LOCATIONS: Record<string, GeographicFocus> = {
  'seven mile beach': {
    district: 'Seven Mile Beach',
    island: 'Grand Cayman',
    coordinates: { lat: 19.335, lng: -81.385 },
    radius: 3
  },
  'george town': {
    district: 'George Town',
    island: 'Grand Cayman',
    coordinates: { lat: 19.295, lng: -81.381 },
    radius: 2
  },
  'georgetown': {
    district: 'George Town',
    island: 'Grand Cayman',
    coordinates: { lat: 19.295, lng: -81.381 },
    radius: 2
  },
  'west bay': {
    district: 'West Bay',
    island: 'Grand Cayman',
    coordinates: { lat: 19.375, lng: -81.405 },
    radius: 3
  },
  'rum point': {
    district: 'Rum Point',
    island: 'Grand Cayman',
    coordinates: { lat: 19.365, lng: -81.260 },
    radius: 2
  },
  'camana bay': {
    district: 'Camana Bay',
    island: 'Grand Cayman',
    coordinates: { lat: 19.328, lng: -81.378 },
    radius: 1
  },
  'stingray city': {
    district: 'Stingray City',
    island: 'Grand Cayman',
    coordinates: { lat: 19.389, lng: -81.298 },
    radius: 1
  },
  'east end': {
    district: 'East End',
    island: 'Grand Cayman',
    coordinates: { lat: 19.300, lng: -81.100 },
    radius: 5
  },
  'north side': {
    district: 'North Side',
    island: 'Grand Cayman',
    coordinates: { lat: 19.350, lng: -81.150 },
    radius: 4
  },
  'bodden town': {
    district: 'Bodden Town',
    island: 'Grand Cayman',
    coordinates: { lat: 19.280, lng: -81.250 },
    radius: 4
  },
  'cayman brac': {
    island: 'Cayman Brac',
    coordinates: { lat: 19.720, lng: -79.800 },
    radius: 10
  },
  'little cayman': {
    island: 'Little Cayman',
    coordinates: { lat: 19.680, lng: -80.050 },
    radius: 8
  },
  'grand cayman': {
    island: 'Grand Cayman',
    coordinates: { lat: 19.313, lng: -81.255 },
    radius: 25
  },
  'airport': {
    district: 'Airport',
    island: 'Grand Cayman',
    coordinates: { lat: 19.293, lng: -81.358 },
    radius: 2
  },
  'downtown': {
    district: 'George Town',
    island: 'Grand Cayman',
    coordinates: { lat: 19.295, lng: -81.381 },
    radius: 2
  }
};

// Category transitions - what users typically look for next
const CATEGORY_TRANSITIONS: Partial<Record<KnowledgeCategory, KnowledgeCategory[]>> = {
  hotel: ['restaurant', 'spa_wellness', 'beach', 'activity', 'attraction'],
  villa_rental: ['restaurant', 'beach', 'activity', 'shopping'],
  restaurant: ['bar', 'attraction', 'shopping', 'beach'],
  beach: ['diving_snorkeling', 'water_sports', 'boat_charter', 'restaurant'],
  diving_snorkeling: ['beach', 'boat_charter', 'activity', 'restaurant'],
  water_sports: ['beach', 'diving_snorkeling', 'boat_charter'],
  boat_charter: ['diving_snorkeling', 'beach', 'restaurant', 'fishing'],
  activity: ['restaurant', 'beach', 'attraction', 'shopping'],
  attraction: ['restaurant', 'shopping', 'activity', 'beach'],
  bar: ['restaurant', 'nightlife', 'hotel'],
  nightlife: ['bar', 'restaurant', 'hotel'],
  spa_wellness: ['hotel', 'beach', 'restaurant'],
  shopping: ['restaurant', 'attraction', 'beach'],
  golf: ['restaurant', 'hotel', 'bar'],
  financial_services: ['real_estate', 'concierge'],
  real_estate: ['financial_services', 'concierge', 'villa_rental'],
  private_jet: ['concierge', 'transport', 'hotel'],
  concierge: ['private_jet', 'event', 'hotel', 'restaurant'],
  transport: ['hotel', 'airport', 'concierge']
};

// Category keywords for detection
const CATEGORY_KEYWORDS: Record<string, KnowledgeCategory[]> = {
  'beach': ['beach'],
  'beaches': ['beach'],
  'sand': ['beach'],
  'swimming': ['beach', 'water_sports'],
  'hotel': ['hotel'],
  'hotels': ['hotel'],
  'resort': ['hotel'],
  'resorts': ['hotel'],
  'stay': ['hotel', 'villa_rental'],
  'accommodation': ['hotel', 'villa_rental'],
  'villa': ['villa_rental'],
  'villas': ['villa_rental'],
  'rental': ['villa_rental'],
  'restaurant': ['restaurant'],
  'restaurants': ['restaurant'],
  'food': ['restaurant'],
  'eat': ['restaurant'],
  'eating': ['restaurant'],
  'dining': ['restaurant'],
  'dinner': ['restaurant'],
  'lunch': ['restaurant'],
  'breakfast': ['restaurant'],
  'brunch': ['restaurant'],
  'bar': ['bar'],
  'bars': ['bar'],
  'drinks': ['bar'],
  'cocktails': ['bar'],
  'nightlife': ['nightlife', 'bar'],
  'club': ['nightlife'],
  'diving': ['diving_snorkeling'],
  'dive': ['diving_snorkeling'],
  'snorkeling': ['diving_snorkeling'],
  'snorkel': ['diving_snorkeling'],
  'underwater': ['diving_snorkeling'],
  'scuba': ['diving_snorkeling'],
  'water sports': ['water_sports'],
  'kayak': ['water_sports'],
  'paddleboard': ['water_sports'],
  'jet ski': ['water_sports'],
  'boat': ['boat_charter'],
  'boats': ['boat_charter'],
  'yacht': ['boat_charter'],
  'charter': ['boat_charter'],
  'sailing': ['boat_charter'],
  'fishing': ['boat_charter', 'activity'],
  'tour': ['activity', 'attraction'],
  'tours': ['activity', 'attraction'],
  'activity': ['activity'],
  'activities': ['activity'],
  'things to do': ['activity', 'attraction'],
  'attraction': ['attraction'],
  'attractions': ['attraction'],
  'sightseeing': ['attraction'],
  'museum': ['attraction'],
  'spa': ['spa_wellness'],
  'wellness': ['spa_wellness'],
  'massage': ['spa_wellness'],
  'relax': ['spa_wellness', 'beach'],
  'shopping': ['shopping'],
  'shop': ['shopping'],
  'stores': ['shopping'],
  'golf': ['golf'],
  // Financial services - comprehensive detection
  'financial': ['financial_services'],
  'bank': ['financial_services'],
  'banking': ['financial_services'],
  'investment': ['financial_services'],
  'fund': ['financial_services'],
  'hedge fund': ['financial_services'],
  'asset management': ['financial_services'],
  'wealth management': ['financial_services'],
  'private equity': ['financial_services'],
  'fund administration': ['financial_services'],
  'custody': ['financial_services'],
  'fiduciary': ['financial_services'],
  'trust': ['financial_services'],
  'company formation': ['financial_services'],
  'incorporate': ['financial_services'],
  'cima': ['financial_services'],
  'offshore': ['financial_services'],
  'tax planning': ['financial_services'],
  'accounting': ['financial_services'],
  'audit': ['financial_services'],
  'compliance': ['financial_services'],
  'insurance': ['financial_services'],
  'captive insurance': ['financial_services'],
  'reinsurance': ['financial_services'],
  // Real estate - comprehensive detection
  'real estate': ['real_estate'],
  'property': ['real_estate'],
  'properties': ['real_estate'],
  'house': ['real_estate', 'villa_rental'],
  'condo': ['real_estate'],
  'condominium': ['real_estate'],
  'apartment': ['real_estate'],
  'land': ['real_estate'],
  'buy property': ['real_estate'],
  'sell property': ['real_estate'],
  'purchase property': ['real_estate'],
  'investment property': ['real_estate'],
  'rental property': ['real_estate'],
  'beachfront property': ['real_estate'],
  'oceanfront': ['real_estate'],
  'waterfront': ['real_estate'],
  'real estate agent': ['real_estate'],
  'realtor': ['real_estate'],
  'property manager': ['real_estate'],
  'stamp duty': ['real_estate'],
  'closing costs': ['real_estate'],
  'buy': ['real_estate'],
  'private jet': ['private_jet'],
  'jet charter': ['private_jet'],
  'helicopter': ['private_jet'],
  'aviation': ['private_jet'],
  'concierge': ['concierge'],
  'vip': ['concierge'],
  'butler': ['concierge'],
  'luxury': ['concierge', 'hotel', 'private_jet'],
  'transport': ['transport'],
  'taxi': ['transport'],
  'car rental': ['transport'],
  'limo': ['transport'],
  'limousine': ['transport'],
  'transfer': ['transport']
};

/**
 * Context Tracker Class
 * Singleton pattern for global context management
 */
class ContextTracker {
  private context: ConversationContext;

  constructor() {
    this.context = this.createEmptyContext();
  }

  /**
   * Create empty context
   */
  private createEmptyContext(): ConversationContext {
    return {
      currentEmbedding: null,
      interestScores: new Map(),
      geographicFocus: null,
      recentPlaceIds: [],
      predictedInterests: [],
      messageCount: 0,
      lastQuery: '',
      lastUpdated: new Date()
    };
  }

  /**
   * Update context with new message exchange
   */
  async updateContext(
    userMessage: string,
    assistantResponse: string,
    mentionedPlaceIds: string[],
    detectedCategories: KnowledgeCategory[]
  ): Promise<ConversationContext> {
    this.context.messageCount++;
    this.context.lastQuery = userMessage;
    this.context.lastUpdated = new Date();

    // 1. Decay existing interests
    this.decayInterests();

    // 2. Detect categories from user message
    const messageCategories = this.detectCategoriesFromText(userMessage);
    const allCategories = [...new Set([...detectedCategories, ...messageCategories])];

    // 3. Boost detected categories
    for (const category of allCategories) {
      const current = this.context.interestScores.get(category) || 0;
      // Stronger boost for explicit user interests
      const boost = messageCategories.includes(category) ? 0.4 : 0.25;
      this.context.interestScores.set(category, Math.min(1, current + boost));
    }

    // 4. Update recent places
    this.context.recentPlaceIds = [
      ...mentionedPlaceIds,
      ...this.context.recentPlaceIds
    ].slice(0, MAX_RECENT_PLACES);

    // 5. Detect geographic focus
    this.updateGeographicFocus(userMessage);

    // 6. Predict next interests
    this.predictNextInterests();

    // 7. Generate context embedding
    await this.updateContextEmbedding(userMessage, assistantResponse);

    return this.context;
  }

  /**
   * Decay all interest scores
   */
  private decayInterests(): void {
    for (const [category, score] of this.context.interestScores) {
      const decayed = score * INTEREST_DECAY;
      if (decayed < MIN_INTEREST_THRESHOLD) {
        this.context.interestScores.delete(category);
      } else {
        this.context.interestScores.set(category, decayed);
      }
    }
  }

  /**
   * Detect categories from text using keywords
   */
  private detectCategoriesFromText(text: string): KnowledgeCategory[] {
    const lowerText = text.toLowerCase();
    const detected = new Set<KnowledgeCategory>();

    for (const [keyword, categories] of Object.entries(CATEGORY_KEYWORDS)) {
      if (lowerText.includes(keyword)) {
        categories.forEach(cat => detected.add(cat));
      }
    }

    return Array.from(detected);
  }

  /**
   * Update geographic focus from message
   */
  private updateGeographicFocus(text: string): void {
    const lowerText = text.toLowerCase();

    // Check known locations
    for (const [name, location] of Object.entries(KNOWN_LOCATIONS)) {
      if (lowerText.includes(name)) {
        this.context.geographicFocus = { ...location };
        return;
      }
    }

    // Check for "near me" or "nearby" patterns
    if (lowerText.includes('near me') || lowerText.includes('nearby')) {
      // Keep existing focus if any, or default to Grand Cayman center
      if (!this.context.geographicFocus) {
        this.context.geographicFocus = {
          island: 'Grand Cayman',
          coordinates: { lat: 19.313, lng: -81.255 },
          radius: 10
        };
      }
    }
  }

  /**
   * Predict next interests based on current interests
   */
  private predictNextInterests(): void {
    const predictions = new Map<KnowledgeCategory, number>();

    // Based on current interests, predict likely next categories
    for (const [category, score] of this.context.interestScores) {
      const transitions = CATEGORY_TRANSITIONS[category] || [];
      transitions.forEach((nextCat, idx) => {
        // Earlier in list = more likely
        const transitionScore = score * (1 - idx * 0.15);
        const current = predictions.get(nextCat) || 0;
        predictions.set(nextCat, current + transitionScore);
      });
    }

    // Sort by prediction score, exclude already high interests
    this.context.predictedInterests = Array.from(predictions.entries())
      .filter(([cat]) => (this.context.interestScores.get(cat) || 0) < 0.5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);
  }

  /**
   * Generate context embedding from conversation state
   */
  private async updateContextEmbedding(
    userMessage: string,
    assistantResponse: string
  ): Promise<void> {
    // Build context text
    const parts: { text: string; weight: number }[] = [];

    // Add user query (highest weight)
    parts.push({ text: userMessage, weight: 0.5 });

    // Add top interests
    const topInterests = Array.from(this.context.interestScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat.replace(/_/g, ' '));

    if (topInterests.length > 0) {
      parts.push({
        text: `Looking for: ${topInterests.join(', ')}`,
        weight: 0.25
      });
    }

    // Add geographic focus
    if (this.context.geographicFocus?.district) {
      parts.push({
        text: `In area: ${this.context.geographicFocus.district}`,
        weight: 0.15
      });
    }

    // Add response context (lower weight)
    if (assistantResponse) {
      parts.push({
        text: assistantResponse.slice(0, 200),
        weight: 0.1
      });
    }

    // Generate combined embedding
    try {
      const embedding = await generateCombinedEmbedding(parts);
      if (embedding) {
        this.context.currentEmbedding = embedding;
      }
    } catch (error) {
      console.error('[ContextTracker] Failed to generate context embedding:', error);
    }
  }

  /**
   * Get current context
   */
  getContext(): ConversationContext {
    return this.context;
  }

  /**
   * Get top interests
   */
  getTopInterests(limit: number = 5): { category: KnowledgeCategory; score: number }[] {
    return Array.from(this.context.interestScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([category, score]) => ({ category, score }));
  }

  /**
   * Check if a category is of current interest
   */
  hasInterest(category: KnowledgeCategory, minScore: number = 0.2): boolean {
    return (this.context.interestScores.get(category) || 0) >= minScore;
  }

  /**
   * Check if place was recently shown
   */
  wasRecentlyShown(placeId: string): boolean {
    return this.context.recentPlaceIds.includes(placeId);
  }

  /**
   * Add place to recent list without full context update
   */
  addRecentPlace(placeId: string): void {
    if (!this.context.recentPlaceIds.includes(placeId)) {
      this.context.recentPlaceIds = [
        placeId,
        ...this.context.recentPlaceIds
      ].slice(0, MAX_RECENT_PLACES);
    }
  }

  /**
   * Boost a specific category (e.g., when user clicks a marker)
   */
  boostCategory(category: KnowledgeCategory, amount: number = 0.3): void {
    const current = this.context.interestScores.get(category) || 0;
    this.context.interestScores.set(category, Math.min(1, current + amount));
    this.predictNextInterests();
  }

  /**
   * Set geographic focus explicitly
   */
  setGeographicFocus(focus: GeographicFocus): void {
    this.context.geographicFocus = focus;
  }

  /**
   * Clear geographic focus
   */
  clearGeographicFocus(): void {
    this.context.geographicFocus = null;
  }

  /**
   * Reset all context
   */
  reset(): void {
    this.context = this.createEmptyContext();
  }
}

// Export singleton instance
export const contextTracker = new ContextTracker();
export default contextTracker;
