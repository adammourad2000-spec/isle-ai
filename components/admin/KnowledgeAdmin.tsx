// ============================================
// ISLE AI - KNOWLEDGE BASE ADMIN PANEL
// Manage RAG knowledge nodes for the island
// ============================================

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Filter,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  MapPin,
  Star,
  DollarSign,
  Image as ImageIcon,
  Globe,
  Phone,
  Clock,
  Tag,
  MoreHorizontal,
  Check,
  X,
  AlertTriangle,
  Eye,
  Copy,
  ExternalLink,
  Building2,
  UtensilsCrossed,
  Waves,
  Ship,
  Plane,
  Camera,
  Palmtree,
  Settings,
  BarChart3,
  RefreshCw,
  FileJson,
  Layers
} from 'lucide-react';
import { KnowledgeNode, KnowledgeCategory, PriceRange } from '../../types/chatbot';
import { CAYMAN_KNOWLEDGE_BASE, CAYMAN_CONFIG } from '../../data/cayman-islands-knowledge';

// ============ TYPES ============

interface AdminFilters {
  search: string;
  category: KnowledgeCategory | 'all';
  priceRange: PriceRange | 'all';
  district: string | 'all';
  isVerified: boolean | 'all';
  sortBy: 'name' | 'rating' | 'reviewCount' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

interface KnowledgeAdminProps {
  onClose?: () => void;
}

// ============ CATEGORY CONFIG ============

const categoryConfig: Record<KnowledgeCategory, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}> = {
  hotel: { icon: <Building2 size={16} />, color: 'text-violet-400', bgColor: 'bg-violet-500/20', label: 'Hotels' },
  restaurant: { icon: <UtensilsCrossed size={16} />, color: 'text-amber-400', bgColor: 'bg-amber-500/20', label: 'Restaurants' },
  beach: { icon: <Waves size={16} />, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', label: 'Beaches' },
  attraction: { icon: <Camera size={16} />, color: 'text-pink-400', bgColor: 'bg-pink-500/20', label: 'Attractions' },
  activity: { icon: <Star size={16} />, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', label: 'Activities' },
  diving: { icon: <Waves size={16} />, color: 'text-sky-400', bgColor: 'bg-sky-500/20', label: 'Diving' },
  villa_rental: { icon: <Palmtree size={16} />, color: 'text-lime-400', bgColor: 'bg-lime-500/20', label: 'Villas' },
  boat_charter: { icon: <Ship size={16} />, color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'Boats' },
  private_jet: { icon: <Plane size={16} />, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', label: 'Jets' },
  concierge: { icon: <Star size={16} />, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', label: 'Concierge' },
  real_estate: { icon: <Building2 size={16} />, color: 'text-slate-400', bgColor: 'bg-slate-500/20', label: 'Real Estate' },
  event: { icon: <Camera size={16} />, color: 'text-rose-400', bgColor: 'bg-rose-500/20', label: 'Events' },
  transport: { icon: <Ship size={16} />, color: 'text-teal-400', bgColor: 'bg-teal-500/20', label: 'Transport' },
  general: { icon: <MapPin size={16} />, color: 'text-gray-400', bgColor: 'bg-gray-500/20', label: 'General' }
};

// ============ STATS CARD ============

const StatsCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  change?: { value: number; isPositive: boolean };
}> = ({ label, value, icon, color, change }) => (
  <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
    <div className="flex items-center justify-between mb-2">
      <span className="text-zinc-400 text-sm">{label}</span>
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
    {change && (
      <div className={`text-xs mt-1 ${change.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {change.isPositive ? '+' : ''}{change.value}% from last month
      </div>
    )}
  </div>
);

// ============ NODE CARD ============

const NodeCard: React.FC<{
  node: KnowledgeNode;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}> = ({ node, isSelected, onSelect, onEdit, onDelete, onPreview }) => {
  const config = categoryConfig[node.category] || categoryConfig.general;
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative bg-zinc-800/50 rounded-xl overflow-hidden border transition-all cursor-pointer ${
        isSelected ? 'border-cyan-500 ring-2 ring-cyan-500/20' : 'border-white/5 hover:border-white/10'
      }`}
    >
      {/* Checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-cyan-500 border-cyan-500 text-white'
              : 'border-white/20 hover:border-white/40'
          }`}
        >
          {isSelected && <Check size={12} />}
        </button>
      </div>

      {/* Image */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={node.media.thumbnail}
          alt={node.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Category badge */}
        <div className={`absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bgColor}`}>
          {config.icon}
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        </div>

        {/* Actions menu */}
        <div className="absolute top-2 right-2">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all"
            >
              <MoreHorizontal size={16} />
            </button>

            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  className="absolute right-0 top-full mt-1 w-36 bg-zinc-800 rounded-lg border border-white/10 shadow-xl overflow-hidden z-20"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview();
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5 transition-all"
                  >
                    <Eye size={14} />
                    Preview
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5 transition-all"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-white text-sm truncate">{node.name}</h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
          <div className="flex items-center gap-0.5">
            <Star size={10} className="text-yellow-400 fill-yellow-400" />
            <span>{node.ratings.overall}</span>
          </div>
          <span>•</span>
          <span>{node.ratings.reviewCount} reviews</span>
          <span>•</span>
          <span>{node.business.priceRange}</span>
        </div>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-zinc-500">
          <MapPin size={10} />
          <span className="truncate">{node.location.district}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {node.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-zinc-400"
            >
              {tag}
            </span>
          ))}
          {node.tags.length > 3 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-zinc-500">
              +{node.tags.length - 3}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============ NODE EDITOR MODAL ============

const NodeEditorModal: React.FC<{
  node?: KnowledgeNode;
  isOpen: boolean;
  onClose: () => void;
  onSave: (node: Partial<KnowledgeNode>) => void;
}> = ({ node, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<KnowledgeNode>>(node || {
    name: '',
    category: 'general',
    description: '',
    shortDescription: '',
    location: {
      address: '',
      district: '',
      island: 'Grand Cayman',
      latitude: 19.3133,
      longitude: -81.2546
    },
    business: {
      priceRange: '$$' as PriceRange,
      currency: 'USD'
    },
    ratings: {
      overall: 4.0,
      reviewCount: 0
    },
    media: {
      thumbnail: '',
      images: []
    },
    contact: {},
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (tagInput.trim() && formData.tags && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(t => t !== tag) || []
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl max-h-[90vh] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">
            {node ? 'Edit Knowledge Node' : 'Add New Knowledge Node'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)] space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Layers size={14} />
              Basic Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-zinc-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-all"
                  placeholder="e.g., The Ritz-Carlton, Grand Cayman"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Category *</label>
                <select
                  value={formData.category || 'general'}
                  onChange={e => setFormData({ ...formData, category: e.target.value as KnowledgeCategory })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-all"
                >
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Price Range</label>
                <select
                  value={formData.business?.priceRange || '$$'}
                  onChange={e => setFormData({
                    ...formData,
                    business: { ...formData.business!, priceRange: e.target.value as PriceRange }
                  })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-all"
                >
                  <option value="$">$ - Budget</option>
                  <option value="$$">$$ - Moderate</option>
                  <option value="$$$">$$$ - Upscale</option>
                  <option value="$$$$">$$$$ - Luxury</option>
                  <option value="$$$$$">$$$$$ - Ultra Luxury</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-zinc-400 mb-1">Short Description</label>
                <input
                  type="text"
                  value={formData.shortDescription || ''}
                  onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-all"
                  placeholder="Brief tagline (shown in search results)"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-zinc-400 mb-1">Full Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-all resize-none"
                  placeholder="Detailed description for AI responses..."
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <MapPin size={14} />
              Location
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-zinc-400 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.location?.address || ''}
                  onChange={e => setFormData({
                    ...formData,
                    location: { ...formData.location!, address: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-all"
                  placeholder="Street address"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">District</label>
                <input
                  type="text"
                  value={formData.location?.district || ''}
                  onChange={e => setFormData({
                    ...formData,
                    location: { ...formData.location!, district: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-all"
                  placeholder="e.g., Seven Mile Beach"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Island</label>
                <select
                  value={formData.location?.island || 'Grand Cayman'}
                  onChange={e => setFormData({
                    ...formData,
                    location: { ...formData.location!, island: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-all"
                >
                  <option value="Grand Cayman">Grand Cayman</option>
                  <option value="Cayman Brac">Cayman Brac</option>
                  <option value="Little Cayman">Little Cayman</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.location?.latitude || ''}
                  onChange={e => setFormData({
                    ...formData,
                    location: { ...formData.location!, latitude: parseFloat(e.target.value) }
                  })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-all"
                  placeholder="19.3133"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.location?.longitude || ''}
                  onChange={e => setFormData({
                    ...formData,
                    location: { ...formData.location!, longitude: parseFloat(e.target.value) }
                  })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-all"
                  placeholder="-81.2546"
                />
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <ImageIcon size={14} />
              Media
            </h3>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Thumbnail URL</label>
              <input
                type="url"
                value={formData.media?.thumbnail || ''}
                onChange={e => setFormData({
                  ...formData,
                  media: { ...formData.media!, thumbnail: e.target.value }
                })}
                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-all"
                placeholder="https://..."
              />
            </div>

            {formData.media?.thumbnail && (
              <div className="w-32 h-20 rounded-lg overflow-hidden bg-zinc-800">
                <img
                  src={formData.media.thumbnail}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={e => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128x80?text=Invalid+URL';
                  }}
                />
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Phone size={14} />
              Contact
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.contact?.phone || ''}
                  onChange={e => setFormData({
                    ...formData,
                    contact: { ...formData.contact, phone: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-all"
                  placeholder="+1 (345) 555-0123"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Website</label>
                <input
                  type="url"
                  value={formData.contact?.website || ''}
                  onChange={e => setFormData({
                    ...formData,
                    contact: { ...formData.contact, website: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-all"
                  placeholder="https://..."
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-zinc-400 mb-1">Booking URL</label>
                <input
                  type="url"
                  value={formData.contact?.bookingUrl || ''}
                  onChange={e => setFormData({
                    ...formData,
                    contact: { ...formData.contact, bookingUrl: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-all"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Tag size={14} />
              Tags (for search relevance)
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-all"
                placeholder="Add a tag..."
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag, index) => (
                <span
                  key={index}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-sm text-zinc-300"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Ratings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Star size={14} />
              Ratings
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Overall Rating (0-5)</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.ratings?.overall || 4.0}
                  onChange={e => setFormData({
                    ...formData,
                    ratings: { ...formData.ratings!, overall: parseFloat(e.target.value) }
                  })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Review Count</label>
                <input
                  type="number"
                  min="0"
                  value={formData.ratings?.reviewCount || 0}
                  onChange={e => setFormData({
                    ...formData,
                    ratings: { ...formData.ratings!, reviewCount: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium hover:opacity-90 transition-all"
          >
            {node ? 'Save Changes' : 'Create Node'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============ DELETE CONFIRMATION MODAL ============

const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  nodeCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, nodeCount, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Delete {nodeCount > 1 ? `${nodeCount} Nodes` : 'Node'}?</h3>
          <p className="text-zinc-400 mb-6">
            This action cannot be undone. The {nodeCount > 1 ? 'nodes' : 'node'} will be permanently removed from the knowledge base.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============ MAIN KNOWLEDGE ADMIN COMPONENT ============

const KnowledgeAdmin: React.FC<KnowledgeAdminProps> = ({ onClose }) => {
  // State
  const [nodes, setNodes] = useState<KnowledgeNode[]>([...CAYMAN_KNOWLEDGE_BASE]);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [editingNode, setEditingNode] = useState<KnowledgeNode | undefined>(undefined);
  const [showEditor, setShowEditor] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filters, setFilters] = useState<AdminFilters>({
    search: '',
    category: 'all',
    priceRange: 'all',
    district: 'all',
    isVerified: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filtered and sorted nodes
  const filteredNodes = useMemo(() => {
    let result = [...nodes];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(node =>
        node.name.toLowerCase().includes(searchLower) ||
        node.description.toLowerCase().includes(searchLower) ||
        node.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      result = result.filter(node => node.category === filters.category);
    }

    // Price filter
    if (filters.priceRange !== 'all') {
      result = result.filter(node => node.business.priceRange === filters.priceRange);
    }

    // District filter
    if (filters.district !== 'all') {
      result = result.filter(node => node.location.district === filters.district);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'rating':
          comparison = b.ratings.overall - a.ratings.overall;
          break;
        case 'reviewCount':
          comparison = b.ratings.reviewCount - a.ratings.reviewCount;
          break;
        default:
          comparison = 0;
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [nodes, filters]);

  // Get unique districts
  const districts = useMemo(() => {
    const uniqueDistricts = new Set(nodes.map(n => n.location.district));
    return Array.from(uniqueDistricts).sort();
  }, [nodes]);

  // Stats
  const stats = useMemo(() => ({
    total: nodes.length,
    categories: Object.keys(categoryConfig).reduce((acc, cat) => {
      acc[cat] = nodes.filter(n => n.category === cat).length;
      return acc;
    }, {} as Record<string, number>),
    avgRating: (nodes.reduce((sum, n) => sum + n.ratings.overall, 0) / nodes.length).toFixed(1),
    totalReviews: nodes.reduce((sum, n) => sum + n.ratings.reviewCount, 0)
  }), [nodes]);

  // Handlers
  const handleSelectAll = () => {
    if (selectedNodes.size === filteredNodes.length) {
      setSelectedNodes(new Set());
    } else {
      setSelectedNodes(new Set(filteredNodes.map(n => n.id)));
    }
  };

  const handleToggleSelect = (nodeId: string) => {
    const newSelected = new Set(selectedNodes);
    if (newSelected.has(nodeId)) {
      newSelected.delete(nodeId);
    } else {
      newSelected.add(nodeId);
    }
    setSelectedNodes(newSelected);
  };

  const handleCreateNode = () => {
    setEditingNode(undefined);
    setShowEditor(true);
  };

  const handleEditNode = (node: KnowledgeNode) => {
    setEditingNode(node);
    setShowEditor(true);
  };

  const handleSaveNode = (nodeData: Partial<KnowledgeNode>) => {
    if (editingNode) {
      // Update existing node
      setNodes(prev => prev.map(n =>
        n.id === editingNode.id ? { ...n, ...nodeData } as KnowledgeNode : n
      ));
    } else {
      // Create new node
      const newNode: KnowledgeNode = {
        ...nodeData,
        id: `node-${Date.now()}`,
        embeddingText: `${nodeData.name} ${nodeData.description} ${nodeData.tags?.join(' ')}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as KnowledgeNode;
      setNodes(prev => [...prev, newNode]);
    }
    setShowEditor(false);
    setEditingNode(undefined);
  };

  const handleDeleteSelected = () => {
    setNodes(prev => prev.filter(n => !selectedNodes.has(n.id)));
    setSelectedNodes(new Set());
    setShowDeleteConfirm(false);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(nodes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `isle-ai-knowledge-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
                <Layers size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Knowledge Base</h1>
                <p className="text-sm text-zinc-400">{CAYMAN_CONFIG.islandName} - Manage AI Knowledge Nodes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5 transition-all"
              >
                <Download size={16} />
                Export
              </button>
              <button
                onClick={handleCreateNode}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium hover:opacity-90 transition-all"
              >
                <Plus size={16} />
                Add Node
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            label="Total Nodes"
            value={stats.total}
            icon={<Layers size={18} />}
            color="bg-cyan-500/20"
          />
          <StatsCard
            label="Avg Rating"
            value={stats.avgRating}
            icon={<Star size={18} />}
            color="bg-yellow-500/20"
          />
          <StatsCard
            label="Total Reviews"
            value={stats.totalReviews.toLocaleString()}
            icon={<BarChart3 size={18} />}
            color="bg-emerald-500/20"
          />
          <StatsCard
            label="Categories"
            value={Object.values(stats.categories).filter(v => v > 0).length}
            icon={<Tag size={18} />}
            color="bg-violet-500/20"
          />
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-zinc-900/50 rounded-xl border border-white/5">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-all"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filters.category}
            onChange={e => setFilters({ ...filters, category: e.target.value as KnowledgeCategory | 'all' })}
            className="px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-all"
          >
            <option value="all">All Categories</option>
            {Object.entries(categoryConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label} ({stats.categories[key] || 0})</option>
            ))}
          </select>

          {/* District Filter */}
          <select
            value={filters.district}
            onChange={e => setFilters({ ...filters, district: e.target.value })}
            className="px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-all"
          >
            <option value="all">All Districts</option>
            {districts.map(district => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={e => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setFilters({ ...filters, sortBy: sortBy as typeof filters.sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
            }}
            className="px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-all"
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="rating-desc">Highest Rated</option>
            <option value="rating-asc">Lowest Rated</option>
            <option value="reviewCount-desc">Most Reviews</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedNodes.size > 0 && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <span className="text-sm text-cyan-400">
              {selectedNodes.size} node{selectedNodes.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setSelectedNodes(new Set())}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Clear selection
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
            >
              <Trash2 size={14} />
              Delete selected
            </button>
          </div>
        )}

        {/* Results count and select all */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                selectedNodes.size === filteredNodes.length && filteredNodes.length > 0
                  ? 'bg-cyan-500 border-cyan-500 text-white'
                  : 'border-white/20'
              }`}>
                {selectedNodes.size === filteredNodes.length && filteredNodes.length > 0 && <Check size={10} />}
              </div>
              Select all
            </button>
            <span className="text-sm text-zinc-500">
              Showing {filteredNodes.length} of {nodes.length} nodes
            </span>
          </div>
        </div>

        {/* Nodes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredNodes.map(node => (
              <NodeCard
                key={node.id}
                node={node}
                isSelected={selectedNodes.has(node.id)}
                onSelect={() => handleToggleSelect(node.id)}
                onEdit={() => handleEditNode(node)}
                onDelete={() => {
                  setSelectedNodes(new Set([node.id]));
                  setShowDeleteConfirm(true);
                }}
                onPreview={() => window.open(node.contact.website, '_blank')}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filteredNodes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <Search size={32} className="text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No nodes found</h3>
            <p className="text-zinc-400 text-center max-w-sm">
              {filters.search || filters.category !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first knowledge node'}
            </p>
            {filters.search === '' && filters.category === 'all' && (
              <button
                onClick={handleCreateNode}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all"
              >
                <Plus size={16} />
                Add your first node
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showEditor && (
          <NodeEditorModal
            node={editingNode}
            isOpen={showEditor}
            onClose={() => {
              setShowEditor(false);
              setEditingNode(undefined);
            }}
            onSave={handleSaveNode}
          />
        )}
        {showDeleteConfirm && (
          <DeleteConfirmModal
            isOpen={showDeleteConfirm}
            nodeCount={selectedNodes.size}
            onConfirm={handleDeleteSelected}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default KnowledgeAdmin;
