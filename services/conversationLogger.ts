// ============================================
// ISLE AI - CONVERSATION LOGGER
// Captures and stores all chat sessions for Big Data analysis
// Integrates with Wealth Intelligence Service
// ============================================

import { ChatMessage } from '../types/chatbot';
import {
  analyzeConversation,
  ConversationAnalysis,
  WealthProfile,
  calculateAggregateAnalytics,
  AnalyticsExport
} from './wealthIntelligenceService';

// ============ TYPES ============

export interface ConversationSession {
  sessionId: string;
  visitorId: string;
  startedAt: string;
  endedAt?: string;
  messages: ChatMessage[];
  metadata: SessionMetadata;
  analysis?: ConversationAnalysis;
}

export interface SessionMetadata {
  userAgent: string;
  language: string;
  referrer: string;
  landingPage: string;
  device: 'mobile' | 'tablet' | 'desktop';
  country?: string;
  city?: string;
  ipHash?: string; // Anonymized IP
}

export interface ConversationStore {
  sessions: Map<string, ConversationSession>;
  profiles: Map<string, WealthProfile>;
}

// ============ IN-MEMORY STORE (Replace with DB in production) ============

const store: ConversationStore = {
  sessions: new Map(),
  profiles: new Map()
};

// ============ SESSION MANAGEMENT ============

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate anonymous visitor ID (stored in localStorage)
 */
function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') {
    return `visitor_${Math.random().toString(36).substr(2, 9)}`;
  }

  let visitorId = localStorage.getItem('isle_visitor_id');
  if (!visitorId) {
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('isle_visitor_id', visitorId);
  }
  return visitorId;
}

/**
 * Get device type from user agent
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';

  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile';
  }
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Start a new conversation session
 */
export function startSession(): ConversationSession {
  const sessionId = generateSessionId();
  const visitorId = getOrCreateVisitorId();

  const session: ConversationSession = {
    sessionId,
    visitorId,
    startedAt: new Date().toISOString(),
    messages: [],
    metadata: {
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
      language: typeof window !== 'undefined' ? navigator.language : 'en',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      landingPage: typeof window !== 'undefined' ? window.location.pathname : '/',
      device: getDeviceType()
    }
  };

  store.sessions.set(sessionId, session);

  console.log(`[Logger] Started session: ${sessionId} for visitor: ${visitorId}`);

  return session;
}

/**
 * Get current session or create new one
 */
let currentSession: ConversationSession | null = null;

export function getCurrentSession(): ConversationSession {
  if (!currentSession) {
    currentSession = startSession();
  }
  return currentSession;
}

/**
 * Log a message to the current session
 */
export function logMessage(message: ChatMessage): void {
  const session = getCurrentSession();
  session.messages.push({
    ...message,
    timestamp: message.timestamp || new Date().toISOString()
  });

  // Update in store
  store.sessions.set(session.sessionId, session);

  console.log(`[Logger] Logged ${message.role} message in session ${session.sessionId}`);

  // Trigger real-time analysis after each user message
  if (message.role === 'user' && session.messages.length >= 2) {
    analyzeSessionAsync(session);
  }
}

/**
 * End the current session
 */
export function endSession(): ConversationAnalysis | null {
  if (!currentSession) return null;

  currentSession.endedAt = new Date().toISOString();

  // Run final analysis
  const analysis = analyzeConversation(
    currentSession.messages,
    currentSession.sessionId,
    currentSession.visitorId
  );

  currentSession.analysis = analysis;
  store.sessions.set(currentSession.sessionId, currentSession);
  store.profiles.set(currentSession.visitorId, analysis.aggregatedProfile);

  console.log(`[Logger] Ended session: ${currentSession.sessionId}`);
  console.log(`[Logger] Lead Score: ${analysis.aggregatedProfile.leadScore}`);
  console.log(`[Logger] Wealth Tier: ${analysis.aggregatedProfile.tier}`);

  const endedSession = currentSession;
  currentSession = null;

  return analysis;
}

// ============ ASYNC ANALYSIS ============

/**
 * Analyze session asynchronously (non-blocking)
 */
async function analyzeSessionAsync(session: ConversationSession): Promise<void> {
  try {
    const analysis = analyzeConversation(
      session.messages,
      session.sessionId,
      session.visitorId
    );

    session.analysis = analysis;
    store.sessions.set(session.sessionId, session);
    store.profiles.set(session.visitorId, analysis.aggregatedProfile);

    // Log interesting findings
    if (analysis.aggregatedProfile.tier !== 'unknown') {
      console.log(`[Intelligence] 🎯 Detected ${analysis.aggregatedProfile.tier.toUpperCase()}`);
      console.log(`[Intelligence] Lead Score: ${analysis.aggregatedProfile.leadScore}`);
      console.log(`[Intelligence] Status: ${analysis.aggregatedProfile.qualificationStatus}`);

      if (analysis.recommendedActions.length > 0) {
        console.log(`[Intelligence] Actions: ${analysis.recommendedActions.map(a => a.type).join(', ')}`);
      }
    }

    // Alert for hot leads
    if (analysis.aggregatedProfile.qualificationStatus === 'qualified' ||
        analysis.aggregatedProfile.qualificationStatus === 'hot') {
      console.log(`[ALERT] 🔥 HOT LEAD DETECTED!`);
      console.log(`[ALERT] Visitor: ${session.visitorId}`);
      console.log(`[ALERT] Estimated Worth: $${formatNumber(analysis.aggregatedProfile.estimatedNetWorth.min)}+`);

      // In production, send webhook/notification here
      await sendLeadAlert(analysis.aggregatedProfile);
    }

  } catch (error) {
    console.error('[Logger] Analysis error:', error);
  }
}

// ============ EXPORT & ANALYTICS ============

/**
 * Get all sessions
 */
export function getAllSessions(): ConversationSession[] {
  return Array.from(store.sessions.values());
}

/**
 * Get all wealth profiles
 */
export function getAllProfiles(): WealthProfile[] {
  return Array.from(store.profiles.values());
}

/**
 * Get sessions for a specific visitor
 */
export function getVisitorSessions(visitorId: string): ConversationSession[] {
  return getAllSessions().filter(s => s.visitorId === visitorId);
}

/**
 * Get aggregate analytics
 */
export function getAggregateAnalytics(): AnalyticsExport {
  const profiles = getAllProfiles();
  return calculateAggregateAnalytics(profiles);
}

/**
 * Export all data as JSON (for CRM integration)
 */
export function exportAllData(): {
  sessions: ConversationSession[];
  profiles: WealthProfile[];
  analytics: AnalyticsExport;
  exportedAt: string;
} {
  return {
    sessions: getAllSessions(),
    profiles: getAllProfiles(),
    analytics: getAggregateAnalytics(),
    exportedAt: new Date().toISOString()
  };
}

/**
 * Export data as CSV
 */
export function exportProfilesCSV(): string {
  const profiles = getAllProfiles();

  const headers = [
    'Visitor ID',
    'Session ID',
    'Wealth Tier',
    'Confidence',
    'Est. Net Worth Min',
    'Est. Net Worth Max',
    'Lead Score',
    'Status',
    'Investment Intent',
    'Timeline',
    'Interests',
    'Created At'
  ];

  const rows = profiles.map(p => [
    p.odule,
    p.sessionId,
    p.tier,
    p.confidence,
    p.estimatedNetWorth.min,
    p.estimatedNetWorth.max,
    p.leadScore,
    p.qualificationStatus,
    p.investmentIntent.type.join('; '),
    p.investmentIntent.timeline,
    p.interests.categories.join('; '),
    p.createdAt
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// ============ ALERTS & WEBHOOKS ============

/**
 * Send alert for hot leads (implement webhook in production)
 */
async function sendLeadAlert(profile: WealthProfile): Promise<void> {
  // In production, this would send to:
  // - Email notification
  // - Slack/Teams webhook
  // - CRM API (Salesforce, HubSpot)
  // - Government portal

  const alertData = {
    type: 'HOT_LEAD_ALERT',
    timestamp: new Date().toISOString(),
    visitor: {
      id: profile.odule,
      tier: profile.tier,
      estimatedWorth: profile.estimatedNetWorth,
      leadScore: profile.leadScore,
      status: profile.qualificationStatus
    },
    intent: profile.investmentIntent,
    recommendedActions: profile.signals
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .map(s => s.type)
  };

  console.log('[Webhook] Would send alert:', JSON.stringify(alertData, null, 2));

  // Example webhook call (disabled):
  // await fetch('https://your-crm.com/api/leads', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(alertData)
  // });
}

// ============ HELPERS ============

function formatNumber(num: number): string {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
}

// ============ REAL-TIME DASHBOARD DATA ============

export interface DashboardData {
  live: {
    activeSessions: number;
    hotLeadsToday: number;
    qualifiedLeadsToday: number;
    totalValuePipeline: number;
  };
  byTier: Record<string, number>;
  recentHotLeads: WealthProfile[];
  topSignalsToday: { signal: string; count: number }[];
  conversionFunnel: {
    visitors: number;
    engaged: number;
    interested: number;
    qualified: number;
    converted: number;
  };
}

export function getDashboardData(): DashboardData {
  const profiles = getAllProfiles();
  const sessions = getAllSessions();

  // Get today's data
  const today = new Date().toDateString();
  const todayProfiles = profiles.filter(p =>
    new Date(p.createdAt).toDateString() === today
  );

  // Count by tier
  const byTier: Record<string, number> = {};
  for (const p of profiles) {
    byTier[p.tier] = (byTier[p.tier] || 0) + 1;
  }

  // Count signals
  const signalCounts: Record<string, number> = {};
  for (const p of todayProfiles) {
    for (const s of p.signals) {
      signalCounts[s.type] = (signalCounts[s.type] || 0) + 1;
    }
  }

  const topSignals = Object.entries(signalCounts)
    .map(([signal, count]) => ({ signal, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Hot leads
  const hotLeads = todayProfiles
    .filter(p => p.qualificationStatus === 'hot' || p.qualificationStatus === 'qualified')
    .sort((a, b) => b.leadScore - a.leadScore);

  // Calculate pipeline value
  const pipelineValue = hotLeads.reduce(
    (sum, p) => sum + (p.estimatedNetWorth.min + p.estimatedNetWorth.max) / 2,
    0
  );

  return {
    live: {
      activeSessions: sessions.filter(s => !s.endedAt).length,
      hotLeadsToday: hotLeads.length,
      qualifiedLeadsToday: todayProfiles.filter(p => p.qualificationStatus === 'qualified').length,
      totalValuePipeline: pipelineValue
    },
    byTier,
    recentHotLeads: hotLeads.slice(0, 5),
    topSignalsToday: topSignals,
    conversionFunnel: {
      visitors: profiles.length,
      engaged: profiles.filter(p => p.behaviorMetrics.engagementLevel !== 'low').length,
      interested: profiles.filter(p => p.investmentIntent.hasIntent).length,
      qualified: profiles.filter(p => p.qualificationStatus === 'qualified').length,
      converted: 0 // Would need conversion tracking
    }
  };
}
