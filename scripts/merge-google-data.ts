#!/usr/bin/env node

/**
 * Merge Google Enriched Data back into OSM Knowledge Base
 *
 * Takes the scraped Google data and merges it with the original OSM data
 * to create a fully enriched knowledge base.
 *
 * Usage:
 *   npx ts-node scripts/merge-google-data.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';

// ============ PATHS ============

const PATHS = {
  OSM_DATA: path.join(process.cwd(), 'data', 'osm-scraped', 'osm-knowledge.json'),
  GOOGLE_DATA: path.join(process.cwd(), 'data', 'google-enriched', 'enriched-places.json'),
  OUTPUT_JSON: path.join(process.cwd(), 'data', 'osm-scraped', 'osm-knowledge-enriched.json'),
  OUTPUT_TS: path.join(process.cwd(), 'data', 'osm-scraped', 'osm-knowledge.ts'),
  BACKUP: path.join(process.cwd(), 'data', 'osm-scraped', 'osm-knowledge-backup.json')
};

// ============ TYPES ============

interface OSMPlace {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  shortDescription?: string;
  tags: string[];
  location: {
    island: string;
    area?: string;
    district?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
    latitude?: number;
    longitude?: number;
  };
  ratings: {
    overall: number;
    reviewCount: number;
    breakdown?: Record<string, number>;
  };
  media: {
    thumbnail: string;
    images: string[];
    virtualTour?: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    bookingUrl?: string;
    social?: Record<string, string>;
  };
  hours?: {
    display?: string;
    schedule?: Record<string, string>;
    timezone?: string;
  };
  business: {
    priceRange?: string;
    currency?: string;
    established?: number;
    capacity?: number;
  };
  highlights?: string[];
  amenities?: string[];
}

interface GoogleEnrichedData {
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

// ============ MERGE LOGIC ============

function mergePlace(osm: OSMPlace, google: GoogleEnrichedData): OSMPlace {
  const merged = { ...osm };

  // Update rating only if Google has a real rating (not just default)
  if (google.rating && google.rating > 0) {
    merged.ratings = {
      ...merged.ratings,
      overall: google.rating,
      reviewCount: google.reviewCount || merged.ratings.reviewCount
    };
  }

  // Add Google photos (prefer Google photos over placeholders)
  if (google.photos && google.photos.length > 0) {
    const validPhotos = google.photos.filter(p =>
      p && p.startsWith('http') && !p.includes('placeholder')
    );

    if (validPhotos.length > 0) {
      merged.media = {
        ...merged.media,
        thumbnail: validPhotos[0],
        images: validPhotos
      };
    }
  }

  // Update contact info
  if (google.phone || google.website || google.bookingUrl) {
    merged.contact = {
      ...merged.contact,
      phone: google.phone || merged.contact?.phone,
      website: google.website || merged.contact?.website,
      bookingUrl: google.bookingUrl || merged.contact?.bookingUrl
    };
  }

  // Update hours
  if (google.hours) {
    merged.hours = {
      ...merged.hours,
      display: google.hours
    };
  }

  // Update price level
  if (google.priceLevel) {
    merged.business = {
      ...merged.business,
      priceRange: google.priceLevel
    };
  }

  // Update address if more specific
  if (google.address && google.address.length > (merged.location.address?.length || 0)) {
    merged.location = {
      ...merged.location,
      address: google.address
    };
  }

  return merged;
}

// ============ MAIN ============

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('═'.repeat(70));
  console.log('         MERGE GOOGLE DATA INTO OSM KNOWLEDGE BASE');
  console.log('═'.repeat(70));

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN MODE - No files will be modified\n');
  }

  // Check files exist
  if (!fs.existsSync(PATHS.OSM_DATA)) {
    console.error('❌ OSM data not found:', PATHS.OSM_DATA);
    process.exit(1);
  }

  if (!fs.existsSync(PATHS.GOOGLE_DATA)) {
    console.error('❌ Google enriched data not found:', PATHS.GOOGLE_DATA);
    console.log('   Run the scraper first: npx ts-node scripts/google-scraper.ts');
    process.exit(1);
  }

  // Load data
  const osmPlaces: OSMPlace[] = JSON.parse(fs.readFileSync(PATHS.OSM_DATA, 'utf-8'));
  const googleData: Record<string, GoogleEnrichedData> = JSON.parse(fs.readFileSync(PATHS.GOOGLE_DATA, 'utf-8'));

  console.log(`📚 Loaded ${osmPlaces.length} places from OSM`);
  console.log(`🔍 Loaded ${Object.keys(googleData).length} enriched records from Google\n`);

  // Statistics
  let updatedRatings = 0;
  let updatedPhotos = 0;
  let updatedContact = 0;
  let updatedHours = 0;
  let updatedPrice = 0;
  let totalUpdated = 0;

  // Merge data
  const mergedPlaces = osmPlaces.map(place => {
    const google = googleData[place.id];

    if (!google) {
      return place;
    }

    const hadDefaultRating = place.ratings.overall === 4.0 || place.ratings.overall === 4;
    const hadPlaceholderPhoto = !place.media?.thumbnail || place.media.thumbnail.includes('placeholder') || place.media.thumbnail.includes('unsplash');

    const merged = mergePlace(place, google);

    // Track what was updated
    let wasUpdated = false;

    if (google.rating && google.rating > 0 && hadDefaultRating) {
      updatedRatings++;
      wasUpdated = true;
    }

    if (google.photos?.length > 0 && hadPlaceholderPhoto) {
      updatedPhotos++;
      wasUpdated = true;
    }

    if (google.phone || google.website || google.bookingUrl) {
      updatedContact++;
      wasUpdated = true;
    }

    if (google.hours) {
      updatedHours++;
      wasUpdated = true;
    }

    if (google.priceLevel) {
      updatedPrice++;
      wasUpdated = true;
    }

    if (wasUpdated) {
      totalUpdated++;
    }

    return merged;
  });

  // Show statistics
  console.log('📊 MERGE STATISTICS:');
  console.log('─'.repeat(40));
  console.log(`   Total places updated: ${totalUpdated}`);
  console.log(`   ⭐ Ratings updated: ${updatedRatings}`);
  console.log(`   📷 Photos updated: ${updatedPhotos}`);
  console.log(`   📞 Contact info updated: ${updatedContact}`);
  console.log(`   🕐 Hours updated: ${updatedHours}`);
  console.log(`   💰 Price levels updated: ${updatedPrice}`);

  // Show sample of merged data
  console.log('\n📝 SAMPLE MERGED PLACES:');
  console.log('─'.repeat(40));

  const samplesWithData = mergedPlaces
    .filter(p => googleData[p.id]?.rating || googleData[p.id]?.photos?.length)
    .slice(0, 3);

  samplesWithData.forEach(place => {
    const google = googleData[place.id];
    console.log(`\n   ${place.name}`);
    console.log(`   ├─ Rating: ${place.ratings.overall}/5 (${place.ratings.reviewCount} reviews)`);
    console.log(`   ├─ Photos: ${place.media.images?.length || 0}`);
    console.log(`   ├─ Phone: ${place.contact?.phone || 'N/A'}`);
    console.log(`   ├─ Hours: ${place.hours?.display || 'N/A'}`);
    console.log(`   └─ Price: ${place.business?.priceRange || 'N/A'}`);
  });

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN - No files written');
    console.log('   Remove --dry-run to save changes');
    return;
  }

  // Backup original
  console.log('\n💾 Saving files...');
  fs.copyFileSync(PATHS.OSM_DATA, PATHS.BACKUP);
  console.log(`   ✅ Backup saved: ${PATHS.BACKUP}`);

  // Save merged JSON
  fs.writeFileSync(PATHS.OUTPUT_JSON, JSON.stringify(mergedPlaces, null, 2));
  console.log(`   ✅ Enriched JSON saved: ${PATHS.OUTPUT_JSON}`);

  // Generate TypeScript file
  const tsContent = `/**
 * OSM Knowledge Base - Enriched with Google Data
 * Auto-generated on ${new Date().toISOString()}
 *
 * Total places: ${mergedPlaces.length}
 * Enriched with Google data: ${totalUpdated}
 */

import type { KnowledgeNode } from '../../types/chatbot';

export const OSM_KNOWLEDGE: KnowledgeNode[] = ${JSON.stringify(mergedPlaces, null, 2)};

export default OSM_KNOWLEDGE;
`;

  fs.writeFileSync(PATHS.OUTPUT_TS, tsContent);
  console.log(`   ✅ TypeScript module saved: ${PATHS.OUTPUT_TS}`);

  // Also update the original JSON to use enriched data
  fs.writeFileSync(PATHS.OSM_DATA, JSON.stringify(mergedPlaces, null, 2));
  console.log(`   ✅ Original JSON updated: ${PATHS.OSM_DATA}`);

  console.log('\n' + '═'.repeat(70));
  console.log('                        MERGE COMPLETE!');
  console.log('═'.repeat(70));
  console.log(`\n✅ ${totalUpdated} places enriched with real Google data`);
  console.log('\nYour knowledge base now has:');
  console.log(`   • Real ratings from Google (${updatedRatings} places)`);
  console.log(`   • Real photos from Google (${updatedPhotos} places)`);
  console.log(`   • Real contact info (${updatedContact} places)`);
  console.log(`   • Real hours (${updatedHours} places)`);
  console.log(`\n🚀 Restart your dev server to see the changes!`);
}

main().catch(console.error);
