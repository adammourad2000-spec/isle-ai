/**
 * Embedding Loader Service
 * Loads pre-computed embeddings and provides fast vector similarity search
 *
 * Features:
 * - Loads binary Float32Array embeddings for memory efficiency
 * - Optimized cosine similarity with loop unrolling
 * - In-memory caching after first load
 * - Graceful error handling with fallback
 */

// Types
export interface EmbeddingIndex {
  version: string;
  model: string;
  dimension: number;
  count: number;
  generatedAt: string;
  idToIndex: Record<string, number>;
  indexToId: string[];
}

export interface SimilarityResult {
  id: string;
  score: number;
  index: number;
}

export interface EmbeddingStore {
  index: EmbeddingIndex;
  embeddings: Float32Array;
  isLoaded: boolean;
  getEmbedding: (id: string) => Float32Array | null;
  searchSimilar: (queryEmbedding: Float32Array, topK?: number) => SimilarityResult[];
  searchSimilarByIds: (ids: string[], topK?: number) => SimilarityResult[];
  getAverageEmbedding: (ids: string[]) => Float32Array | null;
}

// Cache for loaded store
let cachedStore: EmbeddingStore | null = null;
let loadingPromise: Promise<EmbeddingStore> | null = null;

/**
 * Load the embedding store from pre-computed files
 * Returns cached store if already loaded
 */
export async function loadEmbeddingStore(): Promise<EmbeddingStore> {
  // Return cached if available
  if (cachedStore?.isLoaded) {
    return cachedStore;
  }

  // Return existing promise if loading
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  loadingPromise = loadEmbeddingsInternal();
  return loadingPromise;
}

/**
 * Check if embeddings are loaded
 */
export function isEmbeddingsLoaded(): boolean {
  return cachedStore?.isLoaded ?? false;
}

/**
 * Get the cached store synchronously (may be null if not loaded)
 */
export function getEmbeddingStore(): EmbeddingStore | null {
  return cachedStore;
}

/**
 * Internal loading function
 */
async function loadEmbeddingsInternal(): Promise<EmbeddingStore> {
  console.log('[EmbeddingLoader] Loading embedding store...');
  const startTime = performance.now();

  try {
    // Load index and binary in parallel
    const [indexResponse, embeddingsResponse] = await Promise.all([
      fetch('/embedding-index.json'),
      fetch('/embeddings.bin')
    ]);

    if (!indexResponse.ok) {
      throw new Error(`Failed to load embedding index: ${indexResponse.status}`);
    }
    if (!embeddingsResponse.ok) {
      throw new Error(`Failed to load embeddings binary: ${embeddingsResponse.status}`);
    }

    const index: EmbeddingIndex = await indexResponse.json();
    const buffer = await embeddingsResponse.arrayBuffer();
    const embeddings = new Float32Array(buffer);

    // Validate data
    const expectedLength = index.count * index.dimension;
    if (embeddings.length !== expectedLength) {
      throw new Error(
        `Embedding size mismatch: expected ${expectedLength}, got ${embeddings.length}`
      );
    }

    const loadTime = (performance.now() - startTime).toFixed(1);
    console.log(
      `[EmbeddingLoader] Loaded ${index.count} embeddings (${index.dimension}D) in ${loadTime}ms`
    );

    // Create store object
    cachedStore = {
      index,
      embeddings,
      isLoaded: true,

      getEmbedding(id: string): Float32Array | null {
        const idx = index.idToIndex[id];
        if (idx === undefined) return null;
        const start = idx * index.dimension;
        return embeddings.slice(start, start + index.dimension);
      },

      searchSimilar(queryEmbedding: Float32Array, topK: number = 30): SimilarityResult[] {
        return searchSimilarInternal(embeddings, index, queryEmbedding, topK);
      },

      searchSimilarByIds(ids: string[], topK: number = 30): SimilarityResult[] {
        // Get average embedding of the given IDs
        const avgEmb = this.getAverageEmbedding(ids);
        if (!avgEmb) return [];
        return this.searchSimilar(avgEmb, topK);
      },

      getAverageEmbedding(ids: string[]): Float32Array | null {
        const validEmbeddings: Float32Array[] = [];

        for (const id of ids) {
          const emb = this.getEmbedding(id);
          if (emb) validEmbeddings.push(emb);
        }

        if (validEmbeddings.length === 0) return null;

        // Compute average
        const result = new Float32Array(index.dimension);
        for (const emb of validEmbeddings) {
          for (let i = 0; i < index.dimension; i++) {
            result[i] += emb[i];
          }
        }
        for (let i = 0; i < index.dimension; i++) {
          result[i] /= validEmbeddings.length;
        }

        // Normalize the result
        return normalizeVector(result);
      }
    };

    return cachedStore;

  } catch (error) {
    console.error('[EmbeddingLoader] Failed to load embeddings:', error);
    loadingPromise = null; // Allow retry

    // Return a stub store that gracefully fails
    cachedStore = createStubStore();
    return cachedStore;
  }
}

/**
 * Create a stub store for when embeddings fail to load
 */
function createStubStore(): EmbeddingStore {
  return {
    index: {
      version: 'stub',
      model: 'none',
      dimension: 1536,
      count: 0,
      generatedAt: new Date().toISOString(),
      idToIndex: {},
      indexToId: []
    },
    embeddings: new Float32Array(0),
    isLoaded: false,
    getEmbedding: () => null,
    searchSimilar: () => [],
    searchSimilarByIds: () => [],
    getAverageEmbedding: () => null
  };
}

/**
 * Optimized similarity search using cosine similarity
 * Uses loop unrolling for better performance
 */
function searchSimilarInternal(
  embeddings: Float32Array,
  index: EmbeddingIndex,
  queryEmbedding: Float32Array,
  topK: number
): SimilarityResult[] {
  const dimension = index.dimension;
  const count = index.count;
  const scores: SimilarityResult[] = [];

  // Pre-compute query norm
  let queryNorm = 0;
  for (let i = 0; i < dimension; i++) {
    queryNorm += queryEmbedding[i] * queryEmbedding[i];
  }
  queryNorm = Math.sqrt(queryNorm);

  if (queryNorm === 0) return [];

  // Compute similarity for each embedding
  for (let idx = 0; idx < count; idx++) {
    const start = idx * dimension;
    const score = cosineSimilarityOptimized(
      queryEmbedding,
      embeddings,
      start,
      dimension,
      queryNorm
    );

    scores.push({
      id: index.indexToId[idx],
      score,
      index: idx
    });
  }

  // Sort by score descending and return top K
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topK);
}

/**
 * Optimized cosine similarity calculation
 * Uses loop unrolling for ~2x performance improvement
 */
function cosineSimilarityOptimized(
  query: Float32Array,
  embeddings: Float32Array,
  start: number,
  dimension: number,
  queryNorm: number
): number {
  let dotProduct = 0;
  let embNorm = 0;

  // Process 4 elements at a time (loop unrolling)
  const unrollLimit = dimension - (dimension % 4);
  let i = 0;

  for (; i < unrollLimit; i += 4) {
    const q0 = query[i];
    const q1 = query[i + 1];
    const q2 = query[i + 2];
    const q3 = query[i + 3];

    const e0 = embeddings[start + i];
    const e1 = embeddings[start + i + 1];
    const e2 = embeddings[start + i + 2];
    const e3 = embeddings[start + i + 3];

    dotProduct += q0 * e0 + q1 * e1 + q2 * e2 + q3 * e3;
    embNorm += e0 * e0 + e1 * e1 + e2 * e2 + e3 * e3;
  }

  // Handle remaining elements
  for (; i < dimension; i++) {
    const q = query[i];
    const e = embeddings[start + i];
    dotProduct += q * e;
    embNorm += e * e;
  }

  embNorm = Math.sqrt(embNorm);
  const denominator = queryNorm * embNorm;

  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Normalize a vector to unit length
 */
function normalizeVector(vec: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);

  if (norm === 0) return vec;

  const result = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    result[i] = vec[i] / norm;
  }
  return result;
}

/**
 * Generate embedding for text using OpenAI API
 * Used for real-time query embedding
 */
export async function generateQueryEmbedding(text: string): Promise<Float32Array | null> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('[EmbeddingLoader] No OpenAI API key for query embedding');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.toLowerCase().trim()
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return new Float32Array(data.data[0].embedding);

  } catch (error) {
    console.error('[EmbeddingLoader] Failed to generate query embedding:', error);
    return null;
  }
}

/**
 * Compute combined query embedding from multiple text parts
 * Useful for combining user query + context
 */
export async function generateCombinedEmbedding(
  parts: { text: string; weight: number }[]
): Promise<Float32Array | null> {
  const embeddings: { embedding: Float32Array; weight: number }[] = [];

  for (const part of parts) {
    if (!part.text.trim()) continue;
    const emb = await generateQueryEmbedding(part.text);
    if (emb) {
      embeddings.push({ embedding: emb, weight: part.weight });
    }
  }

  if (embeddings.length === 0) return null;

  // Weighted average
  const dimension = embeddings[0].embedding.length;
  const result = new Float32Array(dimension);
  let totalWeight = 0;

  for (const { embedding, weight } of embeddings) {
    for (let i = 0; i < dimension; i++) {
      result[i] += embedding[i] * weight;
    }
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;

  for (let i = 0; i < dimension; i++) {
    result[i] /= totalWeight;
  }

  return normalizeVector(result);
}
