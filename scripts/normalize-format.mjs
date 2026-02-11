#!/usr/bin/env node
/**
 * Normalize all places to have identical googleEnrichment structure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const kbPath = path.join(PROJECT_ROOT, 'data', 'unified-knowledge-base.json');
const data = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));

console.log('Normalizing', data.length, 'places...\n');

let normalized = 0;

for (const place of data) {
  // Ensure googleEnrichment has all expected fields
  if (place.googleEnrichment) {
    const ge = place.googleEnrichment;

    // Add missing fields with null/default values
    if (!('addressComponents' in ge)) ge.addressComponents = null;
    if (!('openingHours' in ge)) ge.openingHours = null;
    if (!('phone' in ge)) ge.phone = place.contact?.phone || null;
    if (!('phoneInternational' in ge)) ge.phoneInternational = place.contact?.phone || null;
    if (!('plusCode' in ge)) ge.plusCode = null;
    if (!('shortAddress' in ge)) ge.shortAddress = null;
    if (!('viewport' in ge)) ge.viewport = null;
    if (!('website' in ge)) ge.website = place.contact?.website || null;
    if (!('priceLevel' in ge)) ge.priceLevel = null;

    // Ensure amenities exists
    if (!ge.amenities) {
      ge.amenities = {
        reservable: null,
        delivery: null,
        dineIn: null,
        takeout: null,
        outdoorSeating: null,
        servesAlcohol: null,
        goodForGroups: null,
        goodForChildren: null,
        wheelchairAccessible: null,
        acceptsCreditCards: null,
        freeParking: null
      };
    }

    normalized++;
  }
}

// Save
fs.writeFileSync(kbPath, JSON.stringify(data, null, 2));
console.log('Normalized', normalized, 'places');
console.log('Saved to', kbPath);
