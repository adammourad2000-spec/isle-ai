#!/usr/bin/env node

/**
 * Knowledge Base Population Script
 *
 * Fetches ALL data from SerpAPI and outputs it in KnowledgeNode format
 * for injection into the static knowledge base.
 *
 * Usage:
 *   node populateKnowledgeBase.js
 *   node populateKnowledgeBase.js --output=./output.json
 *   node populateKnowledgeBase.js --category=vip
 *   node populateKnowledgeBase.js --category=flights
 *   node populateKnowledgeBase.js --category=all
 */

import serpApiService from '../services/serpApiService.js';
import fs from 'fs';
import path from 'path';

// Get API key from environment
const SERPAPI_KEY = process.env.SERPAPI_KEY || 'd00dd54909ca688bb9340ac04d56449680634ab2f07ea56fc9627023f3129165';

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value || true;
  return acc;
}, {});

const OUTPUT_FILE = args.output || './knowledge-base-export.json';
const CATEGORY = args.category || 'all';

console.log('='.repeat(60));
console.log('  ISLE AI - KNOWLEDGE BASE POPULATION SCRIPT');
console.log('='.repeat(60));
console.log(`  Category: ${CATEGORY}`);
console.log(`  Output: ${OUTPUT_FILE}`);
console.log('='.repeat(60));

/**
 * Generate unique ID for knowledge node
 */
function generateNodeId(category, name) {
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  const timestamp = Date.now().toString(36);
  return `${category}-${slug}-${timestamp}`;
}

/**
 * Convert SerpAPI place to proper KnowledgeNode format
 */
function toKnowledgeNode(place, overrideCategory = null) {
  const category = overrideCategory || place.category || 'attraction';

  return {
    id: place.id || generateNodeId(category, place.name || 'unknown'),
    category,
    subcategory: place.subcategory || place.type || '',
    name: place.name || 'Unknown',
    description: place.description || `${place.name} - Premium service in the Cayman Islands`,
    shortDescription: place.shortDescription || (place.description || '').substring(0, 150),

    location: {
      address: place.location?.address || '',
      district: place.location?.district || 'Grand Cayman',
      island: place.location?.island || 'Grand Cayman',
      latitude: place.location?.latitude || 19.3133,
      longitude: place.location?.longitude || -81.2546,
      googlePlaceId: place.location?.googlePlaceId || ''
    },

    contact: {
      phone: place.contact?.phone || '',
      email: place.contact?.email || '',
      website: place.contact?.website || '',
      bookingUrl: place.contact?.bookingUrl || place.contact?.website || ''
    },

    media: {
      thumbnail: place.media?.thumbnail || '',
      images: place.media?.images || [],
      videos: place.media?.videos || []
    },

    business: {
      priceRange: place.business?.priceRange || '$$',
      priceFrom: place.business?.priceFrom || null,
      priceTo: place.business?.priceTo || null,
      pricePerUnit: place.business?.pricePerUnit || null,
      priceDescription: place.business?.priceDescription || null,
      currency: place.business?.currency || 'USD',
      openingHours: place.business?.openingHours || null,
      reservationRequired: place.business?.reservationRequired || false,
      serviceOptions: place.business?.serviceOptions || {}
    },

    ratings: {
      overall: place.ratings?.overall || 0,
      reviewCount: place.ratings?.reviewCount || 0,
      googleRating: place.ratings?.googleRating || place.ratings?.overall || 0
    },

    tags: place.tags || [category, 'cayman islands', 'caribbean'],
    keywords: place.keywords || [],

    embeddingText: `${place.name} ${place.description || ''} ${category} Cayman Islands Caribbean`,

    isActive: true,
    isPremium: ['private_jet', 'superyacht', 'vip_escort', 'financial_services'].includes(category),
    isFeatured: (place.ratings?.overall || 0) >= 4.5 && (place.ratings?.reviewCount || 0) > 50,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'serpapi-population-script'
  };
}

/**
 * Convert flight to knowledge node format
 */
function flightToKnowledgeNode(flightData, route) {
  const id = generateNodeId('flight', `${route.origin?.code || 'GCM'}-${route.destination?.code || 'GCM'}`);

  return {
    id,
    category: 'flight',
    subcategory: flightData.direction || 'commercial',
    name: `Flight: ${route.route || 'Cayman Islands Route'}`,
    description: `${flightData.airline || 'Multiple airlines'} - ${flightData.durationFormatted || 'Direct'} flight. ${flightData.stops || 0} stop(s).`,
    shortDescription: `${flightData.airline || 'Flights'} from ${flightData.priceFormatted || '$0'}`,

    location: {
      address: flightData.origin?.name || 'Owen Roberts International Airport',
      district: 'George Town',
      island: 'Grand Cayman',
      latitude: 19.2928,
      longitude: -81.3577,
      googlePlaceId: ''
    },

    contact: {
      phone: '',
      website: flightData.bookingLink || '',
      bookingUrl: flightData.bookingLink || ''
    },

    media: {
      thumbnail: flightData.airlineLogo || '',
      images: flightData.airlineLogo ? [flightData.airlineLogo] : [],
      videos: []
    },

    business: {
      priceRange: flightData.price > 1000 ? '$$$$' : flightData.price > 500 ? '$$$' : '$$',
      priceFrom: flightData.price || null,
      priceTo: null,
      pricePerUnit: '/person',
      priceDescription: flightData.priceFormatted || null,
      currency: 'USD'
    },

    ratings: {
      overall: 0,
      reviewCount: 0
    },

    tags: ['flight', 'airline', flightData.airline?.toLowerCase() || 'travel', 'cayman islands'],
    keywords: ['flight', 'travel', 'airline', flightData.origin?.airport, flightData.destination?.airport],

    // Flight-specific data
    flightDetails: {
      airline: flightData.airline,
      flightNumber: flightData.flightNumber,
      aircraft: flightData.aircraft,
      duration: flightData.totalDuration,
      durationFormatted: flightData.durationFormatted,
      stops: flightData.stops,
      travelClass: flightData.travelClass,
      origin: flightData.origin,
      destination: flightData.destination,
      legs: flightData.legs,
      isBestFlight: flightData.isBestFlight
    },

    embeddingText: `Flight ${flightData.airline || ''} ${route.route || ''} Cayman Islands travel aviation`,

    isActive: true,
    isPremium: false,
    isFeatured: flightData.isBestFlight || false,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'serpapi-population-script'
  };
}

/**
 * Fetch all standard place categories
 */
async function fetchStandardCategories() {
  console.log('\n[1/3] Fetching standard place categories...');

  try {
    const result = await serpApiService.fetchAllCaymanData(SERPAPI_KEY);
    console.log(`  ✓ Fetched ${result.totalPlaces} standard places`);
    return result.places.map(p => toKnowledgeNode(p));
  } catch (error) {
    console.error('  ✗ Error fetching standard categories:', error.message);
    return [];
  }
}

/**
 * Fetch all VIP services
 */
async function fetchVIPServices() {
  console.log('\n[2/3] Fetching VIP services...');

  try {
    const result = await serpApiService.fetchAllVIPServices(SERPAPI_KEY);

    const allVIPNodes = [];

    // Process each VIP category
    const categories = [
      { key: 'privateJets', category: 'private_jet' },
      { key: 'vipEscorts', category: 'vip_escort' },
      { key: 'financialServices', category: 'financial_services' },
      { key: 'legalServices', category: 'legal_services' },
      { key: 'concierge', category: 'concierge' },
      { key: 'superyachts', category: 'superyacht' },
      { key: 'luxuryCars', category: 'luxury_car_rental' },
      { key: 'security', category: 'security_services' },
      { key: 'medicalVIP', category: 'medical_vip' }
    ];

    for (const { key, category } of categories) {
      const places = result[key] || [];
      console.log(`  ✓ ${category}: ${places.length} services`);

      places.forEach(place => {
        allVIPNodes.push(toKnowledgeNode(place, category));
      });
    }

    console.log(`  ✓ Total VIP services: ${allVIPNodes.length}`);
    return allVIPNodes;
  } catch (error) {
    console.error('  ✗ Error fetching VIP services:', error.message);
    return [];
  }
}

/**
 * Fetch all flight routes
 */
async function fetchFlightRoutes() {
  console.log('\n[3/3] Fetching flight routes...');

  try {
    const result = await serpApiService.searchAllCaymanFlights(SERPAPI_KEY, {
      direction: 'both'
    });

    const flightNodes = [];

    // Process flights TO Cayman
    (result.toCayman || []).forEach(route => {
      (route.flights || []).forEach(flight => {
        flightNodes.push(flightToKnowledgeNode(flight, route));
      });
    });

    // Process flights FROM Cayman
    (result.fromCayman || []).forEach(route => {
      (route.flights || []).forEach(flight => {
        flightNodes.push(flightToKnowledgeNode(flight, route));
      });
    });

    console.log(`  ✓ Flights TO Cayman: ${result.toCayman?.length || 0} routes`);
    console.log(`  ✓ Flights FROM Cayman: ${result.fromCayman?.length || 0} routes`);
    console.log(`  ✓ Total flight nodes: ${flightNodes.length}`);

    return flightNodes;
  } catch (error) {
    console.error('  ✗ Error fetching flights:', error.message);
    return [];
  }
}

/**
 * Deduplicate nodes by name
 */
function deduplicateNodes(nodes) {
  const seen = new Map();

  nodes.forEach(node => {
    const key = node.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.set(key, node);
    } else {
      // Merge data if duplicate - prefer the one with more info
      const existing = seen.get(key);
      if ((node.ratings?.reviewCount || 0) > (existing.ratings?.reviewCount || 0)) {
        seen.set(key, node);
      }
    }
  });

  return Array.from(seen.values());
}

/**
 * Generate TypeScript code for knowledge base
 */
function generateTypeScriptCode(nodes, categoryName) {
  const varName = `CAYMAN_${categoryName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

  let code = `// Auto-generated by populateKnowledgeBase.js\n`;
  code += `// Generated at: ${new Date().toISOString()}\n`;
  code += `// Total nodes: ${nodes.length}\n\n`;
  code += `export const ${varName}: KnowledgeNode[] = [\n`;

  nodes.forEach((node, index) => {
    code += `  ${JSON.stringify(node, null, 2).split('\n').join('\n  ')}`;
    if (index < nodes.length - 1) code += ',';
    code += '\n';
  });

  code += `];\n`;

  return code;
}

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now();
  let allNodes = [];

  try {
    // Fetch based on category argument
    if (CATEGORY === 'all' || CATEGORY === 'standard') {
      const standardNodes = await fetchStandardCategories();
      allNodes = allNodes.concat(standardNodes);
    }

    if (CATEGORY === 'all' || CATEGORY === 'vip') {
      const vipNodes = await fetchVIPServices();
      allNodes = allNodes.concat(vipNodes);
    }

    if (CATEGORY === 'all' || CATEGORY === 'flights') {
      const flightNodes = await fetchFlightRoutes();
      allNodes = allNodes.concat(flightNodes);
    }

    // Deduplicate
    console.log('\n[Deduplication] Removing duplicates...');
    const dedupedNodes = deduplicateNodes(allNodes);
    console.log(`  ✓ Reduced from ${allNodes.length} to ${dedupedNodes.length} unique nodes`);

    // Generate statistics
    const stats = {
      total: dedupedNodes.length,
      byCategory: {},
      byRating: {
        excellent: 0, // 4.5+
        good: 0,      // 4.0-4.4
        average: 0,   // 3.0-3.9
        unrated: 0    // < 3.0 or no rating
      },
      withPricing: 0,
      withImages: 0,
      premium: 0,
      featured: 0
    };

    dedupedNodes.forEach(node => {
      // By category
      stats.byCategory[node.category] = (stats.byCategory[node.category] || 0) + 1;

      // By rating
      const rating = node.ratings?.overall || 0;
      if (rating >= 4.5) stats.byRating.excellent++;
      else if (rating >= 4.0) stats.byRating.good++;
      else if (rating >= 3.0) stats.byRating.average++;
      else stats.byRating.unrated++;

      // Other stats
      if (node.business?.priceFrom) stats.withPricing++;
      if (node.media?.images?.length > 0) stats.withImages++;
      if (node.isPremium) stats.premium++;
      if (node.isFeatured) stats.featured++;
    });

    // Output results
    const output = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalNodes: dedupedNodes.length,
        category: CATEGORY,
        executionTimeMs: Date.now() - startTime,
        statistics: stats
      },
      nodes: dedupedNodes
    };

    // Write JSON file
    const outputPath = path.resolve(OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n✓ JSON output saved to: ${outputPath}`);

    // Also generate TypeScript code file
    const tsOutputPath = outputPath.replace('.json', '.ts');
    const tsCode = generateTypeScriptCode(dedupedNodes, CATEGORY);
    fs.writeFileSync(tsOutputPath, tsCode);
    console.log(`✓ TypeScript output saved to: ${tsOutputPath}`);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('  SUMMARY');
    console.log('='.repeat(60));
    console.log(`  Total nodes generated: ${dedupedNodes.length}`);
    console.log(`  Execution time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    console.log('\n  By Category:');
    Object.entries(stats.byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`    ${cat}: ${count}`);
      });
    console.log('\n  By Rating:');
    console.log(`    Excellent (4.5+): ${stats.byRating.excellent}`);
    console.log(`    Good (4.0-4.4): ${stats.byRating.good}`);
    console.log(`    Average (3.0-3.9): ${stats.byRating.average}`);
    console.log(`    Unrated: ${stats.byRating.unrated}`);
    console.log(`\n  With Pricing: ${stats.withPricing}`);
    console.log(`  With Images: ${stats.withImages}`);
    console.log(`  Premium Services: ${stats.premium}`);
    console.log(`  Featured: ${stats.featured}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
