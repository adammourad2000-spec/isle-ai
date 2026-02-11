#!/usr/bin/env npx ts-node --esm

/**
 * ISLE AI - Robust Parallel Google Maps Scraper
 *
 * Optimized for high success rate with:
 * - Coordinate-based searches for precision
 * - Multiple fallback search strategies
 * - Cookie/consent dialog handling
 * - Retry logic with exponential backoff
 * - Better data extraction
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
  location: {
    island?: string;
    area?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
    latitude?: number;
    longitude?: number;
  };
  contact?: { phone?: string; website?: string };
  business?: { phone?: string; website?: string };
  media?: { thumbnail?: string; images?: string[] };
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

interface WorkerStats {
  processed: number;
  enriched: number;
  failed: number;
}

// ============ HELPERS ============

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function isPlaceholder(url?: string): boolean {
  if (!url) return true;
  return /unsplash\.com|placehold|placeholder|no-image|default/i.test(url);
}

function needsEnrichment(node: KnowledgeNode): boolean {
  if (node.isActive === false) return false;
  return isPlaceholder(node.media?.thumbnail) ||
         (!node.contact?.phone && !node.business?.phone) ||
         (!node.contact?.website && !node.business?.website);
}

function getCoords(node: KnowledgeNode): { lat: number; lng: number } | null {
  const lat = node.location?.coordinates?.lat ?? node.location?.latitude;
  const lng = node.location?.coordinates?.lng ?? node.location?.longitude;
  if (lat && lng && !isNaN(lat) && !isNaN(lng)) return { lat, lng };
  return null;
}

function cleanName(name: string): string {
  return name
    .replace(/[,\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 60);
}

// ============ WORKER ============

class Worker {
  id: number;
  browser: Browser | null = null;
  page: Page | null = null;
  stats: WorkerStats = { processed: 0, enriched: 0, failed: 0 };

  constructor(id: number) {
    this.id = id;
  }

  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--lang=en-US,en'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1400, height: 900 });
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    // Set English locale
    await this.page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    // Block heavy resources
    await this.page.setRequestInterception(true);
    this.page.on('request', req => {
      const type = req.resourceType();
      if (['stylesheet', 'font', 'media', 'other'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });
  }

  async close(): Promise<void> {
    if (this.browser) await this.browser.close();
  }

  private async handleConsent(): Promise<void> {
    if (!this.page) return;
    try {
      // Handle Google consent dialog
      const consentBtn = await this.page.$('button[aria-label*="Accept"], button[aria-label*="Reject"], form[action*="consent"] button');
      if (consentBtn) {
        await consentBtn.click();
        await sleep(1000);
      }
    } catch { /* ignore */ }
  }

  private async extractData(): Promise<Partial<ScrapedData>> {
    if (!this.page) return { photos: [] };

    return this.page.evaluate(() => {
      const result: Partial<ScrapedData> = { photos: [] };

      // Name - multiple selectors
      const nameSelectors = ['h1.DUwDvf', 'h1.fontHeadlineLarge', 'h1[data-attrid]', 'div.lMbq3e h1'];
      for (const sel of nameSelectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) {
          result.name = el.textContent.trim();
          break;
        }
      }

      // Rating
      const ratingEl = document.querySelector('div.F7nice span, span.ceNzKf, div.fontDisplayLarge');
      if (ratingEl) {
        const match = ratingEl.textContent?.match(/(\d+\.?\d*)/);
        if (match) result.rating = parseFloat(match[1]);
      }

      // Review count
      const reviewEls = document.querySelectorAll('span[aria-label*="review"], div.F7nice span');
      reviewEls.forEach(el => {
        const label = el.getAttribute('aria-label') || el.textContent || '';
        const match = label.match(/(\d[\d,\.]*)\s*review/i);
        if (match) result.reviewCount = parseInt(match[1].replace(/[,\.]/g, ''));
      });

      // Phone - multiple strategies
      const phoneSelectors = [
        'button[data-item-id*="phone"] div.fontBodyMedium',
        'a[href^="tel:"]',
        'button[aria-label*="Phone"]'
      ];
      for (const sel of phoneSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const href = el.getAttribute('href');
          if (href?.startsWith('tel:')) {
            result.phone = href.replace('tel:', '');
            break;
          }
          const label = el.getAttribute('aria-label') || '';
          const match = label.match(/Phone:\s*([+\d\s\-()]+)/);
          if (match) {
            result.phone = match[1].trim();
            break;
          }
          const text = el.textContent?.trim();
          if (text?.match(/^[+\d\s\-()]{7,}/)) {
            result.phone = text;
            break;
          }
        }
      }

      // Website
      const webSelectors = [
        'a[data-item-id="authority"]',
        'a[aria-label*="Website"]',
        'a.CsEnBe[href^="http"]'
      ];
      for (const sel of webSelectors) {
        const el = document.querySelector(sel);
        const href = el?.getAttribute('href');
        if (href && !href.includes('google.com') && !href.includes('maps')) {
          result.website = href;
          break;
        }
      }

      // Address
      const addrEl = document.querySelector('button[data-item-id="address"] div.fontBodyMedium, div.rogA2c');
      if (addrEl) result.address = addrEl.textContent?.trim();

      // Photos - multiple sources
      const photoSources = new Set<string>();

      // Direct images
      document.querySelectorAll('img[src*="googleusercontent"], img[src*="gstatic"]').forEach(img => {
        let src = img.getAttribute('src');
        if (src && src.startsWith('https://')) {
          // Get high resolution
          src = src.replace(/=w\d+(-h\d+)?/, '=w800-h600');
          src = src.replace(/=s\d+/, '=s800');
          photoSources.add(src);
        }
      });

      // Background images
      document.querySelectorAll('[style*="background-image"]').forEach(el => {
        const style = el.getAttribute('style') || '';
        const match = style.match(/url\(['"]?(https:\/\/[^'")\s]+)['"]?\)/);
        if (match?.[1] && (match[1].includes('googleusercontent') || match[1].includes('gstatic'))) {
          let src = match[1].replace(/=w\d+(-h\d+)?/, '=w800-h600');
          photoSources.add(src);
        }
      });

      // Photo button images
      document.querySelectorAll('button.aoRNLd img, div.m6QErb img').forEach(img => {
        let src = img.getAttribute('src');
        if (src?.startsWith('https://') && !src.includes('data:')) {
          src = src.replace(/=w\d+(-h\d+)?/, '=w800-h600');
          photoSources.add(src);
        }
      });

      result.photos = [...photoSources].slice(0, 8);
      return result;
    });
  }

  async scrape(node: KnowledgeNode, retries = 2): Promise<ScrapedData | null> {
    if (!this.page) return null;

    const coords = getCoords(node);
    const name = cleanName(node.name);
    const island = node.location?.island || 'Grand Cayman';

    // Try different search strategies
    const searchStrategies = [
      // Strategy 1: Direct coordinates search (most precise)
      coords ? `https://www.google.com/maps/search/${encodeURIComponent(name)}/@${coords.lat},${coords.lng},17z` : null,
      // Strategy 2: Name + full location
      `https://www.google.com/maps/search/${encodeURIComponent(`${name} ${island} Cayman Islands`)}`,
      // Strategy 3: Just name + Cayman
      `https://www.google.com/maps/search/${encodeURIComponent(`${name} Cayman`)}`,
    ].filter(Boolean) as string[];

    for (let attempt = 0; attempt <= retries; attempt++) {
      const strategy = attempt < searchStrategies.length ? searchStrategies[attempt] : searchStrategies[0];

      try {
        await this.page.goto(strategy, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });

        await this.handleConsent();
        await sleep(2000 + Math.random() * 1000);

        // Wait for content
        await this.page.waitForSelector('h1, div.fontHeadlineLarge', { timeout: 8000 }).catch(() => {});

        const data = await this.extractData();

        // Check if we got useful data
        const hasPhotos = data.photos && data.photos.length > 0;
        const hasPhone = !!data.phone;
        const hasWebsite = !!data.website;

        if (hasPhotos || hasPhone || hasWebsite) {
          return {
            placeId: node.id,
            name: data.name || node.name,
            phone: data.phone,
            website: data.website,
            rating: data.rating,
            reviewCount: data.reviewCount,
            address: data.address,
            photos: data.photos || [],
            scrapedAt: new Date().toISOString()
          };
        }

        // Try next strategy
        if (attempt < retries) {
          await sleep(1500);
        }

      } catch (e) {
        if (attempt < retries) {
          await sleep(2000 * (attempt + 1)); // Exponential backoff
        }
      }
    }

    return null;
  }
}

// ============ ORCHESTRATOR ============

class RobustScraper {
  workers: Worker[] = [];
  results: ScrapedData[] = [];
  numWorkers: number;
  processed = 0;
  enriched = 0;
  failed = 0;
  total = 0;
  startTime = Date.now();
  outputPath: string;

  constructor(numWorkers: number) {
    this.numWorkers = numWorkers;
    this.outputPath = path.join(PROJECT_ROOT, 'data', 'scraped-enrichment.json');

    // Load existing results
    if (fs.existsSync(this.outputPath)) {
      try {
        this.results = JSON.parse(fs.readFileSync(this.outputPath, 'utf-8'));
        console.log(`Loaded ${this.results.length} existing results`);
      } catch { /* ignore */ }
    }
  }

  async init(): Promise<void> {
    console.log(`Starting ${this.numWorkers} browser workers...`);

    const initPromises = [];
    for (let i = 0; i < this.numWorkers; i++) {
      const worker = new Worker(i);
      this.workers.push(worker);
      initPromises.push(worker.init());
    }

    await Promise.all(initPromises);
    console.log(`${this.numWorkers} workers ready\n`);
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map(w => w.close()));
  }

  save(): void {
    // Deduplicate by placeId
    const unique = new Map<string, ScrapedData>();
    for (const r of this.results) {
      if (!unique.has(r.placeId) || r.photos.length > (unique.get(r.placeId)?.photos.length || 0)) {
        unique.set(r.placeId, r);
      }
    }
    this.results = [...unique.values()];

    fs.writeFileSync(this.outputPath, JSON.stringify(this.results, null, 2));
  }

  printProgress(): void {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = this.processed / elapsed;
    const eta = Math.round((this.total - this.processed) / rate);
    const pct = Math.round((this.enriched / Math.max(1, this.processed)) * 100);

    console.log(`\n📊 Progress: ${this.processed}/${this.total} | ✅ ${this.enriched} (${pct}%) | ⏱️ ${rate.toFixed(1)}/s | ETA: ${eta}s\n`);
  }

  async run(nodes: KnowledgeNode[]): Promise<void> {
    // Skip already scraped
    const scrapedIds = new Set(this.results.map(r => r.placeId));
    const toProcess = nodes.filter(n => !scrapedIds.has(n.id));

    this.total = toProcess.length;
    console.log(`Scraping ${this.total} places (${nodes.length - this.total} already done)...\n`);

    if (this.total === 0) {
      console.log('All places already scraped!');
      return;
    }

    const queue = [...toProcess];

    const processWorker = async (worker: Worker): Promise<void> => {
      while (queue.length > 0) {
        const node = queue.shift()!;
        this.processed++;

        const result = await worker.scrape(node);

        if (result && (result.photos.length > 0 || result.phone || result.website)) {
          this.results.push(result);
          this.enriched++;
          worker.stats.enriched++;

          const info: string[] = [];
          if (result.photos.length) info.push(`📷${result.photos.length}`);
          if (result.phone) info.push('📞');
          if (result.website) info.push('🌐');
          console.log(`[${this.processed}/${this.total}] ✅ ${node.name.substring(0, 35)} ${info.join(' ')}`);
        } else {
          this.failed++;
          worker.stats.failed++;
          console.log(`[${this.processed}/${this.total}] ❌ ${node.name.substring(0, 40)}`);
        }

        worker.stats.processed++;

        // Save every 20 places
        if (this.processed % 20 === 0) {
          this.save();
          this.printProgress();
        }

        // Delay between requests
        await sleep(800 + Math.random() * 400);
      }
    };

    // Start all workers
    await Promise.all(this.workers.map(w => processWorker(w)));

    // Final save
    this.save();
    this.printSummary();
  }

  printSummary(): void {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    const successRate = Math.round((this.enriched / Math.max(1, this.processed)) * 100);

    console.log('\n============================================');
    console.log('🎉 SCRAPING COMPLETE');
    console.log('============================================');
    console.log(`📊 Processed: ${this.processed}`);
    console.log(`✅ Enriched: ${this.enriched} (${successRate}%)`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`⏱️ Time: ${elapsed}s (${(this.processed/elapsed).toFixed(1)}/sec)`);
    console.log(`\n📁 Saved to: ${this.outputPath}`);
    console.log('\n▶️ Apply with: npm run apply:enrichment');
  }
}

// ============ MAIN ============

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const workersArg = args.find(a => a.startsWith('--workers='));
  const numWorkers = workersArg ? parseInt(workersArg.split('=')[1]) : 6;

  console.log('============================================');
  console.log('🚀 ISLE AI - ROBUST PARALLEL SCRAPER');
  console.log('============================================\n');

  // Load nodes
  const allNodes: KnowledgeNode[] = [];

  // OSM data
  const osmPath = path.join(PROJECT_ROOT, 'data', 'osm-scraped', 'osm-knowledge.json');
  if (fs.existsSync(osmPath)) {
    const nodes = JSON.parse(fs.readFileSync(osmPath, 'utf-8'));
    allNodes.push(...nodes);
    console.log(`📂 OSM: ${nodes.length} places`);
  }

  // SerpAPI data
  const serpPath = path.join(PROJECT_ROOT, 'data', 'serpapi-vip-data.ts');
  if (fs.existsSync(serpPath)) {
    try {
      const content = fs.readFileSync(serpPath, 'utf-8');
      const match = content.match(/=\s*(\[[\s\S]*\])\s*;?\s*$/);
      if (match) {
        const nodes = JSON.parse(match[1]);
        allNodes.push(...nodes);
        console.log(`📂 SerpAPI: ${nodes.length} places`);
      }
    } catch { console.log('📂 SerpAPI: parse error'); }
  }

  const toEnrich = allNodes.filter(needsEnrichment);

  console.log(`\n📍 Total: ${allNodes.length} | Need enrichment: ${toEnrich.length}`);
  console.log(`👥 Workers: ${numWorkers}\n`);

  const scraper = new RobustScraper(numWorkers);

  try {
    await scraper.init();
    await scraper.run(toEnrich);
  } catch (e) {
    console.error('Error:', e);
    scraper.save();
  } finally {
    await scraper.close();
  }
}

main().catch(console.error);
