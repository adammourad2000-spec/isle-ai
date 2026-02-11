// ============================================
// ISLE AI - ANALYTICS AGGREGATOR
// Computes heatmaps, funnels, distributions, and aggregations
// ============================================

import {
  HeatmapData,
  GeographicHeatmapPoint,
  CategoryDistribution,
  ActionDistribution,
  TimeDistribution,
  WealthAnalytics,
  SignalCluster,
  SourceOfWealth,
  StealthWealthIndicator,
  SophisticationMatrixCell,
  EnhancedDashboardData,
  InteractionEventType,
  LeadScoreBreakdown
} from '../types/analytics';
import { KnowledgeCategory } from '../types/chatbot';
import { WealthProfile, WealthTier, SignalCategory, WealthSignal } from './wealthIntelligenceService';
import { analyticsStore } from './analyticsStore';
import { getAllProfiles, getAllSessions, getDashboardData } from './conversationLogger';

// ============ CATEGORY COLORS ============

const CATEGORY_COLORS: Record<string, string> = {
  hotel: '#3B82F6',
  restaurant: '#F97316',
  beach: '#06B6D4',
  diving_snorkeling: '#0EA5E9',
  boat_charter: '#8B5CF6',
  villa_rental: '#EC4899',
  attraction: '#EAB308',
  activity: '#22C55E',
  bar: '#F43F5E',
  spa: '#A855F7',
  spa_wellness: '#A855F7',
  shopping: '#6366F1',
  general_info: '#6B7280'
};

const ACTION_COLORS: Record<InteractionEventType, string> = {
  phone_click: '#10B981',
  website_click: '#3B82F6',
  directions_click: '#F59E0B',
  booking_click: '#EC4899',
  popup_open: '#6B7280',
  popup_close: '#6B7280',
  place_click: '#8B5CF6',
  map_marker_click: '#06B6D4',
  chat_place_click: '#F43F5E',
  search_result_click: '#EAB308',
  save_place: '#A855F7',
  share_place: '#22C55E',
  ask_ai_click: '#6366F1'
};

const ACTION_LABELS: Record<InteractionEventType, string> = {
  phone_click: 'Phone Calls',
  website_click: 'Website Visits',
  directions_click: 'Directions',
  booking_click: 'Bookings',
  popup_open: 'Popup Views',
  popup_close: 'Popup Closes',
  place_click: 'Place Clicks',
  map_marker_click: 'Map Markers',
  chat_place_click: 'Chat Places',
  search_result_click: 'Search Results',
  save_place: 'Saves',
  share_place: 'Shares',
  ask_ai_click: 'Ask AI'
};

const CATEGORY_LABELS: Record<string, string> = {
  hotel: 'Hotels',
  restaurant: 'Restaurants',
  beach: 'Beaches',
  diving_snorkeling: 'Diving/Snorkeling',
  boat_charter: 'Boat Charters',
  villa_rental: 'Villa Rentals',
  attraction: 'Attractions',
  activity: 'Activities',
  bar: 'Bars',
  spa: 'Spas',
  spa_wellness: 'Spa & Wellness',
  shopping: 'Shopping',
  general_info: 'General Info'
};

// ============ HEATMAP AGGREGATION ============

export function computeHeatmapData(): HeatmapData {
  const interactions = analyticsStore.getAllInteractions();

  // Geographic heatmap
  const geoPoints = new Map<string, GeographicHeatmapPoint>();
  for (const interaction of interactions) {
    if (interaction.coordinates) {
      const key = `${interaction.coordinates.lat.toFixed(4)},${interaction.coordinates.lng.toFixed(4)}`;
      const existing = geoPoints.get(key);
      if (existing) {
        existing.clickCount++;
        existing.intensity = Math.min(1, existing.clickCount / 20); // Normalize intensity
      } else {
        geoPoints.set(key, {
          lat: interaction.coordinates.lat,
          lng: interaction.coordinates.lng,
          intensity: 0.1,
          placeId: interaction.placeId,
          placeName: interaction.placeName,
          clickCount: 1
        });
      }
    }
  }

  // Category distribution
  const categoryCounts = new Map<string, number>();
  for (const interaction of interactions) {
    const count = categoryCounts.get(interaction.placeCategory) || 0;
    categoryCounts.set(interaction.placeCategory, count + 1);
  }
  const totalCategoryClicks = Array.from(categoryCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const categoryDistribution: CategoryDistribution[] = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({
      category: category as KnowledgeCategory,
      label: CATEGORY_LABELS[category] || category,
      count,
      percentage: (count / totalCategoryClicks) * 100,
      color: CATEGORY_COLORS[category] || '#6B7280'
    }))
    .sort((a, b) => b.count - a.count);

  // Action distribution
  const actionCounts = new Map<InteractionEventType, number>();
  const significantActions: InteractionEventType[] = ['phone_click', 'website_click', 'directions_click', 'booking_click', 'save_place'];
  for (const interaction of interactions) {
    if (significantActions.includes(interaction.eventType)) {
      const count = actionCounts.get(interaction.eventType) || 0;
      actionCounts.set(interaction.eventType, count + 1);
    }
  }
  const totalActionClicks = Array.from(actionCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const actionDistribution: ActionDistribution[] = Array.from(actionCounts.entries())
    .map(([action, count]) => ({
      action,
      label: ACTION_LABELS[action] || action,
      count,
      percentage: (count / totalActionClicks) * 100,
      color: ACTION_COLORS[action] || '#6B7280'
    }))
    .sort((a, b) => b.count - a.count);

  // Time distribution (by hour)
  const hourCounts = new Array(24).fill(0);
  for (const interaction of interactions) {
    const hour = new Date(interaction.timestamp).getHours();
    hourCounts[hour]++;
  }
  const timeDistribution: TimeDistribution[] = hourCounts.map((count, hour) => ({
    hour,
    count,
    label: `${hour.toString().padStart(2, '0')}:00`
  }));

  // Top places
  const placeCounts = new Map<string, { placeId: string; placeName: string; category: KnowledgeCategory; clicks: number; visitors: Set<string> }>();
  for (const interaction of interactions) {
    const existing = placeCounts.get(interaction.placeId);
    if (existing) {
      existing.clicks++;
      existing.visitors.add(interaction.visitorId);
    } else {
      placeCounts.set(interaction.placeId, {
        placeId: interaction.placeId,
        placeName: interaction.placeName,
        category: interaction.placeCategory,
        clicks: 1,
        visitors: new Set([interaction.visitorId])
      });
    }
  }
  const topPlaces = Array.from(placeCounts.values())
    .map(p => ({
      placeId: p.placeId,
      placeName: p.placeName,
      category: p.category,
      totalClicks: p.clicks,
      uniqueVisitors: p.visitors.size
    }))
    .sort((a, b) => b.totalClicks - a.totalClicks)
    .slice(0, 20);

  return {
    geographic: Array.from(geoPoints.values()),
    categoryDistribution,
    actionDistribution,
    timeDistribution,
    topPlaces
  };
}

// ============ WEALTH ANALYTICS AGGREGATION ============

export function computeWealthAnalytics(): WealthAnalytics {
  const profiles = getAllProfiles();

  // Signal clusters
  const clusterMap = new Map<SignalCategory, { signals: WealthSignal[]; visitors: Set<string> }>();
  for (const profile of profiles) {
    for (const signal of profile.signals) {
      const existing = clusterMap.get(signal.category);
      if (existing) {
        existing.signals.push(signal);
        existing.visitors.add(profile.visitorId);
      } else {
        clusterMap.set(signal.category, {
          signals: [signal],
          visitors: new Set([profile.visitorId])
        });
      }
    }
  }

  const signalClusters: SignalCluster[] = Array.from(clusterMap.entries()).map(([category, data]) => {
    const totalWeight = data.signals.reduce((sum, s) => sum + s.weight, 0);
    const avgConfidence = data.signals.reduce((sum, s) => sum + s.confidence, 0) / data.signals.length;
    const minWealth = Math.min(...data.signals.map(s => s.impliedMinWealth));
    const maxWealth = Math.max(...data.signals.map(s => s.impliedMaxWealth));

    return {
      category,
      signals: data.signals,
      totalWeight,
      averageConfidence: avgConfidence,
      impliedWealthRange: { min: minWealth, max: maxWealth },
      visitorCount: data.visitors.size
    };
  }).sort((a, b) => b.totalWeight - a.totalWeight);

  // Source of wealth
  const sourceMap = new Map<string, { count: number; totalWorth: number }>();
  for (const profile of profiles) {
    for (const incomeType of profile.incomeProfile.incomeType) {
      const existing = sourceMap.get(incomeType);
      const avgWorth = (profile.estimatedNetWorth.min + profile.estimatedNetWorth.max) / 2;
      if (existing) {
        existing.count++;
        existing.totalWorth += avgWorth;
      } else {
        sourceMap.set(incomeType, { count: 1, totalWorth: avgWorth });
      }
    }
  }
  const totalSources = Array.from(sourceMap.values()).reduce((sum, s) => sum + s.count, 0) || 1;
  const sourceColors: Record<string, string> = {
    business: '#8B5CF6',
    investment: '#10B981',
    employment: '#3B82F6',
    inheritance: '#F59E0B',
    unknown: '#6B7280'
  };
  const sourceOfWealth: SourceOfWealth[] = Array.from(sourceMap.entries()).map(([source, data]) => ({
    source,
    count: data.count,
    percentage: (data.count / totalSources) * 100,
    averageWorth: data.totalWorth / data.count,
    color: sourceColors[source] || '#6B7280'
  })).sort((a, b) => b.count - a.count);

  // Stealth wealth indicators
  const stealthWealth: StealthWealthIndicator[] = profiles
    .filter(p => {
      // Look for patterns that suggest understated wealth
      const hasHighValueSignals = p.signals.some(s => s.impliedMinWealth > 5000000);
      const hasLowDisplayBehavior = p.psychographics.privacyConcern === 'high';
      const hasSubtleLanguage = p.psychographics.sophisticationLevel === 'expert';
      return hasHighValueSignals && (hasLowDisplayBehavior || hasSubtleLanguage);
    })
    .map(p => ({
      visitorId: p.visitorId,
      sessionId: p.sessionId,
      indicators: [
        ...(p.psychographics.privacyConcern === 'high' ? [{
          type: 'privacy_conscious',
          description: 'High privacy concern indicates understated approach',
          confidence: 0.7
        }] : []),
        ...(p.psychographics.sophisticationLevel === 'expert' ? [{
          type: 'sophisticated_vocabulary',
          description: 'Expert-level financial vocabulary without overt displays',
          confidence: 0.8
        }] : []),
        ...p.signals
          .filter(s => s.impliedMinWealth > 10000000 && s.category !== 'direct_disclosure')
          .map(s => ({
            type: s.type,
            description: `Indirect signal: ${s.value}`,
            confidence: s.confidence / 100
          }))
      ],
      totalScore: p.leadScore,
      estimatedTier: p.tier
    }))
    .slice(0, 20);

  // Sophistication matrix
  const sophisticationCategories = ['Financial Literacy', 'Service Expectation', 'Decision Style', 'Time Orientation'];
  const sophisticationLevels = ['Basic', 'Intermediate', 'Advanced', 'Expert'];
  const sophisticationMatrix: SophisticationMatrixCell[] = [];

  for (const category of sophisticationCategories) {
    for (const level of sophisticationLevels) {
      const matchingVisitors = profiles.filter(p => {
        if (category === 'Financial Literacy') {
          return p.psychographics.sophisticationLevel === level.toLowerCase();
        }
        if (category === 'Service Expectation') {
          const mapping: Record<string, string> = { 'Basic': 'standard', 'Intermediate': 'standard', 'Advanced': 'premium', 'Expert': 'ultra_premium' };
          return p.psychographics.serviceExpectation === mapping[level];
        }
        return false;
      });

      sophisticationMatrix.push({
        x: category,
        y: level,
        value: matchingVisitors.length,
        visitorIds: matchingVisitors.map(p => p.visitorId)
      });
    }
  }

  // Tier progression (last 7 days)
  const tierProgression: { date: string; counts: Record<WealthTier, number> }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const counts: Record<WealthTier, number> = {
      unknown: 0,
      mass_market: 0,
      affluent: 0,
      mass_affluent: 0,
      hnwi: 0,
      vhnwi: 0,
      uhnwi: 0,
      billionaire: 0
    };

    for (const profile of profiles) {
      if (profile.createdAt.split('T')[0] <= dateStr) {
        counts[profile.tier]++;
      }
    }

    tierProgression.push({ date: dateStr, counts });
  }

  // Average lead score by tier
  const tierScores: Record<WealthTier, { total: number; count: number }> = {
    unknown: { total: 0, count: 0 },
    mass_market: { total: 0, count: 0 },
    affluent: { total: 0, count: 0 },
    mass_affluent: { total: 0, count: 0 },
    hnwi: { total: 0, count: 0 },
    vhnwi: { total: 0, count: 0 },
    uhnwi: { total: 0, count: 0 },
    billionaire: { total: 0, count: 0 }
  };
  for (const profile of profiles) {
    tierScores[profile.tier].total += profile.leadScore;
    tierScores[profile.tier].count++;
  }
  const averageLeadScoreByTier: Record<WealthTier, number> = {} as Record<WealthTier, number>;
  for (const [tier, data] of Object.entries(tierScores)) {
    averageLeadScoreByTier[tier as WealthTier] = data.count > 0 ? Math.round(data.total / data.count) : 0;
  }

  return {
    signalClusters,
    sourceOfWealth,
    stealthWealth,
    sophisticationMatrix,
    tierProgression,
    averageLeadScoreByTier
  };
}

// ============ LEAD SCORE BREAKDOWN ============

export function computeLeadScoreBreakdowns(): LeadScoreBreakdown[] {
  const profiles = getAllProfiles();

  return profiles.map(profile => {
    const components: LeadScoreBreakdown['components'] = [];

    // Wealth tier component
    const tierScores: Record<WealthTier, number> = {
      unknown: 0, mass_market: 5, affluent: 15, mass_affluent: 25,
      hnwi: 40, vhnwi: 55, uhnwi: 70, billionaire: 85
    };
    components.push({
      category: 'Wealth Tier',
      score: tierScores[profile.tier],
      maxScore: 85,
      factors: [`Detected as ${profile.tier}`]
    });

    // Investment intent component
    const intentScore = profile.investmentIntent.hasIntent ? 30 : 0;
    components.push({
      category: 'Investment Intent',
      score: intentScore,
      maxScore: 30,
      factors: profile.investmentIntent.hasIntent
        ? [`Intent: ${profile.investmentIntent.type.join(', ')}`]
        : ['No clear investment intent detected']
    });

    // Engagement component
    const engagementScores = { low: 5, medium: 15, high: 25, very_high: 35 };
    components.push({
      category: 'Engagement',
      score: engagementScores[profile.behaviorMetrics.engagementLevel],
      maxScore: 35,
      factors: [`${profile.behaviorMetrics.engagementLevel} engagement level`]
    });

    // Signal strength component
    const signalScore = Math.min(50, profile.signals.length * 5);
    components.push({
      category: 'Wealth Signals',
      score: signalScore,
      maxScore: 50,
      factors: profile.signals.slice(0, 5).map(s => s.type.replace(/_/g, ' '))
    });

    return {
      visitorId: profile.visitorId,
      totalScore: profile.leadScore,
      components
    };
  });
}

// ============ FULL DASHBOARD DATA ============

export function computeEnhancedDashboardData(): EnhancedDashboardData {
  const baseDashboardData = getDashboardData();
  const todayStats = analyticsStore.getTodayStats();

  return {
    // From existing dashboard
    live: {
      ...baseDashboardData.live,
      totalInteractionsToday: todayStats.interactionsToday,
      newVisitorsToday: todayStats.newVisitorsToday
    },
    byTier: baseDashboardData.byTier as Record<WealthTier, number>,
    recentHotLeads: baseDashboardData.recentHotLeads,
    topSignalsToday: baseDashboardData.topSignalsToday,
    conversionFunnel: baseDashboardData.conversionFunnel,

    // Extended analytics
    visitors: analyticsStore.getAllVisitors(),
    heatmap: computeHeatmapData(),
    conversations: analyticsStore.getAllConversationAnalytics(),
    wealth: computeWealthAnalytics(),
    leads: {
      alerts: analyticsStore.getHotLeadAlerts(),
      actionQueue: analyticsStore.getActionQueue(),
      scoreBreakdowns: computeLeadScoreBreakdowns()
    },
    activityFeed: analyticsStore.getRecentActivities(100)
  };
}
