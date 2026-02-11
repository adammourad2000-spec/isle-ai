#!/usr/bin/env node
/**
 * ISLE AI - Comprehensive Coordinate Verification
 * Checks all places for coordinate accuracy and issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const kbPath = path.join(PROJECT_ROOT, 'data', 'unified-knowledge-base.json');
const data = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));

console.log('='.repeat(60));
console.log('ISLE AI - Coordinate Verification');
console.log('='.repeat(60));
console.log(`\nAnalyzing ${data.length} places...\n`);

// Cayman Islands bounds (generous)
const BOUNDS = {
  grandCayman: {
    minLat: 19.25, maxLat: 19.42,
    minLng: -81.45, maxLng: -81.05
  },
  caymanBrac: {
    minLat: 19.68, maxLat: 19.76,
    minLng: -79.92, maxLng: -79.72
  },
  littleCayman: {
    minLat: 19.65, maxLat: 19.72,
    minLng: -80.10, maxLng: -79.95
  }
};

// Check if coordinates are within Cayman Islands
function isInCaymanIslands(lat, lng) {
  const gc = BOUNDS.grandCayman;
  const cb = BOUNDS.caymanBrac;
  const lc = BOUNDS.littleCayman;

  return (
    (lat >= gc.minLat && lat <= gc.maxLat && lng >= gc.minLng && lng <= gc.maxLng) ||
    (lat >= cb.minLat && lat <= cb.maxLat && lng >= cb.minLng && lng <= cb.maxLng) ||
    (lat >= lc.minLat && lat <= lc.maxLat && lng >= lc.minLng && lng <= lc.maxLng)
  );
}

// Detect which island based on coordinates
function detectIsland(lat, lng) {
  const gc = BOUNDS.grandCayman;
  const cb = BOUNDS.caymanBrac;
  const lc = BOUNDS.littleCayman;

  if (lat >= gc.minLat && lat <= gc.maxLat && lng >= gc.minLng && lng <= gc.maxLng) {
    return 'Grand Cayman';
  }
  if (lat >= cb.minLat && lat <= cb.maxLat && lng >= cb.minLng && lng <= cb.maxLng) {
    return 'Cayman Brac';
  }
  if (lat >= lc.minLat && lat <= lc.maxLat && lng >= lc.minLng && lng <= lc.maxLng) {
    return 'Little Cayman';
  }
  return null;
}

// Issues tracking
const issues = {
  noCoordinates: [],
  zeroCoordinates: [],
  outsideCayman: [],
  lowPrecision: [],
  islandMismatch: [],
  duplicateCoords: [],
  suspiciousDefaults: []
};

// Known default/suspicious coordinates
const SUSPICIOUS_COORDS = [
  { lat: 19.3133, lng: -81.2546, reason: 'Default Cayman center' },
  { lat: 19.2866, lng: -81.3744, reason: 'George Town center' },
  { lat: 19.35, lng: -81.39, reason: 'Seven Mile Beach default' },
  { lat: 0, lng: 0, reason: 'Zero coordinates' },
];

// Track coordinate usage for duplicates
const coordUsage = new Map();

// Analyze each place
for (const place of data) {
  const lat = place.location?.coordinates?.lat;
  const lng = place.location?.coordinates?.lng;

  // Check for missing coordinates
  if (lat === undefined || lng === undefined || lat === null || lng === null) {
    issues.noCoordinates.push({ id: place.id, name: place.name });
    continue;
  }

  // Check for zero coordinates
  if (lat === 0 || lng === 0) {
    issues.zeroCoordinates.push({ id: place.id, name: place.name, lat, lng });
    continue;
  }

  // Check if outside Cayman Islands
  if (!isInCaymanIslands(lat, lng)) {
    issues.outsideCayman.push({
      id: place.id,
      name: place.name,
      lat,
      lng,
      island: place.location?.island
    });
  }

  // Check precision (should have at least 4 decimal places)
  const latStr = lat.toString();
  const lngStr = lng.toString();
  const latDecimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
  const lngDecimals = lngStr.includes('.') ? lngStr.split('.')[1].length : 0;

  if (latDecimals < 4 || lngDecimals < 4) {
    issues.lowPrecision.push({
      id: place.id,
      name: place.name,
      lat,
      lng,
      latDecimals,
      lngDecimals
    });
  }

  // Check island mismatch
  const detectedIsland = detectIsland(lat, lng);
  const declaredIsland = place.location?.island;
  if (detectedIsland && declaredIsland && detectedIsland !== declaredIsland) {
    issues.islandMismatch.push({
      id: place.id,
      name: place.name,
      declared: declaredIsland,
      detected: detectedIsland,
      lat,
      lng
    });
  }

  // Check for suspicious default coordinates
  for (const sus of SUSPICIOUS_COORDS) {
    if (Math.abs(lat - sus.lat) < 0.001 && Math.abs(lng - sus.lng) < 0.001) {
      issues.suspiciousDefaults.push({
        id: place.id,
        name: place.name,
        lat,
        lng,
        reason: sus.reason
      });
    }
  }

  // Track for duplicates
  const coordKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (!coordUsage.has(coordKey)) {
    coordUsage.set(coordKey, []);
  }
  coordUsage.get(coordKey).push({ id: place.id, name: place.name });
}

// Find duplicates
for (const [coord, places] of coordUsage) {
  if (places.length > 1) {
    issues.duplicateCoords.push({
      coord,
      count: places.length,
      places: places.slice(0, 5) // First 5
    });
  }
}

// Report
console.log('='.repeat(60));
console.log('ISSUES FOUND');
console.log('='.repeat(60));

console.log(`\n❌ No coordinates: ${issues.noCoordinates.length}`);
if (issues.noCoordinates.length > 0) {
  issues.noCoordinates.slice(0, 5).forEach(p => console.log(`   - ${p.name}`));
  if (issues.noCoordinates.length > 5) console.log(`   ... and ${issues.noCoordinates.length - 5} more`);
}

console.log(`\n❌ Zero coordinates: ${issues.zeroCoordinates.length}`);
if (issues.zeroCoordinates.length > 0) {
  issues.zeroCoordinates.slice(0, 5).forEach(p => console.log(`   - ${p.name}`));
}

console.log(`\n❌ Outside Cayman Islands: ${issues.outsideCayman.length}`);
if (issues.outsideCayman.length > 0) {
  issues.outsideCayman.slice(0, 10).forEach(p =>
    console.log(`   - ${p.name} (${p.lat}, ${p.lng}) - declared: ${p.island}`)
  );
  if (issues.outsideCayman.length > 10) console.log(`   ... and ${issues.outsideCayman.length - 10} more`);
}

console.log(`\n⚠️ Low precision (< 4 decimals): ${issues.lowPrecision.length}`);
if (issues.lowPrecision.length > 0) {
  issues.lowPrecision.slice(0, 5).forEach(p =>
    console.log(`   - ${p.name} (${p.latDecimals}/${p.lngDecimals} decimals)`)
  );
}

console.log(`\n⚠️ Island mismatch: ${issues.islandMismatch.length}`);
if (issues.islandMismatch.length > 0) {
  issues.islandMismatch.slice(0, 5).forEach(p =>
    console.log(`   - ${p.name}: declared ${p.declared}, detected ${p.detected}`)
  );
}

console.log(`\n⚠️ Suspicious default coordinates: ${issues.suspiciousDefaults.length}`);
if (issues.suspiciousDefaults.length > 0) {
  issues.suspiciousDefaults.slice(0, 10).forEach(p =>
    console.log(`   - ${p.name}: ${p.reason}`)
  );
}

console.log(`\n⚠️ Duplicate coordinates: ${issues.duplicateCoords.length} groups`);
if (issues.duplicateCoords.length > 0) {
  issues.duplicateCoords.slice(0, 5).forEach(g =>
    console.log(`   - ${g.coord}: ${g.count} places (${g.places.map(p => p.name).join(', ')})`)
  );
}

// Summary
const totalIssues =
  issues.noCoordinates.length +
  issues.zeroCoordinates.length +
  issues.outsideCayman.length +
  issues.suspiciousDefaults.length;

const warningIssues =
  issues.lowPrecision.length +
  issues.islandMismatch.length +
  issues.duplicateCoords.length;

console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Total places: ${data.length}`);
console.log(`Critical issues (need fixing): ${totalIssues}`);
console.log(`Warnings (may need review): ${warningIssues}`);
console.log(`Clean places: ${data.length - totalIssues}`);

// Save issues to file for re-enrichment
const issuesFile = path.join(PROJECT_ROOT, 'data', 'coordinate-issues.json');
fs.writeFileSync(issuesFile, JSON.stringify(issues, null, 2));
console.log(`\nIssues saved to: ${issuesFile}`);

// Create list of IDs that need re-enrichment
const needsReenrich = [
  ...issues.noCoordinates.map(p => p.id),
  ...issues.zeroCoordinates.map(p => p.id),
  ...issues.outsideCayman.map(p => p.id),
  ...issues.suspiciousDefaults.map(p => p.id)
];

const uniqueNeedsReenrich = [...new Set(needsReenrich)];
const reenrichFile = path.join(PROJECT_ROOT, 'data', 'needs-reenrich.json');
fs.writeFileSync(reenrichFile, JSON.stringify(uniqueNeedsReenrich, null, 2));
console.log(`Places needing re-enrichment: ${uniqueNeedsReenrich.length}`);
console.log(`Saved to: ${reenrichFile}`);
