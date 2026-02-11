# Isle AI - Data Scrapers

Comprehensive scrapers for collecting tourism data for the Cayman Islands.

## Overview

This directory contains scrapers for collecting:

1. **Google Maps Places** - Hotels, restaurants, attractions, services, etc.
2. **Flight Routes** - Direct flights to/from the Cayman Islands

---

## Google Maps Scraper

### Prerequisites

#### 1. Get a Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Places API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Places API"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key
5. (Optional but recommended) Restrict your API key:
   - Click on the API key to edit
   - Under "API restrictions", select "Restrict key"
   - Select "Places API" from the dropdown
   - Under "Application restrictions", consider adding HTTP referrers or IP addresses

#### 2. Set Up Environment Variable

Add your API key to `.env` in the project root:

```bash
# .env
GOOGLE_PLACES_API_KEY=your_api_key_here
```

Or use `GOOGLE_MAPS_API_KEY` as an alternative name.

### Running the Scraper

```bash
# Full scrape (WARNING: This can be expensive!)
npm run scrape:google-maps

# Dry run (no API calls, shows what would be scraped)
npm run scrape:google-maps:dry-run

# Verbose mode (more logging)
npm run scrape:google-maps:verbose

# Resume a previous interrupted scrape
npm run scrape:google-maps:resume
```

### Output Files

The scraper generates files in `data/scraped-places/`:

| File | Description |
|------|-------------|
| `scraped-places.json` | Raw scraped data from Google |
| `google-maps-knowledge.ts` | TypeScript module with KnowledgeNode[] |
| `google-maps-knowledge.json` | JSON version for easy inspection |

Cache and progress files are stored in `data/scraper-cache/`:

| File | Description |
|------|-------------|
| `progress.json` | Resume state if scraping is interrupted |
| `stats.json` | Statistics from the last run |
| `scraper.log` | Detailed log file |

### Estimated Costs

Google Places API pricing (as of 2024):

| API Call | Cost per 1,000 calls |
|----------|---------------------|
| Nearby Search | $32.00 |
| Place Details (Basic) | $17.00 |
| Place Details (Contact) | $3.00 |
| Place Details (Atmosphere) | $5.00 |
| Place Photos | $7.00 |

**Estimated total cost for full Cayman Islands scrape:**

| Component | Estimated Calls | Cost |
|-----------|----------------|------|
| Nearby Search | ~400 | $12.80 |
| Place Details | ~3,000 | $75.00 |
| **Total** | | **~$90-120** |

> **Note:** Costs vary based on results found. The scraper tracks estimated costs in real-time.

### Rate Limiting

The scraper implements:

- **5 requests per second** (Google allows 100, but we're conservative)
- **Exponential backoff** on rate limit errors
- **Automatic retry** (3 attempts per request)
- **Progress saving** every 50 places (safe resume)

### Categories Scraped

The scraper searches for these categories across all three islands:

| Category | Google Types | Keywords |
|----------|--------------|----------|
| Hotels & Resorts | lodging, hotel | resort, boutique hotel |
| Vacation Rentals | lodging | villa rental, condo rental |
| Restaurants | restaurant, cafe | fine dining, seafood |
| Bars & Nightlife | bar, night_club | beach bar, cocktail bar |
| Diving & Snorkeling | - | scuba diving, dive shop |
| Boat Charters | marina | yacht charter, fishing |
| Water Sports | - | jet ski, kayak, paddleboard |
| Beaches | - | beach, public beach |
| Attractions | tourist_attraction, museum | stingray city, turtle farm |
| Activities & Tours | travel_agency | tours, excursion, eco tour |
| Golf | golf_course | golf club |
| Spas & Wellness | spa, gym | massage, wellness, yoga |
| Shopping | shopping_mall, jewelry_store | duty free, boutique |
| Car Rentals | car_rental | car hire, vehicle rental |
| Taxi & Transport | taxi_stand, bus_station | private transfer |
| Hospitals & Clinics | hospital, doctor | medical center, clinic |
| Pharmacies | pharmacy | drugstore |
| Banks & ATMs | bank, atm | - |
| Insurance | insurance_agency | insurance office |
| Public Services | post_office, local_government | government office |

### Search Locations

The scraper covers 12 locations across all three islands:

**Grand Cayman:**
- George Town Center & South
- Seven Mile Beach North & South
- West Bay
- Bodden Town
- East End
- North Side
- Rum Point Area

**Cayman Brac:**
- West End
- East End

**Little Cayman:**
- Full island coverage

---

## Flights Scraper

### Running the Scraper

```bash
npm run scrape:flights
```

### Output Files

Generated in `data/flights/`:

| File | Description |
|------|-------------|
| `flights-knowledge.ts` | TypeScript module with flight data |
| `flights-knowledge.json` | JSON version |
| `flights-raw-data.json` | Raw airports, airlines, and routes |

### Data Included

- **3 Cayman airports** (GCM, CYB, LYB)
- **9 airlines** serving the islands
- **20+ direct flight routes** from major cities
- **Inter-island routes** (Cayman Airways Express)

### Real-Time Flight Data

The current implementation uses **static/mock data** based on publicly available schedules. For real-time flight information, consider integrating with:

| API | Use Case | Pricing |
|-----|----------|---------|
| [FlightAware](https://flightaware.com/commercial/firehose/) | Real-time tracking | Enterprise |
| [AeroDataBox](https://rapidapi.com/aedbx-aedbx/api/aerodatabox) | Schedules & routes | Freemium |
| [Aviation Edge](https://aviation-edge.com/) | Comprehensive data | From $50/mo |
| [Skyscanner API](https://www.partners.skyscanner.net/) | Booking integration | Partnership |

---

## Integration with Knowledge Base

### Merging Scraped Data

After scraping, merge the data with the existing knowledge base:

```typescript
// In your data loader
import { GOOGLE_MAPS_KNOWLEDGE } from '../data/scraped-places/google-maps-knowledge';
import { FLIGHTS_KNOWLEDGE } from '../data/flights/flights-knowledge';
import { CAYMAN_HOTELS, CAYMAN_RESTAURANTS, ... } from '../data/cayman-islands-knowledge';

// Combine all sources
const ALL_KNOWLEDGE: KnowledgeNode[] = [
  ...CAYMAN_HOTELS,
  ...CAYMAN_RESTAURANTS,
  // ... other existing data
  ...GOOGLE_MAPS_KNOWLEDGE,
  ...FLIGHTS_KNOWLEDGE,
];

// De-duplicate by googlePlaceId
const uniqueKnowledge = deduplicateByGooglePlaceId(ALL_KNOWLEDGE);
```

### Data Deduplication

The scraper adds `googlePlaceId` to each node's location. Use this for deduplication:

```typescript
function deduplicateByGooglePlaceId(nodes: KnowledgeNode[]): KnowledgeNode[] {
  const seen = new Map<string, KnowledgeNode>();

  for (const node of nodes) {
    const placeId = node.location.googlePlaceId;
    if (placeId && seen.has(placeId)) {
      // Merge or skip duplicate
      const existing = seen.get(placeId)!;
      // Prefer manually curated data over scraped
      if (existing.createdBy !== 'google-maps-scraper') {
        continue;
      }
    }
    seen.set(placeId || node.id, node);
  }

  return Array.from(seen.values());
}
```

---

## Troubleshooting

### "REQUEST_DENIED" Error

**Cause:** API key issue
- Check that the Places API is enabled
- Verify the API key is correct in `.env`
- Check API key restrictions

### "OVER_QUERY_LIMIT" Error

**Cause:** Rate limiting or quota exceeded
- The scraper will automatically retry with backoff
- Check your daily quota in Google Cloud Console
- Consider enabling billing for higher quotas

### Missing Places

**Possible causes:**
- Place doesn't exist in Google Maps
- Place has no Google Place ID
- Search radius doesn't cover the area

**Solutions:**
- Add custom keyword searches
- Adjust search locations/radii
- Manually add missing places to knowledge base

### Scraper Interrupted

The scraper saves progress every 50 places. To resume:

```bash
npm run scrape:google-maps:resume
```

Or delete `data/scraper-cache/progress.json` to start fresh.

---

## Development

### Adding New Categories

Edit `google-maps-scraper.ts` and add to the `categories` array:

```typescript
{
  name: 'Your Category',
  types: ['google_place_type'],
  keywords: ['keyword1', 'keyword2'],
  knowledgeCategory: 'your_knowledge_category',
  subcategory: 'optional_subcategory',
}
```

### Adding New Locations

Edit the `locations` array:

```typescript
{
  name: 'Location Name',
  island: 'Grand Cayman', // or 'Cayman Brac' or 'Little Cayman'
  lat: 19.0000,
  lng: -81.0000,
  radius: 5000, // meters
}
```

### Customizing Rate Limits

In the scraper config:

```typescript
requestsPerSecond: 5,  // Increase for faster scraping
maxRetries: 3,         // Number of retry attempts
retryDelayMs: 1000,    // Base delay between retries
```

---

## File Structure

```
scripts/
  google-maps-scraper.ts  # Main Google Maps scraper
  flights-scraper.ts      # Flight routes scraper
  scraper-types.ts        # TypeScript type definitions
  README-SCRAPER.md       # This file

data/
  scraped-places/         # Google Maps output
    scraped-places.json
    google-maps-knowledge.ts
    google-maps-knowledge.json
  flights/                # Flights output
    flights-knowledge.ts
    flights-knowledge.json
    flights-raw-data.json
  scraper-cache/          # Progress and logs
    progress.json
    stats.json
    scraper.log
```

---

## License

Internal use only. Google Places data is subject to [Google's Terms of Service](https://cloud.google.com/maps-platform/terms).
