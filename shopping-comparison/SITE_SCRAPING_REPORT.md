# Site Scraping Status Report

**Last verified:** 2026-04-27 (live test against the dev server)

## Results Summary

| Site | Status | Top results | Notes |
|------|--------|-------------|-------|
| Amazon.de   | ✅ Working | 3 | `data-asin` cards, EUR price, ASIN-based URL |
| eBay.de     | ✅ Working | 3 | Uses `li.s-card` family. First placeholder card ("Shop on eBay") is filtered out via the `ebay.de/itm/` URL check |
| Kleinanzeigen.de | ✅ Working | 3 | PLZ + radius URL form; PLZ geocoded to lat/lng for distance + map |
| Vinted.de   | ✅ Working | 3 | Server-side rendered cards under `.feed-grid__item` with `[data-testid$="--…"]` sub-fields. Price is the inkl-Käuferschutz total |

All four sites currently return 3 real listings each for sample query "airpods pro 2".

## Selector reference (stable as of 2026-04-27)

### eBay (`app/api/ebay/route.ts`)
- Container: `li.s-card`
- Title: `.s-card__title` — strip `Wird in neuem Fenster oder Tab geöffnet`
- Price: `.s-card__price`
- Subtitle (condition + Privat/Gewerblich): `.s-card__subtitle` (e.g. `Gebraucht | Privat`)
- Seller name + rating: `.su-card-container__attributes__secondary` (parsed via `^(\S+)\s+\d+%\s*positiv` regex)
- Link filter: only accept hrefs containing `ebay.de/itm/`

### Vinted (`app/api/vinted/route.ts`)
- Container: `.feed-grid__item`
- Title: `[data-testid$="--description-title"]`
- Subtitle / condition: `[data-testid$="--description-subtitle"]` (`Neu` / `Sehr gut` / `Gut` / …)
- Listing URL: `[data-testid$="--overlay-link"]` href
- Image: `[data-testid$="--image--img"]` src
- Price: max of `.web_ui__Text__caption`, `.web_ui__Text__subtitle`, `.title-content` text (uses inkl-Käuferschutz total)

The earlier JSON-LD / `__NEXT_DATA__` fallback was removed because Vinted does not embed listing data in those scripts on the public catalog page.

## Notes for future maintenance
- Both eBay and Vinted have changed their HTML structure several times in 2025-2026. If results suddenly drop to zero, run a quick Cheerio probe against the live HTML before assuming the site is blocked — the more likely cause is class-name churn.
- `fetchHtml` uses an 8-second `AbortSignal.timeout`; Vinted's catalog page is ~8 MB, so on slow connections the timeout may need to be raised.
