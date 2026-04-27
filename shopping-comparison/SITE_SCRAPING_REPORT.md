# Site Scraping Status Report

**Date:** 2026-04-27  
**Testing:** Direct API endpoint testing with query "laptop"

## Results Summary

| Site | Status | Offers | Notes |
|------|--------|--------|-------|
| Amazon.de | ✅ **WORKING** | 3 | Fetching and parsing correctly |
| eBay.de | ❌ **BROKEN** | 0 | Server redirect + HTML structure mismatch |
| Kleinanzeigen.de | ✅ **WORKING** | 3 | Fetching and parsing correctly |
| Vinted.de | ❌ **BROKEN** | 0 | JSON-LD parsing not matching response structure |

---

## Detailed Issues

### 1. eBay.de — Server Redirect + HTML Structure Mismatch

**Problem:**
- `ebay.de/sch/i.html?...` redirects to `ebay.com` (English site)
- The HTML returned is completely different from the German site
- Selectors like `.s-item`, `.s-item__title` don't exist in the redirected page
- The page structure uses completely different CSS classes

**Root Cause:**
- eBay detects the request as coming from outside Germany (or doesn't recognize it as DE)
- Server-side geolocation/locale routing is redirecting to the US site
- This is likely a result of missing/wrong headers or cookies

**Solution Options:**

**Option A (Recommended):** Add locale-specific headers
```typescript
// In app/api/ebay/route.ts, add:
const extraHeaders = {
  "Accept-Language": "de-DE,de;q=0.9",
  "Referer": "https://www.ebay.de",
  "Cookie": "ebay_locale=de"
};
```

**Option B:** Use a different eBay endpoint
- Switch to `ebay.de` API if available (requires authentication)
- Use a different marketplace that works (e.g., eBay.co.uk)

**Option C:** Remove eBay entirely
- If Option A fails consistently, disable eBay scraping for now
- Replace with alternative marketplace

---

### 2. Vinted.de — JSON-LD Parsing Fails

**Problem:**
- Page is being fetched (HTML contains "items" text)
- But the JSON-LD/`__NEXT_DATA__` parsing isn't extracting offers
- Response returns 0 items

**Root Cause (likely):**
- Vinted uses dynamic JavaScript rendering (Next.js client-side app)
- The JSON data may not be embedded in the initial HTML response
- Or the script selector `script[type='application/json']` is matching wrong elements
- Cheerio can't parse deeply nested JSON structures correctly

**Solution Options:**

**Option A (Best):** Switch to HTML fallback selectors
- The fallback `.feed-grid__item` selector already exists
- Need to debug why it's not matching either

**Option B:** Use browser automation
- Puppeteer or Playwright instead of Cheerio
- More reliable but slower and resource-intensive

**Option C:** Use Vinted's unofficial API
- Vinted client makes API calls to `https://api.vinted.com/`
- More reliable than scraping

---

## Next Steps

### Immediate (Quick Fixes)

1. **Fix eBay** by adding proper locale headers (5 min)
2. **Fix Vinted** by debugging HTML fallback selectors (10 min)

### Testing Plan

```bash
# Test each endpoint
curl -X POST http://localhost:3000/api/ebay \
  -H "Content-Type: application/json" \
  -d '{"query":"laptop","condition":"either"}'

curl -X POST http://localhost:3000/api/vinted \
  -H "Content-Type: application/json" \
  -d '{"query":"laptop","condition":"either"}'
```

### Code Changes Needed

**File:** `app/api/ebay/route.ts`
- Add `Referer` and `Accept-Language` headers in `fetchHtml()` call

**File:** `app/api/vinted/route.ts`
- Debug why `.feed-grid__item` selector isn't matching
- Check if page structure changed to use different classes
- May need to inspect the actual returned HTML

---

## Root Cause Analysis

Both eBay and Vinted use **client-side JavaScript rendering** (Next.js/React applications), which means:
- HTML content is NOT in the initial HTTP response
- Cheerio (static HTML parser) cannot extract the data
- Only a headless browser (Puppeteer/Playwright) can render the JS and access the content

Headers and Referer tricks won't help because the issue is **structural**, not authentication.

## Permanent Solutions (in priority order)

### Solution 1: Browser Automation (Recommended for production)
Use Puppeteer or Playwright to render pages before scraping:

```typescript
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto(url);
const html = await page.content();
// Now parse with Cheerio
```

**Pros:** Works with any JavaScript-rendered site  
**Cons:** Slower, requires more resources, needs Docker support on Render

### Solution 2: Official APIs
- **eBay:** Use eBay Finding API (requires API key) or OAuth flow
- **Vinted:** Use Vinted's unofficial API (`https://api.vinted.com/`)

**Pros:** Faster, more reliable, official data  
**Cons:** eBay requires authentication, Vinted API may change

### Solution 3: Alternative Marketplaces
- Replace eBay with another German marketplace (e.g., eBay.fr, Ricardo.ch)
- Keep Vinted as-is or replace with similar marketplace

**Pros:** Quick fix  
**Cons:** Different product coverage

## Current Status

- ✅ Amazon: Working
- ✅ Kleinanzeigen: Working
- ❌ eBay: Blocked (JavaScript rendering required)
- ❌ Vinted: Blocked (JavaScript rendering required)

## Immediate Workaround

For now, the app gracefully handles 0 results from eBay/Vinted. Users still get results from Amazon and Kleinanzeigen.

## Recommended Next Step

Implement Puppeteer for eBay + Vinted. This requires:
1. Install `puppeteer` package
2. Create wrapper function with caching to minimize resource usage
3. Update both API routes to use browser-based scraping
4. Test on Render (may need higher tier for resource limits)

Estimated effort: 2-3 hours including testing
