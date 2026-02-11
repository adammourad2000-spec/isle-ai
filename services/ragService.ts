// ============================================
// ISLE AI - RAG SERVICE
// Retrieval-Augmented Generation for intelligent travel assistance
// Enhanced with Vector Semantic Search for Precision Matching
// Updated: Now uses Reflection Service for intelligent recommendations
// ============================================

import { KnowledgeNode, KnowledgeCategory, ChatMessage, MapMarker, PlaceCard } from '../types/chatbot';
import { CAYMAN_CONFIG, getKnowledgeBase } from '../data/island-knowledge';
import { loadEmbeddingStore, generateQueryEmbedding, isEmbeddingsLoaded, getEmbeddingStore } from './embeddingLoader';
// NEW: Import reflection service for intelligent recommendations
import { reflect, ReflectionResult, ReasonedRecommendation } from './reflectionService';
// NEW: Import weather service for real-time weather queries
import {
  detectWeatherIntent,
  getWeather,
  generateWeatherContext,
  getWeatherBasedRecommendations,
  WeatherData
} from './weatherService';
// NEW: Import VIP concierge service for HNWI+ premium experience
import {
  getVIPStatus,
  getConciergePrompt,
  shouldEnableWebSearch,
  performVIPWebSearch,
  getVIPContextEnhancement,
  VIPStatus
} from './vipConciergeService';
// Import conversation logger to get current visitor profile
import { getCurrentSession } from './conversationLogger';
import { analyzeConversation, WealthProfile } from './wealthIntelligenceService';

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
  detectedCategories: KnowledgeCategory[];
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
  | 'financial_services'
  | 'real_estate'
  | 'luxury_services'
  | 'weather'
  | 'greeting'
  | 'unknown';

// ============ INTENT DETECTION - HYPER-INTELLIGENT ============

const intentPatterns: Record<UserIntent, RegExp[]> = {
  search_places: [
    /where\s+(can|should|to)/i,
    /find\s+(me|a|the)/i,
    /looking\s+for/i,
    /search\s+for/i,
    /show\s+me/i,
    /list\s+(of|all)/i,
    /any\s+\w+\s+(near|around|in)/i
  ],
  get_recommendations: [
    /recommend/i,
    /suggest/i,
    /best\s+(place|spot|restaurant|hotel|beach|bar|spa|dive)/i,
    /top\s+\d+/i,
    /what\s+(should|do\s+you|would\s+you)/i,
    /favorite/i,
    /must(-|\s)?(visit|see|try|do)/i,
    /hidden\s+gem/i,
    /local\s+secret/i,
    /off\s+the\s+beaten/i,
    /worth\s+(it|visiting)/i
  ],
  compare_options: [
    /compare/i,
    /versus|vs\.?/i,
    /difference\s+between/i,
    /which\s+is\s+(better|best)/i,
    /pros\s+and\s+cons/i,
    /or\s+should\s+i/i,
    /\w+\s+or\s+\w+\?/i
  ],
  get_directions: [
    /directions?\s+to/i,
    /how\s+(do\s+i|to|can\s+i)\s+get/i,
    /navigate/i,
    /where\s+is/i,
    /located/i,
    /address/i,
    /how\s+far/i,
    /distance\s+to/i,
    /route\s+to/i
  ],
  book_service: [
    /book\s+(a|an|the)?/i,
    /reserv/i,
    /schedule/i,
    /appointment/i,
    /make\s+a\s+reservation/i,
    /availability/i,
    /how\s+(do\s+i|can\s+i)\s+book/i
  ],
  general_info: [
    /what\s+is/i,
    /tell\s+me\s+(about|more)/i,
    /information/i,
    /learn\s+about/i,
    /what's\s+special/i,
    /what\s+makes/i,
    /history\s+of/i,
    /story\s+behind/i,
    /explain/i
  ],
  trip_planning: [
    /plan\s+(a|my|our)\s+trip/i,
    /itinerary/i,
    /\d+\s+day(s)?\s+(trip|visit|stay|itinerary)/i,
    /weekend\s+(getaway|trip)/i,
    /honeymoon/i,
    /family\s+vacation/i,
    /first\s+time\s+(visiting|in)/i,
    /what\s+order\s+should/i,
    /schedule\s+my/i
  ],
  budget_planning: [
    /budget/i,
    /cheap(er|est)?/i,
    /afford/i,
    /cost/i,
    /price/i,
    /expensive/i,
    /money/i,
    /\$+/i,
    /how\s+much/i,
    /value\s+for\s+money/i,
    /luxury\s+but\s+affordable/i,
    /splurge/i
  ],
  activity_suggestion: [
    /what\s+(can|to)\s+do/i,
    /activit/i,
    /things\s+to\s+do/i,
    /adventure/i,
    /experience/i,
    /fun\s+things/i,
    /entertainment/i,
    /excursion/i,
    /tour/i,
    /kid(-|\s)?friendly/i,
    /romantic/i,
    /couples/i,
    /solo\s+travel/i
  ],
  dining_suggestion: [
    /where\s+to\s+eat/i,
    /restaurant/i,
    /food/i,
    /dinner/i,
    /lunch/i,
    /breakfast/i,
    /brunch/i,
    /dining/i,
    /cuisine/i,
    /hungry/i,
    /cafe/i,
    /coffee/i,
    /dessert/i,
    /seafood/i,
    /sushi/i,
    /italian/i,
    /caribbean\s+food/i,
    /local\s+food/i,
    /fine\s+dining/i,
    /casual\s+dining/i
  ],
  accommodation_search: [
    /where\s+to\s+stay/i,
    /hotel/i,
    /resort/i,
    /villa/i,
    /accommodation/i,
    /lodging/i,
    /airbnb/i,
    /condo/i,
    /room/i,
    /suite/i,
    /beachfront/i,
    /oceanfront/i,
    /pool/i,
    /all(-|\s)?inclusive/i
  ],
  greeting: [
    /^(hi|hello|hey|good\s+(morning|afternoon|evening)|greetings)/i,
    /^(what's\s+up|howdy|hola|bonjour)/i,
    /^(thanks|thank\s+you)/i
  ],
  luxury_services: [
    // Private Aviation
    /private\s+jet/i,
    /jet\s+charter/i,
    /charter\s+(a\s+)?(flight|plane|jet)/i,
    /fly\s+private/i,
    /helicopter/i,
    /private\s+plane/i,
    /aircraft\s+charter/i,
    // Luxury Transport
    /limousine|limo\b/i,
    /chauffeur/i,
    /luxury\s+car\s+(rental|service)/i,
    /private\s+driver/i,
    /airport\s+transfer/i,
    /rolls\s+royce|bentley|ferrari|lamborghini/i,
    // Yacht & Boat
    /yacht\s+charter/i,
    /private\s+(yacht|boat)/i,
    /luxury\s+yacht/i,
    /superyacht/i,
    /sailing\s+charter/i,
    /catamaran/i,
    // VIP Services
    /vip\s+(service|experience|concierge)/i,
    /concierge\s+service/i,
    /butler\s+service/i,
    /private\s+chef/i,
    /personal\s+(concierge|assistant)/i,
    /exclusive\s+experience/i,
    // Events
    /wedding\s+planner/i,
    /event\s+planner/i,
    /luxury\s+(wedding|event|party)/i,
    /private\s+(party|event)/i,
    // General Luxury
    /luxury\s+service/i,
    /premium\s+service/i,
    /high(-|\s)?end/i
  ],
  luxury_services: [
    // Private Aviation
    /private\s+jet/i,
    /jet\s+charter/i,
    /charter\s+(a\s+)?(flight|plane|jet)/i,
    /fly\s+private/i,
    /helicopter/i,
    /private\s+plane/i,
    /aircraft\s+charter/i,
    // Luxury Transport
    /limousine|limo\b/i,
    /chauffeur/i,
    /luxury\s+car\s+(rental|service)/i,
    /private\s+driver/i,
    /airport\s+transfer/i,
    /rolls\s+royce|bentley|ferrari|lamborghini/i,
    // Yacht & Boat
    /yacht\s+charter/i,
    /private\s+(yacht|boat)/i,
    /luxury\s+yacht/i,
    /superyacht/i,
    /sailing\s+charter/i,
    /catamaran/i,
    // VIP Services
    /vip\s+(service|experience|concierge)/i,
    /concierge\s+service/i,
    /butler\s+service/i,
    /private\s+chef/i,
    /personal\s+(concierge|assistant)/i,
    /exclusive\s+experience/i,
    // Events
    /wedding\s+planner/i,
    /event\s+planner/i,
    /luxury\s+(wedding|event|party)/i,
    /private\s+(party|event)/i,
    // General Luxury
    /luxury\s+service/i,
    /premium\s+service/i,
    /high(-|\s)?end/i
  ],
  real_estate: [
    // Buying/Selling
    /buy(ing)?\s+(a\s+)?(property|house|home|condo|villa|land|apartment)/i,
    /sell(ing)?\s+(my\s+)?(property|house|home|condo|villa)/i,
    /purchas(e|ing)\s+(a\s+)?(property|house|home|condo)/i,
    /invest(ing|ment)?\s+(in\s+)?(property|real\s+estate)/i,
    /looking\s+(for|to\s+buy)\s+(a\s+)?(property|house|home|condo)/i,
    // Real Estate terms
    /real\s+estate/i,
    /property\s+(for\s+sale|market|prices?|value)/i,
    /housing\s+market/i,
    /home\s+(prices?|values?|buying)/i,
    // Rentals
    /rent(al|ing)?\s+(a\s+)?(property|house|home|condo|villa|apartment)/i,
    /long(-|\s)?term\s+rental/i,
    /lease\s+(a\s+)?(property|apartment)/i,
    // Specific property types
    /beachfront\s+(property|home|condo)/i,
    /oceanfront\s+(property|villa)/i,
    /waterfront\s+(property|home)/i,
    /canal\s+front/i,
    /seven\s+mile\s+beach\s+(condo|property|home)/i,
    // Agents & Services
    /real\s+estate\s+(agent|agency|broker)/i,
    /realtor/i,
    /property\s+(agent|developer|management)/i,
    /cireba/i,
    // Legal/Process
    /stamp\s+duty/i,
    /conveyancing/i,
    /property\s+(lawyer|attorney)/i,
    /land\s+registry/i,
    // Investment
    /property\s+investment/i,
    /rental\s+(income|yield|return)/i,
    /residency\s+(by|through)\s+investment/i,
    // General
    /move\s+to\s+cayman/i,
    /relocat(e|ing|ion)\s+to\s+cayman/i,
    /live\s+in\s+cayman/i
  ],
  real_estate: [
    // Buying/Selling
    /buy(ing)?\s+(a\s+)?(property|house|home|condo|villa|land|apartment)/i,
    /sell(ing)?\s+(my\s+)?(property|house|home|condo|villa)/i,
    /purchas(e|ing)\s+(a\s+)?(property|house|home|condo)/i,
    /invest(ing|ment)?\s+(in\s+)?(property|real\s+estate)/i,
    /looking\s+(for|to\s+buy)\s+(a\s+)?(property|house|home|condo)/i,
    // Real Estate terms
    /real\s+estate/i,
    /property\s+(for\s+sale|market|prices?|value)/i,
    /housing\s+market/i,
    /home\s+(prices?|values?|buying)/i,
    // Rentals
    /rent(al|ing)?\s+(a\s+)?(property|house|home|condo|villa|apartment)/i,
    /long(-|\s)?term\s+rental/i,
    /lease\s+(a\s+)?(property|apartment)/i,
    // Specific property types
    /beachfront\s+(property|home|condo)/i,
    /oceanfront\s+(property|villa)/i,
    /waterfront\s+(property|home)/i,
    /canal\s+front/i,
    /seven\s+mile\s+beach\s+(condo|property|home)/i,
    // Agents & Services
    /real\s+estate\s+(agent|agency|broker)/i,
    /realtor/i,
    /property\s+(agent|developer|management)/i,
    /cireba/i,
    // Legal/Process
    /stamp\s+duty/i,
    /conveyancing/i,
    /property\s+(lawyer|attorney)/i,
    /land\s+registry/i,
    // Investment
    /property\s+investment/i,
    /rental\s+(income|yield|return)/i,
    /residency\s+(by|through)\s+investment/i,
    // General
    /move\s+to\s+cayman/i,
    /relocat(e|ing|ion)\s+to\s+cayman/i,
    /live\s+in\s+cayman/i
  ],
  financial_services: [
    // Fund related
    /fund\s+(administration|admin|manager|setup|structure)/i,
    /hedge\s+fund/i,
    /investment\s+fund/i,
    /set\s*up\s+(a\s+)?fund/i,
    /segregated\s+portfolio/i,
    /spc\b/i,
    /exempted\s+(company|limited\s+partnership)/i,
    /elp\b/i,
    // Corporate services
    /company\s+formation/i,
    /incorporate/i,
    /registered\s+(office|agent)/i,
    /offshore\s+(company|structure)/i,
    /corporate\s+service/i,
    // Legal & Compliance
    /law\s+firm/i,
    /lawyer|attorney/i,
    /cima\b/i,
    /regulatory/i,
    /compliance/i,
    /aml|kyc/i,
    // Trust & Fiduciary
    /trust\s+(company|service|structure)/i,
    /star\s+trust/i,
    /fiduciary/i,
    /trustee/i,
    // Insurance
    /captive\s+insurance/i,
    /insurance\s+manager/i,
    // Banking & Finance
    /private\s+bank/i,
    /wealth\s+management/i,
    /asset\s+management/i,
    // General financial
    /tax\s+(neutral|haven|benefit)/i,
    /cayman\s+(fund|financial|corporate|business)/i,
    /how\s+to\s+(start|open|register)\s+(a\s+)?(business|company|fund)/i,
    /accounting\s+(firm|service)/i,
    /audit/i
  ],
  weather: [
    // Direct weather queries
    /weather/i,
    /météo/i,
    /forecast/i,
    /prévisions?/i,
    // Temperature
    /temperature/i,
    /how\s+(hot|cold|warm)/i,
    /degrees/i,
    // Conditions
    /is\s+it\s+(raining|sunny|cloudy|hot|cold|warm)/i,
    /will\s+it\s+rain/i,
    /going\s+to\s+rain/i,
    /chance\s+of\s+rain/i,
    // Activity-based weather
    /good\s+(day|time|weather)\s+(for|to)\s+(beach|swim|dive|snorkel|sail)/i,
    /beach\s+weather/i,
    /swimming\s+conditions/i,
    /water\s+temperature/i,
    /sea\s+temperature/i,
    // Storm/safety
    /hurricane/i,
    /tropical\s+storm/i,
    /storm\s+(coming|warning)/i,
    // Time-based
    /weather\s+(today|tomorrow|this\s+week)/i,
    /today'?s?\s+weather/i,
    /weekend\s+weather/i,
    // UV/Sun
    /uv\s+(index|level)/i,
    /sun(burn|screen)/i,
    // Wind/Humidity
    /wind(y|s)?/i,
    /humid(ity)?/i,
    // What to wear
    /what\s+(should\s+i|to)\s+(wear|pack|bring)/i,
    /do\s+i\s+need\s+(umbrella|jacket|sunscreen)/i
  ],
  unknown: []
};

// Enhanced context-aware intent detection
function detectIntentWithContext(query: string, conversationHistory: ChatMessage[]): UserIntent {
  // First try direct pattern matching
  const directIntent = detectIntent(query);
  if (directIntent !== 'unknown') return directIntent;

  // Check for follow-up questions
  if (conversationHistory.length > 0) {
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    const lastContent = lastMessage.content.toLowerCase();

    // Follow-up indicators
    if (/^(yes|yeah|sure|ok|please|more|another|what\s+else)/i.test(query)) {
      // Look at what the previous context was about
      if (lastContent.includes('restaurant') || lastContent.includes('food')) return 'dining_suggestion';
      if (lastContent.includes('hotel') || lastContent.includes('stay')) return 'accommodation_search';
      if (lastContent.includes('beach') || lastContent.includes('activity')) return 'activity_suggestion';
      if (lastContent.includes('book') || lastContent.includes('reservation')) return 'book_service';
      // Financial services follow-ups
      if (lastContent.includes('fund') || lastContent.includes('hedge') || lastContent.includes('investment fund')) return 'financial_services';
      if (lastContent.includes('law firm') || lastContent.includes('lawyer') || lastContent.includes('legal')) return 'financial_services';
      if (lastContent.includes('company formation') || lastContent.includes('incorporate') || lastContent.includes('corporate service')) return 'financial_services';
      if (lastContent.includes('trust') || lastContent.includes('fiduciary')) return 'financial_services';
      if (lastContent.includes('captive') || lastContent.includes('insurance manager')) return 'financial_services';
      if (lastContent.includes('cima') || lastContent.includes('regulatory') || lastContent.includes('compliance')) return 'financial_services';
      // Real estate follow-ups
      if (lastContent.includes('real estate') || lastContent.includes('property')) return 'real_estate';
      if (lastContent.includes('buy') && (lastContent.includes('house') || lastContent.includes('condo') || lastContent.includes('home'))) return 'real_estate';
      if (lastContent.includes('rent') && lastContent.includes('property')) return 'real_estate';
      if (lastContent.includes('stamp duty') || lastContent.includes('conveyancing')) return 'real_estate';
      if (lastContent.includes('realtor') || lastContent.includes('agent')) return 'real_estate';
      // Luxury services follow-ups
      if (lastContent.includes('jet') || lastContent.includes('helicopter') || lastContent.includes('aviation')) return 'luxury_services';
      if (lastContent.includes('yacht') || lastContent.includes('charter') || lastContent.includes('boat')) return 'luxury_services';
      if (lastContent.includes('limousine') || lastContent.includes('chauffeur')) return 'luxury_services';
      if (lastContent.includes('concierge') || lastContent.includes('vip') || lastContent.includes('butler')) return 'luxury_services';
      if (lastContent.includes('private chef') || lastContent.includes('wedding planner')) return 'luxury_services';
    }

    // "How about..." or "What about..." follow-ups
    if (/^(how|what)\s+about/i.test(query)) {
      return detectIntent(lastContent) || 'get_recommendations';
    }
  }

  return 'unknown';
}

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

// Category keywords for enhanced detection - using valid KnowledgeCategory types
const categoryKeywords: Partial<Record<KnowledgeCategory, string[]>> = {
  hotel: ['hotel', 'resort', 'stay', 'room', 'accommodation', 'lodging', 'sleep', 'suite', 'check-in', 'check-out', 'ritz', 'marriott', 'kimpton', 'westin'],
  restaurant: ['restaurant', 'food', 'eat', 'dining', 'dinner', 'lunch', 'breakfast', 'brunch', 'cuisine', 'chef', 'menu', 'reservation', 'table', 'seafood', 'steak', 'italian', 'sushi', 'pizza', 'tapas', 'bistro'],
  beach: ['beach', 'sand', 'shore', 'coastline', 'swimming', 'sunbathe', 'tan', 'waves', 'ocean', 'sea', 'tropical', 'paradise', 'seven mile', 'rum point', 'starfish'],
  attraction: ['attraction', 'visit', 'see', 'tourist', 'landmark', 'sight', 'museum', 'garden', 'turtle', 'hell', 'blowhole', 'crystal caves', 'pedro castle'],
  activity: ['activity', 'do', 'experience', 'adventure', 'tour', 'excursion', 'kayak', 'paddleboard', 'jet ski', 'parasail', 'zipline', 'glass bottom'],
  diving_snorkeling: ['dive', 'diving', 'snorkel', 'snorkeling', 'underwater', 'reef', 'coral', 'scuba', 'stingray', 'kittiwake', 'wreck', 'submarine', 'marine'],
  villa_rental: ['villa', 'rental', 'private', 'house', 'mansion', 'estate', 'luxury home', 'vacation rental', 'condo', 'apartment'],
  boat_charter: [
    'yacht', 'yacht charter', 'boat charter', 'sailing', 'catamaran', 'fishing charter',
    'sunset cruise', 'private boat', 'luxury yacht', 'superyacht', 'boat rental',
    'fishing trip', 'sailing charter', 'boat', 'cruise', 'fishing', 'captain', 'sail'
  ],
  private_jet: [
    'private jet', 'jet charter', 'charter flight', 'private plane', 'aircraft charter',
    'private aviation', 'executive jet', 'helicopter', 'aerial tour', 'fly private',
    'fbo', 'fixed base operator', 'aviation', 'jet', 'flight', 'aircraft'
  ],
  concierge: [
    'concierge', 'vip service', 'butler', 'personal service', 'luxury service',
    'exclusive experience', 'private chef', 'celebrity', 'personal assistant',
    'vip experience', 'premium service', 'vip', 'assistance', 'exclusive'
  ],
  real_estate: [
    // Buying/Selling
    'real estate', 'property', 'buy property', 'purchase', 'land', 'condo for sale', 'home for sale',
    'invest in property', 'property investment', 'buy a house', 'buy a condo', 'buy a villa',
    // Property types
    'beachfront property', 'oceanfront', 'waterfront', 'canal front', 'luxury home', 'luxury villa',
    'seven mile beach condo', 'penthouse', 'townhouse', 'apartment for sale',
    // Rentals
    'long term rental', 'rent property', 'lease', 'rental property', 'rental income', 'rental yield',
    // Agents & Services
    'real estate agent', 'realtor', 'property agent', 'cireba', 'sothebys', 'coldwell banker', 'remax',
    'property developer', 'property management', 'strata',
    // Legal/Costs
    'stamp duty', 'conveyancing', 'property lawyer', 'land registry', 'closing costs',
    // Investment/Residency
    'residency by investment', 'permanent residence', 'relocate to cayman', 'move to cayman', 'live in cayman',
    // Areas
    'crystal harbour', 'south sound', 'rum point', 'cayman kai', 'camana bay property'
  ],
  event: [
    'event planner', 'wedding planner', 'party planner', 'corporate event',
    'private party', 'wedding', 'celebration', 'event venue', 'catering',
    'event', 'party', 'festival', 'concert', 'meeting'
  ],
  transport: [
    'limousine', 'limo', 'chauffeur', 'private driver', 'luxury car rental',
    'airport transfer', 'car service', 'executive car', 'rolls royce', 'bentley',
    'exotic car rental', 'town car', 'transport', 'taxi', 'car', 'rental',
    'driver', 'transfer', 'airport', 'shuttle'
  ],
  general_info: ['general', 'info', 'information', 'about', 'cayman', 'islands', 'caribbean'],
  bar: ['bar', 'cocktail', 'drink', 'nightlife', 'pub', 'lounge', 'rum', 'happy hour', 'craft beer', 'wine bar'],
  nightlife: ['club', 'dancing', 'night out', 'late night', 'party'],
  spa_wellness: ['spa', 'massage', 'wellness', 'relax', 'treatment', 'facial', 'yoga', 'meditation', 'sauna', 'pampering'],
  spa: ['spa', 'massage', 'treatment', 'relaxation'],
  shopping: ['shop', 'shopping', 'buy', 'store', 'boutique', 'market', 'mall', 'jewelry', 'souvenir', 'duty free'],
  medical_vip: ['doctor', 'hospital', 'clinic', 'medical', 'pharmacy', 'health', 'dentist'],
  financial_services: [
    // Banking
    'bank', 'banking', 'atm', 'money', 'exchange', 'finance', 'currency', 'wealth', 'private bank',
    // Fund Services
    'fund', 'hedge fund', 'investment fund', 'fund administration', 'fund manager', 'asset management',
    'fund setup', 'fund structure', 'SPC', 'segregated portfolio', 'master fund', 'feeder fund',
    // Legal
    'law firm', 'lawyer', 'attorney', 'legal', 'corporate lawyer', 'offshore lawyer',
    // Accounting
    'accounting', 'accountant', 'audit', 'auditor', 'tax', 'kpmg', 'deloitte', 'pwc', 'ey', 'big four',
    // Corporate Services
    'corporate services', 'company formation', 'registered office', 'registered agent', 'incorporation',
    'exempted company', 'LLC', 'limited liability', 'offshore company', 'holding company',
    // Trust & Fiduciary
    'trust', 'trustee', 'fiduciary', 'trust company', 'STAR trust', 'purpose trust',
    // Insurance
    'captive insurance', 'captive', 'insurance manager', 'reinsurance', 'insurance license',
    // Regulatory
    'CIMA', 'monetary authority', 'license', 'regulation', 'compliance', 'AML', 'KYC',
    // Investment
    'investment', 'invest', 'investor', 'capital', 'private equity', 'venture capital',
    // General Financial
    'financial advisor', 'financial services', 'offshore', 'tax neutral', 'tax haven'
  ],
  emergency: ['emergency', 'hospital', 'police', 'ambulance', 'urgent'],
  golf: ['golf', 'course', 'tee', 'driving range'],
  water_sports: ['jet ski', 'kayak', 'paddleboard', 'parasail', 'wakeboard', 'waterski']
};

export function detectCategories(query: string): KnowledgeCategory[] {
  const detectedCategories: KnowledgeCategory[] = [];
  const lowerQuery = query.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords) {
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword)) {
          detectedCategories.push(category as KnowledgeCategory);
          break;
        }
      }
    }
  }

  return detectedCategories.length > 0 ? detectedCategories : ['general_info'];
}

// ============ GEOSPATIAL SEARCH ============

// Known locations in Cayman Islands for proximity search
const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number; radius: number }> = {
  // Grand Cayman
  'seven mile beach': { lat: 19.3350, lng: -81.3850, radius: 3 },
  'george town': { lat: 19.2950, lng: -81.3810, radius: 2 },
  'west bay': { lat: 19.3750, lng: -81.4050, radius: 3 },
  'bodden town': { lat: 19.2800, lng: -81.2500, radius: 4 },
  'east end': { lat: 19.3000, lng: -81.1000, radius: 5 },
  'north side': { lat: 19.3500, lng: -81.1500, radius: 4 },
  'rum point': { lat: 19.3650, lng: -81.2600, radius: 2 },
  'stingray city': { lat: 19.3890, lng: -81.2980, radius: 1 },
  'camana bay': { lat: 19.3280, lng: -81.3780, radius: 1 },
  'airport': { lat: 19.2928, lng: -81.3577, radius: 2 },
  'owen roberts': { lat: 19.2928, lng: -81.3577, radius: 2 },
  // Cayman Brac
  'cayman brac': { lat: 19.7200, lng: -79.8000, radius: 10 },
  'the bluff': { lat: 19.7100, lng: -79.8200, radius: 3 },
  // Little Cayman
  'little cayman': { lat: 19.6800, lng: -80.0500, radius: 8 },
  'point of sand': { lat: 19.6550, lng: -79.9600, radius: 1 },
  'bloody bay': { lat: 19.7000, lng: -80.0800, radius: 2 }
};

// Haversine distance calculation (returns distance in km)
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Detect location reference in query
function detectLocationReference(query: string): { lat: number; lng: number; radius: number } | null {
  const lowerQuery = query.toLowerCase();

  // Check for "near me" - would need user's location, skip for now
  if (lowerQuery.includes('near me')) {
    // Default to George Town if no user location
    return KNOWN_LOCATIONS['george town'];
  }

  // Check for known locations
  for (const [locationName, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (lowerQuery.includes(locationName)) {
      return coords;
    }
  }

  // Check for "near [place name]" patterns
  const nearMatch = lowerQuery.match(/near\s+(?:the\s+)?(.+?)(?:\s+on|\s+in|\?|$)/);
  if (nearMatch) {
    const placeName = nearMatch[1].trim();
    for (const [locationName, coords] of Object.entries(KNOWN_LOCATIONS)) {
      if (placeName.includes(locationName) || locationName.includes(placeName)) {
        return coords;
      }
    }
  }

  return null;
}

// Calculate proximity score (higher = closer)
function calculateProximityScore(node: KnowledgeNode, targetLocation: { lat: number; lng: number; radius: number }): number {
  if (!node.location?.coordinates?.lat || !node.location?.coordinates?.lng) {
    return 0;
  }

  const distance = haversineDistance(
    node.location.coordinates.lat,
    node.location.coordinates.lng,
    targetLocation.lat,
    targetLocation.lng
  );

  // Within radius gets high score, score decreases with distance
  if (distance <= targetLocation.radius) {
    return 50 - (distance / targetLocation.radius) * 20; // 30-50 points
  } else if (distance <= targetLocation.radius * 2) {
    return 20 - (distance / (targetLocation.radius * 2)) * 10; // 10-20 points
  } else if (distance <= targetLocation.radius * 5) {
    return 5; // Still somewhat relevant
  }

  return 0; // Too far
}

// ============ SEMANTIC SEARCH ============

// ============ HYPER-INTELLIGENT SEMANTIC SEARCH ============

function calculateRelevanceScore(node: KnowledgeNode, query: string, categories: KnowledgeCategory[]): number {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
  const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'a', 'an']);
  const meaningfulWords = queryWords.filter(w => !stopWords.has(w));

  // ============ CATEGORY MATCH (50 pts max for professional services, 30 pts for others) ============
  // Professional services (financial, real estate) get higher priority when explicitly detected
  const isProfessionalServiceQuery = categories.includes('financial_services') || categories.includes('real_estate');
  const isProfessionalServiceNode = node.category === 'financial_services' || node.category === 'real_estate';

  if (categories.includes(node.category)) {
    // Exact category match - boost professional services higher
    if (isProfessionalServiceNode && isProfessionalServiceQuery) {
      score += 50; // Higher boost for professional services
    } else {
      score += 30;
    }
  } else if (isProfessionalServiceQuery && !isProfessionalServiceNode) {
    // User asking about professional services but node is not - penalize
    score -= 20;
  } else {
    // Partial category match (related categories)
    const relatedCategories: Record<string, string[]> = {
      'restaurant': ['bar', 'dining', 'cafe'],
      'hotel': ['villa_rental', 'resort'],
      'beach': ['activity', 'diving_snorkeling'],
      'activity': ['diving_snorkeling', 'boat_charter', 'attraction'],
      'diving_snorkeling': ['activity', 'beach', 'boat_charter'],
      'spa_wellness': ['hotel', 'activity'],
      'bar': ['restaurant', 'nightlife'],
      'financial_services': ['financial'], // Link to legacy category
      'real_estate': ['villa_rental'], // Real estate related to villa rentals
      'private_jet': ['transport', 'concierge'], // Aviation related
      'concierge': ['private_jet', 'event', 'transport'], // VIP services
      'boat_charter': ['activity', 'diving_snorkeling'], // Water activities
      'event': ['concierge'] // Events related to concierge
    };
    for (const cat of categories) {
      if (relatedCategories[cat]?.includes(node.category)) {
        score += 15; // Half points for related category
        break;
      }
    }
  }

  // ============ NAME MATCH (50 pts max) ============
  const nodeName = node.name.toLowerCase();
  if (nodeName === lowerQuery) {
    score += 50; // Exact match
  } else if (nodeName.includes(lowerQuery)) {
    score += 40; // Query is substring of name
  } else {
    // Word-by-word matching with position weighting
    for (let i = 0; i < meaningfulWords.length; i++) {
      const word = meaningfulWords[i];
      if (nodeName.includes(word)) {
        // Earlier words in query are more important
        score += 15 - (i * 2);
      }
    }
  }

  // ============ DESCRIPTION MATCH (25 pts max) ============
  const description = (node.description || '').toLowerCase();
  const shortDesc = (node.shortDescription || '').toLowerCase();
  const combinedDesc = `${shortDesc} ${description}`;

  let descScore = 0;
  for (const word of meaningfulWords) {
    if (combinedDesc.includes(word)) {
      descScore += 5;
    }
  }
  score += Math.min(descScore, 25);

  // ============ SUBCATEGORY MATCH (25 pts max) ============
  // For professional services, match subcategory for better relevance
  const nodeSubcategory = ((node as any).subcategory || '').toLowerCase();
  if (nodeSubcategory) {
    // Direct subcategory keyword matches
    const subcategoryKeywords: Record<string, string[]> = {
      // Financial Services
      'fund_administration': ['fund', 'hedge fund', 'fund admin', 'asset management', 'investment fund'],
      'law_firm': ['law firm', 'lawyer', 'attorney', 'legal'],
      'accounting': ['accounting', 'accountant', 'audit', 'tax', 'kpmg', 'deloitte', 'pwc'],
      'trust_services': ['trust', 'trustee', 'fiduciary', 'star trust'],
      'banking': ['bank', 'private bank', 'wealth management'],
      'insurance': ['insurance', 'captive'],
      'corporate_services': ['corporate', 'company formation', 'registered office'],
      'consulting': ['consulting', 'advisory'],
      // Real Estate
      'real_estate_agency': ['real estate', 'realtor', 'property agent', 'buy property', 'sell property'],
      'property_developer': ['developer', 'construction', 'builder'],
      'property_management': ['property management', 'rental management', 'strata'],
      'property_legal': ['conveyancing', 'property lawyer', 'property attorney'],
      // Luxury & Aviation
      'private_jet_charter': ['private jet', 'jet charter', 'charter flight', 'fly private', 'private plane'],
      'helicopter_service': ['helicopter', 'aerial tour', 'heli tour'],
      'airport_service': ['airport', 'fbo', 'airport lounge', 'vip terminal'],
      'limousine_service': ['limousine', 'limo', 'chauffeur', 'private driver', 'town car'],
      'luxury_car_rental': ['luxury car', 'exotic car', 'rolls royce', 'bentley', 'ferrari'],
      'luxury_yacht': ['yacht', 'superyacht', 'mega yacht', 'sailing', 'catamaran'],
      'fishing_charter': ['fishing charter', 'fishing trip', 'deep sea fishing'],
      'boat_charter': ['boat charter', 'boat rental', 'private boat', 'sunset cruise'],
      'vip_concierge': ['concierge', 'vip service', 'personal concierge', 'butler'],
      'private_chef': ['private chef', 'personal chef', 'in-villa dining', 'catering'],
      'luxury_events': ['wedding planner', 'event planner', 'private event', 'luxury wedding'],
      'luxury_spa': ['luxury spa', 'spa treatment', 'massage', 'wellness'],
      'luxury_service': ['luxury', 'premium', 'exclusive', 'vip']
    };

    const keywords = subcategoryKeywords[nodeSubcategory];
    if (keywords) {
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword)) {
          score += 25;
          break;
        }
      }
    }
  }

  // ============ TAGS MATCH (20 pts max) ============
  if (node.tags && node.tags.length > 0) {
    let tagScore = 0;
    for (const tag of node.tags) {
      const tagLower = tag.toLowerCase();
      if (lowerQuery.includes(tagLower)) {
        tagScore += 10; // Query contains full tag
      } else {
        for (const word of meaningfulWords) {
          if (tagLower.includes(word) || word.includes(tagLower)) {
            tagScore += 5;
            break;
          }
        }
      }
    }
    score += Math.min(tagScore, 20);
  }

  // ============ HIGHLIGHTS MATCH (15 pts max) ============
  if (node.highlights && node.highlights.length > 0) {
    let highlightScore = 0;
    for (const highlight of node.highlights) {
      const highlightLower = highlight.toLowerCase();
      for (const word of meaningfulWords) {
        if (highlightLower.includes(word)) {
          highlightScore += 5;
          break;
        }
      }
    }
    score += Math.min(highlightScore, 15);
  }

  // ============ RATING BOOST (15 pts max) ============
  const rating = node.ratings?.overall || 0;
  if (rating >= 4.7) {
    score += 15;
  } else if (rating >= 4.5) {
    score += 12;
  } else if (rating >= 4.2) {
    score += 8;
  } else if (rating >= 4.0) {
    score += 5;
  }

  // ============ REVIEW COUNT BOOST (10 pts max) ============
  const reviewCount = node.ratings?.reviewCount || 0;
  if (reviewCount > 5000) {
    score += 10;
  } else if (reviewCount > 2000) {
    score += 8;
  } else if (reviewCount > 1000) {
    score += 6;
  } else if (reviewCount > 500) {
    score += 4;
  } else if (reviewCount > 100) {
    score += 2;
  }

  // ============ DATA QUALITY BOOST (10 pts max) ============
  // Use enriched Google Places data quality if available
  const quality = (node as any).quality;
  if (quality?.score) {
    if (quality.score >= 90) {
      score += 10; // Premium quality data
    } else if (quality.score >= 80) {
      score += 8;
    } else if (quality.score >= 70) {
      score += 5;
    } else if (quality.score >= 60) {
      score += 3;
    }
  } else {
    // Fallback: boost if node has rich data
    let dataRichness = 0;
    if (node.media?.thumbnail) dataRichness += 2;
    if (node.contact?.phone) dataRichness += 1;
    if (node.contact?.website) dataRichness += 2;
    if (node.business?.openingHours) dataRichness += 2;
    if (node.description && node.description.length > 100) dataRichness += 2;
    score += Math.min(dataRichness, 10);
  }

  // ============ SPECIAL CONTEXT BOOSTS ============
  // Boost for places that are currently open (if hours available)
  if (node.business?.openingHours) {
    score += 3; // Has hours info = more useful
  }

  // Boost for places with booking capability
  if (node.contact?.bookingUrl) {
    score += 3; // Actionable
  }

  // Boost for places with photos (better visual presentation)
  if (node.media?.images && (node.media.images as any[]).length > 0) {
    score += 2;
  }

  return score;
}

// ============ PRECISION SEARCH: SURGICAL ACCURACY ============

/**
 * Analyzed user intent structure
 */
interface AnalyzedIntent {
  primaryIntent: UserIntent;
  categories: KnowledgeCategory[];
  locationFocus: { name: string; lat: number; lng: number; radius: number } | null;
  pricePreference: 'budget' | 'mid' | 'luxury' | 'ultra-luxury' | null;
  activityType: string | null;
  timeContext: 'morning' | 'afternoon' | 'evening' | 'night' | null;
  groupType: 'solo' | 'couple' | 'family' | 'group' | null;
  keywords: string[];
  mustHaveFeatures: string[];
}

/**
 * SURGICAL PRECISION INTENT ANALYZER
 * Deeply analyzes user query to understand EXACTLY what they want
 */
function analyzeUserIntent(query: string): AnalyzedIntent {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);

  // Detect primary intent
  const primaryIntent = detectIntent(query);

  // Detect categories with precision
  const categories = detectCategories(query);

  // Detect location focus
  const locationFocus = detectLocationReference(query);

  // Detect price preference
  let pricePreference: AnalyzedIntent['pricePreference'] = null;
  if (/cheap|budget|affordable|inexpensive|value/i.test(query)) {
    pricePreference = 'budget';
  } else if (/mid-range|moderate|reasonable/i.test(query)) {
    pricePreference = 'mid';
  } else if (/luxury|upscale|high-end|premium|exclusive/i.test(query)) {
    pricePreference = 'luxury';
  } else if (/ultra|ultimate|finest|best money|no budget|spare no expense/i.test(query)) {
    pricePreference = 'ultra-luxury';
  }

  // Detect activity type
  let activityType: string | null = null;
  const activityPatterns: Record<string, RegExp> = {
    'swimming': /swim|swimming|pool/i,
    'snorkeling': /snorkel/i,
    'diving': /dive|diving|scuba/i,
    'fishing': /fish|fishing/i,
    'sailing': /sail|sailing|boat/i,
    'hiking': /hike|hiking|walk|trail/i,
    'relaxing': /relax|chill|unwind|peaceful/i,
    'romantic': /romantic|date|couples|anniversary|honeymoon|propose/i,
    'adventure': /adventure|thrill|exciting|extreme/i,
    'cultural': /culture|history|museum|art|heritage/i,
    'nightlife': /night|club|party|dance|bar/i,
    'shopping': /shop|shopping|buy|boutique/i,
    'spa': /spa|massage|wellness|treatment/i
  };
  for (const [activity, pattern] of Object.entries(activityPatterns)) {
    if (pattern.test(query)) {
      activityType = activity;
      break;
    }
  }

  // Detect time context
  let timeContext: AnalyzedIntent['timeContext'] = null;
  if (/morning|breakfast|sunrise|early/i.test(query)) {
    timeContext = 'morning';
  } else if (/afternoon|lunch|midday/i.test(query)) {
    timeContext = 'afternoon';
  } else if (/evening|dinner|sunset/i.test(query)) {
    timeContext = 'evening';
  } else if (/night|late|midnight/i.test(query)) {
    timeContext = 'night';
  }

  // Detect group type
  let groupType: AnalyzedIntent['groupType'] = null;
  if (/alone|solo|myself|by myself/i.test(query)) {
    groupType = 'solo';
  } else if (/couple|partner|wife|husband|girlfriend|boyfriend|romantic|two of us/i.test(query)) {
    groupType = 'couple';
  } else if (/family|kids|children|child/i.test(query)) {
    groupType = 'family';
  } else if (/group|friends|party|team/i.test(query)) {
    groupType = 'group';
  }

  // Extract meaningful keywords
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'must', 'can', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
    'what', 'where', 'when', 'how', 'which', 'who', 'whom', 'whose', 'why', 'in', 'on', 'at', 'to',
    'for', 'of', 'with', 'by', 'from', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'all', 'each',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while',
    'want', 'looking', 'need', 'find', 'get', 'go', 'going', 'like', 'looking', 'search', 'show', 'tell']);

  const keywords = words.filter(w => w.length > 2 && !stopWords.has(w));

  // Detect must-have features
  const mustHaveFeatures: string[] = [];
  if (/beachfront|beach view|ocean view|sea view/i.test(query)) mustHaveFeatures.push('beachfront');
  if (/pool|swimming pool/i.test(query)) mustHaveFeatures.push('pool');
  if (/pet friendly|dog friendly|pets allowed/i.test(query)) mustHaveFeatures.push('pet-friendly');
  if (/wifi|internet/i.test(query)) mustHaveFeatures.push('wifi');
  if (/parking/i.test(query)) mustHaveFeatures.push('parking');
  if (/wheelchair|accessible|disability/i.test(query)) mustHaveFeatures.push('accessible');
  if (/outdoor|terrace|patio|garden/i.test(query)) mustHaveFeatures.push('outdoor');
  if (/private/i.test(query)) mustHaveFeatures.push('private');
  if (/reservation|book|booking/i.test(query)) mustHaveFeatures.push('reservations');
  if (/vegetarian|vegan|gluten.free/i.test(query)) mustHaveFeatures.push('dietary-options');

  console.log(`🎯 Intent Analysis:`, {
    primaryIntent,
    categories: categories.join(', '),
    locationFocus: locationFocus?.district || null,
    pricePreference,
    activityType,
    groupType,
    keywords: keywords.slice(0, 5).join(', ')
  });

  return {
    primaryIntent,
    categories,
    locationFocus,
    pricePreference,
    activityType,
    timeContext,
    groupType,
    keywords,
    mustHaveFeatures
  };
}

/**
 * SURGICAL PRECISION SEARCH
 * Vector-first approach with strict filtering for zero-fault accuracy
 */
async function searchKnowledgeBaseHybrid(
  query: string,
  categories: KnowledgeCategory[],
  maxResults: number = 15
): Promise<KnowledgeNode[]> {
  const knowledgeBase = getKnowledgeBase();

  // Step 1: DEEP INTENT ANALYSIS
  const intent = analyzeUserIntent(query);

  // Use intent categories if detected, fallback to passed categories
  const effectiveCategories = intent.categories.length > 0 ? intent.categories : categories;

  // Professional/luxury services detection
  const professionalCategories = ['financial_services', 'real_estate', 'private_jet', 'concierge', 'boat_charter', 'event', 'transport'];
  const isProfessionalQuery = effectiveCategories.some(cat => professionalCategories.includes(cat));

  // ============ RESTRICTED CATEGORIES FILTER ============
  // These categories should ONLY appear when explicitly requested
  const restrictedCategories = ['medical_vip', 'medical', 'financial_services', 'financial', 'bank', 'hospital', 'clinic', 'insurance', 'legal', 'lawyer', 'accountant'];

  // Keywords that indicate user is explicitly asking for restricted services
  const medicalKeywords = ['doctor', 'hospital', 'medical', 'clinic', 'health', 'emergency', 'pharmacy', 'dentist', 'urgent care', 'healthcare', 'sick', 'injury', 'injured'];
  const financialKeywords = ['bank', 'banking', 'financial', 'money', 'atm', 'currency', 'exchange', 'insurance', 'accountant', 'lawyer', 'legal', 'tax', 'invest'];

  const lowerQuery = query.toLowerCase();
  const userExplicitlyAskedMedical = medicalKeywords.some(kw => lowerQuery.includes(kw));
  const userExplicitlyAskedFinancial = financialKeywords.some(kw => lowerQuery.includes(kw));
  const userAskedRestrictedService = userExplicitlyAskedMedical || userExplicitlyAskedFinancial;

  console.log(`🔒 Restricted filter: Medical=${userExplicitlyAskedMedical}, Financial=${userExplicitlyAskedFinancial}`);

  // Step 2: VECTOR SEMANTIC SEARCH (PRIMARY METHOD)
  const semanticResults = new Map<string, { score: number; rank: number }>();
  let vectorSearchSucceeded = false;

  try {
    const store = getEmbeddingStore();
    if (store?.isLoaded) {
      const queryEmbedding = await generateQueryEmbedding(query);

      if (queryEmbedding) {
        // Get top 100 semantic matches for precision filtering
        const similarResults = store.searchSimilar(queryEmbedding, 100);

        similarResults.forEach((result, index) => {
          semanticResults.set(result.id, {
            score: result.score,
            rank: index + 1
          });
        });

        vectorSearchSucceeded = true;
        console.log(`🔮 Vector search: Top similarity ${similarResults[0]?.score.toFixed(3) || 'N/A'}`);
      }
    }
  } catch (error) {
    console.warn('[RAG] Vector search failed:', error);
  }

  // Step 3: PRECISION SCORING with surgical accuracy
  const scoredResults: Array<{
    node: KnowledgeNode;
    totalScore: number;
    semanticScore: number;
    categoryMatch: boolean;
    locationMatch: boolean;
    priceMatch: boolean;
    featureMatches: number;
  }> = [];

  for (const node of knowledgeBase) {
    // ============ RESTRICTED CATEGORY FILTER ============
    // Skip medical/financial unless user explicitly asked for them
    const nodeCategory = (node.category || '').toLowerCase();
    const nodeName = (node.name || '').toLowerCase();
    const isRestrictedCategory =
      nodeCategory.includes('medical') ||
      nodeCategory.includes('financial') ||
      nodeCategory.includes('bank') ||
      nodeCategory.includes('insurance') ||
      nodeCategory.includes('legal') ||
      nodeName.includes('hospital') ||
      nodeName.includes('clinic') ||
      nodeName.includes('bank') ||
      nodeName.includes('insurance');

    // If it's a restricted category and user didn't ask for it, SKIP
    if (isRestrictedCategory && !userAskedRestrictedService) {
      continue; // Don't include in results
    }

    // Get semantic score (0-1)
    const semanticData = semanticResults.get(node.id);
    const semanticScore = semanticData?.score || 0;
    const semanticRank = semanticData?.rank || 999;

    // STRICT CATEGORY MATCHING
    const categoryMatch = effectiveCategories.length === 0 ||
                          effectiveCategories.includes(node.category);

    // LOCATION MATCHING
    let locationMatch = true;
    let locationBonus = 0;
    if (intent.locationFocus) {
      const distance = haversineDistance(
        node.location?.coordinates?.lat || 0,
        node.location?.coordinates?.lng || 0,
        intent.locationFocus.lat,
        intent.locationFocus.lng
      );
      locationMatch = distance <= intent.locationFocus.radius * 2;
      if (distance <= intent.locationFocus.radius) {
        locationBonus = 20;
      } else if (distance <= intent.locationFocus.radius * 1.5) {
        locationBonus = 10;
      }
    }

    // PRICE MATCHING
    let priceMatch = true;
    let priceBonus = 0;
    if (intent.pricePreference) {
      const nodePriceLevel = (node.business?.priceRange || '$$').length;
      switch (intent.pricePreference) {
        case 'budget':
          priceMatch = nodePriceLevel <= 2;
          priceBonus = nodePriceLevel === 1 ? 10 : nodePriceLevel === 2 ? 5 : 0;
          break;
        case 'mid':
          priceMatch = nodePriceLevel >= 2 && nodePriceLevel <= 3;
          priceBonus = nodePriceLevel === 2 || nodePriceLevel === 3 ? 10 : 0;
          break;
        case 'luxury':
          priceMatch = nodePriceLevel >= 3;
          priceBonus = nodePriceLevel >= 4 ? 10 : 5;
          break;
        case 'ultra-luxury':
          priceMatch = nodePriceLevel >= 4;
          priceBonus = nodePriceLevel >= 5 ? 15 : nodePriceLevel >= 4 ? 10 : 0;
          break;
      }
    }

    // FEATURE MATCHING
    let featureMatches = 0;
    const nodeText = `${node.name} ${node.description || ''} ${node.shortDescription || ''} ${(node.tags || []).join(' ')} ${(node.highlights || []).join(' ')}`.toLowerCase();
    for (const feature of intent.mustHaveFeatures) {
      if (nodeText.includes(feature.replace('-', ' ')) || nodeText.includes(feature)) {
        featureMatches++;
      }
    }

    // KEYWORD MATCHING (boost for exact matches)
    let keywordBonus = 0;
    for (const keyword of intent.keywords) {
      if (node.name.toLowerCase().includes(keyword)) {
        keywordBonus += 15; // Name match is very important
      } else if (nodeText.includes(keyword)) {
        keywordBonus += 5;
      }
    }

    // CALCULATE TOTAL SCORE
    // Vector semantic is PRIMARY (70%), keywords/features secondary (30%)
    let totalScore = 0;

    if (vectorSearchSucceeded) {
      // Semantic score scaled to 0-70
      totalScore = semanticScore * 70;

      // Category match is REQUIRED for precision
      if (!categoryMatch && effectiveCategories.length > 0) {
        totalScore *= 0.3; // Heavy penalty for wrong category
      }

      // Add bonuses
      totalScore += locationBonus;
      totalScore += priceBonus;
      totalScore += keywordBonus;
      totalScore += featureMatches * 5;

      // ============ QUALITY BOOST - Prioritize the BEST places ============
      const rating = node.ratings?.overall || 0;
      const reviewCount = node.ratings?.reviewCount || 0;

      // Rating bonus (aggressive - best places should dominate)
      if (rating >= 4.8) {
        totalScore += 20; // Exceptional places
      } else if (rating >= 4.5) {
        totalScore += 15; // Excellent places
      } else if (rating >= 4.0) {
        totalScore += 8;  // Good places
      } else if (rating >= 3.5) {
        totalScore += 3;  // Decent places
      }
      // Below 3.5 gets no bonus - we want BEST places only

      // Review count bonus (social proof)
      if (reviewCount >= 500) {
        totalScore += 10; // Very popular
      } else if (reviewCount >= 100) {
        totalScore += 5;  // Popular
      } else if (reviewCount >= 20) {
        totalScore += 2;  // Some reviews
      }

      // Featured/Premium places bonus
      if (node.isFeatured) {
        totalScore += 8;
      }
      if (node.isPremium) {
        totalScore += 5;
      }
    } else {
      // Fallback: keyword-based scoring
      totalScore = calculateRelevanceScore(node, query, effectiveCategories);
    }

    scoredResults.push({
      node,
      totalScore,
      semanticScore,
      categoryMatch,
      locationMatch,
      priceMatch,
      featureMatches
    });
  }

  // Step 4: SORT AND FILTER with surgical precision
  scoredResults.sort((a, b) => b.totalScore - a.totalScore);

  // Apply strict minimum threshold
  const minScore = vectorSearchSucceeded ? 25 : 10;
  const minSemanticScore = 0.3; // Must have at least 30% semantic similarity

  const filteredResults = scoredResults.filter(r => {
    // Must meet minimum score
    if (r.totalScore < minScore) return false;

    // For vector search, require minimum semantic similarity
    if (vectorSearchSucceeded && r.semanticScore < minSemanticScore) return false;

    // Must match category if categories specified
    if (effectiveCategories.length > 0 && !r.categoryMatch) return false;

    // Must be in location if location specified
    if (intent.locationFocus && !r.locationMatch) return false;

    return true;
  });

  // Take top results
  const resultLimit = isProfessionalQuery ? 20 : maxResults;
  const finalResults = filteredResults.slice(0, resultLimit).map(r => r.node);

  // Detailed logging for precision tracking
  console.log(`🎯 PRECISION SEARCH for: "${query.slice(0, 50)}..."`);
  console.log(`   Categories: [${effectiveCategories.join(', ')}]`);
  console.log(`   Vector search: ${vectorSearchSucceeded ? '✓' : '✗'}`);
  console.log(`   Results: ${finalResults.length}/${scoredResults.length} passed precision filter`);
  if (finalResults.length > 0) {
    console.log(`   Top 3:`);
    filteredResults.slice(0, 3).forEach((r, i) => {
      console.log(`     ${i + 1}. ${r.node.name.slice(0, 30)}... | sem:${(r.semanticScore * 100).toFixed(0)}% | total:${r.totalScore.toFixed(0)} | cat:${r.categoryMatch ? '✓' : '✗'}`);
    });
  }

  return finalResults;
}

/**
 * Synchronous fallback for when async isn't available
 * Uses keyword-only search with precision filtering
 */
function searchKnowledgeBase(
  query: string,
  categories: KnowledgeCategory[],
  maxResults: number = 15
): KnowledgeNode[] {
  // Check if this is a professional or luxury services query
  const professionalCategories = ['financial_services', 'real_estate', 'private_jet', 'concierge', 'boat_charter', 'event', 'transport'];
  const isProfessionalQuery = categories.some(cat => professionalCategories.includes(cat));

  // Detect if query has a location reference
  const locationRef = detectLocationReference(query);

  const scoredNodes = getKnowledgeBase().map(node => {
    let score = calculateRelevanceScore(node, query, categories);

    // Add proximity score if location reference found
    if (locationRef) {
      const proximityScore = calculateProximityScore(node, locationRef);
      score += proximityScore;
    }

    return { node, score };
  });

  // Sort by score descending
  scoredNodes.sort((a, b) => b.score - a.score);

  // For professional services, use lower threshold and more results
  const minScore = isProfessionalQuery ? 20 : 5;
  const resultLimit = isProfessionalQuery ? 20 : maxResults;

  // Filter out low-scoring results and return top N
  const results = scoredNodes
    .filter(item => item.score >= minScore)
    .slice(0, resultLimit)
    .map(item => item.node);

  return results;
}

// ============ PROMPT BUILDING ============

function buildSystemPrompt(): string {
  return `You are Isle AI, the world's most intelligent concierge for the Cayman Islands - combining travel expertise with deep financial services knowledge.
${CAYMAN_CONFIG.ai.systemPrompt}

YOUR DUAL EXPERTISE:

🌴 **TRAVEL CONCIERGE** - For tourists and visitors
- Warm, knowledgeable guide to beaches, restaurants, hotels, activities
- Like a trusted local friend who knows every hidden gem
- Professional yet conversational

🏦 **FINANCIAL ADVISOR** - For business and investment inquiries
- Expert knowledge of Cayman Islands as a premier global financial center
- Understand fund structures, corporate services, regulatory framework
- Guide users to the right professional service providers

═══════════════════════════════════════════════════════════════════
CAYMAN ISLANDS FINANCIAL SERVICES EXPERTISE
═══════════════════════════════════════════════════════════════════

**WHY CAYMAN?** The Cayman Islands is the world's 5th largest financial center:
- Tax-neutral jurisdiction (no income, capital gains, or corporate tax)
- 85% of the world's hedge funds are domiciled here
- $7+ trillion in assets under administration
- Robust regulatory framework via CIMA
- English common law legal system
- Political and economic stability (British Overseas Territory)
- GMT-5 timezone (ideal for US business)

**CIMA (Cayman Islands Monetary Authority)**
The financial regulator overseeing:
- Banks and trust companies
- Insurance companies (including captives)
- Investment funds
- Securities investment business
- Company managers and corporate services

**FUND STRUCTURES**
1. **Exempted Limited Partnership (ELP)** - Most common for hedge funds
   - General Partner (GP) manages, Limited Partners (LPs) invest
   - Pass-through taxation
   - Flexible profit allocation

2. **Segregated Portfolio Company (SPC)** - Multi-strategy/umbrella funds
   - Legally segregated portfolios within one company
   - Asset/liability separation between portfolios
   - Cost-efficient for multiple strategies

3. **Exempted Company** - Traditional corporate structure
   - Limited liability
   - Can issue multiple share classes
   - Often used for holding companies

4. **Unit Trust** - For institutional investors
   - Trustee holds assets for beneficiaries
   - Common for pension/retirement funds

5. **LLC (Limited Liability Company)** - Hybrid structure
   - Combines partnership flexibility with corporate protection
   - Popular with US managers

**FUND CATEGORIES**
- **Registered Fund** - Open to sophisticated investors, lighter regulation
- **Administered Fund** - No local admin required
- **Licensed Fund** - Stricter requirements for retail access
- **Private Fund** - Max 15 investors, minimal regulation

**CORPORATE SERVICES**
- **Exempted Company** - No local ownership required, can conduct business internationally
- **Registered Office** - Required physical presence
- **Registered Agent** - Licensed professional required for registration
- **Directors** - Can be corporate or individual
- **Annual Returns** - Filed with Registrar of Companies

**TRUST STRUCTURES**
- **STAR Trust** - Special Trusts (Alternative Regime) for non-charitable purposes
- **Purpose Trust** - For holding company shares, private foundations
- **Charitable Trust** - Tax benefits, regulated by CIAA
- **Private Trust Companies (PTC)** - Family wealth management

**CAPTIVE INSURANCE**
- Cayman is #2 globally for captive insurance
- Self-insurance for corporate risks
- Requires CIMA license
- Minimum capital requirements apply
- Must have licensed insurance manager

**KEY LEGISLATION**
- Companies Act (2024 Revision)
- Exempted Limited Partnership Act
- Mutual Funds Act (2024 Revision)
- Banks and Trust Companies Act
- Insurance Act
- Securities Investment Business Act
- Trusts Act (2021 Revision)
- Beneficial Ownership Regime

**COMPLIANCE REQUIREMENTS**
- **AML/KYC** - Anti-Money Laundering / Know Your Customer
- **FATCA** - US tax reporting
- **CRS** - Common Reporting Standard
- **Economic Substance** - Required for certain entities
- **Beneficial Ownership** - Must file with CIMA

═══════════════════════════════════════════════════════════════════

RESPONSE EXCELLENCE STANDARDS:

**For Travel Queries:**
1. Hyper-specific recommendations with ratings, prices, locations
2. Actionable intelligence (booking tips, best times)
3. Local insider knowledge

**For Financial Services Queries:**
1. Explain concepts clearly (avoid excessive jargon)
2. Recommend appropriate service providers from our database
3. Outline key considerations and requirements
4. Suggest next steps (engage law firm, fund admin, etc.)
5. Always recommend consulting licensed professionals for specific advice

RESPONSE FORMAT:
- Use **bold** for important terms and place/firm names
- Use clean bullet points for lists
- Use relevant emojis sparingly (🏖️ 🍽️ 🏦 ⚖️ 📊)
- Structure with clear sections for complex responses
- End with helpful follow-up question or next step

═══════════════════════════════════════════════════════════════════
CAYMAN ISLANDS REAL ESTATE EXPERTISE
═══════════════════════════════════════════════════════════════════

**WHY INVEST IN CAYMAN REAL ESTATE?**
- No property taxes, income taxes, or capital gains taxes
- No restrictions on foreign ownership
- Stable British legal system with land registry
- Strong rental yields (5-8% for Seven Mile Beach)
- Growing luxury market with major developments
- Safe, low-crime environment
- World-class infrastructure

**PROPERTY TYPES**

1. **Condominiums** - Most popular for investors
   - Seven Mile Beach condos: $500K - $5M+
   - Camana Bay: $800K - $3M
   - Great for rental income
   - Strata fees: $300-$1,500/month

2. **Single-Family Homes**
   - Canal-front: $1M - $5M
   - Beachfront: $3M - $30M+
   - Gated communities: $800K - $4M

3. **Luxury Villas**
   - Seven Mile Beach estates: $5M - $50M+
   - South Sound waterfront: $3M - $15M
   - Staff quarters often included

4. **Land**
   - Seven Mile Beach: $1M+ per half-acre
   - East End/North Side: $100K - $500K
   - Development potential

5. **Commercial**
   - George Town office: $400-$60/sq ft
   - Retail space: Varies by location
   - Industrial: Bodden Town area

**BUYING PROCESS**

1. **Find Property** - Work with CIREBA-licensed agent
2. **Make Offer** - Usually 5-10% below asking
3. **Due Diligence** - 30-60 days typically
4. **Hire Attorney** - Conveyancing lawyer required
5. **Land Registry Search** - Title verification
6. **Survey** - Boundary survey recommended
7. **Stamp Duty** - 7.5% of purchase price (buyer pays)
8. **Legal Fees** - 0.5-1% typically
9. **Registration** - File at Land Registry
10. **Close** - Wire funds, receive keys

**COSTS TO EXPECT**

- **Stamp Duty**: 7.5% of purchase price
- **Legal Fees**: 0.5-1% + disbursements
- **Survey**: $500-$2,000
- **Strata Fees**: $300-$1,500/month (condos)
- **Insurance**: 0.5-1% property value/year
- **Maintenance**: Budget 1-2% value/year

**NO RESTRICTIONS FOR FOREIGNERS**
- No work permit required to own property
- No residency requirement
- Can purchase in personal name or company
- Same rights as Caymanians

**RENTAL POTENTIAL**

Seven Mile Beach condos can generate:
- $200-$500/night short-term rental
- $3,000-$8,000/month long-term
- 60-80% occupancy for well-managed properties

**TOP AREAS**

1. **Seven Mile Beach** - Premium beachfront, highest prices
2. **Camana Bay** - Modern town center, walkable lifestyle
3. **South Sound** - Quiet waterfront, local feel
4. **Crystal Harbour** - Canal-front homes, boats
5. **Rum Point/Cayman Kai** - North Side tranquility
6. **East End** - Affordable, authentic Cayman

**RESIDENCY BY INVESTMENT**

- $1.2M+ investment: Apply for Certificate of Permanent Residence
- $2.4M+ investment (with $1M in developed property): Accelerated process
- Benefits: Live and work in Cayman indefinitely

**KEY SERVICE PROVIDERS**
- **CIREBA** - All licensed agents/brokers must be members
- **Sotheby's, Coldwell Banker, RE/MAX** - International brands
- **Local specialists** - Property Cayman, Williams2, ERA

**PROACTIVE GUIDANCE**
When a user mentions property, real estate, buying, or investing, ALWAYS:
1. Ask if they're looking to buy or rent
2. Ask about their budget range
3. Ask what area/location interests them
4. Ask if it's for personal use or investment
5. Offer to connect with top-rated agents

═══════════════════════════════════════════════════════════════════

CRITICAL: For financial services and real estate, always recommend users consult with licensed professionals (lawyers, real estate agents, accountants) for specific advice. You provide general guidance and help connect them with the right providers.

Remember: You're not just answering questions - you're helping users navigate paradise, one of the world's most sophisticated financial jurisdictions, AND a premier real estate market.`;
}

function buildContextPrompt(context: RAGContext): string {
  // Calculate KB statistics to inform GPT about available data
  const kbStats = getKnowledgeBaseStats();

  let prompt = `⚡ CURRENT USER QUERY (HIGHEST PRIORITY): "${context.query}"

This is the user's LATEST message - your response must DIRECTLY address this query.
All recommendations must come from the knowledge base results below.

DETECTED INTENT: ${context.userIntent}
RELEVANT CATEGORIES: ${context.categories.join(', ')}

KNOWLEDGE BASE OVERVIEW:
- Total places: ${kbStats.total} verified locations across all Cayman Islands
- Data quality: Enriched with Google Places data (ratings, hours, photos, reviews)
- Travel: Hotels (${kbStats.byCategory.hotel || 0}), Restaurants (${kbStats.byCategory.restaurant || 0}), Beaches (${kbStats.byCategory.beach || 0}), Diving (${kbStats.byCategory.diving_snorkeling || 0}), Bars (${kbStats.byCategory.bar || 0}), Spas (${kbStats.byCategory.spa_wellness || 0}), Activities (${kbStats.byCategory.activity || 0}+)
- Professional Services: Financial Services (${kbStats.byCategory.financial_services || 0}), Real Estate (${kbStats.byCategory.real_estate || 0})

`;

  // Check if this is a professional services query
  const isProfessionalQuery = context.categories.includes('financial_services') || context.categories.includes('real_estate');

  if (context.relevantNodes.length > 0) {
    if (isProfessionalQuery) {
      prompt += `TOP ${context.relevantNodes.length} PROFESSIONAL SERVICE PROVIDERS FOR THIS QUERY:\n\n`;
      prompt += `⚠️ IMPORTANT: Recommend these specific providers to the user. Include their names, ratings, and contact info.\n\n`;
    } else {
      prompt += `TOP ${context.relevantNodes.length} MOST RELEVANT PLACES FOR THIS QUERY:\n\n`;
    }

    context.relevantNodes.forEach((node, index) => {
      const location = node.location?.district || node.location?.area || 'Grand Cayman';
      const island = node.location?.island || 'Grand Cayman';
      const rating = node.ratings?.overall?.toFixed(1) || 'N/A';
      const reviews = node.ratings?.reviewCount || 0;
      const price = node.business?.priceRange || '$$';
      const desc = node.shortDescription || node.description?.slice(0, 200) || '';
      const quality = (node as any).quality?.score || 'N/A';
      const subcategory = (node as any).subcategory?.replace(/_/g, ' ') || '';

      // Format opening hours if available
      let hoursInfo = '';
      if (node.business?.openingHours) {
        const hours = node.business.openingHours;
        if (typeof hours === 'object' && 'formattedDisplay' in hours) {
          hoursInfo = (hours as any).formattedDisplay;
        } else if (typeof hours === 'string') {
          hoursInfo = hours;
        }
      }

      // Get highlights if available
      const highlights = node.highlights?.slice(0, 3).join(', ') || '';

      // Format differently for professional services
      if (isProfessionalQuery) {
        const serviceType = subcategory || node.category.replace(/_/g, ' ');
        prompt += `${index + 1}. **${node.name}** [${serviceType}]
   ⭐ Rating: ${rating}/5${reviews > 0 ? ` (${reviews.toLocaleString()} reviews)` : ''}
   📍 ${location}, ${island}
   📝 ${desc}
   ${node.contact?.website ? `🌐 ${node.contact.website}` : ''}
   ${node.contact?.phone ? `📞 ${node.contact.phone}` : ''}

`;
      } else {
        prompt += `${index + 1}. **${node.name}** [${node.category.replace(/_/g, ' ')}]
   ⭐ Rating: ${rating}/5${reviews > 0 ? ` (${reviews.toLocaleString()} reviews)` : ''}
   📍 Location: ${location}, ${island}
   💰 Price: ${price}
   📝 ${desc}
   ${hoursInfo ? `🕐 Hours: ${hoursInfo}` : ''}
   ${highlights ? `✨ Highlights: ${highlights}` : ''}
   ${node.contact?.website ? `🌐 Website: ${node.contact.website}` : ''}
   ${node.contact?.phone ? `📞 Phone: ${node.contact.phone}` : ''}
   ${node.contact?.bookingUrl ? `📅 Booking available` : ''}
   Quality Score: ${quality}%

`;
      }
    });
  } else {
    prompt += `No highly relevant places found in knowledge base for this specific query.
However, the database contains ${kbStats.total} verified places across the Cayman Islands that may be helpful.
Consider asking about beaches, restaurants, hotels, diving, activities, or specific areas.

`;
  }

  // Add conversation context awareness
  if (context.conversationHistory.length > 0) {
    const recentContext = context.conversationHistory.slice(-4);
    const topics = recentContext
      .filter(m => m.role === 'user')
      .map(m => m.content.toLowerCase())
      .join(' ');

    prompt += `
CONVERSATION CONTEXT:
The user has been discussing: ${topics.slice(0, 200)}...
Build on this context naturally if relevant.

`;
  }

  // Different instructions for professional services vs travel
  if (isProfessionalQuery) {
    prompt += `
RESPONSE INSTRUCTIONS FOR PROFESSIONAL SERVICES:
1. MUST recommend 3-5 specific providers from the list above by name
2. Include their ratings, websites, and phone numbers
3. Explain what each type of provider does and when you'd need them
4. For real estate: Ask if they want to buy or rent, budget, preferred area
5. For financial services: Explain the relevant fund structure or service
6. Always recommend consulting with licensed professionals for specific advice
7. Offer to provide more details about specific providers or services
8. Be proactive - suggest related services they might need

⚠️ CRITICAL: Only mention places that are in the list above. Never invent or assume places.`;
  } else {
    prompt += `
RESPONSE INSTRUCTIONS:
1. DIRECTLY answer the user's LATEST query - this is the PRIMARY focus
2. ONLY recommend places from the search results above - never invent places
3. Prioritize the top 2-3 most relevant places with specific details
4. Include ratings, prices, locations, hours when available
5. Make recommendations actionable ("Book ahead", "Arrive early")
6. Use EXACT names from the knowledge base - don't abbreviate or modify
7. End with a helpful follow-up question or natural next step

⚠️ CRITICAL RULES:
- Only mention places that appear in the search results above
- Never make up or assume place names, ratings, or details
- If no results match, say so honestly and suggest alternatives
- Every place you mention must have [[place_link:EXACT_NAME]] format for clickability`;
  }

  return prompt;
}

// Get knowledge base statistics for context
function getKnowledgeBaseStats(): {
  total: number;
  categories: string[];
  byCategory: Record<string, number>;
} {
  const byCategory: Record<string, number> = {};

  for (const node of getKnowledgeBase()) {
    byCategory[node.category] = (byCategory[node.category] || 0) + 1;
  }

  return {
    total: getKnowledgeBase().length,
    categories: Object.keys(byCategory),
    byCategory
  };
}

// ============ RESPONSE PARSING ============

function extractPlaceCards(nodes: KnowledgeNode[]): PlaceCard[] {
  return nodes.map(node => {
    // Handle both coordinate formats: coordinates.lat/lng OR latitude/longitude
    const lat = node.location.coordinates?.lat ?? node.location.latitude;
    const lng = node.location.coordinates?.lng ?? node.location.longitude;

    return {
      nodeId: node.id,
      name: node.name,
      category: node.category,
      thumbnail: node.media?.thumbnail,
      rating: node.ratings?.overall,
      reviewCount: node.ratings?.reviewCount,
      priceRange: node.business?.priceRange,
      shortDescription: node.shortDescription || node.description?.slice(0, 100) || '',
      location: {
        latitude: lat,
        longitude: lng,
        district: node.location?.district || node.location?.area
      },
      bookingUrl: node.contact?.bookingUrl
    };
  });
}

function extractMapMarkers(nodes: KnowledgeNode[]): MapMarker[] {
  return nodes.map((node, index) => {
    // Handle both coordinate formats: coordinates.lat/lng OR latitude/longitude
    const lat = node.location.coordinates?.lat ?? node.location.latitude;
    const lng = node.location.coordinates?.lng ?? node.location.longitude;

    return {
      id: `marker-${node.id}`,
      nodeId: node.id,
      latitude: lat,
      longitude: lng,
      title: node.name,
      subtitle: node.shortDescription || node.description?.slice(0, 80),
      category: node.category,
      thumbnail: node.media?.thumbnail,
      rating: node.ratings?.overall,
      reviewCount: node.ratings?.reviewCount,
      priceRange: node.business?.priceRange,
      address: node.location?.address,
      phone: node.contact?.phone,
      website: node.contact?.website,
      bookingUrl: node.contact?.bookingUrl,
      openingHours: node.business?.openingHours?.formattedDisplay ||
                    (typeof node.business?.openingHours === 'object' && 'raw' in (node.business?.openingHours || {})
                      ? (node.business?.openingHours as any)?.raw
                      : undefined),
      isActive: index === 0 // First marker is active
    };
  });
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

    if (firstNode.contact?.bookingUrl) {
      actions.push({
        id: 'action-book',
        type: 'book',
        label: 'Book now',
        nodeId: firstNode.id,
        url: firstNode.contact.bookingUrl
      });
    }

    if (firstNode.contact?.website) {
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

// ============ OPENAI API INTEGRATION ============

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Callback type for streaming updates
export type StreamingCallback = (chunk: string, isComplete: boolean) => void;

// Non-streaming API call (kept for backward compatibility)
async function callClaudeAPI(
  systemPrompt: string,
  messages: ClaudeMessage[]
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('OpenAI API key not configured, using simulated response');
    return simulateResponse(messages[messages.length - 1].content);
  }

  try {
    // Convert messages to OpenAI format
    const openAIMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: CAYMAN_CONFIG.ai.maxTokens,
        temperature: CAYMAN_CONFIG.ai.temperature,
        messages: openAIMessages
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    // Fallback to simulated response
    return simulateResponse(messages[messages.length - 1].content);
  }
}

// System prompt that includes web search capability instructions
function buildSystemPromptWithTools(): string {
  return `You are Isle AI - the world's most intelligent concierge for the Cayman Islands, combining travel expertise with deep financial services knowledge.

You are powered by comprehensive local knowledge (1200+ verified places & professional services) enriched with real-time data.

YOUR DUAL EXPERTISE:
🌴 **TRAVEL CONCIERGE** - Beaches, restaurants, hotels, activities
🏦 **FINANCIAL ADVISOR** - Fund structures, corporate services, regulatory guidance

═══════════════════════════════════════════════════════════════════
CAYMAN ISLANDS FINANCIAL SERVICES EXPERTISE
═══════════════════════════════════════════════════════════════════

**WHY CAYMAN?** World's 5th largest financial center:
- Tax-neutral jurisdiction (no income, capital gains, or corporate tax)
- 85% of world's hedge funds domiciled here
- $7+ trillion in assets under administration
- Robust CIMA regulatory framework
- English common law, political stability

**KEY FUND STRUCTURES:**
- **Exempted Limited Partnership (ELP)** - Most common for hedge funds
- **Segregated Portfolio Company (SPC)** - Multi-strategy/umbrella funds with legal segregation
- **Exempted Company** - Traditional corporate structure
- **LLC** - Partnership flexibility + corporate protection

**FUND CATEGORIES:**
- Registered Fund (sophisticated investors)
- Administered Fund (no local admin required)
- Licensed Fund (retail access)
- Private Fund (max 15 investors)

**CORPORATE SERVICES:** Exempted companies, registered office, registered agent, directors
**TRUST STRUCTURES:** STAR Trust, Purpose Trust, Private Trust Companies
**CAPTIVE INSURANCE:** Cayman is #2 globally
**COMPLIANCE:** AML/KYC, FATCA, CRS, Economic Substance, Beneficial Ownership

═══════════════════════════════════════════════════════════════════

WEB SEARCH CAPABILITY:
Use web search ONLY for:
- Flights, airlines, travel schedules
- Real-time prices/availability
- Current events
- Information NOT in knowledge base

RESPONSE STANDARDS:
**For Travel:** Specific recommendations with ratings, prices, locations
**For Financial:** Clear explanations, recommend service providers, outline requirements

RESPONSE FORMAT:
- **Bold** for names and key terms
- Relevant emojis sparingly (🏖️ 🍽️ 🏦 ⚖️ 📊)
- Clean bullet points
- End with helpful follow-up

═══════════════════════════════════════════════════════════════════
REAL ESTATE EXPERTISE
═══════════════════════════════════════════════════════════════════

**WHY CAYMAN REAL ESTATE?**
- No property/income/capital gains taxes
- No foreign ownership restrictions
- Stable British legal system
- Strong rental yields (5-8%)

**PROPERTY TYPES:**
- Condos: $500K-$5M+ (Seven Mile Beach)
- Homes: $1M-$30M+ (canal/beachfront)
- Land: $100K-$1M+ (varies by location)

**BUYING COSTS:**
- Stamp Duty: 7.5% (buyer pays)
- Legal fees: 0.5-1%
- Survey: $500-$2,000

**TOP AREAS:** Seven Mile Beach, Camana Bay, South Sound, Crystal Harbour

**PROACTIVE:** When users mention property/buying, ASK:
1. Buy or rent?
2. Budget range?
3. Preferred area?
4. Personal use or investment?

═══════════════════════════════════════════════════════════════════

CRITICAL: For financial services and real estate, always recommend consulting licensed professionals. You provide guidance and connect users with the right providers.

Remember: You're helping users navigate paradise, sophisticated finance, AND a premier real estate market.`;
}

// OpenAI API call with function calling for web search
async function callOpenAIWithTools(
  systemPrompt: string,
  messages: ClaudeMessage[],
  originalQuery: string,
  onChunk: (content: string) => void
): Promise<{ finalContent: string; usedWebSearch: boolean }> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('OpenAI API key not configured');
    const content = await simulateStreamingResponse(originalQuery, (c, _) => onChunk(c));
    return { finalContent: content, usedWebSearch: false };
  }

  // Define the web search tool
  const tools = [
    {
      type: 'function',
      function: {
        name: 'search_web',
        description: 'Search the web for real-time information about flights, airlines, travel schedules, current events, or any information not in the knowledge base. Use this for flight queries, airport info, airline routes, and any time-sensitive travel information.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query to find information about'
            },
            sources: {
              type: 'array',
              items: { type: 'string' },
              description: 'Preferred sources to search (e.g., "cayman airways", "flightaware")'
            }
          },
          required: ['query']
        }
      }
    }
  ];

  try {
    // First call: Let GPT decide if it needs web search
    const openAIMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const initialResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: openAIMessages,
        tools,
        tool_choice: 'auto',
        max_tokens: 100 // Short response to check if tool is needed
      })
    });

    if (!initialResponse.ok) {
      throw new Error(`API error: ${initialResponse.status}`);
    }

    const initialData = await initialResponse.json();
    const assistantMessage = initialData.choices[0].message;

    // Check if GPT wants to use web search
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCall = assistantMessage.tool_calls[0];

      if (toolCall.function.name === 'search_web') {
        console.log('🌐 GPT requested web search');
        const searchArgs = JSON.parse(toolCall.function.arguments);

        // Perform web search and get response
        const searchResult = await performWebSearch(searchArgs.query, searchArgs.sources);

        // Continue conversation with search results
        const finalMessages = [
          ...openAIMessages,
          assistantMessage,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: searchResult
          }
        ];

        // Stream the final response
        const finalContent = await streamOpenAIResponse(finalMessages, onChunk);
        return { finalContent, usedWebSearch: true };
      }
    }

    // No tool call needed - stream regular response
    const finalContent = await streamOpenAIResponse(openAIMessages, onChunk);
    return { finalContent, usedWebSearch: false };

  } catch (error) {
    console.error('Error in callOpenAIWithTools:', error);
    // Fallback to regular streaming
    const content = await callClaudeAPIStreaming(systemPrompt, messages, (c, _) => onChunk(c));
    return { finalContent: content, usedWebSearch: false };
  }
}

// Perform REAL web search using OpenAI Responses API with web_search_preview
async function performWebSearch(query: string, preferredSources?: string[]): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    return 'Web search unavailable - no API key configured.';
  }

  try {
    console.log('🔍 Performing REAL web search for:', query);

    // Use OpenAI Responses API with web_search_preview tool
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        tools: [{
          type: 'web_search_preview',
          search_context_size: 'medium'
        }],
        input: `Search the web for accurate, current information about: ${query}

${preferredSources?.length ? `Prefer these sources: ${preferredSources.join(', ')}` : ''}

For Cayman Islands travel queries, prioritize official sources:
- caymanairways.com, caymanairports.com for flights
- visitcaymanislands.com for tourism
- Official airline websites

Return detailed, factual information with specific details (routes, schedules, prices if available).`
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Web search API error:', response.status, errorText);
      throw new Error(`Web search failed: ${response.status}`);
    }

    const data = await response.json();

    // Extract the text content from the response
    let result = '';
    if (data.output && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === 'message' && item.content) {
          for (const content of item.content) {
            if (content.type === 'output_text') {
              result += content.text;
            }
          }
        }
      }
    }

    if (result) {
      console.log('✅ Web search completed successfully');
      return result;
    }

    throw new Error('No content in web search response');

  } catch (error) {
    console.error('Web search error:', error);

    // Fallback: Try Perplexity-style search via regular completion with browsing context
    try {
      return await fallbackWebSearch(query, apiKey);
    } catch (fallbackError) {
      console.error('Fallback search also failed:', fallbackError);
      return `Unable to perform web search. Based on general knowledge: For flights to Cayman Islands, check caymanairways.com, american.com, jetblue.com, or united.com directly for current schedules and prices.`;
    }
  }
}

// Fallback web search using GPT-4o with search grounding
async function fallbackWebSearch(query: string, apiKey: string): Promise<string> {
  console.log('🔄 Trying fallback web search...');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-search-preview',  // Search-enabled model
      web_search_options: {
        search_context_size: 'medium'
      },
      messages: [
        {
          role: 'system',
          content: 'You are a travel research assistant. Search the web and provide accurate, current information. Include specific details and cite sources when possible.'
        },
        {
          role: 'user',
          content: `Search for current information about: ${query}\n\nProvide specific, accurate details from reliable sources.`
        }
      ],
      max_tokens: 1500
    })
  });

  if (!response.ok) {
    throw new Error(`Fallback search failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Stream OpenAI response
async function streamOpenAIResponse(
  messages: any[],
  onChunk: (content: string) => void
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      max_tokens: CAYMAN_CONFIG.ai.maxTokens,
      temperature: CAYMAN_CONFIG.ai.temperature,
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body not readable');

  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim());

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
            onChunk(fullContent);
          }
        } catch (e) {
          // Skip unparseable chunks
        }
      }
    }
  }

  return fullContent;
}


// Streaming API call using Server-Sent Events (SSE)
async function callClaudeAPIStreaming(
  systemPrompt: string,
  messages: ClaudeMessage[],
  onChunk: StreamingCallback
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('OpenAI API key not configured, using simulated streaming response');
    return simulateStreamingResponse(messages[messages.length - 1].content, onChunk);
  }

  try {
    // Convert messages to OpenAI format
    const openAIMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: CAYMAN_CONFIG.ai.maxTokens,
        temperature: CAYMAN_CONFIG.ai.temperature,
        messages: openAIMessages,
        stream: true  // Enable streaming
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(`API error: ${response.status}`);
    }

    // Read the stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        onChunk(fullContent, true);
        break;
      }

      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });

      // Parse SSE data - each line starts with "data: "
      const lines = chunk.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith(':')) continue;

        // Check for stream end
        if (trimmedLine === 'data: [DONE]') {
          onChunk(fullContent, true);
          return fullContent;
        }

        // Parse the data line
        if (trimmedLine.startsWith('data: ')) {
          try {
            const jsonStr = trimmedLine.slice(6); // Remove "data: " prefix
            const parsed = JSON.parse(jsonStr);

            // Extract the delta content
            const delta = parsed.choices?.[0]?.delta?.content;

            if (delta) {
              fullContent += delta;
              onChunk(fullContent, false);
            }
          } catch (e) {
            // Skip malformed JSON (can happen with partial chunks)
            continue;
          }
        }
      }
    }

    return fullContent;
  } catch (error) {
    console.error('Error calling OpenAI streaming API:', error);
    // Fallback to simulated streaming response
    return simulateStreamingResponse(messages[messages.length - 1].content, onChunk);
  }
}

// Simulated streaming response for when API key is not available
async function simulateStreamingResponse(
  query: string,
  onChunk: StreamingCallback
): Promise<string> {
  const fullResponse = simulateResponse(query);
  const words = fullResponse.split(' ');
  let accumulated = '';

  // Simulate streaming by emitting words progressively
  for (let i = 0; i < words.length; i++) {
    accumulated += (i === 0 ? '' : ' ') + words[i];
    onChunk(accumulated, false);
    // Small delay to simulate streaming
    await new Promise(resolve => setTimeout(resolve, 30));
  }

  onChunk(fullResponse, true);
  return fullResponse;
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

  if (lowerQuery.includes('pig') || lowerQuery.includes('swim with')) {
    return `**The Famous Swimming Pigs!** 🐷

The world-famous Swimming Pigs are one of the Bahamas' most incredible experiences!

📍 **Big Major Cay (Pig Beach)**, Exuma Cays

These friendly pigs swim out to greet visiting boats - they love treats and making new friends! Here's what you need to know:

🚤 **How to Visit**
- Day trips from Nassau (~$295) or Staniel Cay
- Private boat charters available
- Best in the morning before crowds

✨ **The Experience**
- Swim alongside friendly pigs in crystal-clear water
- Feed them (carrots, apples - no junk food!)
- Perfect photo opportunity
- Usually combined with Thunderball Grotto & nurse sharks

Would you like me to show tour options or other Exuma Cays adventures?`;
  }

  if (lowerQuery.includes('pig') || lowerQuery.includes('swim with')) {
    return `**The Famous Swimming Pigs!** 🐷

The world-famous Swimming Pigs are one of the Bahamas' most incredible experiences!

📍 **Big Major Cay (Pig Beach)**, Exuma Cays

These friendly pigs swim out to greet visiting boats - they love treats and making new friends! Here's what you need to know:

🚤 **How to Visit**
- Day trips from Nassau (~$295) or Staniel Cay
- Private boat charters available
- Best in the morning before crowds

✨ **The Experience**
- Swim alongside friendly pigs in crystal-clear water
- Feed them (carrots, apples - no junk food!)
- Perfect photo opportunity
- Usually combined with Thunderball Grotto & nurse sharks

Would you like me to show tour options or other Exuma Cays adventures?`;
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

  // Financial Services queries
  if (lowerQuery.includes('fund') || lowerQuery.includes('hedge') || lowerQuery.includes('investment fund')) {
    return `**Setting Up an Investment Fund in Cayman** 🏦

The Cayman Islands is the world's premier jurisdiction for hedge funds - here's what you need to know:

**Why Cayman for Funds?**
- 85% of the world's hedge funds are domiciled here
- Tax-neutral (no income, capital gains, or corporate taxes)
- Robust regulatory framework via CIMA
- English common law legal system

**Popular Fund Structures:**

📊 **Exempted Limited Partnership (ELP)**
The most common structure for hedge funds. General Partner manages, Limited Partners invest. Pass-through taxation.

📊 **Segregated Portfolio Company (SPC)**
Perfect for multi-strategy or umbrella funds. Each portfolio is legally segregated with its own assets/liabilities.

📊 **Exempted Company**
Traditional corporate structure with multiple share classes.

**Key Service Providers You'll Need:**
1. **Fund Administrator** - Handle NAV calculations, investor services
2. **Legal Counsel** - Structure the fund, draft documents
3. **Auditor** - Annual audit requirements
4. **Registered Office** - Required physical presence

Would you like me to recommend specific law firms or fund administrators based on your needs?`;
  }

  if (lowerQuery.includes('law firm') || lowerQuery.includes('lawyer') || lowerQuery.includes('legal')) {
    return `**Top Law Firms in the Cayman Islands** ⚖️

The Cayman Islands has world-class legal expertise, especially in funds, corporate, and finance:

**Global Firms:**
- **Walkers** - One of the largest offshore law firms globally
- **Maples Group** - Leading in funds and structured finance
- **Ogier** - Strong corporate and dispute resolution
- **Appleby** - Full-service offshore firm
- **Carey Olsen** - Boutique offshore specialist

**Local Specialists:**
- **Mourant** - Dispute resolution expertise
- **Harneys** - Corporate and investment funds
- **Campbells** - Litigation and insolvency

**Services They Provide:**
- Fund formation & structuring
- Corporate & company law
- Regulatory compliance (CIMA)
- Dispute resolution & litigation
- Real estate & conveyancing
- Trust & private client work

**Typical Engagement:**
- Initial consultation: Often free
- Fund formation: $15,000-$50,000+
- Ongoing retainer: Varies by complexity

Would you like me to recommend a specific firm based on your needs?`;
  }

  if (lowerQuery.includes('company') || lowerQuery.includes('incorporate') || lowerQuery.includes('offshore')) {
    return `**Company Formation in the Cayman Islands** 🏢

The Cayman Islands offers flexible corporate structures for international business:

**Most Common: Exempted Company**
- No local ownership required
- Can conduct business internationally
- No taxes on income, dividends, or capital gains
- Minimum 1 director and 1 shareholder
- Annual fee: ~$850 government + registered office fees

**Formation Requirements:**
1. **Registered Office** - Physical address in Cayman
2. **Registered Agent** - Licensed professional required
3. **Memorandum & Articles** - Company constitution
4. **Directors** - Can be corporate or individual
5. **Shareholders** - No minimum capital required

**Timeline:** 24-48 hours for standard registration

**Other Structures:**
- **LLC** - Partnership flexibility with corporate protection
- **Limited Partnership** - For fund vehicles
- **Foundation Company** - Similar to European foundations

**Key Providers:**
Top corporate service providers handle everything from formation to ongoing compliance.

Would you like recommendations for corporate service providers or law firms to assist?`;
  }

  if (lowerQuery.includes('cima') || lowerQuery.includes('regula') || lowerQuery.includes('compliance') || lowerQuery.includes('license')) {
    return `**CIMA - Cayman Islands Monetary Authority** 📋

CIMA is the financial regulator responsible for:

**What CIMA Regulates:**
- 🏦 Banks and Trust Companies
- 📊 Investment Funds
- 🛡️ Insurance Companies (including Captives)
- 💼 Securities Investment Business
- 🏢 Company Managers & Corporate Services

**Key Regulatory Requirements:**

**For Investment Funds:**
- Registration/licensing based on fund type
- Annual audit requirement
- NAV calculations & reporting
- AML/KYC compliance

**For Corporate Service Providers:**
- Must hold Company Management license
- Fit & proper assessments for directors
- Ongoing compliance monitoring

**Compliance Frameworks:**
- **AML/KYC** - Anti-Money Laundering / Know Your Customer
- **FATCA** - US tax reporting for US persons
- **CRS** - Common Reporting Standard (global)
- **Economic Substance** - Required for certain entities

**Recent Focus Areas:**
- Beneficial Ownership regime
- Virtual Asset Service Providers (VASPs)
- Climate risk disclosure

Would you like to know more about specific licensing requirements?`;
  }

  if (lowerQuery.includes('trust') || lowerQuery.includes('star') || lowerQuery.includes('fiduciary')) {
    return `**Trust Structures in the Cayman Islands** 🏛️

Cayman offers sophisticated trust solutions, including the unique STAR Trust:

**STAR Trust (Special Trusts Alternative Regime)**
Revolutionary structure that allows:
- Non-charitable purpose trusts
- No requirement for ascertainable beneficiaries
- Perfect for holding company shares, private foundations
- "Enforcer" ensures trust purposes are carried out

**Standard Trust Features:**
- No forced heirship rules
- Up to 150-year duration (or unlimited for charities)
- Confidentiality protections
- Flee clauses for asset protection

**Common Uses:**
1. **Family Wealth Planning** - Multi-generational wealth transfer
2. **Holding Structures** - Holding shares in fund vehicles
3. **Employee Benefit Trusts** - ESOP and incentive plans
4. **Private Trust Companies (PTC)** - Family-controlled trustee

**Key Providers:**
- Major trust companies: Trident Trust, Equity Trust, Intertrust
- Private banks with trust services
- Law firms with trust practices

**Typical Costs:**
- Trust establishment: $5,000-$15,000
- Annual trustee fees: $5,000-$25,000+
- PTC setup: $25,000+

Would you like me to recommend specific trust companies based on your needs?`;
  }

  if (lowerQuery.includes('captive') || lowerQuery.includes('insurance manager')) {
    return `**Captive Insurance in the Cayman Islands** 🛡️

Cayman is the #2 global domicile for captive insurance:

**What is a Captive?**
A licensed insurance company created to insure the risks of its parent company or group - essentially self-insurance with regulatory benefits.

**Why Cayman for Captives?**
- 700+ captives domiciled here
- Established regulatory framework
- No premium taxes
- Flexible investment rules
- Expert local infrastructure

**Types of Captives:**
- **Pure Captive** - Insures parent company risks only
- **Group Captive** - Multiple companies share risks
- **Segregated Portfolio** - Multiple portfolios in one captive
- **Rent-a-Captive** - Use existing licensed captive

**Requirements:**
- CIMA License (Class A, B, or C)
- Minimum capital: $100,000-$500,000+
- Licensed Insurance Manager required
- Annual audit & actuarial review
- Board meetings in Cayman

**Key Providers:**
- Insurance managers: Aon, Marsh, Willis Towers Watson
- Captive specialists: Strategic Risk Solutions, Artex

Would you like recommendations for insurance managers or captive consultants?`;
  }

  // Real Estate queries
  if (lowerQuery.includes('real estate') || lowerQuery.includes('buy property') ||
      lowerQuery.includes('buy a house') || lowerQuery.includes('buy a condo') ||
      lowerQuery.includes('property for sale') || lowerQuery.includes('invest in property')) {
    return `**Investing in Cayman Islands Real Estate** 🏠

Great choice! The Cayman Islands offers exceptional real estate opportunities. Let me help you explore your options.

**Why Buy in Cayman?**
- 🚫 No property taxes
- 🚫 No income or capital gains taxes
- ✅ No restrictions on foreign ownership
- ✅ Stable British legal system
- ✅ Strong rental yields (5-8% on Seven Mile Beach)

**Property Price Ranges:**

📍 **Seven Mile Beach Condos**
- Studios: $400K-$600K
- 1-bedroom: $500K-$900K
- 2-bedroom: $800K-$2M
- Penthouse: $2M-$10M+

📍 **Beachfront Homes/Villas**
- $3M-$30M+ depending on location

📍 **Canal-Front Homes**
- Crystal Harbour: $1M-$5M
- Governor's Harbour: $1.5M-$8M

📍 **Land**
- Seven Mile Beach: $1M+ per half-acre
- East End: $100K-$500K

**Before we continue, I'd love to understand your goals:**

1. Are you looking to **buy** or **rent**?
2. What's your approximate **budget range**?
3. Is this for **personal use** or **investment/rental income**?
4. Any **preferred areas** (Seven Mile Beach, Camana Bay, South Sound)?

I can then recommend the perfect agents and properties for your needs!`;
  }

  if (lowerQuery.includes('stamp duty') || lowerQuery.includes('buying costs') ||
      lowerQuery.includes('closing costs') || lowerQuery.includes('purchase costs')) {
    return `**Cayman Islands Property Purchase Costs** 💰

Here's a breakdown of what to expect when buying property:

**Government Costs:**

📋 **Stamp Duty: 7.5%** (of purchase price)
- This is the main government fee
- Paid by the buyer at closing
- No negotiation - it's fixed by law

**Professional Fees:**

⚖️ **Legal/Conveyancing: 0.5-1%**
- Attorney fees for the transaction
- Title search and due diligence
- Document preparation and registration

📐 **Land Survey: $500-$2,500**
- Boundary verification
- Highly recommended for land/houses

🏦 **Bank Fees** (if financing)
- Mortgage arrangement: 0.5-1%
- Valuation: $300-$800

**Example: $1M Purchase**
- Stamp Duty: $75,000
- Legal Fees: $5,000-$10,000
- Survey: $1,500
- **Total Additional Costs: ~$82,000-$87,000**

**Good News:**
- No annual property taxes!
- No capital gains tax when you sell
- No income tax on rental income

Would you like me to recommend property lawyers or discuss financing options?`;
  }

  if (lowerQuery.includes('rental income') || lowerQuery.includes('rental yield') ||
      lowerQuery.includes('investment property') || lowerQuery.includes('rental return')) {
    return `**Cayman Islands Rental Investment Returns** 📈

Here's what you can expect from rental properties:

**Seven Mile Beach Condos (Short-Term Rental)**
- Nightly rates: $200-$800+
- Occupancy: 60-80% (well-managed)
- **Gross yield: 6-10%**
- Net after expenses: 4-7%

**Long-Term Rentals**
- 1-bed SMB condo: $2,500-$4,500/month
- 2-bed SMB condo: $3,500-$6,500/month
- 3-bed house: $4,000-$10,000/month
- **Gross yield: 4-6%**

**Expenses to Consider:**
- Strata fees: $300-$1,500/month
- Insurance: 0.5-1% of value/year
- Property management: 20-30% of rental income
- Maintenance: 1-2% of value/year
- Utilities (if included): Varies

**Best Areas for Rental Income:**
1. **Seven Mile Beach** - Highest demand, premium rates
2. **Camana Bay** - Corporate/expat long-term rentals
3. **George Town** - Budget-friendly, steady demand
4. **West Bay** - Family rentals, local market

**Investment Tips:**
- Ground floor condos rent better (beach access)
- Pool and beach access are must-haves
- Furnished units command 20-30% premium
- Professional management is key

Would you like recommendations for property managers or investment-focused agents?`;
  }

  if (lowerQuery.includes('real estate agent') || lowerQuery.includes('realtor') ||
      lowerQuery.includes('property agent') || lowerQuery.includes('cireba')) {
    return `**Top Real Estate Agents in Cayman** 🏘️

All licensed agents must be CIREBA members (Cayman Islands Real Estate Brokers Association). Here are top-rated agencies:

**International Brands:**

🏆 **Cayman Islands Sotheby's International Realty**
- Luxury specialist
- International marketing reach
- Premium properties $1M+

🏆 **Coldwell Banker Cayman Islands Realty**
- Full-service agency
- Wide price range
- Strong rental division

🏆 **RE/MAX Cayman Islands**
- Large agent network
- Good first-time buyer support
- Commercial & residential

🏆 **Berkshire Hathaway HomeServices**
- Trusted global brand
- Investment focus

**Local Specialists:**

⭐ **Williams2 Real Estate** (5.0 rating)
- Boutique service
- Personalized attention

⭐ **Property Cayman** (5.0 rating)
- Local market expertise
- Great client reviews

⭐ **ERA Cayman Islands**
- Wide property selection
- New developments

⭐ **Engel & Völkers Cayman**
- European clientele
- Luxury focus

**What to Expect:**
- Buyer's agent is FREE (seller pays commission)
- Commission: 5-6% (split between agents)
- CIREBA listing database access
- Professional representation

What type of property are you looking for? I can recommend the best agent for your needs!`;
  }

  if (lowerQuery.includes('residency') || lowerQuery.includes('move to cayman') ||
      lowerQuery.includes('relocate') || lowerQuery.includes('live in cayman')) {
    return `**Moving to the Cayman Islands** 🌴

Interested in making Cayman your home? Here are your options:

**Residency by Investment**

💰 **Certificate of Permanent Residence**
- Investment: $1.2M+ in approved real estate
- Or: $2.4M+ with $1M in developed property
- Benefits: Live and work in Cayman indefinitely
- Process: 3-6 months typically

💼 **Residency Certificate (Annual)**
- Investment: $1M+ in real estate
- Renewed annually
- Right to reside but not work

**Work Permit Route**
- Employer-sponsored work permit
- After 8+ years: Apply for permanent residence

**Person of Independent Means**
- Substantial investment + annual income proof
- Not employment-dependent

**Cost of Living:**
- 20-40% higher than US
- Groceries: 30-50% more expensive
- Dining: Similar to major US cities
- No income tax offsets this!

**Popular Areas for Expats:**
1. **Seven Mile Beach** - Beach lifestyle, walkable
2. **Camana Bay** - Town center, amenities
3. **South Sound** - Quieter, established area
4. **Crystal Harbour** - Family-friendly, boating

**School Options:**
- Cayman International School
- St. Ignatius Catholic School
- Cayman Prep & High School

Would you like me to connect you with immigration specialists or relocation services?`;
  }

  if (lowerQuery.includes('seven mile beach') && (lowerQuery.includes('property') || lowerQuery.includes('condo') || lowerQuery.includes('buy'))) {
    return `**Seven Mile Beach Property Guide** 🏖️

Seven Mile Beach is Cayman's most prestigious address - here's what to know:

**Why Seven Mile Beach?**
- World-famous 5.5-mile pristine beach
- Walking distance to restaurants, bars, shops
- Highest rental demand
- Best appreciation potential
- Direct beach access

**Current Market (2024):**

📍 **Condos:**
- Studio/1-bed: $450K-$900K
- 2-bedroom: $800K-$2.5M
- 3-bedroom: $1.5M-$4M
- Penthouse: $3M-$15M+

📍 **Beachfront Estates:**
- $5M-$50M+
- Very limited inventory

**Popular Developments:**

🏢 **The Ritz-Carlton Residences**
- Ultra-luxury, 5-star amenities
- $2M-$15M+

🏢 **Kimpton Seafire Residences**
- Modern, resort amenities
- $1.5M-$5M

🏢 **Plantana/Islands Club**
- Established, good value
- $600K-$1.5M

🏢 **Caribbean Club**
- Prime location
- $700K-$2M

**Investment Potential:**
- Short-term rental: $200-$600/night
- Occupancy: 70-85%
- Gross yield: 6-8%

**Tips:**
- Beach-level units rent best
- West-facing for sunsets
- Renovated units command premium

Would you like to see specific listings or meet with a Seven Mile Beach specialist?`;
  }

  // Financial Services queries
  if (lowerQuery.includes('fund') || lowerQuery.includes('hedge') || lowerQuery.includes('investment fund')) {
    return `**Setting Up an Investment Fund in Cayman** 🏦

The Cayman Islands is the world's premier jurisdiction for hedge funds - here's what you need to know:

**Why Cayman for Funds?**
- 85% of the world's hedge funds are domiciled here
- Tax-neutral (no income, capital gains, or corporate taxes)
- Robust regulatory framework via CIMA
- English common law legal system

**Popular Fund Structures:**

📊 **Exempted Limited Partnership (ELP)**
The most common structure for hedge funds. General Partner manages, Limited Partners invest. Pass-through taxation.

📊 **Segregated Portfolio Company (SPC)**
Perfect for multi-strategy or umbrella funds. Each portfolio is legally segregated with its own assets/liabilities.

📊 **Exempted Company**
Traditional corporate structure with multiple share classes.

**Key Service Providers You'll Need:**
1. **Fund Administrator** - Handle NAV calculations, investor services
2. **Legal Counsel** - Structure the fund, draft documents
3. **Auditor** - Annual audit requirements
4. **Registered Office** - Required physical presence

Would you like me to recommend specific law firms or fund administrators based on your needs?`;
  }

  if (lowerQuery.includes('law firm') || lowerQuery.includes('lawyer') || lowerQuery.includes('legal')) {
    return `**Top Law Firms in the Cayman Islands** ⚖️

The Cayman Islands has world-class legal expertise, especially in funds, corporate, and finance:

**Global Firms:**
- **Walkers** - One of the largest offshore law firms globally
- **Maples Group** - Leading in funds and structured finance
- **Ogier** - Strong corporate and dispute resolution
- **Appleby** - Full-service offshore firm
- **Carey Olsen** - Boutique offshore specialist

**Local Specialists:**
- **Mourant** - Dispute resolution expertise
- **Harneys** - Corporate and investment funds
- **Campbells** - Litigation and insolvency

**Services They Provide:**
- Fund formation & structuring
- Corporate & company law
- Regulatory compliance (CIMA)
- Dispute resolution & litigation
- Real estate & conveyancing
- Trust & private client work

**Typical Engagement:**
- Initial consultation: Often free
- Fund formation: $15,000-$50,000+
- Ongoing retainer: Varies by complexity

Would you like me to recommend a specific firm based on your needs?`;
  }

  if (lowerQuery.includes('company') || lowerQuery.includes('incorporate') || lowerQuery.includes('offshore')) {
    return `**Company Formation in the Cayman Islands** 🏢

The Cayman Islands offers flexible corporate structures for international business:

**Most Common: Exempted Company**
- No local ownership required
- Can conduct business internationally
- No taxes on income, dividends, or capital gains
- Minimum 1 director and 1 shareholder
- Annual fee: ~$850 government + registered office fees

**Formation Requirements:**
1. **Registered Office** - Physical address in Cayman
2. **Registered Agent** - Licensed professional required
3. **Memorandum & Articles** - Company constitution
4. **Directors** - Can be corporate or individual
5. **Shareholders** - No minimum capital required

**Timeline:** 24-48 hours for standard registration

**Other Structures:**
- **LLC** - Partnership flexibility with corporate protection
- **Limited Partnership** - For fund vehicles
- **Foundation Company** - Similar to European foundations

**Key Providers:**
Top corporate service providers handle everything from formation to ongoing compliance.

Would you like recommendations for corporate service providers or law firms to assist?`;
  }

  if (lowerQuery.includes('cima') || lowerQuery.includes('regula') || lowerQuery.includes('compliance') || lowerQuery.includes('license')) {
    return `**CIMA - Cayman Islands Monetary Authority** 📋

CIMA is the financial regulator responsible for:

**What CIMA Regulates:**
- 🏦 Banks and Trust Companies
- 📊 Investment Funds
- 🛡️ Insurance Companies (including Captives)
- 💼 Securities Investment Business
- 🏢 Company Managers & Corporate Services

**Key Regulatory Requirements:**

**For Investment Funds:**
- Registration/licensing based on fund type
- Annual audit requirement
- NAV calculations & reporting
- AML/KYC compliance

**For Corporate Service Providers:**
- Must hold Company Management license
- Fit & proper assessments for directors
- Ongoing compliance monitoring

**Compliance Frameworks:**
- **AML/KYC** - Anti-Money Laundering / Know Your Customer
- **FATCA** - US tax reporting for US persons
- **CRS** - Common Reporting Standard (global)
- **Economic Substance** - Required for certain entities

**Recent Focus Areas:**
- Beneficial Ownership regime
- Virtual Asset Service Providers (VASPs)
- Climate risk disclosure

Would you like to know more about specific licensing requirements?`;
  }

  if (lowerQuery.includes('trust') || lowerQuery.includes('star') || lowerQuery.includes('fiduciary')) {
    return `**Trust Structures in the Cayman Islands** 🏛️

Cayman offers sophisticated trust solutions, including the unique STAR Trust:

**STAR Trust (Special Trusts Alternative Regime)**
Revolutionary structure that allows:
- Non-charitable purpose trusts
- No requirement for ascertainable beneficiaries
- Perfect for holding company shares, private foundations
- "Enforcer" ensures trust purposes are carried out

**Standard Trust Features:**
- No forced heirship rules
- Up to 150-year duration (or unlimited for charities)
- Confidentiality protections
- Flee clauses for asset protection

**Common Uses:**
1. **Family Wealth Planning** - Multi-generational wealth transfer
2. **Holding Structures** - Holding shares in fund vehicles
3. **Employee Benefit Trusts** - ESOP and incentive plans
4. **Private Trust Companies (PTC)** - Family-controlled trustee

**Key Providers:**
- Major trust companies: Trident Trust, Equity Trust, Intertrust
- Private banks with trust services
- Law firms with trust practices

**Typical Costs:**
- Trust establishment: $5,000-$15,000
- Annual trustee fees: $5,000-$25,000+
- PTC setup: $25,000+

Would you like me to recommend specific trust companies based on your needs?`;
  }

  if (lowerQuery.includes('captive') || lowerQuery.includes('insurance manager')) {
    return `**Captive Insurance in the Cayman Islands** 🛡️

Cayman is the #2 global domicile for captive insurance:

**What is a Captive?**
A licensed insurance company created to insure the risks of its parent company or group - essentially self-insurance with regulatory benefits.

**Why Cayman for Captives?**
- 700+ captives domiciled here
- Established regulatory framework
- No premium taxes
- Flexible investment rules
- Expert local infrastructure

**Types of Captives:**
- **Pure Captive** - Insures parent company risks only
- **Group Captive** - Multiple companies share risks
- **Segregated Portfolio** - Multiple portfolios in one captive
- **Rent-a-Captive** - Use existing licensed captive

**Requirements:**
- CIMA License (Class A, B, or C)
- Minimum capital: $100,000-$500,000+
- Licensed Insurance Manager required
- Annual audit & actuarial review
- Board meetings in Cayman

**Key Providers:**
- Insurance managers: Aon, Marsh, Willis Towers Watson
- Captive specialists: Strategic Risk Solutions, Artex

Would you like recommendations for insurance managers or captive consultants?`;
  }

  // Real Estate queries
  if (lowerQuery.includes('real estate') || lowerQuery.includes('buy property') ||
      lowerQuery.includes('buy a house') || lowerQuery.includes('buy a condo') ||
      lowerQuery.includes('property for sale') || lowerQuery.includes('invest in property')) {
    return `**Investing in Cayman Islands Real Estate** 🏠

Great choice! The Cayman Islands offers exceptional real estate opportunities. Let me help you explore your options.

**Why Buy in Cayman?**
- 🚫 No property taxes
- 🚫 No income or capital gains taxes
- ✅ No restrictions on foreign ownership
- ✅ Stable British legal system
- ✅ Strong rental yields (5-8% on Seven Mile Beach)

**Property Price Ranges:**

📍 **Seven Mile Beach Condos**
- Studios: $400K-$600K
- 1-bedroom: $500K-$900K
- 2-bedroom: $800K-$2M
- Penthouse: $2M-$10M+

📍 **Beachfront Homes/Villas**
- $3M-$30M+ depending on location

📍 **Canal-Front Homes**
- Crystal Harbour: $1M-$5M
- Governor's Harbour: $1.5M-$8M

📍 **Land**
- Seven Mile Beach: $1M+ per half-acre
- East End: $100K-$500K

**Before we continue, I'd love to understand your goals:**

1. Are you looking to **buy** or **rent**?
2. What's your approximate **budget range**?
3. Is this for **personal use** or **investment/rental income**?
4. Any **preferred areas** (Seven Mile Beach, Camana Bay, South Sound)?

I can then recommend the perfect agents and properties for your needs!`;
  }

  if (lowerQuery.includes('stamp duty') || lowerQuery.includes('buying costs') ||
      lowerQuery.includes('closing costs') || lowerQuery.includes('purchase costs')) {
    return `**Cayman Islands Property Purchase Costs** 💰

Here's a breakdown of what to expect when buying property:

**Government Costs:**

📋 **Stamp Duty: 7.5%** (of purchase price)
- This is the main government fee
- Paid by the buyer at closing
- No negotiation - it's fixed by law

**Professional Fees:**

⚖️ **Legal/Conveyancing: 0.5-1%**
- Attorney fees for the transaction
- Title search and due diligence
- Document preparation and registration

📐 **Land Survey: $500-$2,500**
- Boundary verification
- Highly recommended for land/houses

🏦 **Bank Fees** (if financing)
- Mortgage arrangement: 0.5-1%
- Valuation: $300-$800

**Example: $1M Purchase**
- Stamp Duty: $75,000
- Legal Fees: $5,000-$10,000
- Survey: $1,500
- **Total Additional Costs: ~$82,000-$87,000**

**Good News:**
- No annual property taxes!
- No capital gains tax when you sell
- No income tax on rental income

Would you like me to recommend property lawyers or discuss financing options?`;
  }

  if (lowerQuery.includes('rental income') || lowerQuery.includes('rental yield') ||
      lowerQuery.includes('investment property') || lowerQuery.includes('rental return')) {
    return `**Cayman Islands Rental Investment Returns** 📈

Here's what you can expect from rental properties:

**Seven Mile Beach Condos (Short-Term Rental)**
- Nightly rates: $200-$800+
- Occupancy: 60-80% (well-managed)
- **Gross yield: 6-10%**
- Net after expenses: 4-7%

**Long-Term Rentals**
- 1-bed SMB condo: $2,500-$4,500/month
- 2-bed SMB condo: $3,500-$6,500/month
- 3-bed house: $4,000-$10,000/month
- **Gross yield: 4-6%**

**Expenses to Consider:**
- Strata fees: $300-$1,500/month
- Insurance: 0.5-1% of value/year
- Property management: 20-30% of rental income
- Maintenance: 1-2% of value/year
- Utilities (if included): Varies

**Best Areas for Rental Income:**
1. **Seven Mile Beach** - Highest demand, premium rates
2. **Camana Bay** - Corporate/expat long-term rentals
3. **George Town** - Budget-friendly, steady demand
4. **West Bay** - Family rentals, local market

**Investment Tips:**
- Ground floor condos rent better (beach access)
- Pool and beach access are must-haves
- Furnished units command 20-30% premium
- Professional management is key

Would you like recommendations for property managers or investment-focused agents?`;
  }

  if (lowerQuery.includes('real estate agent') || lowerQuery.includes('realtor') ||
      lowerQuery.includes('property agent') || lowerQuery.includes('cireba')) {
    return `**Top Real Estate Agents in Cayman** 🏘️

All licensed agents must be CIREBA members (Cayman Islands Real Estate Brokers Association). Here are top-rated agencies:

**International Brands:**

🏆 **Cayman Islands Sotheby's International Realty**
- Luxury specialist
- International marketing reach
- Premium properties $1M+

🏆 **Coldwell Banker Cayman Islands Realty**
- Full-service agency
- Wide price range
- Strong rental division

🏆 **RE/MAX Cayman Islands**
- Large agent network
- Good first-time buyer support
- Commercial & residential

🏆 **Berkshire Hathaway HomeServices**
- Trusted global brand
- Investment focus

**Local Specialists:**

⭐ **Williams2 Real Estate** (5.0 rating)
- Boutique service
- Personalized attention

⭐ **Property Cayman** (5.0 rating)
- Local market expertise
- Great client reviews

⭐ **ERA Cayman Islands**
- Wide property selection
- New developments

⭐ **Engel & Völkers Cayman**
- European clientele
- Luxury focus

**What to Expect:**
- Buyer's agent is FREE (seller pays commission)
- Commission: 5-6% (split between agents)
- CIREBA listing database access
- Professional representation

What type of property are you looking for? I can recommend the best agent for your needs!`;
  }

  if (lowerQuery.includes('residency') || lowerQuery.includes('move to cayman') ||
      lowerQuery.includes('relocate') || lowerQuery.includes('live in cayman')) {
    return `**Moving to the Cayman Islands** 🌴

Interested in making Cayman your home? Here are your options:

**Residency by Investment**

💰 **Certificate of Permanent Residence**
- Investment: $1.2M+ in approved real estate
- Or: $2.4M+ with $1M in developed property
- Benefits: Live and work in Cayman indefinitely
- Process: 3-6 months typically

💼 **Residency Certificate (Annual)**
- Investment: $1M+ in real estate
- Renewed annually
- Right to reside but not work

**Work Permit Route**
- Employer-sponsored work permit
- After 8+ years: Apply for permanent residence

**Person of Independent Means**
- Substantial investment + annual income proof
- Not employment-dependent

**Cost of Living:**
- 20-40% higher than US
- Groceries: 30-50% more expensive
- Dining: Similar to major US cities
- No income tax offsets this!

**Popular Areas for Expats:**
1. **Seven Mile Beach** - Beach lifestyle, walkable
2. **Camana Bay** - Town center, amenities
3. **South Sound** - Quieter, established area
4. **Crystal Harbour** - Family-friendly, boating

**School Options:**
- Cayman International School
- St. Ignatius Catholic School
- Cayman Prep & High School

Would you like me to connect you with immigration specialists or relocation services?`;
  }

  if (lowerQuery.includes('seven mile beach') && (lowerQuery.includes('property') || lowerQuery.includes('condo') || lowerQuery.includes('buy'))) {
    return `**Seven Mile Beach Property Guide** 🏖️

Seven Mile Beach is Cayman's most prestigious address - here's what to know:

**Why Seven Mile Beach?**
- World-famous 5.5-mile pristine beach
- Walking distance to restaurants, bars, shops
- Highest rental demand
- Best appreciation potential
- Direct beach access

**Current Market (2024):**

📍 **Condos:**
- Studio/1-bed: $450K-$900K
- 2-bedroom: $800K-$2.5M
- 3-bedroom: $1.5M-$4M
- Penthouse: $3M-$15M+

📍 **Beachfront Estates:**
- $5M-$50M+
- Very limited inventory

**Popular Developments:**

🏢 **The Ritz-Carlton Residences**
- Ultra-luxury, 5-star amenities
- $2M-$15M+

🏢 **Kimpton Seafire Residences**
- Modern, resort amenities
- $1.5M-$5M

🏢 **Plantana/Islands Club**
- Established, good value
- $600K-$1.5M

🏢 **Caribbean Club**
- Prime location
- $700K-$2M

**Investment Potential:**
- Short-term rental: $200-$600/night
- Occupancy: 70-85%
- Gross yield: 6-8%

**Tips:**
- Beach-level units rent best
- West-facing for sunsets
- Renovated units command premium

Would you like to see specific listings or meet with a Seven Mile Beach specialist?`;
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
  // Step 1: Detect intent and categories from LATEST query
  const userIntent = detectIntent(query);
  const categories = detectCategories(query);

  // Step 2: Use HYBRID search (keyword + vector semantic) for precision
  const relevantNodes = await searchKnowledgeBaseHybrid(query, categories, 15);

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

  // Step 7: Build response with detected categories for map integration
  const response: RAGResponse = {
    content: responseContent,
    places: extractPlaceCards(relevantNodes),
    mapMarkers: extractMapMarkers(relevantNodes),
    suggestedActions: generateSuggestedActions(relevantNodes, userIntent),
    confidence: relevantNodes.length > 0 ? 0.85 : 0.6,
    sourceNodeIds: relevantNodes.map(n => n.id),
    detectedCategories: categories
  };

  return response;
}

// ============ STREAMING RAG FUNCTION ============

export interface StreamingRAGCallbacks {
  onChunk: (content: string) => void;
  onComplete: (response: RAGResponse) => void;
  onError: (error: Error) => void;
}

export async function processQueryWithStreaming(
  query: string,
  conversationHistory: ChatMessage[] = [],
  callbacks: StreamingRAGCallbacks
): Promise<void> {
  try {
    // Step 0: Check VIP status for premium concierge mode
    console.log('🎩 [RAG] Checking VIP status...');
    let vipStatus: VIPStatus | null = null;
    let wealthProfile: WealthProfile | null = null;

    try {
      const session = getCurrentSession();
      if (session && session.messages.length > 0) {
        const analysis = analyzeConversation(
          session.messages,
          session.sessionId,
          session.visitorId
        );
        wealthProfile = analysis.aggregatedProfile;
        vipStatus = getVIPStatus(wealthProfile);

        if (vipStatus.isVIP) {
          console.log(`🎩 [VIP] ${vipStatus.tier.toUpperCase()} detected!`);
          console.log(`🎩 [VIP] Service level: ${vipStatus.serviceLevel}`);
          console.log(`🎩 [VIP] Concierge mode: ${vipStatus.conciergeMode}`);
          console.log(`🎩 [VIP] Features: ${vipStatus.unlockedFeatures.join(', ')}`);
        }
      }
    } catch (vipError) {
      console.warn('⚠️ [VIP] Could not determine VIP status:', vipError);
    }

    // Step 1: Use REFLECTION SERVICE for deep intent analysis & smart retrieval
    // This is the "thinking" phase - understanding what the user REALLY wants
    console.log('🧠 [RAG] Starting reflection-based processing...');

    let reflectionResult: ReflectionResult | null = null;
    let relevantNodes: KnowledgeNode[] = [];
    let categories: KnowledgeCategory[] = [];

    try {
      // Use reflection service for intelligent recommendations
      reflectionResult = await reflect(query, conversationHistory);

      // Extract nodes from top recommendations
      relevantNodes = reflectionResult.topRecommendations.map(r => r.place);

      // Add discovery suggestions for diversity
      const discoveryPlaces = reflectionResult.discoverAlso.map(d => d.place);
      const allNodeIds = new Set(relevantNodes.map(n => n.id));
      for (const place of discoveryPlaces) {
        if (!allNodeIds.has(place.id)) {
          relevantNodes.push(place);
        }
      }

      // Get categories from reflection intent
      categories = reflectionResult.intent.categories;

      console.log(`✨ [Reflection] Intent: ${reflectionResult.intent.naturalLanguageIntent}`);
      console.log(`   Confidence: ${(reflectionResult.intent.confidence * 100).toFixed(0)}%`);
      console.log(`   Top ${reflectionResult.topRecommendations.length} recommendations, ${reflectionResult.discoverAlso.length} discoveries`);
    } catch (reflectionError) {
      console.warn('⚠️ [Reflection] Fallback to hybrid search:', reflectionError);

      // Fallback to traditional hybrid search
      categories = detectCategories(query);
      relevantNodes = await searchKnowledgeBaseHybrid(query, categories, 15);
    }

    // Step 2: Detect user intent for prompt construction
    const userIntent = detectIntentWithContext(query, conversationHistory);
    console.log(`🎯 [RAG] Intent: ${userIntent}, Found ${relevantNodes.length} places`);

    // Step 2.5: Check for weather intent and fetch weather data if needed
    let weatherData: WeatherData | null = null;
    let weatherContext = '';

    const weatherIntent = detectWeatherIntent(query);
    if (weatherIntent.isWeatherQuery && weatherIntent.confidence > 0.3) {
      console.log(`🌤️ [Weather] Detected weather query (confidence: ${(weatherIntent.confidence * 100).toFixed(0)}%, type: ${weatherIntent.type})`);

      try {
        weatherData = await getWeather(weatherIntent.type);
        weatherContext = generateWeatherContext(weatherData);

        // Get activity recommendations based on weather
        const activityRecs = getWeatherBasedRecommendations(weatherData);
        weatherContext += '\n\n🏄 WEATHER-BASED ACTIVITY RECOMMENDATIONS:\n';
        for (const rec of activityRecs) {
          const emoji = rec.suitability === 'perfect' ? '✅' : rec.suitability === 'good' ? '👍' : rec.suitability === 'possible' ? '⚠️' : '❌';
          weatherContext += `${emoji} ${rec.activity}: ${rec.suitability.toUpperCase()} - ${rec.reason}\n`;
          if (rec.tips.length > 0) {
            weatherContext += `   Tips: ${rec.tips.join('; ')}\n`;
          }
        }

        console.log(`✅ [Weather] Weather data fetched successfully`);
      } catch (weatherError) {
        console.warn('⚠️ [Weather] Failed to fetch weather:', weatherError);
      }
    }

    // Step 3: Build context with knowledge base results + reflection insights
    const context: RAGContext = {
      query,
      relevantNodes,
      categories,
      userIntent,
      conversationHistory
    };

    // Step 4: Build system prompt - use VIP concierge prompt for HNWI+ visitors
    let systemPrompt: string;
    if (vipStatus && vipStatus.isVIP) {
      // Use premium concierge prompt for VIP visitors
      systemPrompt = getConciergePrompt(wealthProfile!) + '\n\n' + buildSystemPromptWithTools();
      console.log(`🎩 [VIP] Using ${vipStatus.conciergeMode} concierge prompt`);
    } else {
      systemPrompt = buildSystemPromptWithTools();
    }

    // Step 5: Build context prompt - enhanced with reflection reasoning if available
    let contextPrompt = buildContextPrompt(context);

    // Add VIP context enhancement for premium visitors
    if (vipStatus && vipStatus.isVIP && wealthProfile) {
      const vipContext = getVIPContextEnhancement(wealthProfile);
      if (vipContext) {
        contextPrompt = vipContext + '\n\n' + contextPrompt;
        console.log(`🎩 [VIP] Added VIP context enhancement`);
      }
    }

    // Add reflection reasoning to prompt if available
    if (reflectionResult && reflectionResult.topRecommendations.length > 0) {
      const reasoningSection = `
REFLECTION ANALYSIS (Use this to guide your response):
- User Intent: ${reflectionResult.intent.naturalLanguageIntent}
- Atmosphere: ${reflectionResult.intent.atmosphere.join(', ') || 'not specified'}
- Key Features Wanted: ${reflectionResult.intent.mustHaveFeatures.join(', ') || 'none specific'}
- Implicit Needs: ${reflectionResult.intent.implicitNeeds.join(', ') || 'none detected'}

TOP RECOMMENDATIONS WITH REASONING:
${reflectionResult.topRecommendations.slice(0, 5).map((r, i) =>
  `${i + 1}. **${r.place.name}** (${r.matchScore}% match)
     Why: ${r.reasoning}
     Highlights: ${r.highlights.join(', ')}`
).join('\n')}

${reflectionResult.discoverAlso.length > 0 ? `
DISCOVERY SUGGESTIONS (Related experiences to mention):
${reflectionResult.discoverAlso.map(d =>
  `- ${d.place.name}: ${d.connectionToQuery}`
).join('\n')}` : ''}

Use this analysis to provide intelligent, personalized recommendations.
`;
      contextPrompt = reasoningSection + '\n\n' + contextPrompt;
    }

    // Step 5.5: Add weather context if available
    if (weatherContext) {
      const weatherSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌤️ REAL-TIME WEATHER DATA FOR CAYMAN ISLANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${weatherContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT: The user asked about weather. Include this weather information in your response in a clear, helpful format. If they're planning activities, use the activity recommendations to advise them.
`;
      contextPrompt = weatherSection + '\n\n' + contextPrompt;
    }

    // Step 5.7: VIP Web Search Enhancement
    // For HNWI+ visitors, proactively enable real-time web search for better service
    let vipSearchContext = '';
    if (vipStatus && vipStatus.isVIP && shouldEnableWebSearch(wealthProfile!)) {
      console.log(`🔍 [VIP Search] Web search ENABLED for ${vipStatus.tier}`);

      // Check if query might benefit from real-time info
      const needsRealTimeInfo = /(?:availability|available|book|reserve|current|today|tonight|now|open|price|cost|rate|listing|for\s+sale)/i.test(query);

      if (needsRealTimeInfo && wealthProfile) {
        console.log(`🔍 [VIP Search] Query may need real-time info, performing VIP search...`);

        try {
          const vipSearchResult = await performVIPWebSearch(
            query,
            `User tier: ${vipStatus.tier}, Intent: ${userIntent}`,
            wealthProfile
          );

          if (vipSearchResult && vipSearchResult.summary) {
            vipSearchContext = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 VIP REAL-TIME INTELLIGENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${vipSearchResult.summary}

${vipSearchResult.suggestedActions.length > 0 ? `Suggested Actions: ${vipSearchResult.suggestedActions.join(', ')}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use this real-time information to provide accurate, actionable responses.
`;
            console.log(`✅ [VIP Search] Retrieved real-time intelligence`);
          }
        } catch (searchError) {
          console.warn('⚠️ [VIP Search] Failed:', searchError);
        }
      }
    }

    // Add VIP search context to prompt if available
    if (vipSearchContext) {
      contextPrompt = vipSearchContext + '\n\n' + contextPrompt;
    }

    // Step 6: Build message history
    const messages: ClaudeMessage[] = [
      ...conversationHistory.slice(-6).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: contextPrompt }
    ];

    // Step 7: Call API with function calling - let GPT decide when to search web (enhanced for VIP)
    const { finalContent, usedWebSearch } = await callOpenAIWithTools(
      systemPrompt,
      messages,
      query,
      (content: string) => {
        callbacks.onChunk(content);
      }
    );

    // Step 9: Build final response with reflection-enhanced data
    const suggestedActions = usedWebSearch
      ? [
          { id: 'action-cayman-airways', type: 'website' as const, label: 'Cayman Airways', url: 'https://www.caymanairways.com' },
          { id: 'action-gcm-airport', type: 'website' as const, label: 'GCM Airport', url: 'https://www.caymanairports.com' }
        ]
      : generateSuggestedActions(relevantNodes, userIntent);

    // Calculate confidence based on reflection result
    let confidence = 0.6;
    if (usedWebSearch) {
      confidence = 0.9;
    } else if (reflectionResult) {
      // Use reflection confidence as base
      confidence = reflectionResult.intent.confidence * 0.9;
      if (reflectionResult.topRecommendations.length >= 3) confidence += 0.1;
    } else if (relevantNodes.length > 0) {
      confidence = 0.75;
    }

    const response: RAGResponse = {
      content: finalContent,
      places: usedWebSearch ? [] : extractPlaceCards(relevantNodes),
      mapMarkers: usedWebSearch ? [] : extractMapMarkers(relevantNodes),
      suggestedActions,
      confidence: Math.min(0.95, confidence),
      sourceNodeIds: usedWebSearch ? [] : relevantNodes.map(n => n.id),
      detectedCategories: categories
    };

    console.log(`✅ [RAG] Response complete. Confidence: ${(confidence * 100).toFixed(0)}%`);

    callbacks.onComplete(response);
  } catch (error) {
    console.error('Error in streaming RAG:', error);
    callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
  }
}

// ============ UTILITY FUNCTIONS ============

export function getPlaceById(nodeId: string): KnowledgeNode | undefined {
  return getKnowledgeBase().find(node => node.id === nodeId);
}

export function getPlacesByCategory(category: KnowledgeCategory): KnowledgeNode[] {
  return getKnowledgeBase().filter(node => node.category === category);
}

export function getTopRatedPlaces(limit: number = 5): KnowledgeNode[] {
  return [...getKnowledgeBase()]
    .sort((a, b) => b.ratings.overall - a.ratings.overall)
    .slice(0, limit);
}

export function searchPlacesByName(query: string): KnowledgeNode[] {
  const lowerQuery = query.toLowerCase();
  return getKnowledgeBase().filter(node =>
    node.name.toLowerCase().includes(lowerQuery)
  );
}
