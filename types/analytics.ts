// ============================================
// ISLE AI - ANALYTICS TYPES
// Comprehensive types for click tracking, visitor analytics,
// heatmaps, and wealth intelligence dashboard
// ============================================

import { WealthProfile, WealthSignal, SignalCategory, ConversationAnalysis, WealthTier } from '../services/wealthIntelligenceService';
import { KnowledgeCategory } from './chatbot';

// ============ INTERACTION EVENTS ============

export type InteractionEventType =
  | 'phone_click'
  | 'website_click'
  | 'directions_click'
  | 'booking_click'
  | 'popup_open'
  | 'popup_close'
  | 'place_click'
  | 'map_marker_click'
  | 'chat_place_click'
  | 'search_result_click'
  | 'save_place'
  | 'share_place'
  | 'ask_ai_click';

export type InteractionSource = 'map' | 'chat' | 'search' | 'popup' | 'card';

export interface InteractionEvent {
  id: string;
  eventType: InteractionEventType;
  placeId: string;
  placeName: string;
  placeCategory: KnowledgeCategory;
  timestamp: string;
  sessionId: string;
  visitorId: string;
  source: InteractionSource;
  coordinates?: {
    lat: number;
    lng: number;
  };
  duration?: number; // For popup_close events, duration in ms
  metadata?: Record<string, any>;
}

// ============ VISITOR ACCOUNT ============

export interface JourneyNode {
  id: string;
  type: 'session_start' | 'message' | 'interaction' | 'session_end' | 'signal_detected' | 'tier_upgrade';
  timestamp: string;
  data: {
    description: string;
    significance?: 'low' | 'medium' | 'high' | 'critical';
    relatedEntityId?: string;
    metadata?: Record<string, any>;
  };
}

export interface VisitorAccount {
  visitorId: string;
  firstSeen: string;
  lastSeen: string;
  sessions: VisitorSession[];
  aggregatedProfile: WealthProfile | null;
  interactions: InteractionEvent[];
  journey: JourneyNode[];
  totalMessageCount: number;
  totalInteractionCount: number;
  highestTierReached: WealthTier;
  peakLeadScore: number;
  tags: string[];
  notes?: string;
}

export interface VisitorSession {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  messageCount: number;
  interactionCount: number;
  detectedTier?: WealthTier;
  leadScore?: number;
  device: 'mobile' | 'tablet' | 'desktop';
  referrer?: string;
}

// ============ HEATMAP DATA ============

export interface GeographicHeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  placeId?: string;
  placeName?: string;
  clickCount: number;
}

export interface CategoryDistribution {
  category: KnowledgeCategory;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ActionDistribution {
  action: InteractionEventType;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TimeDistribution {
  hour: number;
  count: number;
  label: string;
}

export interface HeatmapData {
  geographic: GeographicHeatmapPoint[];
  categoryDistribution: CategoryDistribution[];
  actionDistribution: ActionDistribution[];
  timeDistribution: TimeDistribution[];
  topPlaces: {
    placeId: string;
    placeName: string;
    category: KnowledgeCategory;
    totalClicks: number;
    uniqueVisitors: number;
  }[];
}

// ============ CONVERSATION ANALYTICS ============

export interface AnnotatedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  signals: WealthSignal[];
  sophisticationScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  intent?: string;
  highlightedPhrases: {
    text: string;
    startIndex: number;
    endIndex: number;
    signalType: string;
    color: string;
  }[];
}

export interface ConversationAnalytics {
  sessionId: string;
  visitorId: string;
  messages: AnnotatedMessage[];
  totalSignals: number;
  uniqueSignalTypes: string[];
  sophisticationTrend: { timestamp: string; score: number }[];
  keyMoments: {
    timestamp: string;
    type: 'tier_change' | 'intent_detected' | 'high_value_signal' | 'qualification_change';
    description: string;
  }[];
}

// ============ WEALTH ANALYTICS ============

export interface SignalCluster {
  category: SignalCategory;
  signals: WealthSignal[];
  totalWeight: number;
  averageConfidence: number;
  impliedWealthRange: { min: number; max: number };
  visitorCount: number;
}

export interface SourceOfWealth {
  source: string;
  count: number;
  percentage: number;
  averageWorth: number;
  color: string;
}

export interface StealthWealthIndicator {
  visitorId: string;
  sessionId: string;
  indicators: {
    type: string;
    description: string;
    confidence: number;
  }[];
  totalScore: number;
  estimatedTier: WealthTier;
}

export interface SophisticationMatrixCell {
  x: string; // Category (e.g., "Financial Literacy")
  y: string; // Level (e.g., "Expert")
  value: number;
  visitorIds: string[];
}

export interface WealthAnalytics {
  signalClusters: SignalCluster[];
  sourceOfWealth: SourceOfWealth[];
  stealthWealth: StealthWealthIndicator[];
  sophisticationMatrix: SophisticationMatrixCell[];
  tierProgression: {
    date: string;
    counts: Record<WealthTier, number>;
  }[];
  averageLeadScoreByTier: Record<WealthTier, number>;
}

// ============ LEADS ANALYTICS ============

export interface HotLeadAlert {
  id: string;
  visitorId: string;
  sessionId: string;
  timestamp: string;
  tier: WealthTier;
  leadScore: number;
  triggerReason: string;
  estimatedWorth: { min: number; max: number };
  recommendedActions: string[];
  isRead: boolean;
  isActioned: boolean;
}

export interface LeadActionItem {
  id: string;
  visitorId: string;
  actionType: 'call' | 'email' | 'connect_partner' | 'schedule_meeting' | 'send_info' | 'flag_vip';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  dueBy?: string;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  createdAt: string;
  completedAt?: string;
}

export interface LeadScoreBreakdown {
  visitorId: string;
  totalScore: number;
  components: {
    category: string;
    score: number;
    maxScore: number;
    factors: string[];
  }[];
}

// ============ ACTIVITY FEED ============

export type ActivityType =
  | 'new_session'
  | 'session_end'
  | 'message_sent'
  | 'interaction'
  | 'signal_detected'
  | 'tier_change'
  | 'hot_lead'
  | 'qualification_change';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  timestamp: string;
  visitorId: string;
  sessionId?: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  significance: 'low' | 'medium' | 'high' | 'critical';
  icon?: string;
  color?: string;
}

// ============ DASHBOARD DATA ============

export interface EnhancedDashboardData {
  // Overview (from existing)
  live: {
    activeSessions: number;
    hotLeadsToday: number;
    qualifiedLeadsToday: number;
    totalValuePipeline: number;
    totalInteractionsToday: number;
    newVisitorsToday: number;
  };
  byTier: Record<WealthTier, number>;
  recentHotLeads: WealthProfile[];
  topSignalsToday: { signal: string; count: number }[];
  conversionFunnel: {
    visitors: number;
    engaged: number;
    interested: number;
    qualified: number;
    converted: number;
  };

  // Extended analytics
  visitors: VisitorAccount[];
  heatmap: HeatmapData;
  conversations: ConversationAnalytics[];
  wealth: WealthAnalytics;
  leads: {
    alerts: HotLeadAlert[];
    actionQueue: LeadActionItem[];
    scoreBreakdowns: LeadScoreBreakdown[];
  };
  activityFeed: ActivityItem[];
}

// ============ REAL-TIME SUBSCRIPTIONS ============

export type AnalyticsEventType =
  | 'new_interaction'
  | 'new_session'
  | 'session_end'
  | 'signal_detected'
  | 'tier_change'
  | 'hot_lead_alert'
  | 'activity_update';

export interface AnalyticsSubscription {
  id: string;
  eventTypes: AnalyticsEventType[];
  callback: (event: AnalyticsEvent) => void;
}

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  timestamp: string;
  data: any;
}

// ============ EXPORT TYPES ============

export interface AnalyticsExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  dateRange?: { from: string; to: string };
  includeVisitors?: boolean;
  includeInteractions?: boolean;
  includeConversations?: boolean;
  includeWealth?: boolean;
  includeLeads?: boolean;
}

export interface AnalyticsExportResult {
  data: string | Blob;
  filename: string;
  mimeType: string;
  recordCount: number;
  exportedAt: string;
}
