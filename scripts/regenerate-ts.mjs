#!/usr/bin/env node

/**
 * ISLE AI - Regenerate TypeScript Knowledge Base
 * Converts unified-knowledge-base.json to unified-knowledge-base.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');

async function main() {
  console.log('='.repeat(60));
  console.log('ISLE AI - Regenerate TypeScript Knowledge Base');
  console.log('='.repeat(60));

  const jsonPath = path.join(DATA_DIR, 'unified-knowledge-base.json');

  if (!fs.existsSync(jsonPath)) {
    console.error('ERROR: unified-knowledge-base.json not found!');
    process.exit(1);
  }

  console.log('\nLoading JSON knowledge base...');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`Loaded ${data.length} places`);

  // Generate TypeScript export
  let tsContent = `// ISLE AI - Unified Knowledge Base
// Google Places Enriched Data - ${new Date().toISOString()}
// ${data.length} places with enriched data from Google Places API

import type { KnowledgeNode } from '../types/chatbot';

// Type alias for unified places
export type UnifiedPlace = KnowledgeNode & {
  slug?: string;
  searchText?: string;
  source?: string;
  sourceId?: string;
  quality?: {
    score: number;
    hasPhoto: boolean;
    hasPhone: boolean;
    hasWebsite: boolean;
    hasDescription: boolean;
    hasHours: boolean;
  };
  googleEnrichment?: any;
};

export const UNIFIED_KNOWLEDGE_BASE: UnifiedPlace[] = `;

  tsContent += JSON.stringify(data, null, 2);
  tsContent += ';\n\n// Re-export for convenience\nexport default UNIFIED_KNOWLEDGE_BASE;\n';

  // Write TypeScript file
  const tsPath = path.join(DATA_DIR, 'unified-knowledge-base.ts');
  fs.writeFileSync(tsPath, tsContent, 'utf-8');
  console.log(`\nWrote ${tsPath}`);
  console.log(`File size: ${(fs.statSync(tsPath).size / 1024 / 1024).toFixed(2)} MB`);

  // Quality report
  const withGoogle = data.filter(p => p.googleEnrichment).length;
  const withPhotos = data.filter(p => p.media?.images?.length > 0).length;
  const withCoords = data.filter(p => p.location?.coordinates?.lat && p.location?.coordinates?.lng).length;

  console.log('\n' + '='.repeat(60));
  console.log('DATA SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total places: ${data.length}`);
  console.log(`With Google enrichment: ${withGoogle}`);
  console.log(`With photos: ${withPhotos}`);
  console.log(`With coordinates: ${withCoords}`);

  // By category
  const byCategory = {};
  for (const p of data) {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  }
  console.log('\nBy category:');
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));

  console.log('\n✅ Done!');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
