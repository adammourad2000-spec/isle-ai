# Isle AI Scripts

This directory contains utility scripts for managing the Isle AI knowledge base.

## Image Scraping

### scrape-images.ts

Fetches real, high-quality images for all 500+ places in the Cayman Islands knowledge base.

**Image Sources (in priority order):**
1. Google Places API (requires `GOOGLE_PLACES_API_KEY`)
2. Website OG images (from place websites)
3. Unsplash API (requires `UNSPLASH_ACCESS_KEY`)
4. Pexels API (requires `PEXELS_API_KEY`)
5. Wikimedia Commons (free, no auth required)
6. Category-based fallback images

**Usage:**

```bash
# Dry run - see what would be processed
npm run scrape-images:dry-run

# Run full scrape
npm run scrape-images

# Resume from previous run
npm run scrape-images:resume

# Or with npx directly
npx ts-node --esm --project scripts/tsconfig.json scripts/scrape-images.ts

# With options
npx ts-node --esm --project scripts/tsconfig.json scripts/scrape-images.ts --dry-run
npx ts-node --esm --project scripts/tsconfig.json scripts/scrape-images.ts --limit=50
npx ts-node --esm --project scripts/tsconfig.json scripts/scrape-images.ts --category=hotel
npx ts-node --esm --project scripts/tsconfig.json scripts/scrape-images.ts --force
```

**Options:**
- `--dry-run`: Preview what would be processed without making API calls
- `--limit=N`: Process only the first N nodes
- `--category=TYPE`: Filter by category (hotel, restaurant, beach, etc.)
- `--force`: Re-fetch images even for nodes that already have them
- `--resume`: Continue from where a previous run stopped

**Output:**
- `data/scraped-images/image-mappings.json` - Node ID to image URL mappings
- `data/scraped-images/progress.json` - Progress tracking for resume capability

### update-knowledge-base.ts

Updates the knowledge base TypeScript files with scraped image URLs.

**Usage:**

```bash
# Dry run - see what changes would be made
npm run update-images:dry-run

# Create backups and apply updates
npm run update-images:backup

# Generate runtime updater (recommended)
npm run generate-image-updater

# Or with npx directly
npx ts-node --esm --project scripts/tsconfig.json scripts/update-knowledge-base.ts --dry-run
npx ts-node --esm --project scripts/tsconfig.json scripts/update-knowledge-base.ts --backup
npx ts-node --esm --project scripts/tsconfig.json scripts/update-knowledge-base.ts --generate-updater
```

**Options:**
- `--dry-run`: Preview changes without modifying files
- `--backup`: Create backups before making changes
- `--generate-updater`: Generate a runtime updater module (recommended approach)
- `--patch-only`: Generate patch files without modifying source files

## Environment Variables

Add these to your `.env` or `.env.local` file:

```bash
# Google Places API (best quality, requires billing)
GOOGLE_PLACES_API_KEY=your_key_here

# Unsplash API (free tier: 50 req/hour)
# Get key from: https://unsplash.com/developers
UNSPLASH_ACCESS_KEY=your_key_here

# Pexels API (free tier: 200 req/hour)
# Get key from: https://www.pexels.com/api/
PEXELS_API_KEY=your_key_here
```

Note: If no API keys are set, the scripts will still work using:
- Website OG images (extracted from place websites)
- Wikimedia Commons (free, no auth required)

## Workflow

### Recommended workflow for updating images:

1. **Run the scraper with dry-run first:**
   ```bash
   npm run scrape-images:dry-run
   ```

2. **Run with a small limit to test:**
   ```bash
   npx ts-node --esm --project scripts/tsconfig.json scripts/scrape-images.ts --limit=10
   ```

3. **Run full scrape (takes ~30-60 minutes for 500+ nodes):**
   ```bash
   npm run scrape-images
   ```

4. **Generate the runtime updater:**
   ```bash
   npm run generate-image-updater
   ```

5. **Or apply updates directly with backup:**
   ```bash
   npm run update-images:backup
   ```

### Rate Limiting

The scraper includes built-in rate limiting:
- 1 request per second between API calls
- Progress is saved every 10 nodes
- Use `--resume` to continue from failures

### Error Handling

- Progress is automatically saved on errors
- Failed nodes are logged with reasons
- Use `--resume` to retry failed nodes later
