// ============================================
// ISLE AI - OVERVIEW TAB
// OpenAI-inspired design: minimal, elegant
// ============================================

import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  DollarSign,
  Target,
  CheckCircle2,
  PieChart,
  Activity,
  BarChart3,
  MessageSquare,
  Crown,
  Gem,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { EnhancedDashboardData } from '../../../types/analytics';
import { WealthTier, WealthProfile } from '../../../services/wealthIntelligenceService';

// ============ TYPES ============

interface OverviewTabProps {
  data: EnhancedDashboardData;
}

// ============ TIER STYLING ============

const TIER_CONFIG: Record<WealthTier, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  unknown: { label: 'Unknown', color: 'text-white/40', bgColor: 'bg-white/[0.06]', icon: <Users size={14} /> },
  mass_market: { label: 'Mass Market', color: 'text-white/50', bgColor: 'bg-white/[0.06]', icon: <Users size={14} /> },
  affluent: { label: 'Affluent', color: 'text-sky-400', bgColor: 'bg-sky-500/10', icon: <DollarSign size={14} /> },
  mass_affluent: { label: 'Mass Affluent', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: <DollarSign size={14} /> },
  hnwi: { label: 'HNWI ($1M+)', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: <Gem size={14} /> },
  vhnwi: { label: 'VHNWI ($10M+)', color: 'text-violet-400', bgColor: 'bg-violet-500/10', icon: <Crown size={14} /> },
  uhnwi: { label: 'UHNWI ($30M+)', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: <Crown size={14} /> },
  billionaire: { label: 'Billionaire', color: 'text-rose-400', bgColor: 'bg-rose-500/10', icon: <Crown size={14} /> }
};

type QualificationStatus = 'cold' | 'warm' | 'hot' | 'qualified';

const STATUS_CONFIG: Record<QualificationStatus, { label: string; color: string }> = {
  cold: { label: 'Cold', color: 'text-white/40' },
  warm: { label: 'Warm', color: 'text-blue-400' },
  qualified: { label: 'Qualified', color: 'text-emerald-400' },
  hot: { label: 'Hot Lead', color: 'text-rose-400' }
};

// ============ HELPERS ============

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

// ============ COMPONENT ============

export const OverviewTab: React.FC<OverviewTabProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Active Sessions"
          value={data.live.activeSessions}
          icon={<Users size={18} />}
          color="cyan"
        />
        <StatCard
          title="Hot Leads Today"
          value={data.live.hotLeadsToday}
          icon={<Target size={18} />}
          color="rose"
        />
        <StatCard
          title="Qualified Leads"
          value={data.live.qualifiedLeadsToday}
          icon={<CheckCircle2 size={18} />}
          color="emerald"
        />
        <StatCard
          title="Pipeline Value"
          value={formatCurrency(data.live.totalValuePipeline)}
          icon={<DollarSign size={18} />}
          color="amber"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <TierDistribution data={data.byTier} />
          <TopSignals signals={data.topSignalsToday} />
        </div>

        {/* Middle Column */}
        <div className="space-y-6">
          <ConversionFunnel funnel={data.conversionFunnel} />
          <RecentSessions visitors={data.visitors} />
        </div>

        {/* Right Column */}
        <div>
          <HotLeadsTable leads={data.recentHotLeads} />
        </div>
      </div>
    </div>
  );
};

// ============ STAT CARD ============

const StatCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: 'cyan' | 'rose' | 'emerald' | 'amber' | 'violet';
}> = ({ title, value, change, icon, color }) => {
  const colors = {
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400' }
  };

  const c = colors[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center ${c.text}`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center text-[11px] ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-[28px] font-semibold text-white tabular-nums">{value}</p>
      <p className="text-[12px] text-white/40 mt-0.5">{title}</p>
    </motion.div>
  );
};

// ============ CARD WRAPPER ============

const Card: React.FC<{
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  children: React.ReactNode;
}> = ({ title, icon, iconColor, children }) => (
  <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
    <h3 className="text-[13px] font-medium text-white mb-4 flex items-center gap-2">
      <span className={iconColor}>{icon}</span>
      {title}
    </h3>
    {children}
  </div>
);

// ============ TIER DISTRIBUTION ============

const TierDistribution: React.FC<{ data: Record<string, number> }> = ({ data }) => {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0) || 1;
  const tiers: WealthTier[] = ['billionaire', 'uhnwi', 'vhnwi', 'hnwi', 'mass_affluent', 'affluent', 'mass_market', 'unknown'];

  return (
    <Card title="Wealth Tier Distribution" icon={<PieChart size={14} />} iconColor="text-violet-400">
      <div className="space-y-3">
        {tiers.map(tier => {
          const count = data[tier] || 0;
          const percentage = (count / total) * 100;
          const config = TIER_CONFIG[tier];

          return (
            <div key={tier} className="space-y-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className={`flex items-center gap-1.5 ${config.color}`}>
                  {config.icon}
                  {config.label}
                </span>
                <span className="text-white/40 tabular-nums">{count} ({percentage.toFixed(1)}%)</span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className={`h-full ${config.bgColor.replace('/10', '')}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ============ CONVERSION FUNNEL ============

const ConversionFunnel: React.FC<{ funnel: EnhancedDashboardData['conversionFunnel'] }> = ({ funnel }) => {
  const stages = [
    { key: 'visitors', label: 'Visitors', value: funnel.visitors, color: 'bg-blue-500' },
    { key: 'engaged', label: 'Engaged', value: funnel.engaged, color: 'bg-cyan-500' },
    { key: 'interested', label: 'Interested', value: funnel.interested, color: 'bg-emerald-500' },
    { key: 'qualified', label: 'Qualified', value: funnel.qualified, color: 'bg-violet-500' },
    { key: 'converted', label: 'Converted', value: funnel.converted, color: 'bg-amber-500' }
  ];

  const maxValue = Math.max(...stages.map(s => s.value)) || 1;

  return (
    <Card title="Conversion Funnel" icon={<Activity size={14} />} iconColor="text-cyan-400">
      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const width = (stage.value / maxValue) * 100;
          const prevValue = idx > 0 ? stages[idx - 1].value : stage.value;
          const convRate = prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(1) : '0';

          return (
            <div key={stage.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-white/70">{stage.label}</span>
                <span className="text-white/40 tabular-nums">
                  {formatNumber(stage.value)}
                  {idx > 0 && <span className="text-white/20 ml-1">({convRate}%)</span>}
                </span>
              </div>
              <div className="h-5 bg-white/[0.06] rounded overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className={`h-full ${stage.color} flex items-center justify-end pr-2`}
                >
                  <span className="text-[11px] text-white/80 font-medium tabular-nums">{formatNumber(stage.value)}</span>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ============ TOP SIGNALS ============

const TopSignals: React.FC<{ signals: { signal: string; count: number }[] }> = ({ signals }) => {
  if (signals.length === 0) {
    return (
      <Card title="Top Wealth Signals" icon={<BarChart3 size={14} />} iconColor="text-amber-400">
        <div className="text-center py-6">
          <BarChart3 size={24} className="mx-auto text-white/20 mb-2" />
          <p className="text-white/40 text-[12px]">No signals detected today</p>
        </div>
      </Card>
    );
  }

  const maxCount = Math.max(...signals.map(s => s.count)) || 1;

  return (
    <Card title="Top Wealth Signals Today" icon={<BarChart3 size={14} />} iconColor="text-amber-400">
      <div className="space-y-2.5">
        {signals.slice(0, 8).map((signal, idx) => (
          <div key={signal.signal} className="flex items-center gap-2">
            <div className="text-amber-400">
              <Activity size={12} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-white/60 capitalize">{signal.signal.replace(/_/g, ' ')}</span>
                <span className="text-white/40 tabular-nums">{signal.count}</span>
              </div>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
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
    </Card>
  );
};

// ============ HOT LEADS TABLE ============

const HotLeadsTable: React.FC<{ leads: WealthProfile[] }> = ({ leads }) => {
  if (leads.length === 0) {
    return (
      <Card title="Hot Leads" icon={<Target size={14} />} iconColor="text-rose-400">
        <div className="text-center py-8">
          <Target size={32} className="mx-auto text-white/20 mb-2" />
          <p className="text-white/40 text-[12px]">No hot leads detected yet</p>
          <p className="text-white/20 text-[11px]">Start conversations to identify high-value prospects</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title={`Hot Leads (${leads.length})`} icon={<Target size={14} />} iconColor="text-rose-400">
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {leads.map((lead, idx) => {
          const tierConfig = TIER_CONFIG[lead.tier];
          const statusConfig = STATUS_CONFIG[lead.qualificationStatus];

          return (
            <motion.div
              key={lead.sessionId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/[0.03] rounded-lg p-3 hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${tierConfig.bgColor}`}>
                    {tierConfig.icon}
                  </div>
                  <div>
                    <p className={`text-[12px] font-medium ${tierConfig.color}`}>{tierConfig.label}</p>
                    <p className="text-[10px] text-white/30">{lead.visitorId.slice(0, 16)}...</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[18px] font-semibold text-white tabular-nums">{lead.leadScore}</p>
                  <p className="text-[10px] text-white/30">Lead Score</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px]">
                <span className={statusConfig.color}>{statusConfig.label}</span>
                <span className="text-white/20">|</span>
                <span className="text-white/40">
                  {formatCurrency(lead.estimatedNetWorth.min)} - {formatCurrency(lead.estimatedNetWorth.max)}
                </span>
              </div>

              {lead.investmentIntent.hasIntent && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {lead.investmentIntent.type.slice(0, 3).map(intent => (
                    <span key={intent} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-full">
                      {intent.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-white/20 mt-2">{getRelativeTime(lead.createdAt)}</p>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
};

// ============ RECENT SESSIONS ============

const RecentSessions: React.FC<{ visitors: EnhancedDashboardData['visitors'] }> = ({ visitors }) => {
  const recentSessions = visitors
    .flatMap(v => v.sessions.map(s => ({ ...s, visitorId: v.visitorId, tier: v.highestTierReached })))
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 10);

  return (
    <Card title="Recent Sessions" icon={<MessageSquare size={14} />} iconColor="text-blue-400">
      {recentSessions.length === 0 ? (
        <div className="text-center py-6">
          <MessageSquare size={24} className="mx-auto text-white/20 mb-2" />
          <p className="text-white/40 text-[12px]">No sessions recorded yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
          {recentSessions.map((session, idx) => {
            const tierConfig = TIER_CONFIG[session.tier || 'unknown'];

            return (
              <motion.div
                key={session.sessionId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white/[0.03] rounded-lg p-2.5"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${session.endedAt ? 'bg-white/30' : 'bg-emerald-400 animate-pulse'}`} />
                    <span className="text-[12px] text-white/70">{session.sessionId.slice(0, 20)}...</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${tierConfig.bgColor} ${tierConfig.color}`}>
                    {tierConfig.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-white/30">
                  <span>{session.messageCount} messages</span>
                  <span>{session.device}</span>
                  <span className="ml-auto">{getRelativeTime(session.startedAt)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default OverviewTab;
