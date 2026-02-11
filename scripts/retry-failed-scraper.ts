#!/usr/bin/env npx ts-node --esm

/**
 * ISLE AI - Retry Failed Entries Scraper
 *
 * Specifically targets entries that failed in the previous scrape
 * with more aggressive search strategies.
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

// ============ WORKER ============

class Worker {
  id: number;
  browser: Browser | null = null;
  page: Page | null = null;

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
    await this.page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

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
      const btns = await this.page.$$('button');
      for (const btn of btns) {
        const text = await btn.evaluate(el => el.textContent?.toLowerCase() || '');
        if (text.includes('accept') || text.includes('reject') || text.includes('agree')) {
          await btn.click();
          await sleep(500);
          break;
        }
      }
    } catch { /* ignore */ }
  }

  private async extractData(): Promise<Partial<ScrapedData>> {
    if (!this.page) return { photos: [] };

    return this.page.evaluate(() => {
      const result: any = { photos: [] };

      // Name
      const nameEl = document.querySelector('h1.DUwDvf, h1.fontHeadlineLarge, h1[class*="headline"]');
      if (nameEl) result.name = nameEl.textContent?.trim();

      // Rating
      const ratingEl = document.querySelector('span.ceNzKf, div.F7nice span[aria-hidden="true"], span[role="img"][aria-label*="star"]');
      if (ratingEl) {
        const text = ratingEl.textContent?.trim() || ratingEl.getAttribute('aria-label') || '';
        const r = parseFloat(text.match(/[\d.]+/)?.[0] || '0');
        if (r > 0 && r <= 5) result.rating = r;
      }

      // Review count
      const reviewEls = document.querySelectorAll('span[aria-label*="review"], button[aria-label*="review"]');
      reviewEls.forEach(el => {
        const label = el.getAttribute('aria-label') || el.textContent || '';
        const match = label.match(/([\d,]+)\s*review/i);
        if (match) result.reviewCount = parseInt(match[1].replace(/,/g, ''));
      });

      // Phone - multiple selectors
      const phoneSelectors = [
        'button[data-item-id*="phone"]',
        'a[data-item-id*="phone"]',
        'button[aria-label*="Phone"]',
        'a[href^="tel:"]'
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
          if (text?.match(/^\+?[\d\s\-()]+$/)) {
            result.phone = text;
            break;
          }
        }
      }

      // Website - multiple selectors
      const websiteSelectors = [
        'a[data-item-id="authority"]',
        'a[aria-label*="Website"]',
        'a[data-tooltip*="website"]'
      ];
      for (const sel of websiteSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const href = el.getAttribute('href');
          if (href && !href.startsWith('javascript')) {
            result.website = href;
            break;
          }
        }
      }

      // Address
      const addressEl = document.querySelector('button[data-item-id="address"] div.fontBodyMedium, div[data-item-id="address"]');
      if (addressEl) result.address = addressEl.textContent?.trim();

      // Photos - comprehensive extraction
      const photoUrls = new Set<string>();

      // Gallery images
      document.querySelectorAll('img.YQ4gaf, button.aoRNLd img, img[decoding="async"]').forEach(img => {
        const src = img.getAttribute('src');
        if (src?.includes('googleusercontent.com') && !src.includes('data:image')) {
          photoUrls.add(src.replace(/=w\d+-h\d+[^&]*/, '=w800-h600-k-no'));
        }
      });

      // Background images
      document.querySelectorAll('div[style*="background-image"]').forEach(el => {
        const style = el.getAttribute('style') || '';
        const match = style.match(/url\(["']?(https:\/\/[^"')]+)["']?\)/);
        if (match?.[1]?.includes('googleusercontent.com')) {
          photoUrls.add(match[1].replace(/=w\d+-h\d+[^&]*/, '=w800-h600-k-no'));
        }
      });

      result.photos = [...photoUrls].slice(0, 5);
      return result;
    });
  }

  async scrape(node: KnowledgeNode): Promise<ScrapedData | null> {
    if (!this.page) return null;

    const name = node.name.replace(/[,\-–—]/g, ' ').trim().substring(0, 60);
    const island = node.location?.island || 'Grand Cayman';
    const area = node.location?.area || '';
    const coords = getCoords(node);
    const category = node.category || '';

    // Build multiple search strategies - more aggressive for retry
    const searches: string[] = [];

    // Strategy 1: Exact name with coordinates
    if (coords) {
      searches.push(`https://www.google.com/maps/search/${encodeURIComponent(name)}/@${coords.lat},${coords.lng},17z`);
    }

    // Strategy 2: Name + island + category
    if (category && !['misc', 'other', 'general'].includes(category.toLowerCase())) {
      searches.push(`https://www.google.com/maps/search/${encodeURIComponent(`${name} ${category} ${island} Cayman`)}`);
    }

    // Strategy 3: Name + island
    searches.push(`https://www.google.com/maps/search/${encodeURIComponent(`${name} ${island} Cayman Islands`)}`);

    // Strategy 4: Name + area if available
    if (area) {
      searches.push(`https://www.google.com/maps/search/${encodeURIComponent(`${name} ${area} Cayman`)}`);
    }

    // Strategy 5: Just name + Cayman
    searches.push(`https://www.google.com/maps/search/${encodeURIComponent(`${name} Cayman`)}`);

    // Strategy 6: Try with address if available
    if (node.location?.address) {
      searches.push(`https://www.google.com/maps/search/${encodeURIComponent(node.location.address)}`);
    }

    // Strategy 7: Coordinate zoom if we have them
    if (coords) {
      searches.push(`https://www.google.com/maps/@${coords.lat},${coords.lng},18z`);
    }

    // Try each strategy
    for (const url of searches) {
      try {
        await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        await this.handleConsent();
        await sleep(1500);

        // Check if we landed on a place page
        const hasPlacePage = await this.page.evaluate(() => {
          return !!document.querySelector('h1.DUwDvf, h1.fontHeadlineLarge, div[role="main"][aria-label]');
        });

        if (hasPlacePage) {
          const data = await this.extractData();

          // Check if we got useful data
          if (data.photos?.length || data.phone || data.website) {
            return {
              placeId: node.id,
              name: data.name || node.name,
              phone: data.phone,
              website: data.website?.startsWith('/url?')
                ? new URL(data.website, 'https://www.google.com').searchParams.get('q') || data.website
                : data.website,
              rating: data.rating,
              reviewCount: data.reviewCount,
              address: data.address,
              photos: data.photos || [],
              scrapedAt: new Date().toISOString()
            };
          }
        }

        // Try clicking on first result if we're on a list
        try {
          const firstResult = await this.page.$('a[href*="/maps/place/"]');
          if (firstResult) {
            await firstResult.click();
            await sleep(2000);

            const data = await this.extractData();
            if (data.photos?.length || data.phone || data.website) {
              return {
                placeId: node.id,
                name: data.name || node.name,
                phone: data.phone,
                website: data.website?.startsWith('/url?')
                  ? new URL(data.website, 'https://www.google.com').searchParams.get('q') || data.website
                  : data.website,
                rating: data.rating,
                reviewCount: data.reviewCount,
                address: data.address,
                photos: data.photos || [],
                scrapedAt: new Date().toISOString()
              };
            }
          }
        } catch { /* continue to next strategy */ }

      } catch {
        continue;
      }
    }

    return null;
  }
}

// ============ ORCHESTRATOR ============

class RetryScraper {
  workers: Worker[] = [];
  numWorkers: number;
  results: ScrapedData[] = [];
  processed = 0;
  enriched = 0;
  failed = 0;
  total = 0;
  outputPath: string;
  startTime = Date.now();

  constructor(numWorkers: number) {
    this.numWorkers = numWorkers;
    this.outputPath = path.join(PROJECT_ROOT, 'data', 'scraped-enrichment.json');

    // Load existing results
    if (fs.existsSync(this.outputPath)) {
      try {
        this.results = JSON.parse(fs.readFileSync(this.outputPath, 'utf-8'));
        console.log(`📂 Loaded ${this.results.length} existing results`);
      } catch { /* ignore */ }
    }
  }

  async init(): Promise<void> {
    console.log(`\n🚀 Starting ${this.numWorkers} browser workers...`);

    const initPromises = [];
    for (let i = 0; i < this.numWorkers; i++) {
      const worker = new Worker(i);
      this.workers.push(worker);
      initPromises.push(worker.init());
    }

    await Promise.all(initPromises);
    console.log(`✅ ${this.numWorkers} workers ready\n`);
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map(w => w.close()));
  }

  save(): void {
    // Deduplicate by placeId, keeping the one with most photos
    const unique = new Map<string, ScrapedData>();
    for (const r of this.results) {
      const existing = unique.get(r.placeId);
      if (!existing || r.photos.length > existing.photos.length) {
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
    // Get IDs of already-scraped entries (those with useful data)
    const successfulIds = new Set(
      this.results
        .filter(r => r.photos.length > 0 || r.phone || r.website)
        .map(r => r.placeId)
    );

    // Filter to only failed entries
    const failedNodes = nodes.filter(n => !successfulIds.has(n.id));

    // Also filter out flight entries and other non-scrapable items
    const toRetry = failedNodes.filter(n => {
      const name = n.name.toLowerCase();
      // Skip flight entries
      if (name.includes('flight:') || name.includes('→')) return false;
      // Skip generic search results
      if (name === 'search result' || name === 'grand cayman') return false;
      return true;
    });

    this.total = toRetry.length;
    console.log(`\n🔄 Retrying ${this.total} failed entries (filtered from ${failedNodes.length})...\n`);

    if (this.total === 0) {
      console.log('✅ No more entries to retry!');
      return;
    }

    const queue = [...toRetry];

    const processWorker = async (worker: Worker): Promise<void> => {
      while (queue.length > 0) {
        const node = queue.shift()!;
        this.processed++;

        const result = await worker.scrape(node);

        if (result && (result.photos.length > 0 || result.phone || result.website)) {
          this.results.push(result);
          this.enriched++;

          const info: string[] = [];
          if (result.photos.length) info.push(`📷${result.photos.length}`);
          if (result.phone) info.push('📞');
          if (result.website) info.push('🌐');
          console.log(`[${this.processed}/${this.total}] ✅ ${node.name.substring(0, 35)} ${info.join(' ')}`);
        } else {
          this.failed++;
          console.log(`[${this.processed}/${this.total}] ❌ ${node.name.substring(0, 40)}`);
        }

        // Save every 15 places
        if (this.processed % 15 === 0) {
          this.save();
          this.printProgress();
        }

        // Slightly longer delay for retry to avoid rate limiting
        await sleep(1000 + Math.random() * 500);
      }
    };

    await Promise.all(this.workers.map(w => processWorker(w)));

    this.save();
    this.printSummary();
  }

  printSummary(): void {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    const successRate = Math.round((this.enriched / Math.max(1, this.processed)) * 100);

    console.log('\n============================================');
    console.log('🔄 RETRY SCRAPING COMPLETE');
    console.log('============================================');
    console.log(`📊 Retried: ${this.processed}`);
    console.log(`✅ Newly enriched: ${this.enriched} (${successRate}%)`);
    console.log(`❌ Still failed: ${this.failed}`);
    console.log(`⏱️ Time: ${elapsed}s`);
    console.log(`\n📁 Total in file: ${this.results.length} enriched entries`);
    console.log('\n▶️ Apply with: npm run apply:enrichment');
  }
}

// ============ MAIN ============

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const workersArg = args.find(a => a.startsWith('--workers='));
  const numWorkers = workersArg ? parseInt(workersArg.split('=')[1]) : 6;

  console.log('============================================');
  console.log('🔄 ISLE AI - RETRY FAILED ENTRIES SCRAPER');
  console.log('============================================');

  // Load nodes
  const allNodes: KnowledgeNode[] = [];

  const osmPath = path.join(PROJECT_ROOT, 'data', 'osm-scraped', 'osm-knowledge.json');
  if (fs.existsSync(osmPath)) {
    const nodes = JSON.parse(fs.readFileSync(osmPath, 'utf-8'));
    allNodes.push(...nodes);
    console.log(`📂 OSM: ${nodes.length} places`);
  }

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

  const needingEnrichment = allNodes.filter(needsEnrichment);
  console.log(`\n📍 Total needing enrichment: ${needingEnrichment.length}`);
  console.log(`👥 Workers: ${numWorkers}`);

  const scraper = new RetryScraper(numWorkers);

  try {
    await scraper.init();
    await scraper.run(needingEnrichment);
  } catch (e) {
    console.error('Error:', e);
    scraper.save();
  } finally {
    await scraper.close();
  }
}

main().catch(console.error);
