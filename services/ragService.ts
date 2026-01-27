// ============================================
// ISLE AI - RAG SERVICE
// Retrieval-Augmented Generation for intelligent travel assistance
// ============================================

import { KnowledgeNode, KnowledgeCategory, ChatMessage, MapMarker, PlaceCard } from '../types/chatbot';
import { CAYMAN_CONFIG, CAYMAN_KNOWLEDGE_BASE } from '../data/cayman-islands-knowledge';

// ============ TYPES ============

export interface RAGContext {
  query: string;
  relevantNodes: KnowledgeNode[];
  categories: KnowledgeCategory[];
  userIntent: UserIntent;
  conversationHistory: ChatMessage[];
}

export interface RAGResponse {
  content: string;
  places: PlaceCard[];
  mapMarkers: MapMarker[];
  suggestedActions: SuggestedAction[];
  confidence: number;
  sourceNodeIds: string[];
}

export interface SuggestedAction {
  id: string;
  type: 'book' | 'directions' | 'website' | 'call' | 'save' | 'add_to_trip' | 'compare' | 'more_info';
  label: string;
  nodeId?: string;
  url?: string;
}

export type UserIntent =
  | 'search_places'
  | 'get_recommendations'
  | 'compare_options'
  | 'get_directions'
  | 'book_service'
  | 'general_info'
  | 'trip_planning'
  | 'budget_planning'
  | 'activity_suggestion'
  | 'dining_suggestion'
  | 'accommodation_search'
  | 'greeting'
  | 'unknown';

// ============ INTENT DETECTION ============

const intentPatterns: Record<UserIntent, RegExp[]> = {
  search_places: [
    /where\s+(can|should|to)/i,
    /find\s+(me|a|the)/i,
    /looking\s+for/i,
    /search/i
  ],
  get_recommendations: [
    /recommend/i,
    /suggest/i,
    /best\s+(place|spot|restaurant|hotel|beach)/i,
    /top\s+\d+/i,
    /what\s+(should|do\s+you)/i
  ],
  compare_options: [
    /compare/i,
    /versus|vs\.?/i,
    /difference\s+between/i,
    /which\s+is\s+better/i
  ],
  get_directions: [
    /directions?\s+to/i,
    /how\s+(do\s+i|to)\s+get/i,
    /navigate/i,
    /where\s+is/i
  ],
  book_service: [
    /book/i,
    /reserv/i,
    /schedule/i,
    /appointment/i
  ],
  general_info: [
    /what\s+is/i,
    /tell\s+me\s+about/i,
    /information/i,
    /learn\s+about/i
  ],
  trip_planning: [
    /plan\s+(a|my)\s+trip/i,
    /itinerary/i,
    /\d+\s+day(s)?\s+(trip|visit|stay)/i,
    /weekend/i
  ],
  budget_planning: [
    /budget/i,
    /cheap/i,
    /afford/i,
    /cost/i,
    /price/i,
    /expensive/i
  ],
  activity_suggestion: [
    /what\s+to\s+do/i,
    /activit/i,
    /things\s+to\s+do/i,
    /adventure/i,
    /experience/i
  ],
  dining_suggestion: [
    /where\s+to\s+eat/i,
    /restaurant/i,
    /food/i,
    /dinner/i,
    /lunch/i,
    /breakfast/i,
    /dining/i,
    /cuisine/i
  ],
  accommodation_search: [
    /where\s+to\s+stay/i,
    /hotel/i,
    /resort/i,
    /villa/i,
    /accommodation/i,
    /lodging/i,
    /airbnb/i
  ],
  greeting: [
    /^(hi|hello|hey|good\s+(morning|afternoon|evening))/i,
    /^(what's\s+up|howdy)/i
  ],
  unknown: []
};

function detectIntent(query: string): UserIntent {
  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        return intent as UserIntent;
      }
    }
  }
  return 'unknown';
}

// ============ CATEGORY DETECTION ============

const categoryKeywords: Record<KnowledgeCategory, string[]> = {
  hotel: ['hotel', 'resort', 'stay', 'room', 'accommodation', 'lodging', 'sleep'],
  restaurant: ['restaurant', 'food', 'eat', 'dining', 'dinner', 'lunch', 'breakfast', 'cuisine', 'chef'],
  beach: ['beach', 'sand', 'shore', 'coastline', 'swimming', 'sunbathe', 'tan'],
  attraction: ['attraction', 'visit', 'see', 'tourist', 'landmark', 'sight'],
  activity: ['activity', 'do', 'experience', 'adventure', 'tour', 'excursion'],
  diving: ['dive', 'diving', 'snorkel', 'underwater', 'reef', 'coral', 'scuba', 'stingray'],
  villa_rental: ['villa', 'rental', 'private', 'house', 'mansion', 'estate', 'luxury home'],
  boat_charter: ['boat', 'yacht', 'charter', 'sailing', 'cruise', 'catamaran', 'fishing'],
  private_jet: ['jet', 'flight', 'private plane', 'aircraft', 'aviation'],
  concierge: ['concierge', 'vip', 'service', 'butler', 'assistance', 'personal'],
  real_estate: ['real estate', 'property', 'invest', 'buy', 'purchase', 'land'],
  event: ['event', 'wedding', 'party', 'celebration', 'festival', 'concert'],
  transport: ['transport', 'taxi', 'car', 'rental', 'driver', 'transfer', 'airport'],
  general: ['general', 'info', 'information', 'about', 'cayman']
};

function detectCategories(query: string): KnowledgeCategory[] {
  const detectedCategories: KnowledgeCategory[] = [];
  const lowerQuery = query.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        detectedCategories.push(category as KnowledgeCategory);
        break;
      }
    }
  }

  return detectedCategories.length > 0 ? detectedCategories : ['general'];
}

// ============ SEMANTIC SEARCH ============

function calculateRelevanceScore(node: KnowledgeNode, query: string, categories: KnowledgeCategory[]): number {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);

  // Category match (high weight)
  if (categories.includes(node.category)) {
    score += 30;
  }

  // Name match
  if (node.name.toLowerCase().includes(lowerQuery)) {
    score += 50;
  }
  for (const word of queryWords) {
    if (node.name.toLowerCase().includes(word)) {
      score += 15;
    }
  }

  // Description match
  const description = node.description.toLowerCase();
  for (const word of queryWords) {
    if (description.includes(word)) {
      score += 5;
    }
  }

  // Short description match
  if (node.shortDescription) {
    const shortDesc = node.shortDescription.toLowerCase();
    for (const word of queryWords) {
      if (shortDesc.includes(word)) {
        score += 8;
      }
    }
  }

  // Tags match
  for (const tag of node.tags) {
    if (lowerQuery.includes(tag.toLowerCase())) {
      score += 10;
    }
    for (const word of queryWords) {
      if (tag.toLowerCase().includes(word)) {
        score += 5;
      }
    }
  }

  // Highlights match
  if (node.highlights) {
    for (const highlight of node.highlights) {
      if (highlight.toLowerCase().includes(lowerQuery)) {
        score += 8;
      }
    }
  }

  // Rating boost (popular places)
  if (node.ratings.overall >= 4.5) {
    score += 10;
  } else if (node.ratings.overall >= 4.0) {
    score += 5;
  }

  // Review count boost (well-known places)
  if (node.ratings.reviewCount > 5000) {
    score += 8;
  } else if (node.ratings.reviewCount > 1000) {
    score += 4;
  }

  return score;
}

function searchKnowledgeBase(
  query: string,
  categories: KnowledgeCategory[],
  maxResults: number = 5
): KnowledgeNode[] {
  const scoredNodes = CAYMAN_KNOWLEDGE_BASE.map(node => ({
    node,
    score: calculateRelevanceScore(node, query, categories)
  }));

  // Sort by score descending
  scoredNodes.sort((a, b) => b.score - a.score);

  // Filter out low-scoring results and return top N
  return scoredNodes
    .filter(item => item.score > 10)
    .slice(0, maxResults)
    .map(item => item.node);
}

// ============ PROMPT BUILDING ============

function buildSystemPrompt(): string {
  return `You are Isle AI, an intelligent travel concierge for the ${CAYMAN_CONFIG.islandName}.
Your personality: ${CAYMAN_CONFIG.aiSettings.personality}

IMPORTANT GUIDELINES:
1. Be warm, helpful, and enthusiastic about the Cayman Islands
2. Provide specific, actionable recommendations
3. Include practical details like prices, hours, and locations
4. Use emojis sparingly to add visual appeal
5. Format responses with headers and bullet points for readability
6. When mentioning places, include key details (rating, price range, district)
7. Always suggest next steps or follow-up questions
8. If you don't know something, say so and suggest alternatives

RESPONSE FORMAT:
- Use **bold** for place names and section headers
- Use bullet points for lists
- Include relevant emojis for visual appeal
- Keep responses concise but informative
- End with a question or call-to-action`;
}

function buildContextPrompt(context: RAGContext): string {
  let prompt = `USER QUERY: "${context.query}"

DETECTED INTENT: ${context.userIntent}
RELEVANT CATEGORIES: ${context.categories.join(', ')}

`;

  if (context.relevantNodes.length > 0) {
    prompt += `RELEVANT PLACES FROM KNOWLEDGE BASE:\n\n`;

    context.relevantNodes.forEach((node, index) => {
      prompt += `${index + 1}. **${node.name}** (${node.category})
   - Rating: ${node.ratings.overall}/5 (${node.ratings.reviewCount} reviews)
   - Location: ${node.location.district}, ${node.location.island}
   - Price: ${node.business.priceRange}${node.business.priceFrom ? ` (from ${node.business.currency}${node.business.priceFrom})` : ''}
   - Description: ${node.shortDescription || node.description.slice(0, 150)}
   ${node.highlights ? `- Highlights: ${node.highlights.slice(0, 3).join(', ')}` : ''}
   ${node.bestTimeToVisit ? `- Best time: ${node.bestTimeToVisit}` : ''}

`;
    });
  }

  prompt += `
Based on the above information, provide a helpful response to the user's query.
If the knowledge base has relevant places, incorporate them naturally into your response.
If the query is a greeting, respond warmly and offer to help with trip planning.`;

  return prompt;
}

// ============ RESPONSE PARSING ============

function extractPlaceCards(nodes: KnowledgeNode[]): PlaceCard[] {
  return nodes.map(node => ({
    nodeId: node.id,
    name: node.name,
    category: node.category,
    thumbnail: node.media.thumbnail,
    rating: node.ratings.overall,
    reviewCount: node.ratings.reviewCount,
    priceRange: node.business.priceRange,
    shortDescription: node.shortDescription || node.description.slice(0, 100),
    location: {
      latitude: node.location.latitude,
      longitude: node.location.longitude,
      district: node.location.district
    }
  }));
}

function extractMapMarkers(nodes: KnowledgeNode[]): MapMarker[] {
  return nodes.map((node, index) => ({
    id: `marker-${node.id}`,
    nodeId: node.id,
    latitude: node.location.latitude,
    longitude: node.location.longitude,
    title: node.name,
    subtitle: node.shortDescription,
    category: node.category,
    thumbnail: node.media.thumbnail,
    rating: node.ratings.overall,
    reviewCount: node.ratings.reviewCount,
    priceRange: node.business.priceRange,
    address: node.location.address,
    openingHours: node.hours?.display,
    isActive: index === 0 // First marker is active
  }));
}

function generateSuggestedActions(nodes: KnowledgeNode[], intent: UserIntent): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  // Add common actions based on intent
  if (nodes.length > 0) {
    const firstNode = nodes[0];

    actions.push({
      id: 'action-directions',
      type: 'directions',
      label: 'Get directions',
      nodeId: firstNode.id
    });

    if (firstNode.contact.bookingUrl) {
      actions.push({
        id: 'action-book',
        type: 'book',
        label: 'Book now',
        nodeId: firstNode.id,
        url: firstNode.contact.bookingUrl
      });
    }

    if (firstNode.contact.website) {
      actions.push({
        id: 'action-website',
        type: 'website',
        label: 'Visit website',
        nodeId: firstNode.id,
        url: firstNode.contact.website
      });
    }

    actions.push({
      id: 'action-save',
      type: 'save',
      label: 'Save to collection'
    });

    actions.push({
      id: 'action-trip',
      type: 'add_to_trip',
      label: 'Add to trip'
    });
  }

  // Intent-specific actions
  if (intent === 'compare_options' && nodes.length > 1) {
    actions.push({
      id: 'action-compare',
      type: 'compare',
      label: 'Compare all options'
    });
  }

  if (intent === 'trip_planning') {
    actions.push({
      id: 'action-itinerary',
      type: 'more_info',
      label: 'Create itinerary'
    });
  }

  return actions.slice(0, 5); // Max 5 actions
}

// ============ CLAUDE API INTEGRATION ============

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callClaudeAPI(
  systemPrompt: string,
  messages: ClaudeMessage[]
): Promise<string> {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;

  if (!apiKey) {
    console.warn('Claude API key not configured, using simulated response');
    return simulateResponse(messages[messages.length - 1].content);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: CAYMAN_CONFIG.aiSettings.model,
        max_tokens: CAYMAN_CONFIG.aiSettings.maxTokens,
        temperature: CAYMAN_CONFIG.aiSettings.temperature,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Claude API error:', error);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    // Fallback to simulated response
    return simulateResponse(messages[messages.length - 1].content);
  }
}

// ============ SIMULATED RESPONSES (FALLBACK) ============

function simulateResponse(query: string): string {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('beach') || lowerQuery.includes('snorkel')) {
    return `**The Best Beaches in the Cayman Islands** 🏖️

For snorkeling and pristine waters, here are my top recommendations:

🥇 **Seven Mile Beach**
The crown jewel of Grand Cayman - 5.5 miles of powder-white sand and crystal-clear turquoise water. Perfect for swimming, snorkeling, and watching stunning sunsets.

🥈 **Starfish Point**
A magical shallow cove where you can see beautiful red cushion starfish in their natural habitat. Best visited at low tide!

🥉 **Cemetery Beach**
A local secret with excellent snorkeling - you'll find vibrant coral and tropical fish just steps from shore.

Would you like me to show these on the map or give you more details about any of them?`;
  }

  if (lowerQuery.includes('hotel') || lowerQuery.includes('stay') || lowerQuery.includes('resort') || lowerQuery.includes('luxury')) {
    return `**The Most Exclusive Stays in the Cayman Islands** 🏰

For a truly luxurious experience, here are the absolute top options:

🥇 **The Ritz-Carlton, Grand Cayman**
- Iconic 5-star resort on Seven Mile Beach
- La Prairie Spa - the only one in the Caribbean
- Blue by Eric Ripert (Michelin-starred chef)
- From $800/night

🥈 **Kimpton Seafire Resort + Spa**
- Contemporary luxury with stunning design
- Award-winning FLOAT spa
- No resort fees (rare!)
- From $500/night

🏠 **For Ultimate Privacy: Castillo Caribe**
- $60M Caribbean castle estate
- 10 bedrooms, private beach
- Full staff including butler & chef
- From $35,000/night

What's your priority - beachfront resort, private villa, or something else?`;
  }

  if (lowerQuery.includes('restaurant') || lowerQuery.includes('food') || lowerQuery.includes('eat') || lowerQuery.includes('dinner')) {
    return `**Culinary Highlights of the Cayman Islands** 🍽️

From fine dining to beach bars, here are must-try spots:

⭐ **Blue by Eric Ripert** (Fine Dining)
Michelin-starred chef's oceanfront restaurant at The Ritz-Carlton. Seafood tasting menus that will blow your mind. From $185.

🌅 **Agua Restaurant** (Camana Bay)
Contemporary Caribbean with stunning harbor views. Perfect for sunset dinners. Great cocktails!

🏖️ **Kaibo Beach Bar** (Rum Point)
The ultimate casual beach experience. Feet in the sand, rum punch in hand, fresh fish tacos. A local institution.

What are you in the mood for - fine dining, casual beach vibes, or local cuisine?`;
  }

  if (lowerQuery.includes('stingray') || lowerQuery.includes('diving') || lowerQuery.includes('activity') || lowerQuery.includes('do')) {
    return `**Must-Do Activities in the Cayman Islands** 🤿

Here are the experiences you absolutely cannot miss:

🥇 **Stingray City** ⭐ #1 Attraction
Swim with friendly wild stingrays in crystal-clear shallow water. This is the world's most famous animal encounter! Tours from ~$50.

🤿 **USS Kittiwake Wreck Dive**
A 251-foot former Navy vessel, now a premier dive site. Suitable for all certified divers with depths from 15-65 feet.

🐢 **Cayman Turtle Centre**
See green sea turtles up close, learn about conservation, and swim in the lagoon. Great for families!

Want me to help you book any of these or show them on the map?`;
  }

  // Greeting
  if (/^(hi|hello|hey|good)/i.test(lowerQuery)) {
    return `Hello! Welcome to Isle AI - your personal guide to the Cayman Islands! 🌴

I'm here to help you discover paradise. Here are some things I can assist with:

🏖️ **Beaches & Relaxation** - Find the perfect spot for swimming, snorkeling, or sunsets
🏨 **Accommodation** - From luxury resorts to private villas
🍽️ **Dining** - Michelin-starred restaurants to beach bars
🤿 **Activities** - Stingray City, diving, water sports, and more
🛥️ **VIP Services** - Yacht charters, private tours, concierge

What would you like to explore today?`;
  }

  // Default response
  return `I'd love to help you explore the Cayman Islands! 🌴

Here are some things I can help you with:

**🏖️ Beaches & Relaxation**
Find the perfect beach for swimming, snorkeling, or just soaking up the sun.

**🏨 Accommodation**
From luxury resorts like The Ritz-Carlton to private villas with staff.

**🍽️ Dining**
Michelin-starred restaurants to laid-back beach bars.

**🤿 Activities**
Stingray City, diving, water sports, and island adventures.

**🛥️ VIP Services**
Yacht charters, private tours, and concierge services.

What interests you most?`;
}

// ============ MAIN RAG FUNCTION ============

export async function processQuery(
  query: string,
  conversationHistory: ChatMessage[] = []
): Promise<RAGResponse> {
  // Step 1: Detect intent and categories
  const userIntent = detectIntent(query);
  const categories = detectCategories(query);

  // Step 2: Search knowledge base
  const relevantNodes = searchKnowledgeBase(query, categories, 5);

  // Step 3: Build context
  const context: RAGContext = {
    query,
    relevantNodes,
    categories,
    userIntent,
    conversationHistory
  };

  // Step 4: Build prompts
  const systemPrompt = buildSystemPrompt();
  const contextPrompt = buildContextPrompt(context);

  // Step 5: Build message history for Claude
  const messages: ClaudeMessage[] = [
    ...conversationHistory.slice(-6).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    { role: 'user' as const, content: contextPrompt }
  ];

  // Step 6: Call Claude API (or simulate)
  const responseContent = await callClaudeAPI(systemPrompt, messages);

  // Step 7: Build response
  const response: RAGResponse = {
    content: responseContent,
    places: extractPlaceCards(relevantNodes),
    mapMarkers: extractMapMarkers(relevantNodes),
    suggestedActions: generateSuggestedActions(relevantNodes, userIntent),
    confidence: relevantNodes.length > 0 ? 0.85 : 0.6,
    sourceNodeIds: relevantNodes.map(n => n.id)
  };

  return response;
}

// ============ UTILITY FUNCTIONS ============

export function getPlaceById(nodeId: string): KnowledgeNode | undefined {
  return CAYMAN_KNOWLEDGE_BASE.find(node => node.id === nodeId);
}

export function getPlacesByCategory(category: KnowledgeCategory): KnowledgeNode[] {
  return CAYMAN_KNOWLEDGE_BASE.filter(node => node.category === category);
}

export function getTopRatedPlaces(limit: number = 5): KnowledgeNode[] {
  return [...CAYMAN_KNOWLEDGE_BASE]
    .sort((a, b) => b.ratings.overall - a.ratings.overall)
    .slice(0, limit);
}

export function searchPlacesByName(query: string): KnowledgeNode[] {
  const lowerQuery = query.toLowerCase();
  return CAYMAN_KNOWLEDGE_BASE.filter(node =>
    node.name.toLowerCase().includes(lowerQuery)
  );
}
