import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = path.join(__dirname, '../data/unified-knowledge-base.json');
const OUTPUT_FILE = path.join(__dirname, '../data/unified-knowledge-base.json');
const PROGRESS_FILE = path.join(__dirname, '../data/scrape-progress.json');

// Rate limiting
const DELAY_MS = 250; // 4 requests per second for Nominatim with good User-Agent
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Cayman Islands bounds
const CAYMAN_BOUNDS = {
  minLat: 19.25, maxLat: 19.80,
  minLng: -81.45, maxLng: -79.70
};

// Search using Nominatim (OpenStreetMap)
async function searchNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    countrycodes: 'ky',
    addressdetails: '1'
  });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'IsleAI-CaymanTravelApp/2.0 (https://isleai.ky; contact@isleai.ky)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.log(`    Nominatim error: ${response.status}`);
      return null;
    }

    const results = await response.json();

    for (const r of results) {
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lon);
      if (lat >= CAYMAN_BOUNDS.minLat && lat <= CAYMAN_BOUNDS.maxLat &&
          lng >= CAYMAN_BOUNDS.minLng && lng <= CAYMAN_BOUNDS.maxLng) {
        return { lat, lng, source: 'nominatim', name: r.display_name };
      }
    }
    return null;
  } catch (e) {
    console.log(`    Fetch error: ${e.message}`);
    return null;
  }
}

// Search using Photon (Komoot's geocoder based on OSM)
async function searchPhoton(query) {
  const url = `https://photon.komoot.io/api/?` + new URLSearchParams({
    q: query + ' Cayman Islands',
    limit: '5',
    lat: '19.32',
    lon: '-81.24'
  });

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) return null;

    const data = await response.json();

    for (const feature of (data.features || [])) {
      if (feature.geometry?.coordinates) {
        const lng = feature.geometry.coordinates[0];
        const lat = feature.geometry.coordinates[1];
        if (lat >= CAYMAN_BOUNDS.minLat && lat <= CAYMAN_BOUNDS.maxLat &&
            lng >= CAYMAN_BOUNDS.minLng && lng <= CAYMAN_BOUNDS.maxLng) {
          return { lat, lng, source: 'photon', name: feature.properties?.name };
        }
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Known precise locations (manually verified on Google Maps)
const KNOWN_COORDS = {
  // BEACHES - West Coast (Seven Mile Beach area)
  'seven mile beach': { lat: 19.3340, lng: -81.3925 },
  'cemetery beach': { lat: 19.3625, lng: -81.4010 },
  'governors beach': { lat: 19.3020, lng: -81.3865 },
  "governor's beach": { lat: 19.3020, lng: -81.3865 },
  'public beach': { lat: 19.3390, lng: -81.3905 },
  'coral beach': { lat: 19.3350, lng: -81.3885 },
  'royal palms beach': { lat: 19.3370, lng: -81.3895 },
  'west bay beach': { lat: 19.3700, lng: -81.4030 },
  'west bay public beach': { lat: 19.3700, lng: -81.4025 },
  'boatswains beach': { lat: 19.3813, lng: -81.4071 },
  "boatswain's beach": { lat: 19.3813, lng: -81.4071 },

  // BEACHES - South Coast
  'smith cove': { lat: 19.2767, lng: -81.3912 },
  'smiths cove': { lat: 19.2767, lng: -81.3912 },
  "smith's cove": { lat: 19.2767, lng: -81.3912 },
  'smith barcadere': { lat: 19.2766, lng: -81.3911 },
  'smiths barcadere': { lat: 19.2766, lng: -81.3911 },
  "smith's barcadere": { lat: 19.2766, lng: -81.3911 },
  'spotts beach': { lat: 19.2726, lng: -81.3140 },
  'spotts public beach': { lat: 19.2725, lng: -81.3138 },
  'south sound public beach': { lat: 19.2686, lng: -81.3884 },
  'pageant beach': { lat: 19.2945, lng: -81.3830 },
  'beach bay': { lat: 19.2810, lng: -81.2200 },

  // BEACHES - North/East
  'rum point beach': { lat: 19.3648, lng: -81.2610 },
  'rum point public beach': { lat: 19.3645, lng: -81.2605 },
  'water cay public beach': { lat: 19.3547, lng: -81.2755 },
  'cayman kai public beach': { lat: 19.3690, lng: -81.2665 },
  'starfish point': { lat: 19.3640, lng: -81.2550 },
  'heritage beach': { lat: 19.3030, lng: -81.0950 },
  'colliers beach': { lat: 19.3076, lng: -81.0890 },
  'colliers public beach': { lat: 19.3075, lng: -81.0885 },
  'barefoot beach': { lat: 19.3120, lng: -81.1020 },

  // BEACHES - Sister Islands
  'long beach': { lat: 19.7150, lng: -79.7700 },
  'point of sands beach': { lat: 19.6550, lng: -79.9600 },
  'point of sands': { lat: 19.6550, lng: -79.9600 },
  'owen island': { lat: 19.6595, lng: -80.0660 },

  // WATER ACTIVITIES
  'stingray city': { lat: 19.3890, lng: -81.2980 },
  'stingray city sandbar': { lat: 19.3875, lng: -81.3020 },

  // MAJOR ATTRACTIONS
  'cayman turtle centre': { lat: 19.3890, lng: -81.4080 },
  'cayman turtle farm': { lat: 19.3890, lng: -81.4080 },
  'turtle centre': { lat: 19.3890, lng: -81.4080 },
  'queen elizabeth ii botanic park': { lat: 19.3140, lng: -81.1710 },
  'botanic park': { lat: 19.3140, lng: -81.1710 },
  'hell': { lat: 19.3870, lng: -81.4010 },
  'pedro st james': { lat: 19.2680, lng: -81.3180 },
  'pedro st. james': { lat: 19.2680, lng: -81.3180 },
  'cayman crystal caves': { lat: 19.3480, lng: -81.1580 },
  'crystal caves': { lat: 19.3480, lng: -81.1580 },
  'mastic trail': { lat: 19.3200, lng: -81.1900 },
  'camana bay': { lat: 19.3270, lng: -81.3810 },
  'national museum': { lat: 19.2955, lng: -81.3835 },
  'cayman islands national museum': { lat: 19.2955, lng: -81.3835 },

  // MAJOR HOTELS
  'the ritz-carlton, grand cayman': { lat: 19.3290, lng: -81.3890 },
  'ritz-carlton': { lat: 19.3290, lng: -81.3890 },
  'ritz carlton': { lat: 19.3290, lng: -81.3890 },
  'kimpton seafire resort': { lat: 19.3450, lng: -81.3950 },
  'kimpton seafire resort + spa': { lat: 19.3450, lng: -81.3950 },
  'westin grand cayman': { lat: 19.3350, lng: -81.3920 },
  'grand cayman marriott beach resort': { lat: 19.3320, lng: -81.3910 },
  'marriott beach resort': { lat: 19.3320, lng: -81.3910 },
  'holiday inn resort': { lat: 19.3400, lng: -81.3930 },
  'sunshine suites resort': { lat: 19.3380, lng: -81.3850 },
  'comfort suites': { lat: 19.3280, lng: -81.3840 },
  'turtle nest inn': { lat: 19.3055, lng: -81.0920 },
  'compass point dive resort': { lat: 19.3040, lng: -81.0900 },
  'morritts tortuga club': { lat: 19.3080, lng: -81.0850 },
  'morritts grand resort': { lat: 19.3085, lng: -81.0830 },
  'reef resort': { lat: 19.3050, lng: -81.0940 },
  'the reef resort': { lat: 19.3050, lng: -81.0940 },
  'pirates point resort': { lat: 19.6590, lng: -80.0997 },
  'southern cross club': { lat: 19.6657, lng: -80.0689 },
  'little cayman beach resort': { lat: 19.6608, lng: -80.0915 },

  // RESTAURANTS
  'grand old house': { lat: 19.2918, lng: -81.3778 },
  'grand old house restaurant': { lat: 19.2918, lng: -81.3778 },
  'kaibo beach bar': { lat: 19.3653, lng: -81.2622 },
  'kaibo yacht club': { lat: 19.3653, lng: -81.2622 },
  'rum point club': { lat: 19.3648, lng: -81.2608 },
  'wreck bar': { lat: 19.3648, lng: -81.2610 },
  'calypso grill': { lat: 19.3100, lng: -81.2000 },
  'over the edge': { lat: 19.3490, lng: -81.1950 },
  'tukka restaurant': { lat: 19.3060, lng: -81.0920 },
  'ristorante pappagallo': { lat: 19.3650, lng: -81.4020 },
  'pappagallo': { lat: 19.3650, lng: -81.4020 },
  'wharf restaurant': { lat: 19.3030, lng: -81.3860 },
  'the wharf': { lat: 19.3030, lng: -81.3860 },
  'lobster pot': { lat: 19.2950, lng: -81.3850 },
  'the lobster pot': { lat: 19.2950, lng: -81.3850 },
  'casanova restaurant': { lat: 19.2980, lng: -81.3840 },
  'blue by eric ripert': { lat: 19.3290, lng: -81.3890 },
  'yoshi sushi': { lat: 19.3270, lng: -81.3810 },
  'agua': { lat: 19.3270, lng: -81.3808 },
  'abacus': { lat: 19.3268, lng: -81.3815 },
  'mizu': { lat: 19.3265, lng: -81.3805 },
  'luca': { lat: 19.3340, lng: -81.3910 },
  'ragazzi': { lat: 19.3400, lng: -81.3935 },
  "guy harvey's island grill": { lat: 19.2950, lng: -81.3840 },
  'sunset house': { lat: 19.2900, lng: -81.3850 },
  'cimboco': { lat: 19.2955, lng: -81.3830 },
  'vivine kitchen': { lat: 19.3580, lng: -81.1600 },

  // DIVE SITES
  'devils grotto': { lat: 19.2880, lng: -81.3870 },
  "devil's grotto": { lat: 19.2880, lng: -81.3870 },
  'eden rock': { lat: 19.2875, lng: -81.3865 },
  'kittiwake shipwreck': { lat: 19.3700, lng: -81.4040 },
  'uss kittiwake': { lat: 19.3700, lng: -81.4040 },

  // GOLF
  'north sound golf club': { lat: 19.3350, lng: -81.3750 },
  'britannia golf club': { lat: 19.3320, lng: -81.3900 },
  'blue tip golf course': { lat: 19.3295, lng: -81.3895 },

  // AIRPORTS
  'owen roberts international airport': { lat: 19.2927, lng: -81.3577 },
  'charles kirkconnell international airport': { lat: 19.6870, lng: -79.8828 },
  'edward bodden airfield': { lat: 19.6600, lng: -80.0900 },
};

// District centers for smart fallback
const DISTRICT_CENTERS = {
  'george town': { lat: 19.2866, lng: -81.3744 },
  'west bay': { lat: 19.3750, lng: -81.4100 },
  'seven mile beach': { lat: 19.3340, lng: -81.3925 },
  'bodden town': { lat: 19.2850, lng: -81.2500 },
  'east end': { lat: 19.3050, lng: -81.1000 },
  'north side': { lat: 19.3500, lng: -81.2000 },
  'rum point': { lat: 19.3650, lng: -81.2610 },
  'savannah': { lat: 19.2800, lng: -81.3300 },
  'prospect': { lat: 19.2920, lng: -81.3550 },
  'red bay': { lat: 19.2880, lng: -81.3600 },
  'south sound': { lat: 19.2750, lng: -81.3800 },
  'cayman brac': { lat: 19.7100, lng: -79.8200 },
  'little cayman': { lat: 19.6650, lng: -80.0600 },
  'cayman kai': { lat: 19.3680, lng: -81.2650 },
  'grand cayman': { lat: 19.3200, lng: -81.2400 },
};

// Get best coordinates for a place
async function getCoordinates(place) {
  const nameLower = place.name.toLowerCase().trim();
  const address = place.location.address || '';
  const district = (place.location.district || '').toLowerCase();
  const island = (place.location.island || 'Grand Cayman').toLowerCase();

  // 1. Check known coordinates first (most reliable)
  if (KNOWN_COORDS[nameLower]) {
    return { ...KNOWN_COORDS[nameLower], source: 'known' };
  }

  // Check partial matches
  for (const [key, coords] of Object.entries(KNOWN_COORDS)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return { ...coords, source: 'known-partial' };
    }
  }

  // 2. Try Photon (faster, no strict rate limit)
  let result = await searchPhoton(place.name);
  if (result) return result;
  await sleep(100);

  // 3. Try Nominatim with various queries
  const queries = [
    `${place.name}, Grand Cayman`,
    `${place.name}, Cayman Islands`,
    address ? `${address}` : null,
    district ? `${place.name}, ${district}` : null,
  ].filter(Boolean);

  for (const query of queries) {
    result = await searchNominatim(query);
    if (result) return result;
    await sleep(DELAY_MS);
  }

  // 4. Use district center as fallback
  const districtKey = district || island;
  if (DISTRICT_CENTERS[districtKey]) {
    const center = DISTRICT_CENTERS[districtKey];
    // Add small random offset to prevent stacking
    return {
      lat: center.lat + (Math.random() - 0.5) * 0.008,
      lng: center.lng + (Math.random() - 0.5) * 0.008,
      source: 'district-fallback'
    };
  }

  // 5. Keep original if reasonable
  const origLat = place.location.coordinates.lat;
  const origLng = place.location.coordinates.lng;
  if (origLat >= CAYMAN_BOUNDS.minLat && origLat <= CAYMAN_BOUNDS.maxLat &&
      origLng >= CAYMAN_BOUNDS.minLng && origLng <= CAYMAN_BOUNDS.maxLng) {
    return { lat: origLat, lng: origLng, source: 'original' };
  }

  // 6. Default to George Town center
  return {
    lat: 19.2866 + (Math.random() - 0.5) * 0.01,
    lng: -81.3744 + (Math.random() - 0.5) * 0.01,
    source: 'default-fallback'
  };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   SCRAPING COORDONNÉES POUR TOUS LES LIEUX CAYMAN       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`📍 Total places à traiter: ${data.length}\n`);

  // Load progress
  let progress = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    console.log(`📂 Reprise depuis ${Object.keys(progress).length} traités\n`);
  }

  const stats = { known: 0, 'known-partial': 0, nominatim: 0, photon: 0, 'district-fallback': 0, original: 0, 'default-fallback': 0 };
  let processed = 0;
  let updated = 0;

  for (let i = 0; i < data.length; i++) {
    const place = data[i];

    // Skip if already processed in this session
    if (progress[place.id]) {
      const cached = progress[place.id];
      place.location.coordinates.lat = cached.lat;
      place.location.coordinates.lng = cached.lng;
      stats[cached.source] = (stats[cached.source] || 0) + 1;
      continue;
    }

    const shortName = place.name.length > 35 ? place.name.substring(0, 35) + '...' : place.name.padEnd(38);
    process.stdout.write(`[${String(i + 1).padStart(3)}/${data.length}] ${shortName} `);

    const oldLat = place.location.coordinates.lat;
    const oldLng = place.location.coordinates.lng;

    const coords = await getCoordinates(place);

    place.location.coordinates.lat = parseFloat(coords.lat.toFixed(6));
    place.location.coordinates.lng = parseFloat(coords.lng.toFixed(6));

    progress[place.id] = coords;
    stats[coords.source] = (stats[coords.source] || 0) + 1;
    processed++;

    const changed = Math.abs(oldLat - coords.lat) > 0.0001 || Math.abs(oldLng - coords.lng) > 0.0001;
    if (changed) updated++;

    const icon = coords.source === 'known' ? '✓' : coords.source === 'nominatim' || coords.source === 'photon' ? '◉' : '○';
    console.log(`${icon} ${coords.source.padEnd(16)} (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);

    // Save progress every 25 places
    if (processed % 25 === 0) {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
      console.log(`   💾 Progress saved (${processed} processed, ${updated} updated)`);
    }
  }

  // Final save
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                      RÉSULTATS                           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`✓ Known locations:     ${stats.known || 0}`);
  console.log(`✓ Known partial:       ${stats['known-partial'] || 0}`);
  console.log(`◉ Photon API:          ${stats.photon || 0}`);
  console.log(`◉ Nominatim API:       ${stats.nominatim || 0}`);
  console.log(`○ District fallback:   ${stats['district-fallback'] || 0}`);
  console.log(`○ Original kept:       ${stats.original || 0}`);
  console.log(`○ Default fallback:    ${stats['default-fallback'] || 0}`);
  console.log(`\n📊 Total traités: ${processed}`);
  console.log(`📝 Coordonnées mises à jour: ${updated}`);
  console.log(`\n✅ Fichier sauvegardé: ${OUTPUT_FILE}`);

  // Cleanup progress file
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }
}

main().catch(console.error);
