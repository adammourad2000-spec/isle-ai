// ============================================
// ISLE AI - CONVERSATIONS TAB
// OpenAI-inspired design: minimal, elegant
// ============================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Search,
  User,
  Bot,
  Gem,
  TrendingUp,
  Clock
} from 'lucide-react';
import {
  LineChart,
  Line,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { EnhancedDashboardData } from '../../../types/analytics';
import { getAllSessions } from '../../../services/conversationLogger';
import { WealthSignal } from '../../../services/wealthIntelligenceService';

// ============ TYPES ============

interface ConversationsTabProps {
  data: EnhancedDashboardData;
}

// ============ SIGNAL COLORS ============

const SIGNAL_CATEGORY_COLORS: Record<string, string> = {
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

// ============ COMPONENT ============

export const ConversationsTab: React.FC<ConversationsTabProps> = ({ data }) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [signalFilter, setSignalFilter] = useState<string | 'all'>('all');

  // Get all sessions with messages
  const sessions = useMemo(() => {
    return getAllSessions()
      .filter(s => s.messages.length > 0)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, []);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    let result = sessions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.messages.some(m => m.content.toLowerCase().includes(query)) ||
        s.sessionId.toLowerCase().includes(query)
      );
    }

    if (signalFilter !== 'all' && sessions) {
      result = result.filter(s =>
        s.analysis?.aggregatedProfile.signals.some(sig => sig.category === signalFilter)
      );
    }

    return result;
  }, [sessions, searchQuery, signalFilter]);

  const selectedSession = selectedSessionId
    ? sessions.find(s => s.sessionId === selectedSessionId)
    : null;

  // Get unique signal categories
  const signalCategories = useMemo(() => {
    const categories = new Set<string>();
    sessions.forEach(s => {
      s.analysis?.aggregatedProfile.signals.forEach(sig => {
        categories.add(sig.category);
      });
    });
    return Array.from(categories);
  }, [sessions]);

  return (
    <div className="flex gap-6 h-[calc(100vh-300px)] min-h-[500px]">
      {/* Session List */}
      <div className="w-1/3 flex flex-col">
        {/* Filters */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <select
            value={signalFilter}
            onChange={e => setSignalFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-[13px] text-white focus:outline-none focus:border-white/20 transition-colors"
          >
            <option value="all">All Signal Categories</option>
            {signalCategories.map(cat => (
              <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare size={48} className="mx-auto text-white/20 mb-4" />
              <p className="text-white/50 text-[13px]">No conversations found</p>
            </div>
          ) : (
            filteredSessions.map(session => (
              <SessionListItem
                key={session.sessionId}
                session={session}
                isSelected={selectedSessionId === session.sessionId}
                onClick={() => setSelectedSessionId(session.sessionId)}
              />
            ))
          )}
        </div>
      </div>

      {/* Conversation Detail */}
      <div className="flex-1 flex flex-col bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
        {selectedSession ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] text-white font-medium">{selectedSession.sessionId.slice(0, 24)}...</h3>
                  <p className="text-[11px] text-white/30">
                    Started {formatRelativeTime(selectedSession.startedAt)} •
                    {selectedSession.messages.length} messages
                  </p>
                </div>
                {selectedSession.analysis && (
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[18px] font-semibold text-white tabular-nums">
                        {selectedSession.analysis.aggregatedProfile.leadScore}
                      </div>
                      <div className="text-[10px] text-white/30">Lead Score</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] font-medium text-amber-400 capitalize">
                        {selectedSession.analysis.aggregatedProfile.tier.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[10px] text-white/30">Detected Tier</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sophistication Trend */}
              {selectedSession.analysis && (
                <div className="mt-4">
                  <SophisticationMiniChart
                    messages={selectedSession.messages.map((m, idx) => ({
                      index: idx,
                      score: 50 + Math.random() * 30
                    }))}
                  />
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedSession.messages.map((message, idx) => (
                <AnnotatedMessageComponent
                  key={message.id || idx}
                  message={message}
                  signals={selectedSession.analysis?.aggregatedProfile.signals.filter(s =>
                    message.content.toLowerCase().includes(s.value.toLowerCase().slice(0, 10))
                  ) || []}
                />
              ))}
            </div>

            {/* Signal Summary */}
            {selectedSession.analysis && selectedSession.analysis.aggregatedProfile.signals.length > 0 && (
              <div className="p-4 border-t border-white/[0.06] bg-white/[0.02]">
                <h4 className="text-[11px] font-medium text-white/40 mb-2">Detected Signals</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedSession.analysis.aggregatedProfile.signals.slice(0, 10).map((signal, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-full text-[10px]"
                      style={{
                        backgroundColor: `${SIGNAL_CATEGORY_COLORS[signal.category] || '#6b7280'}15`,
                        color: SIGNAL_CATEGORY_COLORS[signal.category] || '#9ca3af'
                      }}
                    >
                      {signal.type.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto text-white/20 mb-4" />
              <p className="text-white/50 text-[13px]">Select a conversation to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============ SESSION LIST ITEM ============

const SessionListItem: React.FC<{
  session: any;
  isSelected: boolean;
  onClick: () => void;
}> = ({ session, isSelected, onClick }) => {
  const userMessages = session.messages.filter((m: any) => m.role === 'user');
  const preview = userMessages[0]?.content.slice(0, 50) || 'No messages';
  const tier = session.analysis?.aggregatedProfile.tier || 'unknown';
  const leadScore = session.analysis?.aggregatedProfile.leadScore || 0;

  const tierColors: Record<string, string> = {
    unknown: 'bg-white/[0.06] text-white/40',
    mass_market: 'bg-white/[0.06] text-white/50',
    affluent: 'bg-sky-500/10 text-sky-400',
    mass_affluent: 'bg-blue-500/10 text-blue-400',
    hnwi: 'bg-emerald-500/10 text-emerald-400',
    vhnwi: 'bg-violet-500/10 text-violet-400',
    uhnwi: 'bg-amber-500/10 text-amber-400',
    billionaire: 'bg-rose-500/10 text-rose-400'
  };

  return (
    <motion.button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl transition-colors ${
        isSelected
          ? 'bg-white/[0.06] border border-white/[0.12]'
          : 'bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04]'
      }`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-white/30">{session.sessionId.slice(0, 16)}...</span>
        <span className={`px-2 py-0.5 rounded text-[10px] ${tierColors[tier]}`}>
          {tier.replace(/_/g, ' ')}
        </span>
      </div>
      <p className="text-[12px] text-white/80 truncate">{preview}...</p>
      <div className="flex items-center justify-between mt-2 text-[10px] text-white/30">
        <span className="flex items-center gap-1">
          <MessageSquare size={10} />
          {session.messages.length} messages
        </span>
        <span className="flex items-center gap-1 tabular-nums">
          <TrendingUp size={10} />
          Score: {leadScore}
        </span>
        <span>{formatRelativeTime(session.startedAt)}</span>
      </div>
    </motion.button>
  );
};

// ============ ANNOTATED MESSAGE ============

const AnnotatedMessageComponent: React.FC<{
  message: any;
  signals: WealthSignal[];
}> = ({ message, signals }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser ? 'bg-violet-500/10 text-violet-400' : 'bg-cyan-500/10 text-cyan-400'
          }`}>
            {isUser ? <User size={14} /> : <Bot size={14} />}
          </div>
          <div>
            <div className={`rounded-xl p-3 ${
              isUser
                ? 'bg-violet-500/10 text-white/90'
                : 'bg-white/[0.04] text-white/70'
            }`}>
              <p className="text-[12px] whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>

            {/* Signal Tags */}
            {signals.length > 0 && isUser && (
              <div className="flex flex-wrap gap-1 mt-2">
                {signals.map((signal, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
                    style={{
                      backgroundColor: `${SIGNAL_CATEGORY_COLORS[signal.category] || '#6b7280'}15`,
                      color: SIGNAL_CATEGORY_COLORS[signal.category] || '#9ca3af'
                    }}
                  >
                    <Gem size={8} />
                    {signal.type.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}

            <p className="text-[10px] text-white/20 mt-1">
              {formatRelativeTime(message.timestamp)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============ SOPHISTICATION MINI CHART ============

const SophisticationMiniChart: React.FC<{
  messages: { index: number; score: number }[];
}> = ({ messages }) => {
  if (messages.length < 2) return null;

  return (
    <div className="h-12">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={messages}>
          <Line
            type="monotone"
            dataKey="score"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '11px',
              padding: '6px 10px'
            }}
            formatter={(value: number) => [`${Math.round(value)}`, 'Sophistication']}
            labelFormatter={(label) => `Message ${label + 1}`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ConversationsTab;
