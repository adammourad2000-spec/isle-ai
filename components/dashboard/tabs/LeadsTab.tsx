// ============================================
// ISLE AI - LEADS TAB
// OpenAI-inspired design: minimal, elegant
// ============================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Bell,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Calendar,
  Flag,
  Users,
  ChevronRight,
  X,
  Play,
  Pause
} from 'lucide-react';
import { EnhancedDashboardData, HotLeadAlert, LeadActionItem, LeadScoreBreakdown } from '../../../types/analytics';
import { WealthTier } from '../../../services/wealthIntelligenceService';
import { analyticsStore } from '../../../services/analyticsStore';

// ============ TYPES ============

interface LeadsTabProps {
  data: EnhancedDashboardData;
  onRefresh: () => void;
}

// ============ COLORS ============

const TIER_COLORS: Record<WealthTier, { text: string; bg: string }> = {
  unknown: { text: 'text-white/40', bg: 'bg-white/[0.06]' },
  mass_market: { text: 'text-white/50', bg: 'bg-white/[0.06]' },
  affluent: { text: 'text-sky-400', bg: 'bg-sky-500/10' },
  mass_affluent: { text: 'text-blue-400', bg: 'bg-blue-500/10' },
  hnwi: { text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  vhnwi: { text: 'text-violet-400', bg: 'bg-violet-500/10' },
  uhnwi: { text: 'text-amber-400', bg: 'bg-amber-500/10' },
  billionaire: { text: 'text-rose-400', bg: 'bg-rose-500/10' }
};

const PRIORITY_CONFIG = {
  urgent: { text: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Urgent' },
  high: { text: 'text-amber-400', bg: 'bg-amber-500/10', label: 'High' },
  medium: { text: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Medium' },
  low: { text: 'text-white/40', bg: 'bg-white/[0.06]', label: 'Low' }
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

// ============ COMPONENT ============

export const LeadsTab: React.FC<LeadsTabProps> = ({ data, onRefresh }) => {
  const [selectedAlert, setSelectedAlert] = useState<HotLeadAlert | null>(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<LeadActionItem['status'] | 'all'>('all');

  const { alerts, actionQueue, scoreBreakdowns } = data.leads;

  const filteredActions = actionFilter === 'all'
    ? actionQueue
    : actionQueue.filter(a => a.status === actionFilter);

  const handleMarkAlertRead = (alertId: string) => {
    analyticsStore.markAlertAsRead(alertId);
    onRefresh();
  };

  const handleUpdateActionStatus = (itemId: string, status: LeadActionItem['status']) => {
    analyticsStore.updateActionStatus(itemId, status);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<Bell size={18} />}
          label="Unread Alerts"
          value={alerts.filter(a => !a.isRead).length}
          color="rose"
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Pending Actions"
          value={actionQueue.filter(a => a.status === 'pending').length}
          color="amber"
        />
        <StatCard
          icon={<Play size={18} />}
          label="In Progress"
          value={actionQueue.filter(a => a.status === 'in_progress').length}
          color="blue"
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Completed Today"
          value={actionQueue.filter(a => a.status === 'completed' && a.completedAt && new Date(a.completedAt).toDateString() === new Date().toDateString()).length}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Hot Lead Alerts */}
        <div className="col-span-2">
          <Card
            title="Hot Lead Alerts"
            icon={<Target size={14} />}
            iconColor="text-rose-400"
            badge={alerts.filter(a => !a.isRead).length > 0 ? alerts.filter(a => !a.isRead).length : undefined}
          >
            {alerts.length === 0 ? (
              <div className="text-center py-12">
                <Target size={48} className="mx-auto text-white/20 mb-4" />
                <p className="text-white/50 text-[13px]">No hot lead alerts</p>
                <p className="text-white/30 text-[12px]">Alerts appear when high-value prospects are detected</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {alerts.map(alert => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onMarkRead={() => handleMarkAlertRead(alert.id)}
                    onSelect={() => setSelectedAlert(alert)}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Lead Score Breakdowns */}
        <Card title="Score Breakdowns" icon={<Target size={14} />} iconColor="text-violet-400">
          {scoreBreakdowns.length === 0 ? (
            <div className="text-center py-8">
              <Target size={32} className="mx-auto text-white/20 mb-3" />
              <p className="text-white/30 text-[12px]">No breakdowns available</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {scoreBreakdowns.slice(0, 10).map(breakdown => (
                <ScoreBreakdownCard
                  key={breakdown.visitorId}
                  breakdown={breakdown}
                  isExpanded={selectedBreakdown === breakdown.visitorId}
                  onToggle={() => setSelectedBreakdown(
                    selectedBreakdown === breakdown.visitorId ? null : breakdown.visitorId
                  )}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Action Queue */}
      <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-medium text-white flex items-center gap-2">
            <span className="text-emerald-400"><CheckCircle2 size={14} /></span>
            Action Queue
          </h3>

          {/* Filter */}
          <div className="flex items-center gap-1">
            {(['all', 'pending', 'in_progress', 'completed'] as const).map(status => (
              <button
                key={status}
                onClick={() => setActionFilter(status)}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                  actionFilter === status
                    ? 'bg-white/[0.08] text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {filteredActions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/50 text-[13px]">No actions in queue</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredActions.map(action => (
              <ActionQueueItem
                key={action.id}
                action={action}
                onUpdateStatus={handleUpdateActionStatus}
              />
            ))}
          </div>
        )}
      </div>

      {/* Alert Detail Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <AlertDetailModal
            alert={selectedAlert}
            onClose={() => setSelectedAlert(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============ STAT CARD ============

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'rose' | 'amber' | 'blue' | 'emerald';
}> = ({ icon, label, value, color }) => {
  const colors = {
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
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
  badge?: number;
  children: React.ReactNode;
}> = ({ title, icon, iconColor, badge, children }) => (
  <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
    <h3 className="text-[13px] font-medium text-white mb-4 flex items-center gap-2">
      <span className={iconColor}>{icon}</span>
      {title}
      {badge !== undefined && badge > 0 && (
        <span className="ml-2 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] rounded-full tabular-nums">
          {badge} new
        </span>
      )}
    </h3>
    {children}
  </div>
);

// ============ ALERT CARD ============

const AlertCard: React.FC<{
  alert: HotLeadAlert;
  onMarkRead: () => void;
  onSelect: () => void;
}> = ({ alert, onMarkRead, onSelect }) => {
  const tierColors = TIER_COLORS[alert.tier];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-xl border transition-colors cursor-pointer ${
        alert.isRead
          ? 'bg-white/[0.02] border-white/[0.06]'
          : 'bg-rose-500/5 border-rose-500/20'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {!alert.isRead && (
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] ${tierColors.bg} ${tierColors.text}`}>
                {alert.tier.replace(/_/g, ' ').toUpperCase()}
              </span>
              <span className="text-[13px] text-white font-medium tabular-nums">Score: {alert.leadScore}</span>
            </div>
            <p className="text-[12px] text-white/40 mt-1">{alert.triggerReason}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">{formatRelativeTime(alert.timestamp)}</span>
          {!alert.isRead && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
              className="p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-[11px] text-white/30">
        <span>Est. Worth: {formatCurrency(alert.estimatedWorth.min)} - {formatCurrency(alert.estimatedWorth.max)}</span>
        <span>•</span>
        <span>{alert.recommendedActions.length} recommended actions</span>
      </div>
    </motion.div>
  );
};

// ============ SCORE BREAKDOWN CARD ============

const ScoreBreakdownCard: React.FC<{
  breakdown: LeadScoreBreakdown;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ breakdown, isExpanded, onToggle }) => {
  return (
    <div className="bg-white/[0.03] rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-white/70">{breakdown.visitorId.slice(0, 12)}...</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[16px] font-semibold text-white tabular-nums">{breakdown.totalScore}</span>
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
            <ChevronRight size={14} className="text-white/30" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-3"
          >
            <div className="space-y-2">
              {breakdown.components.map((comp, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/40">{comp.category}</span>
                    <span className="text-white tabular-nums">{comp.score}/{comp.maxScore}</span>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500"
                      style={{ width: `${(comp.score / comp.maxScore) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============ ACTION QUEUE ITEM ============

const ActionQueueItem: React.FC<{
  action: LeadActionItem;
  onUpdateStatus: (id: string, status: LeadActionItem['status']) => void;
}> = ({ action, onUpdateStatus }) => {
  const priorityConfig = PRIORITY_CONFIG[action.priority];

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone size={12} />;
      case 'email': return <Mail size={12} />;
      case 'schedule_meeting': return <Calendar size={12} />;
      case 'flag_vip': return <Flag size={12} />;
      case 'connect_partner': return <Users size={12} />;
      default: return <CheckCircle2 size={12} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between p-3 rounded-lg border ${
        action.status === 'completed'
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : action.status === 'in_progress'
          ? 'bg-blue-500/5 border-blue-500/20'
          : 'bg-white/[0.02] border-white/[0.06]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${priorityConfig.bg} ${priorityConfig.text}`}>
          {getActionIcon(action.actionType)}
        </div>
        <div>
          <p className="text-[12px] text-white/80">{action.description}</p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-white/30">
            <span className={priorityConfig.text}>{priorityConfig.label}</span>
            <span>•</span>
            <span>{action.visitorId.slice(0, 12)}...</span>
            {action.dueBy && (
              <>
                <span>•</span>
                <span>Due: {new Date(action.dueBy).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {action.status === 'pending' && (
          <>
            <button
              onClick={() => onUpdateStatus(action.id, 'in_progress')}
              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
              title="Start"
            >
              <Play size={12} />
            </button>
            <button
              onClick={() => onUpdateStatus(action.id, 'dismissed')}
              className="p-1.5 rounded-lg bg-white/[0.06] text-white/40 hover:bg-white/[0.1] transition-colors"
              title="Dismiss"
            >
              <X size={12} />
            </button>
          </>
        )}
        {action.status === 'in_progress' && (
          <>
            <button
              onClick={() => onUpdateStatus(action.id, 'completed')}
              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              title="Complete"
            >
              <CheckCircle2 size={12} />
            </button>
            <button
              onClick={() => onUpdateStatus(action.id, 'pending')}
              className="p-1.5 rounded-lg bg-white/[0.06] text-white/40 hover:bg-white/[0.1] transition-colors"
              title="Pause"
            >
              <Pause size={12} />
            </button>
          </>
        )}
        {action.status === 'completed' && (
          <CheckCircle2 size={18} className="text-emerald-400" />
        )}
      </div>
    </motion.div>
  );
};

// ============ ALERT DETAIL MODAL ============

const AlertDetailModal: React.FC<{
  alert: HotLeadAlert;
  onClose: () => void;
}> = ({ alert, onClose }) => {
  const tierColors = TIER_COLORS[alert.tier];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="w-full max-w-lg bg-[#0a0a0a] rounded-xl border border-white/[0.08] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-[14px] font-medium text-white flex items-center gap-2">
            <Target className="text-rose-400" size={16} />
            Hot Lead Alert
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/[0.06] text-white/40 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-lg text-[12px] ${tierColors.bg} ${tierColors.text}`}>
              {alert.tier.replace(/_/g, ' ').toUpperCase()}
            </span>
            <span className="text-[24px] font-semibold text-white tabular-nums">{alert.leadScore}</span>
          </div>

          <div>
            <p className="text-[11px] text-white/40 mb-1">Trigger Reason</p>
            <p className="text-[13px] text-white/80">{alert.triggerReason}</p>
          </div>

          <div>
            <p className="text-[11px] text-white/40 mb-1">Estimated Worth</p>
            <p className="text-[13px] text-white/80">
              {formatCurrency(alert.estimatedWorth.min)} - {formatCurrency(alert.estimatedWorth.max)}
            </p>
          </div>

          <div>
            <p className="text-[11px] text-white/40 mb-2">Recommended Actions</p>
            <div className="space-y-2">
              {alert.recommendedActions.map((action, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[12px] text-white/70">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  {action}
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-white/30">
            Alert created {formatRelativeTime(alert.timestamp)}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LeadsTab;
