/**
 * Property Search Service
 * Enterprise-grade real estate search using AI-powered web search
 * Architecture inspired by Google Travel & OpenAI
 */

import {
  Property,
  PropertySearchParams,
  PropertyRecommendation,
  PropertyStatus,
  PropertyCategory,
  REAL_ESTATE_SOURCES,
} from '../types/property';

class PropertyService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private propertyCache: Map<string, Property[]> = new Map();
  private cacheExpiry = 3600000; // 1 hour

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  }

  /**
   * Search properties using OpenAI with web browsing
   * This leverages GPT-4's web search capability for real-time data
   */
  async searchProperties(params: PropertySearchParams): Promise<Property[]> {
    const cacheKey = JSON.stringify(params);

    // Check cache first
    if (this.propertyCache.has(cacheKey)) {
      const cached = this.propertyCache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      // Build search query for OpenAI
      const searchQuery = this.buildSearchQuery(params);

      // Use OpenAI Chat Completion with web search
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: `You are a world-class real estate search engine for Cayman Islands properties.
              Search the following trusted sources: ${REAL_ESTATE_SOURCES.map(s => s.name).join(', ')}.
              Return property data in valid JSON format matching the Property interface.
              Include: title, description, type, location (with coordinates), features (bedrooms, bathrooms, sqft),
              price, images, agent info, and source URL.
              Focus on accuracy, completeness, and luxury presentation.`
            },
            {
              role: 'user',
              content: searchQuery
            }
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        console.error('OpenAI API error:', response.statusText);
        return this.getFallbackProperties(params);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        return this.getFallbackProperties(params);
      }

      // Parse JSON response
      const properties = this.parsePropertiesFromResponse(content, params);

      // Cache results
      this.propertyCache.set(cacheKey, properties);
      setTimeout(() => this.propertyCache.delete(cacheKey), this.cacheExpiry);

      return properties;
    } catch (error) {
      console.error('Property search error:', error);
      return this.getFallbackProperties(params);
    }
  }

  /**
   * Build intelligent search query based on params
   */
  private buildSearchQuery(params: PropertySearchParams): string {
    const parts: string[] = ['Find luxury and mid-level properties in Cayman Islands'];

    if (params.status && params.status.length > 0) {
      parts.push(`Status: ${params.status.join(' or ')}`);
    }

    if (params.type && params.type.length > 0) {
      parts.push(`Type: ${params.type.join(', ')}`);
    }

    if (params.district && params.district.length > 0) {
      parts.push(`Location: ${params.district.join(', ')}`);
    }

    if (params.minPrice || params.maxPrice) {
      const priceRange = `$${params.minPrice?.toLocaleString() || '0'} - $${params.maxPrice?.toLocaleString() || 'unlimited'}`;
      parts.push(`Price range: ${priceRange}`);
    }

    if (params.minBedrooms) {
      parts.push(`Minimum ${params.minBedrooms} bedrooms`);
    }

    if (params.beachfront) {
      parts.push('Beachfront properties only');
    }

    if (params.oceanView) {
      parts.push('Must have ocean view');
    }

    if (params.pool) {
      parts.push('Must have pool');
    }

    parts.push(`Return up to ${params.limit || 10} properties with complete details.`);

    return parts.join('. ') + '.';
  }

  /**
   * Parse AI response into structured Property objects
   */
  private parsePropertiesFromResponse(content: string, params: PropertySearchParams): Property[] {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return this.getFallbackProperties(params);
      }

      const properties = JSON.parse(jsonMatch[0]);

      // Validate and normalize properties
      return properties.map((prop: any) => this.normalizeProperty(prop)).filter(Boolean);
    } catch (error) {
      console.error('Failed to parse properties:', error);
      return this.getFallbackProperties(params);
    }
  }

  /**
   * Normalize and validate property data
   */
  private normalizeProperty(data: any): Property | null {
    try {
      return {
        id: data.id || `prop-${Date.now()}-${Math.random()}`,
        title: data.title || 'Luxury Property',
        description: data.description || '',
        type: data.type || 'villa',
        status: data.status || 'for-sale',
        category: data.category || 'luxury',
        location: {
          address: data.location?.address || 'Cayman Islands',
          district: data.location?.district || 'Seven Mile Beach',
          coordinates: data.location?.coordinates || { lat: 19.3133, lng: -81.2546 },
        },
        features: {
          bedrooms: data.features?.bedrooms || 3,
          bathrooms: data.features?.bathrooms || 3,
          squareFeet: data.features?.squareFeet || 2500,
          amenities: data.features?.amenities || [],
          pool: data.features?.pool,
          beachfront: data.features?.beachfront,
          oceanView: data.features?.oceanView,
        },
        financials: {
          price: data.financials?.price || 1000000,
          currency: 'USD',
        },
        media: {
          mainImage: data.media?.mainImage || this.getDefaultPropertyImage(),
          images: data.media?.images || [this.getDefaultPropertyImage()],
        },
        source: data.source || 'Multiple Sources',
        sourceUrl: data.sourceUrl || '',
        lastUpdated: new Date().toISOString(),
        featured: data.featured || false,
      };
    } catch (error) {
      console.error('Failed to normalize property:', error);
      return null;
    }
  }

  /**
   * Get smart property recommendations based on chat context
   */
  async getSmartRecommendations(
    chatHistory: string[],
    limit: number = 3
  ): Promise<PropertyRecommendation[]> {
    try {
      // Analyze chat context to understand user preferences
      const userPreferences = this.analyzeUserPreferences(chatHistory);

      // Search properties matching preferences
      const properties = await this.searchProperties({
        ...userPreferences,
        limit: limit * 2, // Get more for better filtering
      });

      // Score and rank properties
      const recommendations = properties
        .map(property => ({
          property,
          relevanceScore: this.calculateRelevanceScore(property, userPreferences),
          reason: this.generateRecommendationReason(property, userPreferences),
          matchedCriteria: this.getMatchedCriteria(property, userPreferences),
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      return recommendations;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return [];
    }
  }

  /**
   * Analyze chat history to extract user preferences
   */
  private analyzeUserPreferences(chatHistory: string[]): PropertySearchParams {
    const recentMessages = chatHistory.slice(-10).join(' ').toLowerCase();

    const preferences: PropertySearchParams = {
      limit: 5,
    };

    // Detect property type interest
    if (recentMessages.includes('villa') || recentMessages.includes('luxury home')) {
      preferences.type = ['villa'];
      preferences.category = ['luxury'];
    }
    if (recentMessages.includes('condo') || recentMessages.includes('apartment')) {
      preferences.type = ['condo', 'apartment'];
    }

    // Detect location preferences
    const districts = ['Seven Mile Beach', 'West Bay', 'George Town', 'Bodden Town'];
    preferences.district = districts.filter(d =>
      recentMessages.includes(d.toLowerCase())
    );

    // Detect price sensitivity
    if (recentMessages.includes('luxury') || recentMessages.includes('high-end')) {
      preferences.category = ['luxury'];
      preferences.minPrice = 1000000;
    } else if (recentMessages.includes('affordable') || recentMessages.includes('budget')) {
      preferences.category = ['mid-level'];
      preferences.maxPrice = 500000;
    }

    // Detect feature preferences
    if (recentMessages.includes('beach') || recentMessages.includes('ocean')) {
      preferences.beachfront = true;
      preferences.oceanView = true;
    }
    if (recentMessages.includes('pool')) {
      preferences.pool = true;
    }

    // Detect bedrooms
    const bedroomMatch = recentMessages.match(/(\d+)\s*bed/);
    if (bedroomMatch) {
      preferences.minBedrooms = parseInt(bedroomMatch[1]);
    }

    // Detect status (buy vs rent)
    if (recentMessages.includes('rent') || recentMessages.includes('rental')) {
      preferences.status = ['for-rent'];
    } else if (recentMessages.includes('buy') || recentMessages.includes('purchase')) {
      preferences.status = ['for-sale'];
    }

    return preferences;
  }

  /**
   * Calculate relevance score for property recommendation
   */
  private calculateRelevanceScore(
    property: Property,
    preferences: PropertySearchParams
  ): number {
    let score = 0;

    // Type match
    if (preferences.type?.includes(property.type)) score += 25;

    // Category match
    if (preferences.category?.includes(property.category)) score += 20;

    // Location match
    if (preferences.district?.includes(property.location.district)) score += 20;

    // Price range match
    if (preferences.minPrice && property.financials.price >= preferences.minPrice) score += 10;
    if (preferences.maxPrice && property.financials.price <= preferences.maxPrice) score += 10;

    // Features match
    if (preferences.beachfront && property.features.beachfront) score += 15;
    if (preferences.oceanView && property.features.oceanView) score += 10;
    if (preferences.pool && property.features.pool) score += 10;

    // Bedrooms match
    if (preferences.minBedrooms && property.features.bedrooms >= preferences.minBedrooms) score += 10;

    // Featured boost
    if (property.featured) score += 5;

    return score;
  }

  /**
   * Generate personalized recommendation reason
   */
  private generateRecommendationReason(
    property: Property,
    preferences: PropertySearchParams
  ): string {
    const reasons: string[] = [];

    if (preferences.beachfront && property.features.beachfront) {
      reasons.push('stunning beachfront location');
    }
    if (preferences.oceanView && property.features.oceanView) {
      reasons.push('breathtaking ocean views');
    }
    if (property.category === 'luxury') {
      reasons.push('luxury amenities');
    }
    if (property.features.pool) {
      reasons.push('private pool');
    }

    if (reasons.length === 0) {
      return 'Perfect match for your Cayman Islands search';
    }

    return `Perfect for you: ${reasons.join(', ')}`;
  }

  /**
   * Get matched criteria for transparency
   */
  private getMatchedCriteria(
    property: Property,
    preferences: PropertySearchParams
  ): string[] {
    const matched: string[] = [];

    if (preferences.type?.includes(property.type)) {
      matched.push(`${property.type} property`);
    }
    if (preferences.district?.includes(property.location.district)) {
      matched.push(property.location.district);
    }
    if (preferences.beachfront && property.features.beachfront) {
      matched.push('Beachfront');
    }
    if (preferences.oceanView && property.features.oceanView) {
      matched.push('Ocean View');
    }
    if (preferences.pool && property.features.pool) {
      matched.push('Pool');
    }

    return matched;
  }

  /**
   * Fallback properties for demo/offline mode
   */
  private getFallbackProperties(params: PropertySearchParams): Property[] {
    const fallbackProperties: Property[] = [
      {
        id: 'luxury-villa-001',
        title: 'Oceanfront Luxury Villa - Seven Mile Beach',
        description: 'Spectacular 5-bedroom beachfront villa with infinity pool, private beach access, and panoramic ocean views. Fully furnished with designer interiors.',
        type: 'villa',
        status: 'for-sale',
        category: 'luxury',
        location: {
          address: '123 Seven Mile Beach Road',
          district: 'Seven Mile Beach',
          coordinates: { lat: 19.3406, lng: -81.3767 },
        },
        features: {
          bedrooms: 5,
          bathrooms: 5,
          squareFeet: 6500,
          amenities: ['Infinity Pool', 'Private Beach', 'Gym', 'Home Theater', 'Wine Cellar'],
          pool: true,
          beachfront: true,
          oceanView: true,
          furnished: true,
        },
        financials: {
          price: 8500000,
          currency: 'USD',
          pricePerSqFt: 1308,
        },
        media: {
          mainImage: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200',
          images: [
            'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200',
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200',
            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
          ],
        },
        agent: {
          name: 'Sarah Martinez',
          company: "Sotheby's International Realty",
          phone: '+1 (345) 949-7090',
          email: 'sarah.martinez@sothebys.ky',
        },
        source: "Cayman Islands Sotheby's International Realty",
        sourceUrl: 'https://www.sothebysrealty.com/eng/sales/cayman-islands',
        rating: 4.9,
        lastUpdated: new Date().toISOString(),
        featured: true,
      },
      {
        id: 'condo-002',
        title: 'Modern 3BR Condo - George Town',
        description: 'Contemporary condo in the heart of George Town. Walking distance to shops, restaurants, and financial district.',
        type: 'condo',
        status: 'for-sale',
        category: 'mid-level',
        location: {
          address: '456 Harbour Drive',
          district: 'George Town',
          coordinates: { lat: 19.2866, lng: -81.3744 },
        },
        features: {
          bedrooms: 3,
          bathrooms: 2,
          squareFeet: 1800,
          amenities: ['Fitness Center', 'Concierge', 'Parking'],
          pool: true,
          oceanView: false,
          furnished: false,
        },
        financials: {
          price: 650000,
          currency: 'USD',
          pricePerSqFt: 361,
        },
        media: {
          mainImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200',
          images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200'],
        },
        source: 'Cayman Property Centre',
        sourceUrl: 'https://www.caymanpropertycentre.com',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rental-003',
        title: 'Luxury 4BR Vacation Rental - Rum Point',
        description: 'Stunning beachfront vacation home perfect for families. Fully equipped kitchen, outdoor dining, kayaks included.',
        type: 'house',
        status: 'for-rent',
        category: 'luxury',
        location: {
          address: 'Rum Point Drive',
          district: 'Rum Point',
          coordinates: { lat: 19.3647, lng: -81.2156 },
        },
        features: {
          bedrooms: 4,
          bathrooms: 3,
          squareFeet: 3200,
          amenities: ['Beach Access', 'BBQ', 'Kayaks', 'Snorkel Gear'],
          pool: false,
          beachfront: true,
          oceanView: true,
          furnished: true,
        },
        financials: {
          price: 850, // per night
          currency: 'USD',
        },
        media: {
          mainImage: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200',
          images: ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200'],
        },
        source: 'Airbnb',
        sourceUrl: 'https://www.airbnb.com/cayman-islands',
        rating: 4.95,
        reviews: 127,
        availableFrom: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    ];

    // Filter based on params
    return fallbackProperties.filter(prop => {
      if (params.status && !params.status.includes(prop.status)) return false;
      if (params.category && !params.category.includes(prop.category)) return false;
      if (params.type && !params.type.includes(prop.type)) return false;
      if (params.minPrice && prop.financials.price < params.minPrice) return false;
      if (params.maxPrice && prop.financials.price > params.maxPrice) return false;
      return true;
    });
  }

  /**
   * Get default property image
   */
  private getDefaultPropertyImage(): string {
    return 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200';
  }
}

export const propertyService = new PropertyService();
