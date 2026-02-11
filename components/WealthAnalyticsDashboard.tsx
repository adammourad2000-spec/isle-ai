// ============================================
// ISLE AI - WEALTH ANALYTICS DASHBOARD
// Real-time Big Data analytics for HNWI/UHNWI lead tracking
// Government CRM Integration Dashboard
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Download,
  RefreshCw,
  ChevronDown,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  Crown,
  Gem,
  Building2,
  Plane,
  Anchor,
  Home,
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  MessageSquare,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  getDashboardData,
  getAllSessions,
  getAllProfiles,
  exportAllData,
  exportProfilesCSV,
  DashboardData,
  ConversationSession
} from '../services/conversationLogger';
import {
  WealthProfile,
  WealthTier,
  QualificationStatus
} from '../services/wealthIntelligenceService';

// ============ TYPES ============

interface DashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============ TIER STYLING ============

const TIER_CONFIG: Record<WealthTier, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  unknown: { label: 'Unknown', color: 'text-gray-400', bgColor: 'bg-gray-500/20', icon: <Users size={16} /> },
  mass_affluent: { label: 'Mass Affluent', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: <DollarSign size={16} /> },
  hnwi: { label: 'HNWI', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: <Gem size={16} /> },
  vhnwi: { label: 'VHNWI', color: 'text-purple-400', bgColor: 'bg-purple-500/20', icon: <Crown size={16} /> },
  uhnwi: { label: 'UHNWI', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: <Crown size={16} /> },
  billionaire: { label: 'Billionaire', color: 'text-rose-400', bgColor: 'bg-rose-500/20', icon: <Crown size={16} /> }
};

const STATUS_CONFIG: Record<QualificationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  unqualified: { label: 'Unqualified', color: 'text-gray-400', icon: <XCircle size={14} /> },
  potential: { label: 'Potential', color: 'text-blue-400', icon: <Eye size={14} /> },
  interested: { label: 'Interested', color: 'text-cyan-400', icon: <MessageSquare size={14} /> },
  qualified: { label: 'Qualified', color: 'text-emerald-400', icon: <CheckCircle2 size={14} /> },
  hot: { label: 'Hot Lead', color: 'text-rose-400', icon: <Target size={14} /> }
};

// ============ HELPER FUNCTIONS ============

function formatCurrency(amount: number): string {
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(0)}K`;
  return `$${amount}`;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

function getRelativeTime(dateString: string): string {
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

// ============ STAT CARD COMPONENT ============

const StatCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, change, icon, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
  >
    <div className="flex items-start justify-between mb-2">
      <div className={`p-2 rounded-lg ${color}`}>
        {icon}
      </div>
      {change !== undefined && (
        <div className={`flex items-center text-xs ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
    <p className="text-sm text-zinc-400">{title}</p>
  </motion.div>
);

// ============ TIER DISTRIBUTION CHART ============

const TierDistribution: React.FC<{ data: Record<string, number> }> = ({ data }) => {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0) || 1;
  const tiers: WealthTier[] = ['billionaire', 'uhnwi', 'vhnwi', 'hnwi', 'mass_affluent', 'unknown'];

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <PieChart size={16} className="text-purple-400" />
        Wealth Tier Distribution
      </h3>
      <div className="space-y-3">
        {tiers.map(tier => {
          const count = data[tier] || 0;
          const percentage = (count / total) * 100;
          const config = TIER_CONFIG[tier];

          return (
            <div key={tier} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={`flex items-center gap-1.5 ${config.color}`}>
                  {config.icon}
                  {config.label}
                </span>
                <span className="text-zinc-400">{count} ({percentage.toFixed(1)}%)</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className={`h-full ${config.bgColor.replace('/20', '')}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============ CONVERSION FUNNEL ============

const ConversionFunnel: React.FC<{ funnel: DashboardData['conversionFunnel'] }> = ({ funnel }) => {
  const stages = [
    { key: 'visitors', label: 'Visitors', value: funnel.visitors, color: 'bg-blue-500' },
    { key: 'engaged', label: 'Engaged', value: funnel.engaged, color: 'bg-cyan-500' },
    { key: 'interested', label: 'Interested', value: funnel.interested, color: 'bg-emerald-500' },
    { key: 'qualified', label: 'Qualified', value: funnel.qualified, color: 'bg-purple-500' },
    { key: 'converted', label: 'Converted', value: funnel.converted, color: 'bg-amber-500' }
  ];

  const maxValue = Math.max(...stages.map(s => s.value)) || 1;

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <Activity size={16} className="text-cyan-400" />
        Conversion Funnel
      </h3>
      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const width = (stage.value / maxValue) * 100;
          const prevValue = idx > 0 ? stages[idx - 1].value : stage.value;
          const convRate = prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(1) : '0';

          return (
            <div key={stage.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">{stage.label}</span>
                <span className="text-zinc-400">
                  {formatNumber(stage.value)}
                  {idx > 0 && <span className="text-zinc-500 ml-1">({convRate}%)</span>}
                </span>
              </div>
              <div className="h-6 bg-slate-700 rounded overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className={`h-full ${stage.color} flex items-center justify-end pr-2`}
                >
                  <span className="text-xs text-white/80 font-medium">{formatNumber(stage.value)}</span>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============ HOT LEADS TABLE ============

const HotLeadsTable: React.FC<{ leads: WealthProfile[] }> = ({ leads }) => {
  if (leads.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <Target size={16} className="text-rose-400" />
          Hot Leads
        </h3>
        <div className="text-center py-8">
          <Target size={32} className="mx-auto text-zinc-600 mb-2" />
          <p className="text-zinc-500 text-sm">No hot leads detected yet</p>
          <p className="text-zinc-600 text-xs">Start conversations to identify high-value prospects</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <Target size={16} className="text-rose-400" />
        Hot Leads ({leads.length})
      </h3>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {leads.map((lead, idx) => {
          const tierConfig = TIER_CONFIG[lead.tier];
          const statusConfig = STATUS_CONFIG[lead.qualificationStatus];

          return (
            <motion.div
              key={lead.sessionId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${tierConfig.bgColor}`}>
                    {tierConfig.icon}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${tierConfig.color}`}>{tierConfig.label}</p>
                    <p className="text-xs text-zinc-500">{lead.visitorId.slice(0, 16)}...</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{lead.leadScore}</p>
                  <p className="text-xs text-zinc-500">Lead Score</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className={`flex items-center gap-1 ${statusConfig.color}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
                <span className="text-zinc-500">|</span>
                <span className="text-zinc-400">
                  {formatCurrency(lead.estimatedNetWorth.min)} - {formatCurrency(lead.estimatedNetWorth.max)}
                </span>
              </div>

              {lead.investmentIntent.hasIntent && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {lead.investmentIntent.type.slice(0, 3).map(intent => (
                    <span key={intent} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                      {intent.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-zinc-500 mt-2">{getRelativeTime(lead.createdAt)}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ============ TOP SIGNALS ============

const TopSignals: React.FC<{ signals: DashboardData['topSignalsToday'] }> = ({ signals }) => {
  const signalIcons: Record<string, React.ReactNode> = {
    luxury_accommodation: <Building2 size={14} />,
    private_aviation: <Plane size={14} />,
    yacht_interest: <Anchor size={14} />,
    real_estate_ultra: <Home size={14} />,
    family_office: <Briefcase size={14} />,
    investment_timeline: <Calendar size={14} />
  };

  if (signals.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-amber-400" />
          Top Wealth Signals
        </h3>
        <div className="text-center py-6">
          <BarChart3 size={24} className="mx-auto text-zinc-600 mb-2" />
          <p className="text-zinc-500 text-sm">No signals detected today</p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...signals.map(s => s.count)) || 1;

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <BarChart3 size={16} className="text-amber-400" />
        Top Wealth Signals Today
      </h3>
      <div className="space-y-2">
        {signals.slice(0, 8).map((signal, idx) => (
          <div key={signal.signal} className="flex items-center gap-2">
            <div className="text-amber-400">
              {signalIcons[signal.signal] || <Activity size={14} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-300 capitalize">{signal.signal.replace(/_/g, ' ')}</span>
                <span className="text-zinc-400">{signal.count}</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(signal.count / maxCount) * 100}%` }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="h-full bg-amber-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ RECENT SESSIONS ============

const RecentSessions: React.FC<{ sessions: ConversationSession[] }> = ({ sessions }) => {
  const recentSessions = sessions
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 10);

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <MessageSquare size={16} className="text-blue-400" />
        Recent Sessions
      </h3>
      {recentSessions.length === 0 ? (
        <div className="text-center py-6">
          <MessageSquare size={24} className="mx-auto text-zinc-600 mb-2" />
          <p className="text-zinc-500 text-sm">No sessions recorded yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {recentSessions.map((session, idx) => {
            const tierConfig = session.analysis
              ? TIER_CONFIG[session.analysis.aggregatedProfile.tier]
              : TIER_CONFIG['unknown'];
            const messageCount = session.messages.length;
            const duration = session.endedAt
              ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)
              : null;

            return (
              <motion.div
                key={session.sessionId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-slate-700/30 rounded-lg p-2.5 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${session.endedAt ? 'bg-zinc-500' : 'bg-emerald-400 animate-pulse'}`} />
                    <span className="text-zinc-300">{session.sessionId.slice(0, 20)}...</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded ${tierConfig.bgColor} ${tierConfig.color}`}>
                    {tierConfig.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-zinc-500">
                  <span>{messageCount} messages</span>
                  {duration && <span>{duration}m duration</span>}
                  <span>{session.metadata.device}</span>
                  <span className="ml-auto">{getRelativeTime(session.startedAt)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============ MAIN DASHBOARD COMPONENT ============

export const WealthAnalyticsDashboard: React.FC<DashboardProps> = ({ isOpen, onClose }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch dashboard data
  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const data = getDashboardData();
      const allSessions = getAllSessions();
      setDashboardData(data);
      setSessions(allSessions);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setIsRefreshing(false);
  };

  // Initial load and auto-refresh
  useEffect(() => {
    if (isOpen) {
      fetchData();
      const interval = setInterval(fetchData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Export handlers
  const handleExportJSON = () => {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `isle-wealth-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const csv = exportProfilesCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `isle-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-6xl max-h-[90vh] bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-900/50 to-rose-900/50 border-b border-slate-700/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="text-purple-400" />
                  Wealth Intelligence Dashboard
                </h2>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Real-time HNWI/UHNWI Lead Analytics
                  {lastUpdated && (
                    <span className="ml-2 text-zinc-500">
                      Updated {getRelativeTime(lastUpdated.toISOString())}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchData}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white transition-colors"
                  disabled={isRefreshing}
                >
                  <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Download size={16} />
                  Export CSV
                </button>
                <button
                  onClick={handleExportJSON}
                  className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Download size={16} />
                  Export JSON
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white transition-colors"
                >
                  <XCircle size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {dashboardData ? (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <StatCard
                    title="Active Sessions"
                    value={dashboardData.live.activeSessions}
                    icon={<Users size={20} />}
                    color="bg-blue-500/20 text-blue-400"
                  />
                  <StatCard
                    title="Hot Leads Today"
                    value={dashboardData.live.hotLeadsToday}
                    icon={<Target size={20} />}
                    color="bg-rose-500/20 text-rose-400"
                  />
                  <StatCard
                    title="Qualified Leads"
                    value={dashboardData.live.qualifiedLeadsToday}
                    icon={<CheckCircle2 size={20} />}
                    color="bg-emerald-500/20 text-emerald-400"
                  />
                  <StatCard
                    title="Pipeline Value"
                    value={formatCurrency(dashboardData.live.totalValuePipeline)}
                    icon={<DollarSign size={20} />}
                    color="bg-amber-500/20 text-amber-400"
                  />
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-3 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <TierDistribution data={dashboardData.byTier} />
                    <TopSignals signals={dashboardData.topSignalsToday} />
                  </div>

                  {/* Middle Column */}
                  <div className="space-y-6">
                    <ConversionFunnel funnel={dashboardData.conversionFunnel} />
                    <RecentSessions sessions={sessions} />
                  </div>

                  {/* Right Column */}
                  <div>
                    <HotLeadsTable leads={dashboardData.recentHotLeads} />
                  </div>
                </div>

                {/* Footer Stats */}
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-6">
                      <span className="text-zinc-400">
                        Total Sessions: <span className="text-white font-medium">{formatNumber(sessions.length)}</span>
                      </span>
                      <span className="text-zinc-400">
                        Total Profiles: <span className="text-white font-medium">{formatNumber(Object.values(dashboardData.byTier).reduce((a, b) => a + b, 0))}</span>
                      </span>
                    </div>
                    <div className="text-zinc-500 text-xs">
                      Isle AI Wealth Intelligence System v1.0
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <RefreshCw size={32} className="mx-auto text-purple-400 animate-spin mb-3" />
                  <p className="text-zinc-400">Loading analytics...</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WealthAnalyticsDashboard;
