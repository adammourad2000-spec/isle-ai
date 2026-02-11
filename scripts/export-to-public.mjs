#!/usr/bin/env node
/**
 * Export unified knowledge base to public folder for runtime loading
 * This avoids bundling the large file into Vite's build
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read the TypeScript file
const tsFile = join(rootDir, 'data', 'unified-knowledge-base.ts');
const content = readFileSync(tsFile, 'utf-8');

// Extract the array data - find from the opening bracket to the closing bracket before the re-export
const startMatch = content.indexOf('export const UNIFIED_KNOWLEDGE_BASE');
if (startMatch === -1) {
  console.error('Could not find UNIFIED_KNOWLEDGE_BASE in file');
  process.exit(1);
}

// Find the opening bracket
const openBracket = content.indexOf('[', startMatch);
if (openBracket === -1) {
  console.error('Could not find opening bracket');
  process.exit(1);
}

// Find the matching closing bracket by counting brackets
let bracketCount = 0;
let closeBracket = -1;
for (let i = openBracket; i < content.length; i++) {
  if (content[i] === '[') bracketCount++;
  if (content[i] === ']') bracketCount--;
  if (bracketCount === 0) {
    closeBracket = i;
    break;
  }
}

if (closeBracket === -1) {
  console.error('Could not find closing bracket');
  process.exit(1);
}

const arrayString = content.substring(openBracket, closeBracket + 1);

// Parse the extracted array
let data;
try {
  data = JSON.parse(arrayString);
} catch (e) {
  console.error('Failed to parse as JSON:', e.message);
  // Try eval as fallback (the data should be valid JS object literals)
  try {
    data = eval(arrayString);
  } catch (e2) {
    console.error('Failed to eval:', e2.message);
    process.exit(1);
  }
}

console.log(`Extracted ${data.length} places from TypeScript file`);

// Write to public folder
const outputPath = join(rootDir, 'public', 'knowledge-base.json');
writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log(`Written to ${outputPath}`);
console.log(`File size: ${(readFileSync(outputPath).length / 1024 / 1024).toFixed(2)} MB`);
