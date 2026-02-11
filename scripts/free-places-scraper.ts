#!/usr/bin/env npx ts-node --esm

/**
 * ISLE AI - Free Google Maps Scraper (No API Key Required)
 *
 * Uses Puppeteer to scrape Google Maps directly for:
 * - Real photos (replaces Unsplash placeholders)
 * - Phone numbers
 * - Websites
 * - Ratings and reviews
 *
 * Usage:
 *   npm run scrape:free                    # Scrape all places needing enrichment
 *   npm run scrape:free -- --limit=50      # Limit to 50 places
 *   npm run scrape:free -- --dry-run       # Preview without scraping
 *   npm run scrape:free -- --resume        # Resume from last position
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ============ TYPES ============

interface KnowledgeNode {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  shortDescription?: string;
  location: {
    address?: string;
    district?: string;
    island?: string;
    latitude?: number;
    longitude?: number;
    coordinates?: { lat: number; lng: number };
    googlePlaceId?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    bookingUrl?: string;
  };
  business?: {
    priceRange?: string;
    openingHours?: any;
    phone?: string;
    website?: string;
  };
  media?: {
    thumbnail?: string;
    images?: string[];
  };
  ratings?: {
    overall?: number;
    reviewCount?: number;
    googleRating?: number;
  };
  tags?: string[];
  isActive?: boolean;
  [key: string]: any;
}

interface ScrapedData {
  placeId: string;
  name: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
  photos: string[];
  scrapedAt: string;
}

interface ScraperProgress {
  lastIndex: number;
  totalProcessed: number;
  totalEnriched: number;
  totalFailed: number;
  scrapedData: ScrapedData[];
  lastUpdated: string;
}

// ============ CONSTANTS ============

const UNSPLASH_PATTERN = /unsplash\.com/i;
const PLACEHOLDER_PATTERN = /placehold|placeholder|no-image|default/i;
const DELAY_BETWEEN_SEARCHES = 3000; // 3 seconds between searches
const PAGE_LOAD_TIMEOUT = 15000;

// ============ HELPERS ============

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isPlaceholderImage(url?: string): boolean {
  if (!url) return true;
  return UNSPLASH_PATTERN.test(url) || PLACEHOLDER_PATTERN.test(url);
}

function needsEnrichment(node: KnowledgeNode): boolean {
  if (node.isActive === false) return false;

  const hasPlaceholderImage = isPlaceholderImage(node.media?.thumbnail);
  const missingPhone = !node.contact?.phone && !node.business?.phone;
  const missingWebsite = !node.contact?.website && !node.business?.website;

  return hasPlaceholderImage || missingPhone || missingWebsite;
}

function getCoordinates(node: KnowledgeNode): { lat: number; lng: number } | null {
  const lat = node.location?.coordinates?.lat ?? node.location?.latitude;
  const lng = node.location?.coordinates?.lng ?? node.location?.longitude;

  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    return { lat, lng };
  }
  return null;
}

// ============ DATA LOADING ============

function loadAllKnowledgeNodes(): KnowledgeNode[] {
  const allNodes: KnowledgeNode[] = [];

  // Load SerpAPI data (try JSON first, then TS)
  const serpApiJsonPath = path.join(PROJECT_ROOT, 'data', 'serpapi-knowledge-export.json');
  const serpApiTsPath = path.join(PROJECT_ROOT, 'data', 'serpapi-vip-data.ts');

  // Try loading from JSON version if available
  if (fs.existsSync(serpApiJsonPath)) {
    try {
      const nodes = JSON.parse(fs.readFileSync(serpApiJsonPath, 'utf-8'));
      allNodes.push(...nodes);
      console.log(`Loaded ${nodes.length} places from SerpAPI JSON`);
    } catch (e) {
      console.log('Could not load SerpAPI JSON');
    }
  } else if (fs.existsSync(serpApiTsPath)) {
    try {
      const content = fs.readFileSync(serpApiTsPath, 'utf-8');
      // Find the array start and end
      const startMatch = content.match(/export\s+const\s+\w+[^=]*=\s*\[/);
      if (startMatch) {
        const startIdx = content.indexOf('[', startMatch.index);
        let depth = 0;
        let endIdx = startIdx;
        for (let i = startIdx; i < content.length; i++) {
          if (content[i] === '[') depth++;
          if (content[i] === ']') depth--;
          if (depth === 0) {
            endIdx = i + 1;
            break;
          }
        }
        const jsonStr = content.substring(startIdx, endIdx);
        const nodes = JSON.parse(jsonStr);
        allNodes.push(...nodes);
        console.log(`Loaded ${nodes.length} places from SerpAPI TS`);
      }
    } catch (e) {
      console.log('Could not parse SerpAPI TS data');
    }
  }

  // Load OSM data
  const osmJsonPath = path.join(PROJECT_ROOT, 'data', 'osm-scraped', 'osm-knowledge.json');
  if (fs.existsSync(osmJsonPath)) {
    try {
      const nodes = JSON.parse(fs.readFileSync(osmJsonPath, 'utf-8'));
      allNodes.push(...nodes);
      console.log(`Loaded ${nodes.length} places from OSM data`);
    } catch (e) {
      console.log('Could not load OSM JSON data');
    }
  }

  return allNodes;
}

// ============ SCRAPER CLASS ============

class FreeGoogleMapsScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private progress: ScraperProgress;
  private progressPath: string;
  private outputPath: string;

  constructor() {
    this.progressPath = path.join(PROJECT_ROOT, 'data', 'scraper-progress.json');
    this.outputPath = path.join(PROJECT_ROOT, 'data', 'scraped-enrichment.json');
    this.progress = this.loadProgress();
  }

  private loadProgress(): ScraperProgress {
    if (fs.existsSync(this.progressPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.progressPath, 'utf-8'));
      } catch (e) {
        // ignore
      }
    }
    return {
      lastIndex: 0,
      totalProcessed: 0,
      totalEnriched: 0,
      totalFailed: 0,
      scrapedData: [],
      lastUpdated: new Date().toISOString()
    };
  }

  private saveProgress(): void {
    this.progress.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.progressPath, JSON.stringify(this.progress, null, 2));
  }

  async init(): Promise<void> {
    console.log('Launching browser...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Block unnecessary resources for faster loading
    await this.page.setRequestInterception(true);
    this.page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log('Browser ready');
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  async searchPlace(name: string, island: string = 'Grand Cayman'): Promise<ScrapedData | null> {
    if (!this.page) throw new Error('Browser not initialized');

    const searchQuery = `${name} ${island} Cayman Islands`;
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://www.google.com/maps/search/${encodedQuery}`;

    try {
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: PAGE_LOAD_TIMEOUT });
      await sleep(2000); // Wait for dynamic content

      // Check if we landed on a place page or search results
      const currentUrl = this.page.url();

      // Try to extract data from the page
      const data = await this.page.evaluate(() => {
        const result: Partial<ScrapedData> = {
          photos: []
        };

        // Get place name
        const nameEl = document.querySelector('h1.DUwDvf, h1.fontHeadlineLarge');
        if (nameEl) {
          result.name = nameEl.textContent?.trim();
        }

        // Get rating
        const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
        if (ratingEl) {
          const ratingText = ratingEl.textContent?.trim();
          if (ratingText) {
            result.rating = parseFloat(ratingText);
          }
        }

        // Get review count
        const reviewEl = document.querySelector('div.F7nice span[aria-label*="review"]');
        if (reviewEl) {
          const reviewText = reviewEl.getAttribute('aria-label');
          const match = reviewText?.match(/(\d[\d,]*)\s*review/i);
          if (match) {
            result.reviewCount = parseInt(match[1].replace(/,/g, ''));
          }
        }

        // Get phone number
        const phoneEl = document.querySelector('button[data-item-id*="phone"] div.fontBodyMedium, a[data-item-id*="phone"]');
        if (phoneEl) {
          result.phone = phoneEl.textContent?.trim();
        }

        // Alternative phone selector
        if (!result.phone) {
          const allButtons = document.querySelectorAll('button[aria-label*="Phone"]');
          allButtons.forEach(btn => {
            const label = btn.getAttribute('aria-label');
            if (label && label.includes('Phone')) {
              const phoneMatch = label.match(/Phone:\s*([+\d\s\-()]+)/);
              if (phoneMatch) {
                result.phone = phoneMatch[1].trim();
              }
            }
          });
        }

        // Get website
        const websiteEl = document.querySelector('a[data-item-id="authority"]');
        if (websiteEl) {
          result.website = websiteEl.getAttribute('href') || undefined;
        }

        // Alternative website selector
        if (!result.website) {
          const linkEl = document.querySelector('a[aria-label*="Website"]');
          if (linkEl) {
            result.website = linkEl.getAttribute('href') || undefined;
          }
        }

        // Get address
        const addressEl = document.querySelector('button[data-item-id="address"] div.fontBodyMedium');
        if (addressEl) {
          result.address = addressEl.textContent?.trim();
        }

        // Get photos
        const photoEls = document.querySelectorAll('button.aoRNLd img, div.m6QErb img.KVdXNb, img.YQ4gaf');
        photoEls.forEach(img => {
          const src = img.getAttribute('src');
          if (src && src.startsWith('https://') && !src.includes('data:image') && !src.includes('googleusercontent')) {
            // Get higher resolution version
            const highResSrc = src.replace(/=w\d+-h\d+/, '=w800-h600');
            result.photos!.push(highResSrc);
          }
        });

        // Also try to get photos from background images
        const bgEls = document.querySelectorAll('div[style*="background-image"]');
        bgEls.forEach(el => {
          const style = el.getAttribute('style');
          const match = style?.match(/url\(["']?(https:\/\/[^"')\s]+)["']?\)/);
          if (match && match[1] && !match[1].includes('data:image')) {
            const highResSrc = match[1].replace(/=w\d+-h\d+/, '=w800-h600');
            result.photos!.push(highResSrc);
          }
        });

        // Get unique photos
        result.photos = [...new Set(result.photos)].slice(0, 5);

        return result;
      });

      if (data.name || data.phone || data.website || (data.photos && data.photos.length > 0)) {
        return {
          placeId: currentUrl,
          name: data.name || name,
          phone: data.phone,
          website: data.website,
          rating: data.rating,
          reviewCount: data.reviewCount,
          address: data.address,
          photos: data.photos || [],
          scrapedAt: new Date().toISOString()
        };
      }

      return null;

    } catch (error) {
      console.error(`  Error scraping ${name}:`, (error as Error).message);
      return null;
    }
  }

  async scrapeAndEnrich(nodes: KnowledgeNode[], startIndex: number = 0, limit: number = Infinity): Promise<void> {
    const toProcess = nodes.filter(n => needsEnrichment(n)).slice(startIndex, startIndex + limit);

    console.log(`\nProcessing ${toProcess.length} places starting from index ${startIndex}...`);
    console.log('');

    for (let i = 0; i < toProcess.length; i++) {
      const node = toProcess[i];
      const globalIndex = startIndex + i;

      console.log(`[${i + 1}/${toProcess.length}] ${node.name}`);

      const island = node.location?.island || 'Grand Cayman';
      const scraped = await this.searchPlace(node.name, island);

      if (scraped) {
        // Check if we got useful data
        const gotPhotos = scraped.photos.length > 0;
        const gotPhone = !!scraped.phone;
        const gotWebsite = !!scraped.website;

        if (gotPhotos || gotPhone || gotWebsite) {
          this.progress.scrapedData.push({
            ...scraped,
            placeId: node.id
          });
          this.progress.totalEnriched++;

          const additions = [];
          if (gotPhotos) additions.push(`${scraped.photos.length} photos`);
          if (gotPhone) additions.push('phone');
          if (gotWebsite) additions.push('website');
          console.log(`  + Found: ${additions.join(', ')}`);
        } else {
          this.progress.totalFailed++;
          console.log('  - No new data found');
        }
      } else {
        this.progress.totalFailed++;
        console.log('  - Search failed');
      }

      this.progress.lastIndex = globalIndex + 1;
      this.progress.totalProcessed++;

      // Save progress every 10 places
      if ((i + 1) % 10 === 0) {
        this.saveProgress();
        console.log(`  (progress saved: ${this.progress.totalEnriched} enriched)`);
      }

      // Delay between searches to avoid rate limiting
      if (i < toProcess.length - 1) {
        await sleep(DELAY_BETWEEN_SEARCHES);
      }
    }

    // Final save
    this.saveProgress();
    this.saveResults();
  }

  private saveResults(): void {
    // Save scraped data
    fs.writeFileSync(this.outputPath, JSON.stringify(this.progress.scrapedData, null, 2));
    console.log(`\nResults saved to: ${this.outputPath}`);

    // Print summary
    console.log('');
    console.log('============================================');
    console.log('SCRAPING COMPLETE');
    console.log('============================================');
    console.log(`Total processed: ${this.progress.totalProcessed}`);
    console.log(`Successfully enriched: ${this.progress.totalEnriched}`);
    console.log(`Failed/No data: ${this.progress.totalFailed}`);
    console.log('');
    console.log('To apply enrichment to knowledge base, run:');
    console.log('  npm run apply:enrichment');
  }
}

// ============ APPLY ENRICHMENT ============

function applyEnrichmentToKnowledgeBase(): void {
  const enrichmentPath = path.join(PROJECT_ROOT, 'data', 'scraped-enrichment.json');

  if (!fs.existsSync(enrichmentPath)) {
    console.error('No enrichment data found. Run npm run scrape:free first.');
    return;
  }

  const enrichmentData: ScrapedData[] = JSON.parse(fs.readFileSync(enrichmentPath, 'utf-8'));
  console.log(`Loaded ${enrichmentData.length} enrichment records`);

  // Create lookup map
  const enrichmentMap = new Map<string, ScrapedData>();
  for (const data of enrichmentData) {
    enrichmentMap.set(data.placeId, data);
  }

  // TODO: Apply to each knowledge base file
  console.log('Enrichment data ready to apply');
  console.log(`Places with photos: ${enrichmentData.filter(d => d.photos.length > 0).length}`);
  console.log(`Places with phone: ${enrichmentData.filter(d => d.phone).length}`);
  console.log(`Places with website: ${enrichmentData.filter(d => d.website).length}`);
}

// ============ MAIN ============

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const resume = args.includes('--resume');
  const apply = args.includes('--apply');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 50; // Default to 50 for safety

  console.log('============================================');
  console.log('ISLE AI - FREE GOOGLE MAPS SCRAPER');
  console.log('============================================');
  console.log('');

  if (apply) {
    applyEnrichmentToKnowledgeBase();
    return;
  }

  // Load all knowledge nodes
  const allNodes = loadAllKnowledgeNodes();
  const needEnrichmentNodes = allNodes.filter(n => needsEnrichment(n));

  console.log(`Total places loaded: ${allNodes.length}`);
  console.log(`Places needing enrichment: ${needEnrichmentNodes.length}`);
  console.log('');

  // Analyze what needs enrichment
  let placeholderImages = 0;
  let missingWebsites = 0;
  let missingPhones = 0;

  for (const node of needEnrichmentNodes) {
    if (isPlaceholderImage(node.media?.thumbnail)) placeholderImages++;
    if (!node.contact?.website && !node.business?.website) missingWebsites++;
    if (!node.contact?.phone && !node.business?.phone) missingPhones++;
  }

  console.log('Issues to fix:');
  console.log(`  Placeholder images: ${placeholderImages}`);
  console.log(`  Missing websites: ${missingWebsites}`);
  console.log(`  Missing phones: ${missingPhones}`);
  console.log('');

  if (dryRun) {
    console.log('MODE: Dry Run (no scraping)');
    console.log(`Would process ${Math.min(limit, needEnrichmentNodes.length)} places`);
    console.log('');
    console.log('To run actual scraping:');
    console.log('  npm run scrape:free -- --limit=50');
    return;
  }

  // Initialize scraper
  const scraper = new FreeGoogleMapsScraper();

  try {
    await scraper.init();

    const startIndex = resume ? scraper['progress'].lastIndex : 0;
    console.log(`Starting from index: ${startIndex}`);
    console.log(`Limit: ${limit} places`);
    console.log('');

    await scraper.scrapeAndEnrich(needEnrichmentNodes, startIndex, limit);

  } finally {
    await scraper.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
