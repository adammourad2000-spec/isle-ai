// ============================================
// ISLE AI - WEATHER DISPLAY COMPONENT
// Beautiful, informative weather cards for the chatbot
// ============================================

import React from 'react';
import { motion } from 'framer-motion';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
  Eye,
  Waves,
  AlertTriangle,
  Umbrella,
  Sunrise,
  Sunset
} from 'lucide-react';

// Types matching weatherService
export interface WeatherData {
  location: string;
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    condition: string;
    description: string;
    uvIndex: number;
    visibility: number;
  };
  forecast?: Array<{
    date: string;
    dayName: string;
    high: number;
    low: number;
    condition: string;
    description: string;
    precipitationChance: number;
  }>;
  marine?: {
    seaTemperature: number;
    waveHeight: number;
    tideInfo: string;
    swimmingConditions: string;
  };
  alerts?: Array<{
    type: string;
    severity: string;
    title: string;
    description: string;
  }>;
  lastUpdated: string;
  source: string;
}

interface WeatherDisplayProps {
  weather: WeatherData;
  compact?: boolean;
}

// Get weather icon based on condition
function getWeatherIcon(condition: string, size = 24) {
  const iconProps = { size, className: 'flex-shrink-0' };

  switch (condition.toLowerCase()) {
    case 'sunny':
      return <Sun {...iconProps} className="text-yellow-400" />;
    case 'partly_cloudy':
      return <Cloud {...iconProps} className="text-gray-300" />;
    case 'cloudy':
    case 'overcast':
      return <Cloud {...iconProps} className="text-gray-400" />;
    case 'light_rain':
    case 'rain':
      return <CloudRain {...iconProps} className="text-blue-400" />;
    case 'heavy_rain':
    case 'thunderstorm':
      return <CloudLightning {...iconProps} className="text-purple-400" />;
    case 'tropical_storm':
    case 'hurricane':
      return <Wind {...iconProps} className="text-red-500" />;
    case 'windy':
      return <Wind {...iconProps} className="text-cyan-400" />;
    default:
      return <Sun {...iconProps} className="text-yellow-400" />;
  }
}

// Get UV index color and label
function getUVInfo(uvIndex: number): { color: string; label: string } {
  if (uvIndex <= 2) return { color: 'text-green-400', label: 'Low' };
  if (uvIndex <= 5) return { color: 'text-yellow-400', label: 'Moderate' };
  if (uvIndex <= 7) return { color: 'text-orange-400', label: 'High' };
  if (uvIndex <= 10) return { color: 'text-red-400', label: 'Very High' };
  return { color: 'text-purple-400', label: 'Extreme' };
}

// Get swimming conditions color
function getSwimmingColor(conditions: string): string {
  switch (conditions.toLowerCase()) {
    case 'excellent':
      return 'text-emerald-400';
    case 'good':
      return 'text-green-400';
    case 'moderate':
      return 'text-yellow-400';
    case 'poor':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

export const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ weather, compact = false }) => {
  const { current, forecast, marine, alerts } = weather;
  const uvInfo = getUVInfo(current.uvIndex);

  if (compact) {
    // Compact inline weather display
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30"
      >
        {getWeatherIcon(current.condition, 20)}
        <span className="text-white font-medium">{current.temperature}°F</span>
        <span className="text-zinc-400 text-sm">{current.description}</span>
        <span className="text-zinc-500">|</span>
        <Droplets size={14} className="text-blue-400" />
        <span className="text-zinc-400 text-sm">{current.humidity}%</span>
      </motion.div>
    );
  }

  // Full weather card
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-xl"
    >
      {/* Alerts Banner */}
      {alerts && alerts.length > 0 && (
        <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-2">
          {alerts.map((alert, idx) => (
            <div key={idx} className="flex items-center gap-2 text-red-400">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">{alert.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Weather Section */}
      <div className="p-5">
        {/* Location & Current */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{weather.location}</h3>
            <p className="text-sm text-zinc-400">{current.description}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              {getWeatherIcon(current.condition, 32)}
              <span className="text-4xl font-light text-white">{current.temperature}°</span>
            </div>
            <p className="text-sm text-zinc-400">Feels like {current.feelsLike}°F</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <Droplets size={18} className="mx-auto text-blue-400 mb-1" />
            <p className="text-xs text-zinc-400">Humidity</p>
            <p className="text-sm font-medium text-white">{current.humidity}%</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <Wind size={18} className="mx-auto text-cyan-400 mb-1" />
            <p className="text-xs text-zinc-400">Wind</p>
            <p className="text-sm font-medium text-white">{current.windSpeed} mph</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <Sun size={18} className={`mx-auto ${uvInfo.color} mb-1`} />
            <p className="text-xs text-zinc-400">UV Index</p>
            <p className={`text-sm font-medium ${uvInfo.color}`}>{current.uvIndex} {uvInfo.label}</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <Eye size={18} className="mx-auto text-gray-400 mb-1" />
            <p className="text-xs text-zinc-400">Visibility</p>
            <p className="text-sm font-medium text-white">{current.visibility} mi</p>
          </div>
        </div>

        {/* Marine Conditions */}
        {marine && (
          <div className="bg-blue-500/10 rounded-xl p-4 mb-4 border border-blue-500/20">
            <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
              <Waves size={16} />
              Marine Conditions
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-zinc-400">Sea Temp</p>
                <p className="text-lg font-medium text-white">{marine.seaTemperature}°F</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Waves</p>
                <p className="text-lg font-medium text-white">{marine.waveHeight} ft</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Swimming</p>
                <p className={`text-lg font-medium capitalize ${getSwimmingColor(marine.swimmingConditions)}`}>
                  {marine.swimmingConditions}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Forecast */}
        {forecast && forecast.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-zinc-400 mb-3">{forecast.length}-Day Forecast</h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {forecast.slice(0, 5).map((day, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex-shrink-0 bg-slate-700/30 rounded-lg p-3 text-center min-w-[80px]"
                >
                  <p className="text-xs text-zinc-400 mb-1">{day.dayName.slice(0, 3)}</p>
                  {getWeatherIcon(day.condition, 20)}
                  <div className="mt-1">
                    <span className="text-sm font-medium text-white">{day.high}°</span>
                    <span className="text-xs text-zinc-500 ml-1">{day.low}°</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Umbrella size={10} className="text-blue-400" />
                    <span className="text-xs text-zinc-400">{day.precipitationChance}%</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-900/50 px-4 py-2 border-t border-slate-700/50">
        <p className="text-xs text-zinc-500 text-center">
          Updated {new Date(weather.lastUpdated).toLocaleTimeString()} • {weather.source}
        </p>
      </div>
    </motion.div>
  );
};

// Mini weather badge for inline display
export const WeatherBadge: React.FC<{ weather: WeatherData }> = ({ weather }) => {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-sm">
      {getWeatherIcon(weather.current.condition, 14)}
      <span className="text-white font-medium">{weather.current.temperature}°F</span>
      <span className="text-cyan-400">{weather.current.condition.replace('_', ' ')}</span>
    </span>
  );
};

export default WeatherDisplay;
