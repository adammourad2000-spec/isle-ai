# 🏗️ Property System - Architecture Overview

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ISLE AI CHATBOT                          │
│                     (ChatbotPanel.tsx)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │  usePropertySuggestions │  ← React Hook
            │        (Hook)           │     - Stealth Marketing Logic
            └────────┬───────────────┘     - Timing Control (10 msgs)
                     │                     - Session Management
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌──────────┐
   │ Analyze │  │ Timing  │  │ Analytics│
   │ Context │  │ Control │  │ Tracking │
   └─────────┘  └─────────┘  └──────────┘
        │
        ▼
┌──────────────────────────┐
│   propertyService.ts     │  ← AI Search Service
│                          │
│  • OpenAI Web Search     │
│  • Preference Extraction │
│  • Smart Scoring         │
│  • Caching Strategy      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│     Real Estate Data Sources         │
│                                      │
│  LUXURY (5 sources)                  │
│  ├─ Sotheby's International Realty  │
│  ├─ Engel & Völkers                 │
│  ├─ Provenance Properties           │
│  ├─ Coldwell Banker                 │
│  └─ ERA Cayman Islands              │
│                                      │
│  MID-LEVEL (5 sources)               │
│  ├─ Cayman Property Centre          │
│  ├─ Cayman Real Estate              │
│  ├─ Property Cayman                 │
│  ├─ CaribPro Realty                 │
│  └─ Williams2 Real Estate           │
│                                      │
│  VACATION RENTALS (2 sources)        │
│  ├─ Airbnb Cayman Islands           │
│  └─ VRBO Cayman Islands             │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Property Recommendation │
│  (PropertyRecommendation)│
│                          │
│  • Property Object       │
│  • Relevance Score       │
│  • Reason                │
│  • Matched Criteria      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  PropertySuggestionBanner    │  ← Display Component
│  (Stealth Marketing UI)      │
│                              │
│  • Compact View              │
│  • Expandable Details        │
│  • Interest Buttons          │
│  • Dismiss Option            │
└────────┬─────────────────────┘
         │
         ▼ (on expand)
┌──────────────────────────────┐
│      PropertyCard            │  ← Full Display
│  (Detailed Property View)    │
│                              │
│  • Image Gallery             │
│  • Feature Grid              │
│  • Google Maps Integration   │
│  • Agent Contact Info        │
│  • Interest Tracking         │
└──────────────────────────────┘
```

---

## 🔄 Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    USER INTERACTION                          │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    User sends message
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              CHAT MESSAGE PROCESSING                         │
│  1. Message added to chat history                            │
│  2. Message count incremented                                │
│  3. Context analysis triggered                               │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
                   Every 10th message?
                       /          \
                     NO            YES
                     │              │
                     ▼              ▼
              Continue Chat    Extract Preferences
                               (type, location, price, etc.)
                                     │
                                     ▼
                            Search Properties
                          (OpenAI + Web Search)
                                     │
                                     ▼
                              Score & Rank
                            Properties by relevance
                                     │
                                     ▼
                          Select Top Recommendation
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────┐
│              DISPLAY SUGGESTION                              │
│  PropertySuggestionBanner appears in chat                    │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    User interacts
                       /        \
                      /          \
         "I'm Interested"    "Not Now"
                   │              │
                   ▼              ▼
          Track Interest     Dismiss & Continue
          Save to Storage
          Notify Agent
          Show Confirmation
```

---

## 🎯 Component Hierarchy

```
ChatbotPanel
│
├─ SidebarNav
│  └─ Navigation Tabs
│
├─ ChatFiltersBar
│  └─ Filter Controls
│
├─ Messages Container
│  │
│  ├─ Message 1 (User)
│  ├─ Message 2 (Assistant)
│  ├─ Message 3 (User)
│  │   ...
│  ├─ Message 10 (Assistant)
│  │
│  └─ PropertySuggestionBanner ← Appears here!
│     │
│     ├─ Compact View (Default)
│     │  ├─ Property Image
│     │  ├─ Title & Location
│     │  ├─ Key Features
│     │  ├─ Price
│     │  └─ Quick Stats
│     │
│     └─ Expanded View (On Click)
│        └─ PropertyCard
│           ├─ Image Gallery
│           │  ├─ Image Carousel
│           │  ├─ Navigation Arrows
│           │  └─ Image Indicators
│           │
│           ├─ Property Info
│           │  ├─ Title & Price
│           │  ├─ Location
│           │  ├─ Category Badge
│           │  └─ Feature Badges
│           │
│           ├─ Features Grid
│           │  ├─ Bedrooms
│           │  ├─ Bathrooms
│           │  ├─ Square Feet
│           │  └─ Parking
│           │
│           ├─ Description
│           ├─ Amenities List
│           ├─ Google Map
│           ├─ Agent Info
│           │
│           └─ Action Buttons
│              ├─ "I'm Interested"
│              ├─ "Not Now"
│              └─ "View on Website"
│
└─ Input Area
   ├─ Text Input
   └─ Send Button
```

---

## 🔐 Security & Privacy Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    USER INTERACTION                          │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                  FRONTEND SECURITY                           │
│  • No personal data stored by default                        │
│  • Anonymous session IDs                                     │
│  • LocalStorage encryption                                   │
│  • HTTPS only                                                │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                  API SECURITY                                │
│  • Rate limiting (OpenAI API)                                │
│  • API key env variables                                     │
│  • Request validation                                        │
│  • Error sanitization                                        │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                  DATA STORAGE                                │
│  Frontend (localStorage):                                    │
│  • Session ID                                                │
│  • Property interests (anonymized)                           │
│  • Timestamps                                                │
│                                                              │
│  Backend (optional):                                         │
│  • Aggregated analytics                                      │
│  • No PII without consent                                    │
│  • GDPR compliant                                            │
└──────────────────────────────────────────────────────────────┘
```

---

## ⚡ Performance Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                 PERFORMANCE LAYERS                           │
└──────────────────────────────────────────────────────────────┘

LAYER 1: CACHING
┌────────────────────────────────────┐
│  In-Memory Cache (1 hour TTL)     │
│  • Property search results         │
│  • Scored recommendations          │
│  • Preference analysis             │
└────────────────────────────────────┘

LAYER 2: LAZY LOADING
┌────────────────────────────────────┐
│  React.lazy + Suspense             │
│  • PropertyCard component          │
│  • Image lazy loading              │
│  • Google Maps on-demand           │
└────────────────────────────────────┘

LAYER 3: OPTIMIZATION
┌────────────────────────────────────┐
│  Code Splitting                    │
│  • Property types                  │
│  • Service modules                 │
│  • UI components                   │
└────────────────────────────────────┘

LAYER 4: FALLBACK
┌────────────────────────────────────┐
│  Graceful Degradation              │
│  • Pre-loaded demo properties      │
│  • Offline mode support            │
│  • Error boundaries                │
└────────────────────────────────────┘
```

---

## 📊 Analytics Flow

```
User Interaction
      │
      ▼
┌─────────────────┐
│ Frontend Event  │
│  - Property view│
│  - Interest     │
│  - Dismiss      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  localStorage   │
│  • Immediate    │
│  • Client-side  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend API    │
│  (optional)     │
│  • Async send   │
│  • Aggregation  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Analytics DB    │
│  • Dashboards   │
│  • Insights     │
│  • Reports      │
└─────────────────┘
```

---

## 🎨 UI/UX States

```
┌──────────────────────────────────────────────────────────────┐
│                     UI STATE MACHINE                         │
└──────────────────────────────────────────────────────────────┘

INITIAL STATE
│
├─ Chatting (< 10 messages)
│  └─ No suggestion shown
│
└─ Suggestion Trigger (10th message)
   │
   ├─ Loading State
   │  └─ Fetching properties...
   │     │
   │     ├─ Success → Show Suggestion
   │     └─ Error → Fallback Properties
   │
   └─ Suggestion Shown (Compact)
      │
      ├─ User Expands
      │  └─ Show Full PropertyCard
      │     │
      │     ├─ User Interested
      │     │  └─ Track Interest
      │     │     └─ Show Confirmation
      │     │
      │     └─ User Not Interested
      │        └─ Track Dismissal
      │           └─ Continue Chat
      │
      └─ User Dismisses
         └─ Hide Suggestion
            └─ Wait for next interval
```

---

## 🔄 Integration Points

```
┌──────────────────────────────────────────────────────────────┐
│                   EXTERNAL INTEGRATIONS                      │
└──────────────────────────────────────────────────────────────┘

1. OpenAI API
   ├─ Chat Completions
   ├─ Web Search (via GPT-4)
   └─ Context Analysis

2. Google Maps API
   ├─ Embed API
   ├─ Places API
   └─ Geocoding API

3. Real Estate Sources (12+)
   ├─ Web Search Results
   ├─ Property Data
   └─ Agent Information

4. Backend API (Optional)
   ├─ POST /api/analytics/property-interest
   ├─ GET /api/properties/search
   └─ POST /api/properties/contact-agent

5. localStorage
   ├─ Session Management
   ├─ Interest Tracking
   └─ Cache Storage
```

---

## 🎯 Smart Targeting Logic

```
┌──────────────────────────────────────────────────────────────┐
│               PREFERENCE EXTRACTION                          │
└──────────────────────────────────────────────────────────────┘

User Message: "I'm looking for a beachfront villa with 4 bedrooms"
                            │
                            ▼
                  NLP Analysis (OpenAI)
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   Property Type       Location             Features
   - villa            - beachfront         - 4 bedrooms
                                           - luxury implied
                            │
                            ▼
                    Build Search Query
                            │
                            ▼
    {
      type: ['villa'],
      category: ['luxury'],
      beachfront: true,
      minBedrooms: 4,
      district: ['Seven Mile Beach', 'Rum Point']
    }
                            │
                            ▼
                    Search & Score
                            │
                            ▼
                 Top Recommendation
```

---

## 🚀 Deployment Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    PRODUCTION SETUP                          │
└──────────────────────────────────────────────────────────────┘

FRONTEND (Vercel / Netlify)
├─ Static Assets
│  ├─ React Bundle
│  ├─ Property Components
│  └─ Images (CDN)
│
├─ Environment Variables
│  ├─ VITE_OPENAI_API_KEY
│  └─ VITE_GOOGLE_MAPS_API_KEY
│
└─ Build Configuration
   ├─ Code Splitting
   ├─ Tree Shaking
   └─ Minification

BACKEND (Optional - Railway / Render)
├─ Node.js API
│  └─ /api/analytics/*
│
├─ Database
│  └─ PostgreSQL
│
└─ Cron Jobs
   └─ Property data sync

CDN (Cloudflare / CloudFront)
├─ Static Assets
├─ Images
└─ API Caching
```

---

## 📐 Type System

```typescript
┌──────────────────────────────────────────────────────────────┐
│                    TYPE HIERARCHY                            │
└──────────────────────────────────────────────────────────────┘

Property                          // Main property object
├─ PropertyType                   // villa | condo | apartment...
├─ PropertyStatus                 // for-sale | for-rent
├─ PropertyCategory               // luxury | mid-level
├─ PropertyLocation               // Address + coordinates
│  ├─ address: string
│  ├─ district: string
│  └─ coordinates: {lat, lng}
├─ PropertyFeatures               // Bedrooms, pool, etc.
│  ├─ bedrooms: number
│  ├─ bathrooms: number
│  ├─ squareFeet: number
│  ├─ pool: boolean
│  └─ amenities: string[]
├─ PropertyFinancials             // Price, fees
│  ├─ price: number
│  └─ currency: string
├─ PropertyMedia                  // Images, videos
│  ├─ mainImage: string
│  └─ images: string[]
└─ PropertyAgent                  // Contact info
   ├─ name: string
   ├─ company: string
   └─ phone: string

PropertyRecommendation            // AI suggestion
├─ property: Property
├─ relevanceScore: number
├─ reason: string
└─ matchedCriteria: string[]

UserPropertyInterest              // Analytics
├─ propertyId: string
├─ sessionId: string
├─ interested: boolean
└─ timestamp: string
```

---

## 🎯 Success Metrics

```
┌──────────────────────────────────────────────────────────────┐
│                    KPI TRACKING                              │
└──────────────────────────────────────────────────────────────┘

ENGAGEMENT METRICS
├─ Suggestion Display Rate: 100% (every 10 messages)
├─ Expansion Rate: Target 60-70%
├─ Interest Rate: Target 15-25%
└─ Dismissal Rate: Target 30-40%

PERFORMANCE METRICS
├─ Time to Suggestion: < 2 seconds
├─ API Response Time: < 500ms
├─ Cache Hit Rate: > 80%
└─ Error Rate: < 1%

BUSINESS METRICS
├─ Leads Generated: Track per session
├─ Agent Contacts: Track conversions
├─ Property Views: Track engagement
└─ Session Duration: +50% increase expected
```

---

## 🛠️ Development Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                 DEVELOPMENT PROCESS                          │
└──────────────────────────────────────────────────────────────┘

1. SETUP
   npm install
   Configure .env (OpenAI API key)

2. DEVELOPMENT
   npm run dev
   Test with localhost:3002

3. INTEGRATION
   Copy example code
   Add to ChatbotPanel
   Test suggestions

4. TESTING
   Manual testing (10 messages)
   Check analytics tracking
   Verify fallback mode

5. OPTIMIZATION
   Check bundle size
   Optimize images
   Test performance

6. DEPLOYMENT
   npm run build
   Deploy to Vercel/Netlify
   Monitor analytics
```

---

**Architecture designed for:**
- 🚀 Performance
- 🔒 Security
- 📈 Scalability
- 🎨 User Experience
- 📊 Data-Driven Decisions

**Built by:** Adam Mourad & Claude Sonnet 4.5
**Date:** February 2, 2026
**Version:** 1.0.0
