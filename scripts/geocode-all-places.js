const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_FILE = path.join(__dirname, '../data/unified-knowledge-base.json');
const OUTPUT_FILE = path.join(__dirname, '../data/unified-knowledge-base-geocoded.json');
const PROGRESS_FILE = path.join(__dirname, '../data/geocode-progress.json');
const RATE_LIMIT_MS = 1100; // Nominatim requires 1 request per second

// Cayman Islands bounds for validation
const CAYMAN_BOUNDS = {
  minLat: 19.25,
  maxLat: 19.80,
  minLng: -81.45,
  maxLng: -79.70
};

// Known precise coordinates for key locations (manually verified)
const KNOWN_LOCATIONS = {
  'seven mile beach': { lat: 19.3340, lng: -81.3925 },
  'cemetery beach': { lat: 19.3625, lng: -81.4010 },
  'stingray city': { lat: 19.3890, lng: -81.2980 },
  'rum point': { lat: 19.3650, lng: -81.2610 },
  'george town': { lat: 19.2866, lng: -81.3744 },
  'west bay': { lat: 19.3700, lng: -81.4100 },
  'east end': { lat: 19.3050, lng: -81.1000 },
  'north side': { lat: 19.3500, lng: -81.2000 },
  'bodden town': { lat: 19.2850, lng: -81.2500 },
  'spotts beach': { lat: 19.2726, lng: -81.3140 },
  'smith cove': { lat: 19.2767, lng: -81.3912 },
  'smiths cove': { lat: 19.2767, lng: -81.3912 },
  "smith's cove": { lat: 19.2767, lng: -81.3912 },
  'smiths barcadere': { lat: 19.2766, lng: -81.3911 },
  "smith's barcadere": { lat: 19.2766, lng: -81.3911 },
  'smith barcadere': { lat: 19.2766, lng: -81.3911 },
  "governor's beach": { lat: 19.3020, lng: -81.3870 },
  'governors beach': { lat: 19.3020, lng: -81.3870 },
  'public beach': { lat: 19.3400, lng: -81.3900 },
  'coral beach': { lat: 19.3350, lng: -81.3890 },
  'royal palms beach': { lat: 19.3380, lng: -81.3900 },
  'cayman turtle centre': { lat: 19.3890, lng: -81.4080 },
  'cayman turtle farm': { lat: 19.3890, lng: -81.4080 },
  'queen elizabeth ii botanic park': { lat: 19.3140, lng: -81.1710 },
  'hell': { lat: 19.3870, lng: -81.4010 },
  'pedro st james': { lat: 19.2680, lng: -81.3180 },
  'cayman crystal caves': { lat: 19.3480, lng: -81.1580 },
  'camana bay': { lat: 19.3270, lng: -81.3810 },
  'the ritz-carlton, grand cayman': { lat: 19.3290, lng: -81.3890 },
  'grand old house': { lat: 19.2920, lng: -81.3780 },
  'kaibo beach bar': { lat: 19.3650, lng: -81.2650 },
};

// District approximate centers for fallback
const DISTRICT_CENTERS = {
  'george town': { lat: 19.2866, lng: -81.3744 },
  'west bay': { lat: 19.3700, lng: -81.4100 },
  'seven mile beach': { lat: 19.3340, lng: -81.3925 },
  'bodden town': { lat: 19.2850, lng: -81.2500 },
  'east end': { lat: 19.3050, lng: -81.1000 },
  'north side': { lat: 19.3500, lng: -81.2000 },
  'rum point': { lat: 19.3650, lng: -81.2610 },
  'savannah': { lat: 19.2800, lng: -81.3300 },
  'prospect': { lat: 19.2900, lng: -81.3500 },
  'cayman brac': { lat: 19.7200, lng: -79.8000 },
  'little cayman': { lat: 19.6700, lng: -80.0500 },
};

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Geocode using Nominatim
async function geocodeNominatim(query, attempt = 1) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=ky`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'IsleAI-Geocoder/1.0 (contact@isleai.com)'
      }
    });

    if (!response.ok) {
      if (response.status === 429 && attempt < 3) {
        console.log(`    Rate limited, waiting ${attempt * 2}s...`);
        await sleep(attempt * 2000);
        return geocodeNominatim(query, attempt + 1);
      }
      return null;
    }

    const data = await response.json();

    // Find result within Cayman bounds
    for (const result of data) {
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      if (lat >= CAYMAN_BOUNDS.minLat && lat <= CAYMAN_BOUNDS.maxLat &&
          lng >= CAYMAN_BOUNDS.minLng && lng <= CAYMAN_BOUNDS.maxLng) {
        return { lat, lng, source: 'nominatim', displayName: result.display_name };
      }
    }

    return null;
  } catch (error) {
    console.log(`    Error: ${error.message}`);
    return null;
  }
}

// Get coordinates for a place
async function getCoordinates(place) {
  const name = place.name.toLowerCase().trim();
  const address = place.location.address || '';
  const district = place.location.district || '';
  const island = place.location.island || 'Grand Cayman';

  // 1. Check known locations first
  if (KNOWN_LOCATIONS[name]) {
    return { ...KNOWN_LOCATIONS[name], source: 'known' };
  }

  // Check if name contains a known location
  for (const [knownName, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (name.includes(knownName)) {
      return { ...coords, source: 'known-partial' };
    }
  }

  // 2. Try Nominatim with full query
  const queries = [
    `${place.name}, Cayman Islands`,
    `${place.name}, ${district}, Cayman Islands`,
    `${place.name}, ${island}, Cayman Islands`,
    address ? `${address}, Cayman Islands` : null,
    `${place.name}, Grand Cayman`,
  ].filter(Boolean);

  for (const query of queries) {
    const result = await geocodeNominatim(query);
    if (result) {
      return result;
    }
    await sleep(RATE_LIMIT_MS);
  }

  // 3. Fallback to district center
  const districtLower = district.toLowerCase();
  if (DISTRICT_CENTERS[districtLower]) {
    // Add small random offset to avoid exact stacking
    const offset = () => (Math.random() - 0.5) * 0.002;
    return {
      lat: DISTRICT_CENTERS[districtLower].lat + offset(),
      lng: DISTRICT_CENTERS[districtLower].lng + offset(),
      source: 'district-fallback'
    };
  }

  // 4. Keep original coordinates if all else fails
  return {
    lat: place.location.coordinates.lat,
    lng: place.location.coordinates.lng,
    source: 'original'
  };
}

// Validate and fix coordinates
function validateCoordinates(lat, lng) {
  // Ensure coordinates are within Cayman Islands
  if (lat < CAYMAN_BOUNDS.minLat || lat > CAYMAN_BOUNDS.maxLat ||
      lng < CAYMAN_BOUNDS.minLng || lng > CAYMAN_BOUNDS.maxLng) {
    return false;
  }
  return true;
}

// Main function
async function main() {
  console.log('=== GÉOCODAGE DE TOUTES LES PLACES ===\n');

  // Load data
  const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`Total places: ${data.length}\n`);

  // Load progress if exists
  let progress = { processed: [], results: {} };
  if (fs.existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    console.log(`Resuming from ${Object.keys(progress.results).length} processed\n`);
  }

  const stats = {
    known: 0,
    'known-partial': 0,
    nominatim: 0,
    'district-fallback': 0,
    original: 0,
    errors: 0
  };

  // Process each place
  for (let i = 0; i < data.length; i++) {
    const place = data[i];

    // Skip if already processed
    if (progress.results[place.id]) {
      const result = progress.results[place.id];
      stats[result.source] = (stats[result.source] || 0) + 1;
      place.location.coordinates.lat = result.lat;
      place.location.coordinates.lng = result.lng;
      continue;
    }

    process.stdout.write(`[${i + 1}/${data.length}] ${place.name.substring(0, 40).padEnd(40)} `);

    try {
      const coords = await getCoordinates(place);

      if (coords && validateCoordinates(coords.lat, coords.lng)) {
        place.location.coordinates.lat = coords.lat;
        place.location.coordinates.lng = coords.lng;
        progress.results[place.id] = coords;
        stats[coords.source] = (stats[coords.source] || 0) + 1;
        console.log(`✓ ${coords.source} (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      } else {
        console.log(`✗ Invalid coordinates`);
        stats.errors++;
      }

      // Save progress every 10 places
      if ((i + 1) % 10 === 0) {
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
      }

      // Rate limit
      await sleep(RATE_LIMIT_MS);

    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
      stats.errors++;
    }
  }

  // Save final results
  console.log('\n=== RÉSULTATS ===');
  console.log(`Known locations: ${stats.known}`);
  console.log(`Known partial: ${stats['known-partial']}`);
  console.log(`Nominatim: ${stats.nominatim}`);
  console.log(`District fallback: ${stats['district-fallback']}`);
  console.log(`Original kept: ${stats.original}`);
  console.log(`Errors: ${stats.errors}`);

  // Save output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
  console.log(`\nSaved to: ${OUTPUT_FILE}`);

  // Clean up progress file
  fs.unlinkSync(PROGRESS_FILE);
}

main().catch(console.error);
