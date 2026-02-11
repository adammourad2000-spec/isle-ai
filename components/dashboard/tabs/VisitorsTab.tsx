// ============================================
// ISLE AI - VISITORS TAB
// OpenAI-inspired design: minimal, elegant
// ============================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  ChevronRight,
  Calendar,
  MessageSquare,
  MousePointerClick,
  Crown,
  Gem,
  DollarSign,
  Clock,
  MapPin,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';
import { EnhancedDashboardData, VisitorAccount, JourneyNode } from '../../../types/analytics';
import { WealthTier } from '../../../services/wealthIntelligenceService';

// ============ TYPES ============

interface VisitorsTabProps {
  data: EnhancedDashboardData;
}

type SortField = 'lastSeen' | 'firstSeen' | 'leadScore' | 'interactions' | 'messages';
type SortDirection = 'asc' | 'desc';

// ============ TIER STYLING ============

const TIER_CONFIG: Record<WealthTier, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  unknown: { label: 'Unknown', color: 'text-white/40', bgColor: 'bg-white/[0.06]', icon: <Users size={14} /> },
  mass_market: { label: 'Mass Market', color: 'text-white/50', bgColor: 'bg-white/[0.06]', icon: <Users size={14} /> },
  affluent: { label: 'Affluent', color: 'text-sky-400', bgColor: 'bg-sky-500/10', icon: <DollarSign size={14} /> },
  mass_affluent: { label: 'Mass Affluent', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: <DollarSign size={14} /> },
  hnwi: { label: 'HNWI', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: <Gem size={14} /> },
  vhnwi: { label: 'VHNWI', color: 'text-violet-400', bgColor: 'bg-violet-500/10', icon: <Crown size={14} /> },
  uhnwi: { label: 'UHNWI', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: <Crown size={14} /> },
  billionaire: { label: 'Billionaire', color: 'text-rose-400', bgColor: 'bg-rose-500/10', icon: <Crown size={14} /> }
};

// ============ HELPERS ============

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatCurrency(amount: number): string {
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(0)}K`;
  return `$${amount}`;
}

const DeviceIcon: React.FC<{ device: string }> = ({ device }) => {
  switch (device) {
    case 'mobile': return <Smartphone size={12} />;
    case 'tablet': return <Tablet size={12} />;
    default: return <Monitor size={12} />;
  }
};

// ============ COMPONENT ============

export const VisitorsTab: React.FC<VisitorsTabProps> = ({ data }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<WealthTier | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('lastSeen');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedVisitorId, setExpandedVisitorId] = useState<string | null>(null);

  // Filter and sort visitors
  const filteredVisitors = useMemo(() => {
    let visitors = [...data.visitors];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      visitors = visitors.filter(v =>
        v.visitorId.toLowerCase().includes(query) ||
        v.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    // Tier filter
    if (tierFilter !== 'all') {
      visitors = visitors.filter(v => v.highestTierReached === tierFilter);
    }

    // Sort
    visitors.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'lastSeen':
          comparison = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
          break;
        case 'firstSeen':
          comparison = new Date(a.firstSeen).getTime() - new Date(b.firstSeen).getTime();
          break;
        case 'leadScore':
          comparison = a.peakLeadScore - b.peakLeadScore;
          break;
        case 'interactions':
          comparison = a.totalInteractionCount - b.totalInteractionCount;
          break;
        case 'messages':
          comparison = a.totalMessageCount - b.totalMessageCount;
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return visitors;
  }, [data.visitors, searchQuery, tierFilter, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search visitors..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-64 bg-white/[0.03] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={e => setTierFilter(e.target.value as WealthTier | 'all')}
            className="px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-[13px] text-white focus:outline-none focus:border-white/20 transition-colors"
          >
            <option value="all">All Tiers</option>
            {Object.entries(TIER_CONFIG).map(([tier, config]) => (
              <option key={tier} value={tier}>{config.label}</option>
            ))}
          </select>
        </div>

        <div className="text-[12px] text-white/40">
          {filteredVisitors.length} visitors
        </div>
      </div>

      {/* Sort Buttons */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-white/30">Sort by:</span>
        {[
          { field: 'lastSeen' as SortField, label: 'Last Active' },
          { field: 'leadScore' as SortField, label: 'Lead Score' },
          { field: 'interactions' as SortField, label: 'Interactions' },
          { field: 'messages' as SortField, label: 'Messages' }
        ].map(({ field, label }) => (
          <button
            key={field}
            onClick={() => toggleSort(field)}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              sortField === field
                ? 'bg-white/[0.08] text-white'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
          >
            {label}
            {sortField === field && (
              <span className="ml-1">{sortDirection === 'desc' ? '↓' : '↑'}</span>
            )}
          </button>
        ))}
      </div>

      {/* Visitor List */}
      <div className="space-y-2">
        {filteredVisitors.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/50 text-[13px]">No visitors found</p>
            <p className="text-white/30 text-[12px]">Adjust your filters or wait for new visitors</p>
          </div>
        ) : (
          filteredVisitors.map(visitor => (
            <VisitorCard
              key={visitor.visitorId}
              visitor={visitor}
              isExpanded={expandedVisitorId === visitor.visitorId}
              onToggle={() => setExpandedVisitorId(
                expandedVisitorId === visitor.visitorId ? null : visitor.visitorId
              )}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ============ VISITOR CARD ============

const VisitorCard: React.FC<{
  visitor: VisitorAccount;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ visitor, isExpanded, onToggle }) => {
  const tierConfig = TIER_CONFIG[visitor.highestTierReached];

  return (
    <motion.div
      layout
      className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${tierConfig.bgColor}`}>
            {tierConfig.icon}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-white font-medium">{visitor.visitorId.slice(0, 20)}...</span>
              <span className={`px-2 py-0.5 rounded text-[10px] ${tierConfig.bgColor} ${tierConfig.color}`}>
                {tierConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-white/30 mt-1">
              <span className="flex items-center gap-1">
                <Calendar size={10} />
                First seen {formatRelativeTime(visitor.firstSeen)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                Last active {formatRelativeTime(visitor.lastSeen)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[18px] font-semibold text-white tabular-nums">{visitor.peakLeadScore}</div>
            <div className="text-[10px] text-white/30">Lead Score</div>
          </div>
          <div className="text-right">
            <div className="text-[13px] font-medium text-cyan-400 tabular-nums">{visitor.totalInteractionCount}</div>
            <div className="text-[10px] text-white/30">Interactions</div>
          </div>
          <div className="text-right">
            <div className="text-[13px] font-medium text-emerald-400 tabular-nums">{visitor.totalMessageCount}</div>
            <div className="text-[10px] text-white/30">Messages</div>
          </div>
          <div className="text-right">
            <div className="text-[13px] font-medium text-violet-400 tabular-nums">{visitor.sessions.length}</div>
            <div className="text-[10px] text-white/30">Sessions</div>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight size={18} className="text-white/30" />
          </motion.div>
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/[0.06]"
          >
            <div className="p-4 grid grid-cols-2 gap-6">
              {/* Left: Profile Details */}
              <div className="space-y-4">
                <h4 className="text-[12px] font-medium text-white flex items-center gap-2">
                  <Users size={12} />
                  Profile Details
                </h4>

                {visitor.aggregatedProfile ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-white/40">Estimated Net Worth</span>
                      <span className="text-white tabular-nums">
                        {formatCurrency(visitor.aggregatedProfile.estimatedNetWorth.min)} - {formatCurrency(visitor.aggregatedProfile.estimatedNetWorth.max)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-white/40">Confidence</span>
                      <span className="text-white tabular-nums">{visitor.aggregatedProfile.confidence}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-white/40">Qualification Status</span>
                      <span className={`capitalize ${
                        visitor.aggregatedProfile.qualificationStatus === 'hot' ? 'text-rose-400' :
                        visitor.aggregatedProfile.qualificationStatus === 'qualified' ? 'text-emerald-400' :
                        visitor.aggregatedProfile.qualificationStatus === 'warm' ? 'text-blue-400' :
                        'text-white/40'
                      }`}>
                        {visitor.aggregatedProfile.qualificationStatus}
                      </span>
                    </div>
                    {visitor.aggregatedProfile.investmentIntent.hasIntent && (
                      <div className="text-[12px]">
                        <span className="text-white/40">Investment Intent: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {visitor.aggregatedProfile.investmentIntent.type.map(t => (
                            <span key={t} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-full">
                              {t.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {visitor.aggregatedProfile.signals.length > 0 && (
                      <div className="text-[12px]">
                        <span className="text-white/40">Top Signals:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {visitor.aggregatedProfile.signals.slice(0, 5).map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] rounded-full">
                              {s.type.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-white/30 text-[12px]">No profile data available</p>
                )}

                {/* Sessions */}
                <div className="mt-4">
                  <h5 className="text-[11px] font-medium text-white/40 mb-2">Recent Sessions</h5>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {visitor.sessions.slice(0, 5).map(session => (
                      <div key={session.sessionId} className="flex items-center justify-between text-[11px] bg-white/[0.03] rounded-lg p-2">
                        <div className="flex items-center gap-2 text-white/50">
                          <DeviceIcon device={session.device} />
                          <span className="text-white/70">{session.sessionId.slice(0, 16)}...</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/30">
                          <span>{session.messageCount} msgs</span>
                          <span>{formatRelativeTime(session.startedAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Journey Timeline */}
              <div className="space-y-4">
                <h4 className="text-[12px] font-medium text-white flex items-center gap-2">
                  <MapPin size={12} />
                  Journey Timeline
                </h4>
                <JourneyTimeline journey={visitor.journey} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============ JOURNEY TIMELINE ============

const JourneyTimeline: React.FC<{ journey: JourneyNode[] }> = ({ journey }) => {
  const sortedJourney = [...journey].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 10);

  const getNodeIcon = (type: JourneyNode['type']) => {
    switch (type) {
      case 'session_start': return <Users size={10} className="text-blue-400" />;
      case 'message': return <MessageSquare size={10} className="text-emerald-400" />;
      case 'interaction': return <MousePointerClick size={10} className="text-cyan-400" />;
      case 'session_end': return <Clock size={10} className="text-white/40" />;
      case 'signal_detected': return <Gem size={10} className="text-amber-400" />;
      case 'tier_upgrade': return <Crown size={10} className="text-violet-400" />;
      default: return <MapPin size={10} className="text-white/40" />;
    }
  };

  const getSignificanceColor = (significance?: string) => {
    switch (significance) {
      case 'critical': return 'border-rose-500';
      case 'high': return 'border-amber-500';
      case 'medium': return 'border-blue-500';
      default: return 'border-white/20';
    }
  };

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-white/[0.08]" />

      <div className="space-y-3">
        {sortedJourney.map((node, idx) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="relative flex items-start gap-3 pl-1"
          >
            {/* Node dot */}
            <div className={`relative z-10 w-6 h-6 rounded-full bg-[#0a0a0a] border-2 ${getSignificanceColor(node.data.significance)} flex items-center justify-center`}>
              {getNodeIcon(node.type)}
            </div>

            {/* Content */}
            <div className="flex-1 bg-white/[0.03] rounded-lg p-2">
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="font-medium text-white/80 capitalize">{node.type.replace(/_/g, ' ')}</span>
                <span className="text-white/30">{formatRelativeTime(node.timestamp)}</span>
              </div>
              <p className="text-[11px] text-white/40">{node.data.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default VisitorsTab;
