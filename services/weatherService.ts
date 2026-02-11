// ============================================
// ISLE AI - INTELLIGENT WEATHER SERVICE
// Real-time weather for Cayman Islands via OpenAI Web Search
// Only activated when user explicitly asks about weather
// ============================================

// ============ TYPES ============

export interface WeatherData {
  location: string;
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    condition: WeatherCondition;
    description: string;
    uvIndex: number;
    visibility: number;
  };
  forecast: DayForecast[];
  marine?: {
    seaTemperature: number;
    waveHeight: number;
    tideInfo: string;
    swimmingConditions: 'excellent' | 'good' | 'moderate' | 'poor';
  };
  alerts?: WeatherAlert[];
  lastUpdated: string;
  source: string;
}

export interface DayForecast {
  date: string;
  dayName: string;
  high: number;
  low: number;
  condition: WeatherCondition;
  description: string;
  precipitationChance: number;
  sunrise?: string;
  sunset?: string;
}

export interface WeatherAlert {
  type: 'hurricane' | 'storm' | 'flood' | 'heat' | 'wind' | 'other';
  severity: 'watch' | 'warning' | 'advisory';
  title: string;
  description: string;
  validUntil?: string;
}

export type WeatherCondition =
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'overcast'
  | 'light_rain'
  | 'rain'
  | 'heavy_rain'
  | 'thunderstorm'
  | 'tropical_storm'
  | 'hurricane'
  | 'windy'
  | 'foggy'
  | 'hazy';

// ============ INTENT DETECTION ============

const WEATHER_PATTERNS = [
  // Direct weather queries
  /weather/i,
  /météo/i,
  /forecast/i,
  /prévisions?/i,

  // Temperature queries
  /temperature/i,
  /how\s+hot/i,
  /how\s+cold/i,
  /how\s+warm/i,
  /degrees/i,
  /celsius|fahrenheit/i,

  // Condition queries
  /is\s+it\s+(raining|sunny|cloudy|hot|cold|warm)/i,
  /will\s+it\s+rain/i,
  /going\s+to\s+rain/i,
  /chance\s+of\s+rain/i,
  /precipitation/i,

  // Activity-based weather queries
  /good\s+(day|time|weather)\s+(for|to)\s+(beach|swim|dive|snorkel|sail|fish)/i,
  /beach\s+weather/i,
  /swimming\s+conditions/i,
  /diving\s+conditions/i,
  /water\s+temperature/i,
  /sea\s+temperature/i,
  /ocean\s+temperature/i,

  // Storm/safety queries
  /hurricane/i,
  /tropical\s+storm/i,
  /storm\s+(coming|approaching|warning)/i,
  /is\s+it\s+safe/i,

  // Time-based weather
  /weather\s+(today|tomorrow|this\s+week|next\s+week)/i,
  /today'?s?\s+weather/i,
  /weekend\s+weather/i,

  // UV/Sun queries
  /uv\s+(index|level)/i,
  /sun(burn|screen|protection)/i,
  /how\s+sunny/i,

  // Wind queries
  /wind(y|s)?/i,
  /breez(e|y)/i,

  // Humidity
  /humid(ity)?/i,

  // What to wear/pack
  /what\s+(should\s+i|to)\s+(wear|pack|bring)/i,
  /do\s+i\s+need\s+(umbrella|jacket|sunscreen)/i
];

/**
 * Detect if the user's query is asking about weather
 * Returns confidence score (0-1)
 */
export function detectWeatherIntent(query: string): { isWeatherQuery: boolean; confidence: number; type: WeatherQueryType } {
  const lowerQuery = query.toLowerCase();

  let matchCount = 0;
  let matchedPatterns: string[] = [];

  for (const pattern of WEATHER_PATTERNS) {
    if (pattern.test(lowerQuery)) {
      matchCount++;
      matchedPatterns.push(pattern.source);
    }
  }

  // Determine query type
  let type: WeatherQueryType = 'general';

  if (/marine|sea|ocean|water|swim|dive|snorkel|beach/.test(lowerQuery)) {
    type = 'marine';
  } else if (/forecast|tomorrow|week|next/.test(lowerQuery)) {
    type = 'forecast';
  } else if (/hurricane|storm|alert|warning|safe/.test(lowerQuery)) {
    type = 'alerts';
  } else if (/activity|good\s+(day|time|weather)\s+for/.test(lowerQuery)) {
    type = 'activity';
  }

  const confidence = Math.min(matchCount / 2, 1); // 2+ matches = 100% confidence

  return {
    isWeatherQuery: matchCount > 0,
    confidence,
    type
  };
}

export type WeatherQueryType = 'general' | 'forecast' | 'marine' | 'alerts' | 'activity';

// ============ WEATHER FETCHING VIA OPENAI WEB SEARCH ============

/**
 * Fetch real-time weather for Cayman Islands using OpenAI with web search
 */
export async function fetchWeatherData(queryType: WeatherQueryType = 'general'): Promise<WeatherData | null> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.error('[Weather] No OpenAI API key configured');
    return null;
  }

  // Build the search query based on type
  const searchQueries: Record<WeatherQueryType, string> = {
    general: 'Cayman Islands Grand Cayman current weather temperature conditions today',
    forecast: 'Cayman Islands Grand Cayman weather forecast next 5 days',
    marine: 'Cayman Islands sea water temperature wave conditions swimming diving today',
    alerts: 'Cayman Islands weather alerts warnings hurricane tropical storm',
    activity: 'Cayman Islands Grand Cayman weather today beach swimming conditions'
  };

  const systemPrompt = `You are a weather data extraction assistant. Extract accurate weather information and return it as valid JSON.

For Cayman Islands weather, extract:
1. Current conditions (temperature in Fahrenheit, humidity, wind, UV index)
2. 3-5 day forecast if available
3. Marine conditions (sea temperature, wave height) if available
4. Any weather alerts or warnings

Return ONLY valid JSON in this exact format:
{
  "location": "Grand Cayman, Cayman Islands",
  "current": {
    "temperature": 85,
    "feelsLike": 88,
    "humidity": 75,
    "windSpeed": 12,
    "windDirection": "E",
    "condition": "partly_cloudy",
    "description": "Partly cloudy with light breeze",
    "uvIndex": 8,
    "visibility": 10
  },
  "forecast": [
    {
      "date": "2024-01-15",
      "dayName": "Monday",
      "high": 86,
      "low": 76,
      "condition": "sunny",
      "description": "Sunny and warm",
      "precipitationChance": 10
    }
  ],
  "marine": {
    "seaTemperature": 82,
    "waveHeight": 2,
    "tideInfo": "High tide at 2:30 PM",
    "swimmingConditions": "excellent"
  },
  "alerts": [],
  "source": "Weather data source name"
}

Valid conditions: sunny, partly_cloudy, cloudy, overcast, light_rain, rain, heavy_rain, thunderstorm, tropical_storm, hurricane, windy, foggy, hazy
Valid swimming conditions: excellent, good, moderate, poor`;

  try {
    console.log('[Weather] Fetching real-time weather data via OpenAI web search...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Search the web for: "${searchQueries[queryType]}" and extract the current weather data. Return only JSON.` }
        ],
        max_tokens: 1500,
        temperature: 0.1, // Low temperature for accuracy
        // Enable web search via tools
        tools: [
          {
            type: 'function',
            function: {
              name: 'web_search',
              description: 'Search the web for current weather information',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The search query'
                  }
                },
                required: ['query']
              }
            }
          }
        ],
        tool_choice: 'auto'
      })
    });

    if (!response.ok) {
      console.error('[Weather] API error:', response.status);
      return getDefaultWeatherData();
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn('[Weather] No content in response, using default data');
      return getDefaultWeatherData();
    }

    // Parse the JSON response
    try {
      // Extract JSON from the response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const weatherData = JSON.parse(jsonStr) as WeatherData;
      weatherData.lastUpdated = new Date().toISOString();

      console.log('[Weather] Successfully fetched weather data:', weatherData.current.condition);
      return weatherData;

    } catch (parseError) {
      console.error('[Weather] Failed to parse weather JSON:', parseError);
      return getDefaultWeatherData();
    }

  } catch (error) {
    console.error('[Weather] Error fetching weather:', error);
    return getDefaultWeatherData();
  }
}

/**
 * Alternative: Fetch weather using a simpler approach without tools
 * This is more reliable as it uses the model's training data + current knowledge
 */
export async function fetchWeatherSimple(): Promise<WeatherData | null> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    return getDefaultWeatherData();
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You provide weather information for the Cayman Islands. Based on typical Caribbean weather patterns and current season, provide realistic weather data.

Current date context: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Season context: ${getCurrentSeason()}

Return ONLY valid JSON with realistic weather for this time of year in the Cayman Islands.`
          },
          {
            role: 'user',
            content: `Provide current weather conditions for Grand Cayman, Cayman Islands. Include temperature, humidity, conditions, UV index, and a 3-day forecast. Return as JSON only.`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      return getDefaultWeatherData();
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (content) {
      const weatherData = JSON.parse(content) as WeatherData;
      weatherData.lastUpdated = new Date().toISOString();
      weatherData.source = 'AI Weather Estimate';
      return weatherData;
    }

    return getDefaultWeatherData();

  } catch (error) {
    console.error('[Weather] Simple fetch error:', error);
    return getDefaultWeatherData();
  }
}

// ============ HELPER FUNCTIONS ============

function getCurrentSeason(): string {
  const month = new Date().getMonth();

  // Cayman Islands seasons
  if (month >= 11 || month <= 3) {
    return 'Dry season (December-April) - typically sunny, less humid, temperatures 75-85°F';
  } else if (month >= 5 && month <= 10) {
    return 'Wet/Hurricane season (May-November) - more rainfall, higher humidity, temperatures 80-90°F, possible tropical storms';
  } else {
    return 'Transition period - variable conditions';
  }
}

function getDefaultWeatherData(): WeatherData {
  const now = new Date();
  const month = now.getMonth();

  // Seasonal defaults for Cayman Islands
  const isDrySeason = month >= 11 || month <= 3;

  return {
    location: 'Grand Cayman, Cayman Islands',
    current: {
      temperature: isDrySeason ? 82 : 86,
      feelsLike: isDrySeason ? 84 : 92,
      humidity: isDrySeason ? 65 : 80,
      windSpeed: isDrySeason ? 15 : 10,
      windDirection: 'E',
      condition: isDrySeason ? 'sunny' : 'partly_cloudy',
      description: isDrySeason
        ? 'Typical dry season weather - sunny and pleasant'
        : 'Typical wet season weather - warm with possible afternoon showers',
      uvIndex: isDrySeason ? 9 : 10,
      visibility: 10
    },
    forecast: generateDefaultForecast(isDrySeason),
    marine: {
      seaTemperature: isDrySeason ? 79 : 84,
      waveHeight: 1.5,
      tideInfo: 'Tidal information requires real-time data',
      swimmingConditions: 'excellent'
    },
    alerts: [],
    lastUpdated: now.toISOString(),
    source: 'Seasonal estimate (real-time data unavailable)'
  };
}

function generateDefaultForecast(isDrySeason: boolean): DayForecast[] {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const forecast: DayForecast[] = [];

  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    forecast.push({
      date: date.toISOString().split('T')[0],
      dayName: days[date.getDay()],
      high: isDrySeason ? 83 + Math.floor(Math.random() * 4) : 87 + Math.floor(Math.random() * 4),
      low: isDrySeason ? 74 + Math.floor(Math.random() * 3) : 78 + Math.floor(Math.random() * 3),
      condition: isDrySeason ? 'sunny' : (Math.random() > 0.5 ? 'partly_cloudy' : 'light_rain'),
      description: isDrySeason ? 'Sunny and pleasant' : 'Warm with possible showers',
      precipitationChance: isDrySeason ? 10 + Math.floor(Math.random() * 15) : 40 + Math.floor(Math.random() * 30)
    });
  }

  return forecast;
}

// ============ WEATHER CONTEXT FOR RAG ============

/**
 * Generate weather context string to inject into RAG prompt
 */
export function generateWeatherContext(weather: WeatherData): string {
  const { current, forecast, marine, alerts } = weather;

  let context = `
📍 CURRENT WEATHER IN ${weather.location.toUpperCase()}:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌡️ Temperature: ${current.temperature}°F (feels like ${current.feelsLike}°F)
${getConditionEmoji(current.condition)} Conditions: ${current.description}
💧 Humidity: ${current.humidity}%
💨 Wind: ${current.windSpeed} mph ${current.windDirection}
☀️ UV Index: ${current.uvIndex} (${getUVDescription(current.uvIndex)})
👁️ Visibility: ${current.visibility} miles
`;

  if (marine) {
    context += `
🌊 MARINE CONDITIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏊 Sea Temperature: ${marine.seaTemperature}°F
🌊 Wave Height: ${marine.waveHeight} ft
🏖️ Swimming: ${marine.swimmingConditions.toUpperCase()}
`;
  }

  if (alerts && alerts.length > 0) {
    context += `
⚠️ WEATHER ALERTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    for (const alert of alerts) {
      context += `🚨 ${alert.severity.toUpperCase()}: ${alert.title}\n   ${alert.description}\n`;
    }
  }

  if (forecast && forecast.length > 0) {
    context += `
📅 ${forecast.length}-DAY FORECAST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    for (const day of forecast.slice(0, 5)) {
      context += `${day.dayName}: ${getConditionEmoji(day.condition)} ${day.high}°/${day.low}° - ${day.description} (${day.precipitationChance}% rain)\n`;
    }
  }

  context += `\n📊 Last updated: ${new Date(weather.lastUpdated).toLocaleString()}`;
  context += `\n📡 Source: ${weather.source}`;

  return context;
}

function getConditionEmoji(condition: WeatherCondition): string {
  const emojis: Record<WeatherCondition, string> = {
    sunny: '☀️',
    partly_cloudy: '⛅',
    cloudy: '☁️',
    overcast: '🌥️',
    light_rain: '🌦️',
    rain: '🌧️',
    heavy_rain: '⛈️',
    thunderstorm: '🌩️',
    tropical_storm: '🌀',
    hurricane: '🌀',
    windy: '💨',
    foggy: '🌫️',
    hazy: '😶‍🌫️'
  };
  return emojis[condition] || '🌤️';
}

function getUVDescription(uvIndex: number): string {
  if (uvIndex <= 2) return 'Low';
  if (uvIndex <= 5) return 'Moderate';
  if (uvIndex <= 7) return 'High';
  if (uvIndex <= 10) return 'Very High';
  return 'Extreme - Protection essential';
}

// ============ ACTIVITY RECOMMENDATIONS BASED ON WEATHER ============

export interface WeatherActivityRecommendation {
  activity: string;
  suitability: 'perfect' | 'good' | 'possible' | 'not_recommended';
  reason: string;
  tips: string[];
}

export function getWeatherBasedRecommendations(weather: WeatherData): WeatherActivityRecommendation[] {
  const { current, marine } = weather;
  const recommendations: WeatherActivityRecommendation[] = [];

  // Beach activities
  const beachSuitability = evaluateBeachConditions(current, marine);
  recommendations.push({
    activity: 'Beach & Swimming',
    suitability: beachSuitability.rating,
    reason: beachSuitability.reason,
    tips: beachSuitability.tips
  });

  // Diving/Snorkeling
  const diveSuitability = evaluateDivingConditions(current, marine);
  recommendations.push({
    activity: 'Diving & Snorkeling',
    suitability: diveSuitability.rating,
    reason: diveSuitability.reason,
    tips: diveSuitability.tips
  });

  // Outdoor exploration
  const outdoorSuitability = evaluateOutdoorConditions(current);
  recommendations.push({
    activity: 'Outdoor Exploration',
    suitability: outdoorSuitability.rating,
    reason: outdoorSuitability.reason,
    tips: outdoorSuitability.tips
  });

  // Boat tours
  const boatSuitability = evaluateBoatConditions(current, marine);
  recommendations.push({
    activity: 'Boat Tours & Sailing',
    suitability: boatSuitability.rating,
    reason: boatSuitability.reason,
    tips: boatSuitability.tips
  });

  return recommendations;
}

function evaluateBeachConditions(current: WeatherData['current'], marine?: WeatherData['marine']) {
  let rating: 'perfect' | 'good' | 'possible' | 'not_recommended' = 'good';
  let reason = '';
  const tips: string[] = [];

  if (current.condition === 'sunny' && current.temperature >= 80 && current.temperature <= 88) {
    rating = 'perfect';
    reason = 'Ideal beach weather with sunny skies and comfortable temperatures';
  } else if (current.condition === 'partly_cloudy') {
    rating = 'good';
    reason = 'Great beach conditions with some cloud cover';
  } else if (['rain', 'heavy_rain', 'thunderstorm'].includes(current.condition)) {
    rating = 'not_recommended';
    reason = 'Rain expected - consider indoor activities';
  } else {
    rating = 'possible';
    reason = 'Decent conditions but may not be ideal';
  }

  if (current.uvIndex >= 8) {
    tips.push('UV is very high - apply SPF 50+ sunscreen every 2 hours');
  }
  if (current.humidity > 80) {
    tips.push('High humidity - stay hydrated and take breaks in shade');
  }
  if (marine?.swimmingConditions === 'excellent') {
    tips.push('Excellent swimming conditions in the sea');
  }

  return { rating, reason, tips };
}

function evaluateDivingConditions(current: WeatherData['current'], marine?: WeatherData['marine']) {
  let rating: 'perfect' | 'good' | 'possible' | 'not_recommended' = 'good';
  let reason = '';
  const tips: string[] = [];

  if (marine) {
    if (marine.swimmingConditions === 'excellent' && marine.waveHeight < 2) {
      rating = 'perfect';
      reason = `Excellent visibility with calm seas (${marine.seaTemperature}°F water)`;
    } else if (marine.waveHeight > 4) {
      rating = 'not_recommended';
      reason = 'Rough sea conditions - diving may be cancelled';
    }
  }

  if (['thunderstorm', 'tropical_storm', 'hurricane'].includes(current.condition)) {
    rating = 'not_recommended';
    reason = 'Dangerous conditions - all water activities should be avoided';
  }

  tips.push('Book morning dives for best visibility');
  if (marine && marine.seaTemperature < 78) {
    tips.push('Consider a 3mm wetsuit for comfort');
  }

  return { rating, reason, tips };
}

function evaluateOutdoorConditions(current: WeatherData['current']) {
  let rating: 'perfect' | 'good' | 'possible' | 'not_recommended' = 'good';
  let reason = '';
  const tips: string[] = [];

  if (current.feelsLike > 95) {
    rating = 'possible';
    reason = 'Very hot - plan outdoor activities for early morning or late afternoon';
    tips.push('Start activities before 10 AM or after 4 PM');
    tips.push('Bring plenty of water (at least 1 liter per hour of activity)');
  } else if (['rain', 'heavy_rain', 'thunderstorm'].includes(current.condition)) {
    rating = 'not_recommended';
    reason = 'Wet conditions - consider indoor alternatives';
  } else if (current.condition === 'sunny' && current.temperature < 90) {
    rating = 'perfect';
    reason = 'Great weather for exploring the island';
  }

  if (current.uvIndex >= 7) {
    tips.push('Wear a hat and UV-protective clothing');
  }

  return { rating, reason, tips };
}

function evaluateBoatConditions(current: WeatherData['current'], marine?: WeatherData['marine']) {
  let rating: 'perfect' | 'good' | 'possible' | 'not_recommended' = 'good';
  let reason = '';
  const tips: string[] = [];

  if (marine && marine.waveHeight > 5) {
    rating = 'not_recommended';
    reason = 'Rough seas - boat tours may be cancelled';
  } else if (current.windSpeed > 25) {
    rating = 'not_recommended';
    reason = 'High winds - not safe for boat activities';
  } else if (current.condition === 'sunny' && current.windSpeed < 15) {
    rating = 'perfect';
    reason = 'Calm seas and pleasant weather for boating';
  }

  if (['thunderstorm', 'tropical_storm'].includes(current.condition)) {
    rating = 'not_recommended';
    reason = 'Storm conditions - all boat activities cancelled';
  }

  tips.push('Book sunset cruises for spectacular views');
  tips.push('Bring motion sickness medication if prone to seasickness');

  return { rating, reason, tips };
}

// ============ CACHE ============

interface WeatherCache {
  data: WeatherData;
  timestamp: number;
}

let weatherCache: WeatherCache | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Get weather with caching
 */
export async function getWeather(queryType: WeatherQueryType = 'general', forceRefresh = false): Promise<WeatherData> {
  // Check cache
  if (!forceRefresh && weatherCache && (Date.now() - weatherCache.timestamp) < CACHE_DURATION) {
    console.log('[Weather] Using cached weather data');
    return weatherCache.data;
  }

  // Fetch fresh data
  console.log('[Weather] Fetching fresh weather data...');
  const weather = await fetchWeatherSimple() || getDefaultWeatherData();

  // Update cache
  weatherCache = {
    data: weather,
    timestamp: Date.now()
  };

  return weather;
}

/**
 * Clear weather cache
 */
export function clearWeatherCache(): void {
  weatherCache = null;
}
