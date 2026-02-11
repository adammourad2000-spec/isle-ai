#!/usr/bin/env node

/**
 * Google Scraper for Place Enrichment
 *
 * Scrapes Google Search and Maps to enrich OSM places with:
 * - Real ratings and review counts
 * - Photos
 * - Hours of operation
 * - Phone numbers and websites
 * - Booking links
 * - Price levels
 *
 * Usage:
 *   npx ts-node scripts/google-scraper.ts [--resume] [--limit N] [--test]
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// ============ CONFIGURATION ============

const CONFIG = {
  // Delays to avoid rate limiting (in ms)
  MIN_DELAY: 3000,
  MAX_DELAY: 6000,
  PAGE_LOAD_TIMEOUT: 30000,

  // Output paths
  OUTPUT_DIR: path.join(process.cwd(), 'data', 'google-enriched'),
  PROGRESS_FILE: path.join(process.cwd(), 'data', 'google-enriched', 'progress.json'),
  OUTPUT_FILE: path.join(process.cwd(), 'data', 'google-enriched', 'enriched-places.json'),

  // Input
  OSM_DATA_PATH: path.join(process.cwd(), 'data', 'osm-scraped', 'osm-knowledge.json'),

  // Scraping settings
  MAX_PHOTOS: 5,
  USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// ============ TYPES ============

interface OSMPlace {
  id: string;
  name: string;
  category: string;
  description: string;
  location: {
    island: string;
    area?: string;
    district?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
  };
  ratings: { overall: number; reviewCount: number };
  media?: { thumbnail?: string; images?: string[] };
  contact?: { phone?: string; website?: string };
  hours?: { display?: string };
  business?: { priceRange?: string };
}

interface EnrichedData {
  rating?: number;
  reviewCount?: number;
  photos: string[];
  hours?: string;
  phone?: string;
  website?: string;
  bookingUrl?: string;
  priceLevel?: string;
  address?: string;
  placeType?: string;
  source: 'google';
  scrapedAt: string;
}

interface Progress {
  lastProcessedIndex: number;
  processedIds: string[];
  failedIds: string[];
  startedAt: string;
  lastUpdated: string;
}

// ============ UTILITIES ============

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(): number {
  return CONFIG.MIN_DELAY + Math.random() * (CONFIG.MAX_DELAY - CONFIG.MIN_DELAY);
}

function sanitizeForSearch(name: string): string {
  // Remove special characters that might confuse search
  return name
    .replace(/[&]/g, 'and')
    .replace(/['"]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============ PROGRESS MANAGEMENT ============

function loadProgress(): Progress {
  if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf-8'));
  }
  return {
    lastProcessedIndex: -1,
    processedIds: [],
    failedIds: [],
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
}

function saveProgress(progress: Progress): void {
  progress.lastUpdated = new Date().toISOString();
  fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function loadEnrichedData(): Map<string, EnrichedData> {
  if (fs.existsSync(CONFIG.OUTPUT_FILE)) {
    const data = JSON.parse(fs.readFileSync(CONFIG.OUTPUT_FILE, 'utf-8'));
    return new Map(Object.entries(data));
  }
  return new Map();
}

function saveEnrichedData(data: Map<string, EnrichedData>): void {
  const obj = Object.fromEntries(data);
  fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(obj, null, 2));
}

// ============ GOOGLE SCRAPER ============

class GoogleScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    console.log('🚀 Launching browser...');

    this.browser = await puppeteer.launch({
      headless: true, // Set to false to see the browser
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });

    this.page = await this.browser.newPage();

    // Set user agent to avoid detection
    await this.page.setUserAgent(CONFIG.USER_AGENT);

    // Set viewport
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Block unnecessary resources to speed up scraping
    await this.page.setRequestInterception(true);
    this.page.on('request', (req) => {
      const resourceType = req.resourceType();
      // Block images, fonts, and stylesheets to speed up (we'll get image URLs separately)
      if (['font', 'stylesheet'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log('✅ Browser ready');
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async scrapePlace(place: OSMPlace): Promise<EnrichedData | null> {
    if (!this.page) throw new Error('Browser not initialized');

    const searchQuery = `${sanitizeForSearch(place.name)} ${place.location.area || ''} Cayman Islands`;
    console.log(`\n🔍 Searching: "${searchQuery}"`);

    try {
      // Navigate to Google Search
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      await this.page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.PAGE_LOAD_TIMEOUT
      });

      // Wait for results to load
      await sleep(1500);

      // Extract data from the page
      const data = await this.page.evaluate(() => {
        const result: Partial<EnrichedData> = {
          photos: []
        };

        // Try to find the Knowledge Panel (right side card)
        const knowledgePanel = document.querySelector('[data-attrid="kc:/location/location:address"]')?.closest('.kp-wholepage') ||
                              document.querySelector('.kp-wholepage') ||
                              document.querySelector('[data-hveid]');

        // Rating - multiple possible selectors
        const ratingEl = document.querySelector('[data-attrid="kc:/collection/knowledge_panels/has_ratings:star_rating"] .Aq14fc') ||
                        document.querySelector('.Aq14fc') ||
                        document.querySelector('[aria-label*="stars"]') ||
                        document.querySelector('.yi40Hd.YrbPuc');
        if (ratingEl) {
          const ratingText = ratingEl.textContent || ratingEl.getAttribute('aria-label') || '';
          const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
          if (ratingMatch) {
            result.rating = parseFloat(ratingMatch[1]);
          }
        }

        // Review count
        const reviewEl = document.querySelector('[data-attrid="kc:/collection/knowledge_panels/has_ratings:star_rating"] .hqzQac') ||
                        document.querySelector('.hqzQac') ||
                        document.querySelector('span[aria-label*="review"]');
        if (reviewEl) {
          const reviewText = reviewEl.textContent || '';
          const reviewMatch = reviewText.replace(/,/g, '').match(/(\d+)/);
          if (reviewMatch) {
            result.reviewCount = parseInt(reviewMatch[1]);
          }
        }

        // Address
        const addressEl = document.querySelector('[data-attrid="kc:/location/location:address"] .LrzXr') ||
                         document.querySelector('.LrzXr');
        if (addressEl) {
          result.address = addressEl.textContent?.trim();
        }

        // Phone
        const phoneEl = document.querySelector('[data-attrid="kc:/collection/knowledge_panels/has_phone:phone"] .LrzXr') ||
                       document.querySelector('a[href^="tel:"]');
        if (phoneEl) {
          result.phone = phoneEl.textContent?.trim() || phoneEl.getAttribute('href')?.replace('tel:', '');
        }

        // Website
        const websiteEl = document.querySelector('[data-attrid="kc:/common/topic:official site"] a') ||
                         document.querySelector('a[data-ved][ping*="url"]');
        if (websiteEl) {
          result.website = websiteEl.getAttribute('href') || undefined;
        }

        // Hours
        const hoursEl = document.querySelector('[data-attrid*="hours"] .LrzXr') ||
                       document.querySelector('.WgFkxc');
        if (hoursEl) {
          result.hours = hoursEl.textContent?.trim();
        }

        // Price level
        const priceEl = document.querySelector('[data-attrid*="price"] .LrzXr') ||
                       document.querySelector('.mgr77e');
        if (priceEl) {
          const priceText = priceEl.textContent?.trim() || '';
          const dollarMatch = priceText.match(/(\$+)/);
          if (dollarMatch) {
            result.priceLevel = dollarMatch[1];
          }
        }

        // Photos from the Knowledge Panel
        const photoEls = document.querySelectorAll('.ivg-i img, .biGQs img, .YQ4gaf');
        photoEls.forEach((img) => {
          const src = img.getAttribute('src') || img.getAttribute('data-src');
          if (src && src.startsWith('http') && !src.includes('google.com/images/branding') && result.photos!.length < 5) {
            result.photos!.push(src);
          }
        });

        // Booking URL (if available)
        const bookingEl = document.querySelector('a[href*="booking.com"]') ||
                         document.querySelector('a[href*="tripadvisor.com"]') ||
                         document.querySelector('a[href*="expedia.com"]') ||
                         document.querySelector('a[data-attrid*="reserve"]');
        if (bookingEl) {
          result.bookingUrl = bookingEl.getAttribute('href') || undefined;
        }

        // Place type
        const typeEl = document.querySelector('[data-attrid="subtitle"]') ||
                      document.querySelector('.YhemCb');
        if (typeEl) {
          result.placeType = typeEl.textContent?.trim();
        }

        return result;
      });

      // If we didn't get photos from search, try Google Images
      if (data.photos && data.photos.length === 0) {
        const imagePhotos = await this.scrapeGoogleImages(place.name, place.location.area);
        data.photos = imagePhotos;
      }

      // Return enriched data
      return {
        rating: data.rating,
        reviewCount: data.reviewCount,
        photos: data.photos || [],
        hours: data.hours,
        phone: data.phone,
        website: data.website,
        bookingUrl: data.bookingUrl,
        priceLevel: data.priceLevel,
        address: data.address,
        placeType: data.placeType,
        source: 'google',
        scrapedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Error scraping ${place.name}:`, error);
      return null;
    }
  }

  async scrapeGoogleImages(placeName: string, area?: string): Promise<string[]> {
    if (!this.page) return [];

    try {
      const searchQuery = `${sanitizeForSearch(placeName)} ${area || ''} Cayman Islands`;
      const imageUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`;

      await this.page.goto(imageUrl, {
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.PAGE_LOAD_TIMEOUT
      });

      await sleep(1000);

      const photos = await this.page.evaluate((maxPhotos: number) => {
        const images: string[] = [];
        const imgEls = document.querySelectorAll('img[data-src], img.rg_i, img.Q4LuWd');

        imgEls.forEach((img) => {
          if (images.length >= maxPhotos) return;

          const src = img.getAttribute('data-src') || img.getAttribute('src');
          if (src && src.startsWith('http') && !src.includes('google.com/images')) {
            images.push(src);
          }
        });

        return images;
      }, CONFIG.MAX_PHOTOS);

      return photos;
    } catch (error) {
      console.error('Error fetching images:', error);
      return [];
    }
  }

  async scrapeGoogleMaps(place: OSMPlace): Promise<EnrichedData | null> {
    if (!this.page) throw new Error('Browser not initialized');

    // Try Google Maps directly for better data
    const searchQuery = `${sanitizeForSearch(place.name)} Cayman Islands`;
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

    try {
      await this.page.goto(mapsUrl, {
        waitUntil: 'networkidle2',
        timeout: CONFIG.PAGE_LOAD_TIMEOUT
      });

      await sleep(2500);

      // Click on the first result if there's a list
      const firstResult = await this.page.$('[role="feed"] > div:first-child');
      if (firstResult) {
        await firstResult.click();
        await sleep(2000);
      }

      const data = await this.page.evaluate(() => {
        const result: Partial<EnrichedData> = {
          photos: []
        };

        // Rating - Multiple selectors for different Google Maps layouts
        // Try the main rating display (e.g., "4.5" in large text)
        const ratingSelectors = [
          'div.fontDisplayLarge',  // Main rating number
          'span.ceNzKf',           // Rating in header
          '[data-attrid="kc:/collection/knowledge_panels/has_ratings:star_rating"] .Aq14fc',
          'span[aria-hidden="true"]' // Rating text
        ];

        for (const selector of ratingSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const text = el.textContent || '';
            // Match ratings like "4.5", "4,5" (European), "4.3"
            const match = text.match(/^(\d+[.,]\d+)$/);
            if (match) {
              result.rating = parseFloat(match[1].replace(',', '.'));
              break;
            }
          }
        }

        // Also try aria-label on star icons
        if (!result.rating) {
          const starEl = document.querySelector('[role="img"][aria-label*="star"]');
          if (starEl) {
            const label = starEl.getAttribute('aria-label') || '';
            const match = label.match(/(\d+[.,]?\d*)\s*star/i);
            if (match) {
              result.rating = parseFloat(match[1].replace(',', '.'));
            }
          }
        }

        // Review count - look for patterns like "(1,234 reviews)" or "(1.234 avis)"
        const reviewSelectors = [
          'button[aria-label*="review"]',
          'button[aria-label*="avis"]',  // French
          'span.fontBodyMedium',
          '.F7nice span[aria-label]'
        ];

        for (const selector of reviewSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const text = (el.getAttribute('aria-label') || el.textContent || '').replace(/[,.\s]/g, '');
            const match = text.match(/(\d+)\s*(review|avis|comment)/i);
            if (match) {
              result.reviewCount = parseInt(match[1]);
              break;
            }
          }
        }

        // Also look for review count in parentheses like "(1,234)"
        if (!result.reviewCount) {
          const allText = document.body.innerText;
          const reviewMatch = allText.match(/\((\d[\d,.\s]*)\s*(reviews?|avis)\)/i);
          if (reviewMatch) {
            result.reviewCount = parseInt(reviewMatch[1].replace(/[,.\s]/g, ''));
          }
        }

        // Address
        const addressEl = document.querySelector('[data-item-id="address"]') ||
                         document.querySelector('button[data-tooltip="Copy address"]') ||
                         document.querySelector('[aria-label*="Address"]');
        if (addressEl) {
          result.address = addressEl.textContent?.trim();
        }

        // Phone
        const phoneEl = document.querySelector('[data-item-id^="phone"]') ||
                       document.querySelector('button[data-tooltip="Copy phone number"]') ||
                       document.querySelector('a[href^="tel:"]');
        if (phoneEl) {
          result.phone = phoneEl.textContent?.trim() || phoneEl.getAttribute('href')?.replace('tel:', '');
        }

        // Website
        const websiteEl = document.querySelector('[data-item-id="authority"]') ||
                         document.querySelector('a[data-tooltip="Open website"]') ||
                         document.querySelector('a[aria-label*="website"]');
        if (websiteEl) {
          result.website = websiteEl.getAttribute('href') || undefined;
        }

        // Hours
        const hoursEl = document.querySelector('[aria-label*="hour"]') ||
                       document.querySelector('[aria-label*="heure"]');  // French
        if (hoursEl) {
          result.hours = hoursEl.getAttribute('aria-label')?.replace(/^Hours?:\s*/i, '');
        }

        // Price level - look for $ symbols
        const priceEl = document.querySelector('[aria-label*="Price"]') ||
                       document.querySelector('[aria-label*="prix"]');  // French
        if (priceEl) {
          const text = priceEl.getAttribute('aria-label') || priceEl.textContent || '';
          const match = text.match(/(\$+)/);
          if (match) result.priceLevel = match[1];
        }

        // Also look for price in the info section
        if (!result.priceLevel) {
          const infoText = document.body.innerText;
          const priceMatch = infoText.match(/·\s*(\$+)\s*·/);
          if (priceMatch) result.priceLevel = priceMatch[1];
        }

        // Photos - get from the image carousel
        const photoEls = document.querySelectorAll('button[aria-label*="Photo"] img, .aoRNLd img, img[src*="googleusercontent"]');
        photoEls.forEach((img) => {
          const src = img.getAttribute('src');
          if (src && src.startsWith('http') && src.includes('googleusercontent') && result.photos!.length < 5) {
            // Skip tiny profile photos (usually 36x36)
            if (!src.includes('w36-h36') && !src.includes('s36-c')) {
              result.photos!.push(src);
            }
          }
        });

        return result;
      });

      return {
        rating: data.rating,
        reviewCount: data.reviewCount,
        photos: data.photos || [],
        hours: data.hours,
        phone: data.phone,
        website: data.website,
        bookingUrl: data.bookingUrl,
        priceLevel: data.priceLevel,
        address: data.address,
        source: 'google',
        scrapedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Error scraping Maps for ${place.name}:`, error);
      return null;
    }
  }
}

// ============ MAIN ENRICHMENT PROCESS ============

async function enrichPlaces(options: { resume: boolean; limit?: number; test: boolean }) {
  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }

  // Load OSM data
  if (!fs.existsSync(CONFIG.OSM_DATA_PATH)) {
    console.error('❌ OSM data not found at:', CONFIG.OSM_DATA_PATH);
    process.exit(1);
  }

  const osmPlaces: OSMPlace[] = JSON.parse(fs.readFileSync(CONFIG.OSM_DATA_PATH, 'utf-8'));
  console.log(`📚 Loaded ${osmPlaces.length} places from OSM data`);

  // Load progress and existing data
  let progress = options.resume ? loadProgress() : {
    lastProcessedIndex: -1,
    processedIds: [],
    failedIds: [],
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };

  const enrichedData = options.resume ? loadEnrichedData() : new Map<string, EnrichedData>();

  // Determine start index
  const startIndex = options.resume ? progress.lastProcessedIndex + 1 : 0;
  const endIndex = options.limit ? Math.min(startIndex + options.limit, osmPlaces.length) : osmPlaces.length;

  console.log(`\n📊 Progress: ${startIndex}/${osmPlaces.length} places processed`);
  console.log(`🎯 Will process places ${startIndex + 1} to ${endIndex}`);

  if (options.test) {
    console.log('🧪 TEST MODE: Only processing 5 places');
  }

  // Initialize scraper
  const scraper = new GoogleScraper();
  await scraper.initialize();

  let successCount = 0;
  let failCount = 0;

  try {
    const placesToProcess = options.test
      ? osmPlaces.slice(0, 5)
      : osmPlaces.slice(startIndex, endIndex);

    for (let i = 0; i < placesToProcess.length; i++) {
      const place = placesToProcess[i];
      const globalIndex = options.test ? i : startIndex + i;

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`[${globalIndex + 1}/${osmPlaces.length}] ${place.name}`);
      console.log(`📍 ${place.location.area || place.location.district || 'Unknown'}, ${place.location.island}`);
      console.log(`🏷️  Category: ${place.category}`);

      // Skip if already processed
      if (enrichedData.has(place.id)) {
        console.log('⏭️  Already processed, skipping...');
        continue;
      }

      // Try Google Search first
      let data = await scraper.scrapePlace(place);

      // If Google Search didn't get good data, try Google Maps
      if (!data || (!data.rating && !data.photos.length)) {
        console.log('📍 Trying Google Maps...');
        await sleep(randomDelay());
        const mapsData = await scraper.scrapeGoogleMaps(place);
        if (mapsData) {
          data = {
            ...data,
            ...mapsData,
            photos: [...(data?.photos || []), ...(mapsData.photos || [])].slice(0, CONFIG.MAX_PHOTOS)
          };
        }
      }

      if (data) {
        enrichedData.set(place.id, data);
        progress.processedIds.push(place.id);
        successCount++;

        // Log what we found
        console.log('✅ Enriched data:');
        if (data.rating) console.log(`   ⭐ Rating: ${data.rating}/5 (${data.reviewCount || 0} reviews)`);
        if (data.photos.length) console.log(`   📷 Photos: ${data.photos.length}`);
        if (data.hours) console.log(`   🕐 Hours: ${data.hours}`);
        if (data.phone) console.log(`   📞 Phone: ${data.phone}`);
        if (data.website) console.log(`   🌐 Website: ${data.website?.slice(0, 50)}...`);
        if (data.priceLevel) console.log(`   💰 Price: ${data.priceLevel}`);
      } else {
        progress.failedIds.push(place.id);
        failCount++;
        console.log('❌ Could not enrich this place');
      }

      // Save progress after each place
      progress.lastProcessedIndex = globalIndex;
      saveProgress(progress);
      saveEnrichedData(enrichedData);

      // Random delay to avoid rate limiting
      const delay = randomDelay();
      console.log(`⏳ Waiting ${(delay / 1000).toFixed(1)}s before next request...`);
      await sleep(delay);
    }

  } finally {
    await scraper.close();
  }

  // Final summary
  console.log('\n' + '═'.repeat(70));
  console.log('                         ENRICHMENT COMPLETE');
  console.log('═'.repeat(70));
  console.log(`\n✅ Successfully enriched: ${successCount} places`);
  console.log(`❌ Failed: ${failCount} places`);
  console.log(`📊 Total processed: ${enrichedData.size}/${osmPlaces.length}`);
  console.log(`\n📁 Output saved to: ${CONFIG.OUTPUT_FILE}`);
  console.log(`📁 Progress saved to: ${CONFIG.PROGRESS_FILE}`);

  // Generate merge script suggestion
  console.log('\n📋 Next steps:');
  console.log('   1. Review the enriched data in data/google-enriched/enriched-places.json');
  console.log('   2. Run: npx ts-node scripts/merge-google-data.ts');
  console.log('   3. This will merge enriched data back into your knowledge base');
}

// ============ CLI ============

const args = process.argv.slice(2);
const options = {
  resume: args.includes('--resume'),
  limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : undefined,
  test: args.includes('--test')
};

console.log('═'.repeat(70));
console.log('           GOOGLE SCRAPER - Place Enrichment Tool');
console.log('═'.repeat(70));
console.log(`\nOptions: ${JSON.stringify(options)}`);

enrichPlaces(options).catch(console.error);
