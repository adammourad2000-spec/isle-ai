// ============================================
// ISLE AI - CLICKS TAB
// Click Intelligence with Google Maps Heatmap
// OpenAI-inspired design
// ============================================

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  GoogleMap,
  useJsApiLoader,
  HeatmapLayer
} from '@react-google-maps/api';
import {
  MousePointerClick,
  Phone,
  Globe,
  Navigation,
  Calendar,
  TrendingUp,
  MapPin,
  Clock,
  BarChart3
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { EnhancedDashboardData } from '../../../types/analytics';

// ============ TYPES ============

interface ClicksTabProps {
  data: EnhancedDashboardData;
}

// Google Maps config
const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
const libraries: ('visualization' | 'places')[] = ['visualization', 'places'];
const CAYMAN_CENTER = { lat: 19.3133, lng: -81.2546 };

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px'
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8b8b8b' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f0f23' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
    { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ]
};

// ============ COMPONENT ============

export const ClicksTab: React.FC<ClicksTabProps> = ({ data }) => {
  const { heatmap } = data;
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'phone' | 'website' | 'directions' | 'booking'>('all');

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries
  });

  // Prepare heatmap data for Google Maps
  const heatmapData = useMemo(() => {
    if (!isLoaded || !window.google) return [];

    return heatmap.geographic.map(point => ({
      location: new window.google.maps.LatLng(point.lat, point.lng),
      weight: point.clickCount * point.intensity
    }));
  }, [heatmap.geographic, isLoaded]);

  // Calculate totals
  const totals = {
    all: heatmap.geographic.reduce((sum, p) => sum + p.clickCount, 0),
    phone: heatmap.actionDistribution.find(a => a.action === 'phone_click')?.count || 0,
    website: heatmap.actionDistribution.find(a => a.action === 'website_click')?.count || 0,
    directions: heatmap.actionDistribution.find(a => a.action === 'directions_click')?.count || 0,
    booking: heatmap.actionDistribution.find(a => a.action === 'booking_click')?.count || 0
  };

  return (
    <div className="space-y-6">
      {/* ============ METRICS ROW ============ */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard
          icon={<MousePointerClick size={18} />}
          label="Total Clicks"
          value={totals.all}
          isActive={selectedMetric === 'all'}
          onClick={() => setSelectedMetric('all')}
          color="cyan"
        />
        <MetricCard
          icon={<Phone size={18} />}
          label="Phone"
          value={totals.phone}
          isActive={selectedMetric === 'phone'}
          onClick={() => setSelectedMetric('phone')}
          color="emerald"
        />
        <MetricCard
          icon={<Globe size={18} />}
          label="Website"
          value={totals.website}
          isActive={selectedMetric === 'website'}
          onClick={() => setSelectedMetric('website')}
          color="violet"
        />
        <MetricCard
          icon={<Navigation size={18} />}
          label="Directions"
          value={totals.directions}
          isActive={selectedMetric === 'directions'}
          onClick={() => setSelectedMetric('directions')}
          color="amber"
        />
        <MetricCard
          icon={<Calendar size={18} />}
          label="Bookings"
          value={totals.booking}
          isActive={selectedMetric === 'booking'}
          onClick={() => setSelectedMetric('booking')}
          color="rose"
        />
      </div>

      {/* ============ MAP + SIDEBAR ============ */}
      <div className="grid grid-cols-3 gap-6">
        {/* Heatmap */}
        <div className="col-span-2">
          <Card title="Geographic Heatmap" subtitle="Click density across Cayman Islands">
            <div className="h-[400px] rounded-xl overflow-hidden bg-[#0f0f1a]">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={CAYMAN_CENTER}
                  zoom={11}
                  options={mapOptions}
                >
                  {heatmapData.length > 0 && (
                    <HeatmapLayer
                      data={heatmapData}
                      options={{
                        radius: 30,
                        opacity: 0.8,
                        gradient: [
                          'rgba(0, 0, 0, 0)',
                          'rgba(16, 185, 129, 0.4)',
                          'rgba(6, 182, 212, 0.6)',
                          'rgba(139, 92, 246, 0.8)',
                          'rgba(244, 63, 94, 1)'
                        ]
                      }}
                    />
                  )}
                </GoogleMap>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="flex items-center gap-3 text-white/40">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    <span className="text-[13px]">Loading map...</span>
                  </div>
                </div>
              )}
            </div>
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <LegendItem color="bg-emerald-500" label="Low" />
              <LegendItem color="bg-cyan-500" label="Medium" />
              <LegendItem color="bg-violet-500" label="High" />
              <LegendItem color="bg-rose-500" label="Very High" />
            </div>
          </Card>
        </div>

        {/* Top Places */}
        <div className="col-span-1">
          <Card title="Top Locations" subtitle="Most engaged places">
            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
              {heatmap.topPlaces.length === 0 ? (
                <EmptyState message="No location data yet" />
              ) : (
                heatmap.topPlaces.slice(0, 10).map((place, idx) => (
                  <PlaceRow key={place.placeId} place={place} rank={idx + 1} maxClicks={heatmap.topPlaces[0]?.totalClicks || 1} />
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ============ CHARTS ROW ============ */}
      <div className="grid grid-cols-3 gap-6">
        {/* Category Distribution */}
        <Card title="By Category" subtitle="Click distribution">
          {heatmap.categoryDistribution.length === 0 ? (
            <EmptyState message="No category data" />
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatmap.categoryDistribution.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" stroke="#ffffff20" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    stroke="#ffffff20"
                    fontSize={11}
                    width={80}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Action Distribution */}
        <Card title="Action Types" subtitle="What users click">
          {heatmap.actionDistribution.length === 0 ? (
            <EmptyState message="No action data" />
          ) : (
            <div className="h-[240px] flex items-center">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={heatmap.actionDistribution}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      strokeWidth={0}
                    >
                      {heatmap.actionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getActionColor(entry.action)} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2">
                {heatmap.actionDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getActionColor(item.action) }} />
                      <span className="text-white/60">{item.label}</span>
                    </div>
                    <span className="text-white/80 font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Time Distribution */}
        <Card title="Activity Pattern" subtitle="Clicks by hour">
          {heatmap.timeDistribution.every(d => d.count === 0) ? (
            <EmptyState message="No time data" />
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={heatmap.timeDistribution} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    stroke="#ffffff20"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval={3}
                  />
                  <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#clickGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// ============ METRIC CARD ============

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  isActive: boolean;
  onClick: () => void;
  color: 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose';
}> = ({ icon, label, value, isActive, onClick, color }) => {
  const colors = {
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' }
  };

  const c = colors[color];

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`p-5 rounded-xl border transition-all text-left ${
        isActive
          ? `${c.bg} ${c.border} border`
          : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
      }`}
    >
      <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center ${c.text} mb-3`}>
        {icon}
      </div>
      <p className="text-[28px] font-semibold text-white tabular-nums">{value.toLocaleString()}</p>
      <p className="text-[12px] text-white/40 mt-0.5">{label}</p>
    </motion.button>
  );
};

// ============ CARD ============

const Card: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-5">
    <div className="mb-4">
      <h3 className="text-[14px] font-medium text-white">{title}</h3>
      {subtitle && <p className="text-[12px] text-white/40 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// ============ PLACE ROW ============

const PlaceRow: React.FC<{
  place: EnhancedDashboardData['heatmap']['topPlaces'][0];
  rank: number;
  maxClicks: number;
}> = ({ place, rank, maxClicks }) => {
  const percentage = (place.totalClicks / maxClicks) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.03 }}
      className="group"
    >
      <div className="flex items-center gap-3">
        <span className="w-5 h-5 rounded-md bg-white/[0.06] flex items-center justify-center text-[11px] text-white/40 font-medium">
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] text-white truncate">{place.placeName}</span>
            <span className="text-[12px] text-white/60 ml-2 tabular-nums">{place.totalClicks}</span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5, delay: rank * 0.03 }}
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
            />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-white/30 capitalize">{place.category.replace(/_/g, ' ')}</span>
            <span className="text-[10px] text-white/20">•</span>
            <span className="text-[10px] text-white/30">{place.uniqueVisitors} visitors</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============ LEGEND ITEM ============

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <span className={`w-3 h-3 rounded-full ${color}`} />
    <span className="text-[11px] text-white/40">{label}</span>
  </div>
);

// ============ EMPTY STATE ============

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="h-[200px] flex flex-col items-center justify-center text-white/30">
    <BarChart3 size={32} className="mb-2 opacity-50" />
    <p className="text-[12px]">{message}</p>
  </div>
);

// ============ CUSTOM TOOLTIP ============

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-white/60 mb-1">{label || payload[0]?.name}</p>
      <p className="text-[14px] font-semibold text-white">{payload[0]?.value?.toLocaleString()}</p>
    </div>
  );
};

// ============ HELPERS ============

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    phone_click: '#10b981',
    website_click: '#8b5cf6',
    directions_click: '#f59e0b',
    booking_click: '#f43f5e',
    save_place: '#06b6d4',
    chat_place_click: '#3b82f6'
  };
  return colors[action] || '#6b7280';
}

export default ClicksTab;
