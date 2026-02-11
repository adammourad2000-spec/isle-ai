#!/usr/bin/env npx ts-node --esm

/**
 * ISLE AI - Parallel Google Maps Scraper
 *
 * Runs multiple browser instances in parallel to scrape all places quickly.
 * No API key required - uses Puppeteer to scrape Google Maps directly.
 *
 * Usage:
 *   npm run scrape:parallel              # Scrape all places with 5 parallel workers
 *   npm run scrape:parallel -- --workers=10   # Use 10 parallel workers
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
    coordinates?: { lat: number; lng: number };
    latitude?: number;
    longitude?: number;
  };
  contact?: { phone?: string; website?: string };
  business?: { phone?: string; website?: string };
  media?: { thumbnail?: string; images?: string[] };
  ratings?: { overall?: number; reviewCount?: number };
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

const UNSPLASH_PATTERN = /unsplash\.com/i;
const PLACEHOLDER_PATTERN = /placehold|placeholder|no-image|default/i;

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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ DATA LOADING ============

function loadAllNodes(): KnowledgeNode[] {
  const allNodes: KnowledgeNode[] = [];

  // Load OSM data
  const osmJsonPath = path.join(PROJECT_ROOT, 'data', 'osm-scraped', 'osm-knowledge.json');
  if (fs.existsSync(osmJsonPath)) {
    try {
      const nodes = JSON.parse(fs.readFileSync(osmJsonPath, 'utf-8'));
      allNodes.push(...nodes);
      console.log(`Loaded ${nodes.length} places from OSM`);
    } catch (e) { /* ignore */ }
  }

  // Load SerpAPI data
  const serpApiPath = path.join(PROJECT_ROOT, 'data', 'serpapi-vip-data.ts');
  if (fs.existsSync(serpApiPath)) {
    try {
      const content = fs.readFileSync(serpApiPath, 'utf-8');
      const startMatch = content.match(/export\s+const\s+\w+[^=]*=\s*\[/);
      if (startMatch) {
        const startIdx = content.indexOf('[', startMatch.index);
        let depth = 0, endIdx = startIdx;
        for (let i = startIdx; i < content.length; i++) {
          if (content[i] === '[') depth++;
          if (content[i] === ']') depth--;
          if (depth === 0) { endIdx = i + 1; break; }
        }
        const nodes = JSON.parse(content.substring(startIdx, endIdx));
        allNodes.push(...nodes);
        console.log(`Loaded ${nodes.length} places from SerpAPI`);
      }
    } catch (e) { /* ignore */ }
  }

  return allNodes;
}

// ============ WORKER CLASS ============

class ScraperWorker {
  private id: number;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(id: number) {
    this.id = id;
  }

  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Block heavy resources
    await this.page.setRequestInterception(true);
    this.page.on('request', req => {
      if (['stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });
  }

  async close(): Promise<void> {
    if (this.browser) await this.browser.close();
  }

  async scrape(node: KnowledgeNode): Promise<ScrapedData | null> {
    if (!this.page) return null;

    const island = node.location?.island || 'Grand Cayman';
    const searchQuery = `${node.name} ${island} Cayman Islands`;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

    try {
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 12000 });
      await sleep(1500);

      const data = await this.page.evaluate(() => {
        const result: any = { photos: [] };

        // Name
        const nameEl = document.querySelector('h1.DUwDvf, h1.fontHeadlineLarge');
        if (nameEl) result.name = nameEl.textContent?.trim();

        // Rating
        const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
        if (ratingEl) {
          const r = parseFloat(ratingEl.textContent?.trim() || '0');
          if (r > 0) result.rating = r;
        }

        // Review count
        const reviewEl = document.querySelector('div.F7nice span[aria-label*="review"]');
        if (reviewEl) {
          const match = reviewEl.getAttribute('aria-label')?.match(/(\d[\d,]*)\s*review/i);
          if (match) result.reviewCount = parseInt(match[1].replace(/,/g, ''));
        }

        // Phone
        const phoneButtons = document.querySelectorAll('button[aria-label*="Phone"], button[data-item-id*="phone"]');
        phoneButtons.forEach(btn => {
          const label = btn.getAttribute('aria-label') || '';
          const match = label.match(/Phone:\s*([+\d\s\-()]+)/);
          if (match) result.phone = match[1].trim();
          const textEl = btn.querySelector('div.fontBodyMedium');
          if (textEl && textEl.textContent?.match(/^\+?\d/)) {
            result.phone = textEl.textContent.trim();
          }
        });

        // Website
        const websiteEl = document.querySelector('a[data-item-id="authority"], a[aria-label*="Website"]');
        if (websiteEl) result.website = websiteEl.getAttribute('href');

        // Address
        const addressEl = document.querySelector('button[data-item-id="address"] div.fontBodyMedium');
        if (addressEl) result.address = addressEl.textContent?.trim();

        // Photos
        const photoEls = document.querySelectorAll('button.aoRNLd img, img.YQ4gaf');
        photoEls.forEach(img => {
          const src = img.getAttribute('src');
          if (src?.startsWith('https://') && !src.includes('data:image')) {
            result.photos.push(src.replace(/=w\d+-h\d+/, '=w800-h600'));
          }
        });

        // Background images
        document.querySelectorAll('div[style*="background-image"]').forEach(el => {
          const match = el.getAttribute('style')?.match(/url\(["']?(https:\/\/[^"')\s]+)["']?\)/);
          if (match?.[1]) result.photos.push(match[1].replace(/=w\d+-h\d+/, '=w800-h600'));
        });

        result.photos = [...new Set(result.photos)].slice(0, 5);
        return result;
      });

      if (data.phone || data.website || data.photos?.length > 0) {
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
      return null;

    } catch (e) {
      return null;
    }
  }
}

// ============ PARALLEL ORCHESTRATOR ============

class ParallelScraper {
  private workers: ScraperWorker[] = [];
  private numWorkers: number;
  private results: ScrapedData[] = [];
  private processed = 0;
  private enriched = 0;
  private failed = 0;
  private total = 0;
  private outputPath: string;
  private startTime = Date.now();

  constructor(numWorkers: number) {
    this.numWorkers = numWorkers;
    this.outputPath = path.join(PROJECT_ROOT, 'data', 'scraped-enrichment.json');
  }

  async init(): Promise<void> {
    console.log(`Initializing ${this.numWorkers} parallel browser workers...`);
    for (let i = 0; i < this.numWorkers; i++) {
      const worker = new ScraperWorker(i);
      await worker.init();
      this.workers.push(worker);
      process.stdout.write(`  Worker ${i + 1}/${this.numWorkers} ready\r`);
    }
    console.log(`\n${this.numWorkers} workers initialized\n`);
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map(w => w.close()));
  }

  private saveProgress(): void {
    fs.writeFileSync(this.outputPath, JSON.stringify(this.results, null, 2));

    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    const rate = this.processed / elapsed || 0;
    const remaining = Math.round((this.total - this.processed) / rate) || 0;

    console.log(`\n[Progress] ${this.processed}/${this.total} | Enriched: ${this.enriched} | Failed: ${this.failed} | ${rate.toFixed(1)}/sec | ETA: ${remaining}s`);
  }

  async run(nodes: KnowledgeNode[]): Promise<void> {
    this.total = nodes.length;
    console.log(`Starting parallel scrape of ${this.total} places...\n`);

    // Create work queue
    const queue = [...nodes];
    const activeJobs: Promise<void>[] = [];

    const processNext = async (worker: ScraperWorker): Promise<void> => {
      while (queue.length > 0) {
        const node = queue.shift()!;
        this.processed++;

        const result = await worker.scrape(node);

        if (result) {
          this.results.push(result);
          this.enriched++;
          const info = [];
          if (result.photos.length) info.push(`${result.photos.length} photos`);
          if (result.phone) info.push('phone');
          if (result.website) info.push('website');
          console.log(`[${this.processed}/${this.total}] + ${node.name}: ${info.join(', ')}`);
        } else {
          this.failed++;
          console.log(`[${this.processed}/${this.total}] - ${node.name}`);
        }

        // Save every 25 places
        if (this.processed % 25 === 0) {
          this.saveProgress();
        }

        // Small delay between requests per worker
        await sleep(1000);
      }
    };

    // Start all workers
    for (const worker of this.workers) {
      activeJobs.push(processNext(worker));
    }

    // Wait for all to complete
    await Promise.all(activeJobs);

    // Final save
    this.saveProgress();
  }

  printSummary(): void {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);

    console.log('\n============================================');
    console.log('PARALLEL SCRAPING COMPLETE');
    console.log('============================================');
    console.log(`Total processed: ${this.processed}`);
    console.log(`Successfully enriched: ${this.enriched} (${Math.round(this.enriched/this.processed*100)}%)`);
    console.log(`Failed/No data: ${this.failed}`);
    console.log(`Time elapsed: ${elapsed}s`);
    console.log(`Speed: ${(this.processed/elapsed).toFixed(1)} places/sec`);
    console.log(`\nResults saved to: ${this.outputPath}`);
    console.log('\nTo apply enrichment: npm run apply:enrichment');
  }
}

// ============ MAIN ============

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const workersArg = args.find(a => a.startsWith('--workers='));
  const numWorkers = workersArg ? parseInt(workersArg.split('=')[1]) : 5;

  console.log('============================================');
  console.log('ISLE AI - PARALLEL GOOGLE MAPS SCRAPER');
  console.log('============================================\n');

  // Load all nodes
  const allNodes = loadAllNodes();
  const toEnrich = allNodes.filter(n => needsEnrichment(n));

  console.log(`\nTotal places: ${allNodes.length}`);
  console.log(`Need enrichment: ${toEnrich.length}`);
  console.log(`Workers: ${numWorkers}`);
  console.log('');

  const scraper = new ParallelScraper(numWorkers);

  try {
    await scraper.init();
    await scraper.run(toEnrich);
    scraper.printSummary();
  } finally {
    await scraper.close();
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
