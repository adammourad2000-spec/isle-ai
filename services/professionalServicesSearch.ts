/**
 * Professional Services Search Service
 * AI-powered search for legal, banking, accounting, and corporate services
 * Supports international investors establishing presence in Cayman Islands
 */

import {
  ProfessionalService,
  ProfessionalServiceType,
  BusinessIntent,
  EntityType,
  FundType,
  BusinessFormationQuery,
  ProfessionalServiceRecommendation,
  BusinessFormationPackage,
  CAYMAN_BUSINESS_ADVANTAGES,
  ENTITY_FORMATION_REQUIREMENTS,
  PROFESSIONAL_SERVICE_CATEGORIES,
} from '../types/professionalServices';

class ProfessionalServicesSearchService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private cache: Map<string, ProfessionalService[]> = new Map();
  private cacheExpiry = 7200000; // 2 hours for professional services

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  }

  /**
   * Detect business intent from user query
   */
  detectBusinessIntent(query: string): BusinessIntent | null {
    const lowerQuery = query.toLowerCase();

    // Company formation
    if (
      /\b(form|create|establish|incorporate|set up|register)\b.*\b(company|corporation|business|entity|llc|firm)\b/i.test(
        query
      ) ||
      /\b(company|corporation|entity)\b.*\b(formation|registration|incorporation)\b/i.test(query)
    ) {
      return 'form_company';
    }

    // Fund establishment
    if (
      /\b(establish|create|set up|launch|form)\b.*\b(fund|hedge fund|private equity|investment fund)\b/i.test(
        query
      ) ||
      /\b(fund|hedge fund)\b.*\b(formation|establishment|launch)\b/i.test(query)
    ) {
      return 'establish_fund';
    }

    // Banking
    if (
      /\b(open|establish)\b.*\b(bank account|banking|account)\b/i.test(query) ||
      /\bbank\b.*\b(account|services|relationship)\b/i.test(query) ||
      /\bbanking\b/i.test(query)
    ) {
      return 'open_bank_account';
    }

    // Tax planning
    if (
      /\b(tax|taxation|fiscal)\b.*\b(planning|optimization|structure|advice|advisory)\b/i.test(
        query
      ) ||
      /\b(offshore|tax haven|tax efficient)\b/i.test(query) ||
      /\b(paradis fiscal|tax paradise)\b/i.test(query)
    ) {
      return 'tax_planning';
    }

    // Legal advice
    if (
      /\b(lawyer|attorney|legal|law firm|legal advice|legal counsel)\b/i.test(query) ||
      /\b(avocat|cabinet d'avocats|conseil juridique)\b/i.test(query) ||
      /\b(corporate law|business law|commercial law)\b/i.test(query)
    ) {
      return 'legal_advice';
    }

    // Accounting
    if (
      /\b(accountant|accounting|auditor|audit|bookkeeping)\b/i.test(query) ||
      /\b(comptable|expert comptable|audit)\b/i.test(query) ||
      /\b(big 4|accounting firm)\b/i.test(query)
    ) {
      return 'accounting_services';
    }

    // Trust establishment
    if (/\b(trust|fiduciary|trustee)\b/i.test(query)) {
      return 'establish_trust';
    }

    // Wealth management
    if (
      /\b(wealth management|asset management|private banking|investment advisor)\b/i.test(
        query
      )
    ) {
      return 'wealth_management';
    }

    // Regulatory compliance
    if (/\b(compliance|regulatory|license|licensing|CIMA)\b/i.test(query)) {
      return 'regulatory_compliance';
    }

    // License acquisition
    if (/\b(license|licensing|permit|authorization)\b/i.test(query)) {
      return 'acquire_license';
    }

    return null;
  }

  /**
   * Detect entity type from query
   */
  detectEntityType(query: string): EntityType | null {
    const lowerQuery = query.toLowerCase();

    if (/\b(exempted company|exempt company)\b/i.test(query)) return 'exempted_company';
    if (/\b(llc|limited liability company)\b/i.test(query)) return 'llc';
    if (/\b(limited partnership|lp)\b/i.test(query)) return 'limited_partnership';
    if (/\b(foundation)\b/i.test(query)) return 'foundation';
    if (/\b(trust)\b/i.test(query)) return 'trust';
    if (/\b(spc|segregated portfolio)\b/i.test(query)) return 'segregated_portfolio_company';
    if (/\b(unit trust)\b/i.test(query)) return 'unit_trust';

    return null;
  }

  /**
   * Detect fund type from query
   */
  detectFundType(query: string): FundType | null {
    const lowerQuery = query.toLowerCase();

    if (/\b(hedge fund)\b/i.test(query)) return 'hedge_fund';
    if (/\b(private equity|pe fund)\b/i.test(query)) return 'private_equity_fund';
    if (/\b(mutual fund)\b/i.test(query)) return 'mutual_fund';
    if (/\b(venture capital|vc fund)\b/i.test(query)) return 'venture_capital_fund';
    if (/\b(real estate fund|reif)\b/i.test(query)) return 'real_estate_fund';
    if (/\b(master[- ]feeder)\b/i.test(query)) return 'master_feeder_structure';

    return null;
  }

  /**
   * Parse business formation query
   */
  parseBusinessQuery(query: string): BusinessFormationQuery | null {
    const intent = this.detectBusinessIntent(query);
    if (!intent) return null;

    return {
      intent,
      entityType: this.detectEntityType(query) || undefined,
      fundType: this.detectFundType(query) || undefined,
      jurisdiction: 'Cayman Islands',
    };
  }

  /**
   * Search professional services using OpenAI with web search
   */
  async searchProfessionalServices(
    query: string,
    serviceTypes?: ProfessionalServiceType[]
  ): Promise<ProfessionalService[]> {
    const cacheKey = `${query}-${serviceTypes?.join(',')}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      // Build search query for OpenAI
      const searchQuery = this.buildProfessionalSearchQuery(query, serviceTypes);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert on Cayman Islands professional services for international business formation.
              Search and return information about law firms, accounting firms, banks, trust companies, and corporate service providers in the Cayman Islands.
              Focus on reputable, licensed, and well-established firms.
              Return data in valid JSON format matching the ProfessionalService interface.
              Include contact information, specialties, credentials, and reputation.`,
            },
            {
              role: 'user',
              content: searchQuery,
            },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        console.error('OpenAI API error:', response.statusText);
        return this.getFallbackServices(serviceTypes);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        return this.getFallbackServices(serviceTypes);
      }

      // Parse JSON response
      const services = this.parseServicesFromResponse(content);

      // Cache results
      this.cache.set(cacheKey, services);
      setTimeout(() => this.cache.delete(cacheKey), this.cacheExpiry);

      return services;
    } catch (error) {
      console.error('Professional services search error:', error);
      return this.getFallbackServices(serviceTypes);
    }
  }

  /**
   * Build search query for professional services
   */
  private buildProfessionalSearchQuery(
    query: string,
    serviceTypes?: ProfessionalServiceType[]
  ): string {
    let searchQuery = `Find professional services in the Cayman Islands for: "${query}"\n\n`;

    if (serviceTypes && serviceTypes.length > 0) {
      searchQuery += `Focus on these service types: ${serviceTypes.join(', ')}\n\n`;
    }

    searchQuery += `Please include:\n`;
    searchQuery += `- Top law firms specializing in offshore structures\n`;
    searchQuery += `- Big 4 accounting firms and local alternatives\n`;
    searchQuery += `- Major banks serving international clients\n`;
    searchQuery += `- Trust companies and fiduciary services\n`;
    searchQuery += `- Fund administrators and corporate service providers\n\n`;

    searchQuery += `For each service provider, include:\n`;
    searchQuery += `- Name and description\n`;
    searchQuery += `- Specialties and practice areas\n`;
    searchQuery += `- Contact information (website, phone, email)\n`;
    searchQuery += `- Location in Cayman Islands\n`;
    searchQuery += `- Professional credentials and memberships\n`;
    searchQuery += `- Recognition and rankings (if available)\n\n`;

    searchQuery += `Return as a JSON array of service providers.`;

    return searchQuery;
  }

  /**
   * Parse services from AI response
   */
  private parseServicesFromResponse(content: string): ProfessionalService[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return this.getFallbackServices();
      }

      const services = JSON.parse(jsonMatch[0]);
      return services.map((s: any) => this.normalizeService(s)).filter(Boolean);
    } catch (error) {
      console.error('Failed to parse services:', error);
      return this.getFallbackServices();
    }
  }

  /**
   * Normalize service data
   */
  private normalizeService(data: any): ProfessionalService | null {
    try {
      return {
        id: data.id || `service-${Date.now()}-${Math.random()}`,
        type: data.type || 'law_firm',
        name: data.name || 'Professional Service Provider',
        description: data.description || '',
        shortDescription: data.shortDescription || data.description?.slice(0, 150) || '',
        specialties: data.specialties || [],
        practiceAreas: data.practiceAreas || [],
        location: {
          address: data.location?.address || 'Grand Cayman',
          district: data.location?.district || 'George Town',
          island: 'Grand Cayman',
          coordinates: data.location?.coordinates,
        },
        contact: {
          phone: data.contact?.phone,
          email: data.contact?.email,
          website: data.contact?.website,
          bookingUrl: data.contact?.bookingUrl,
        },
        credentials: {
          licenses: data.credentials?.licenses || [],
          certifications: data.credentials?.certifications || [],
          memberships: data.credentials?.memberships || [],
          regulatedBy: data.credentials?.regulatedBy || ['CIMA'],
          yearsEstablished: data.credentials?.yearsEstablished,
        },
        team: data.team,
        services: data.services || [],
        clientProfile: data.clientProfile,
        ratings: data.ratings,
        media: {
          logo: data.media?.logo,
          thumbnail: data.media?.thumbnail,
          images: data.media?.images || [],
        },
        tags: data.tags || [],
        keywords: data.keywords || [],
        isFeatured: data.isFeatured,
        isPremium: data.isPremium,
        verified: data.verified !== false,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to normalize service:', error);
      return null;
    }
  }

  /**
   * Get smart recommendations based on business query
   */
  async getBusinessRecommendations(
    query: string,
    limit: number = 5
  ): Promise<ProfessionalServiceRecommendation[]> {
    const businessQuery = this.parseBusinessQuery(query);
    if (!businessQuery) return [];

    // Determine service types needed
    const serviceTypes = this.getRecommendedServiceTypes(businessQuery);

    // Search services
    const services = await this.searchProfessionalServices(query, serviceTypes);

    // Score and rank
    const recommendations = services
      .map(service => ({
        service,
        relevanceScore: this.calculateServiceRelevance(service, businessQuery),
        reason: this.generateRecommendationReason(service, businessQuery),
        matchedSpecialties: service.specialties,
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    return recommendations;
  }

  /**
   * Get recommended service types based on business intent
   */
  private getRecommendedServiceTypes(query: BusinessFormationQuery): ProfessionalServiceType[] {
    const types: ProfessionalServiceType[] = [];

    switch (query.intent) {
      case 'form_company':
      case 'establish_fund':
        types.push('law_firm', 'corporate_services', 'accounting_firm');
        break;
      case 'open_bank_account':
        types.push('bank', 'law_firm');
        break;
      case 'tax_planning':
        types.push('tax_advisor', 'accounting_firm', 'law_firm');
        break;
      case 'legal_advice':
        types.push('law_firm');
        break;
      case 'accounting_services':
        types.push('accounting_firm');
        break;
      case 'establish_trust':
        types.push('trust_company', 'law_firm');
        break;
      case 'wealth_management':
        types.push('wealth_management', 'investment_advisor', 'bank');
        break;
      case 'regulatory_compliance':
        types.push('law_firm', 'corporate_services', 'regulatory_compliance');
        break;
      case 'acquire_license':
        types.push('law_firm', 'regulatory_compliance');
        break;
      default:
        types.push('law_firm', 'accounting_firm', 'corporate_services');
    }

    return types;
  }

  /**
   * Calculate service relevance score
   */
  private calculateServiceRelevance(
    service: ProfessionalService,
    query: BusinessFormationQuery
  ): number {
    let score = 0;

    // Type match
    const recommendedTypes = this.getRecommendedServiceTypes(query);
    if (recommendedTypes.includes(service.type)) score += 30;

    // Specialty match
    if (query.fundType && service.specialties.includes('hedge_funds')) score += 20;
    if (query.entityType && service.practiceAreas.includes('corporate')) score += 15;

    // Credentials
    if (service.credentials.memberships.length > 0) score += 10;
    if (service.credentials.yearsEstablished && service.credentials.yearsEstablished > 10)
      score += 10;

    // Verification
    if (service.verified) score += 10;
    if (service.isFeatured) score += 5;

    return score;
  }

  /**
   * Generate recommendation reason
   */
  private generateRecommendationReason(
    service: ProfessionalService,
    query: BusinessFormationQuery
  ): string {
    const reasons: string[] = [];

    if (service.specialties.length > 0) {
      reasons.push(`specialized in ${service.specialties.slice(0, 2).join(' and ')}`);
    }

    if (service.credentials.yearsEstablished) {
      reasons.push(`established ${new Date().getFullYear() - service.credentials.yearsEstablished} years`);
    }

    if (service.credentials.memberships.length > 0) {
      reasons.push('highly credentialed');
    }

    return reasons.length > 0
      ? `Recommended for ${query.intent}: ${reasons.join(', ')}`
      : `Top provider for ${query.intent}`;
  }

  /**
   * Create business formation package
   */
  async createFormationPackage(
    entityType: EntityType,
    budget?: string
  ): Promise<BusinessFormationPackage | null> {
    const requirements = ENTITY_FORMATION_REQUIREMENTS[entityType];
    if (!requirements) return null;

    // Search for required services
    const services = await this.searchProfessionalServices(
      `${entityType} formation services`,
      ['law_firm', 'corporate_services', 'accounting_firm']
    );

    if (services.length === 0) return null;

    return {
      title: `${entityType.replace(/_/g, ' ').toUpperCase()} Formation Package`,
      description: requirements.description,
      entityType,
      services: [
        {
          serviceType: 'law_firm',
          provider: services.find(s => s.type === 'law_firm') || services[0],
          cost: '$5,000 - $15,000',
        },
        {
          serviceType: 'corporate_services',
          provider:
            services.find(s => s.type === 'corporate_services') ||
            services.find(s => s.type === 'law_firm') ||
            services[0],
          cost: '$2,000 - $5,000',
        },
      ],
      totalCost: '$7,000 - $20,000',
      timeline: requirements.timeToForm,
      steps: [
        'Initial consultation with legal advisor',
        'Choose entity structure and jurisdiction',
        'Prepare incorporation documents',
        'Submit to Registrar of Companies',
        'Obtain certificate of incorporation',
        'Open corporate bank account',
        'Register with CIMA (if applicable)',
        'Ongoing compliance and reporting',
      ],
    };
  }

  /**
   * Fallback services for demo/offline mode
   */
  private getFallbackServices(types?: ProfessionalServiceType[]): ProfessionalService[] {
    const allServices: ProfessionalService[] = [
      // Law Firms
      {
        id: 'maples-group',
        type: 'law_firm',
        name: 'Maples Group',
        description:
          'Leading international law firm specializing in the laws of the Cayman Islands, Ireland, and BVI. Premier choice for hedge funds, private equity, and complex offshore structures.',
        shortDescription: 'Premier offshore law firm with global presence',
        specialties: ['offshore_structures', 'hedge_funds', 'private_equity', 'ipos_listings'],
        practiceAreas: [
          'Investment Funds',
          'Corporate & Commercial',
          'Banking & Finance',
          'Insolvency & Restructuring',
        ],
        location: {
          address: 'PO Box 309, Ugland House, Grand Cayman KY1-1104',
          district: 'George Town',
          island: 'Grand Cayman',
        },
        contact: {
          phone: '+1 345-949-8066',
          website: 'https://www.maples.com',
          email: 'cayman@maples.com',
        },
        credentials: {
          licenses: ['Cayman Islands Law License'],
          certifications: [],
          memberships: ['Cayman Islands Law Society'],
          regulatedBy: ['CIMA'],
          yearsEstablished: 1950,
        },
        team: {
          totalProfessionals: 200,
          partners: 50,
          languages: ['English', 'Chinese', 'Spanish'],
        },
        services: [
          {
            category: 'Investment Funds',
            offerings: [
              'Hedge fund formation',
              'Private equity structures',
              'UCITS and AIFs',
              'Fund restructurings',
            ],
          },
        ],
        ratings: {
          overall: 5,
          reviewCount: 250,
          awards: ['Chambers Global', 'Legal 500', 'IFLR1000'],
          rankings: ['Tier 1 - Chambers Global', 'Top Ranked - Legal 500'],
        },
        media: {
          thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
        },
        tags: ['offshore', 'hedge funds', 'private equity', 'top-tier'],
        keywords: ['maples', 'law', 'offshore', 'cayman'],
        isFeatured: true,
        verified: true,
        lastUpdated: new Date().toISOString(),
      },
      // Accounting
      {
        id: 'deloitte-cayman',
        type: 'accounting_firm',
        name: 'Deloitte Cayman Islands',
        description:
          'Big Four accounting firm providing audit, tax, consulting, and advisory services to international businesses and investment funds in the Cayman Islands.',
        shortDescription: 'Big Four accounting with global reach',
        specialties: ['hedge_funds', 'banking_finance', 'tax_planning', 'regulatory_licensing'],
        practiceAreas: ['Audit & Assurance', 'Tax Advisory', 'Financial Advisory', 'Risk Advisory'],
        location: {
          address: 'One Capital Place, Grand Cayman KY1-1107',
          district: 'George Town',
          island: 'Grand Cayman',
        },
        contact: {
          phone: '+1 345-949-7500',
          website: 'https://www.deloitte.com/ky',
          email: 'cayman@deloitte.com',
        },
        credentials: {
          licenses: ['CIMA Licensed'],
          certifications: ['Big Four'],
          memberships: ['Cayman Islands Institute of Professional Accountants'],
          regulatedBy: ['CIMA'],
          yearsEstablished: 1967,
        },
        team: {
          totalProfessionals: 150,
          partners: 15,
          languages: ['English'],
        },
        services: [
          {
            category: 'Fund Services',
            offerings: [
              'Fund audit',
              'Tax compliance',
              'Regulatory reporting',
              'AML compliance',
            ],
          },
        ],
        ratings: {
          overall: 4.8,
          reviewCount: 180,
        },
        media: {
          thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
        },
        tags: ['big four', 'audit', 'tax', 'compliance'],
        keywords: ['deloitte', 'accounting', 'audit'],
        isFeatured: true,
        verified: true,
        lastUpdated: new Date().toISOString(),
      },
      // Bank
      {
        id: 'butterfield-bank',
        type: 'bank',
        name: 'Butterfield Bank',
        description:
          'Full-service bank providing corporate banking, trust services, and wealth management to international clients. Established presence in Cayman Islands for over 50 years.',
        shortDescription: 'Premier private bank for international clients',
        specialties: ['banking_finance', 'trusts_estates', 'asset_protection'],
        practiceAreas: ['Corporate Banking', 'Private Banking', 'Trust Services', 'Custody'],
        location: {
          address: '65 Market Street, Grand Cayman KY1-1205',
          district: 'George Town',
          island: 'Grand Cayman',
        },
        contact: {
          phone: '+1 345-949-7055',
          website: 'https://www.butterfieldgroup.com',
          email: 'cayman@butterfieldgroup.com',
        },
        credentials: {
          licenses: ['CIMA Banking License'],
          certifications: [],
          memberships: ['Cayman Islands Bankers Association'],
          regulatedBy: ['CIMA'],
          yearsEstablished: 1965,
        },
        team: {
          totalProfessionals: 100,
          languages: ['English', 'Spanish', 'Portuguese'],
        },
        services: [
          {
            category: 'Corporate Banking',
            offerings: ['Business accounts', 'Trade finance', 'FX services', 'Treasury services'],
          },
        ],
        ratings: {
          overall: 4.7,
          reviewCount: 120,
        },
        media: {
          thumbnail: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=800',
        },
        tags: ['banking', 'private bank', 'trust services'],
        keywords: ['butterfield', 'bank', 'cayman'],
        isFeatured: true,
        verified: true,
        lastUpdated: new Date().toISOString(),
      },
    ];

    // Filter by types if provided
    if (types && types.length > 0) {
      return allServices.filter(s => types.includes(s.type));
    }

    return allServices;
  }
}

export const professionalServicesSearch = new ProfessionalServicesSearchService();

// Helper function to generate business formation guide
export function generateBusinessGuide(intent: BusinessIntent): string {
  const advantages = CAYMAN_BUSINESS_ADVANTAGES;

  let guide = `# Setting Up Business in the Cayman Islands\n\n`;

  guide += `## Why Choose Cayman Islands?\n\n`;
  guide += `**Tax Advantages:**\n`;
  advantages.taxation.forEach(adv => {
    guide += `- ${adv}\n`;
  });

  guide += `\n**Regulatory Framework:**\n`;
  advantages.regulatory.forEach(adv => {
    guide += `- ${adv}\n`;
  });

  guide += `\n**Infrastructure:**\n`;
  advantages.infrastructure.forEach(adv => {
    guide += `- ${adv}\n`;
  });

  guide += `\n**Global Reputation:**\n`;
  advantages.reputation.forEach(adv => {
    guide += `- ${adv}\n`;
  });

  return guide;
}
