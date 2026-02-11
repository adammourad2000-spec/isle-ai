#!/usr/bin/env npx ts-node --esm
// ============================================
// ISLE AI - FLIGHTS SCRAPER
// Flight routes and schedules for Cayman Islands
// ============================================

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Output directory
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'data', 'flights');

// ============ TYPES ============

type PriceRange = '$' | '$$' | '$$$' | '$$$$' | '$$$$$';

type KnowledgeCategory =
  | 'hotel' | 'villa_rental' | 'restaurant' | 'bar' | 'nightlife'
  | 'beach' | 'diving_snorkeling' | 'water_sports' | 'boat_charter' | 'superyacht'
  | 'attraction' | 'activity' | 'golf' | 'shopping' | 'spa_wellness' | 'spa' | 'medical_vip'
  | 'transport' | 'transportation' | 'chauffeur' | 'private_jet' | 'flight' | 'luxury_car_rental'
  | 'concierge' | 'vip_escort' | 'security_services' | 'service'
  | 'financial_services' | 'legal_services' | 'real_estate' | 'investment'
  | 'history' | 'culture' | 'wildlife' | 'weather' | 'visa_travel' | 'emergency' | 'general_info'
  | 'event' | 'festival';

interface KnowledgeNode {
  id: string;
  category: KnowledgeCategory | string;
  subcategory?: string;
  name: string;
  description: string;
  shortDescription: string;
  location: {
    address: string;
    district: string;
    island: string;
    latitude: number;
    longitude: number;
    googlePlaceId?: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    bookingUrl?: string;
    instagram?: string;
    facebook?: string;
    tripadvisor?: string;
  };
  media: {
    thumbnail: string;
    images: string[];
    videos?: string[];
    virtualTour?: string;
  };
  business: {
    priceRange: PriceRange;
    priceFrom?: number | null;
    priceTo?: number | null;
    pricePerUnit?: string | null;
    priceDescription?: string | null;
    currency: string;
    openingHours?: any;
    reservationRequired?: boolean;
    acceptsCreditCards?: boolean;
    languages?: string[];
  };
  ratings: {
    overall: number;
    reviewCount: number;
    tripadvisorRating?: number;
    googleRating?: number;
    sources?: { name: string; rating: number; url: string }[];
  };
  tags: string[];
  keywords: string[];
  embedding?: number[];
  embeddingText: string;
  nearbyPlaces?: string[];
  relatedServices?: string[];
  partOfItinerary?: string[];
  isActive: boolean;
  isPremium: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  customFields?: Record<string, any>;
}

interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
}

interface Airline {
  code: string;
  name: string;
  logo?: string;
  country: string;
}

interface FlightRoute {
  id: string;
  origin: Airport;
  destination: Airport;
  airline: Airline;
  frequency: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  aircraft?: string;
  seasonal?: boolean;
  seasonStart?: string;
  seasonEnd?: string;
  lastUpdated: string;
  isActive: boolean;
}

// ============ STATIC DATA ============

const CAYMAN_AIRPORTS: Airport[] = [
  {
    code: 'GCM',
    name: 'Owen Roberts International Airport',
    city: 'George Town',
    country: 'Cayman Islands',
    lat: 19.2928,
    lng: -81.3577,
    timezone: 'America/Cayman',
  },
  {
    code: 'CYB',
    name: 'Charles Kirkconnell International Airport',
    city: 'Cayman Brac',
    country: 'Cayman Islands',
    lat: 19.6870,
    lng: -79.8828,
    timezone: 'America/Cayman',
  },
  {
    code: 'LYB',
    name: 'Edward Bodden Airfield',
    city: 'Little Cayman',
    country: 'Cayman Islands',
    lat: 19.6603,
    lng: -80.0888,
    timezone: 'America/Cayman',
  },
];

const AIRLINES: Airline[] = [
  { code: 'KX', name: 'Cayman Airways', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Cayman_Airways_Logo.svg/200px-Cayman_Airways_Logo.svg.png', country: 'Cayman Islands' },
  { code: 'AA', name: 'American Airlines', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/American_Airlines_logo_2013.svg/200px-American_Airlines_logo_2013.svg.png', country: 'United States' },
  { code: 'DL', name: 'Delta Air Lines', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Delta_logo.svg/200px-Delta_logo.svg.png', country: 'United States' },
  { code: 'UA', name: 'United Airlines', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/United_Airlines_Logo.svg/200px-United_Airlines_Logo.svg.png', country: 'United States' },
  { code: 'B6', name: 'JetBlue Airways', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/JetBlue_Airways_Logo.svg/200px-JetBlue_Airways_Logo.svg.png', country: 'United States' },
  { code: 'WS', name: 'WestJet', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/WestJet_Logo.svg/200px-WestJet_Logo.svg.png', country: 'Canada' },
  { code: 'AC', name: 'Air Canada', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Air_Canada_Logo.svg/200px-Air_Canada_Logo.svg.png', country: 'Canada' },
  { code: 'BA', name: 'British Airways', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/British_Airways_Logo.svg/200px-British_Airways_Logo.svg.png', country: 'United Kingdom' },
  { code: 'SW', name: 'Southwest Airlines', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Southwest_Airlines_logo_2014.svg/200px-Southwest_Airlines_logo_2014.svg.png', country: 'United States' },
];

const ORIGIN_AIRPORTS: Airport[] = [
  { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'United States', lat: 25.7959, lng: -80.2870, timezone: 'America/New_York' },
  { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States', lat: 40.6413, lng: -73.7781, timezone: 'America/New_York' },
  { code: 'EWR', name: 'Newark Liberty International Airport', city: 'Newark', country: 'United States', lat: 40.6895, lng: -74.1745, timezone: 'America/New_York' },
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta', country: 'United States', lat: 33.6407, lng: -84.4277, timezone: 'America/New_York' },
  { code: 'DFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas', country: 'United States', lat: 32.8998, lng: -97.0403, timezone: 'America/Chicago' },
  { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', lat: 33.9425, lng: -118.4081, timezone: 'America/Los_Angeles' },
  { code: 'ORD', name: "O'Hare International Airport", city: 'Chicago', country: 'United States', lat: 41.9742, lng: -87.9073, timezone: 'America/Chicago' },
  { code: 'DEN', name: 'Denver International Airport', city: 'Denver', country: 'United States', lat: 39.8561, lng: -104.6737, timezone: 'America/Denver' },
  { code: 'IAH', name: 'George Bush Intercontinental Airport', city: 'Houston', country: 'United States', lat: 29.9902, lng: -95.3368, timezone: 'America/Chicago' },
  { code: 'CLT', name: 'Charlotte Douglas International Airport', city: 'Charlotte', country: 'United States', lat: 35.2140, lng: -80.9431, timezone: 'America/New_York' },
  { code: 'TPA', name: 'Tampa International Airport', city: 'Tampa', country: 'United States', lat: 27.9755, lng: -82.5332, timezone: 'America/New_York' },
  { code: 'FLL', name: 'Fort Lauderdale-Hollywood International Airport', city: 'Fort Lauderdale', country: 'United States', lat: 26.0742, lng: -80.1506, timezone: 'America/New_York' },
  { code: 'MSP', name: 'Minneapolis-Saint Paul International Airport', city: 'Minneapolis', country: 'United States', lat: 44.8848, lng: -93.2223, timezone: 'America/Chicago' },
  { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada', lat: 43.6777, lng: -79.6248, timezone: 'America/Toronto' },
  { code: 'YYC', name: 'Calgary International Airport', city: 'Calgary', country: 'Canada', lat: 51.1215, lng: -114.0076, timezone: 'America/Edmonton' },
  { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada', lat: 49.1967, lng: -123.1815, timezone: 'America/Vancouver' },
  { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', lat: 51.4700, lng: -0.4543, timezone: 'Europe/London' },
  { code: 'KIN', name: 'Norman Manley International Airport', city: 'Kingston', country: 'Jamaica', lat: 17.9357, lng: -76.7875, timezone: 'America/Jamaica' },
  { code: 'HAV', name: 'Jose Marti International Airport', city: 'Havana', country: 'Cuba', lat: 22.9892, lng: -82.4091, timezone: 'America/Havana' },
  { code: 'NAS', name: 'Lynden Pindling International Airport', city: 'Nassau', country: 'Bahamas', lat: 25.0390, lng: -77.4662, timezone: 'America/Nassau' },
  { code: 'PTY', name: 'Tocumen International Airport', city: 'Panama City', country: 'Panama', lat: 9.0714, lng: -79.3835, timezone: 'America/Panama' },
  { code: 'SAL', name: 'Monsenor Oscar Arnulfo Romero International Airport', city: 'San Salvador', country: 'El Salvador', lat: 13.4409, lng: -89.0557, timezone: 'America/El_Salvador' },
];

const FLIGHT_ROUTES: FlightRoute[] = [
  // Miami routes
  { id: 'route-mia-gcm-kx', origin: ORIGIN_AIRPORTS.find(a => a.code === 'MIA')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'KX')!, frequency: 'Daily', departureTime: '08:00', arrivalTime: '09:20', duration: '1h 20m', aircraft: 'Boeing 737-8', lastUpdated: new Date().toISOString(), isActive: true },
  { id: 'route-mia-gcm-aa', origin: ORIGIN_AIRPORTS.find(a => a.code === 'MIA')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'AA')!, frequency: 'Daily', departureTime: '10:30', arrivalTime: '11:50', duration: '1h 20m', aircraft: 'Boeing 737', lastUpdated: new Date().toISOString(), isActive: true },
  // New York JFK
  { id: 'route-jfk-gcm-kx', origin: ORIGIN_AIRPORTS.find(a => a.code === 'JFK')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'KX')!, frequency: 'Mon, Wed, Fri, Sat, Sun', departureTime: '08:30', arrivalTime: '12:15', duration: '3h 45m', aircraft: 'Boeing 737-8', lastUpdated: new Date().toISOString(), isActive: true },
  { id: 'route-jfk-gcm-b6', origin: ORIGIN_AIRPORTS.find(a => a.code === 'JFK')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'B6')!, frequency: 'Daily', departureTime: '11:00', arrivalTime: '14:45', duration: '3h 45m', aircraft: 'Airbus A320', lastUpdated: new Date().toISOString(), isActive: true },
  // Atlanta
  { id: 'route-atl-gcm-dl', origin: ORIGIN_AIRPORTS.find(a => a.code === 'ATL')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'DL')!, frequency: 'Daily', departureTime: '09:15', arrivalTime: '12:00', duration: '2h 45m', aircraft: 'Boeing 737-800', lastUpdated: new Date().toISOString(), isActive: true },
  // Dallas
  { id: 'route-dfw-gcm-aa', origin: ORIGIN_AIRPORTS.find(a => a.code === 'DFW')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'AA')!, frequency: 'Sat, Sun', departureTime: '10:00', arrivalTime: '14:30', duration: '3h 30m', aircraft: 'Boeing 737', seasonal: true, seasonStart: '2024-12-01', seasonEnd: '2025-04-30', lastUpdated: new Date().toISOString(), isActive: true },
  // Chicago
  { id: 'route-ord-gcm-ua', origin: ORIGIN_AIRPORTS.find(a => a.code === 'ORD')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'UA')!, frequency: 'Sat', departureTime: '08:45', arrivalTime: '13:30', duration: '3h 45m', aircraft: 'Boeing 737-900', seasonal: true, seasonStart: '2024-12-01', seasonEnd: '2025-04-30', lastUpdated: new Date().toISOString(), isActive: true },
  // Charlotte
  { id: 'route-clt-gcm-aa', origin: ORIGIN_AIRPORTS.find(a => a.code === 'CLT')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'AA')!, frequency: 'Sat', departureTime: '08:30', arrivalTime: '12:00', duration: '2h 30m', aircraft: 'Airbus A320', seasonal: true, seasonStart: '2024-12-01', seasonEnd: '2025-04-30', lastUpdated: new Date().toISOString(), isActive: true },
  // Denver
  { id: 'route-den-gcm-ua', origin: ORIGIN_AIRPORTS.find(a => a.code === 'DEN')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'UA')!, frequency: 'Sat', departureTime: '07:00', arrivalTime: '14:30', duration: '5h 30m', aircraft: 'Boeing 737', seasonal: true, seasonStart: '2024-12-01', seasonEnd: '2025-04-30', lastUpdated: new Date().toISOString(), isActive: true },
  // Los Angeles
  { id: 'route-lax-gcm-kx', origin: ORIGIN_AIRPORTS.find(a => a.code === 'LAX')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'KX')!, frequency: 'Sat', departureTime: '23:30', arrivalTime: '09:00', duration: '6h 30m', aircraft: 'Boeing 737-8', seasonal: true, seasonStart: '2024-12-01', seasonEnd: '2025-04-30', lastUpdated: new Date().toISOString(), isActive: true },
  // Toronto
  { id: 'route-yyz-gcm-ws', origin: ORIGIN_AIRPORTS.find(a => a.code === 'YYZ')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'WS')!, frequency: 'Mon, Thu, Sat', departureTime: '08:00', arrivalTime: '12:30', duration: '4h 30m', aircraft: 'Boeing 737 MAX 8', lastUpdated: new Date().toISOString(), isActive: true },
  { id: 'route-yyz-gcm-ac', origin: ORIGIN_AIRPORTS.find(a => a.code === 'YYZ')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'AC')!, frequency: 'Wed, Sat, Sun', departureTime: '09:30', arrivalTime: '14:00', duration: '4h 30m', aircraft: 'Airbus A320', lastUpdated: new Date().toISOString(), isActive: true },
  // London
  { id: 'route-lhr-gcm-ba', origin: ORIGIN_AIRPORTS.find(a => a.code === 'LHR')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'BA')!, frequency: 'Thu, Sun', departureTime: '10:00', arrivalTime: '15:00', duration: '11h 00m', aircraft: 'Boeing 777-200', lastUpdated: new Date().toISOString(), isActive: true },
  // Tampa
  { id: 'route-tpa-gcm-sw', origin: ORIGIN_AIRPORTS.find(a => a.code === 'TPA')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'SW')!, frequency: 'Sat', departureTime: '09:30', arrivalTime: '11:30', duration: '2h 00m', aircraft: 'Boeing 737-800', seasonal: true, seasonStart: '2024-12-01', seasonEnd: '2025-04-30', lastUpdated: new Date().toISOString(), isActive: true },
  // Fort Lauderdale
  { id: 'route-fll-gcm-b6', origin: ORIGIN_AIRPORTS.find(a => a.code === 'FLL')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'B6')!, frequency: 'Sat, Sun', departureTime: '11:00', arrivalTime: '12:30', duration: '1h 30m', aircraft: 'Airbus A320', lastUpdated: new Date().toISOString(), isActive: true },
  // Inter-island routes
  { id: 'route-gcm-cyb-kx', origin: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'CYB')!, airline: AIRLINES.find(a => a.code === 'KX')!, frequency: 'Daily', departureTime: '07:00', arrivalTime: '07:45', duration: '45m', aircraft: 'Twin Otter', lastUpdated: new Date().toISOString(), isActive: true },
  { id: 'route-gcm-lyb-kx', origin: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'LYB')!, airline: AIRLINES.find(a => a.code === 'KX')!, frequency: 'Daily', departureTime: '07:00', arrivalTime: '07:35', duration: '35m', aircraft: 'Twin Otter', lastUpdated: new Date().toISOString(), isActive: true },
  { id: 'route-cyb-lyb-kx', origin: CAYMAN_AIRPORTS.find(a => a.code === 'CYB')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'LYB')!, airline: AIRLINES.find(a => a.code === 'KX')!, frequency: 'Mon, Wed, Fri', departureTime: '08:00', arrivalTime: '08:20', duration: '20m', aircraft: 'Twin Otter', lastUpdated: new Date().toISOString(), isActive: true },
  // Caribbean routes
  { id: 'route-kin-gcm-kx', origin: ORIGIN_AIRPORTS.find(a => a.code === 'KIN')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'KX')!, frequency: 'Tue, Fri, Sun', departureTime: '14:00', arrivalTime: '15:00', duration: '1h 00m', aircraft: 'Boeing 737-8', lastUpdated: new Date().toISOString(), isActive: true },
  { id: 'route-nas-gcm-kx', origin: ORIGIN_AIRPORTS.find(a => a.code === 'NAS')!, destination: CAYMAN_AIRPORTS.find(a => a.code === 'GCM')!, airline: AIRLINES.find(a => a.code === 'KX')!, frequency: 'Wed, Sat', departureTime: '10:00', arrivalTime: '11:30', duration: '1h 30m', aircraft: 'Boeing 737-8', lastUpdated: new Date().toISOString(), isActive: true },
];

// ============ HELPER FUNCTIONS ============

function routeToKnowledgeNode(route: FlightRoute): KnowledgeNode {
  const isInterIsland = CAYMAN_AIRPORTS.some(a => a.code === route.origin.code);
  const isInternational = !isInterIsland;

  const description = `${route.airline.name} operates flights from ${route.origin.city} (${route.origin.code}) to ${route.destination.city} (${route.destination.code}). ` +
    `Flight time: ${route.duration}. Schedule: ${route.frequency}. ` +
    `Departure: ${route.departureTime}, Arrival: ${route.arrivalTime}.` +
    (route.aircraft ? ` Aircraft: ${route.aircraft}.` : '') +
    (route.seasonal ? ` Seasonal service (${route.seasonStart} to ${route.seasonEnd}).` : '');

  const island = route.destination.code === 'CYB' ? 'Cayman Brac'
    : route.destination.code === 'LYB' ? 'Little Cayman'
    : 'Grand Cayman';

  return {
    id: `flight-${route.id}`,
    category: 'flight' as KnowledgeCategory,
    subcategory: isInterIsland ? 'inter-island' : 'international',
    name: `${route.origin.code} to ${route.destination.code} (${route.airline.name})`,
    description,
    shortDescription: `${route.airline.name} ${route.origin.code}-${route.destination.code}, ${route.frequency}, ${route.duration}`,
    location: {
      address: route.destination.name,
      district: route.destination.city,
      island: route.destination.country === 'Cayman Islands' ? island : 'Grand Cayman',
      latitude: route.destination.lat,
      longitude: route.destination.lng,
    },
    contact: { website: getAirlineWebsite(route.airline.code) },
    media: {
      thumbnail: route.airline.logo || 'https://placehold.co/800x600?text=Flight',
      images: [],
    },
    business: { priceRange: '$$', currency: 'USD' },
    ratings: { overall: 4.0, reviewCount: 0 },
    tags: ['flight', route.airline.name.toLowerCase(), route.origin.city.toLowerCase(), route.destination.city.toLowerCase(), route.frequency.toLowerCase().includes('daily') ? 'daily' : 'scheduled', route.seasonal ? 'seasonal' : 'year-round', isInterIsland ? 'inter-island' : 'international'],
    keywords: ['flight', 'flights to cayman', route.airline.name, route.airline.code, route.origin.code, route.destination.code, route.origin.city, route.destination.city],
    embeddingText: `Flight from ${route.origin.city} ${route.origin.code} to ${route.destination.city} ${route.destination.code} ${route.airline.name} ${route.frequency} ${route.duration}`,
    isActive: route.isActive,
    isPremium: false,
    isFeatured: isInternational && route.frequency.includes('Daily'),
    createdAt: new Date().toISOString(),
    updatedAt: route.lastUpdated,
    createdBy: 'flights-scraper',
    customFields: {
      flightRoute: route,
      airlineCode: route.airline.code,
      originCode: route.origin.code,
      destinationCode: route.destination.code,
      duration: route.duration,
      frequency: route.frequency,
      seasonal: route.seasonal,
    },
  };
}

function getAirlineWebsite(code: string): string {
  const websites: { [key: string]: string } = {
    'KX': 'https://www.caymanairways.com',
    'AA': 'https://www.aa.com',
    'DL': 'https://www.delta.com',
    'UA': 'https://www.united.com',
    'B6': 'https://www.jetblue.com',
    'WS': 'https://www.westjet.com',
    'AC': 'https://www.aircanada.com',
    'BA': 'https://www.britishairways.com',
    'SW': 'https://www.southwest.com',
  };
  return websites[code] || '';
}

function airportToKnowledgeNode(airport: Airport, isCayman: boolean): KnowledgeNode {
  const island = airport.code === 'CYB' ? 'Cayman Brac'
    : airport.code === 'LYB' ? 'Little Cayman'
    : 'Grand Cayman';

  return {
    id: `airport-${airport.code.toLowerCase()}`,
    category: 'transport' as KnowledgeCategory,
    subcategory: 'airport',
    name: airport.name,
    description: `${airport.name} (${airport.code}) serves ${airport.city}, ${airport.country}. ` +
      (isCayman ? `This is the main airport for ${island}, handling both domestic and international flights.` : `Major hub with direct flights to the Cayman Islands.`),
    shortDescription: `${airport.city} Airport (${airport.code})`,
    location: {
      address: airport.name,
      district: airport.city,
      island: isCayman ? island : 'Grand Cayman',
      latitude: airport.lat,
      longitude: airport.lng,
    },
    contact: {},
    media: { thumbnail: 'https://placehold.co/800x600?text=Airport', images: [] },
    business: { priceRange: '$$', currency: 'KYD' },
    ratings: { overall: 4.0, reviewCount: 0 },
    tags: ['airport', 'transportation', 'travel', airport.city.toLowerCase()],
    keywords: ['airport', airport.code, airport.city, 'flights', 'travel'],
    embeddingText: `${airport.name} ${airport.code} airport ${airport.city} ${airport.country} flights transportation`,
    isActive: true,
    isPremium: false,
    isFeatured: isCayman,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'flights-scraper',
    customFields: { airportCode: airport.code, timezone: airport.timezone, isCaymanAirport: isCayman },
  };
}

function generateFlightKnowledgeBase(): KnowledgeNode[] {
  const nodes: KnowledgeNode[] = [];
  for (const airport of CAYMAN_AIRPORTS) {
    nodes.push(airportToKnowledgeNode(airport, true));
  }
  for (const airport of ORIGIN_AIRPORTS) {
    nodes.push(airportToKnowledgeNode(airport, false));
  }
  for (const route of FLIGHT_ROUTES) {
    nodes.push(routeToKnowledgeNode(route));
  }
  return nodes;
}

function generateFlightStats() {
  const interIslandCodes = CAYMAN_AIRPORTS.map(a => a.code);
  return {
    totalRoutes: FLIGHT_ROUTES.length,
    directDestinations: new Set(FLIGHT_ROUTES.map(r => r.origin.code)).size,
    airlines: new Set(FLIGHT_ROUTES.map(r => r.airline.code)).size,
    yearRoundRoutes: FLIGHT_ROUTES.filter(r => !r.seasonal).length,
    seasonalRoutes: FLIGHT_ROUTES.filter(r => r.seasonal).length,
    interIslandRoutes: FLIGHT_ROUTES.filter(r => interIslandCodes.includes(r.origin.code)).length,
  };
}

// ============ MAIN ============

async function main(): Promise<void> {
  console.log('====================================');
  console.log('FLIGHTS SCRAPER - Generating flight data');
  console.log('====================================');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const knowledgeNodes = generateFlightKnowledgeBase();
  console.log(`Generated ${knowledgeNodes.length} knowledge nodes`);

  // Save TypeScript module
  const tsContent = `// ============================================
// ISLE AI - FLIGHTS KNOWLEDGE BASE
// Auto-generated on ${new Date().toISOString()}
// ============================================

import { KnowledgeNode } from '../../types/chatbot';

export const CAYMAN_AIRPORTS = ${JSON.stringify(CAYMAN_AIRPORTS, null, 2)};

export const AIRLINES = ${JSON.stringify(AIRLINES, null, 2)};

export const ORIGIN_AIRPORTS = ${JSON.stringify(ORIGIN_AIRPORTS, null, 2)};

export const FLIGHT_ROUTES = ${JSON.stringify(FLIGHT_ROUTES, null, 2)};

export const FLIGHTS_KNOWLEDGE: KnowledgeNode[] = ${JSON.stringify(knowledgeNodes, null, 2)};

export default FLIGHTS_KNOWLEDGE;
`;

  const tsFile = path.join(OUTPUT_DIR, 'flights-knowledge.ts');
  fs.writeFileSync(tsFile, tsContent);
  console.log(`Saved to ${tsFile}`);

  const jsonFile = path.join(OUTPUT_DIR, 'flights-knowledge.json');
  fs.writeFileSync(jsonFile, JSON.stringify(knowledgeNodes, null, 2));
  console.log(`Saved to ${jsonFile}`);

  const rawDataFile = path.join(OUTPUT_DIR, 'flights-raw-data.json');
  fs.writeFileSync(rawDataFile, JSON.stringify({
    airports: { cayman: CAYMAN_AIRPORTS, origins: ORIGIN_AIRPORTS },
    airlines: AIRLINES,
    routes: FLIGHT_ROUTES,
  }, null, 2));
  console.log(`Saved raw data to ${rawDataFile}`);

  const stats = generateFlightStats();
  console.log('\n====================================');
  console.log('FLIGHT DATA SUMMARY');
  console.log('====================================');
  console.log(`Total Routes: ${stats.totalRoutes}`);
  console.log(`Direct Destinations: ${stats.directDestinations}`);
  console.log(`Airlines: ${stats.airlines}`);
  console.log(`Year-round Routes: ${stats.yearRoundRoutes}`);
  console.log(`Seasonal Routes: ${stats.seasonalRoutes}`);
  console.log(`Inter-island Routes: ${stats.interIslandRoutes}`);

  console.log('\nDirect flight origins:');
  const uniqueOrigins = [...new Set(FLIGHT_ROUTES.filter(r => !CAYMAN_AIRPORTS.some(a => a.code === r.origin.code)).map(r => r.origin.city))];
  uniqueOrigins.sort().forEach(city => console.log(`  - ${city}`));

  console.log('\n====================================');
  console.log('NOTE: This data is based on publicly available information.');
  console.log('For real-time flight data, integrate with aviation APIs.');
  console.log('====================================');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
