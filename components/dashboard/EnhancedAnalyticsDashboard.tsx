// ============================================
// ISLE AI - ENHANCED ANALYTICS DASHBOARD
// OpenAI-inspired design: minimal, elegant, luxurious
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  MousePointerClick,
  MessageSquare,
  Gem,
  Target,
  Activity,
  X,
  RefreshCw,
  Download,
  ChevronDown,
  FileJson,
  FileSpreadsheet,
  TrendingUp,
  Zap
} from 'lucide-react';
import { OverviewTab } from './tabs/OverviewTab';
import { VisitorsTab } from './tabs/VisitorsTab';
import { ClicksTab } from './tabs/ClicksTab';
import { ConversationsTab } from './tabs/ConversationsTab';
import { WealthTab } from './tabs/WealthTab';
import { LeadsTab } from './tabs/LeadsTab';
import { ActivityTab } from './tabs/ActivityTab';
import { EnhancedDashboardData } from '../../types/analytics';
import { computeEnhancedDashboardData } from '../../services/analyticsAggregator';
import { exportAllData, exportProfilesCSV } from '../../services/conversationLogger';
import {
  subscribeToAnalytics,
  unsubscribeFromAnalytics,
  getUnreadAlertCount
} from '../../services/realTimeAnalytics';

// ============ TYPES ============

interface EnhancedAnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'overview' | 'visitors' | 'clicks' | 'conversations' | 'wealth' | 'leads' | 'activity';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

// ============ TAB CONFIGURATION ============

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'visitors', label: 'Visitors', icon: <Users size={18} /> },
  { id: 'clicks', label: 'Click Intelligence', icon: <MousePointerClick size={18} /> },
  { id: 'conversations', label: 'Conversations', icon: <MessageSquare size={18} /> },
  { id: 'wealth', label: 'Wealth Signals', icon: <Gem size={18} /> },
  { id: 'leads', label: 'Hot Leads', icon: <Target size={18} /> },
  { id: 'activity', label: 'Live Activity', icon: <Activity size={18} /> }
];

// ============ MAIN COMPONENT ============

export const EnhancedAnalyticsDashboard: React.FC<EnhancedAnalyticsDashboardProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [dashboardData, setDashboardData] = useState<EnhancedDashboardData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = computeEnhancedDashboardData();
      setDashboardData(data);
      setLastUpdated(new Date());
      setUnreadAlerts(getUnreadAlertCount());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setIsRefreshing(false);
  }, []);

  // Initial load and real-time subscription
  useEffect(() => {
    if (isOpen) {
      fetchData();

      const subscriptionId = subscribeToAnalytics(
        ['new_interaction', 'new_session', 'hot_lead_alert', 'tier_change', 'signal_detected'],
        (event) => {
          if (['hot_lead_alert', 'tier_change'].includes(event.type)) {
            fetchData();
          }
          if (event.type === 'hot_lead_alert') {
            setUnreadAlerts(prev => prev + 1);
          }
        }
      );

      const interval = setInterval(fetchData, 30000);

      return () => {
        unsubscribeFromAnalytics(subscriptionId);
        clearInterval(interval);
      };
    }
  }, [isOpen, fetchData]);

  // Export handlers
  const handleExportJSON = () => {
    const data = exportAllData();
    const fullExport = {
      ...data,
      interactions: dashboardData?.heatmap || null,
      visitors: dashboardData?.visitors || [],
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(fullExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `isle-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
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
    setShowExportMenu(false);
  };

  const tabsWithBadges = TABS.map(tab => ({
    ...tab,
    badge: tab.id === 'leads' ? unreadAlerts : undefined
  }));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#0a0a0a]"
      >
        <div className="w-full h-full flex flex-col">
          {/* ============ HEADER ============ */}
          <header className="flex-shrink-0 border-b border-white/[0.08] bg-[#0a0a0a]">
            <div className="px-8 py-5">
              <div className="flex items-center justify-between">
                {/* Logo & Title */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                    <TrendingUp size={20} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-[15px] font-semibold text-white tracking-tight">
                      Wealth Intelligence
                    </h1>
                    <p className="text-[13px] text-white/40 mt-0.5">
                      Real-time HNWI Analytics
                    </p>
                  </div>
                </div>

                {/* Live Stats */}
                {dashboardData && (
                  <div className="flex items-center gap-8">
                    <LiveStat label="Active" value={dashboardData.live.activeSessions} dot="emerald" />
                    <LiveStat label="Hot Leads" value={dashboardData.live.hotLeadsToday} dot="rose" />
                    <LiveStat label="Qualified" value={dashboardData.live.qualifiedLeadsToday} dot="amber" />
                    <LiveStat label="Interactions" value={dashboardData.live.totalInteractionsToday} dot="cyan" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {/* Live Indicator */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[12px] font-medium text-emerald-400">Live</span>
                  </div>

                  {/* Refresh */}
                  <button
                    onClick={fetchData}
                    disabled={isRefreshing}
                    className="p-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/60 hover:text-white transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                  </button>

                  {/* Export */}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/80 text-[13px] font-medium transition-all"
                    >
                      <Download size={15} />
                      Export
                      <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showExportMenu && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute right-0 mt-2 w-52 bg-[#1a1a1a] rounded-xl border border-white/[0.08] shadow-2xl z-20 overflow-hidden"
                          >
                            <div className="p-1">
                              <button
                                onClick={handleExportJSON}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-white/70 hover:bg-white/[0.05] hover:text-white transition-all"
                              >
                                <FileJson size={15} className="text-violet-400" />
                                Full Export (JSON)
                              </button>
                              <button
                                onClick={handleExportCSV}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-white/70 hover:bg-white/[0.05] hover:text-white transition-all"
                              >
                                <FileSpreadsheet size={15} className="text-emerald-400" />
                                Leads Export (CSV)
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Close */}
                  <button
                    onClick={onClose}
                    className="p-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/60 hover:text-white transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* ============ TAB NAVIGATION ============ */}
            <div className="px-8">
              <nav className="flex items-center gap-1">
                {tabsWithBadges.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-all rounded-t-lg ${
                      activeTab === tab.id
                        ? 'text-white bg-white/[0.05]'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                        {tab.badge > 9 ? '9+' : tab.badge}
                      </span>
                    )}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-cyan-400"
                      />
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </header>

          {/* ============ CONTENT ============ */}
          <main className="flex-1 min-h-0 overflow-y-auto bg-[#0a0a0a]">
            {dashboardData ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="p-8"
                >
                  {activeTab === 'overview' && <OverviewTab data={dashboardData} />}
                  {activeTab === 'visitors' && <VisitorsTab data={dashboardData} />}
                  {activeTab === 'clicks' && <ClicksTab data={dashboardData} />}
                  {activeTab === 'conversations' && <ConversationsTab data={dashboardData} />}
                  {activeTab === 'wealth' && <WealthTab data={dashboardData} />}
                  {activeTab === 'leads' && <LeadsTab data={dashboardData} onRefresh={fetchData} />}
                  {activeTab === 'activity' && <ActivityTab data={dashboardData} />}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-3 text-white/40">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  <span className="text-[13px]">Loading analytics...</span>
                </div>
              </div>
            )}
          </main>

          {/* ============ FOOTER ============ */}
          <footer className="flex-shrink-0 border-t border-white/[0.06] bg-[#0a0a0a] px-8 py-3">
            <div className="flex items-center justify-between text-[12px] text-white/30">
              <div className="flex items-center gap-6">
                <span>Visitors: <span className="text-white/60">{dashboardData?.visitors.length || 0}</span></span>
                <span>Interactions: <span className="text-white/60">{dashboardData?.heatmap.geographic.reduce((sum, p) => sum + p.clickCount, 0) || 0}</span></span>
                {lastUpdated && (
                  <span>Updated: <span className="text-white/60">{formatTime(lastUpdated)}</span></span>
                )}
              </div>
              <span className="flex items-center gap-2">
                <Zap size={12} className="text-emerald-400" />
                Isle AI Intelligence Platform
              </span>
            </div>
          </footer>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============ LIVE STAT ============

const LiveStat: React.FC<{
  label: string;
  value: number;
  dot: 'emerald' | 'rose' | 'amber' | 'cyan';
}> = ({ label, value, dot }) => {
  const dotColors = {
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
    amber: 'bg-amber-400',
    cyan: 'bg-cyan-400'
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[dot]}`} />
      <span className="text-[22px] font-semibold text-white tabular-nums">{value}</span>
      <span className="text-[12px] text-white/40">{label}</span>
    </div>
  );
};

// ============ HELPERS ============

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default EnhancedAnalyticsDashboard;
