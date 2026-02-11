// ============================================
// ISLE AI - ANALYTICS STORE
// Centralized data store for all analytics data
// In-memory store (replace with IndexedDB/API in production)
// ============================================

import {
  InteractionEvent,
  VisitorAccount,
  VisitorSession,
  JourneyNode,
  ActivityItem,
  HotLeadAlert,
  LeadActionItem,
  ConversationAnalytics,
  AnnotatedMessage
} from '../types/analytics';
import { WealthProfile, WealthTier } from './wealthIntelligenceService';
import { ConversationSession } from './conversationLogger';

// ============ STORE INTERFACE ============

interface AnalyticsStoreData {
  interactions: Map<string, InteractionEvent>;
  visitors: Map<string, VisitorAccount>;
  activities: ActivityItem[];
  hotLeadAlerts: HotLeadAlert[];
  actionQueue: LeadActionItem[];
  conversationAnalytics: Map<string, ConversationAnalytics>;
}

// ============ IN-MEMORY STORE ============

class AnalyticsStore {
  private data: AnalyticsStoreData = {
    interactions: new Map(),
    visitors: new Map(),
    activities: [],
    hotLeadAlerts: [],
    actionQueue: [],
    conversationAnalytics: new Map()
  };

  // Maximum items to keep in memory
  private readonly MAX_INTERACTIONS = 10000;
  private readonly MAX_ACTIVITIES = 1000;
  private readonly MAX_ALERTS = 500;

  // ============ INTERACTIONS ============

  addInteraction(interaction: InteractionEvent): void {
    this.data.interactions.set(interaction.id, interaction);
    this.updateVisitorWithInteraction(interaction);

    // Prune old interactions if over limit
    if (this.data.interactions.size > this.MAX_INTERACTIONS) {
      const sortedIds = Array.from(this.data.interactions.keys()).slice(0, 1000);
      for (const id of sortedIds) {
        this.data.interactions.delete(id);
      }
    }
  }

  getAllInteractions(): InteractionEvent[] {
    return Array.from(this.data.interactions.values());
  }

  getInteractionsBySession(sessionId: string): InteractionEvent[] {
    return this.getAllInteractions().filter(i => i.sessionId === sessionId);
  }

  getInteractionsByVisitor(visitorId: string): InteractionEvent[] {
    return this.getAllInteractions().filter(i => i.visitorId === visitorId);
  }

  getInteractionsByPlace(placeId: string): InteractionEvent[] {
    return this.getAllInteractions().filter(i => i.placeId === placeId);
  }

  getInteractionsByType(eventType: string): InteractionEvent[] {
    return this.getAllInteractions().filter(i => i.eventType === eventType);
  }

  getInteractionsInDateRange(from: Date, to: Date): InteractionEvent[] {
    return this.getAllInteractions().filter(i => {
      const timestamp = new Date(i.timestamp);
      return timestamp >= from && timestamp <= to;
    });
  }

  // ============ VISITORS ============

  private updateVisitorWithInteraction(interaction: InteractionEvent): void {
    let visitor = this.data.visitors.get(interaction.visitorId);

    if (!visitor) {
      visitor = this.createNewVisitor(interaction.visitorId);
    }

    // Add interaction
    visitor.interactions.push(interaction);
    visitor.lastSeen = interaction.timestamp;
    visitor.totalInteractionCount++;

    // Add journey node
    const journeyNode: JourneyNode = {
      id: `j_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'interaction',
      timestamp: interaction.timestamp,
      data: {
        description: `${interaction.eventType} on ${interaction.placeName}`,
        significance: this.getInteractionSignificance(interaction.eventType),
        relatedEntityId: interaction.placeId,
        metadata: { source: interaction.source }
      }
    };
    visitor.journey.push(journeyNode);

    this.data.visitors.set(interaction.visitorId, visitor);
  }

  private createNewVisitor(visitorId: string): VisitorAccount {
    const now = new Date().toISOString();
    return {
      visitorId,
      firstSeen: now,
      lastSeen: now,
      sessions: [],
      aggregatedProfile: null,
      interactions: [],
      journey: [{
        id: `j_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'session_start',
        timestamp: now,
        data: {
          description: 'First visit',
          significance: 'medium'
        }
      }],
      totalMessageCount: 0,
      totalInteractionCount: 0,
      highestTierReached: 'unknown',
      peakLeadScore: 0,
      tags: []
    };
  }

  private getInteractionSignificance(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (eventType) {
      case 'booking_click': return 'high';
      case 'phone_click': return 'high';
      case 'directions_click': return 'medium';
      case 'website_click': return 'medium';
      case 'save_place': return 'medium';
      default: return 'low';
    }
  }

  getVisitor(visitorId: string): VisitorAccount | undefined {
    return this.data.visitors.get(visitorId);
  }

  getAllVisitors(): VisitorAccount[] {
    return Array.from(this.data.visitors.values());
  }

  updateVisitorProfile(visitorId: string, profile: WealthProfile): void {
    let visitor = this.data.visitors.get(visitorId);

    if (!visitor) {
      visitor = this.createNewVisitor(visitorId);
    }

    visitor.aggregatedProfile = profile;

    // Update highest tier reached
    const tierOrder: WealthTier[] = ['unknown', 'mass_market', 'affluent', 'mass_affluent', 'hnwi', 'vhnwi', 'uhnwi', 'billionaire'];
    const currentTierIndex = tierOrder.indexOf(visitor.highestTierReached);
    const newTierIndex = tierOrder.indexOf(profile.tier);
    if (newTierIndex > currentTierIndex) {
      visitor.highestTierReached = profile.tier;

      // Add journey node for tier upgrade
      visitor.journey.push({
        id: `j_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'tier_upgrade',
        timestamp: new Date().toISOString(),
        data: {
          description: `Upgraded to ${profile.tier}`,
          significance: newTierIndex >= tierOrder.indexOf('hnwi') ? 'high' : 'medium',
          metadata: { previousTier: visitor.highestTierReached, newTier: profile.tier }
        }
      });
    }

    // Update peak lead score
    if (profile.leadScore > visitor.peakLeadScore) {
      visitor.peakLeadScore = profile.leadScore;
    }

    this.data.visitors.set(visitorId, visitor);
  }

  addVisitorSession(visitorId: string, session: VisitorSession): void {
    let visitor = this.data.visitors.get(visitorId);

    if (!visitor) {
      visitor = this.createNewVisitor(visitorId);
    }

    visitor.sessions.push(session);
    this.data.visitors.set(visitorId, visitor);
  }

  incrementVisitorMessageCount(visitorId: string): void {
    const visitor = this.data.visitors.get(visitorId);
    if (visitor) {
      visitor.totalMessageCount++;
      this.data.visitors.set(visitorId, visitor);
    }
  }

  // ============ ACTIVITIES ============

  addActivity(activity: ActivityItem): void {
    this.data.activities.unshift(activity); // Add to front

    // Prune old activities
    if (this.data.activities.length > this.MAX_ACTIVITIES) {
      this.data.activities = this.data.activities.slice(0, this.MAX_ACTIVITIES);
    }
  }

  getRecentActivities(limit: number = 50): ActivityItem[] {
    return this.data.activities.slice(0, limit);
  }

  getActivitiesByVisitor(visitorId: string): ActivityItem[] {
    return this.data.activities.filter(a => a.visitorId === visitorId);
  }

  // ============ HOT LEAD ALERTS ============

  addHotLeadAlert(alert: HotLeadAlert): void {
    this.data.hotLeadAlerts.unshift(alert);

    // Prune old alerts
    if (this.data.hotLeadAlerts.length > this.MAX_ALERTS) {
      this.data.hotLeadAlerts = this.data.hotLeadAlerts.slice(0, this.MAX_ALERTS);
    }
  }

  getHotLeadAlerts(unreadOnly: boolean = false): HotLeadAlert[] {
    if (unreadOnly) {
      return this.data.hotLeadAlerts.filter(a => !a.isRead);
    }
    return this.data.hotLeadAlerts;
  }

  markAlertAsRead(alertId: string): void {
    const alert = this.data.hotLeadAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.isRead = true;
    }
  }

  markAlertAsActioned(alertId: string): void {
    const alert = this.data.hotLeadAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.isActioned = true;
    }
  }

  // ============ ACTION QUEUE ============

  addActionItem(item: LeadActionItem): void {
    this.data.actionQueue.push(item);
  }

  getActionQueue(status?: LeadActionItem['status']): LeadActionItem[] {
    if (status) {
      return this.data.actionQueue.filter(a => a.status === status);
    }
    return this.data.actionQueue;
  }

  updateActionStatus(itemId: string, status: LeadActionItem['status']): void {
    const item = this.data.actionQueue.find(a => a.id === itemId);
    if (item) {
      item.status = status;
      if (status === 'completed') {
        item.completedAt = new Date().toISOString();
      }
    }
  }

  // ============ CONVERSATION ANALYTICS ============

  setConversationAnalytics(sessionId: string, analytics: ConversationAnalytics): void {
    this.data.conversationAnalytics.set(sessionId, analytics);
  }

  getConversationAnalytics(sessionId: string): ConversationAnalytics | undefined {
    return this.data.conversationAnalytics.get(sessionId);
  }

  getAllConversationAnalytics(): ConversationAnalytics[] {
    return Array.from(this.data.conversationAnalytics.values());
  }

  // ============ STATS & AGGREGATIONS ============

  getStats(): {
    totalInteractions: number;
    totalVisitors: number;
    totalActivities: number;
    unreadAlerts: number;
    pendingActions: number;
  } {
    return {
      totalInteractions: this.data.interactions.size,
      totalVisitors: this.data.visitors.size,
      totalActivities: this.data.activities.length,
      unreadAlerts: this.data.hotLeadAlerts.filter(a => !a.isRead).length,
      pendingActions: this.data.actionQueue.filter(a => a.status === 'pending').length
    };
  }

  getTodayStats(): {
    interactionsToday: number;
    newVisitorsToday: number;
    activitiesThisHour: number;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    return {
      interactionsToday: this.getAllInteractions().filter(i => i.timestamp >= todayStr).length,
      newVisitorsToday: this.getAllVisitors().filter(v => v.firstSeen >= todayStr).length,
      activitiesThisHour: this.data.activities.filter(a => a.timestamp >= oneHourAgo).length
    };
  }

  // ============ PERSISTENCE ============

  /**
   * Export all data for backup/sync
   */
  exportData(): object {
    return {
      interactions: Array.from(this.data.interactions.entries()),
      visitors: Array.from(this.data.visitors.entries()),
      activities: this.data.activities,
      hotLeadAlerts: this.data.hotLeadAlerts,
      actionQueue: this.data.actionQueue,
      conversationAnalytics: Array.from(this.data.conversationAnalytics.entries()),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import data from backup
   */
  importData(data: any): void {
    if (data.interactions) {
      this.data.interactions = new Map(data.interactions);
    }
    if (data.visitors) {
      this.data.visitors = new Map(data.visitors);
    }
    if (data.activities) {
      this.data.activities = data.activities;
    }
    if (data.hotLeadAlerts) {
      this.data.hotLeadAlerts = data.hotLeadAlerts;
    }
    if (data.actionQueue) {
      this.data.actionQueue = data.actionQueue;
    }
    if (data.conversationAnalytics) {
      this.data.conversationAnalytics = new Map(data.conversationAnalytics);
    }
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.data = {
      interactions: new Map(),
      visitors: new Map(),
      activities: [],
      hotLeadAlerts: [],
      actionQueue: [],
      conversationAnalytics: new Map()
    };
  }
}

// Export singleton instance
export const analyticsStore = new AnalyticsStore();
