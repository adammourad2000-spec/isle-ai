const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../data/unified-knowledge-base.json');

// Known PRECISE coordinates for key Cayman Islands locations
// These are manually verified on Google Maps
const PRECISE_LOCATIONS = {
  // ===== BEACHES =====
  'seven mile beach': { lat: 19.3340, lng: -81.3925, type: 'beach' },
  'cemetery beach': { lat: 19.3625, lng: -81.4010, type: 'beach' },
  "governor's beach": { lat: 19.3020, lng: -81.3865, type: 'beach' },
  'governors beach': { lat: 19.3020, lng: -81.3865, type: 'beach' },
  'spotts beach': { lat: 19.2726, lng: -81.3140, type: 'beach' },
  'spotts public beach': { lat: 19.2725, lng: -81.3138, type: 'beach' },
  'smith cove': { lat: 19.2767, lng: -81.3912, type: 'beach' },
  'smiths cove': { lat: 19.2767, lng: -81.3912, type: 'beach' },
  "smith's cove": { lat: 19.2767, lng: -81.3912, type: 'beach' },
  'smith barcadere': { lat: 19.2766, lng: -81.3911, type: 'beach' },
  'smiths barcadere': { lat: 19.2766, lng: -81.3911, type: 'beach' },
  "smith's barcadere": { lat: 19.2766, lng: -81.3911, type: 'beach' },
  'public beach': { lat: 19.3390, lng: -81.3905, type: 'beach' },
  'west bay beach': { lat: 19.3700, lng: -81.4030, type: 'beach' },
  'west bay public beach': { lat: 19.3700, lng: -81.4025, type: 'beach' },
  'boatswains beach': { lat: 19.3813, lng: -81.4071, type: 'beach' },
  "boatswain's beach": { lat: 19.3813, lng: -81.4071, type: 'beach' },
  'rum point beach': { lat: 19.3648, lng: -81.2610, type: 'beach' },
  'rum point public beach': { lat: 19.3645, lng: -81.2605, type: 'beach' },
  'water cay public beach': { lat: 19.3547, lng: -81.2755, type: 'beach' },
  'cayman kai public beach': { lat: 19.3690, lng: -81.2665, type: 'beach' },
  'heritage beach': { lat: 19.3030, lng: -81.0950, type: 'beach' },
  'colliers beach': { lat: 19.3076, lng: -81.0890, type: 'beach' },
  'colliers public beach': { lat: 19.3075, lng: -81.0885, type: 'beach' },
  'barefoot beach': { lat: 19.3120, lng: -81.1020, type: 'beach' },
  'south sound public beach': { lat: 19.2686, lng: -81.3884, type: 'beach' },
  'beach bay': { lat: 19.2810, lng: -81.2200, type: 'beach' },
  'pageant beach': { lat: 19.2945, lng: -81.3830, type: 'beach' },
  'coral beach': { lat: 19.3350, lng: -81.3885, type: 'beach' },
  'royal palms beach': { lat: 19.3370, lng: -81.3895, type: 'beach' },
  // Cayman Brac beaches
  'long beach': { lat: 19.7150, lng: -79.7700, type: 'beach' },
  'public beach cayman brac': { lat: 19.6931, lng: -79.8466, type: 'beach' },
  // Little Cayman beaches
  'point of sands beach': { lat: 19.6550, lng: -79.9600, type: 'beach' },
  'point of sands': { lat: 19.6550, lng: -79.9600, type: 'beach' },
  'owen island': { lat: 19.6595, lng: -80.0660, type: 'beach' },

  // ===== WATER ACTIVITIES (these CAN be in water) =====
  'stingray city': { lat: 19.3890, lng: -81.2980, type: 'water-activity' },
  'stingray city sandbar': { lat: 19.3875, lng: -81.3020, type: 'water-activity' },
  'starfish point': { lat: 19.3640, lng: -81.2550, type: 'water-activity' },

  // ===== MAJOR ATTRACTIONS =====
  'cayman turtle centre': { lat: 19.3890, lng: -81.4080, type: 'attraction' },
  'cayman turtle farm': { lat: 19.3890, lng: -81.4080, type: 'attraction' },
  'turtle centre': { lat: 19.3890, lng: -81.4080, type: 'attraction' },
  'queen elizabeth ii botanic park': { lat: 19.3140, lng: -81.1710, type: 'attraction' },
  'botanic park': { lat: 19.3140, lng: -81.1710, type: 'attraction' },
  'hell': { lat: 19.3870, lng: -81.4010, type: 'attraction' },
  'pedro st james': { lat: 19.2680, lng: -81.3180, type: 'attraction' },
  'pedro st. james': { lat: 19.2680, lng: -81.3180, type: 'attraction' },
  'cayman crystal caves': { lat: 19.3480, lng: -81.1580, type: 'attraction' },
  'crystal caves': { lat: 19.3480, lng: -81.1580, type: 'attraction' },
  'mastic trail': { lat: 19.3200, lng: -81.1900, type: 'attraction' },
  'mastic reserve': { lat: 19.3200, lng: -81.1900, type: 'attraction' },
  'camana bay': { lat: 19.3270, lng: -81.3810, type: 'attraction' },
  'national museum': { lat: 19.2955, lng: -81.3835, type: 'attraction' },
  'cayman islands national museum': { lat: 19.2955, lng: -81.3835, type: 'attraction' },

  // ===== MAJOR HOTELS =====
  'the ritz-carlton, grand cayman': { lat: 19.3290, lng: -81.3890, type: 'hotel' },
  'ritz-carlton': { lat: 19.3290, lng: -81.3890, type: 'hotel' },
  'ritz carlton': { lat: 19.3290, lng: -81.3890, type: 'hotel' },
  'kimpton seafire resort': { lat: 19.3450, lng: -81.3950, type: 'hotel' },
  'kimpton seafire resort + spa': { lat: 19.3450, lng: -81.3950, type: 'hotel' },
  'westin grand cayman': { lat: 19.3350, lng: -81.3920, type: 'hotel' },
  'the westin grand cayman seven mile beach resort & spa': { lat: 19.3350, lng: -81.3920, type: 'hotel' },
  'marriott beach resort': { lat: 19.3320, lng: -81.3910, type: 'hotel' },
  'grand cayman marriott beach resort': { lat: 19.3320, lng: -81.3910, type: 'hotel' },
  'holiday inn resort': { lat: 19.3400, lng: -81.3930, type: 'hotel' },
  'sunshine suites resort': { lat: 19.3380, lng: -81.3850, type: 'hotel' },
  'comfort suites': { lat: 19.3280, lng: -81.3840, type: 'hotel' },
  'plantana condominiums': { lat: 19.3360, lng: -81.3920, type: 'hotel' },
  'coral stone club': { lat: 19.3330, lng: -81.3900, type: 'hotel' },
  'grand lucayan': { lat: 19.3410, lng: -81.3940, type: 'hotel' },
  'turtle nest inn': { lat: 19.3055, lng: -81.0920, type: 'hotel' },
  'compass point dive resort': { lat: 19.3040, lng: -81.0900, type: 'hotel' },
  'morritts tortuga club': { lat: 19.3080, lng: -81.0850, type: 'hotel' },
  'morritts grand resort': { lat: 19.3085, lng: -81.0830, type: 'hotel' },
  'reef resort': { lat: 19.3050, lng: -81.0940, type: 'hotel' },
  'the reef resort': { lat: 19.3050, lng: -81.0940, type: 'hotel' },
  'pirates point resort': { lat: 19.6590, lng: -80.0997, type: 'hotel' },
  'southern cross club': { lat: 19.6657, lng: -80.0689, type: 'hotel' },
  'little cayman beach resort': { lat: 19.6608, lng: -80.0915, type: 'hotel' },

  // ===== RESTAURANTS =====
  'grand old house': { lat: 19.2918, lng: -81.3778, type: 'restaurant' },
  'grand old house restaurant': { lat: 19.2918, lng: -81.3778, type: 'restaurant' },
  'kaibo beach bar': { lat: 19.3653, lng: -81.2622, type: 'restaurant' },
  'kaibo yacht club': { lat: 19.3653, lng: -81.2622, type: 'restaurant' },
  'rum point club': { lat: 19.3648, lng: -81.2608, type: 'restaurant' },
  'wreck bar': { lat: 19.3648, lng: -81.2610, type: 'restaurant' },
  'calypso grill': { lat: 19.3100, lng: -81.2000, type: 'restaurant' },
  'over the edge': { lat: 19.3490, lng: -81.1950, type: 'restaurant' },
  'tukka restaurant': { lat: 19.3060, lng: -81.0920, type: 'restaurant' },
  'eagle ray dive bar': { lat: 19.3060, lng: -81.0910, type: 'restaurant' },
  'ristorante pappagallo': { lat: 19.3650, lng: -81.4020, type: 'restaurant' },
  'pappagallo': { lat: 19.3650, lng: -81.4020, type: 'restaurant' },
  'wharf restaurant': { lat: 19.3030, lng: -81.3860, type: 'restaurant' },
  'the wharf': { lat: 19.3030, lng: -81.3860, type: 'restaurant' },
  'lobster pot': { lat: 19.2950, lng: -81.3850, type: 'restaurant' },
  'the lobster pot': { lat: 19.2950, lng: -81.3850, type: 'restaurant' },
  'casanova restaurant': { lat: 19.2980, lng: -81.3840, type: 'restaurant' },
  'blue by eric ripert': { lat: 19.3290, lng: -81.3890, type: 'restaurant' },
  'yoshi sushi': { lat: 19.3270, lng: -81.3810, type: 'restaurant' },
  'agua': { lat: 19.3270, lng: -81.3808, type: 'restaurant' },
  'abacus': { lat: 19.3268, lng: -81.3815, type: 'restaurant' },
  'mizu': { lat: 19.3265, lng: -81.3805, type: 'restaurant' },
  'karoo': { lat: 19.3350, lng: -81.3920, type: 'restaurant' },
  'luca': { lat: 19.3340, lng: -81.3910, type: 'restaurant' },
  'ragazzi': { lat: 19.3400, lng: -81.3935, type: 'restaurant' },
  'deckers': { lat: 19.3330, lng: -81.3880, type: 'restaurant' },
  "guy harvey's island grill": { lat: 19.2950, lng: -81.3840, type: 'restaurant' },
  "guy harvey's": { lat: 19.2950, lng: -81.3840, type: 'restaurant' },
  'da fish shack': { lat: 19.2950, lng: -81.3820, type: 'restaurant' },
  'sunset house': { lat: 19.2900, lng: -81.3850, type: 'restaurant' },
  'cimboco': { lat: 19.2955, lng: -81.3830, type: 'restaurant' },
  'vivine kitchen': { lat: 19.3580, lng: -81.1600, type: 'restaurant' },

  // ===== DIVE SITES (these can be offshore) =====
  'devils grotto': { lat: 19.2880, lng: -81.3870, type: 'dive-site' },
  "devil's grotto": { lat: 19.2880, lng: -81.3870, type: 'dive-site' },
  'eden rock': { lat: 19.2875, lng: -81.3865, type: 'dive-site' },
  'kittiwake shipwreck': { lat: 19.3700, lng: -81.4040, type: 'dive-site' },
  'uss kittiwake': { lat: 19.3700, lng: -81.4040, type: 'dive-site' },
  'babylon': { lat: 19.3500, lng: -81.4100, type: 'dive-site' },
  'trinity caves': { lat: 19.3480, lng: -81.4090, type: 'dive-site' },

  // ===== DISTRICTS/AREAS =====
  'george town': { lat: 19.2866, lng: -81.3744, type: 'district' },
  'west bay': { lat: 19.3750, lng: -81.4100, type: 'district' },
  'bodden town': { lat: 19.2850, lng: -81.2500, type: 'district' },
  'east end': { lat: 19.3050, lng: -81.1000, type: 'district' },
  'north side': { lat: 19.3500, lng: -81.2000, type: 'district' },
  'savannah': { lat: 19.2800, lng: -81.3300, type: 'district' },
  'prospect': { lat: 19.2920, lng: -81.3550, type: 'district' },
  'red bay': { lat: 19.2880, lng: -81.3600, type: 'district' },
  'south sound': { lat: 19.2750, lng: -81.3800, type: 'district' },

  // ===== GOLF COURSES =====
  'north sound golf club': { lat: 19.3350, lng: -81.3750, type: 'golf' },
  'britannia golf club': { lat: 19.3320, lng: -81.3900, type: 'golf' },
  'blue tip golf course': { lat: 19.3295, lng: -81.3895, type: 'golf' },
  'ritz carlton golf club': { lat: 19.3295, lng: -81.3895, type: 'golf' },

  // ===== SHOPPING =====
  'kirk freeport': { lat: 19.2955, lng: -81.3840, type: 'shopping' },
  'bayshore mall': { lat: 19.2950, lng: -81.3835, type: 'shopping' },
  'island plaza': { lat: 19.2960, lng: -81.3830, type: 'shopping' },
  'the strand': { lat: 19.3270, lng: -81.3812, type: 'shopping' },
  'marquee plaza': { lat: 19.3280, lng: -81.3820, type: 'shopping' },

  // ===== AIRPORTS =====
  'owen roberts international airport': { lat: 19.2927, lng: -81.3577, type: 'airport' },
  'charles kirkconnell international airport': { lat: 19.6870, lng: -79.8828, type: 'airport' },
  'edward bodden airfield': { lat: 19.6600, lng: -80.0900, type: 'airport' },
};

// District centers for fallback positioning
const DISTRICT_COORDS = {
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
  'cayman brac': { lat: 19.7200, lng: -79.8000 },
  'little cayman': { lat: 19.6700, lng: -80.0500 },
  'cayman kai': { lat: 19.3680, lng: -81.2650 },
};

// Check if coordinates seem offshore (likely wrong)
function seemsOffshore(lat, lng, category) {
  // Water activities and dive sites can legitimately be offshore
  if (['water-activity', 'dive-site', 'snorkeling', 'diving', 'boat-tour'].includes(category)) {
    return false;
  }

  // Grand Cayman narrow check - if too far west for the latitude
  if (lat > 19.30 && lat < 19.40) {
    // Seven Mile Beach area - west boundary should be around -81.40
    if (lng < -81.42) return true;
    // East coast area - east boundary
    if (lng > -81.05) return true;
  }

  // North Sound area - mostly water
  if (lat > 19.32 && lat < 19.38 && lng > -81.35 && lng < -81.20) {
    // This is water area unless it's a water activity
    return true;
  }

  return false;
}

function main() {
  console.log('=== CORRECTION RAPIDE DES COORDONNÉES ===\n');

  const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`Total places: ${data.length}\n`);

  const stats = {
    exact_match: 0,
    partial_match: 0,
    district_match: 0,
    kept_original: 0,
    fixed_offshore: 0,
    low_precision_fixed: 0,
  };

  const fixed = [];

  data.forEach((place, index) => {
    const nameLower = place.name.toLowerCase().trim();
    const originalLat = place.location.coordinates.lat;
    const originalLng = place.location.coordinates.lng;
    const district = (place.location.district || '').toLowerCase();
    const category = place.category || '';

    let newCoords = null;
    let matchType = null;

    // 1. Try exact name match
    if (PRECISE_LOCATIONS[nameLower]) {
      newCoords = PRECISE_LOCATIONS[nameLower];
      matchType = 'exact_match';
    }

    // 2. Try partial name match
    if (!newCoords) {
      for (const [knownName, coords] of Object.entries(PRECISE_LOCATIONS)) {
        if (nameLower.includes(knownName) || knownName.includes(nameLower)) {
          newCoords = coords;
          matchType = 'partial_match';
          break;
        }
      }
    }

    // 3. Check if current coords seem offshore
    if (!newCoords && seemsOffshore(originalLat, originalLng, category)) {
      // Try to use district center
      if (district && DISTRICT_COORDS[district]) {
        const center = DISTRICT_COORDS[district];
        // Add small offset to avoid stacking
        const offset = () => (Math.random() - 0.5) * 0.003;
        newCoords = {
          lat: center.lat + offset(),
          lng: center.lng + offset()
        };
        matchType = 'fixed_offshore';
      }
    }

    // 4. Check for low precision coordinates (likely inaccurate)
    if (!newCoords) {
      const latDecimals = originalLat.toString().split('.')[1]?.length || 0;
      const lngDecimals = originalLng.toString().split('.')[1]?.length || 0;

      if (latDecimals <= 3 || lngDecimals <= 3) {
        // Low precision - use district center with offset
        if (district && DISTRICT_COORDS[district]) {
          const center = DISTRICT_COORDS[district];
          const offset = () => (Math.random() - 0.5) * 0.003;
          newCoords = {
            lat: center.lat + offset(),
            lng: center.lng + offset()
          };
          matchType = 'low_precision_fixed';
        }
      }
    }

    // 5. Apply fix or keep original
    if (newCoords) {
      const oldCoords = `${originalLat.toFixed(4)}, ${originalLng.toFixed(4)}`;
      const newCoordsStr = `${newCoords.lat.toFixed(4)}, ${newCoords.lng.toFixed(4)}`;

      if (oldCoords !== newCoordsStr) {
        fixed.push({
          name: place.name,
          old: oldCoords,
          new: newCoordsStr,
          type: matchType
        });
      }

      place.location.coordinates.lat = parseFloat(newCoords.lat.toFixed(6));
      place.location.coordinates.lng = parseFloat(newCoords.lng.toFixed(6));
      stats[matchType]++;
    } else {
      stats.kept_original++;
    }
  });

  // Report
  console.log('=== STATISTIQUES ===');
  console.log(`Correspondance exacte: ${stats.exact_match}`);
  console.log(`Correspondance partielle: ${stats.partial_match}`);
  console.log(`Correspondance district: ${stats.district_match}`);
  console.log(`Coordonnées offshore corrigées: ${stats.fixed_offshore}`);
  console.log(`Faible précision corrigée: ${stats.low_precision_fixed}`);
  console.log(`Gardé original: ${stats.kept_original}`);
  console.log(`\nTotal corrigé: ${fixed.length}`);

  console.log('\n=== CORRECTIONS EFFECTUÉES ===');
  fixed.slice(0, 50).forEach(f => {
    console.log(`  ${f.name}`);
    console.log(`    ${f.old} → ${f.new} (${f.type})`);
  });

  if (fixed.length > 50) {
    console.log(`  ... et ${fixed.length - 50} autres`);
  }

  // Save
  fs.writeFileSync(INPUT_FILE, JSON.stringify(data, null, 2));
  console.log(`\n✓ Fichier sauvegardé: ${INPUT_FILE}`);
}

main();
