/**
 * ISLE AI - Daily Knowledge Base Update Script
 *
 * This script performs daily maintenance tasks on the knowledge base:
 * - Checks for stale data (not updated in 30 days)
 * - Flags places that may have closed
 * - Verifies image URLs are still accessible
 * - Generates update statistics
 * - Can be run as a cron job
 *
 * Usage:
 *   npx ts-node scripts/daily-kb-update.ts
 *   npx ts-node scripts/daily-kb-update.ts --check-images   # Also verify image URLs
 *   npx ts-node scripts/daily-kb-update.ts --dry-run        # Preview without changes
 *   npx ts-node scripts/daily-kb-update.ts --days 60        # Custom stale threshold
 *
 * Cron setup (daily at 2 AM):
 *   0 2 * * * cd /path/to/isle-ai && npx ts-node scripts/daily-kb-update.ts >> /var/log/isle-ai-update.log 2>&1
 *
 * @author Isle AI Team
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============ TYPES ============

interface KnowledgeNode {
  id: string;
  category: string;
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
    website?: string;
  };
  media: {
    thumbnail: string;
    images: string[];
  };
  business: {
    priceRange: string;
    openingHours?: Record<string, unknown>;
  };
  ratings: {
    overall: number;
    reviewCount: number;
    googleRating?: number;
  };
  tags: string[];
  isActive: boolean;
  isPremium: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface StaleNode {
  id: string;
  name: string;
  category: string;
  updatedAt: string;
  daysSinceUpdate: number;
  issues: string[];
}

interface PossiblyClosedNode {
  id: string;
  name: string;
  category: string;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
}

interface ImageCheckResult {
  id: string;
  name: string;
  url: string;
  status: 'ok' | 'error' | 'timeout' | 'redirect';
  statusCode?: number;
  error?: string;
}

interface UpdateStats {
  timestamp: string;
  totalNodes: number;
  activeNodes: number;
  inactiveNodes: number;
  staleNodes: number;
  possiblyClosedNodes: number;
  imageIssues: number;
  categoryBreakdown: Record<string, { total: number; stale: number; inactive: number }>;
  lastUpdatedDates: {
    oldest: { id: string; name: string; date: string };
    newest: { id: string; name: string; date: string };
  };
  recommendations: string[];
}

interface UpdateConfig {
  staleDays: number;
  checkImages: boolean;
  isDryRun: boolean;
  verbose: boolean;
  outputDir: string;
}

// ============ CONFIGURATION ============

const CONFIG = {
  DEFAULT_STALE_DAYS: 30,
  IMAGE_TIMEOUT_MS: 5000,
  MAX_IMAGE_CHECKS: 50, // Limit to avoid rate limiting

  // Output paths
  OUTPUT_DIR: path.join(__dirname, '../reports'),
  STATS_FILE: 'daily-update-stats.json',
  LOG_FILE: 'daily-update.log',

  // Patterns that suggest a place might be closed
  CLOSED_INDICATORS: [
    'permanently closed',
    'closed down',
    'no longer operating',
    'out of business',
    'shutdown',
  ],

  // Categories that change frequently (shorter stale threshold)
  HIGH_CHURN_CATEGORIES: ['restaurant', 'bar', 'nightlife', 'event', 'festival'],

  // Categories that are more stable
  STABLE_CATEGORIES: ['beach', 'attraction', 'general_info', 'history', 'culture'],
};

// ============ UTILITIES ============

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '\x1b[36m[INFO]\x1b[0m',
    success: '\x1b[32m[OK]\x1b[0m',
    error: '\x1b[31m[ERROR]\x1b[0m',
    warn: '\x1b[33m[WARN]\x1b[0m',
  }[type];
  console.log(`${timestamp} ${prefix} ${message}`);
}

function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
}

function parseDate(dateStr: string): Date {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date() : date;
}

// ============ LOADERS ============

async function loadKnowledgeBase(): Promise<KnowledgeNode[]> {
  const nodes: KnowledgeNode[] = [];

  const dataPath = path.join(__dirname, '../data/cayman-islands-knowledge.ts');

  if (!fs.existsSync(dataPath)) {
    throw new Error(`Knowledge base file not found: ${dataPath}`);
  }

  const content = fs.readFileSync(dataPath, 'utf-8');

  // Parse nodes from the file content
  const nodeBlocks = content.split(/\{\s*id:/g).slice(1);

  for (const block of nodeBlocks) {
    try {
      const idMatch = block.match(/^['"]([^'"]+)['"]/);
      if (!idMatch) continue;

      const id = idMatch[1];
      const categoryMatch = block.match(/category:\s*['"]([^'"]+)['"]/);
      const nameMatch = block.match(/name:\s*['"]([^'"]+)['"]/);
      const descMatch = block.match(/description:\s*[`'"]([^`'"]*)[`'"]/);
      const shortDescMatch = block.match(/shortDescription:\s*['"]([^'"]*)['"]/);
      const latMatch = block.match(/latitude:\s*([-\d.]+)/);
      const lngMatch = block.match(/longitude:\s*([-\d.]+)/);
      const thumbnailMatch = block.match(/thumbnail:\s*['"]([^'"]+)['"]/);
      const ratingMatch = block.match(/overall:\s*([\d.]+)/);
      const reviewMatch = block.match(/reviewCount:\s*(\d+)/);
      const addressMatch = block.match(/address:\s*['"]([^'"]+)['"]/);
      const districtMatch = block.match(/district:\s*['"]([^'"]+)['"]/);
      const islandMatch = block.match(/island:\s*['"]([^'"]+)['"]/);
      const isActiveMatch = block.match(/isActive:\s*(true|false)/);
      const isPremiumMatch = block.match(/isPremium:\s*(true|false)/);
      const isFeaturedMatch = block.match(/isFeatured:\s*(true|false)/);
      const createdAtMatch = block.match(/createdAt:\s*['"]([^'"]+)['"]/);
      const updatedAtMatch = block.match(/updatedAt:\s*['"]([^'"]+)['"]/);
      const tagsMatch = block.match(/tags:\s*\[([^\]]*)\]/);
      const websiteMatch = block.match(/website:\s*['"]([^'"]+)['"]/);
      const phoneMatch = block.match(/phone:\s*['"]([^'"]+)['"]/);
      const imagesMatch = block.match(/images:\s*\[([^\]]*)\]/);

      const parseArrayFromMatch = (match: RegExpMatchArray | null): string[] => {
        if (!match || !match[1]) return [];
        return match[1]
          .split(',')
          .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(s => s.length > 0);
      };

      const node: KnowledgeNode = {
        id,
        category: categoryMatch?.[1] || 'unknown',
        name: nameMatch?.[1] || 'Unknown',
        description: descMatch?.[1] || '',
        shortDescription: shortDescMatch?.[1] || '',
        location: {
          address: addressMatch?.[1] || '',
          district: districtMatch?.[1] || '',
          island: islandMatch?.[1] || 'Grand Cayman',
          latitude: latMatch ? parseFloat(latMatch[1]) : 0,
          longitude: lngMatch ? parseFloat(lngMatch[1]) : 0,
        },
        contact: {
          website: websiteMatch?.[1] || '',
          phone: phoneMatch?.[1] || '',
        },
        media: {
          thumbnail: thumbnailMatch?.[1] || '',
          images: parseArrayFromMatch(imagesMatch),
        },
        business: {
          priceRange: '$$',
        },
        ratings: {
          overall: ratingMatch ? parseFloat(ratingMatch[1]) : 0,
          reviewCount: reviewMatch ? parseInt(reviewMatch[1], 10) : 0,
        },
        tags: parseArrayFromMatch(tagsMatch),
        isActive: isActiveMatch?.[1] === 'true',
        isPremium: isPremiumMatch?.[1] === 'true',
        isFeatured: isFeaturedMatch?.[1] === 'true',
        createdAt: createdAtMatch?.[1] || new Date().toISOString(),
        updatedAt: updatedAtMatch?.[1] || new Date().toISOString(),
        createdBy: 'system',
      };

      nodes.push(node);
    } catch {
      // Skip malformed nodes
    }
  }

  return nodes;
}

// ============ CHECKERS ============

function findStaleNodes(nodes: KnowledgeNode[], staleDays: number): StaleNode[] {
  const now = new Date();
  const staleNodes: StaleNode[] = [];

  for (const node of nodes) {
    const updatedAt = parseDate(node.updatedAt);
    const days = daysBetween(now, updatedAt);

    // Adjust threshold based on category
    let adjustedThreshold = staleDays;
    if (CONFIG.HIGH_CHURN_CATEGORIES.includes(node.category)) {
      adjustedThreshold = Math.floor(staleDays * 0.7); // 30% shorter for high-churn
    } else if (CONFIG.STABLE_CATEGORIES.includes(node.category)) {
      adjustedThreshold = Math.floor(staleDays * 1.5); // 50% longer for stable
    }

    if (days > adjustedThreshold) {
      const issues: string[] = [];

      // Check for specific issues
      if (!node.media.thumbnail || node.media.thumbnail.includes('unsplash')) {
        issues.push('Using stock/placeholder image');
      }
      if (!node.contact.website) {
        issues.push('Missing website');
      }
      if (!node.contact.phone) {
        issues.push('Missing phone number');
      }
      if (node.ratings.reviewCount < 10) {
        issues.push('Low review count - may not be verified');
      }
      if (days > staleDays * 2) {
        issues.push('Very stale - over double threshold');
      }

      staleNodes.push({
        id: node.id,
        name: node.name,
        category: node.category,
        updatedAt: node.updatedAt,
        daysSinceUpdate: days,
        issues,
      });
    }
  }

  return staleNodes.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
}

function findPossiblyClosed(nodes: KnowledgeNode[]): PossiblyClosedNode[] {
  const possiblyClosed: PossiblyClosedNode[] = [];

  for (const node of nodes) {
    const textToCheck = `${node.name} ${node.description} ${node.shortDescription}`.toLowerCase();
    let confidence: 'low' | 'medium' | 'high' = 'low';
    const reasons: string[] = [];

    // Check for closed indicators in text
    for (const indicator of CONFIG.CLOSED_INDICATORS) {
      if (textToCheck.includes(indicator)) {
        reasons.push(`Contains "${indicator}" in description`);
        confidence = 'high';
      }
    }

    // Check for very old data with no recent updates
    const updatedAt = parseDate(node.updatedAt);
    const daysSinceUpdate = daysBetween(new Date(), updatedAt);
    if (daysSinceUpdate > 365) {
      reasons.push(`No updates for over a year (${daysSinceUpdate} days)`);
      confidence = confidence === 'high' ? 'high' : 'medium';
    }

    // Check for indicators that suggest closure
    if (node.ratings.overall === 0 && node.ratings.reviewCount === 0) {
      reasons.push('No ratings or reviews');
      confidence = confidence === 'high' ? 'high' : 'low';
    }

    // Check for disabled/inactive status
    if (!node.isActive) {
      reasons.push('Marked as inactive');
      confidence = 'high';
    }

    if (reasons.length > 0) {
      possiblyClosed.push({
        id: node.id,
        name: node.name,
        category: node.category,
        reason: reasons.join('; '),
        confidence,
      });
    }
  }

  return possiblyClosed.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });
}

async function checkImageUrl(url: string): Promise<{ status: string; statusCode?: number; error?: string }> {
  if (!url || url.trim() === '') {
    return { status: 'error', error: 'Empty URL' };
  }

  // Skip checking for known working domains
  const skipDomains = ['unsplash.com', 'images.unsplash.com', 'googleusercontent.com'];
  try {
    const urlObj = new URL(url);
    if (skipDomains.some(d => urlObj.hostname.includes(d))) {
      return { status: 'ok', statusCode: 200 };
    }
  } catch {
    return { status: 'error', error: 'Invalid URL format' };
  }

  // Use AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.IMAGE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Isle-AI-Bot/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { status: 'ok', statusCode: response.status };
    } else if (response.status >= 300 && response.status < 400) {
      return { status: 'redirect', statusCode: response.status };
    } else {
      return { status: 'error', statusCode: response.status };
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { status: 'timeout' };
      }
      return { status: 'error', error: error.message };
    }
    return { status: 'error', error: 'Unknown error' };
  }
}

async function checkImages(nodes: KnowledgeNode[], maxChecks: number): Promise<ImageCheckResult[]> {
  const results: ImageCheckResult[] = [];
  let checked = 0;

  // Shuffle nodes to get random sample
  const shuffled = [...nodes].sort(() => Math.random() - 0.5);

  for (const node of shuffled) {
    if (checked >= maxChecks) break;

    if (node.media.thumbnail) {
      log(`Checking image for: ${node.name}`, 'info');
      const result = await checkImageUrl(node.media.thumbnail);

      if (result.status !== 'ok') {
        results.push({
          id: node.id,
          name: node.name,
          url: node.media.thumbnail,
          status: result.status as 'ok' | 'error' | 'timeout' | 'redirect',
          statusCode: result.statusCode,
          error: result.error,
        });
      }

      checked++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

// ============ STATS GENERATION ============

function generateStats(
  nodes: KnowledgeNode[],
  staleNodes: StaleNode[],
  possiblyClosed: PossiblyClosedNode[],
  imageIssues: ImageCheckResult[]
): UpdateStats {
  const now = new Date();

  // Count by category
  const categoryBreakdown: Record<string, { total: number; stale: number; inactive: number }> = {};
  const staleByCategory = new Map<string, number>();
  const inactiveByCategory = new Map<string, number>();

  for (const stale of staleNodes) {
    staleByCategory.set(stale.category, (staleByCategory.get(stale.category) || 0) + 1);
  }

  for (const node of nodes) {
    if (!categoryBreakdown[node.category]) {
      categoryBreakdown[node.category] = { total: 0, stale: 0, inactive: 0 };
    }
    categoryBreakdown[node.category].total++;
    categoryBreakdown[node.category].stale = staleByCategory.get(node.category) || 0;
    if (!node.isActive) {
      categoryBreakdown[node.category].inactive++;
    }
  }

  // Find oldest and newest updated nodes
  let oldest = nodes[0];
  let newest = nodes[0];

  for (const node of nodes) {
    const nodeDate = parseDate(node.updatedAt);
    const oldestDate = parseDate(oldest.updatedAt);
    const newestDate = parseDate(newest.updatedAt);

    if (nodeDate < oldestDate) {
      oldest = node;
    }
    if (nodeDate > newestDate) {
      newest = node;
    }
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (staleNodes.length > nodes.length * 0.2) {
    recommendations.push(`High percentage of stale data (${((staleNodes.length / nodes.length) * 100).toFixed(1)}%) - consider bulk update`);
  }

  const highConfidenceClosed = possiblyClosed.filter(p => p.confidence === 'high');
  if (highConfidenceClosed.length > 0) {
    recommendations.push(`${highConfidenceClosed.length} places may be permanently closed - verify and deactivate`);
  }

  if (imageIssues.length > 10) {
    recommendations.push(`${imageIssues.length} images need attention - consider running image scraper`);
  }

  // Category-specific recommendations
  for (const [category, stats] of Object.entries(categoryBreakdown)) {
    if (stats.stale > stats.total * 0.5) {
      recommendations.push(`Category "${category}" has ${stats.stale}/${stats.total} stale entries`);
    }
  }

  return {
    timestamp: now.toISOString(),
    totalNodes: nodes.length,
    activeNodes: nodes.filter(n => n.isActive).length,
    inactiveNodes: nodes.filter(n => !n.isActive).length,
    staleNodes: staleNodes.length,
    possiblyClosedNodes: possiblyClosed.length,
    imageIssues: imageIssues.length,
    categoryBreakdown,
    lastUpdatedDates: {
      oldest: { id: oldest.id, name: oldest.name, date: oldest.updatedAt },
      newest: { id: newest.id, name: newest.name, date: newest.updatedAt },
    },
    recommendations,
  };
}

// ============ OUTPUT ============

function printReport(
  stats: UpdateStats,
  staleNodes: StaleNode[],
  possiblyClosed: PossiblyClosedNode[],
  imageIssues: ImageCheckResult[],
  verbose: boolean
): void {
  console.log('\n' + '='.repeat(60));
  console.log('   ISLE AI - DAILY KNOWLEDGE BASE UPDATE REPORT');
  console.log('='.repeat(60) + '\n');

  console.log(`Generated: ${stats.timestamp}`);
  console.log('\n--- SUMMARY ---');
  console.log(`Total Nodes: ${stats.totalNodes}`);
  console.log(`Active Nodes: ${stats.activeNodes}`);
  console.log(`Inactive Nodes: ${stats.inactiveNodes}`);
  console.log(`Stale Nodes: ${stats.staleNodes}`);
  console.log(`Possibly Closed: ${stats.possiblyClosedNodes}`);
  console.log(`Image Issues: ${stats.imageIssues}`);

  console.log('\n--- LAST UPDATE DATES ---');
  console.log(`Oldest: "${stats.lastUpdatedDates.oldest.name}" (${stats.lastUpdatedDates.oldest.date})`);
  console.log(`Newest: "${stats.lastUpdatedDates.newest.name}" (${stats.lastUpdatedDates.newest.date})`);

  if (staleNodes.length > 0) {
    console.log('\n--- TOP 10 STALE NODES ---');
    for (const node of staleNodes.slice(0, 10)) {
      console.log(`  [${node.daysSinceUpdate}d] ${node.name} (${node.category})`);
      if (verbose && node.issues.length > 0) {
        console.log(`       Issues: ${node.issues.join(', ')}`);
      }
    }
    if (staleNodes.length > 10) {
      console.log(`  ... and ${staleNodes.length - 10} more`);
    }
  }

  const highConfidenceClosed = possiblyClosed.filter(p => p.confidence === 'high');
  if (highConfidenceClosed.length > 0) {
    console.log('\n--- POSSIBLY CLOSED (HIGH CONFIDENCE) ---');
    for (const node of highConfidenceClosed.slice(0, 10)) {
      console.log(`  ${node.name} (${node.category})`);
      if (verbose) {
        console.log(`       Reason: ${node.reason}`);
      }
    }
  }

  if (imageIssues.length > 0 && verbose) {
    console.log('\n--- IMAGE ISSUES ---');
    for (const issue of imageIssues.slice(0, 10)) {
      console.log(`  ${issue.name}: ${issue.status} ${issue.error || ''}`);
    }
  }

  console.log('\n--- CATEGORY BREAKDOWN ---');
  const sortedCategories = Object.entries(stats.categoryBreakdown)
    .sort((a, b) => b[1].total - a[1].total);

  for (const [category, breakdown] of sortedCategories.slice(0, 15)) {
    const stalePercent = breakdown.total > 0 ? ((breakdown.stale / breakdown.total) * 100).toFixed(0) : '0';
    console.log(`  ${category}: ${breakdown.total} total, ${breakdown.stale} stale (${stalePercent}%), ${breakdown.inactive} inactive`);
  }

  if (stats.recommendations.length > 0) {
    console.log('\n--- RECOMMENDATIONS ---');
    for (const rec of stats.recommendations) {
      console.log(`  - ${rec}`);
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

function saveReport(
  stats: UpdateStats,
  staleNodes: StaleNode[],
  possiblyClosed: PossiblyClosedNode[],
  imageIssues: ImageCheckResult[],
  outputDir: string
): void {
  ensureDirectoryExists(outputDir);

  // Save full stats
  const statsPath = path.join(outputDir, CONFIG.STATS_FILE);
  const fullReport = {
    stats,
    staleNodes,
    possiblyClosed,
    imageIssues,
  };
  fs.writeFileSync(statsPath, JSON.stringify(fullReport, null, 2));
  log(`Full report saved to: ${statsPath}`, 'success');

  // Append to log file
  const logPath = path.join(outputDir, CONFIG.LOG_FILE);
  const logEntry = `${stats.timestamp} | Nodes: ${stats.totalNodes} | Stale: ${stats.staleNodes} | Closed: ${stats.possiblyClosedNodes} | Images: ${stats.imageIssues}\n`;
  fs.appendFileSync(logPath, logEntry);
  log(`Log entry added to: ${logPath}`, 'success');
}

// ============ MAIN ============

function parseArgs(): UpdateConfig {
  const args = process.argv.slice(2);

  const config: UpdateConfig = {
    staleDays: CONFIG.DEFAULT_STALE_DAYS,
    checkImages: args.includes('--check-images'),
    isDryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    outputDir: CONFIG.OUTPUT_DIR,
  };

  // Parse days threshold
  const daysIndex = args.indexOf('--days');
  if (daysIndex !== -1 && args[daysIndex + 1]) {
    config.staleDays = parseInt(args[daysIndex + 1], 10);
  }

  // Parse output directory
  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    config.outputDir = args[outputIndex + 1];
  }

  return config;
}

async function main(): Promise<void> {
  const startTime = Date.now();

  console.log('\n' + '='.repeat(60));
  console.log('   ISLE AI - DAILY KNOWLEDGE BASE UPDATE');
  console.log('='.repeat(60) + '\n');

  const config = parseArgs();

  log(`Configuration:`);
  log(`  - Stale threshold: ${config.staleDays} days`);
  log(`  - Check images: ${config.checkImages}`);
  log(`  - Dry run: ${config.isDryRun}`);
  log(`  - Verbose: ${config.verbose}`);

  try {
    // Load knowledge base
    log('Loading knowledge base...');
    const nodes = await loadKnowledgeBase();
    log(`Loaded ${nodes.length} nodes`, 'success');

    // Find stale nodes
    log('Checking for stale data...');
    const staleNodes = findStaleNodes(nodes, config.staleDays);
    log(`Found ${staleNodes.length} stale nodes`, staleNodes.length > 0 ? 'warn' : 'success');

    // Find possibly closed
    log('Checking for possibly closed places...');
    const possiblyClosed = findPossiblyClosed(nodes);
    log(`Found ${possiblyClosed.length} possibly closed`, possiblyClosed.length > 0 ? 'warn' : 'success');

    // Check images (if enabled)
    let imageIssues: ImageCheckResult[] = [];
    if (config.checkImages) {
      log('Checking image URLs (this may take a while)...');
      imageIssues = await checkImages(nodes, CONFIG.MAX_IMAGE_CHECKS);
      log(`Found ${imageIssues.length} image issues`, imageIssues.length > 0 ? 'warn' : 'success');
    }

    // Generate stats
    const stats = generateStats(nodes, staleNodes, possiblyClosed, imageIssues);

    // Print report
    printReport(stats, staleNodes, possiblyClosed, imageIssues, config.verbose);

    // Save report (unless dry run)
    if (!config.isDryRun) {
      saveReport(stats, staleNodes, possiblyClosed, imageIssues, config.outputDir);
    } else {
      log('[DRY RUN] No files written', 'info');
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`Update complete in ${elapsed}s`, 'success');

    // Exit with warning code if issues found
    if (staleNodes.length > nodes.length * 0.3 || possiblyClosed.filter(p => p.confidence === 'high').length > 5) {
      process.exit(2); // Warning code
    }
  } catch (error) {
    log(`Fatal error: ${error}`, 'error');
    process.exit(1);
  }
}

main();
