/**
 * Professional Services Types - Cayman Islands
 * Legal, Banking, Accounting, and Corporate Services
 * Supporting international investment and business formation
 */

export type ProfessionalServiceType =
  | 'law_firm'                    // Cabinets d'avocats
  | 'accounting_firm'             // Cabinets d'expertise comptable
  | 'bank'                        // Banques
  | 'trust_company'               // Sociétés de fiducie
  | 'corporate_services'          // Services aux entreprises
  | 'fund_administrator'          // Administrateurs de fonds
  | 'investment_advisor'          // Conseillers en investissement
  | 'tax_advisor'                 // Conseillers fiscaux
  | 'company_formation'           // Formation de sociétés
  | 'regulatory_compliance'       // Conformité réglementaire
  | 'wealth_management'           // Gestion de patrimoine
  | 'insurance_services';         // Services d'assurance

export type ServiceSpecialty =
  | 'offshore_structures'         // Structures offshore
  | 'hedge_funds'                 // Hedge funds
  | 'private_equity'              // Private equity
  | 'real_estate_funds'           // Fonds immobiliers
  | 'ipos_listings'               // IPO et cotations
  | 'mergers_acquisitions'        // Fusions & acquisitions
  | 'banking_finance'             // Banque et finance
  | 'insurance_reinsurance'       // Assurance et réassurance
  | 'trusts_estates'              // Trusts et successions
  | 'corporate_governance'        // Gouvernance d'entreprise
  | 'regulatory_licensing'        // Licences réglementaires
  | 'tax_planning'                // Planification fiscale
  | 'asset_protection'            // Protection des actifs
  | 'captive_insurance'           // Assurance captive
  | 'spvs_spcs';                  // SPV et SPC

export interface ProfessionalService {
  id: string;
  type: ProfessionalServiceType;
  name: string;
  description: string;
  shortDescription: string;

  // Specialties
  specialties: ServiceSpecialty[];
  practiceAreas: string[];

  // Location & Contact
  location: {
    address: string;
    district: string;
    island: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  contact: {
    phone?: string;
    email?: string;
    website?: string;
    bookingUrl?: string;
  };

  // Credentials
  credentials: {
    licenses: string[];              // Licences professionnelles
    certifications: string[];        // Certifications
    memberships: string[];           // Adhésions professionnelles
    regulatedBy: string[];           // Organismes de régulation
    yearsEstablished?: number;       // Année de création
  };

  // Team & Expertise
  team?: {
    totalProfessionals: number;
    partners?: number;
    languages: string[];             // Langues parlées
  };

  // Services Offered
  services: {
    category: string;
    offerings: string[];
  }[];

  // Client Information
  clientProfile?: {
    typicalClients: string[];        // Types de clients typiques
    jurisdictions: string[];         // Juridictions servies
    minimumEngagement?: string;      // Engagement minimum
  };

  // Ratings & Recognition
  ratings?: {
    overall?: number;
    reviewCount?: number;
    awards?: string[];
    rankings?: string[];             // Ex: Chambers, Legal500
  };

  // Media
  media: {
    logo?: string;
    thumbnail?: string;
    images?: string[];
  };

  // Tags & Keywords
  tags: string[];
  keywords: string[];

  // Metadata
  isFeatured?: boolean;
  isPremium?: boolean;
  verified?: boolean;
  lastUpdated: string;
}

export interface BusinessFormationQuery {
  intent: BusinessIntent;
  entityType?: EntityType;
  fundType?: FundType;
  jurisdiction?: string;
  budget?: string;
  timeline?: string;
  services?: ProfessionalServiceType[];
}

export type BusinessIntent =
  | 'form_company'                // Créer une société
  | 'establish_fund'              // Créer un fonds
  | 'open_bank_account'           // Ouvrir un compte bancaire
  | 'tax_planning'                // Planification fiscale
  | 'regulatory_compliance'       // Conformité réglementaire
  | 'acquire_license'             // Obtenir une licence
  | 'establish_trust'             // Créer un trust
  | 'wealth_management'           // Gestion de patrimoine
  | 'legal_advice'                // Conseil juridique
  | 'accounting_services'         // Services comptables
  | 'general_inquiry';            // Demande générale

export type EntityType =
  | 'exempted_company'            // Société exemptée
  | 'llc'                         // Société à responsabilité limitée
  | 'limited_partnership'         // Société en commandite
  | 'foundation'                  // Fondation
  | 'trust'                       // Trust
  | 'segregated_portfolio_company' // Société à portefeuilles séparés
  | 'unit_trust';                 // Trust d'investissement

export type FundType =
  | 'hedge_fund'                  // Hedge fund
  | 'private_equity_fund'         // Fonds de private equity
  | 'mutual_fund'                 // Fonds commun de placement
  | 'venture_capital_fund'        // Fonds de capital-risque
  | 'real_estate_fund'            // Fonds immobilier
  | 'master_feeder_structure';    // Structure master-feeder

export interface ProfessionalServiceRecommendation {
  service: ProfessionalService;
  relevanceScore: number;
  reason: string;
  matchedSpecialties: ServiceSpecialty[];
  estimatedCost?: string;
  estimatedTimeline?: string;
}

export interface BusinessFormationPackage {
  title: string;
  description: string;
  entityType: EntityType;
  services: {
    serviceType: ProfessionalServiceType;
    provider: ProfessionalService;
    cost: string;
  }[];
  totalCost: string;
  timeline: string;
  steps: string[];
}

// Cayman Islands Corporate Advantages
export const CAYMAN_BUSINESS_ADVANTAGES = {
  taxation: [
    'No corporate tax',
    'No capital gains tax',
    'No withholding tax',
    'No estate or inheritance tax',
    'No payroll tax',
  ],
  regulatory: [
    'Stable political environment',
    'English common law system',
    'Sophisticated legal framework',
    'CIMA regulated (Cayman Islands Monetary Authority)',
    'Favorable regulatory regime for funds',
  ],
  infrastructure: [
    'World-class professional services',
    'Advanced telecommunications',
    'International banking hub',
    'Direct flights to major financial centers',
  ],
  reputation: [
    'Top 5 global financial center',
    'Leading hedge fund domicile',
    '100,000+ registered entities',
    '$4+ trillion in assets under management',
  ],
};

// Common Entity Formation Requirements
export const ENTITY_FORMATION_REQUIREMENTS: Record<EntityType, {
  description: string;
  minimumCapital: string;
  timeToForm: string;
  annualFees: string;
  typicalUses: string[];
}> = {
  exempted_company: {
    description: 'Most popular structure for international business',
    minimumCapital: 'No minimum (typically $50,000)',
    timeToForm: '1-2 weeks',
    annualFees: '$600-$1,000',
    typicalUses: ['Holding companies', 'Trading companies', 'Investment vehicles'],
  },
  llc: {
    description: 'Flexible hybrid entity with limited liability',
    minimumCapital: 'No minimum',
    timeToForm: '2-3 weeks',
    annualFees: '$600-$1,200',
    typicalUses: ['Joint ventures', 'Private equity', 'Real estate holdings'],
  },
  limited_partnership: {
    description: 'Popular for private equity and hedge funds',
    minimumCapital: 'No minimum',
    timeToForm: '1-2 weeks',
    annualFees: '$1,000-$2,000',
    typicalUses: ['Hedge funds', 'Private equity funds', 'Venture capital'],
  },
  foundation: {
    description: 'Flexible structure for wealth planning',
    minimumCapital: 'No minimum',
    timeToForm: '3-4 weeks',
    annualFees: '$1,200-$2,500',
    typicalUses: ['Estate planning', 'Asset protection', 'Charitable purposes'],
  },
  trust: {
    description: 'Traditional wealth preservation structure',
    minimumCapital: 'Variable',
    timeToForm: '2-4 weeks',
    annualFees: 'Based on assets',
    typicalUses: ['Wealth preservation', 'Estate planning', 'Tax optimization'],
  },
  segregated_portfolio_company: {
    description: 'Multiple segregated portfolios within one entity',
    minimumCapital: 'No minimum',
    timeToForm: '2-3 weeks',
    annualFees: '$1,500-$3,000',
    typicalUses: ['Multiple investment strategies', 'Risk segregation', 'Captive insurance'],
  },
  unit_trust: {
    description: 'Investment fund structure',
    minimumCapital: 'No minimum',
    timeToForm: '2-3 weeks',
    annualFees: '$1,000-$2,000',
    typicalUses: ['Mutual funds', 'Investment funds', 'Collective investment'],
  },
};

// Professional Service Sources
export const PROFESSIONAL_SERVICE_CATEGORIES = {
  'Top-Tier Law Firms': [
    'Maples Group',
    'Walkers',
    'Appleby',
    'Ogier',
    'Conyers Dill & Pearman',
    'Carey Olsen',
    'Harneys',
    'Mourant',
  ],
  'Big 4 Accounting': [
    'Deloitte Cayman Islands',
    'PwC Cayman Islands',
    'EY Cayman Islands',
    'KPMG Cayman Islands',
  ],
  'Major Banks': [
    'Butterfield Bank',
    'CIBC FirstCaribbean',
    'Cayman National Bank',
    'RBC Royal Bank',
    'Scotiabank Cayman Islands',
    'HSBC Cayman Islands',
  ],
  'Trust Companies': [
    'Maples Fiduciary',
    'Walkers Fiduciary',
    'Appleby Trust',
    'Intertrust Group',
    'Trident Trust',
  ],
  'Fund Administrators': [
    'SS&C Technologies',
    'Apex Group',
    'Alter Domus',
    'IQ-EQ',
    'MaplesFS',
  ],
};
