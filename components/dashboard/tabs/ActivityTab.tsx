// ============================================
// ISLE AI - ACTIVITY TAB
// OpenAI-inspired design: minimal, elegant
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Users,
  MessageSquare,
  MousePointerClick,
  Target,
  Crown,
  Gem,
  Clock,
  Pause,
  Play,
  Bell,
  TrendingUp
} from 'lucide-react';
import { EnhancedDashboardData, ActivityItem, ActivityType } from '../../../types/analytics';
import {
  subscribeToAnalytics,
  unsubscribeFromAnalytics
} from '../../../services/realTimeAnalytics';

// ============ TYPES ============

interface ActivityTabProps {
  data: EnhancedDashboardData;
}

// ============ ACTIVITY CONFIG ============

const ACTIVITY_CONFIG: Record<ActivityType, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}> = {
  new_session: {
    icon: <Users size={12} />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    label: 'New Session'
  },
  session_end: {
    icon: <Clock size={12} />,
    color: 'text-white/40',
    bgColor: 'bg-white/[0.06]',
    label: 'Session End'
  },
  message_sent: {
    icon: <MessageSquare size={12} />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    label: 'Message'
  },
  interaction: {
    icon: <MousePointerClick size={12} />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    label: 'Interaction'
  },
  signal_detected: {
    icon: <Gem size={12} />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    label: 'Signal Detected'
  },
  tier_change: {
    icon: <Crown size={12} />,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    label: 'Tier Change'
  },
  hot_lead: {
    icon: <Target size={12} />,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    label: 'Hot Lead'
  },
  qualification_change: {
    icon: <TrendingUp size={12} />,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    label: 'Qualification'
  }
};

const SIGNIFICANCE_STYLES = {
  critical: 'border-l-rose-500 bg-rose-500/[0.03]',
  high: 'border-l-amber-500 bg-amber-500/[0.03]',
  medium: 'border-l-blue-500',
  low: 'border-l-white/10'
};

// ============ HELPERS ============

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffSecs < 5) return 'Just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

// ============ COMPONENT ============

export const ActivityTab: React.FC<ActivityTabProps> = ({ data }) => {
  const [activities, setActivities] = useState<ActivityItem[]>(data.activityFeed);
  const [isPaused, setIsPaused] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');
  const [significanceFilter, setSignificanceFilter] = useState<ActivityItem['significance'] | 'all'>('all');
  const feedRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time updates
  useEffect(() => {
    if (isPaused) return;

    const subscriptionId = subscribeToAnalytics(
      ['new_interaction', 'new_session', 'session_end', 'signal_detected', 'tier_change', 'hot_lead_alert'],
      (event) => {
        const newActivity: ActivityItem = {
          id: `live_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: mapEventToActivityType(event.type),
          timestamp: event.timestamp,
          visitorId: event.data?.visitorId || 'unknown',
          sessionId: event.data?.sessionId,
          title: getActivityTitle(event),
          description: getActivityDescription(event),
          significance: getActivitySignificance(event),
          metadata: event.data
        };

        setActivities(prev => [newActivity, ...prev].slice(0, 200));
      }
    );

    return () => {
      unsubscribeFromAnalytics(subscriptionId);
    };
  }, [isPaused]);

  // Update activities when data changes
  useEffect(() => {
    if (!isPaused) {
      setActivities(data.activityFeed);
    }
  }, [data.activityFeed, isPaused]);

  const filteredActivities = activities.filter(a => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (significanceFilter !== 'all' && a.significance !== significanceFilter) return false;
    return true;
  });

  // Stats
  const stats = {
    total: activities.length,
    critical: activities.filter(a => a.significance === 'critical').length,
    high: activities.filter(a => a.significance === 'high').length,
    thisHour: activities.filter(a =>
      new Date(a.timestamp).getTime() > Date.now() - 60 * 60 * 1000
    ).length
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            {isPaused ? (
              <div className="w-2 h-2 rounded-full bg-white/30" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
            <span className="text-[12px] text-white/40">
              {isPaused ? 'Paused' : 'Live'}
            </span>
          </div>

          {/* Pause/Play */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-2 rounded-lg transition-colors ${
              isPaused
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-white/[0.04] text-white/40 hover:text-white/70'
            }`}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as ActivityType | 'all')}
            className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-[12px] text-white focus:outline-none focus:border-white/20 transition-colors"
          >
            <option value="all">All Types</option>
            {Object.entries(ACTIVITY_CONFIG).map(([type, config]) => (
              <option key={type} value={type}>{config.label}</option>
            ))}
          </select>

          <select
            value={significanceFilter}
            onChange={e => setSignificanceFilter(e.target.value as ActivityItem['significance'] | 'all')}
            className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-[12px] text-white focus:outline-none focus:border-white/20 transition-colors"
          >
            <option value="all">All Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-white/30" />
          <span className="text-[12px] text-white/40">Total: <span className="text-white font-medium tabular-nums">{stats.total}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-rose-400" />
          <span className="text-[12px] text-white/40">Critical: <span className="text-rose-400 font-medium tabular-nums">{stats.critical}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-amber-400" />
          <span className="text-[12px] text-white/40">High: <span className="text-amber-400 font-medium tabular-nums">{stats.high}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-white/30" />
          <span className="text-[12px] text-white/40">This Hour: <span className="text-white font-medium tabular-nums">{stats.thisHour}</span></span>
        </div>
      </div>

      {/* Activity Feed */}
      <div
        ref={feedRef}
        className="space-y-2 max-h-[calc(100vh-400px)] min-h-[400px] overflow-y-auto pr-1"
      >
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <Activity size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/50 text-[13px]">No activities to display</p>
            <p className="text-white/30 text-[12px]">Activities will appear here in real-time</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredActivities.map((activity, idx) => (
              <ActivityItemCard
                key={activity.id}
                activity={activity}
                isNew={idx === 0 && !isPaused}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

// ============ ACTIVITY ITEM CARD ============

const ActivityItemCard: React.FC<{
  activity: ActivityItem;
  isNew?: boolean;
}> = ({ activity, isNew }) => {
  const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.interaction;
  const significanceStyle = SIGNIFICANCE_STYLES[activity.significance];

  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: -20, scale: 0.95 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 p-3 rounded-xl border-l-2 bg-white/[0.02] ${significanceStyle}`}
    >
      {/* Icon */}
      <div className={`p-2 rounded-lg ${config.bgColor} ${config.color} flex-shrink-0`}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded ${config.bgColor} ${config.color}`}>
              {config.label}
            </span>
            {activity.significance === 'critical' && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400">
                Critical
              </span>
            )}
            {activity.significance === 'high' && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                High
              </span>
            )}
          </div>
          <span className="text-[10px] text-white/30 flex-shrink-0 tabular-nums">
            {formatTime(activity.timestamp)}
          </span>
        </div>

        <h4 className="text-[12px] text-white/80 mt-1">{activity.title}</h4>
        <p className="text-[11px] text-white/40 mt-0.5">{activity.description}</p>

        <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
          <span className="flex items-center gap-1">
            <Users size={10} />
            {activity.visitorId.slice(0, 12)}...
          </span>
          <span>{formatRelativeTime(activity.timestamp)}</span>
        </div>
      </div>
    </motion.div>
  );
};

// ============ HELPER FUNCTIONS ============

function mapEventToActivityType(eventType: string): ActivityType {
  switch (eventType) {
    case 'new_interaction': return 'interaction';
    case 'new_session': return 'new_session';
    case 'session_end': return 'session_end';
    case 'signal_detected': return 'signal_detected';
    case 'tier_change': return 'tier_change';
    case 'hot_lead_alert': return 'hot_lead';
    default: return 'interaction';
  }
}

function getActivityTitle(event: any): string {
  switch (event.type) {
    case 'new_interaction': return `${event.data?.eventType?.replace(/_/g, ' ') || 'Interaction'}`;
    case 'new_session': return 'New session started';
    case 'session_end': return 'Session ended';
    case 'signal_detected': return `Signal: ${event.data?.signalType?.replace(/_/g, ' ') || 'Unknown'}`;
    case 'tier_change': return `Tier changed to ${event.data?.newTier?.replace(/_/g, ' ') || 'Unknown'}`;
    case 'hot_lead_alert': return `Hot lead detected: ${event.data?.tier || 'Unknown tier'}`;
    default: return 'Activity';
  }
}

function getActivityDescription(event: any): string {
  switch (event.type) {
    case 'new_interaction': return `${event.data?.placeName || 'Unknown place'} from ${event.data?.source || 'unknown source'}`;
    case 'new_session': return 'Visitor began a new session';
    case 'session_end': return `Session duration: ${event.data?.duration ? Math.round(event.data.duration / 60000) + ' minutes' : 'unknown'}`;
    case 'signal_detected': return event.data?.signalValue || 'Wealth signal detected';
    case 'tier_change': return `From ${event.data?.previousTier?.replace(/_/g, ' ') || 'unknown'} to ${event.data?.newTier?.replace(/_/g, ' ') || 'unknown'}`;
    case 'hot_lead_alert': return `Lead score: ${event.data?.leadScore || 0}`;
    default: return 'Activity recorded';
  }
}

function getActivitySignificance(event: any): ActivityItem['significance'] {
  switch (event.type) {
    case 'hot_lead_alert': return 'critical';
    case 'tier_change':
      if (['uhnwi', 'billionaire'].includes(event.data?.newTier)) return 'critical';
      if (['hnwi', 'vhnwi'].includes(event.data?.newTier)) return 'high';
      return 'medium';
    case 'signal_detected':
      if (event.data?.impliedMinWealth > 10000000) return 'high';
      return 'medium';
    case 'new_interaction':
      if (['booking_click', 'phone_click'].includes(event.data?.eventType)) return 'medium';
      return 'low';
    default: return 'low';
  }
}

export default ActivityTab;
