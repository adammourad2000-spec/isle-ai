#!/usr/bin/env node
/**
 * Embedding Generation Pipeline
 * Generates semantic embeddings for all knowledge base entries using OpenAI
 *
 * Usage: npm run generate:embeddings
 *
 * This script:
 * 1. Loads the knowledge base JSON
 * 2. Creates rich semantic text for each place
 * 3. Generates embeddings using OpenAI text-embedding-3-small (1536 dimensions)
 * 4. Saves embeddings in optimized binary format for fast client-side loading
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Configuration
const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions, cost-effective
const EMBEDDING_DIMENSION = 1536;
const BATCH_SIZE = 100; // OpenAI allows up to 2048 inputs per request
const API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error('Error: OpenAI API key not found.');
  console.error('Set VITE_OPENAI_API_KEY or OPENAI_API_KEY environment variable.');
  process.exit(1);
}

/**
 * Create rich semantic text for embedding
 * Combines all relevant fields to create comprehensive searchable text
 */
function createEmbeddingText(place) {
  const parts = [];

  // Name (most important)
  if (place.name) {
    parts.push(place.name);
  }

  // Category and subcategory (normalized)
  if (place.category) {
    parts.push(place.category.replace(/_/g, ' '));
  }
  if (place.subcategory) {
    parts.push(place.subcategory.replace(/_/g, ' '));
  }

  // Descriptions
  if (place.shortDescription) {
    parts.push(place.shortDescription);
  }
  if (place.description) {
    // Limit description to avoid token limits
    parts.push(place.description.slice(0, 500));
  }

  // Location info
  if (place.location) {
    if (place.location.district) parts.push(place.location.district);
    if (place.location.area) parts.push(place.location.area);
    if (place.location.island) parts.push(place.location.island);
    if (place.location.address) parts.push(place.location.address);
  }

  // Tags and keywords
  if (place.tags && Array.isArray(place.tags)) {
    parts.push(...place.tags.slice(0, 10));
  }
  if (place.keywords && Array.isArray(place.keywords)) {
    parts.push(...place.keywords.slice(0, 10));
  }

  // Highlights
  if (place.highlights && Array.isArray(place.highlights)) {
    parts.push(...place.highlights.slice(0, 5));
  }

  // Business info
  if (place.business) {
    if (place.business.priceRange) parts.push(`price ${place.business.priceRange}`);
    if (place.business.cuisine && Array.isArray(place.business.cuisine)) {
      parts.push(...place.business.cuisine);
    }
    if (place.business.amenities && Array.isArray(place.business.amenities)) {
      parts.push(...place.business.amenities.slice(0, 5));
    }
  }

  // Custom fields (restaurants may have cuisine, hotels may have amenities)
  if (place.customFields) {
    if (place.customFields.cuisine && Array.isArray(place.customFields.cuisine)) {
      parts.push(...place.customFields.cuisine);
    }
    if (place.customFields.amenities && Array.isArray(place.customFields.amenities)) {
      parts.push(...place.customFields.amenities.slice(0, 5));
    }
    if (place.customFields.activities && Array.isArray(place.customFields.activities)) {
      parts.push(...place.customFields.activities.slice(0, 5));
    }
  }

  // Rating context
  if (place.ratings?.overall >= 4.5) {
    parts.push('highly rated', 'excellent', 'top rated');
  } else if (place.ratings?.overall >= 4.0) {
    parts.push('well rated', 'popular');
  }

  // Premium/Featured status
  if (place.isFeatured) parts.push('featured', 'recommended');
  if (place.isPremium) parts.push('premium', 'luxury');

  // Filter empty values and join
  return parts
    .filter(Boolean)
    .map(p => String(p).toLowerCase().trim())
    .filter(p => p.length > 0)
    .join(' ');
}

/**
 * Call OpenAI Embeddings API
 */
async function generateEmbeddings(texts) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data.map(d => d.embedding);
}

/**
 * Save embeddings in optimized format
 */
function saveEmbeddings(embeddings, places) {
  // 1. Create binary Float32Array for embeddings
  const count = embeddings.length;
  const buffer = new Float32Array(count * EMBEDDING_DIMENSION);

  // Create ID index mapping
  const idToIndex = {};
  const indexToId = [];

  embeddings.forEach((emb, idx) => {
    // Store ID mapping
    const placeId = places[idx].id;
    idToIndex[placeId] = idx;
    indexToId.push(placeId);

    // Store embedding in buffer
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      buffer[idx * EMBEDDING_DIMENSION + i] = emb.embedding[i];
    }
  });

  // 2. Save binary embeddings
  const binaryPath = join(rootDir, 'public', 'embeddings.bin');
  writeFileSync(binaryPath, Buffer.from(buffer.buffer));

  // 3. Save index file
  const indexPath = join(rootDir, 'public', 'embedding-index.json');
  const indexData = {
    version: '1.0',
    model: EMBEDDING_MODEL,
    dimension: EMBEDDING_DIMENSION,
    count,
    generatedAt: new Date().toISOString(),
    idToIndex,
    indexToId
  };
  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

  // 4. Save embedding texts for debugging/fallback
  const textsPath = join(rootDir, 'public', 'embedding-texts.json');
  const textsData = embeddings.map((emb, idx) => ({
    id: places[idx].id,
    name: places[idx].name,
    text: emb.text
  }));
  writeFileSync(textsPath, JSON.stringify(textsData, null, 2));

  return {
    binarySize: buffer.byteLength,
    indexSize: JSON.stringify(indexData).length,
    binaryPath,
    indexPath,
    textsPath
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Embedding Generation Pipeline');
  console.log('='.repeat(60));
  console.log(`Model: ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSION} dimensions)`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('');

  // Load knowledge base
  const kbPath = join(rootDir, 'public', 'knowledge-base.json');
  if (!existsSync(kbPath)) {
    console.error(`Error: Knowledge base not found at ${kbPath}`);
    process.exit(1);
  }

  console.log('Loading knowledge base...');
  const places = JSON.parse(readFileSync(kbPath, 'utf-8'));
  console.log(`Loaded ${places.length} places`);

  // Filter to active places with IDs
  const validPlaces = places.filter(p => p.id && p.isActive !== false);
  console.log(`Processing ${validPlaces.length} active places`);
  console.log('');

  // Generate embedding texts
  console.log('Creating embedding texts...');
  const embeddingData = validPlaces.map(place => ({
    id: place.id,
    text: createEmbeddingText(place),
    embedding: null
  }));

  // Show sample
  console.log('Sample embedding text:');
  console.log(`  ${embeddingData[0].text.slice(0, 200)}...`);
  console.log('');

  // Process in batches
  console.log('Generating embeddings from OpenAI...');
  const startTime = Date.now();
  let processed = 0;
  let totalTokens = 0;

  for (let i = 0; i < embeddingData.length; i += BATCH_SIZE) {
    const batch = embeddingData.slice(i, i + BATCH_SIZE);
    const texts = batch.map(e => e.text);

    try {
      const embeddings = await generateEmbeddings(texts);

      // Store embeddings
      embeddings.forEach((emb, idx) => {
        embeddingData[i + idx].embedding = emb;
      });

      processed += batch.length;
      const progress = ((processed / embeddingData.length) * 100).toFixed(1);
      console.log(`  Processed ${processed}/${embeddingData.length} (${progress}%)`);

      // Rate limiting - be gentle with API
      if (i + BATCH_SIZE < embeddingData.length) {
        await new Promise(r => setTimeout(r, 200));
      }

    } catch (error) {
      console.error(`Error processing batch at index ${i}:`, error.message);
      // Continue with next batch
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Embedding generation completed in ${elapsedSeconds}s`);
  console.log('');

  // Filter out any failed embeddings
  const successfulEmbeddings = embeddingData.filter(e => e.embedding !== null);
  console.log(`Successfully generated ${successfulEmbeddings.length}/${embeddingData.length} embeddings`);

  if (successfulEmbeddings.length === 0) {
    console.error('Error: No embeddings generated successfully');
    process.exit(1);
  }

  // Save embeddings
  console.log('');
  console.log('Saving embeddings...');
  const result = saveEmbeddings(successfulEmbeddings, validPlaces);

  console.log('');
  console.log('='.repeat(60));
  console.log('Embedding Generation Complete!');
  console.log('='.repeat(60));
  console.log(`Binary file: ${result.binaryPath}`);
  console.log(`  Size: ${(result.binarySize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Index file: ${result.indexPath}`);
  console.log(`  Entries: ${successfulEmbeddings.length}`);
  console.log(`Texts file: ${result.textsPath}`);
  console.log('');
  console.log('Ready for client-side vector search!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
