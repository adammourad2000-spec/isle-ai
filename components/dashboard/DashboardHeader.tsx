// ============================================
// ISLE AI - DASHBOARD HEADER
// Title, export buttons, refresh, close
// ============================================

import React, { useState } from 'react';
import {
  TrendingUp,
  RefreshCw,
  Download,
  X,
  FileJson,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedDashboardData } from '../../types/analytics';
import { exportAllData, exportProfilesCSV } from '../../services/conversationLogger';

// ============ TYPES ============

interface DashboardHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onClose: () => void;
  dashboardData: EnhancedDashboardData | null;
}

// ============ HELPERS ============

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

// ============ COMPONENT ============

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onRefresh,
  isRefreshing,
  lastUpdated,
  onClose,
  dashboardData
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Export handlers
  const handleExportJSON = () => {
    const data = exportAllData();
    // Add interactions and heatmap data
    const fullExport = {
      ...data,
      interactions: dashboardData?.heatmap || null,
      visitors: dashboardData?.visitors || [],
      activityFeed: dashboardData?.activityFeed || []
    };
    const blob = new Blob([JSON.stringify(fullExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `isle-analytics-full-${new Date().toISOString().split('T')[0]}.json`;
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

  const handleExportInteractions = () => {
    if (!dashboardData) return;

    // Create CSV for interactions
    const headers = ['Timestamp', 'Event Type', 'Place Name', 'Category', 'Source', 'Visitor ID', 'Session ID'];
    const rows = dashboardData.heatmap.topPlaces.map(place => [
      new Date().toISOString(),
      'aggregated',
      place.placeName,
      place.category,
      '-',
      '-',
      `${place.totalClicks} clicks`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `isle-interactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  return (
    <div className="bg-gradient-to-r from-purple-900/50 via-indigo-900/50 to-rose-900/50 border-b border-slate-700/50 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Title */}
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-purple-400" />
            Wealth Intelligence Dashboard
          </h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Real-time HNWI/UHNWI Lead Analytics & Interaction Tracking
            {lastUpdated && (
              <span className="ml-2 text-zinc-500">
                Updated {getRelativeTime(lastUpdated)}
              </span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              <Download size={16} />
              Export
              <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-lg border border-slate-700 shadow-xl z-20 overflow-hidden"
                  >
                    <div className="py-1">
                      <button
                        onClick={handleExportJSON}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        <FileJson size={16} className="text-purple-400" />
                        <div className="text-left">
                          <div className="font-medium">Full Export (JSON)</div>
                          <div className="text-xs text-zinc-500">All data with analytics</div>
                        </div>
                      </button>
                      <button
                        onClick={handleExportCSV}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        <FileSpreadsheet size={16} className="text-emerald-400" />
                        <div className="text-left">
                          <div className="font-medium">Leads Export (CSV)</div>
                          <div className="text-xs text-zinc-500">Wealth profiles for CRM</div>
                        </div>
                      </button>
                      <button
                        onClick={handleExportInteractions}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        <FileSpreadsheet size={16} className="text-cyan-400" />
                        <div className="text-left">
                          <div className="font-medium">Interactions (CSV)</div>
                          <div className="text-xs text-zinc-500">Click and engagement data</div>
                        </div>
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
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white transition-colors"
            title="Close dashboard"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Live Stats Bar */}
      {dashboardData && (
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/10">
          <LiveStat
            label="Active Sessions"
            value={dashboardData.live.activeSessions}
            color="text-blue-400"
          />
          <LiveStat
            label="Hot Leads Today"
            value={dashboardData.live.hotLeadsToday}
            color="text-rose-400"
          />
          <LiveStat
            label="Qualified"
            value={dashboardData.live.qualifiedLeadsToday}
            color="text-emerald-400"
          />
          <LiveStat
            label="Interactions Today"
            value={dashboardData.live.totalInteractionsToday}
            color="text-cyan-400"
          />
          <LiveStat
            label="New Visitors"
            value={dashboardData.live.newVisitorsToday}
            color="text-violet-400"
          />
          <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-zinc-500">Live</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ LIVE STAT COMPONENT ============

const LiveStat: React.FC<{
  label: string;
  value: number;
  color: string;
}> = ({ label, value, color }) => (
  <div className="flex items-center gap-2">
    <span className={`text-lg font-bold ${color}`}>{value}</span>
    <span className="text-xs text-zinc-500">{label}</span>
  </div>
);

export default DashboardHeader;
