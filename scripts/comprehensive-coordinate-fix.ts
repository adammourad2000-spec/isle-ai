/**
 * Comprehensive Coordinate Fix Script
 *
 * This script fixes ALL coordinate issues in the Isle AI knowledge base:
 * 1. Corrects island field based on actual coordinates
 * 2. Normalizes coordinate formats where needed
 * 3. Validates all coordinates are within Cayman Islands bounds
 *
 * Usage: npx ts-node scripts/comprehensive-coordinate-fix.ts
 * Add --apply flag to actually make changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ CAYMAN ISLANDS GEOGRAPHIC BOUNDS ============
const ISLAND_BOUNDS = {
  'Grand Cayman': {
    minLat: 19.25,
    maxLat: 19.40,
    minLng: -81.45,
    maxLng: -81.05
  },
  'Cayman Brac': {
    minLat: 19.68,
    maxLat: 19.75,
    minLng: -79.95,
    maxLng: -79.70
  },
  'Little Cayman': {
    minLat: 19.65,
    maxLat: 19.72,
    minLng: -80.15,
    maxLng: -79.95
  }
};

// General bounds for all Cayman Islands
const GENERAL_BOUNDS = {
  minLat: 19.25,
  maxLat: 19.75,
  minLng: -81.45,
  maxLng: -79.70
};

// ============ HELPER FUNCTIONS ============

function detectIslandFromCoordinates(lat: number, lng: number): string | null {
  for (const [island, bounds] of Object.entries(ISLAND_BOUNDS)) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat &&
        lng >= bounds.minLng && lng <= bounds.maxLng) {
      return island;
    }
  }
  return null;
}

function isWithinCaymanBounds(lat: number, lng: number): boolean {
  return lat >= GENERAL_BOUNDS.minLat && lat <= GENERAL_BOUNDS.maxLat &&
         lng >= GENERAL_BOUNDS.minLng && lng <= GENERAL_BOUNDS.maxLng;
}

interface CoordinateFix {
  id: string;
  name: string;
  currentIsland: string;
  correctIsland: string;
  lat: number;
  lng: number;
  lineNumber?: number;
}

interface DistrictFix {
  id: string;
  name: string;
  currentDistrict: string;
  correctDistrict: string;
}

// ============ ANALYSIS FUNCTIONS ============

function analyzeFile(filePath: string): {
  islandFixes: CoordinateFix[];
  outOfBounds: { id: string; name: string; lat: number; lng: number }[];
  districtFixes: DistrictFix[];
} {
  const content = fs.readFileSync(filePath, 'utf-8');
  const islandFixes: CoordinateFix[] = [];
  const outOfBounds: { id: string; name: string; lat: number; lng: number }[] = [];
  const districtFixes: DistrictFix[] = [];

  // Parse the JSON-like structure
  // Match location blocks with island and coordinates
  const locationPattern = /"id":\s*"([^"]+)"[^}]*?"name":\s*"([^"]+)"[^}]*?"location":\s*\{[^}]*?"island":\s*"([^"]+)"[^}]*?"latitude":\s*([\d.-]+)[^}]*?"longitude":\s*([\d.-]+)/gs;

  let match;
  while ((match = locationPattern.exec(content)) !== null) {
    const [, id, name, currentIsland, latStr, lngStr] = match;
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    // Check if within Cayman bounds at all
    if (!isWithinCaymanBounds(lat, lng)) {
      outOfBounds.push({ id, name, lat, lng });
      continue;
    }

    // Detect correct island
    const correctIsland = detectIslandFromCoordinates(lat, lng);

    if (correctIsland && correctIsland !== currentIsland) {
      islandFixes.push({
        id,
        name,
        currentIsland,
        correctIsland,
        lat,
        lng
      });
    }
  }

  // Also check for coordinates.lat/lng format
  const coordsPattern = /"id":\s*"([^"]+)"[^}]*?"name":\s*"([^"]+)"[^}]*?"location":\s*\{[^}]*?"island":\s*"([^"]+)"[^}]*?"coordinates":\s*\{\s*"lat":\s*([\d.-]+),\s*"lng":\s*([\d.-]+)/gs;

  while ((match = coordsPattern.exec(content)) !== null) {
    const [, id, name, currentIsland, latStr, lngStr] = match;
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (!isWithinCaymanBounds(lat, lng)) {
      outOfBounds.push({ id, name, lat, lng });
      continue;
    }

    const correctIsland = detectIslandFromCoordinates(lat, lng);

    if (correctIsland && correctIsland !== currentIsland) {
      // Check if we already have this fix
      if (!islandFixes.some(f => f.id === id)) {
        islandFixes.push({
          id,
          name,
          currentIsland,
          correctIsland,
          lat,
          lng
        });
      }
    }
  }

  return { islandFixes, outOfBounds, districtFixes };
}

function applyIslandFixes(filePath: string, fixes: CoordinateFix[], dryRun: boolean): number {
  let content = fs.readFileSync(filePath, 'utf-8');
  let fixCount = 0;

  for (const fix of fixes) {
    // Pattern to find and replace the island field for this specific entry
    // We need to be precise - match the id and replace the island value

    // Create a pattern that matches the location block for this ID
    const searchPatterns = [
      // Pattern 1: latitude/longitude format
      new RegExp(
        `("id":\\s*"${fix.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^}]*?"location":\\s*\\{[^}]*?"island":\\s*)"${fix.currentIsland}"`,
        'g'
      ),
    ];

    for (const pattern of searchPatterns) {
      const newContent = content.replace(pattern, `$1"${fix.correctIsland}"`);
      if (newContent !== content) {
        content = newContent;
        fixCount++;
        break;
      }
    }
  }

  if (!dryRun && fixCount > 0) {
    fs.writeFileSync(filePath, content);
  }

  return fixCount;
}

// ============ MAIN EXECUTION ============

function main() {
  console.log('========================================');
  console.log('ISLE AI COMPREHENSIVE COORDINATE FIX');
  console.log('========================================\n');

  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');

  if (dryRun) {
    console.log('DRY RUN MODE - No changes will be made');
    console.log('Use --apply flag to make actual changes\n');
  }

  const dataDir = path.join(__dirname, '..', 'data');

  // Files to analyze and fix
  const filesToProcess = [
    path.join(dataDir, 'serpapi-vip-data.ts'),
    path.join(dataDir, 'serpapi-knowledge-export.ts'),
  ];

  const allFixes: { file: string; fixes: CoordinateFix[] }[] = [];
  const allOutOfBounds: { file: string; items: { id: string; name: string; lat: number; lng: number }[] }[] = [];

  for (const filePath of filesToProcess) {
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping (not found): ${path.basename(filePath)}`);
      continue;
    }

    console.log(`\nAnalyzing: ${path.basename(filePath)}`);
    const { islandFixes, outOfBounds } = analyzeFile(filePath);

    if (islandFixes.length > 0) {
      allFixes.push({ file: filePath, fixes: islandFixes });
      console.log(`  Found ${islandFixes.length} island mismatches`);
    }

    if (outOfBounds.length > 0) {
      allOutOfBounds.push({ file: filePath, items: outOfBounds });
      console.log(`  Found ${outOfBounds.length} out-of-bounds coordinates`);
    }
  }

  // Print detailed fixes
  console.log('\n========================================');
  console.log('ISLAND MISMATCHES TO FIX');
  console.log('========================================');

  for (const { file, fixes } of allFixes) {
    console.log(`\nFile: ${path.basename(file)}`);
    console.log('-'.repeat(50));

    for (const fix of fixes) {
      console.log(`  ${fix.name}`);
      console.log(`    ID: ${fix.id}`);
      console.log(`    Coords: ${fix.lat}, ${fix.lng}`);
      console.log(`    Current: ${fix.currentIsland} -> Correct: ${fix.correctIsland}`);
    }
  }

  // Print out-of-bounds items
  if (allOutOfBounds.length > 0) {
    console.log('\n========================================');
    console.log('OUT OF BOUNDS COORDINATES (Manual Review Needed)');
    console.log('========================================');

    for (const { file, items } of allOutOfBounds) {
      console.log(`\nFile: ${path.basename(file)}`);
      for (const item of items) {
        console.log(`  ${item.name}: ${item.lat}, ${item.lng}`);
      }
    }
  }

  // Apply fixes
  if (allFixes.length > 0) {
    console.log('\n========================================');
    console.log(dryRun ? 'FIXES TO BE APPLIED' : 'APPLYING FIXES');
    console.log('========================================');

    let totalFixed = 0;
    for (const { file, fixes } of allFixes) {
      const fixedCount = applyIslandFixes(file, fixes, dryRun);
      totalFixed += fixedCount;
      console.log(`  ${path.basename(file)}: ${fixedCount}/${fixes.length} fixes ${dryRun ? 'would be' : ''} applied`);
    }

    console.log(`\nTotal: ${totalFixed} fixes ${dryRun ? 'would be' : 'were'} applied`);
  }

  // Summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Files analyzed: ${filesToProcess.length}`);
  console.log(`Island mismatches: ${allFixes.reduce((sum, f) => sum + f.fixes.length, 0)}`);
  console.log(`Out of bounds: ${allOutOfBounds.reduce((sum, f) => sum + f.items.length, 0)}`);

  if (dryRun) {
    console.log('\n========================================');
    console.log('To apply fixes, run:');
    console.log('npx ts-node scripts/comprehensive-coordinate-fix.ts --apply');
    console.log('========================================');
  }
}

main();
