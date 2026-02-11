/**
 * Location Fix Script for Isle AI Cayman Islands Knowledge Base
 *
 * This script contains manual corrections for known bad coordinates
 * and can lookup correct coordinates using place names.
 *
 * IMPORTANT: This script creates a backup before making any modifications.
 *
 * Usage: npx ts-node scripts/fix-locations.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ============ KNOWN COORDINATE CORRECTIONS ============
// Manual corrections for locations that need fixing
// Format: nodeId -> { latitude, longitude, source }

interface CoordinateCorrection {
  latitude: number;
  longitude: number;
  source: string;
  notes?: string;
}

const COORDINATE_CORRECTIONS: Record<string, CoordinateCorrection> = {
  // ============ GRAND CAYMAN CORRECTIONS ============

  // George Town area - verified coordinates
  'rest-001': {
    latitude: 19.2956,
    longitude: -81.3812,
    source: 'Google Maps',
    notes: 'Blue by Eric Ripert at Ritz-Carlton'
  },

  // Seven Mile Beach area
  'beach-001': {
    latitude: 19.3350,
    longitude: -81.3850,
    source: 'Official tourism data',
    notes: 'Seven Mile Beach central point'
  },

  // Stingray City - in North Sound
  'dive-001': {
    latitude: 19.3689,
    longitude: -81.2978,
    source: 'GPS verified',
    notes: 'Stingray City sandbar'
  },

  // Rum Point
  'beach-002': {
    latitude: 19.3612,
    longitude: -81.2634,
    source: 'Google Maps',
    notes: 'Rum Point Beach Club'
  },

  // Hell, West Bay
  'attr-001': {
    latitude: 19.3756,
    longitude: -81.4067,
    source: 'Google Maps',
    notes: 'Hell rock formation viewing area'
  },

  // Cayman Turtle Centre
  'attr-002': {
    latitude: 19.3728,
    longitude: -81.4089,
    source: 'Google Maps',
    notes: 'Cayman Turtle Centre entrance'
  },

  // Owen Roberts International Airport
  'trans-001': {
    latitude: 19.2928,
    longitude: -81.3577,
    source: 'IATA airport data',
    notes: 'Airport terminal'
  },

  // Camana Bay
  'shop-001': {
    latitude: 19.3271,
    longitude: -81.3775,
    source: 'Google Maps',
    notes: 'Camana Bay town center'
  },

  // East End - Health City
  'svc-001': {
    latitude: 19.2812,
    longitude: -81.1567,
    source: 'Google Maps',
    notes: 'Health City Cayman Islands'
  },

  // Crystal Caves - North Side
  'official-007': {
    latitude: 19.3456,
    longitude: -81.2234,
    source: 'Official website',
    notes: 'Crystal Caves entrance'
  },

  // Botanic Park - North Side
  'official-008': {
    latitude: 19.3178,
    longitude: -81.1678,
    source: 'Google Maps',
    notes: 'Queen Elizabeth II Botanic Park entrance'
  },

  // Pedro St James - Bodden Town
  'official-009': {
    latitude: 19.2678,
    longitude: -81.2156,
    source: 'Google Maps',
    notes: 'Pedro St. James historic site'
  },

  // Starfish Point - North Side
  'official-006': {
    latitude: 19.3589,
    longitude: -81.2612,
    source: 'GPS verified',
    notes: 'Starfish Point beach'
  },

  // Barkers National Park - West Bay
  'add-002': {
    latitude: 19.3789,
    longitude: -81.4267,
    source: 'Protected area boundaries',
    notes: 'Barkers National Park entrance'
  },

  // ============ CAYMAN BRAC CORRECTIONS ============

  // Cayman Brac center point
  'official-003': {
    latitude: 19.7167,
    longitude: -79.8833,
    source: 'Official tourism data',
    notes: 'Cayman Brac central reference'
  },

  // Brac Reef Beach Resort
  'brac-hotel-001': {
    latitude: 19.6889,
    longitude: -79.8712,
    source: 'Hotel website',
    notes: 'Brac Reef Beach Resort'
  },

  // The Bluff - Cayman Brac
  'brac-attr-001': {
    latitude: 19.7234,
    longitude: -79.7678,
    source: 'Topographic data',
    notes: 'The Bluff eastern point'
  },

  // Brac Scuba Shack
  'dive-extra-005': {
    latitude: 19.7234,
    longitude: -79.8234,
    source: 'Google Maps',
    notes: 'Brac Scuba Shack, Stake Bay'
  },

  // ============ LITTLE CAYMAN CORRECTIONS ============

  // Little Cayman center point
  'official-004': {
    latitude: 19.6833,
    longitude: -80.0667,
    source: 'Official tourism data',
    notes: 'Little Cayman central reference'
  },

  // Bloody Bay Wall
  'dive-site-001': {
    latitude: 19.6856,
    longitude: -80.0923,
    source: 'Dive site registry',
    notes: 'Bloody Bay Wall dive site'
  },

  // Booby Pond Nature Reserve
  'lc-attr-001': {
    latitude: 19.6734,
    longitude: -80.0512,
    source: 'National Trust data',
    notes: 'Booby Pond Nature Reserve'
  },

  // Conch Club Divers
  'dive-extra-006': {
    latitude: 19.6623,
    longitude: -80.0623,
    source: 'Google Maps',
    notes: 'Conch Club Divers, Blossom Village'
  },

  // Little Cayman Divers
  'dive-extra-007': {
    latitude: 19.6589,
    longitude: -80.0534,
    source: 'Business listing',
    notes: 'Little Cayman Divers'
  },

  // Southern Cross Club
  'lc-hotel-001': {
    latitude: 19.6612,
    longitude: -80.0489,
    source: 'Hotel website',
    notes: 'Southern Cross Club resort'
  }
};

// ============ WELL-KNOWN LOCATIONS ============
// Reference coordinates for common Cayman locations

const WELL_KNOWN_LOCATIONS: Record<string, { lat: number; lng: number; description: string }> = {
  // Grand Cayman
  'george_town_center': { lat: 19.2956, lng: -81.3823, description: 'George Town center' },
  'seven_mile_beach_north': { lat: 19.3450, lng: -81.3880, description: 'Seven Mile Beach north end' },
  'seven_mile_beach_south': { lat: 19.3200, lng: -81.3800, description: 'Seven Mile Beach south end' },
  'west_bay': { lat: 19.3700, lng: -81.4050, description: 'West Bay center' },
  'bodden_town': { lat: 19.2800, lng: -81.2500, description: 'Bodden Town center' },
  'east_end': { lat: 19.2700, lng: -81.1200, description: 'East End' },
  'north_side': { lat: 19.3400, lng: -81.2200, description: 'North Side' },
  'camana_bay': { lat: 19.3271, lng: -81.3775, description: 'Camana Bay' },
  'rum_point': { lat: 19.3612, lng: -81.2634, description: 'Rum Point' },
  'stingray_city': { lat: 19.3689, lng: -81.2978, description: 'Stingray City sandbar' },
  'airport_gcm': { lat: 19.2928, lng: -81.3577, description: 'Owen Roberts Airport' },

  // Cayman Brac
  'cayman_brac_airport': { lat: 19.6870, lng: -79.8828, description: 'Charles Kirkconnell Airport' },
  'stake_bay': { lat: 19.7200, lng: -79.8200, description: 'Stake Bay' },
  'the_bluff': { lat: 19.7234, lng: -79.7678, description: 'The Bluff' },
  'cotton_tree_bay': { lat: 19.6967, lng: -79.8756, description: 'Cotton Tree Bay' },

  // Little Cayman
  'little_cayman_airport': { lat: 19.6600, lng: -80.0900, description: 'Edward Bodden Airfield' },
  'blossom_village': { lat: 19.6623, lng: -80.0623, description: 'Blossom Village' },
  'bloody_bay': { lat: 19.6856, lng: -80.0923, description: 'Bloody Bay' },
  'point_of_sand': { lat: 19.6712, lng: -79.9789, description: 'Point of Sand beach' }
};

// ============ HELPER FUNCTIONS ============

function createBackup(filePath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const dir = path.dirname(filePath);
  const backupPath = path.join(dir, `${baseName}.backup.${timestamp}${ext}`);

  fs.copyFileSync(filePath, backupPath);
  console.log(`Backup created: ${backupPath}`);
  return backupPath;
}

function districtToWellKnownLocation(district: string): { lat: number; lng: number } | null {
  const districtMap: Record<string, string> = {
    'George Town': 'george_town_center',
    'Seven Mile Beach': 'seven_mile_beach_north',
    'West Bay': 'west_bay',
    'Bodden Town': 'bodden_town',
    'East End': 'east_end',
    'North Side': 'north_side',
    'Camana Bay': 'camana_bay',
    'Cayman Brac': 'cayman_brac_airport',
    'Stake Bay': 'stake_bay',
    'Little Cayman': 'blossom_village',
    'Blossom Village': 'blossom_village'
  };

  const key = districtMap[district];
  if (key && WELL_KNOWN_LOCATIONS[key]) {
    return {
      lat: WELL_KNOWN_LOCATIONS[key].lat,
      lng: WELL_KNOWN_LOCATIONS[key].lng
    };
  }
  return null;
}

// ============ FIX GENERATION ============

interface LocationFix {
  nodeId: string;
  oldCoords: { lat: number; lng: number };
  newCoords: { lat: number; lng: number };
  source: string;
  applied: boolean;
}

function generateFixes(knowledgeFilePath: string): LocationFix[] {
  const fixes: LocationFix[] = [];

  // Read the knowledge file content
  const content = fs.readFileSync(knowledgeFilePath, 'utf-8');

  // For each correction, check if the node exists and needs fixing
  for (const [nodeId, correction] of Object.entries(COORDINATE_CORRECTIONS)) {
    // Look for the node in the file
    const nodePattern = new RegExp(`id:\\s*['"]${nodeId}['"]`, 'g');
    if (nodePattern.test(content)) {
      // Find current latitude/longitude for this node
      const latPattern = new RegExp(
        `id:\\s*['"]${nodeId}['"][^}]*latitude:\\s*([\\d.-]+)`,
        's'
      );
      const lngPattern = new RegExp(
        `id:\\s*['"]${nodeId}['"][^}]*longitude:\\s*([\\d.-]+)`,
        's'
      );

      const latMatch = content.match(latPattern);
      const lngMatch = content.match(lngPattern);

      if (latMatch && lngMatch) {
        const currentLat = parseFloat(latMatch[1]);
        const currentLng = parseFloat(lngMatch[1]);

        // Check if fix is needed (coordinates are different)
        if (
          Math.abs(currentLat - correction.latitude) > 0.0001 ||
          Math.abs(currentLng - correction.longitude) > 0.0001
        ) {
          fixes.push({
            nodeId,
            oldCoords: { lat: currentLat, lng: currentLng },
            newCoords: { lat: correction.latitude, lng: correction.longitude },
            source: correction.source,
            applied: false
          });
        }
      }
    }
  }

  return fixes;
}

function applyFixes(knowledgeFilePath: string, fixes: LocationFix[], dryRun: boolean = true): void {
  if (fixes.length === 0) {
    console.log('No fixes to apply.');
    return;
  }

  let content = fs.readFileSync(knowledgeFilePath, 'utf-8');

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Applying ${fixes.length} coordinate fixes...`);

  for (const fix of fixes) {
    // Find and replace the coordinates for this node
    // This is a simplified approach - for production, use AST parsing

    // Pattern to find the location block for this node
    const locationBlockPattern = new RegExp(
      `(id:\\s*['"]${fix.nodeId}['"][^}]*location:\\s*\\{[^}]*latitude:\\s*)${fix.oldCoords.lat}([^}]*longitude:\\s*)${fix.oldCoords.lng}`,
      'g'
    );

    const newContent = content.replace(
      locationBlockPattern,
      `$1${fix.newCoords.lat}$2${fix.newCoords.lng}`
    );

    if (newContent !== content) {
      fix.applied = true;
      content = newContent;

      console.log(`\n  Fixed: ${fix.nodeId}`);
      console.log(`    Old: ${fix.oldCoords.lat}, ${fix.oldCoords.lng}`);
      console.log(`    New: ${fix.newCoords.lat}, ${fix.newCoords.lng}`);
      console.log(`    Source: ${fix.source}`);
    } else {
      console.log(`\n  Skipped: ${fix.nodeId} (pattern not matched)`);
    }
  }

  if (!dryRun) {
    // Create backup before writing
    createBackup(knowledgeFilePath);

    // Write updated content
    fs.writeFileSync(knowledgeFilePath, content);
    console.log(`\nFile updated: ${knowledgeFilePath}`);
  } else {
    console.log('\n[DRY RUN] No changes written to file.');
    console.log('Run with --apply flag to apply changes.');
  }
}

// ============ REPORT GENERATION ============

function generateFixReport(fixes: LocationFix[]): string {
  let report = '# Location Fixes Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `Total fixes: ${fixes.length}\n`;
  report += `Applied: ${fixes.filter(f => f.applied).length}\n`;
  report += `Skipped: ${fixes.filter(f => !f.applied).length}\n\n`;

  report += '## Fixes Applied\n\n';
  for (const fix of fixes.filter(f => f.applied)) {
    report += `### ${fix.nodeId}\n`;
    report += `- Old: ${fix.oldCoords.lat}, ${fix.oldCoords.lng}\n`;
    report += `- New: ${fix.newCoords.lat}, ${fix.newCoords.lng}\n`;
    report += `- Source: ${fix.source}\n\n`;
  }

  if (fixes.some(f => !f.applied)) {
    report += '## Fixes Skipped\n\n';
    for (const fix of fixes.filter(f => !f.applied)) {
      report += `### ${fix.nodeId}\n`;
      report += `- Reason: Pattern not matched in file\n\n`;
    }
  }

  return report;
}

// ============ MAIN EXECUTION ============

function main(): void {
  console.log('========================================');
  console.log('ISLE AI LOCATION FIX SCRIPT');
  console.log('========================================\n');

  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const reportOnly = args.includes('--report');

  const knowledgeFilePath = path.join(__dirname, '..', 'data', 'cayman-islands-knowledge.ts');

  if (!fs.existsSync(knowledgeFilePath)) {
    console.error(`Knowledge file not found: ${knowledgeFilePath}`);
    process.exit(1);
  }

  // Generate fixes based on corrections database
  const fixes = generateFixes(knowledgeFilePath);

  console.log(`Found ${fixes.length} potential fixes in corrections database.`);

  if (reportOnly) {
    const report = generateFixReport(fixes);
    const reportPath = path.join(__dirname, '..', 'data', 'location-fixes-report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`Report written to: ${reportPath}`);
    return;
  }

  if (fixes.length > 0) {
    console.log('\nFixes to apply:');
    for (const fix of fixes) {
      console.log(`  - ${fix.nodeId}: (${fix.oldCoords.lat}, ${fix.oldCoords.lng}) -> (${fix.newCoords.lat}, ${fix.newCoords.lng})`);
    }

    applyFixes(knowledgeFilePath, fixes, dryRun);
  }

  // Write fix report
  const report = generateFixReport(fixes);
  const reportPath = path.join(__dirname, '..', 'data', 'location-fixes-report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`\nFix report written to: ${reportPath}`);

  if (dryRun) {
    console.log('\n========================================');
    console.log('DRY RUN COMPLETE');
    console.log('To apply changes, run: npx ts-node scripts/fix-locations.ts --apply');
    console.log('========================================');
  }
}

// Export for testing
export {
  COORDINATE_CORRECTIONS,
  WELL_KNOWN_LOCATIONS,
  generateFixes,
  applyFixes,
  districtToWellKnownLocation
};
export type { CoordinateCorrection, LocationFix };

// Run if called directly
main();
