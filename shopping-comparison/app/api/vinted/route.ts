import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchHtml, parseMoney, truncate } from "@/lib/scrapeUtils";
import type { RawOffer, ScrapeRequest } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const body: ScrapeRequest = await req.json();
  const { query, priceCeiling } = body;

  const url = `https://www.vinted.de/catalog?search_text=${encodeURIComponent(query)}&order=relevance`;

  const html = await fetchHtml(url, {
    Referer: "https://www.vinted.de/",
    Cookie: "anon_id=1",
  });
  if (!html) {
    return NextResponse.json({ site: "vinted.de", offers: [], error: "Nicht erreichbar" });
  }

  if (html.includes("captcha") || html.includes("Access Denied")) {
    return NextResponse.json({ site: "vinted.de", offers: [], error: "Blockiert" });
  }

  const $ = cheerio.load(html);
  const offers: RawOffer[] = [];

  // Vinted embeds item data in JSON-LD or __NEXT_DATA__
  let parsed = false;
  $("script[type='application/json'], script#__NEXT_DATA__").each((_i, el) => {
    if (parsed || offers.length >= 3) return;
    try {
      const data = JSON.parse($(el).html() ?? "{}");
      const items = data?.props?.pageProps?.items ?? data?.items ?? [];
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (offers.length >= 3) break;
        const price = parseFloat(item.price?.amount ?? item.price ?? 0);
        if (!price || price < 1) continue;
        if (priceCeiling && price > priceCeiling) continue;
        const title = truncate(item.title ?? item.name ?? "");
        if (!title) continue;
        offers.push({
          title,
          site: "vinted.de",
          seller: truncate(item.user?.login ?? "Vinted-Verkäufer", 40),
          condition: "Gebraucht",
          price,
          shipping: "inkl. Versand + Käuferschutz",
          delivery: "Versand möglich",
          url: item.url ?? `https://www.vinted.de/items/${item.id}`,
          imageUrl: item.photo?.url ?? item.photos?.[0]?.url ?? "",
          isOnline: true,
          sellerType: "privat",
          sellerCountry: item.user?.country_iso_code ?? "DE",
        });
      }
      if (offers.length > 0) parsed = true;
    } catch { /* ignore */ }
  });

  // Fallback: try HTML grid selectors
  if (!parsed) {
    $(".feed-grid__item, [data-testid='grid-item']").each((_i, el) => {
      if (offers.length >= 3) return false;
      const title = truncate($(el).find("[class*='title'], img").first().attr("alt") ?? "");
      if (!title) return;
      const priceRaw = $(el).find("[class*='price']").first().text().trim();
      const price = parseMoney(priceRaw);
      if (!price || price < 1) return;
      if (priceCeiling && price > priceCeiling) return;
      const href = $(el).find("a[href]").first().attr("href") ?? "";
      const itemUrl = href.startsWith("http") ? href : `https://www.vinted.de${href}`;
      offers.push({
        title,
        site: "vinted.de",
        seller: "Vinted-Verkäufer",
        condition: "Gebraucht",
        price,
        shipping: "inkl. Versand + Käuferschutz",
        delivery: "Versand möglich",
        url: itemUrl,
        isOnline: true,
        sellerType: "privat",
        sellerCountry: "DE",
      });
    });
  }

  return NextResponse.json({ site: "vinted.de", offers });
}
