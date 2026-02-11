/**
 * Location Verification Script for Isle AI Cayman Islands Knowledge Base
 *
 * This script audits all location data in the knowledge base for:
 * - Valid coordinate bounds for each island
 * - Duplicate coordinates
 * - Suspicious coordinates (0,0, etc.)
 * - Missing or invalid coordinates
 *
 * Usage: npx ts-node scripts/verify-locations.ts
 */

import {
  CAYMAN_KNOWLEDGE_BASE,
  STATIC_KNOWLEDGE,
  SERPAPI_ENRICHED_DATA,
  KNOWLEDGE_BASE_STATS
} from '../data/cayman-islands-knowledge';
import type { KnowledgeNode } from '../types/chatbot';

// ============ COORDINATE BOUNDS ============
// Based on official geographic data for Cayman Islands

interface IslandBounds {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const ISLAND_BOUNDS: Record<string, IslandBounds> = {
  'Grand Cayman': {
    name: 'Grand Cayman',
    minLat: 19.25,
    maxLat: 19.40,
    minLng: -81.45,
    maxLng: -81.05
  },
  'Cayman Brac': {
    name: 'Cayman Brac',
    minLat: 19.68,
    maxLat: 19.75,
    minLng: -79.95,
    maxLng: -79.70
  },
  'Little Cayman': {
    name: 'Little Cayman',
    minLat: 19.65,
    maxLat: 19.70,
    minLng: -80.15,
    maxLng: -79.95
  }
};

// Extended bounds for "general Cayman" references
const CAYMAN_GENERAL_BOUNDS = {
  minLat: 19.25,
  maxLat: 19.75,
  minLng: -81.45,
  maxLng: -79.70
};

// ============ VERIFICATION TYPES ============

interface LocationIssue {
  nodeId: string;
  nodeName: string;
  island: string;
  category: string;
  issueType: 'out_of_bounds' | 'wrong_island' | 'suspicious' | 'duplicate' | 'missing' | 'invalid';
  severity: 'error' | 'warning' | 'info';
  description: string;
  currentCoords: { lat: number; lng: number };
  expectedBounds?: IslandBounds;
  suggestedFix?: string;
}

interface VerificationReport {
  timestamp: string;
  totalNodes: number;
  nodesWithValidCoords: number;
  nodesWithIssues: number;
  issues: LocationIssue[];
  duplicateGroups: { coords: string; nodes: string[] }[];
  summary: {
    outOfBounds: number;
    wrongIsland: number;
    suspicious: number;
    duplicates: number;
    missing: number;
    invalid: number;
  };
}

// ============ VERIFICATION FUNCTIONS ============

function isCoordinateValid(lat: number, lng: number): boolean {
  // Check for missing or invalid values
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  if (isNaN(lat) || isNaN(lng)) {
    return false;
  }
  // Check for zero coordinates (common default/error)
  if (lat === 0 && lng === 0) {
    return false;
  }
  // Check for reasonable ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return false;
  }
  return true;
}

function isWithinBounds(lat: number, lng: number, bounds: IslandBounds): boolean {
  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
}

function isWithinGeneralCaymanBounds(lat: number, lng: number): boolean {
  return (
    lat >= CAYMAN_GENERAL_BOUNDS.minLat &&
    lat <= CAYMAN_GENERAL_BOUNDS.maxLat &&
    lng >= CAYMAN_GENERAL_BOUNDS.minLng &&
    lng <= CAYMAN_GENERAL_BOUNDS.maxLng
  );
}

function detectCorrectIsland(lat: number, lng: number): string | null {
  for (const [island, bounds] of Object.entries(ISLAND_BOUNDS)) {
    if (isWithinBounds(lat, lng, bounds)) {
      return island;
    }
  }
  return null;
}

function isSuspiciousCoordinate(lat: number, lng: number): { suspicious: boolean; reason?: string } {
  // Check for exactly zero
  if (lat === 0 || lng === 0) {
    return { suspicious: true, reason: 'Coordinate contains zero value' };
  }
  // Check for obviously round numbers that might be defaults
  if (lat === Math.round(lat) && lng === Math.round(lng)) {
    return { suspicious: true, reason: 'Both coordinates are whole numbers (possible default)' };
  }
  // Check for typical default coordinates
  const defaultCoords = [
    { lat: 19.3133, lng: -81.2546 }, // Cayman center
    { lat: 19.2956, lng: -81.3812 }, // George Town default
  ];
  for (const def of defaultCoords) {
    if (lat === def.lat && lng === def.lng) {
      return { suspicious: true, reason: 'Matches common default coordinate' };
    }
  }
  return { suspicious: false };
}

function verifyNode(node: KnowledgeNode): LocationIssue | null {
  const { location } = node;
  const lat = location.latitude;
  const lng = location.longitude;

  // Check for missing coordinates
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return {
      nodeId: node.id,
      nodeName: node.name,
      island: location.island,
      category: node.category,
      issueType: 'missing',
      severity: 'error',
      description: 'Missing coordinates',
      currentCoords: { lat: lat ?? 0, lng: lng ?? 0 },
      suggestedFix: 'Add coordinates manually or use geocoding'
    };
  }

  // Check for invalid coordinates
  if (!isCoordinateValid(lat, lng)) {
    return {
      nodeId: node.id,
      nodeName: node.name,
      island: location.island,
      category: node.category,
      issueType: 'invalid',
      severity: 'error',
      description: `Invalid coordinates: ${lat}, ${lng}`,
      currentCoords: { lat, lng },
      suggestedFix: 'Correct coordinates using geocoding or manual lookup'
    };
  }

  // Check if within general Cayman bounds
  if (!isWithinGeneralCaymanBounds(lat, lng)) {
    return {
      nodeId: node.id,
      nodeName: node.name,
      island: location.island,
      category: node.category,
      issueType: 'out_of_bounds',
      severity: 'error',
      description: `Coordinates (${lat}, ${lng}) are outside Cayman Islands`,
      currentCoords: { lat, lng },
      expectedBounds: ISLAND_BOUNDS[location.island] || ISLAND_BOUNDS['Grand Cayman'],
      suggestedFix: 'Verify and correct coordinates'
    };
  }

  // Check if on correct island
  const detectedIsland = detectCorrectIsland(lat, lng);
  if (detectedIsland && detectedIsland !== location.island) {
    // Allow some flexibility for general references
    if (location.island !== 'Cayman Islands' && location.island !== 'Caribbean') {
      return {
        nodeId: node.id,
        nodeName: node.name,
        island: location.island,
        category: node.category,
        issueType: 'wrong_island',
        severity: 'warning',
        description: `Coordinates suggest ${detectedIsland}, but island is set to ${location.island}`,
        currentCoords: { lat, lng },
        expectedBounds: ISLAND_BOUNDS[location.island],
        suggestedFix: `Update island to "${detectedIsland}" or correct coordinates`
      };
    }
  }

  // Check for specific island bounds
  const expectedBounds = ISLAND_BOUNDS[location.island];
  if (expectedBounds && !isWithinBounds(lat, lng, expectedBounds)) {
    // This is a node claimed to be on a specific island but outside its bounds
    return {
      nodeId: node.id,
      nodeName: node.name,
      island: location.island,
      category: node.category,
      issueType: 'out_of_bounds',
      severity: 'warning',
      description: `Coordinates (${lat}, ${lng}) are outside ${location.island} bounds`,
      currentCoords: { lat, lng },
      expectedBounds,
      suggestedFix: `Verify location is on ${location.island} or update island property`
    };
  }

  // Check for suspicious coordinates
  const suspicious = isSuspiciousCoordinate(lat, lng);
  if (suspicious.suspicious) {
    return {
      nodeId: node.id,
      nodeName: node.name,
      island: location.island,
      category: node.category,
      issueType: 'suspicious',
      severity: 'info',
      description: suspicious.reason!,
      currentCoords: { lat, lng },
      suggestedFix: 'Verify coordinates are accurate for this location'
    };
  }

  return null;
}

function findDuplicateCoordinates(nodes: KnowledgeNode[]): { coords: string; nodes: string[] }[] {
  const coordMap = new Map<string, string[]>();

  for (const node of nodes) {
    const lat = node.location.latitude;
    const lng = node.location.longitude;

    if (lat && lng) {
      // Round to 4 decimal places for comparison (about 11m precision)
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      const existing = coordMap.get(key) || [];
      existing.push(`${node.id}: ${node.name}`);
      coordMap.set(key, existing);
    }
  }

  return Array.from(coordMap.entries())
    .filter(([_, nodes]) => nodes.length > 1)
    .map(([coords, nodes]) => ({ coords, nodes }));
}

// ============ MAIN VERIFICATION ============

function verifyAllLocations(): VerificationReport {
  console.log('\n========================================');
  console.log('ISLE AI LOCATION VERIFICATION');
  console.log('========================================\n');

  const nodes = CAYMAN_KNOWLEDGE_BASE;
  const issues: LocationIssue[] = [];
  let validCount = 0;

  console.log(`Total nodes to verify: ${nodes.length}`);
  console.log(`Static nodes: ${STATIC_KNOWLEDGE.length}`);
  console.log(`Enriched nodes: ${SERPAPI_ENRICHED_DATA.length}`);
  console.log('');

  // Verify each node
  for (const node of nodes) {
    const issue = verifyNode(node);
    if (issue) {
      issues.push(issue);
    } else {
      validCount++;
    }
  }

  // Find duplicate coordinates
  const duplicates = findDuplicateCoordinates(nodes);

  // Add duplicate issues
  for (const dup of duplicates) {
    // Mark as info - some duplicates are legitimate (e.g., multiple services at same location)
    const nodeNames = dup.nodes;
    if (nodeNames.length > 3) {
      // More than 3 at same location is suspicious
      for (const nodeInfo of nodeNames) {
        const nodeId = nodeInfo.split(':')[0].trim();
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          issues.push({
            nodeId: node.id,
            nodeName: node.name,
            island: node.location.island,
            category: node.category,
            issueType: 'duplicate',
            severity: 'warning',
            description: `Shares coordinates with ${nodeNames.length - 1} other nodes`,
            currentCoords: { lat: node.location.latitude, lng: node.location.longitude },
            suggestedFix: 'Verify each location has unique, accurate coordinates'
          });
        }
      }
    }
  }

  // Count issues by type
  const summary = {
    outOfBounds: issues.filter(i => i.issueType === 'out_of_bounds').length,
    wrongIsland: issues.filter(i => i.issueType === 'wrong_island').length,
    suspicious: issues.filter(i => i.issueType === 'suspicious').length,
    duplicates: issues.filter(i => i.issueType === 'duplicate').length,
    missing: issues.filter(i => i.issueType === 'missing').length,
    invalid: issues.filter(i => i.issueType === 'invalid').length
  };

  const report: VerificationReport = {
    timestamp: new Date().toISOString(),
    totalNodes: nodes.length,
    nodesWithValidCoords: validCount,
    nodesWithIssues: issues.length,
    issues,
    duplicateGroups: duplicates,
    summary
  };

  // Print summary
  console.log('========================================');
  console.log('VERIFICATION SUMMARY');
  console.log('========================================');
  console.log(`Total nodes:       ${report.totalNodes}`);
  console.log(`Valid coords:      ${report.nodesWithValidCoords}`);
  console.log(`Nodes with issues: ${report.nodesWithIssues}`);
  console.log('');
  console.log('Issues by type:');
  console.log(`  - Out of bounds: ${summary.outOfBounds}`);
  console.log(`  - Wrong island:  ${summary.wrongIsland}`);
  console.log(`  - Suspicious:    ${summary.suspicious}`);
  console.log(`  - Duplicates:    ${summary.duplicates}`);
  console.log(`  - Missing:       ${summary.missing}`);
  console.log(`  - Invalid:       ${summary.invalid}`);
  console.log('');

  // Print errors
  const errors = issues.filter(i => i.severity === 'error');
  if (errors.length > 0) {
    console.log('========================================');
    console.log('ERRORS (require immediate fix)');
    console.log('========================================');
    for (const error of errors) {
      console.log(`\n[${error.issueType.toUpperCase()}] ${error.nodeName}`);
      console.log(`  ID: ${error.nodeId}`);
      console.log(`  Island: ${error.island}`);
      console.log(`  Category: ${error.category}`);
      console.log(`  Coords: ${error.currentCoords.lat}, ${error.currentCoords.lng}`);
      console.log(`  Issue: ${error.description}`);
      if (error.suggestedFix) {
        console.log(`  Fix: ${error.suggestedFix}`);
      }
    }
  }

  // Print warnings
  const warnings = issues.filter(i => i.severity === 'warning');
  if (warnings.length > 0) {
    console.log('\n========================================');
    console.log('WARNINGS (should review)');
    console.log('========================================');
    for (const warning of warnings) {
      console.log(`\n[${warning.issueType.toUpperCase()}] ${warning.nodeName}`);
      console.log(`  ID: ${warning.nodeId}`);
      console.log(`  Island: ${warning.island}`);
      console.log(`  Coords: ${warning.currentCoords.lat}, ${warning.currentCoords.lng}`);
      console.log(`  Issue: ${warning.description}`);
    }
  }

  // Print duplicate groups
  if (duplicates.length > 0) {
    console.log('\n========================================');
    console.log('DUPLICATE COORDINATE GROUPS');
    console.log('========================================');
    for (const dup of duplicates) {
      console.log(`\nCoords: ${dup.coords}`);
      console.log('Nodes:');
      for (const node of dup.nodes) {
        console.log(`  - ${node}`);
      }
    }
  }

  // Island distribution
  console.log('\n========================================');
  console.log('ISLAND DISTRIBUTION');
  console.log('========================================');
  const islandCounts = new Map<string, number>();
  for (const node of nodes) {
    const island = node.location.island;
    islandCounts.set(island, (islandCounts.get(island) || 0) + 1);
  }
  for (const [island, count] of islandCounts.entries()) {
    console.log(`  ${island}: ${count} nodes`);
  }

  return report;
}

// ============ EXPORT REPORT TO JSON ============

function exportReport(report: VerificationReport): void {
  const fs = require('fs');
  const path = require('path');

  const outputPath = path.join(__dirname, '..', 'data', 'location-verification-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nReport exported to: ${outputPath}`);
}

// ============ RUN VERIFICATION ============

const report = verifyAllLocations();
exportReport(report);

// Export for use by other scripts
export { verifyAllLocations, ISLAND_BOUNDS, CAYMAN_GENERAL_BOUNDS };
export type { LocationIssue, VerificationReport, IslandBounds };
