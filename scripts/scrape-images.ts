/**
 * ISLE AI - Image Scraping Script for Cayman Islands Knowledge Base
 *
 * This script fetches real, high-quality images for all 500+ places in the knowledge base.
 *
 * Image Sources (in priority order):
 * 1. Google Places API (if GOOGLE_PLACES_API_KEY available)
 * 2. Unsplash API (UNSPLASH_ACCESS_KEY)
 * 3. Wikimedia Commons (free, no auth)
 * 4. Pexels API (PEXELS_API_KEY)
 *
 * Usage:
 *   npx ts-node scripts/scrape-images.ts
 *   npx ts-node scripts/scrape-images.ts --dry-run
 *   npx ts-node scripts/scrape-images.ts --source=unsplash
 *   npx ts-node scripts/scrape-images.ts --category=hotel
 *
 * Environment Variables:
 *   GOOGLE_PLACES_API_KEY - Google Places API key for place photos
 *   UNSPLASH_ACCESS_KEY - Unsplash API access key
 *   PEXELS_API_KEY - Pexels API key
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
function loadEnvFile(): void {
  const envPath = path.join(__dirname, '../.env');
  const envLocalPath = path.join(__dirname, '../.env.local');

  // Try .env.local first, then .env
  const pathToLoad = fs.existsSync(envLocalPath) ? envLocalPath :
                     fs.existsSync(envPath) ? envPath : null;

  if (pathToLoad) {
    const content = fs.readFileSync(pathToLoad, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

// Load env vars at startup
loadEnvFile();

// Types
interface KnowledgeNode {
  id: string;
  category: string;
  subcategory?: string;
  name: string;
  description: string;
  shortDescription: string;
  location: {
    address: string;
    district: string;
    island: string;
    latitude: number;
    longitude: number;
    googlePlaceId?: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    bookingUrl?: string;
  };
  media: {
    thumbnail: string;
    images: string[];
    videos?: string[];
  };
  tags: string[];
  keywords: string[];
}

interface ImageResult {
  nodeId: string;
  nodeName: string;
  category: string;
  oldThumbnail: string;
  newThumbnail: string | null;
  newImages: string[];
  source: string;
  error?: string;
}

interface ScrapingProgress {
  totalNodes: number;
  processedNodes: number;
  successfulNodes: number;
  failedNodes: number;
  results: ImageResult[];
  startedAt: string;
  lastUpdatedAt: string;
}

// Configuration
const CONFIG = {
  RATE_LIMIT_MS: 1000, // 1 request per second
  MAX_IMAGES_PER_NODE: 5,
  OUTPUT_DIR: path.join(__dirname, '../data/scraped-images'),
  PROGRESS_FILE: path.join(__dirname, '../data/scraped-images/progress.json'),
  RESULTS_FILE: path.join(__dirname, '../data/scraped-images/image-mappings.json'),

  // API Endpoints
  UNSPLASH_API: 'https://api.unsplash.com',
  PEXELS_API: 'https://api.pexels.com/v1',
  WIKIMEDIA_API: 'https://commons.wikimedia.org/w/api.php',
  GOOGLE_PLACES_API: 'https://places.googleapis.com/v1',
};

// Category to search term mappings for generic images
const CATEGORY_SEARCH_TERMS: Record<string, string[]> = {
  hotel: ['luxury hotel caribbean', 'beach resort tropical', 'caribbean hotel room'],
  villa_rental: ['luxury villa caribbean', 'beach house tropical', 'vacation rental ocean'],
  restaurant: ['caribbean restaurant', 'fine dining tropical', 'beach restaurant'],
  bar: ['caribbean bar', 'beach bar tropical', 'tiki bar'],
  nightlife: ['caribbean nightclub', 'tropical nightlife', 'beach party'],
  beach: ['caribbean beach', 'tropical beach', 'white sand beach'],
  diving_snorkeling: ['scuba diving caribbean', 'snorkeling coral reef', 'underwater tropical'],
  water_sports: ['water sports caribbean', 'jet ski tropical', 'parasailing beach'],
  boat_charter: ['yacht caribbean', 'boat charter tropical', 'sailing caribbean'],
  superyacht: ['superyacht caribbean', 'luxury yacht', 'mega yacht'],
  attraction: ['caribbean attraction', 'tropical tourism', 'island landmark'],
  activity: ['caribbean activities', 'tropical adventure', 'island tour'],
  golf: ['caribbean golf course', 'tropical golf', 'ocean golf course'],
  shopping: ['caribbean shopping', 'luxury shopping', 'island boutique'],
  spa_wellness: ['caribbean spa', 'tropical spa treatment', 'beach wellness'],
  spa: ['luxury spa caribbean', 'spa treatment tropical', 'wellness resort'],
  transport: ['caribbean transportation', 'island taxi', 'tropical transfer'],
  transportation: ['caribbean transportation', 'island taxi', 'tropical transfer'],
  chauffeur: ['luxury chauffeur service', 'private driver caribbean', 'limousine tropical'],
  private_jet: ['private jet caribbean', 'luxury aviation', 'charter flight'],
  flight: ['caribbean airport', 'island flight', 'tropical aviation'],
  concierge: ['luxury concierge', 'vip service caribbean', 'personal assistant'],
  real_estate: ['caribbean real estate', 'luxury property ocean', 'beach house sale'],
  general_info: ['cayman islands', 'grand cayman', 'caribbean island'],
  visa_travel: ['caribbean travel', 'island airport', 'tropical vacation'],
  event: ['caribbean event', 'tropical celebration', 'island festival'],
  festival: ['caribbean festival', 'tropical carnival', 'island celebration'],
};

// Utility functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '\x1b[36m[INFO]\x1b[0m',
    success: '\x1b[32m[SUCCESS]\x1b[0m',
    error: '\x1b[31m[ERROR]\x1b[0m',
    warn: '\x1b[33m[WARN]\x1b[0m',
  }[type];
  console.log(`${timestamp} ${prefix} ${message}`);
}

function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`Created directory: ${dirPath}`);
  }
}

function saveProgress(progress: ScrapingProgress): void {
  progress.lastUpdatedAt = new Date().toISOString();
  fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function loadProgress(): ScrapingProgress | null {
  if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
    const data = fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf-8');
    return JSON.parse(data);
  }
  return null;
}

// Image Source Implementations

/**
 * Fetch images from Unsplash API
 */
async function fetchUnsplashImages(
  searchQuery: string,
  maxImages: number = 5
): Promise<string[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    log('UNSPLASH_ACCESS_KEY not set, skipping Unsplash', 'warn');
    return [];
  }

  try {
    const url = new URL(`${CONFIG.UNSPLASH_API}/search/photos`);
    url.searchParams.set('query', searchQuery);
    url.searchParams.set('per_page', String(maxImages));
    url.searchParams.set('orientation', 'landscape');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      log(`Unsplash API error: ${response.status}`, 'error');
      return [];
    }

    const data = await response.json();
    return data.results.map((photo: any) =>
      `${photo.urls.regular}&w=1200&q=80`
    );
  } catch (error) {
    log(`Unsplash fetch error: ${error}`, 'error');
    return [];
  }
}

/**
 * Fetch images from Pexels API
 */
async function fetchPexelsImages(
  searchQuery: string,
  maxImages: number = 5
): Promise<string[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    log('PEXELS_API_KEY not set, skipping Pexels', 'warn');
    return [];
  }

  try {
    const url = new URL(`${CONFIG.PEXELS_API}/search`);
    url.searchParams.set('query', searchQuery);
    url.searchParams.set('per_page', String(maxImages));
    url.searchParams.set('orientation', 'landscape');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': apiKey,
      },
    });

    if (!response.ok) {
      log(`Pexels API error: ${response.status}`, 'error');
      return [];
    }

    const data = await response.json();
    return data.photos.map((photo: any) => photo.src.large2x || photo.src.large);
  } catch (error) {
    log(`Pexels fetch error: ${error}`, 'error');
    return [];
  }
}

/**
 * Fetch images from Wikimedia Commons
 * This is FREE and requires no authentication!
 */
async function fetchWikimediaImages(
  searchQuery: string,
  maxImages: number = 5
): Promise<string[]> {
  try {
    const url = new URL(CONFIG.WIKIMEDIA_API);
    url.searchParams.set('action', 'query');
    url.searchParams.set('generator', 'search');
    url.searchParams.set('gsrsearch', `${searchQuery} filetype:bitmap`);
    url.searchParams.set('gsrlimit', String(maxImages * 2)); // Get more to filter
    url.searchParams.set('gsrnamespace', '6'); // File namespace
    url.searchParams.set('prop', 'imageinfo');
    url.searchParams.set('iiprop', 'url|size|mime');
    url.searchParams.set('iiurlwidth', '1200');
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');

    const response = await fetch(url.toString());

    if (!response.ok) {
      log(`Wikimedia API error: ${response.status}`, 'error');
      return [];
    }

    const data = await response.json();

    if (!data.query?.pages) {
      return [];
    }

    const images: string[] = [];
    for (const page of Object.values(data.query.pages) as any[]) {
      if (page.imageinfo && page.imageinfo[0]) {
        const info = page.imageinfo[0];
        // Filter for reasonable sizes and image types
        if (
          info.mime?.startsWith('image/') &&
          info.width >= 800 &&
          info.height >= 400
        ) {
          // Use thumburl if available, otherwise url
          images.push(info.thumburl || info.url);
          if (images.length >= maxImages) break;
        }
      }
    }

    return images;
  } catch (error) {
    log(`Wikimedia fetch error: ${error}`, 'error');
    return [];
  }
}

/**
 * Fetch images from Google Places API (New)
 */
async function fetchGooglePlacesImages(
  placeId: string,
  maxImages: number = 5
): Promise<string[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    log('GOOGLE_PLACES_API_KEY not set, skipping Google Places', 'warn');
    return [];
  }

  try {
    // First, get place details with photos
    const url = `${CONFIG.GOOGLE_PLACES_API}/places/${placeId}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'photos',
      },
    });

    if (!response.ok) {
      log(`Google Places API error: ${response.status}`, 'error');
      return [];
    }

    const data = await response.json();

    if (!data.photos || data.photos.length === 0) {
      return [];
    }

    // Get photo URLs
    const images: string[] = [];
    for (const photo of data.photos.slice(0, maxImages)) {
      const photoUrl = `${CONFIG.GOOGLE_PLACES_API}/${photo.name}/media?maxWidthPx=1200&key=${apiKey}`;
      images.push(photoUrl);
    }

    return images;
  } catch (error) {
    log(`Google Places fetch error: ${error}`, 'error');
    return [];
  }
}

/**
 * Try to extract Open Graph image from a website
 */
async function fetchWebsiteOGImage(websiteUrl: string): Promise<string | null> {
  try {
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IsleAI/1.0; +https://isleai.com)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract og:image
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogImageMatch && ogImageMatch[1]) {
      return ogImageMatch[1];
    }

    // Try twitter:image
    const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (twitterImageMatch && twitterImageMatch[1]) {
      return twitterImageMatch[1];
    }

    return null;
  } catch (error) {
    log(`Website OG fetch error for ${websiteUrl}: ${error}`, 'warn');
    return null;
  }
}

/**
 * Generate search query for a knowledge node
 */
function generateSearchQuery(node: KnowledgeNode): string {
  // Use name + location for specific places
  const locationPart = node.location.island || 'Cayman Islands';
  return `${node.name} ${locationPart}`.trim();
}

/**
 * Generate fallback search query based on category
 */
function generateCategoryFallbackQuery(node: KnowledgeNode): string {
  const terms = CATEGORY_SEARCH_TERMS[node.category] || ['caribbean tourism'];
  // Pick a random term for variety
  const term = terms[Math.floor(Math.random() * terms.length)];
  return term;
}

/**
 * Check if an image URL is valid (not a placeholder or broken)
 */
function isValidImageUrl(url: string): boolean {
  if (!url) return false;

  // Check for placeholder patterns
  const placeholderPatterns = [
    'placeholder',
    'no-image',
    'default',
    'missing',
    'null',
    'undefined',
    'data:image',
    'base64',
  ];

  const lowerUrl = url.toLowerCase();
  return !placeholderPatterns.some(pattern => lowerUrl.includes(pattern));
}

/**
 * Check if existing image needs replacement
 */
function needsNewImage(node: KnowledgeNode): boolean {
  const thumbnail = node.media?.thumbnail;

  // No thumbnail at all
  if (!thumbnail) return true;

  // Invalid URL patterns
  if (!isValidImageUrl(thumbnail)) return true;

  // Google user content thumbnails are often low quality
  if (thumbnail.includes('googleusercontent.com') && thumbnail.includes('w138')) {
    return true;
  }

  // Unsplash random (already good quality, might want to keep)
  if (thumbnail.includes('unsplash.com')) {
    return false;
  }

  return false;
}

/**
 * Main function to fetch images for a single node
 */
async function fetchImagesForNode(
  node: KnowledgeNode,
  options: { forceRefresh?: boolean; preferredSource?: string } = {}
): Promise<ImageResult> {
  const result: ImageResult = {
    nodeId: node.id,
    nodeName: node.name,
    category: node.category,
    oldThumbnail: node.media?.thumbnail || '',
    newThumbnail: null,
    newImages: [],
    source: 'none',
  };

  // Check if we actually need new images
  if (!options.forceRefresh && !needsNewImage(node)) {
    result.source = 'existing';
    result.newThumbnail = node.media.thumbnail;
    result.newImages = node.media.images || [];
    log(`Skipping ${node.name} - already has good images`, 'info');
    return result;
  }

  const searchQuery = generateSearchQuery(node);
  log(`Fetching images for: ${node.name} (query: "${searchQuery}")`);

  try {
    // Strategy 1: Google Places (if we have placeId)
    if (node.location.googlePlaceId) {
      const googleImages = await fetchGooglePlacesImages(
        node.location.googlePlaceId,
        CONFIG.MAX_IMAGES_PER_NODE
      );

      if (googleImages.length > 0) {
        result.newThumbnail = googleImages[0];
        result.newImages = googleImages;
        result.source = 'google_places';
        log(`Got ${googleImages.length} images from Google Places for ${node.name}`, 'success');
        return result;
      }
    }

    // Strategy 2: Website OG image
    if (node.contact?.website) {
      await sleep(500); // Small delay
      const ogImage = await fetchWebsiteOGImage(node.contact.website);
      if (ogImage && isValidImageUrl(ogImage)) {
        result.newThumbnail = ogImage;
        result.newImages = [ogImage];
        result.source = 'website_og';
        log(`Got OG image from website for ${node.name}`, 'success');
        // Continue to get more images from other sources
      }
    }

    // Strategy 3: Unsplash
    await sleep(CONFIG.RATE_LIMIT_MS);
    const unsplashImages = await fetchUnsplashImages(searchQuery, CONFIG.MAX_IMAGES_PER_NODE);

    if (unsplashImages.length > 0) {
      if (!result.newThumbnail) {
        result.newThumbnail = unsplashImages[0];
      }
      result.newImages = [...result.newImages, ...unsplashImages].slice(0, CONFIG.MAX_IMAGES_PER_NODE);
      result.source = result.source === 'website_og' ? 'website_og+unsplash' : 'unsplash';
      log(`Got ${unsplashImages.length} images from Unsplash for ${node.name}`, 'success');

      if (result.newImages.length >= CONFIG.MAX_IMAGES_PER_NODE) {
        return result;
      }
    }

    // Strategy 4: Pexels
    await sleep(CONFIG.RATE_LIMIT_MS);
    const pexelsImages = await fetchPexelsImages(searchQuery, CONFIG.MAX_IMAGES_PER_NODE);

    if (pexelsImages.length > 0) {
      if (!result.newThumbnail) {
        result.newThumbnail = pexelsImages[0];
      }
      result.newImages = [...result.newImages, ...pexelsImages].slice(0, CONFIG.MAX_IMAGES_PER_NODE);
      if (!result.source.includes('unsplash')) {
        result.source = 'pexels';
      } else {
        result.source = result.source + '+pexels';
      }
      log(`Got ${pexelsImages.length} images from Pexels for ${node.name}`, 'success');

      if (result.newImages.length >= CONFIG.MAX_IMAGES_PER_NODE) {
        return result;
      }
    }

    // Strategy 5: Wikimedia Commons (free fallback)
    await sleep(CONFIG.RATE_LIMIT_MS);
    const wikimediaImages = await fetchWikimediaImages(searchQuery, CONFIG.MAX_IMAGES_PER_NODE);

    if (wikimediaImages.length > 0) {
      if (!result.newThumbnail) {
        result.newThumbnail = wikimediaImages[0];
      }
      result.newImages = [...result.newImages, ...wikimediaImages].slice(0, CONFIG.MAX_IMAGES_PER_NODE);
      if (result.source === 'none') {
        result.source = 'wikimedia';
      } else {
        result.source = result.source + '+wikimedia';
      }
      log(`Got ${wikimediaImages.length} images from Wikimedia for ${node.name}`, 'success');
    }

    // Strategy 6: Category fallback (generic images)
    if (!result.newThumbnail || result.newImages.length === 0) {
      const fallbackQuery = generateCategoryFallbackQuery(node);
      log(`Using category fallback query: "${fallbackQuery}" for ${node.name}`, 'warn');

      await sleep(CONFIG.RATE_LIMIT_MS);
      const fallbackImages = await fetchUnsplashImages(fallbackQuery, CONFIG.MAX_IMAGES_PER_NODE);

      if (fallbackImages.length > 0) {
        if (!result.newThumbnail) {
          result.newThumbnail = fallbackImages[0];
        }
        result.newImages = [...result.newImages, ...fallbackImages].slice(0, CONFIG.MAX_IMAGES_PER_NODE);
        result.source = (result.source === 'none' ? '' : result.source + '+') + 'category_fallback';
        log(`Got ${fallbackImages.length} fallback images for ${node.name}`, 'success');
      }
    }

    // Final check
    if (!result.newThumbnail && result.newImages.length === 0) {
      result.error = 'No images found from any source';
      log(`Failed to find images for ${node.name}`, 'error');
    }

  } catch (error) {
    result.error = String(error);
    log(`Error fetching images for ${node.name}: ${error}`, 'error');
  }

  return result;
}

/**
 * Load all knowledge nodes from the data files
 */
async function loadAllKnowledgeNodes(): Promise<KnowledgeNode[]> {
  log('Loading knowledge nodes from data files...');

  // We need to read the TypeScript files and extract the data
  // Since we can't import them directly, we'll parse them

  const caymanKnowledgePath = path.join(__dirname, '../data/cayman-islands-knowledge.ts');
  const serpapiDataPath = path.join(__dirname, '../data/serpapi-vip-data.ts');

  const allNodes: KnowledgeNode[] = [];

  // Read and parse cayman-islands-knowledge.ts
  // For simplicity, we'll create a temporary JS file that exports the data
  // Or we can use regex to extract the arrays

  log('Reading cayman-islands-knowledge.ts...');
  const caymanContent = fs.readFileSync(caymanKnowledgePath, 'utf-8');

  log('Reading serpapi-vip-data.ts...');
  const serpapiContent = fs.readFileSync(serpapiDataPath, 'utf-8');

  // Extract SERPAPI_ENRICHED_DATA array
  const serpapiMatch = serpapiContent.match(/export const SERPAPI_ENRICHED_DATA: KnowledgeNode\[\] = (\[[\s\S]*?\]);?\s*$/);
  if (serpapiMatch) {
    try {
      // This is a simplified approach - in production, use a proper parser
      const jsonStr = serpapiMatch[1]
        .replace(/\/\/.*$/gm, '') // Remove comments
        .replace(/,\s*]/g, ']') // Remove trailing commas
        .replace(/,\s*}/g, '}'); // Remove trailing commas

      const data = JSON.parse(jsonStr);
      allNodes.push(...data);
      log(`Loaded ${data.length} nodes from serpapi-vip-data.ts`, 'success');
    } catch (e) {
      log(`Error parsing serpapi data: ${e}`, 'error');
    }
  }

  // For the main knowledge file, we need a different approach since it has multiple arrays
  // We'll extract each exported array
  const arrayNames = [
    'CAYMAN_GENERAL_INFO',
    'CAYMAN_HOTELS',
    'CAYMAN_RESTAURANTS',
    'CAYMAN_BEACHES',
    'CAYMAN_DIVING',
    'CAYMAN_SPAS',
    'CAYMAN_BARS',
    'CAYMAN_ACTIVITIES',
    'CAYMAN_VIP_SERVICES',
    'CAYMAN_SHOPPING',
    'CAYMAN_TRANSPORTATION',
    'CAYMAN_SERVICES',
    'CAYMAN_AIRLINES',
    'CAYMAN_EVENTS',
    'CAYMAN_DIVE_EXTRAS',
    'CAYMAN_OFFICIAL_CONTENT',
    'CAYMAN_BUS_ROUTES',
    'CAYMAN_ADDITIONAL',
  ];

  for (const arrayName of arrayNames) {
    const regex = new RegExp(`export const ${arrayName}: KnowledgeNode\\[\\] = (\\[[\\s\\S]*?\\]);`, 'g');
    const match = regex.exec(caymanContent);

    if (match) {
      try {
        // Clean and parse
        let jsonStr = match[1];

        // This is a heuristic approach - extract just the objects
        // For production, consider using a TypeScript parser like ts-morph

        // For now, we'll just count nodes and note we need to process the file differently
        const idMatches = jsonStr.match(/id:\s*['"]([^'"]+)['"]/g);
        if (idMatches) {
          log(`Found ${idMatches.length} nodes in ${arrayName}`, 'info');
        }
      } catch (e) {
        log(`Could not parse ${arrayName}: ${e}`, 'warn');
      }
    }
  }

  log(`Total unique nodes loaded: ${allNodes.length}`);
  return allNodes;
}

/**
 * Parse TypeScript file content to extract knowledge nodes
 * This handles the specific format of our data files
 */
function parseKnowledgeNodesFromTS(content: string, fileName: string): KnowledgeNode[] {
  const nodes: KnowledgeNode[] = [];

  // Find the start of the array (after the export statement)
  const arrayStartMatch = content.match(/export const \w+:\s*KnowledgeNode\[\]\s*=\s*\[/);
  if (!arrayStartMatch) {
    log(`Could not find KnowledgeNode array in ${fileName}`, 'warn');
    return nodes;
  }

  const arrayStart = (arrayStartMatch.index || 0) + arrayStartMatch[0].length - 1;

  // Find matching closing bracket
  let bracketDepth = 0;
  let arrayEnd = arrayStart;

  for (let i = arrayStart; i < content.length; i++) {
    if (content[i] === '[') bracketDepth++;
    if (content[i] === ']') {
      bracketDepth--;
      if (bracketDepth === 0) {
        arrayEnd = i + 1;
        break;
      }
    }
  }

  let arrayContent = content.substring(arrayStart, arrayEnd);

  // Clean up for JSON parsing
  arrayContent = arrayContent
    .replace(/\/\/[^\n]*/g, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

  try {
    const parsed = JSON.parse(arrayContent);
    nodes.push(...parsed);
    log(`Parsed ${parsed.length} nodes from ${fileName}`, 'success');
  } catch (e) {
    log(`JSON parse failed for ${fileName}, trying individual extraction...`, 'warn');

    // Fallback: Extract individual node objects using regex
    const nodeMatches = arrayContent.matchAll(/\{\s*"id":\s*"([^"]+)"[^}]*"name":\s*"([^"]+)"[^}]*"category":\s*"([^"]+)"[\s\S]*?\n\s*\}/g);

    for (const match of nodeMatches) {
      try {
        // Extract just this node object
        const fullMatch = match[0];
        // Try to parse it
        const nodeObj = JSON.parse(fullMatch);
        nodes.push(nodeObj);
      } catch {
        // Create a minimal node from regex captures
        const [, id, name, category] = match;
        if (id && name) {
          nodes.push({
            id,
            name,
            category: category || 'unknown',
            description: '',
            shortDescription: '',
            location: {
              address: '',
              district: '',
              island: 'Grand Cayman',
              latitude: 0,
              longitude: 0,
            },
            contact: {},
            media: {
              thumbnail: '',
              images: [],
            },
            tags: [],
            keywords: [],
          });
        }
      }
    }
  }

  return nodes;
}

/**
 * Alternative: Load nodes by reading and parsing the TypeScript data files
 */
async function loadNodesViaDynamicImport(): Promise<KnowledgeNode[]> {
  log('Loading nodes from data files...');

  const allNodes: KnowledgeNode[] = [];
  const serpapiPath = path.join(__dirname, '../data/serpapi-vip-data.ts');
  const knowledgePath = path.join(__dirname, '../data/cayman-islands-knowledge.ts');

  // Try to load serpapi data first (it's JSON-formatted)
  if (fs.existsSync(serpapiPath)) {
    const content = fs.readFileSync(serpapiPath, 'utf-8');

    // Find the array start - look for the = [ pattern after the export
    const exportMatch = content.match(/export const SERPAPI_ENRICHED_DATA:\s*KnowledgeNode\[\]\s*=\s*\[/);
    if (!exportMatch) {
      log('Could not find SERPAPI_ENRICHED_DATA export', 'error');
      return allNodes;
    }

    // The array starts at the [ in the "= [" part
    const startIndex = (exportMatch.index || 0) + exportMatch[0].length - 1;

    if (startIndex !== -1) {
      // Find matching end bracket
      let depth = 0;
      let endIndex = startIndex;

      for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '[') depth++;
        if (content[i] === ']') {
          depth--;
          if (depth === 0) {
            endIndex = i + 1;
            break;
          }
        }
      }

      let arrayStr = content.substring(startIndex, endIndex);

      // Remove trailing content after the array (semicolon, etc.)
      arrayStr = arrayStr.trim();
      if (arrayStr.endsWith(';')) {
        arrayStr = arrayStr.slice(0, -1);
      }

      try {
        const nodes = JSON.parse(arrayStr);
        allNodes.push(...nodes);
        log(`Loaded ${nodes.length} nodes from serpapi-vip-data.ts`, 'success');
      } catch (e) {
        log(`Failed to parse serpapi data: ${e}`, 'error');

        // Try parsing with comments removed
        const cleaned = arrayStr
          .replace(/\/\/[^\n]*/g, '')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/,\s*\]/g, ']')
          .replace(/,\s*\}/g, '}');

        try {
          const nodes = JSON.parse(cleaned);
          allNodes.push(...nodes);
          log(`Loaded ${nodes.length} nodes after cleanup`, 'success');
        } catch (e2) {
          log(`Cleanup parse also failed: ${e2}`, 'error');
        }
      }
    }
  }

  // Also try to extract from cayman-islands-knowledge.ts
  if (fs.existsSync(knowledgePath) && allNodes.length < 100) {
    log('Also loading from cayman-islands-knowledge.ts...');
    const content = fs.readFileSync(knowledgePath, 'utf-8');

    // This file has multiple exported arrays
    // Extract node IDs and basic info using regex
    const idMatches = content.matchAll(/"id":\s*"([^"]+)"[\s\S]*?"name":\s*"([^"]+)"[\s\S]*?"category":\s*"([^"]+)"/g);

    const existingIds = new Set(allNodes.map(n => n.id));
    let additionalCount = 0;

    for (const match of idMatches) {
      const [, id, name, category] = match;
      if (!existingIds.has(id)) {
        existingIds.add(id);
        additionalCount++;
        // Add minimal node for processing
        allNodes.push({
          id,
          name,
          category,
          description: '',
          shortDescription: '',
          location: {
            address: '',
            district: '',
            island: 'Grand Cayman',
            latitude: 0,
            longitude: 0,
          },
          contact: {},
          media: {
            thumbnail: '',
            images: [],
          },
          tags: [],
          keywords: [],
        });
      }
    }

    if (additionalCount > 0) {
      log(`Added ${additionalCount} additional nodes from cayman-islands-knowledge.ts`, 'success');
    }
  }

  log(`Total nodes loaded: ${allNodes.length}`);
  return allNodes;
}

/**
 * Create a simple extraction script to get nodes
 */
function extractNodesFromFiles(): KnowledgeNode[] {
  log('Extracting nodes using regex pattern matching...');

  const allNodes: KnowledgeNode[] = [];
  const serpapiPath = path.join(__dirname, '../data/serpapi-vip-data.ts');

  const content = fs.readFileSync(serpapiPath, 'utf-8');

  // Match each node object
  const nodePattern = /\{\s*"id":\s*"([^"]+)"[\s\S]*?"category":\s*"([^"]+)"[\s\S]*?"name":\s*"([^"]+)"[\s\S]*?"description":\s*"([^"]*)"[\s\S]*?"location":\s*\{[\s\S]*?"googlePlaceId":\s*"([^"]*)"/g;

  let match;
  while ((match = nodePattern.exec(content)) !== null) {
    const [, id, category, name, description, googlePlaceId] = match;

    // Extract more fields...
    // This is getting complex - let's use a different approach
  }

  // Better approach: Find all objects that start with {"id": "serp-
  const objectPattern = /\{\s*"id":\s*"serp-[^}]+(?:\{[^}]*\}[^}]*)*\}/g;

  log(`Extracted ${allNodes.length} nodes via regex`);
  return allNodes;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const forceRefresh = args.includes('--force');
  const resumeMode = args.includes('--resume');

  // Parse category filter
  const categoryArg = args.find(a => a.startsWith('--category='));
  const categoryFilter = categoryArg ? categoryArg.split('=')[1] : null;

  // Parse source preference
  const sourceArg = args.find(a => a.startsWith('--source='));
  const preferredSource = sourceArg ? sourceArg.split('=')[1] : null;

  // Parse limit
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

  console.log('\n========================================');
  console.log('   ISLE AI - Image Scraping Script');
  console.log('========================================\n');

  log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  log(`Force Refresh: ${forceRefresh}`);
  log(`Resume Mode: ${resumeMode}`);
  if (categoryFilter) log(`Category Filter: ${categoryFilter}`);
  if (preferredSource) log(`Preferred Source: ${preferredSource}`);
  if (limit) log(`Limit: ${limit} nodes`);

  // Check environment variables
  console.log('\nAPI Keys Status:');
  console.log(`  GOOGLE_PLACES_API_KEY: ${process.env.GOOGLE_PLACES_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`  UNSPLASH_ACCESS_KEY: ${process.env.UNSPLASH_ACCESS_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`  PEXELS_API_KEY: ${process.env.PEXELS_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log('');

  // Ensure output directory exists
  ensureDirectoryExists(CONFIG.OUTPUT_DIR);

  // Load nodes
  let nodes = await loadNodesViaDynamicImport();

  if (nodes.length === 0) {
    log('No nodes loaded, trying alternative extraction...', 'warn');
    nodes = extractNodesFromFiles();
  }

  if (nodes.length === 0) {
    log('Failed to load any nodes. Please check the data files.', 'error');
    process.exit(1);
  }

  // Apply filters
  if (categoryFilter) {
    nodes = nodes.filter(n => n.category === categoryFilter);
    log(`Filtered to ${nodes.length} nodes in category: ${categoryFilter}`);
  }

  // Apply limit
  if (limit && limit > 0) {
    nodes = nodes.slice(0, limit);
    log(`Limited to first ${nodes.length} nodes`);
  }

  // Check for existing progress
  let progress: ScrapingProgress;
  const existingProgress = loadProgress();

  if (resumeMode && existingProgress) {
    progress = existingProgress;
    const processedIds = new Set(progress.results.map(r => r.nodeId));
    nodes = nodes.filter(n => !processedIds.has(n.id));
    log(`Resuming from previous run. ${nodes.length} nodes remaining.`);
  } else {
    progress = {
      totalNodes: nodes.length,
      processedNodes: 0,
      successfulNodes: 0,
      failedNodes: 0,
      results: [],
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  log(`Processing ${nodes.length} nodes...`);

  if (isDryRun) {
    log('DRY RUN - No actual API calls will be made');
    for (const node of nodes.slice(0, 10)) {
      console.log(`  Would process: ${node.name} (${node.category})`);
    }
    if (nodes.length > 10) {
      console.log(`  ... and ${nodes.length - 10} more`);
    }
    return;
  }

  // Process each node
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const progressPct = ((progress.processedNodes + i + 1) / progress.totalNodes * 100).toFixed(1);

    console.log(`\n[${progressPct}%] Processing ${i + 1}/${nodes.length}: ${node.name}`);

    const result = await fetchImagesForNode(node, { forceRefresh });
    progress.results.push(result);

    if (result.newThumbnail) {
      progress.successfulNodes++;
    } else {
      progress.failedNodes++;
    }
    progress.processedNodes++;

    // Save progress every 10 nodes
    if ((i + 1) % 10 === 0) {
      saveProgress(progress);
      log(`Progress saved (${progress.processedNodes} nodes processed)`);
    }

    // Rate limiting
    await sleep(CONFIG.RATE_LIMIT_MS);
  }

  // Final save
  saveProgress(progress);

  // Generate final results file
  const imageMappings: Record<string, { thumbnail: string; images: string[] }> = {};
  for (const result of progress.results) {
    if (result.newThumbnail) {
      imageMappings[result.nodeId] = {
        thumbnail: result.newThumbnail,
        images: result.newImages,
      };
    }
  }

  fs.writeFileSync(CONFIG.RESULTS_FILE, JSON.stringify(imageMappings, null, 2));

  // Print summary
  console.log('\n========================================');
  console.log('   SCRAPING COMPLETE');
  console.log('========================================\n');
  console.log(`Total Nodes: ${progress.totalNodes}`);
  console.log(`Processed: ${progress.processedNodes}`);
  console.log(`Successful: ${progress.successfulNodes}`);
  console.log(`Failed: ${progress.failedNodes}`);
  console.log(`\nResults saved to: ${CONFIG.RESULTS_FILE}`);
  console.log(`Progress saved to: ${CONFIG.PROGRESS_FILE}`);

  // Source breakdown
  const sourceCounts: Record<string, number> = {};
  for (const result of progress.results) {
    sourceCounts[result.source] = (sourceCounts[result.source] || 0) + 1;
  }

  console.log('\nImage Sources Breakdown:');
  for (const [source, count] of Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${source}: ${count}`);
  }
}

// Run the script
main().catch(error => {
  log(`Fatal error: ${error}`, 'error');
  process.exit(1);
});
