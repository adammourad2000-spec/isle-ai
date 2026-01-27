// ============================================
// ISLE AI - CHATBOT PANEL COMPONENT
// Mindtrip-inspired AI Travel Concierge Interface
// ============================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Briefcase,
  Heart,
  Bell,
  Compass,
  User,
  Info,
  Search,
  Plus,
  Mic,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Star,
  Clock,
  DollarSign,
  ExternalLink,
  Phone,
  Globe,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  Sparkles,
  Calendar,
  Users,
  Sliders,
  Map,
  Navigation,
  Bookmark,
  Share2,
  MoreHorizontal,
  Check,
  Loader2,
  Volume2,
  Upload,
  Trash2,
  Edit3,
  Copy
} from 'lucide-react';
import { ChatMessage, PlaceCard, Chat, ChatFilters, Trip, Collection, Guide, KnowledgeNode, PriceRange, MapMarker } from '../types/chatbot';
import { CAYMAN_CONFIG, CAYMAN_KNOWLEDGE_BASE, CAYMAN_GUIDES } from '../data/cayman-islands-knowledge';
import InteractiveMap from './InteractiveMap';
import { processQuery } from '../services/ragService';

// ============ TYPES ============

type SidebarTab = 'chat' | 'trips' | 'collections' | 'notifications' | 'inspiration' | 'profile' | 'info';
type ChatView = 'chat' | 'trips' | 'collections' | 'inspiration';

interface ChatbotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceSelect?: (place: KnowledgeNode) => void;
}

// ============ SIDEBAR NAVIGATION ============

const SidebarNav: React.FC<{
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  unreadNotifications?: number;
}> = ({ activeTab, onTabChange, unreadNotifications = 0 }) => {
  const tabs: { id: SidebarTab; icon: React.ReactNode; label: string }[] = [
    { id: 'chat', icon: <Sparkles size={20} />, label: 'AI Chat' },
    { id: 'trips', icon: <Briefcase size={20} />, label: 'Trips' },
    { id: 'collections', icon: <Heart size={20} />, label: 'Collections' },
    { id: 'notifications', icon: <Bell size={20} />, label: 'Notifications' },
    { id: 'inspiration', icon: <Compass size={20} />, label: 'Inspiration' },
  ];

  return (
    <div className="w-14 bg-zinc-900/80 border-r border-white/5 flex flex-col items-center py-4">
      {/* Logo */}
      <div className="mb-6">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
          <Sparkles size={18} className="text-white" />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex-1 flex flex-col gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-zinc-500 hover:text-white hover:bg-white/5'
            }`}
            title={tab.label}
          >
            {tab.icon}
            {tab.id === 'notifications' && unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                {unreadNotifications}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-2 mt-auto">
        <button
          onClick={() => onTabChange('profile')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            activeTab === 'profile' ? 'bg-teal-500/20 text-teal-400' : 'text-zinc-500 hover:text-white hover:bg-white/5'
          }`}
          title="Profile"
        >
          <User size={20} />
        </button>
        <button
          onClick={() => onTabChange('info')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            activeTab === 'info' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'
          }`}
          title="Info"
        >
          <Info size={20} />
        </button>
      </div>
    </div>
  );
};

// ============ CHAT FILTERS BAR ============

const ChatFiltersBar: React.FC<{
  filters: ChatFilters;
  onFiltersChange: (filters: ChatFilters) => void;
}> = ({ filters, onFiltersChange }) => {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-zinc-900/50">
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-sm text-zinc-300 transition-all">
        <MapPin size={14} />
        <span>{filters.destination || 'Where'}</span>
      </button>
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-sm text-zinc-300 transition-all">
        <Calendar size={14} />
        <span>When</span>
      </button>
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-sm text-zinc-300 transition-all">
        <Users size={14} />
        <span>{filters.travelers || 2}</span>
      </button>
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-sm text-zinc-300 transition-all">
        <DollarSign size={14} />
        <span>{filters.budget || 'Budget'}</span>
      </button>
      <div className="flex-1" />
      <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-sm text-white transition-all border border-white/10">
        <Briefcase size={14} />
        <span>Create a trip</span>
      </button>
    </div>
  );
};

// ============ PLACE CARD COMPONENT ============

const PlaceCardComponent: React.FC<{
  place: KnowledgeNode;
  onSelect?: (place: KnowledgeNode) => void;
  onSave?: (place: KnowledgeNode) => void;
  onAddToTrip?: (place: KnowledgeNode) => void;
  compact?: boolean;
}> = ({ place, onSelect, onSave, onAddToTrip, compact = false }) => {
  const [isSaved, setIsSaved] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hotel': return '🏨';
      case 'restaurant': return '🍽️';
      case 'beach': return '🏖️';
      case 'diving_snorkeling': return '🤿';
      case 'boat_charter': return '🛥️';
      case 'villa_rental': return '🏠';
      default: return '📍';
    }
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-all group"
        onClick={() => onSelect?.(place)}
      >
        <img
          src={place.media.thumbnail}
          alt={place.name}
          className="w-12 h-12 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span>{getCategoryIcon(place.category)}</span>
            <span className="font-medium text-white text-sm truncate">{place.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="flex items-center gap-0.5">
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
              {place.ratings.overall}
            </span>
            <span>•</span>
            <span>{place.location.district}</span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsSaved(!isSaved);
            onSave?.(place);
          }}
          className={`p-1.5 rounded-full transition-all ${
            isSaved ? 'text-red-400' : 'text-zinc-500 hover:text-white'
          }`}
        >
          <Heart size={14} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden bg-zinc-800/50 border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
      onClick={() => onSelect?.(place)}
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={place.media.thumbnail}
          alt={place.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Actions overlay */}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsSaved(!isSaved);
              onSave?.(place);
            }}
            className={`p-2 rounded-full backdrop-blur-sm transition-all ${
              isSaved ? 'bg-red-500/80 text-white' : 'bg-black/40 text-white hover:bg-black/60'
            }`}
          >
            <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToTrip?.(place);
            }}
            className="p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Category badge */}
        <div className="absolute bottom-2 left-2">
          <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs text-white">
            {getCategoryIcon(place.category)} {place.category.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h4 className="font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">
          {place.name}
        </h4>
        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
          <span className="flex items-center gap-0.5">
            <Star size={12} className="text-yellow-400 fill-yellow-400" />
            {place.ratings.overall}
          </span>
          <span>({place.ratings.reviewCount})</span>
          <span>•</span>
          <span>{place.business.priceRange}</span>
        </div>
        <p className="text-xs text-zinc-400 line-clamp-2">{place.shortDescription}</p>
        <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
          <MapPin size={12} />
          <span>{place.location.district}, {place.location.island}</span>
        </div>
      </div>
    </motion.div>
  );
};

// ============ CHAT MESSAGE COMPONENT ============

const ChatMessageComponent: React.FC<{
  message: ChatMessage;
  onPlaceSelect?: (place: KnowledgeNode) => void;
}> = ({ message, onPlaceSelect }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-teal-500' : 'bg-gradient-to-br from-cyan-400 to-teal-500'
      }`}>
        {isUser ? <User size={16} className="text-white" /> : <Sparkles size={16} className="text-white" />}
      </div>

      {/* Message content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-teal-600 text-white rounded-tr-md'
            : 'bg-zinc-800/80 text-zinc-100 rounded-tl-md'
        }`}>
          {/* Message text with markdown-like formatting */}
          <div className="text-sm whitespace-pre-wrap leading-relaxed prose prose-invert prose-sm max-w-none">
            {message.content.split('\n').map((line, i) => {
              // Handle headers
              if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={i} className="font-bold text-white mb-2">{line.slice(2, -2)}</p>;
              }
              // Handle bullet points
              if (line.startsWith('- ')) {
                return <li key={i} className="ml-4 text-zinc-300">{line.slice(2)}</li>;
              }
              // Handle numbered lists with emojis
              if (/^[🥇🥈🥉⭐🏆\d]/.test(line)) {
                return <p key={i} className="font-medium text-white mt-3 mb-1">{line}</p>;
              }
              return line ? <p key={i} className="mb-1">{line}</p> : <br key={i} />;
            })}
          </div>

          {/* Place cards if present */}
          {message.places && message.places.length > 0 && (
            <div className="mt-4 space-y-2">
              {message.places.map((place) => {
                const node = CAYMAN_KNOWLEDGE_BASE.find(n => n.id === place.nodeId);
                if (node) {
                  return (
                    <PlaceCardComponent
                      key={place.nodeId}
                      place={node}
                      onSelect={onPlaceSelect}
                      compact
                    />
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-zinc-500 mt-1 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* Suggested actions */}
        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.suggestedActions.map((action) => (
              <button
                key={action.id}
                className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs text-zinc-300 transition-all flex items-center gap-1.5"
              >
                {action.type === 'book' && <Calendar size={12} />}
                {action.type === 'directions' && <Navigation size={12} />}
                {action.type === 'website' && <Globe size={12} />}
                {action.type === 'call' && <Phone size={12} />}
                {action.type === 'save' && <Bookmark size={12} />}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============ CHAT INPUT COMPONENT ============

const ChatInput: React.FC<{
  onSend: (message: string, attachments?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
}> = ({ onSend, isLoading = false, placeholder = "Find your island vibe" }) => {
  const [message, setMessage] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative">
      {/* Attach menu */}
      <AnimatePresence>
        {showAttachMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 mb-2 p-2 rounded-xl bg-zinc-800 border border-white/10 shadow-xl"
          >
            <div className="space-y-1">
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/5 text-left transition-all">
                <Upload size={18} className="text-cyan-400" />
                <div>
                  <div className="text-sm font-medium text-white">Upload a file</div>
                  <div className="text-xs text-zinc-500">Start your journey with a photo or PDF</div>
                </div>
              </button>
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/5 text-left transition-all">
                <LinkIcon size={18} className="text-cyan-400" />
                <div>
                  <div className="text-sm font-medium text-white">Add a link</div>
                  <div className="text-xs text-zinc-500">Convert social posts into trip plans</div>
                </div>
              </button>
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/5 text-left transition-all">
                <FileText size={18} className="text-cyan-400" />
                <div>
                  <div className="text-sm font-medium text-white">Add a receipt</div>
                  <div className="text-xs text-zinc-500">Upload confirmation to get started</div>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input container */}
      <div className="flex items-end gap-2 p-3 rounded-2xl bg-zinc-800/80 border border-white/10 focus-within:border-cyan-500/50 transition-all">
        {/* Attach button */}
        <button
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          className={`p-2 rounded-xl transition-all ${
            showAttachMenu ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Plus size={20} />
        </button>

        {/* Text input */}
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent text-white placeholder-zinc-500 resize-none outline-none text-sm py-2 max-h-32"
          style={{ minHeight: '24px' }}
        />

        {/* Voice input button */}
        <button
          onClick={() => setIsRecording(!isRecording)}
          className={`p-2 rounded-xl transition-all ${
            isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Mic size={20} />
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          className={`p-2 rounded-xl transition-all ${
            message.trim() && !isLoading
              ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:opacity-90'
              : 'text-zinc-600 cursor-not-allowed'
          }`}
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-zinc-500">
        <Info size={10} />
        <span>{CAYMAN_CONFIG.branding.disclaimerText}</span>
      </div>
    </div>
  );
};

// ============ WELCOME MESSAGE ============

const WelcomeMessage: React.FC<{
  onPromptSelect: (prompt: string) => void;
}> = ({ onPromptSelect }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg"
      >
        <h1 className="text-3xl font-bold text-white mb-4">
          {CAYMAN_CONFIG.welcomeMessage.title}
        </h1>
        <p className="text-zinc-400 mb-8 flex items-start gap-2">
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles size={14} className="text-white" />
          </span>
          <span className="text-left">{CAYMAN_CONFIG.welcomeMessage.subtitle}</span>
        </p>

        {/* Suggested prompts */}
        <div className="flex flex-wrap justify-center gap-2">
          {CAYMAN_CONFIG.welcomeMessage.suggestedPrompts.slice(0, 4).map((prompt, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onPromptSelect(prompt)}
              className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-sm text-zinc-300 hover:text-white transition-all border border-white/5 hover:border-white/10"
            >
              {prompt}
            </motion.button>
          ))}
        </div>

        {/* Quick action */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 mx-auto"
        >
          <span>Help me get started?</span>
          <ChevronRight size={14} />
        </motion.button>
      </motion.div>
    </div>
  );
};

// ============ TRIPS VIEW ============

const TripsView: React.FC<{
  trips: Trip[];
  onCreateTrip: () => void;
}> = ({ trips, onCreateTrip }) => {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Your trips</h2>
        <button
          onClick={onCreateTrip}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-sm text-white transition-all border border-white/10"
        >
          <Plus size={16} />
          <span>New trip</span>
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input type="checkbox" className="rounded bg-zinc-800 border-white/10" />
          <span>Booked only</span>
        </label>
        <select className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white">
          <option>All</option>
          <option>Upcoming</option>
          <option>Past</option>
        </select>
      </div>

      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400/20 to-teal-500/20 flex items-center justify-center mb-6">
            <Briefcase size={40} className="text-cyan-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No trips yet? No problem.</h3>
          <p className="text-zinc-400 text-center max-w-sm mb-6">
            Create one now — access your plans from here anytime.
          </p>
          <button
            onClick={onCreateTrip}
            className="px-6 py-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-all"
          >
            Create a trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="p-4 rounded-xl bg-zinc-800/50 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
            >
              <h3 className="font-semibold text-white">{trip.title}</h3>
              <p className="text-sm text-zinc-400">{trip.destination.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============ COLLECTIONS VIEW ============

const CollectionsView: React.FC<{
  collections: Collection[];
  onCreateCollection: () => void;
}> = ({ collections, onCreateCollection }) => {
  const [activeTab, setActiveTab] = useState<'collections' | 'places' | 'guides'>('collections');

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Your collections</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mb-6 border-b border-white/5">
        {(['collections', 'places', 'guides'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition-all relative ${
              activeTab === tab ? 'text-white' : 'text-zinc-500 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-2 text-zinc-500">0</span>
            {activeTab === tab && (
              <motion.div
                layoutId="collectionsTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
              />
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400/20 to-teal-500/20 flex items-center justify-center mb-6">
          <Heart size={40} className="text-cyan-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No collections yet? Let's fix that.</h3>
        <p className="text-zinc-400 text-center max-w-sm mb-6">
          Save travel inspo to a themed collection so it's easy to find when it's time to plan.
        </p>
        <button
          onClick={onCreateCollection}
          className="px-6 py-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-all"
        >
          Create a collection
        </button>
      </div>
    </div>
  );
};

// ============ INSPIRATION VIEW ============

const InspirationView: React.FC<{
  guides: Guide[];
  onGuideSelect: (guide: Guide) => void;
}> = ({ guides, onGuideSelect }) => {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Inspiration</h2>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search for location or username"
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-800/50 border border-white/5 text-white placeholder-zinc-500 outline-none focus:border-cyan-500/50 transition-all"
        />
      </div>

      {/* Featured guides */}
      <h3 className="text-lg font-semibold text-white mb-4">Featured guides</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {guides.filter(g => g.isFeature).map((guide) => (
          <motion.div
            key={guide.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden bg-zinc-800/50 border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
            onClick={() => onGuideSelect(guide)}
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={guide.thumbnail}
                alt={guide.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Badge */}
              <div className="absolute top-3 left-3">
                <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs text-white">
                  {guide.placesCount} places
                </span>
              </div>

              {/* Actions */}
              <div className="absolute top-3 right-3 flex gap-1">
                <button className="p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all">
                  <Heart size={16} />
                </button>
                <button className="p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all">
                  <Plus size={16} />
                </button>
              </div>

              {/* Carousel dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
            </div>

            <div className="p-4">
              <h4 className="font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                {guide.title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <MapPin size={12} />
                <span>{guide.destination}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 rounded-full bg-pink-500" />
                <span className="text-xs text-zinc-500">{guide.destination.toLowerCase()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ============ MAIN CHATBOT PANEL ============

const ChatbotPanel: React.FC<ChatbotPanelProps> = ({ isOpen, onClose, onPlaceSelect }) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('chat');
  const [chatView, setChatView] = useState<ChatView>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<ChatFilters>({ destination: 'Cayman Islands', travelers: 2 });
  const [trips, setTrips] = useState<Trip[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showMap, setShowMap] = useState(true);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle tab changes
  useEffect(() => {
    if (activeTab === 'chat') setChatView('chat');
    else if (activeTab === 'trips') setChatView('trips');
    else if (activeTab === 'collections') setChatView('collections');
    else if (activeTab === 'inspiration') setChatView('inspiration');
  }, [activeTab]);

  // Process message using RAG service
  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      chatId: 'current',
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call RAG service
      const ragResponse = await processQuery(content, messages);

      // Create assistant message from RAG response
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        chatId: 'current',
        role: 'assistant',
        content: ragResponse.content,
        timestamp: new Date().toISOString(),
        places: ragResponse.places,
        mapMarkers: ragResponse.mapMarkers,
        suggestedActions: ragResponse.suggestedActions
      };

      // Update map markers if RAG returned any
      if (ragResponse.mapMarkers.length > 0) {
        setMapMarkers(ragResponse.mapMarkers);
      }

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error processing message:', error);

      // Fallback error message
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        chatId: 'current',
        role: 'assistant',
        content: `I apologize, but I encountered an issue processing your request. Please try again, or feel free to ask me about:

- **Beaches** - Seven Mile Beach, Starfish Point, and more
- **Hotels** - From The Ritz-Carlton to private villas
- **Restaurants** - Fine dining to beach bars
- **Activities** - Stingray City, diving, and adventures

How can I help you explore the Cayman Islands?`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceSelectInternal = (place: KnowledgeNode) => {
    onPlaceSelect?.(place);
    // Center map on selected place
    setMapMarkers(prev => prev.map(m => ({
      ...m,
      isActive: m.nodeId === place.id
    })));
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 flex bg-zinc-950"
    >
      {/* Sidebar */}
      <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            {chatView === 'chat' && messages.length > 0 && (
              <h2 className="text-sm font-medium text-white">New chat</h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters bar (only for chat) */}
        {chatView === 'chat' && <ChatFiltersBar filters={filters} onFiltersChange={setFilters} />}

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat/Content area */}
          <div className="flex-1 flex flex-col min-w-0">
            {chatView === 'chat' && (
              <>
                {messages.length === 0 ? (
                  <WelcomeMessage onPromptSelect={handleSendMessage} />
                ) : (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((message) => (
                      <ChatMessageComponent
                        key={message.id}
                        message={message}
                        onPlaceSelect={handlePlaceSelectInternal}
                      />
                    ))}
                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
                          <Sparkles size={16} className="text-white" />
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
                {/* Input */}
                <div className="p-4 border-t border-white/5">
                  <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
                </div>
              </>
            )}
            {chatView === 'trips' && (
              <TripsView trips={trips} onCreateTrip={() => {}} />
            )}
            {chatView === 'collections' && (
              <CollectionsView collections={collections} onCreateCollection={() => {}} />
            )}
            {chatView === 'inspiration' && (
              <InspirationView guides={CAYMAN_GUIDES} onGuideSelect={() => {}} />
            )}
          </div>

          {/* Map panel (only for chat view) */}
          {chatView === 'chat' && showMap && (
            <div className="w-[45%] border-l border-white/5 bg-zinc-900 relative">
              {/* Map toggle button */}
              <div className="absolute top-4 left-4 z-20">
                <button
                  onClick={() => setShowMap(false)}
                  className="p-2 rounded-lg bg-zinc-800/90 backdrop-blur-sm border border-white/10 text-white hover:bg-zinc-700 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
              </div>

              {/* Interactive Map */}
              <InteractiveMap
                markers={mapMarkers}
                selectedMarkerId={mapMarkers.find(m => m.isActive)?.id}
                onMarkerSelect={(markerId) => {
                  const marker = mapMarkers.find(m => m.id === markerId);
                  if (marker?.nodeId) {
                    const place = CAYMAN_KNOWLEDGE_BASE.find(n => n.id === marker.nodeId);
                    if (place) handlePlaceSelectInternal(place);
                  }
                }}
                className="w-full h-full"
                showFilters={true}
                showSearch={true}
              />
            </div>
          )}

          {/* Map toggle button when hidden */}
          {chatView === 'chat' && !showMap && (
            <button
              onClick={() => setShowMap(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-zinc-800 border border-white/10 text-white hover:bg-zinc-700 transition-all"
            >
              <Map size={20} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatbotPanel;
