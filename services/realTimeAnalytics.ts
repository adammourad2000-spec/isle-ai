// ============================================
// ISLE AI - REAL-TIME ANALYTICS SERVICE
// Live subscription system for dashboard updates
// ============================================

import {
  AnalyticsSubscription,
  AnalyticsEvent,
  AnalyticsEventType,
  ActivityItem,
  HotLeadAlert
} from '../types/analytics';
import { WealthProfile, WealthTier } from './wealthIntelligenceService';
import { analyticsStore } from './analyticsStore';

// ============ SUBSCRIPTION MANAGEMENT ============

const subscriptions: Map<string, AnalyticsSubscription> = new Map();

/**
 * Generate unique subscription ID
 */
function generateSubscriptionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Subscribe to analytics events
 */
export function subscribeToAnalytics(
  eventTypes: AnalyticsEventType[],
  callback: (event: AnalyticsEvent) => void
): string {
  const id = generateSubscriptionId();
  const subscription: AnalyticsSubscription = {
    id,
    eventTypes,
    callback
  };
  subscriptions.set(id, subscription);
  console.log(`[RealTime] New subscription: ${id} for events: ${eventTypes.join(', ')}`);
  return id;
}

/**
 * Unsubscribe from analytics events
 */
export function unsubscribeFromAnalytics(subscriptionId: string): boolean {
  const removed = subscriptions.delete(subscriptionId);
  if (removed) {
    console.log(`[RealTime] Removed subscription: ${subscriptionId}`);
  }
  return removed;
}

/**
 * Emit an analytics event to all subscribers
 */
export function emitAnalyticsEvent(event: AnalyticsEvent): void {
  for (const subscription of subscriptions.values()) {
    if (subscription.eventTypes.includes(event.type)) {
      try {
        subscription.callback(event);
      } catch (error) {
        console.error(`[RealTime] Error in subscription callback:`, error);
      }
    }
  }
}

// ============ EVENT EMITTERS ============

/**
 * Emit new session event
 */
export function emitNewSession(sessionId: string, visitorId: string): void {
  const activity: ActivityItem = {
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type: 'new_session',
    timestamp: new Date().toISOString(),
    visitorId,
    sessionId,
    title: 'New Session Started',
    description: `Visitor ${visitorId.slice(0, 12)}... started a new session`,
    significance: 'low'
  };

  analyticsStore.addActivity(activity);

  emitAnalyticsEvent({
    type: 'new_session',
    timestamp: activity.timestamp,
    data: { sessionId, visitorId }
  });
}

/**
 * Emit session end event
 */
export function emitSessionEnd(sessionId: string, visitorId: string, duration: number): void {
  const activity: ActivityItem = {
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type: 'session_end',
    timestamp: new Date().toISOString(),
    visitorId,
    sessionId,
    title: 'Session Ended',
    description: `Session lasted ${Math.round(duration / 60000)} minutes`,
    metadata: { durationMs: duration },
    significance: 'low'
  };

  analyticsStore.addActivity(activity);

  emitAnalyticsEvent({
    type: 'session_end',
    timestamp: activity.timestamp,
    data: { sessionId, visitorId, duration }
  });
}

/**
 * Emit signal detected event
 */
export function emitSignalDetected(
  visitorId: string,
  sessionId: string,
  signalType: string,
  signalValue: string,
  impliedMinWealth: number
): void {
  const isHighValue = impliedMinWealth >= 1000000;

  const activity: ActivityItem = {
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type: 'signal_detected',
    timestamp: new Date().toISOString(),
    visitorId,
    sessionId,
    title: `Signal: ${signalType.replace(/_/g, ' ')}`,
    description: signalValue,
    metadata: { signalType, impliedMinWealth },
    significance: isHighValue ? 'high' : 'medium'
  };

  analyticsStore.addActivity(activity);

  emitAnalyticsEvent({
    type: 'signal_detected',
    timestamp: activity.timestamp,
    data: { visitorId, sessionId, signalType, signalValue, impliedMinWealth }
  });
}

/**
 * Emit tier change event
 */
export function emitTierChange(
  visitorId: string,
  sessionId: string,
  previousTier: WealthTier,
  newTier: WealthTier
): void {
  const tierLabels: Record<WealthTier, string> = {
    unknown: 'Unknown',
    mass_market: 'Mass Market',
    affluent: 'Affluent',
    mass_affluent: 'Mass Affluent',
    hnwi: 'HNWI',
    vhnwi: 'VHNWI',
    uhnwi: 'UHNWI',
    billionaire: 'Billionaire'
  };

  const isUpgrade = ['hnwi', 'vhnwi', 'uhnwi', 'billionaire'].includes(newTier);

  const activity: ActivityItem = {
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type: 'tier_change',
    timestamp: new Date().toISOString(),
    visitorId,
    sessionId,
    title: `Tier ${isUpgrade ? 'Upgrade' : 'Change'}: ${tierLabels[newTier]}`,
    description: `${tierLabels[previousTier]} → ${tierLabels[newTier]}`,
    metadata: { previousTier, newTier },
    significance: isUpgrade ? 'high' : 'medium'
  };

  analyticsStore.addActivity(activity);

  emitAnalyticsEvent({
    type: 'tier_change',
    timestamp: activity.timestamp,
    data: { visitorId, sessionId, previousTier, newTier }
  });
}

/**
 * Emit hot lead alert
 */
export function emitHotLeadAlert(profile: WealthProfile, triggerReason: string): void {
  const alert: HotLeadAlert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    visitorId: profile.visitorId,
    sessionId: profile.sessionId,
    timestamp: new Date().toISOString(),
    tier: profile.tier,
    leadScore: profile.leadScore,
    triggerReason,
    estimatedWorth: {
      min: profile.estimatedNetWorth.min,
      max: profile.estimatedNetWorth.max
    },
    recommendedActions: getRecommendedActions(profile),
    isRead: false,
    isActioned: false
  };

  analyticsStore.addHotLeadAlert(alert);

  const activity: ActivityItem = {
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type: 'hot_lead',
    timestamp: alert.timestamp,
    visitorId: profile.visitorId,
    sessionId: profile.sessionId,
    title: `🔥 Hot Lead Alert: ${profile.tier.toUpperCase()}`,
    description: triggerReason,
    metadata: { leadScore: profile.leadScore, tier: profile.tier },
    significance: 'critical'
  };

  analyticsStore.addActivity(activity);

  emitAnalyticsEvent({
    type: 'hot_lead_alert',
    timestamp: alert.timestamp,
    data: alert
  });

  console.log(`[RealTime] 🔥 HOT LEAD ALERT: ${profile.visitorId} - ${profile.tier} - Score: ${profile.leadScore}`);
}

function getRecommendedActions(profile: WealthProfile): string[] {
  const actions: string[] = [];

  if (profile.tier === 'uhnwi' || profile.tier === 'billionaire') {
    actions.push('Immediate VIP concierge contact');
    actions.push('Executive alert to management');
  }

  if (profile.investmentIntent.hasIntent) {
    if (profile.investmentIntent.type.includes('real_estate')) {
      actions.push('Connect with real estate partner');
    }
    if (profile.investmentIntent.type.includes('residency')) {
      actions.push('Connect with immigration specialist');
    }
    if (profile.investmentIntent.type.includes('banking')) {
      actions.push('Connect with private banking partner');
    }
  }

  if (profile.leadScore >= 80) {
    actions.push('Schedule follow-up call within 24 hours');
  }

  if (actions.length === 0) {
    actions.push('Monitor engagement');
    actions.push('Add to nurture campaign');
  }

  return actions;
}

// ============ ACTIVITY FEED UTILITIES ============

/**
 * Get recent activity feed
 */
export function getActivityFeed(limit: number = 50): ActivityItem[] {
  return analyticsStore.getRecentActivities(limit);
}

/**
 * Get unread alert count
 */
export function getUnreadAlertCount(): number {
  return analyticsStore.getHotLeadAlerts(true).length;
}

// ============ CLEANUP ============

/**
 * Clear all subscriptions
 */
export function clearAllSubscriptions(): void {
  subscriptions.clear();
  console.log('[RealTime] Cleared all subscriptions');
}

/**
 * Get active subscription count
 */
export function getSubscriptionCount(): number {
  return subscriptions.size;
}
