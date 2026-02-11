#!/usr/bin/env node
/**
 * ISLE AI - Knowledge Base Cleanup & Expansion
 *
 * Step 1: Remove places without Google Maps match
 * Step 2: Add new places from Google Places API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const INPUT_FILE = path.join(PROJECT_ROOT, 'data', 'unified-knowledge-base.json');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'data', 'unified-knowledge-base.json');
const BACKUP_FILE = path.join(PROJECT_ROOT, 'data', 'backups', `pre-cleanup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

// Load the knowledge base
console.log('Loading knowledge base...');
const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
console.log(`Total places: ${data.length}`);

// Create backup
fs.mkdirSync(path.dirname(BACKUP_FILE), { recursive: true });
fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2));
console.log(`Backup created: ${BACKUP_FILE}`);

// Filter to keep only places with Google enrichment
const googleMatched = data.filter(place => place.googleEnrichment && place.location.googlePlaceId);
const removed = data.filter(place => !place.googleEnrichment || !place.location.googlePlaceId);

console.log(`\n=== CLEANUP RESULTS ===`);
console.log(`Keeping: ${googleMatched.length} places with Google match`);
console.log(`Removing: ${removed.length} places without Google match`);

// Save the cleaned data
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(googleMatched, null, 2));
console.log(`\nSaved cleaned knowledge base: ${googleMatched.length} places`);

// Log what was removed by category
const removedByCategory = {};
for (const place of removed) {
  removedByCategory[place.category] = (removedByCategory[place.category] || 0) + 1;
}
console.log('\nRemoved by category:');
Object.entries(removedByCategory)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));

// Save list of removed places for reference
const removedListFile = path.join(PROJECT_ROOT, 'data', 'removed-places.json');
fs.writeFileSync(removedListFile, JSON.stringify(removed.map(p => ({ id: p.id, name: p.name, category: p.category })), null, 2));
console.log(`\nRemoved places list saved to: ${removedListFile}`);
