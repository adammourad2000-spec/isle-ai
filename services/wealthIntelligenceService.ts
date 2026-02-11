// ============================================
// ISLE AI - ADVANCED WEALTH INTELLIGENCE SERVICE
// Professional-Grade HNWI/UHNWI Profiling Engine
// Real-time NLP Analysis with Behavioral Analytics
// ============================================

import { ChatMessage } from '../types/chatbot';

// ============ TYPES ============

export type WealthTier = 'mass_market' | 'affluent' | 'mass_affluent' | 'hnwi' | 'vhnwi' | 'uhnwi' | 'billionaire' | 'unknown';

export interface WealthProfile {
  visitorId: string;
  sessionId: string;
  tier: WealthTier;
  confidence: number; // 0-100
  estimatedNetWorth: {
    min: number;
    max: number;
    median: number;
    currency: 'USD';
    methodology: string;
  };
  incomeProfile: {
    estimatedAnnualIncome: { min: number; max: number };
    incomeType: ('employment' | 'business' | 'investment' | 'inheritance' | 'unknown')[];
    stability: 'stable' | 'variable' | 'unknown';
  };
  signals: WealthSignal[];
  signalClusters: SignalCluster[];
  investmentIntent: InvestmentIntent;
  interests: InterestProfile;
  behaviorMetrics: BehaviorMetrics;
  psychographics: PsychographicProfile;
  leadScore: number;
  qualificationStatus: 'cold' | 'warm' | 'hot' | 'qualified';
  riskProfile: 'conservative' | 'moderate' | 'aggressive' | 'unknown';
  createdAt: string;
  updatedAt: string;
}

export interface WealthSignal {
  type: WealthSignalType;
  subType: string;
  value: string;
  weight: number;
  confidence: number;
  impliedMinWealth: number;
  impliedMaxWealth: number;
  timestamp: string;
  context: string;
  category: SignalCategory;
}

export type SignalCategory =
  | 'direct_disclosure'      // Explicit wealth mentions
  | 'lifestyle_indicator'    // Luxury goods, services, experiences
  | 'professional_status'    // Job titles, business ownership
  | 'financial_behavior'     // Investment, banking, planning mentions
  | 'real_estate'           // Property interests
  | 'travel_aviation'       // Travel patterns, private aviation
  | 'language_pattern'      // Vocabulary, phrasing sophistication
  | 'network_indicator'     // Connections, references to wealth networks
  | 'geographic';           // Location-based wealth signals

export type WealthSignalType =
  // Direct Wealth Indicators
  | 'explicit_net_worth'
  | 'asset_value_mention'
  | 'income_disclosure'
  | 'inheritance_mention'
  | 'exit_event'
  // Lifestyle Indicators
  | 'ultra_luxury_accommodation'
  | 'luxury_accommodation'
  | 'premium_accommodation'
  | 'private_aviation'
  | 'first_class_commercial'
  | 'yacht_ownership'
  | 'yacht_charter'
  | 'luxury_vehicle'
  | 'art_collection'
  | 'wine_collection'
  | 'private_club_membership'
  | 'luxury_watch'
  | 'designer_fashion'
  | 'personal_staff'
  | 'private_security'
  // Real Estate
  | 'ultra_prime_real_estate'
  | 'prime_real_estate'
  | 'luxury_real_estate'
  | 'multiple_properties'
  | 'real_estate_investment'
  | 'development_investment'
  // Professional Status
  | 'c_suite_executive'
  | 'senior_executive'
  | 'business_owner'
  | 'investor_professional'
  | 'fund_manager'
  | 'board_member'
  | 'entrepreneur_exit'
  | 'medical_professional'
  | 'legal_professional'
  | 'tech_professional'
  // Financial Behavior
  | 'private_banking'
  | 'family_office'
  | 'wealth_management'
  | 'hedge_fund_investor'
  | 'pe_vc_investor'
  | 'angel_investor'
  | 'tax_planning'
  | 'trust_structure'
  | 'offshore_structure'
  | 'philanthropy'
  // Geographic
  | 'prime_location_residence'
  | 'multiple_residences'
  | 'tax_haven_mention'
  // Behavioral
  | 'price_insensitivity'
  | 'concierge_expectation'
  | 'exclusivity_seeking'
  | 'sophisticated_vocabulary'
  | 'financial_literacy'
  | 'residency_investment';

export interface SignalCluster {
  category: SignalCategory;
  signals: WealthSignal[];
  combinedWeight: number;
  impliedWealthRange: { min: number; max: number };
  coherenceScore: number; // How well signals in this cluster align
}

export interface InvestmentIntent {
  hasIntent: boolean;
  confidence: number;
  type: ('real_estate' | 'residency' | 'business' | 'fund' | 'banking' | 'relocation' | 'unknown')[];
  timeline: 'immediate' | 'short_term' | 'medium_term' | 'long_term' | 'exploring' | 'unknown';
  urgencyScore: number;
  estimatedAmount: { min: number; max: number } | null;
  specificInterests: string[];
  decisionStage: 'awareness' | 'consideration' | 'decision' | 'action' | 'unknown';
}

export interface InterestProfile {
  categories: string[];
  luxuryPreferences: string[];
  locationPreferences: string[];
  activityPreferences: string[];
  accommodationType: string[];
  diningPreferences: string[];
  servicePriorities: string[];
}

export interface BehaviorMetrics {
  sessionCount: number;
  totalMessages: number;
  avgMessageLength: number;
  questionRatio: number;
  detailLevel: 'vague' | 'moderate' | 'specific' | 'very_specific';
  engagementLevel: 'low' | 'medium' | 'high' | 'very_high';
  responsePattern: 'brief' | 'conversational' | 'detailed';
  lastActive: string;
}

export interface PsychographicProfile {
  decisionStyle: 'analytical' | 'intuitive' | 'collaborative' | 'unknown';
  timeOrientation: 'immediate' | 'planned' | 'flexible';
  serviceExpectation: 'standard' | 'premium' | 'ultra_premium';
  privacyConcern: 'low' | 'moderate' | 'high';
  sophisticationLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
}

export interface ConversationAnalysis {
  sessionId: string;
  visitorId: string;
  messages: AnalyzedMessage[];
  aggregatedProfile: WealthProfile;
  keyInsights: string[];
  recommendedActions: RecommendedAction[];
  wealthNarrative: string;
}

export interface AnalyzedMessage {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  detectedSignals: WealthSignal[];
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: string;
  entities: ExtractedEntity[];
  sophisticationScore: number;
}

export interface ExtractedEntity {
  type: 'money' | 'location' | 'property' | 'company' | 'person' | 'date' | 'service' | 'brand';
  value: string;
  normalized: string;
  wealthImplication: number;
}

export interface RecommendedAction {
  type: 'vip_immediate' | 'connect_immigration' | 'connect_banking' | 'connect_realestate' | 'connect_legal' | 'nurture' | 'vip_followup' | 'executive_alert';
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  reason: string;
  suggestedPartner?: string;
  estimatedValue?: number;
}

// ============ WEALTH SIGNAL PATTERNS - COMPREHENSIVE ============

interface SignalPattern {
  patterns: RegExp[];
  weight: number;
  impliedMinWealth: number;
  impliedMaxWealth: number;
  confidence: number;
  category: SignalCategory;
  subType: string;
}

const WEALTH_PATTERNS: Record<WealthSignalType, SignalPattern> = {
  // === DIRECT WEALTH DISCLOSURE (Highest Confidence) ===
  explicit_net_worth: {
    patterns: [
      /(?:net\s+worth|worth|have|own)\s+(?:of\s+)?(?:around|about|approximately|roughly|over|more\s+than)?\s*\$?\s*(\d+(?:\.\d+)?)\s*(billion|b|million|m|thousand|k)/i,
      /\$\s*(\d+(?:\.\d+)?)\s*(billion|b|million|m)\s+(?:net\s+worth|portfolio|assets)/i,
      /(?:i'?m|i\s+am)\s+worth\s+\$?\s*(\d+)/i
    ],
    weight: 100,
    impliedMinWealth: 0, // Calculated from match
    impliedMaxWealth: 0,
    confidence: 95,
    category: 'direct_disclosure',
    subType: 'explicit_statement'
  },
  asset_value_mention: {
    patterns: [
      /(?:portfolio|investments?|assets?|holdings?)\s+(?:of|worth|valued?\s+at|totaling)\s+\$?\s*(\d+(?:\.\d+)?)\s*(billion|b|million|m|thousand|k)?/i,
      /\$\s*(\d+(?:\.\d+)?)\s*(billion|b|million|m)\s+(?:in\s+)?(?:assets?|investments?|stocks?|bonds?)/i,
      /(?:liquid|investable)\s+assets?\s+(?:of|around|about)?\s*\$?\s*(\d+)/i
    ],
    weight: 90,
    impliedMinWealth: 0,
    impliedMaxWealth: 0,
    confidence: 90,
    category: 'direct_disclosure',
    subType: 'asset_disclosure'
  },
  income_disclosure: {
    patterns: [
      /(?:earn|make|salary|income)\s+(?:of|around|about)?\s*\$?\s*(\d+(?:\.\d+)?)\s*(million|m|thousand|k)?\s*(?:per\s+)?(?:year|annually|a\s+year)?/i,
      /\$\s*(\d+(?:\.\d+)?)\s*(million|m|k)?\s+(?:per\s+year|annually|salary|income)/i
    ],
    weight: 70,
    impliedMinWealth: 0,
    impliedMaxWealth: 0,
    confidence: 85,
    category: 'direct_disclosure',
    subType: 'income_statement'
  },
  inheritance_mention: {
    patterns: [
      /(?:inherited|inheritance|family\s+money|trust\s+fund|family\s+wealth)/i,
      /(?:old\s+money|generational\s+wealth|family\s+fortune)/i
    ],
    weight: 60,
    impliedMinWealth: 5000000,
    impliedMaxWealth: 500000000,
    confidence: 60,
    category: 'direct_disclosure',
    subType: 'inheritance'
  },
  exit_event: {
    patterns: [
      /(?:sold|exited|cashed\s+out)\s+(?:my\s+)?(?:company|business|startup|stake)/i,
      /(?:ipo|acquisition|buyout|liquidity\s+event)/i,
      /(?:sold\s+for|exit\s+at|acquired\s+for)\s+\$?\s*(\d+)/i
    ],
    weight: 85,
    impliedMinWealth: 10000000,
    impliedMaxWealth: 1000000000,
    confidence: 80,
    category: 'direct_disclosure',
    subType: 'liquidity_event'
  },

  // === ULTRA LUXURY LIFESTYLE (Very High Correlation) ===
  ultra_luxury_accommodation: {
    patterns: [
      /aman(?:giri|jansara|tokyo|resorts?)?/i,
      /four\s+seasons\s+private/i,
      /(?:private|exclusive)\s+island\s+resort/i,
      /(?:necker|musha\s+cay|kamalame)/i,
      /presidential\s+(?:suite|villa|penthouse)/i,
      /owner'?s?\s+suite/i,
      /\$\s*\d{4,}\s*(?:per|a)\s*night/i
    ],
    weight: 75,
    impliedMinWealth: 30000000,
    impliedMaxWealth: 500000000,
    confidence: 85,
    category: 'lifestyle_indicator',
    subType: 'ultra_luxury_hotel'
  },
  luxury_accommodation: {
    patterns: [
      /ritz[- ]?carlton/i,
      /four\s+seasons/i,
      /st\.?\s*regis/i,
      /mandarin\s+oriental/i,
      /rosewood/i,
      /one\s*&\s*only/i,
      /peninsula\s+hotel/i,
      /waldorf\s+astoria/i,
      /park\s+hyatt/i,
      /bulgari\s+hotel/i,
      /cheval\s+blanc/i
    ],
    weight: 45,
    impliedMinWealth: 5000000,
    impliedMaxWealth: 100000000,
    confidence: 70,
    category: 'lifestyle_indicator',
    subType: 'luxury_hotel'
  },
  premium_accommodation: {
    patterns: [
      /kimpton/i,
      /palm\s+heights/i,
      /marriott\s+(?:marquis|luxury)/i,
      /luxury\s+(?:villa|resort|suite)/i,
      /penthouse\s+suite/i,
      /butler\s+service/i,
      /private\s+villa/i
    ],
    weight: 30,
    impliedMinWealth: 1000000,
    impliedMaxWealth: 30000000,
    confidence: 60,
    category: 'lifestyle_indicator',
    subType: 'premium_hotel'
  },
  private_aviation: {
    patterns: [
      /(?:my|own|our)\s+(?:private\s+)?(?:jet|plane|aircraft|g\d{3,4}|gulfstream|citation)/i,
      /netjets\s+(?:owner|card|share)/i,
      /(?:fractional|full)\s+ownership\s+(?:of\s+)?(?:a\s+)?(?:jet|aircraft)/i,
      /gulfstream\s+g[4-7]\d{2}/i,
      /bombardier\s+global/i,
      /dassault\s+falcon/i,
      /fly(?:ing)?\s+private(?:ly)?/i
    ],
    weight: 90,
    impliedMinWealth: 50000000,
    impliedMaxWealth: 5000000000,
    confidence: 90,
    category: 'travel_aviation',
    subType: 'private_jet_owner'
  },
  first_class_commercial: {
    patterns: [
      /(?:always|usually|only)\s+fly\s+(?:first|business)\s+class/i,
      /emirates\s+first/i,
      /singapore\s+suites/i,
      /etihad\s+(?:apartment|residence)/i,
      /first\s+class\s+(?:cabin|suite|lounge)/i
    ],
    weight: 35,
    impliedMinWealth: 2000000,
    impliedMaxWealth: 30000000,
    confidence: 65,
    category: 'travel_aviation',
    subType: 'premium_commercial'
  },
  yacht_ownership: {
    patterns: [
      /(?:my|our|own)\s+(?:super)?yacht/i,
      /(?:\d{2,3}\s*(?:foot|feet|ft|meter|m)\s+)?(?:my\s+)?(?:motor\s+)?yacht/i,
      /yacht\s+(?:captain|crew|maintenance)/i,
      /(?:benetti|feadship|lurssen|heesen|amels|oceanco)/i,
      /(?:marina|berth|slip)\s+(?:for\s+)?my\s+(?:boat|yacht)/i
    ],
    weight: 85,
    impliedMinWealth: 20000000,
    impliedMaxWealth: 1000000000,
    confidence: 88,
    category: 'lifestyle_indicator',
    subType: 'yacht_owner'
  },
  yacht_charter: {
    patterns: [
      /(?:charter|rent)\s+(?:a\s+)?(?:super)?yacht/i,
      /yacht\s+charter/i,
      /(?:crewed|luxury)\s+charter/i,
      /\$\s*\d{5,}\s*(?:per|a)\s*week\s+charter/i
    ],
    weight: 55,
    impliedMinWealth: 5000000,
    impliedMaxWealth: 100000000,
    confidence: 70,
    category: 'lifestyle_indicator',
    subType: 'yacht_charter'
  },
  luxury_vehicle: {
    patterns: [
      /(?:my|our|own)\s+(?:rolls[- ]?royce|bentley|maybach|ferrari|lamborghini|bugatti|mclaren|aston\s+martin)/i,
      /(?:rolls|bentley|ferrari|lambo)\s+(?:collection|fleet)/i,
      /(?:car|auto)\s+collection/i,
      /(?:hypercars?|supercars?)\s+(?:collection|owner)/i
    ],
    weight: 60,
    impliedMinWealth: 5000000,
    impliedMaxWealth: 200000000,
    confidence: 75,
    category: 'lifestyle_indicator',
    subType: 'luxury_auto'
  },
  art_collection: {
    patterns: [
      /(?:my|our)\s+(?:art\s+)?collection/i,
      /(?:collect|collecting)\s+(?:art|paintings|sculptures)/i,
      /(?:sotheby'?s|christie'?s|phillips)\s+(?:auction|purchase)/i,
      /(?:contemporary|modern|impressionist)\s+art\s+(?:collection|collector)/i,
      /art\s+advisor/i
    ],
    weight: 65,
    impliedMinWealth: 10000000,
    impliedMaxWealth: 500000000,
    confidence: 75,
    category: 'lifestyle_indicator',
    subType: 'art_collector'
  },
  wine_collection: {
    patterns: [
      /wine\s+(?:cellar|collection|cave)/i,
      /(?:collecting|invest\s+in)\s+(?:fine\s+)?wine/i,
      /(?:bordeaux|burgundy|champagne)\s+collection/i,
      /(?:romanee[- ]conti|petrus|lafite|margaux|mouton)/i
    ],
    weight: 45,
    impliedMinWealth: 3000000,
    impliedMaxWealth: 100000000,
    confidence: 65,
    category: 'lifestyle_indicator',
    subType: 'wine_collector'
  },
  private_club_membership: {
    patterns: [
      /(?:member\s+(?:of|at)|belong\s+to)\s+(?:the\s+)?(?:soho\s+house|core\s+club|casa\s+cipriani)/i,
      /(?:country|yacht|golf)\s+club\s+member/i,
      /(?:augusta|pebble\s+beach|pine\s+valley)/i,
      /private\s+(?:members[- ]?)?club/i,
      /invitation[- ]only\s+club/i
    ],
    weight: 50,
    impliedMinWealth: 5000000,
    impliedMaxWealth: 100000000,
    confidence: 70,
    category: 'lifestyle_indicator',
    subType: 'club_membership'
  },
  luxury_watch: {
    patterns: [
      /(?:my|wear|own)\s+(?:a\s+)?(?:patek|philippe|audemars|piguet|richard\s+mille|vacheron)/i,
      /(?:watch|timepiece)\s+collection/i,
      /(?:patek\s+philippe|ap\s+royal\s+oak|richard\s+mille)/i,
      /(?:nautilus|royal\s+oak|rm\s+\d{2,3})/i
    ],
    weight: 50,
    impliedMinWealth: 3000000,
    impliedMaxWealth: 100000000,
    confidence: 70,
    category: 'lifestyle_indicator',
    subType: 'luxury_watch'
  },
  designer_fashion: {
    patterns: [
      /(?:hermes|birkin|kelly\s+bag|chanel\s+couture)/i,
      /(?:haute\s+couture|bespoke\s+(?:suits?|tailoring))/i,
      /(?:savile\s+row|brioni|kiton)/i
    ],
    weight: 35,
    impliedMinWealth: 2000000,
    impliedMaxWealth: 50000000,
    confidence: 60,
    category: 'lifestyle_indicator',
    subType: 'luxury_fashion'
  },
  personal_staff: {
    patterns: [
      /(?:my|our)\s+(?:butler|chef|driver|pilot|assistant|housekeeper)/i,
      /(?:personal|private)\s+(?:chef|assistant|trainer|concierge)/i,
      /(?:household|domestic)\s+staff/i,
      /estate\s+manager/i,
      /(?:nanny|governess|au\s+pair)\s+(?:for\s+(?:my|our))?/i
    ],
    weight: 65,
    impliedMinWealth: 10000000,
    impliedMaxWealth: 500000000,
    confidence: 80,
    category: 'lifestyle_indicator',
    subType: 'personal_staff'
  },
  private_security: {
    patterns: [
      /(?:private|personal)\s+security/i,
      /security\s+(?:detail|team|personnel)/i,
      /bodyguard/i,
      /close\s+protection/i
    ],
    weight: 70,
    impliedMinWealth: 30000000,
    impliedMaxWealth: 1000000000,
    confidence: 80,
    category: 'lifestyle_indicator',
    subType: 'security_detail'
  },

  // === REAL ESTATE ===
  ultra_prime_real_estate: {
    patterns: [
      /\$\s*(?:[5-9]\d|[1-9]\d{2,})\s*m(?:illion)?\s+(?:property|home|estate|penthouse)/i,
      /(?:property|home|estate)\s+(?:worth|valued?\s+at|for)\s+\$\s*(?:[5-9]\d|[1-9]\d{2,})\s*m/i,
      /private\s+island/i,
      /(?:monaco|mayfair|belgravia|upper\s+east|palm\s+beach|bel[- ]?air|beverly\s+hills)\s+(?:property|home|residence)/i,
      /(?:buy|purchase|looking\s+at)\s+(?:a\s+)?compound/i
    ],
    weight: 85,
    impliedMinWealth: 50000000,
    impliedMaxWealth: 1000000000,
    confidence: 85,
    category: 'real_estate',
    subType: 'ultra_prime'
  },
  prime_real_estate: {
    patterns: [
      /\$\s*(?:[1-4]\d)\s*m(?:illion)?\s+(?:property|home|house|condo)/i,
      /(?:property|home)\s+(?:worth|valued?\s+at|for)\s+\$\s*(?:[1-4]\d)\s*m/i,
      /(?:oceanfront|beachfront|waterfront)\s+(?:estate|property|home)/i,
      /(?:seven\s+mile|rum\s+point|cayman\s+kai)\s+(?:property|home|estate)/i
    ],
    weight: 70,
    impliedMinWealth: 20000000,
    impliedMaxWealth: 200000000,
    confidence: 80,
    category: 'real_estate',
    subType: 'prime'
  },
  luxury_real_estate: {
    patterns: [
      /\$\s*[1-9]\s*m(?:illion)?\s+(?:property|home|house|condo)/i,
      /(?:property|home)\s+(?:for|around|about)\s+\$\s*[1-9]\s*m/i,
      /(?:luxury|upscale)\s+(?:property|home|condo)/i,
      /(?:buy|purchase|invest\s+in)\s+(?:a\s+)?(?:beachfront|waterfront)/i
    ],
    weight: 50,
    impliedMinWealth: 3000000,
    impliedMaxWealth: 30000000,
    confidence: 70,
    category: 'real_estate',
    subType: 'luxury'
  },
  multiple_properties: {
    patterns: [
      /(?:homes?|properties|residences)\s+in\s+(?:\w+\s+)?(?:and|,)/i,
      /(?:multiple|several)\s+(?:homes?|properties|residences)/i,
      /split\s+(?:time|year)\s+between/i,
      /(?:our|my)\s+(?:other\s+)?(?:home|place)\s+in/i
    ],
    weight: 55,
    impliedMinWealth: 10000000,
    impliedMaxWealth: 200000000,
    confidence: 75,
    category: 'real_estate',
    subType: 'multiple_homes'
  },
  real_estate_investment: {
    patterns: [
      /(?:real\s+estate|property)\s+(?:investment|portfolio|investor)/i,
      /(?:invest|investing)\s+in\s+(?:real\s+estate|properties)/i,
      /rental\s+(?:properties|portfolio|income)/i,
      /(?:commercial|residential)\s+(?:portfolio|investments?)/i
    ],
    weight: 45,
    impliedMinWealth: 5000000,
    impliedMaxWealth: 100000000,
    confidence: 70,
    category: 'real_estate',
    subType: 'investment'
  },
  development_investment: {
    patterns: [
      /(?:property|real\s+estate)\s+develop(?:ment|er)/i,
      /(?:develop|build)\s+(?:a\s+)?(?:resort|hotel|condo|property)/i,
      /development\s+(?:opportunity|project|site)/i,
      /(?:land|parcel)\s+for\s+development/i
    ],
    weight: 60,
    impliedMinWealth: 20000000,
    impliedMaxWealth: 500000000,
    confidence: 75,
    category: 'real_estate',
    subType: 'development'
  },

  // === PROFESSIONAL STATUS ===
  c_suite_executive: {
    patterns: [
      /(?:i'?m|i\s+am)\s+(?:the\s+)?(?:ceo|cfo|coo|cto|cmo|cio)\s+(?:of|at)/i,
      /(?:chief\s+(?:executive|financial|operating|technology|marketing)\s+officer)/i,
      /(?:run|lead|head)\s+(?:a\s+)?\$?\d+\s*(?:billion|million)\s+(?:company|business)/i
    ],
    weight: 65,
    impliedMinWealth: 10000000,
    impliedMaxWealth: 500000000,
    confidence: 75,
    category: 'professional_status',
    subType: 'c_suite'
  },
  senior_executive: {
    patterns: [
      /(?:i'?m|i\s+am)\s+(?:a\s+)?(?:managing|senior|executive)\s+(?:director|vp|vice\s+president|partner)/i,
      /(?:partner|principal)\s+at\s+(?:a\s+)?(?:law\s+firm|consulting|investment\s+bank)/i,
      /(?:goldman|mckinsey|bain|bcg|morgan\s+stanley|jpmorgan)/i
    ],
    weight: 50,
    impliedMinWealth: 5000000,
    impliedMaxWealth: 100000000,
    confidence: 70,
    category: 'professional_status',
    subType: 'senior_executive'
  },
  business_owner: {
    patterns: [
      /(?:my|own|our)\s+(?:company|business|firm|startup)/i,
      /(?:founded|started|run|own)\s+(?:a\s+)?(?:company|business)/i,
      /(?:entrepreneur|business\s+owner|founder)/i,
      /(?:sole|majority)\s+(?:owner|shareholder)/i
    ],
    weight: 45,
    impliedMinWealth: 2000000,
    impliedMaxWealth: 100000000,
    confidence: 60,
    category: 'professional_status',
    subType: 'business_owner'
  },
  investor_professional: {
    patterns: [
      /(?:professional|full[- ]?time|active)\s+investor/i,
      /(?:i\s+)?invest\s+(?:professionally|for\s+a\s+living)/i,
      /(?:portfolio|investment)\s+manager/i
    ],
    weight: 55,
    impliedMinWealth: 10000000,
    impliedMaxWealth: 200000000,
    confidence: 70,
    category: 'professional_status',
    subType: 'professional_investor'
  },
  fund_manager: {
    patterns: [
      /(?:manage|run)\s+(?:a\s+)?(?:hedge|private\s+equity|venture|fund)/i,
      /(?:gp|general\s+partner)\s+(?:at|of)\s+(?:a\s+)?fund/i,
      /(?:aum|assets\s+under\s+management)\s+of\s+\$?\d+/i,
      /(?:fund|portfolio)\s+(?:of|with)\s+\$?\d+\s*(?:billion|million)/i
    ],
    weight: 80,
    impliedMinWealth: 30000000,
    impliedMaxWealth: 1000000000,
    confidence: 85,
    category: 'professional_status',
    subType: 'fund_manager'
  },
  board_member: {
    patterns: [
      /(?:sit|serve)\s+on\s+(?:the\s+)?(?:board|boards)/i,
      /board\s+(?:member|director|seat)/i,
      /(?:public|fortune\s+\d+)\s+company\s+board/i
    ],
    weight: 55,
    impliedMinWealth: 10000000,
    impliedMaxWealth: 200000000,
    confidence: 70,
    category: 'professional_status',
    subType: 'board_member'
  },
  entrepreneur_exit: {
    patterns: [
      /(?:sold|exited)\s+(?:my\s+)?(?:company|business|startup)/i,
      /(?:successful|recent)\s+exit/i,
      /(?:post[- ]?exit|after\s+selling)/i,
      /(?:ipo'?d|went\s+public)/i
    ],
    weight: 80,
    impliedMinWealth: 20000000,
    impliedMaxWealth: 1000000000,
    confidence: 85,
    category: 'professional_status',
    subType: 'exit_founder'
  },
  medical_professional: {
    patterns: [
      /(?:i'?m|i\s+am)\s+(?:a\s+)?(?:surgeon|physician|specialist|doctor)/i,
      /(?:private|own\s+my\s+own)\s+(?:practice|clinic)/i,
      /(?:medical|healthcare)\s+(?:practice|group)/i
    ],
    weight: 35,
    impliedMinWealth: 2000000,
    impliedMaxWealth: 20000000,
    confidence: 65,
    category: 'professional_status',
    subType: 'medical'
  },
  legal_professional: {
    patterns: [
      /(?:partner|senior\s+partner)\s+(?:at|in)\s+(?:a\s+)?(?:law\s+)?firm/i,
      /(?:equity|name)\s+partner/i,
      /(?:big\s+law|am\s+law\s+\d+)/i
    ],
    weight: 45,
    impliedMinWealth: 5000000,
    impliedMaxWealth: 50000000,
    confidence: 70,
    category: 'professional_status',
    subType: 'legal'
  },
  tech_professional: {
    patterns: [
      /(?:early\s+)?(?:employee|engineer)\s+at\s+(?:google|meta|apple|microsoft|amazon|stripe|coinbase)/i,
      /(?:pre[- ]?ipo|early\s+stage)\s+(?:equity|stock|options)/i,
      /(?:tech|startup)\s+(?:founder|co-?founder)/i
    ],
    weight: 50,
    impliedMinWealth: 5000000,
    impliedMaxWealth: 100000000,
    confidence: 65,
    category: 'professional_status',
    subType: 'tech'
  },

  // === FINANCIAL BEHAVIOR ===
  private_banking: {
    patterns: [
      /(?:my\s+)?(?:private\s+banker|relationship\s+manager|wealth\s+advisor)/i,
      /(?:private\s+banking|private\s+client)\s+(?:at|with)/i,
      /(?:ubs|credit\s+suisse|julius\s+baer|lombard\s+odier|pictet)/i,
      /(?:jpmorgan|goldman|morgan\s+stanley)\s+private/i
    ],
    weight: 60,
    impliedMinWealth: 10000000,
    impliedMaxWealth: 200000000,
    confidence: 80,
    category: 'financial_behavior',
    subType: 'private_banking'
  },
  family_office: {
    patterns: [
      /(?:my|our)\s+family\s+office/i,
      /(?:single|multi)[- ]?family\s+office/i,
      /family\s+office\s+(?:team|staff|cio)/i,
      /(?:sfo|mfo)\s+(?:client|structure)/i
    ],
    weight: 95,
    impliedMinWealth: 100000000,
    impliedMaxWealth: 10000000000,
    confidence: 95,
    category: 'financial_behavior',
    subType: 'family_office'
  },
  wealth_management: {
    patterns: [
      /(?:wealth|asset)\s+management/i,
      /(?:my\s+)?(?:wealth|asset|investment)\s+manager/i,
      /(?:advisor|adviser)\s+(?:at|from)\s+(?:merrill|schwab|fidelity|vanguard)/i
    ],
    weight: 40,
    impliedMinWealth: 1000000,
    impliedMaxWealth: 30000000,
    confidence: 65,
    category: 'financial_behavior',
    subType: 'wealth_management'
  },
  hedge_fund_investor: {
    patterns: [
      /(?:invest|invested|lp)\s+(?:in|with)\s+(?:hedge|alternative)\s+funds?/i,
      /(?:hedge\s+fund|alternative)\s+(?:investor|allocation|portfolio)/i,
      /(?:2\s+and\s+20|carried\s+interest|management\s+fee)/i
    ],
    weight: 60,
    impliedMinWealth: 10000000,
    impliedMaxWealth: 200000000,
    confidence: 75,
    category: 'financial_behavior',
    subType: 'hedge_fund'
  },
  pe_vc_investor: {
    patterns: [
      /(?:invest|invested|lp)\s+(?:in|with)\s+(?:private\s+equity|pe|vc|venture)/i,
      /(?:pe|vc)\s+(?:investor|allocation|fund)/i,
      /(?:limited\s+partner|lp\s+commitment)/i,
      /(?:co[- ]?invest|direct\s+investment)/i
    ],
    weight: 70,
    impliedMinWealth: 25000000,
    impliedMaxWealth: 500000000,
    confidence: 80,
    category: 'financial_behavior',
    subType: 'pe_vc'
  },
  angel_investor: {
    patterns: [
      /angel\s+(?:investor|investing|investments?)/i,
      /(?:invest|invested)\s+in\s+(?:startups?|early[- ]?stage)/i,
      /(?:seed|pre[- ]?seed)\s+(?:investor|round)/i
    ],
    weight: 45,
    impliedMinWealth: 3000000,
    impliedMaxWealth: 50000000,
    confidence: 70,
    category: 'financial_behavior',
    subType: 'angel'
  },
  tax_planning: {
    patterns: [
      /tax\s+(?:planning|optimization|efficient|strategy)/i,
      /(?:minimize|reduce|defer)\s+(?:taxes|tax\s+liability)/i,
      /(?:estate|gift)\s+tax\s+planning/i,
      /(?:qsbs|opportunity\s+zone|1031\s+exchange)/i
    ],
    weight: 50,
    impliedMinWealth: 5000000,
    impliedMaxWealth: 100000000,
    confidence: 70,
    category: 'financial_behavior',
    subType: 'tax_planning'
  },
  trust_structure: {
    patterns: [
      /(?:family|irrevocable|revocable|dynasty)\s+trust/i,
      /(?:set\s+up|establish|create)\s+(?:a\s+)?trust/i,
      /(?:trust|estate)\s+(?:planning|attorney|structure)/i,
      /(?:grantor|beneficiary|trustee)/i
    ],
    weight: 55,
    impliedMinWealth: 10000000,
    impliedMaxWealth: 200000000,
    confidence: 75,
    category: 'financial_behavior',
    subType: 'trust'
  },
  offshore_structure: {
    patterns: [
      /(?:offshore|cayman|bvi|jersey|guernsey)\s+(?:company|structure|fund|vehicle)/i,
      /(?:tax|asset)\s+(?:haven|shelter|protection)/i,
      /(?:holding|investment)\s+company\s+(?:in|based)/i
    ],
    weight: 65,
    impliedMinWealth: 20000000,
    impliedMaxWealth: 500000000,
    confidence: 75,
    category: 'financial_behavior',
    subType: 'offshore'
  },
  philanthropy: {
    patterns: [
      /(?:my|our)\s+(?:foundation|charitable\s+trust)/i,
      /(?:philanthropic|charitable)\s+(?:work|giving|activities)/i,
      /(?:donor|donating|give)\s+(?:to\s+)?(?:charity|causes)/i,
      /(?:endow|establish)\s+(?:a\s+)?(?:foundation|scholarship|chair)/i
    ],
    weight: 55,
    impliedMinWealth: 10000000,
    impliedMaxWealth: 500000000,
    confidence: 70,
    category: 'financial_behavior',
    subType: 'philanthropy'
  },

  // === GEOGRAPHIC INDICATORS ===
  prime_location_residence: {
    patterns: [
      /(?:live|reside|home)\s+(?:in|on)\s+(?:the\s+)?(?:upper\s+east|tribeca|hamptons|palm\s+beach|aspen|nantucket)/i,
      /(?:monaco|knightsbridge|mayfair|belgravia|kensington)/i,
      /(?:manhattan|london|dubai|singapore|hong\s+kong)\s+(?:apartment|penthouse|flat)/i
    ],
    weight: 50,
    impliedMinWealth: 10000000,
    impliedMaxWealth: 200000000,
    confidence: 70,
    category: 'geographic',
    subType: 'prime_residence'
  },
  multiple_residences: {
    patterns: [
      /(?:homes?|places?|apartments?)\s+in\s+(?:both|multiple|\w+\s+and)/i,
      /between\s+(?:new\s+york|london|dubai|singapore|hong\s+kong|miami)/i,
      /(?:summer|winter|ski)\s+(?:home|place|house)\s+in/i
    ],
    weight: 55,
    impliedMinWealth: 10000000,
    impliedMaxWealth: 200000000,
    confidence: 75,
    category: 'geographic',
    subType: 'multi_residence'
  },
  tax_haven_mention: {
    patterns: [
      /(?:moved|relocating|moving)\s+(?:to\s+)?(?:cayman|monaco|dubai|singapore)/i,
      /(?:tax|residency)\s+(?:reasons?|benefits?|advantages?)/i,
      /(?:no\s+income\s+tax|zero\s+tax|tax[- ]?free)/i
    ],
    weight: 60,
    impliedMinWealth: 20000000,
    impliedMaxWealth: 500000000,
    confidence: 75,
    category: 'geographic',
    subType: 'tax_jurisdiction'
  },

  // === BEHAVIORAL INDICATORS ===
  price_insensitivity: {
    patterns: [
      /(?:budget|price|cost)\s+(?:is\s+)?(?:not|no)\s+(?:a\s+)?(?:concern|issue|problem|factor)/i,
      /(?:money|price)\s+(?:is\s+)?no\s+object/i,
      /(?:whatever\s+it\s+(?:takes|costs)|spare\s+no\s+expense)/i,
      /(?:best|finest|top)\s+(?:available|you\s+have|option)/i,
      /don'?t\s+(?:care|worry)\s+about\s+(?:the\s+)?(?:price|cost)/i
    ],
    weight: 45,
    impliedMinWealth: 5000000,
    impliedMaxWealth: 100000000,
    confidence: 70,
    category: 'language_pattern',
    subType: 'price_insensitive'
  },
  concierge_expectation: {
    patterns: [
      /(?:expect|accustomed\s+to|used\s+to)\s+(?:concierge|white\s+glove|full)\s+service/i,
      /(?:personal|dedicated)\s+(?:concierge|service)/i,
      /(?:arrange|handle|take\s+care\s+of)\s+everything/i
    ],
    weight: 40,
    impliedMinWealth: 5000000,
    impliedMaxWealth: 100000000,
    confidence: 65,
    category: 'language_pattern',
    subType: 'service_expectation'
  },
  exclusivity_seeking: {
    patterns: [
      /(?:exclusive|private|vip)\s+(?:access|experience|event)/i,
      /(?:not\s+open\s+to|closed\s+to)\s+(?:the\s+)?public/i,
      /(?:members?[- ]?only|invitation[- ]?only)/i,
      /(?:bespoke|custom|tailor[- ]?made)/i
    ],
    weight: 35,
    impliedMinWealth: 3000000,
    impliedMaxWealth: 50000000,
    confidence: 60,
    category: 'language_pattern',
    subType: 'exclusivity'
  },
  sophisticated_vocabulary: {
    patterns: [
      /(?:asset\s+allocation|diversification|alternative\s+investments)/i,
      /(?:liquidity\s+event|cap\s+table|term\s+sheet)/i,
      /(?:carried\s+interest|hurdle\s+rate|waterfall)/i,
      /(?:basis\s+points|bips|yield\s+curve)/i
    ],
    weight: 40,
    impliedMinWealth: 10000000,
    impliedMaxWealth: 200000000,
    confidence: 70,
    category: 'language_pattern',
    subType: 'financial_sophistication'
  },
  financial_literacy: {
    patterns: [
      /(?:alpha|beta|sharpe\s+ratio)/i,
      /(?:monte\s+carlo|black[- ]scholes|dcf)/i,
      /(?:cap\s+rate|noi|irr|moic)/i
    ],
    weight: 35,
    impliedMinWealth: 5000000,
    impliedMaxWealth: 100000000,
    confidence: 65,
    category: 'language_pattern',
    subType: 'financial_knowledge'
  },
  residency_investment: {
    patterns: [
      /(?:residency|citizenship)\s+(?:by\s+investment|program)/i,
      /(?:golden\s+visa|investor\s+visa)/i,
      /(?:certificate\s+of\s+direct\s+investment|cdi)/i,
      /(?:permanent\s+residen(?:ce|cy)|pr\s+status)/i,
      /(?:relocat(?:e|ing|ion)|move)\s+(?:to\s+)?(?:cayman|islands?)/i
    ],
    weight: 70,
    impliedMinWealth: 15000000,
    impliedMaxWealth: 200000000,
    confidence: 80,
    category: 'financial_behavior',
    subType: 'residency_investment'
  }
};

// ============ WEALTH TIER THRESHOLDS (Based on Industry Standards) ============

const WEALTH_TIER_DEFINITIONS: Record<WealthTier, {
  label: string;
  minNetWorth: number;
  maxNetWorth: number;
  description: string;
  globalPopulation: string;
}> = {
  unknown: {
    label: 'Unknown',
    minNetWorth: 0,
    maxNetWorth: 0,
    description: 'Insufficient data for classification',
    globalPopulation: 'N/A'
  },
  mass_market: {
    label: 'Mass Market',
    minNetWorth: 0,
    maxNetWorth: 100000,
    description: 'Below investable asset threshold',
    globalPopulation: '~70% of adults'
  },
  affluent: {
    label: 'Affluent',
    minNetWorth: 100000,
    maxNetWorth: 500000,
    description: 'Emerging wealth, accumulating assets',
    globalPopulation: '~20% of adults'
  },
  mass_affluent: {
    label: 'Mass Affluent',
    minNetWorth: 500000,
    maxNetWorth: 1000000,
    description: 'Solid wealth, approaching millionaire status',
    globalPopulation: '~8% of adults'
  },
  hnwi: {
    label: 'High Net Worth Individual',
    minNetWorth: 1000000,
    maxNetWorth: 10000000,
    description: 'Millionaire, investable assets $1M+',
    globalPopulation: '~1.5% of adults (~62M globally)'
  },
  vhnwi: {
    label: 'Very High Net Worth Individual',
    minNetWorth: 10000000,
    maxNetWorth: 30000000,
    description: 'Decamillionaire, sophisticated investor',
    globalPopulation: '~0.15% of adults (~6M globally)'
  },
  uhnwi: {
    label: 'Ultra High Net Worth Individual',
    minNetWorth: 30000000,
    maxNetWorth: 1000000000,
    description: 'Centimillionaire, family office territory',
    globalPopulation: '~0.003% of adults (~265K globally)'
  },
  billionaire: {
    label: 'Billionaire',
    minNetWorth: 1000000000,
    maxNetWorth: Infinity,
    description: 'Billionaire, extreme wealth concentration',
    globalPopulation: '~0.00004% (~3,300 globally)'
  }
};

// ============ PROFESSION-BASED WEALTH ESTIMATES ============

const PROFESSION_WEALTH_ESTIMATES: Record<string, { min: number; max: number; median: number }> = {
  'ceo_fortune_500': { min: 50000000, max: 1000000000, median: 150000000 },
  'ceo_public_company': { min: 10000000, max: 200000000, median: 30000000 },
  'ceo_private_company': { min: 5000000, max: 100000000, median: 15000000 },
  'hedge_fund_manager': { min: 50000000, max: 5000000000, median: 200000000 },
  'pe_partner': { min: 30000000, max: 500000000, median: 75000000 },
  'vc_partner': { min: 10000000, max: 200000000, median: 30000000 },
  'investment_banker_md': { min: 10000000, max: 100000000, median: 25000000 },
  'biglaw_partner': { min: 5000000, max: 50000000, median: 12000000 },
  'tech_founder_exit': { min: 10000000, max: 1000000000, median: 50000000 },
  'tech_executive': { min: 5000000, max: 100000000, median: 20000000 },
  'surgeon_specialist': { min: 3000000, max: 20000000, median: 7000000 },
  'real_estate_developer': { min: 10000000, max: 500000000, median: 50000000 },
  'family_office_principal': { min: 100000000, max: 10000000000, median: 500000000 }
};

// ============ ANALYSIS FUNCTIONS ============

/**
 * Parse monetary values from text with high accuracy
 */
function parseMonetaryValue(text: string): number | null {
  const patterns = [
    /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(billion|b)/i,
    /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|m|mm)/i,
    /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(thousand|k)/i,
    /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(billion|b)\s*(?:dollars?|usd)?/i,
    /(\d+(?:\.\d+)?)\s*(million|m|mm)\s*(?:dollars?|usd)?/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      const unit = match[2]?.toLowerCase() || '';

      if (unit.startsWith('b')) return value * 1e9;
      if (unit.startsWith('m')) return value * 1e6;
      if (unit.startsWith('k') || unit.startsWith('t')) return value * 1e3;
      if (value > 1000) return value; // Assume raw dollars if > 1000
      return value * 1e6; // Default to millions for ambiguous cases
    }
  }
  return null;
}

/**
 * Analyze a single message for wealth signals with advanced NLP
 */
export function analyzeMessage(message: ChatMessage): AnalyzedMessage {
  const content = message.content;
  const signals: WealthSignal[] = [];
  const entities: ExtractedEntity[] = [];

  // Detect wealth signals with context
  for (const [signalType, config] of Object.entries(WEALTH_PATTERNS)) {
    for (const pattern of config.patterns) {
      const match = content.match(pattern);
      if (match) {
        // Calculate implied wealth from pattern
        let impliedMin = config.impliedMinWealth;
        let impliedMax = config.impliedMaxWealth;

        // If pattern captures a monetary value, use it
        const monetaryValue = parseMonetaryValue(match[0]);
        if (monetaryValue) {
          impliedMin = monetaryValue * 0.5; // Conservative estimate
          impliedMax = monetaryValue * 3;   // Upper bound
        }

        signals.push({
          type: signalType as WealthSignalType,
          subType: config.subType,
          value: match[0],
          weight: config.weight,
          confidence: config.confidence,
          impliedMinWealth: impliedMin,
          impliedMaxWealth: impliedMax,
          timestamp: new Date().toISOString(),
          context: content.substring(
            Math.max(0, match.index! - 60),
            Math.min(content.length, match.index! + match[0].length + 60)
          ),
          category: config.category
        });
      }
    }
  }

  // Extract entities (brands, locations, amounts)
  extractEntities(content, entities);

  // Calculate sophistication score based on vocabulary and specificity
  const sophisticationScore = calculateSophisticationScore(content);

  return {
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role: message.role,
    content,
    timestamp: message.timestamp || new Date().toISOString(),
    detectedSignals: signals,
    sentiment: analyzeSentiment(content),
    intent: detectMessageIntent(content),
    entities,
    sophisticationScore
  };
}

/**
 * Calculate sophistication score from message content
 */
function calculateSophisticationScore(content: string): number {
  let score = 0;
  const lowerContent = content.toLowerCase();

  // Financial terminology
  const financialTerms = [
    'portfolio', 'allocation', 'diversification', 'liquidity', 'hedge',
    'alternative investments', 'private equity', 'venture capital',
    'carried interest', 'basis points', 'yield', 'irr', 'cap rate',
    'asset class', 'risk-adjusted', 'due diligence', 'term sheet'
  ];

  for (const term of financialTerms) {
    if (lowerContent.includes(term)) score += 5;
  }

  // Specific vs vague language
  if (/\$\s*\d+/.test(content)) score += 10; // Specific amounts
  if (/\d+\s*(?:percent|%|bps)/.test(content)) score += 5; // Percentages
  if (/(?:specifically|exactly|precisely)/.test(lowerContent)) score += 3;

  // Professional language patterns
  if (/(?:my\s+team|our\s+team|my\s+people)/.test(lowerContent)) score += 5;
  if (/(?:due\s+diligence|risk\s+assessment|valuation)/.test(lowerContent)) score += 8;

  return Math.min(100, score);
}

/**
 * Analyze entire conversation with advanced profiling
 */
export function analyzeConversation(
  messages: ChatMessage[],
  sessionId: string,
  visitorId: string
): ConversationAnalysis {
  // Analyze each user message
  const analyzedMessages = messages
    .filter(m => m.role === 'user')
    .map(m => analyzeMessage(m));

  // Aggregate all signals
  const allSignals = analyzedMessages.flatMap(m => m.detectedSignals);

  // Cluster signals by category
  const signalClusters = clusterSignals(allSignals);

  // Calculate wealth estimate using multiple methodologies
  const wealthEstimate = calculatePreciseWealthEstimate(allSignals, signalClusters, analyzedMessages);

  // Determine tier from estimated wealth
  const tier = determineWealthTierFromEstimate(wealthEstimate.median);

  // Analyze investment intent
  const investmentIntent = analyzeInvestmentIntent(messages, allSignals);

  // Build psychographic profile
  const psychographics = buildPsychographicProfile(analyzedMessages, allSignals);

  // Calculate behavior metrics
  const behaviorMetrics = calculateBehaviorMetrics(messages, analyzedMessages);

  // Build interest profile
  const interests = buildInterestProfile(messages);

  // Estimate income profile
  const incomeProfile = estimateIncomeProfile(allSignals, tier);

  // Calculate lead score
  const leadScore = calculateAdvancedLeadScore(
    wealthEstimate,
    investmentIntent,
    behaviorMetrics,
    psychographics,
    signalClusters
  );

  // Determine qualification status
  const qualificationStatus = determineQualificationStatus(leadScore, investmentIntent, tier);

  // Determine risk profile
  const riskProfile = determineRiskProfile(allSignals, psychographics);

  // Calculate confidence based on signal quality and quantity
  const confidence = calculateConfidence(allSignals, signalClusters);

  // Build wealth profile
  const profile: WealthProfile = {
    visitorId,
    sessionId,
    tier,
    confidence,
    estimatedNetWorth: wealthEstimate,
    incomeProfile,
    signals: allSignals,
    signalClusters,
    investmentIntent,
    interests,
    behaviorMetrics,
    psychographics,
    leadScore,
    qualificationStatus,
    riskProfile,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Generate narrative summary
  const wealthNarrative = generateWealthNarrative(profile);

  // Generate key insights
  const keyInsights = generateInsights(profile, analyzedMessages);

  // Generate recommended actions
  const recommendedActions = generateRecommendedActions(profile);

  return {
    sessionId,
    visitorId,
    messages: analyzedMessages,
    aggregatedProfile: profile,
    keyInsights,
    recommendedActions,
    wealthNarrative
  };
}

/**
 * Cluster signals by category for coherence analysis
 */
function clusterSignals(signals: WealthSignal[]): SignalCluster[] {
  const categories: SignalCategory[] = [
    'direct_disclosure', 'lifestyle_indicator', 'professional_status',
    'financial_behavior', 'real_estate', 'travel_aviation',
    'language_pattern', 'network_indicator', 'geographic'
  ];

  return categories.map(category => {
    const categorySignals = signals.filter(s => s.category === category);

    if (categorySignals.length === 0) {
      return {
        category,
        signals: [],
        combinedWeight: 0,
        impliedWealthRange: { min: 0, max: 0 },
        coherenceScore: 0
      };
    }

    // Calculate combined weight with diminishing returns
    const combinedWeight = categorySignals.reduce((sum, s, i) => {
      return sum + s.weight * Math.pow(0.8, i); // Diminishing returns
    }, 0);

    // Calculate implied wealth range (take overlapping range)
    const impliedMin = Math.max(...categorySignals.map(s => s.impliedMinWealth));
    const impliedMax = Math.min(...categorySignals.map(s => s.impliedMaxWealth));

    // Coherence: how consistent are the signals?
    const avgConfidence = categorySignals.reduce((s, sig) => s + sig.confidence, 0) / categorySignals.length;
    const rangeValid = impliedMax >= impliedMin;
    const coherenceScore = rangeValid ? avgConfidence : avgConfidence * 0.5;

    return {
      category,
      signals: categorySignals,
      combinedWeight,
      impliedWealthRange: {
        min: rangeValid ? impliedMin : Math.min(...categorySignals.map(s => s.impliedMinWealth)),
        max: rangeValid ? impliedMax : Math.max(...categorySignals.map(s => s.impliedMaxWealth))
      },
      coherenceScore
    };
  }).filter(c => c.signals.length > 0);
}

/**
 * Calculate precise wealth estimate using multiple signals and cross-validation
 */
function calculatePreciseWealthEstimate(
  signals: WealthSignal[],
  clusters: SignalCluster[],
  messages: AnalyzedMessage[]
): WealthProfile['estimatedNetWorth'] {
  if (signals.length === 0) {
    return {
      min: 0,
      max: 0,
      median: 0,
      currency: 'USD',
      methodology: 'No signals detected'
    };
  }

  // Method 1: Direct disclosure (highest confidence)
  const directDisclosure = clusters.find(c => c.category === 'direct_disclosure');
  if (directDisclosure && directDisclosure.signals.length > 0) {
    // Find explicit net worth mentions first
    const explicitNetWorth = directDisclosure.signals.find(s => s.type === 'explicit_net_worth');
    if (explicitNetWorth) {
      const value = parseMonetaryValue(explicitNetWorth.value);
      if (value) {
        return {
          min: value * 0.8,
          max: value * 1.2,
          median: value,
          currency: 'USD',
          methodology: 'Direct wealth disclosure'
        };
      }
    }
  }

  // Method 2: Lifestyle triangulation
  const lifestyleEstimates: number[] = [];

  for (const signal of signals) {
    if (signal.impliedMinWealth > 0 && signal.impliedMaxWealth > 0) {
      const midpoint = (signal.impliedMinWealth + signal.impliedMaxWealth) / 2;
      // Weight by confidence
      lifestyleEstimates.push(midpoint * (signal.confidence / 100));
    }
  }

  // Method 3: Signal cluster convergence
  const clusterEstimates: number[] = [];
  for (const cluster of clusters) {
    if (cluster.impliedWealthRange.min > 0) {
      const clusterMidpoint = (cluster.impliedWealthRange.min + cluster.impliedWealthRange.max) / 2;
      clusterEstimates.push(clusterMidpoint * (cluster.coherenceScore / 100));
    }
  }

  // Method 4: Sophistication-based estimate
  const avgSophistication = messages.reduce((s, m) => s + m.sophisticationScore, 0) / (messages.length || 1);
  const sophisticationBasedMin = avgSophistication > 50 ? 10000000 :
                                  avgSophistication > 25 ? 1000000 : 100000;

  // Combine all estimates
  const allEstimates = [
    ...lifestyleEstimates,
    ...clusterEstimates
  ].filter(e => e > 0);

  if (allEstimates.length === 0) {
    // Fall back to sophistication-based estimate
    return {
      min: sophisticationBasedMin,
      max: sophisticationBasedMin * 10,
      median: sophisticationBasedMin * 3,
      currency: 'USD',
      methodology: 'Behavioral inference'
    };
  }

  // Calculate weighted median
  allEstimates.sort((a, b) => a - b);
  const medianEstimate = allEstimates[Math.floor(allEstimates.length / 2)];

  // Calculate bounds using cluster ranges
  const allMins = signals.map(s => s.impliedMinWealth).filter(v => v > 0);
  const allMaxs = signals.map(s => s.impliedMaxWealth).filter(v => v > 0);

  const estimatedMin = allMins.length > 0 ? Math.max(...allMins) : medianEstimate * 0.5;
  const estimatedMax = allMaxs.length > 0 ? Math.min(...allMaxs.filter(m => m > estimatedMin)) || Math.max(...allMaxs) : medianEstimate * 3;

  return {
    min: Math.round(estimatedMin),
    max: Math.round(estimatedMax),
    median: Math.round(medianEstimate),
    currency: 'USD',
    methodology: `Multi-signal triangulation (${signals.length} signals, ${clusters.length} clusters)`
  };
}

/**
 * Determine wealth tier from estimated net worth
 */
function determineWealthTierFromEstimate(medianNetWorth: number): WealthTier {
  if (medianNetWorth >= 1e9) return 'billionaire';
  if (medianNetWorth >= 30e6) return 'uhnwi';
  if (medianNetWorth >= 10e6) return 'vhnwi';
  if (medianNetWorth >= 1e6) return 'hnwi';
  if (medianNetWorth >= 500000) return 'mass_affluent';
  if (medianNetWorth >= 100000) return 'affluent';
  if (medianNetWorth > 0) return 'mass_market';
  return 'unknown';
}

/**
 * Calculate confidence score based on signal quality and consistency
 */
function calculateConfidence(signals: WealthSignal[], clusters: SignalCluster[]): number {
  if (signals.length === 0) return 0;

  // Base confidence from number of signals
  let confidence = Math.min(signals.length * 8, 40);

  // Add confidence for high-weight signals
  const hasDirectDisclosure = signals.some(s => s.category === 'direct_disclosure');
  if (hasDirectDisclosure) confidence += 30;

  // Add confidence for cluster coherence
  const avgCoherence = clusters.reduce((s, c) => s + c.coherenceScore, 0) / (clusters.length || 1);
  confidence += avgCoherence * 0.2;

  // Add confidence for multiple corroborating categories
  const activeCategories = clusters.filter(c => c.signals.length > 0).length;
  confidence += activeCategories * 5;

  // Cap at 98% (never claim 100% certainty)
  return Math.min(98, Math.round(confidence));
}

/**
 * Build psychographic profile from conversation patterns
 */
function buildPsychographicProfile(
  messages: AnalyzedMessage[],
  signals: WealthSignal[]
): PsychographicProfile {
  const allContent = messages.map(m => m.content.toLowerCase()).join(' ');
  const avgSophistication = messages.reduce((s, m) => s + m.sophisticationScore, 0) / (messages.length || 1);

  // Decision style
  let decisionStyle: PsychographicProfile['decisionStyle'] = 'unknown';
  if (/(?:data|numbers|analysis|compare|research)/.test(allContent)) {
    decisionStyle = 'analytical';
  } else if (/(?:feel|sense|gut|instinct)/.test(allContent)) {
    decisionStyle = 'intuitive';
  } else if (/(?:family|together|spouse|partner|we)/.test(allContent)) {
    decisionStyle = 'collaborative';
  }

  // Time orientation
  let timeOrientation: PsychographicProfile['timeOrientation'] = 'flexible';
  if (/(?:immediately|asap|urgent|right\s+now|this\s+week)/.test(allContent)) {
    timeOrientation = 'immediate';
  } else if (/(?:planning|scheduled|timeline|calendar)/.test(allContent)) {
    timeOrientation = 'planned';
  }

  // Service expectation
  let serviceExpectation: PsychographicProfile['serviceExpectation'] = 'standard';
  if (signals.some(s => s.type === 'price_insensitivity' || s.type === 'concierge_expectation')) {
    serviceExpectation = 'ultra_premium';
  } else if (signals.some(s => ['luxury_accommodation', 'private_aviation'].includes(s.type))) {
    serviceExpectation = 'premium';
  }

  // Privacy concern
  let privacyConcern: PsychographicProfile['privacyConcern'] = 'moderate';
  if (/(?:private|discrete|confidential|anonymous)/.test(allContent)) {
    privacyConcern = 'high';
  }

  // Sophistication level
  let sophisticationLevel: PsychographicProfile['sophisticationLevel'] = 'basic';
  if (avgSophistication >= 60) sophisticationLevel = 'expert';
  else if (avgSophistication >= 40) sophisticationLevel = 'advanced';
  else if (avgSophistication >= 20) sophisticationLevel = 'intermediate';

  return {
    decisionStyle,
    timeOrientation,
    serviceExpectation,
    privacyConcern,
    sophisticationLevel
  };
}

/**
 * Calculate advanced lead score with multiple factors
 */
function calculateAdvancedLeadScore(
  wealthEstimate: WealthProfile['estimatedNetWorth'],
  intent: InvestmentIntent,
  behavior: BehaviorMetrics,
  psychographics: PsychographicProfile,
  clusters: SignalCluster[]
): number {
  let score = 0;

  // Wealth component (40%)
  const wealthScore = Math.min(40, Math.log10(wealthEstimate.median + 1) * 4);
  score += wealthScore;

  // Intent component (30%)
  if (intent.hasIntent) {
    score += intent.confidence * 0.2;
    if (intent.timeline === 'immediate') score += 10;
    else if (intent.timeline === 'short_term') score += 7;
    else if (intent.timeline === 'medium_term') score += 5;
  }

  // Engagement component (15%)
  if (behavior.engagementLevel === 'very_high') score += 15;
  else if (behavior.engagementLevel === 'high') score += 10;
  else if (behavior.engagementLevel === 'medium') score += 5;

  // Detail specificity (10%)
  if (behavior.detailLevel === 'very_specific') score += 10;
  else if (behavior.detailLevel === 'specific') score += 7;
  else if (behavior.detailLevel === 'moderate') score += 4;

  // Sophistication bonus (5%)
  if (psychographics.sophisticationLevel === 'expert') score += 5;
  else if (psychographics.sophisticationLevel === 'advanced') score += 3;

  return Math.min(100, Math.round(score));
}

/**
 * Determine qualification status
 */
function determineQualificationStatus(
  leadScore: number,
  intent: InvestmentIntent,
  tier: WealthTier
): WealthProfile['qualificationStatus'] {
  // Hot: High score + immediate intent + HNWI+
  if (leadScore >= 70 && intent.timeline === 'immediate' &&
      ['hnwi', 'vhnwi', 'uhnwi', 'billionaire'].includes(tier)) {
    return 'hot';
  }

  // Qualified: Good score + clear intent + wealthy
  if (leadScore >= 50 && intent.hasIntent &&
      ['hnwi', 'vhnwi', 'uhnwi', 'billionaire'].includes(tier)) {
    return 'qualified';
  }

  // Warm: Moderate signals or intent
  if (leadScore >= 30 || intent.hasIntent) {
    return 'warm';
  }

  return 'cold';
}

/**
 * Determine risk profile from signals
 */
function determineRiskProfile(
  signals: WealthSignal[],
  psychographics: PsychographicProfile
): WealthProfile['riskProfile'] {
  const hasAggressive = signals.some(s =>
    ['hedge_fund_investor', 'pe_vc_investor', 'angel_investor', 'entrepreneur_exit'].includes(s.type)
  );
  const hasConservative = signals.some(s =>
    ['trust_structure', 'private_banking', 'family_office'].includes(s.type)
  );

  if (hasAggressive && !hasConservative) return 'aggressive';
  if (hasConservative && !hasAggressive) return 'conservative';
  if (hasAggressive && hasConservative) return 'moderate';

  if (psychographics.decisionStyle === 'analytical') return 'moderate';
  if (psychographics.decisionStyle === 'intuitive') return 'aggressive';

  return 'unknown';
}

/**
 * Estimate income profile from signals and tier
 */
function estimateIncomeProfile(
  signals: WealthSignal[],
  tier: WealthTier
): WealthProfile['incomeProfile'] {
  const incomeTypes: WealthProfile['incomeProfile']['incomeType'] = [];

  // Detect income sources
  if (signals.some(s => ['c_suite_executive', 'senior_executive'].includes(s.type))) {
    incomeTypes.push('employment');
  }
  if (signals.some(s => ['business_owner', 'entrepreneur_exit'].includes(s.type))) {
    incomeTypes.push('business');
  }
  if (signals.some(s => ['investor_professional', 'fund_manager', 'pe_vc_investor'].includes(s.type))) {
    incomeTypes.push('investment');
  }
  if (signals.some(s => s.type === 'inheritance_mention')) {
    incomeTypes.push('inheritance');
  }

  if (incomeTypes.length === 0) incomeTypes.push('unknown');

  // Estimate annual income based on tier
  let incomeMin = 0, incomeMax = 0;
  switch (tier) {
    case 'billionaire': incomeMin = 50e6; incomeMax = 500e6; break;
    case 'uhnwi': incomeMin = 5e6; incomeMax = 50e6; break;
    case 'vhnwi': incomeMin = 1e6; incomeMax = 10e6; break;
    case 'hnwi': incomeMin = 300000; incomeMax = 2e6; break;
    case 'mass_affluent': incomeMin = 150000; incomeMax = 500000; break;
    case 'affluent': incomeMin = 75000; incomeMax = 200000; break;
    default: incomeMin = 50000; incomeMax = 100000;
  }

  return {
    estimatedAnnualIncome: { min: incomeMin, max: incomeMax },
    incomeType: incomeTypes,
    stability: incomeTypes.includes('investment') || incomeTypes.includes('business') ? 'variable' : 'stable'
  };
}

/**
 * Generate wealth narrative summary
 */
function generateWealthNarrative(profile: WealthProfile): string {
  const tierDef = WEALTH_TIER_DEFINITIONS[profile.tier];
  const parts: string[] = [];

  parts.push(`Classified as ${tierDef.label} with ${profile.confidence}% confidence.`);

  if (profile.estimatedNetWorth.median > 0) {
    parts.push(`Estimated net worth: $${formatLargeNumber(profile.estimatedNetWorth.min)} - $${formatLargeNumber(profile.estimatedNetWorth.max)}.`);
  }

  if (profile.signals.length > 0) {
    const topSignal = profile.signals.sort((a, b) => b.weight - a.weight)[0];
    parts.push(`Primary indicator: ${topSignal.type.replace(/_/g, ' ')}.`);
  }

  if (profile.investmentIntent.hasIntent) {
    parts.push(`Shows ${profile.investmentIntent.timeline} ${profile.investmentIntent.type.join('/')} interest.`);
  }

  return parts.join(' ');
}

function formatLargeNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K`;
  return num.toString();
}

// ============ HELPER FUNCTIONS ============

function extractEntities(content: string, entities: ExtractedEntity[]): void {
  // Money extraction
  const moneyPatterns = /\$\s*[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|m|b|k))?/gi;
  let match;
  while ((match = moneyPatterns.exec(content)) !== null) {
    const value = parseMonetaryValue(match[0]);
    entities.push({
      type: 'money',
      value: match[0],
      normalized: value ? `$${formatLargeNumber(value)}` : match[0],
      wealthImplication: value || 0
    });
  }

  // Brand extraction
  const luxuryBrands = [
    'Ritz-Carlton', 'Four Seasons', 'Aman', 'Gulfstream', 'NetJets',
    'Patek Philippe', 'Audemars Piguet', 'Richard Mille', 'Hermès',
    'Bentley', 'Rolls-Royce', 'Ferrari', 'Lamborghini'
  ];

  for (const brand of luxuryBrands) {
    if (content.toLowerCase().includes(brand.toLowerCase())) {
      entities.push({
        type: 'brand',
        value: brand,
        normalized: brand,
        wealthImplication: 5000000
      });
    }
  }
}

function detectMessageIntent(content: string): string {
  const lower = content.toLowerCase();

  if (/(?:buy|purchase|invest|looking\s+for|interested\s+in)\s+(?:property|real\s+estate|home)/.test(lower)) {
    return 'real_estate_inquiry';
  }
  if (/(?:residency|citizenship|relocat|move\s+to)/.test(lower)) {
    return 'residency_inquiry';
  }
  if (/(?:bank|investment|wealth\s+management|private\s+banking)/.test(lower)) {
    return 'financial_services';
  }
  if (/(?:yacht|charter|boat)/.test(lower)) {
    return 'yacht_inquiry';
  }
  if (/(?:hotel|stay|accommodation|villa|resort)/.test(lower)) {
    return 'accommodation_inquiry';
  }
  if (/(?:restaurant|dining|eat|food)/.test(lower)) {
    return 'dining_inquiry';
  }

  return 'general';
}

function analyzeSentiment(content: string): 'positive' | 'neutral' | 'negative' {
  const lower = content.toLowerCase();

  const positiveWords = ['love', 'great', 'excellent', 'perfect', 'amazing', 'wonderful', 'interested', 'excited'];
  const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'disappointed', 'frustrated', 'annoyed'];

  const positiveCount = positiveWords.filter(w => lower.includes(w)).length;
  const negativeCount = negativeWords.filter(w => lower.includes(w)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function analyzeInvestmentIntent(
  messages: ChatMessage[],
  signals: WealthSignal[]
): InvestmentIntent {
  const content = messages.map(m => m.content).join(' ').toLowerCase();

  const types: InvestmentIntent['type'] = [];
  let hasIntent = false;
  let confidence = 0;
  const specificInterests: string[] = [];

  // Real estate
  if (signals.some(s => s.category === 'real_estate') ||
      /(?:buy|purchase|invest\s+in)\s+(?:property|real\s+estate|home|condo|villa)/.test(content)) {
    types.push('real_estate');
    hasIntent = true;
    confidence += 25;
  }

  // Residency
  if (signals.some(s => s.type === 'residency_investment') ||
      /(?:residency|citizenship|relocat|move\s+to\s+cayman)/.test(content)) {
    types.push('residency');
    hasIntent = true;
    confidence += 30;
  }

  // Business
  if (/(?:set\s+up|establish|incorporate|start)\s+(?:a\s+)?(?:company|business|office)/.test(content)) {
    types.push('business');
    hasIntent = true;
    confidence += 20;
  }

  // Banking/Fund
  if (signals.some(s => ['private_banking', 'family_office', 'hedge_fund_investor'].includes(s.type))) {
    types.push('banking');
    types.push('fund');
    hasIntent = true;
    confidence += 25;
  }

  // Determine timeline
  let timeline: InvestmentIntent['timeline'] = 'unknown';
  if (/(?:immediately|asap|this\s+week|urgent|right\s+now)/.test(content)) {
    timeline = 'immediate';
    confidence += 20;
  } else if (/(?:this\s+month|next\s+month|soon|coming\s+weeks)/.test(content)) {
    timeline = 'short_term';
    confidence += 15;
  } else if (/(?:this\s+year|next\s+year|few\s+months)/.test(content)) {
    timeline = 'medium_term';
    confidence += 10;
  } else if (/(?:planning|considering|thinking\s+about|exploring)/.test(content)) {
    timeline = 'exploring';
    confidence += 5;
  }

  // Decision stage
  let decisionStage: InvestmentIntent['decisionStage'] = 'unknown';
  if (/(?:ready\s+to|want\s+to|let'?s|proceed|go\s+ahead)/.test(content)) {
    decisionStage = 'action';
  } else if (/(?:decide|decision|choose|which\s+one)/.test(content)) {
    decisionStage = 'decision';
  } else if (/(?:compare|options|alternatives|research)/.test(content)) {
    decisionStage = 'consideration';
  } else if (/(?:what\s+is|how\s+does|tell\s+me\s+about|learn)/.test(content)) {
    decisionStage = 'awareness';
  }

  if (types.length === 0) types.push('unknown');

  return {
    hasIntent,
    confidence: Math.min(100, confidence),
    type: types,
    timeline,
    urgencyScore: timeline === 'immediate' ? 100 : timeline === 'short_term' ? 70 : timeline === 'medium_term' ? 40 : 20,
    estimatedAmount: null,
    specificInterests,
    decisionStage
  };
}

function buildInterestProfile(messages: ChatMessage[]): InterestProfile {
  const content = messages.map(m => m.content).join(' ').toLowerCase();

  const categories: string[] = [];
  const luxuryPreferences: string[] = [];
  const locationPreferences: string[] = [];
  const activityPreferences: string[] = [];
  const accommodationType: string[] = [];
  const diningPreferences: string[] = [];
  const servicePriorities: string[] = [];

  // Detect categories
  if (/(?:beach|ocean|water|swim)/.test(content)) categories.push('beach');
  if (/(?:golf|tennis|sport)/.test(content)) categories.push('sports');
  if (/(?:dive|snorkel|marine)/.test(content)) categories.push('water_sports');
  if (/(?:spa|wellness|relax)/.test(content)) categories.push('wellness');
  if (/(?:restaurant|dining|food|culinary)/.test(content)) categories.push('dining');
  if (/(?:invest|property|real\s+estate)/.test(content)) categories.push('investment');

  // Detect locations
  if (/seven\s+mile/.test(content)) locationPreferences.push('Seven Mile Beach');
  if (/rum\s+point/.test(content)) locationPreferences.push('Rum Point');
  if (/cayman\s+kai/.test(content)) locationPreferences.push('Cayman Kai');
  if (/george\s+town/.test(content)) locationPreferences.push('George Town');

  // Detect accommodation type
  if (/(?:villa|private\s+home)/.test(content)) accommodationType.push('private_villa');
  if (/(?:resort|hotel)/.test(content)) accommodationType.push('resort');
  if (/(?:penthouse|suite)/.test(content)) accommodationType.push('penthouse');

  return {
    categories,
    luxuryPreferences,
    locationPreferences,
    activityPreferences,
    accommodationType,
    diningPreferences,
    servicePriorities
  };
}

function calculateBehaviorMetrics(
  messages: ChatMessage[],
  analyzedMessages: AnalyzedMessage[]
): BehaviorMetrics {
  const userMessages = messages.filter(m => m.role === 'user');
  const totalMessages = userMessages.length;

  const avgMessageLength = totalMessages > 0
    ? userMessages.reduce((sum, m) => sum + m.content.length, 0) / totalMessages
    : 0;

  const questions = userMessages.filter(m => m.content.includes('?')).length;
  const questionRatio = totalMessages > 0 ? questions / totalMessages : 0;

  // Determine detail level
  let detailLevel: BehaviorMetrics['detailLevel'] = 'vague';
  if (avgMessageLength > 200) detailLevel = 'very_specific';
  else if (avgMessageLength > 100) detailLevel = 'specific';
  else if (avgMessageLength > 50) detailLevel = 'moderate';

  // Determine engagement
  let engagementLevel: BehaviorMetrics['engagementLevel'] = 'low';
  if (totalMessages >= 10) engagementLevel = 'very_high';
  else if (totalMessages >= 6) engagementLevel = 'high';
  else if (totalMessages >= 3) engagementLevel = 'medium';

  // Response pattern
  let responsePattern: BehaviorMetrics['responsePattern'] = 'brief';
  if (avgMessageLength > 150) responsePattern = 'detailed';
  else if (avgMessageLength > 75) responsePattern = 'conversational';

  return {
    sessionCount: 1,
    totalMessages,
    avgMessageLength: Math.round(avgMessageLength),
    questionRatio: Math.round(questionRatio * 100) / 100,
    detailLevel,
    engagementLevel,
    responsePattern,
    lastActive: new Date().toISOString()
  };
}

function generateInsights(profile: WealthProfile, messages: AnalyzedMessage[]): string[] {
  const insights: string[] = [];
  const tier = WEALTH_TIER_DEFINITIONS[profile.tier];

  // Tier insight
  if (profile.tier !== 'unknown') {
    insights.push(`Profile classified as ${tier.label} (${tier.globalPopulation})`);
  }

  // Top signals
  if (profile.signals.length > 0) {
    const topSignals = profile.signals
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(s => s.type.replace(/_/g, ' '));
    insights.push(`Key indicators: ${topSignals.join(', ')}`);
  }

  // Investment intent
  if (profile.investmentIntent.hasIntent) {
    insights.push(`Active ${profile.investmentIntent.type.join('/')} interest with ${profile.investmentIntent.timeline.replace('_', ' ')} timeline`);
  }

  // Wealth estimate
  if (profile.estimatedNetWorth.median > 0) {
    insights.push(`Estimated wealth: $${formatLargeNumber(profile.estimatedNetWorth.median)} (${profile.estimatedNetWorth.methodology})`);
  }

  // Behavior insights
  if (profile.behaviorMetrics.engagementLevel === 'very_high') {
    insights.push('Highly engaged prospect with detailed inquiries');
  }

  // Sophistication
  if (profile.psychographics.sophisticationLevel === 'expert') {
    insights.push('Exhibits expert-level financial sophistication');
  }

  return insights;
}

function generateRecommendedActions(profile: WealthProfile): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  // UHNWI/Billionaire immediate escalation
  if (['uhnwi', 'billionaire'].includes(profile.tier)) {
    actions.push({
      type: 'executive_alert',
      priority: 'critical',
      reason: `${WEALTH_TIER_DEFINITIONS[profile.tier].label} detected - immediate executive notification required`,
      estimatedValue: profile.estimatedNetWorth.median
    });
  }

  // Hot lead immediate action
  if (profile.qualificationStatus === 'hot') {
    actions.push({
      type: 'vip_immediate',
      priority: 'urgent',
      reason: 'Hot lead with immediate timeline - prioritize personal outreach',
      estimatedValue: profile.estimatedNetWorth.median
    });
  }

  // Intent-based actions
  if (profile.investmentIntent.type.includes('residency')) {
    actions.push({
      type: 'connect_immigration',
      priority: profile.investmentIntent.timeline === 'immediate' ? 'urgent' : 'high',
      reason: 'Active residency/immigration interest detected',
      suggestedPartner: 'Immigration Advisory Services'
    });
  }

  if (profile.investmentIntent.type.includes('real_estate')) {
    actions.push({
      type: 'connect_realestate',
      priority: profile.investmentIntent.timeline === 'immediate' ? 'urgent' : 'high',
      reason: 'Real estate investment interest detected',
      suggestedPartner: 'Sotheby\'s International Realty Cayman'
    });
  }

  if (profile.investmentIntent.type.includes('banking') || profile.investmentIntent.type.includes('fund')) {
    actions.push({
      type: 'connect_banking',
      priority: 'high',
      reason: 'Private banking/investment interest detected',
      suggestedPartner: 'Butterfield Bank Private Client'
    });
  }

  // Qualified lead follow-up
  if (profile.qualificationStatus === 'qualified') {
    actions.push({
      type: 'vip_followup',
      priority: 'high',
      reason: 'Qualified lead with clear intent - schedule follow-up within 24 hours'
    });
  }

  // Warm lead nurture
  if (profile.qualificationStatus === 'warm') {
    actions.push({
      type: 'nurture',
      priority: 'medium',
      reason: 'Potential lead showing interest - add to nurture sequence'
    });
  }

  return actions;
}

// ============ EXPORTS FOR ANALYTICS ============

export interface AnalyticsExport {
  totalProfiles: number;
  byTier: Record<WealthTier, number>;
  byStatus: Record<string, number>;
  totalEstimatedPipelineValue: number;
  avgLeadScore: number;
  topSignalTypes: { type: string; count: number }[];
  conversionFunnel: {
    visitors: number;
    engaged: number;
    interested: number;
    qualified: number;
    hot: number;
  };
}

export function calculateAggregateAnalytics(profiles: WealthProfile[]): AnalyticsExport {
  const byTier: Record<WealthTier, number> = {
    unknown: 0, mass_market: 0, affluent: 0, mass_affluent: 0,
    hnwi: 0, vhnwi: 0, uhnwi: 0, billionaire: 0
  };

  const byStatus: Record<string, number> = {
    cold: 0, warm: 0, hot: 0, qualified: 0
  };

  let totalPipeline = 0;
  let totalLeadScore = 0;
  const signalCounts: Record<string, number> = {};

  for (const profile of profiles) {
    byTier[profile.tier]++;
    byStatus[profile.qualificationStatus]++;
    totalPipeline += profile.estimatedNetWorth.median;
    totalLeadScore += profile.leadScore;

    for (const signal of profile.signals) {
      signalCounts[signal.type] = (signalCounts[signal.type] || 0) + 1;
    }
  }

  const topSignalTypes = Object.entries(signalCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalProfiles: profiles.length,
    byTier,
    byStatus,
    totalEstimatedPipelineValue: totalPipeline,
    avgLeadScore: profiles.length > 0 ? Math.round(totalLeadScore / profiles.length) : 0,
    topSignalTypes,
    conversionFunnel: {
      visitors: profiles.length,
      engaged: profiles.filter(p => p.behaviorMetrics.engagementLevel !== 'low').length,
      interested: profiles.filter(p => p.investmentIntent.hasIntent).length,
      qualified: profiles.filter(p => p.qualificationStatus === 'qualified').length,
      hot: profiles.filter(p => p.qualificationStatus === 'hot').length
    }
  };
}
