// ============================================
// ISLE AI - WEALTH TAB
// OpenAI-inspired design: minimal, elegant
// ============================================

import React from 'react';
import { motion } from 'framer-motion';
import {
  Gem,
  Crown,
  Eye,
  Brain,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Grid3X3
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';
import { EnhancedDashboardData, SignalCluster, SourceOfWealth, StealthWealthIndicator } from '../../../types/analytics';
import { WealthTier } from '../../../services/wealthIntelligenceService';

// ============ TYPES ============

interface WealthTabProps {
  data: EnhancedDashboardData;
}

// ============ COLORS ============

const CATEGORY_COLORS: Record<string, string> = {
  direct_disclosure: '#f43f5e',
  lifestyle_indicator: '#f59e0b',
  professional_status: '#8b5cf6',
  financial_behavior: '#10b981',
  real_estate: '#3b82f6',
  travel_aviation: '#06b6d4',
  language_pattern: '#ec4899',
  network_indicator: '#14b8a6',
  geographic: '#6366f1'
};

const TIER_COLORS: Record<WealthTier, string> = {
  unknown: '#6b7280',
  mass_market: '#64748b',
  affluent: '#0ea5e9',
  mass_affluent: '#3b82f6',
  hnwi: '#10b981',
  vhnwi: '#8b5cf6',
  uhnwi: '#f59e0b',
  billionaire: '#f43f5e'
};

// ============ COMPONENT ============

export const WealthTab: React.FC<WealthTabProps> = ({ data }) => {
  const { wealth } = data;

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<Gem size={18} />}
          label="Unique Signal Types"
          value={wealth.signalClusters.length}
          color="violet"
        />
        <StatCard
          icon={<Crown size={18} />}
          label="HNWI+ Detected"
          value={(data.byTier.hnwi || 0) + (data.byTier.vhnwi || 0) + (data.byTier.uhnwi || 0) + (data.byTier.billionaire || 0)}
          color="amber"
        />
        <StatCard
          icon={<Eye size={18} />}
          label="Stealth Wealth"
          value={wealth.stealthWealth.length}
          color="cyan"
        />
        <StatCard
          icon={<Brain size={18} />}
          label="Avg. Lead Score (HNWI+)"
          value={wealth.averageLeadScoreByTier.hnwi || 0}
          color="emerald"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Signal Clusters */}
        <Card title="Signal Clusters by Category" icon={<BarChart3 size={14} />} iconColor="text-violet-400">
          <SignalClustersChart clusters={wealth.signalClusters} />
        </Card>

        {/* Source of Wealth */}
        <Card title="Source of Wealth Distribution" icon={<PieChartIcon size={14} />} iconColor="text-amber-400">
          <SourceOfWealthChart sources={wealth.sourceOfWealth} />
        </Card>

        {/* Tier Progression */}
        <Card title="Tier Progression (7 Days)" icon={<TrendingUp size={14} />} iconColor="text-emerald-400">
          <TierProgressionChart data={wealth.tierProgression} />
        </Card>

        {/* Sophistication Matrix */}
        <Card title="Sophistication Matrix" icon={<Grid3X3 size={14} />} iconColor="text-rose-400">
          <SophisticationMatrix matrix={wealth.sophisticationMatrix} />
        </Card>
      </div>

      {/* Stealth Wealth Indicators */}
      <Card title="Stealth Wealth Indicators" icon={<Eye size={14} />} iconColor="text-cyan-400">
        <StealthWealthList indicators={wealth.stealthWealth} />
      </Card>
    </div>
  );
};

// ============ STAT CARD ============

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'violet' | 'amber' | 'cyan' | 'emerald';
}> = ({ icon, label, value, color }) => {
  const colors = {
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' }
  };

  const c = colors[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]"
    >
      <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center ${c.text} mb-3`}>
        {icon}
      </div>
      <p className="text-[28px] font-semibold text-white tabular-nums">{value}</p>
      <p className="text-[12px] text-white/40 mt-0.5">{label}</p>
    </motion.div>
  );
};

// ============ CARD ============

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

// ============ SIGNAL CLUSTERS CHART ============

const SignalClustersChart: React.FC<{ clusters: SignalCluster[] }> = ({ clusters }) => {
  if (clusters.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-white/30 text-[12px]">
        No signal clusters detected
      </div>
    );
  }

  const chartData = clusters.slice(0, 8).map(c => ({
    name: c.category.replace(/_/g, ' '),
    signals: c.signals.length,
    weight: c.totalWeight,
    visitors: c.visitorCount,
    color: CATEGORY_COLORS[c.category] || '#6b7280'
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 90, right: 20 }}>
          <XAxis type="number" stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="rgba(255,255,255,0.15)"
            fontSize={10}
            width={90}
            tickLine={false}
            axisLine={false}
            className="capitalize"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '11px'
            }}
            formatter={(value: number, name: string) => [value, name === 'signals' ? 'Signals' : 'Weight']}
          />
          <Bar dataKey="signals" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============ SOURCE OF WEALTH CHART ============

const SourceOfWealthChart: React.FC<{ sources: SourceOfWealth[] }> = ({ sources }) => {
  if (sources.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-white/30 text-[12px]">
        No source data available
      </div>
    );
  }

  return (
    <div className="h-64 flex items-center">
      <ResponsiveContainer width="50%" height="100%">
        <PieChart>
          <Pie
            data={sources}
            dataKey="count"
            nameKey="source"
            cx="50%"
            cy="50%"
            outerRadius={75}
            innerRadius={45}
            strokeWidth={0}
          >
            {sources.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '11px'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {sources.map((source, idx) => (
          <div key={idx} className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: source.color }} />
              <span className="text-white/60 capitalize">{source.source}</span>
            </div>
            <div className="text-right">
              <span className="text-white tabular-nums">{source.count}</span>
              <span className="text-white/30 ml-1 tabular-nums">({source.percentage.toFixed(1)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ TIER PROGRESSION CHART ============

const TierProgressionChart: React.FC<{
  data: { date: string; counts: Record<WealthTier, number> }[];
}> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-white/30 text-[12px]">
        No progression data available
      </div>
    );
  }

  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    HNWI: d.counts.hnwi || 0,
    VHNWI: d.counts.vhnwi || 0,
    UHNWI: d.counts.uhnwi || 0,
    Billionaire: d.counts.billionaire || 0
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="date" stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '11px'
            }}
          />
          <Legend wrapperStyle={{ fontSize: '10px' }} />
          <Line type="monotone" dataKey="HNWI" stroke={TIER_COLORS.hnwi} strokeWidth={2} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="VHNWI" stroke={TIER_COLORS.vhnwi} strokeWidth={2} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="UHNWI" stroke={TIER_COLORS.uhnwi} strokeWidth={2} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="Billionaire" stroke={TIER_COLORS.billionaire} strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============ SOPHISTICATION MATRIX ============

const SophisticationMatrix: React.FC<{
  matrix: EnhancedDashboardData['wealth']['sophisticationMatrix'];
}> = ({ matrix }) => {
  const categories = ['Financial Literacy', 'Service Expectation'];
  const levels = ['Basic', 'Intermediate', 'Advanced', 'Expert'];
  const maxValue = Math.max(...matrix.map(m => m.value)) || 1;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-5 gap-2 text-[10px] text-white/30">
        <div />
        {levels.map(level => (
          <div key={level} className="text-center">{level}</div>
        ))}
      </div>

      {/* Rows */}
      {categories.map(category => (
        <div key={category} className="grid grid-cols-5 gap-2 items-center">
          <div className="text-[11px] text-white/40 truncate">{category}</div>
          {levels.map(level => {
            const cell = matrix.find(m => m.x === category && m.y === level);
            const value = cell?.value || 0;
            const intensity = value / maxValue;

            return (
              <div
                key={level}
                className="aspect-square rounded-lg flex items-center justify-center text-[11px] font-medium transition-colors cursor-pointer hover:ring-1 hover:ring-white/20"
                style={{
                  backgroundColor: `rgba(139, 92, 246, ${intensity * 0.6 + 0.05})`,
                  color: intensity > 0.4 ? '#fff' : 'rgba(255,255,255,0.4)'
                }}
                title={`${category} - ${level}: ${value} visitors`}
              >
                {value}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ============ STEALTH WEALTH LIST ============

const StealthWealthList: React.FC<{ indicators: StealthWealthIndicator[] }> = ({ indicators }) => {
  if (indicators.length === 0) {
    return (
      <div className="text-center py-8">
        <Eye size={48} className="mx-auto text-white/20 mb-4" />
        <p className="text-white/50 text-[13px]">No stealth wealth patterns detected</p>
        <p className="text-white/30 text-[12px]">These are high-value prospects who don't overtly display wealth</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {indicators.slice(0, 6).map((indicator, idx) => (
        <motion.div
          key={indicator.visitorId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="bg-white/[0.03] rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] text-white/70">{indicator.visitorId.slice(0, 16)}...</span>
            <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-[10px] rounded-full capitalize">
              {indicator.estimatedTier.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="space-y-2">
            {indicator.indicators.slice(0, 3).map((ind, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <Eye size={10} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white/60 capitalize">{ind.type.replace(/_/g, ' ')}</span>
                  <p className="text-white/30">{ind.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
            <span className="text-white/30">Stealth Score</span>
            <span className="text-cyan-400 font-medium tabular-nums">{indicator.totalScore}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default WealthTab;
