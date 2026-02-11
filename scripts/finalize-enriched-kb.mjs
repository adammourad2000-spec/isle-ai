#!/usr/bin/env node

/**
 * ISLE AI - Finalize Enriched Knowledge Base
 * Converts enriched-knowledge-base.json to unified-knowledge-base.ts
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
  console.log('ISLE AI - Finalize Enriched Knowledge Base');
  console.log('='.repeat(60));

  const enrichedPath = path.join(DATA_DIR, 'enriched-knowledge-base.json');
  
  if (!fs.existsSync(enrichedPath)) {
    console.error('ERROR: enriched-knowledge-base.json not found!');
    process.exit(1);
  }

  console.log('\nLoading enriched knowledge base...');
  const enrichedData = JSON.parse(fs.readFileSync(enrichedPath, 'utf-8'));
  console.log(`Loaded ${enrichedData.length} places`);

  // Create backup
  const backupDir = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const existingTsPath = path.join(DATA_DIR, 'unified-knowledge-base.ts');
  
  if (fs.existsSync(existingTsPath)) {
    fs.copyFileSync(existingTsPath, path.join(backupDir, `unified-knowledge-base-${timestamp}.ts`));
    console.log(`Backup created: unified-knowledge-base-${timestamp}.ts`);
  }

  // Generate TypeScript export
  let tsContent = `// ISLE AI - Unified Knowledge Base
// Google Places Enriched Data - ${new Date().toISOString()}
// ${enrichedData.length} places with enriched data from Google Places API

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

  tsContent += JSON.stringify(enrichedData, null, 2);
  tsContent += ';\n\n// Re-export for convenience\nexport default UNIFIED_KNOWLEDGE_BASE;\n';

  // Write outputs
  fs.writeFileSync(existingTsPath, tsContent, 'utf-8');
  console.log(`\nWrote ${existingTsPath}`);

  // Also update JSON
  const jsonPath = path.join(DATA_DIR, 'unified-knowledge-base.json');
  fs.writeFileSync(jsonPath, JSON.stringify(enrichedData, null, 2), 'utf-8');
  console.log(`Wrote ${jsonPath}`);

  // Quality report
  const qualityStats = {
    perfect: enrichedData.filter(p => p.quality?.score === 100).length,
    good: enrichedData.filter(p => p.quality?.score >= 80 && p.quality?.score < 100).length,
    fair: enrichedData.filter(p => p.quality?.score >= 60 && p.quality?.score < 80).length,
    poor: enrichedData.filter(p => p.quality?.score < 60).length
  };

  console.log('\n' + '='.repeat(60));
  console.log('DATA QUALITY REPORT');
  console.log('='.repeat(60));
  console.log(`Perfect (100%): ${qualityStats.perfect} places`);
  console.log(`Good (80-99%): ${qualityStats.good} places`);
  console.log(`Fair (60-79%): ${qualityStats.fair} places`);
  console.log(`Poor (<60%): ${qualityStats.poor} places`);

  const avgQuality = enrichedData.reduce((sum, p) => sum + (p.quality?.score || 0), 0) / enrichedData.length;
  console.log(`\nAverage Quality Score: ${avgQuality.toFixed(1)}%`);

  console.log('\n' + '='.repeat(60));
  console.log('FINALIZATION COMPLETE!');
  console.log('='.repeat(60));
}

main().catch(console.error);
