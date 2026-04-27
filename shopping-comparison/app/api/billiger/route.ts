import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchHtml, parseMoney, truncate } from "@/lib/scrapeUtils";
import type { RawOffer, ScrapeRequest } from "@/lib/types";

export const maxDuration = 15;

// billiger.de's search form uses `searchstring` as the query param (not `q`).
// Each result tile carries a wishlist button with `data-price="56900"` in cents,
// which we prefer over the visible "ab 569,00 €" text since it parses cleanly.
export async function POST(req: NextRequest) {
  const body: ScrapeRequest = await req.json();
  const { query, priceFloor, priceCeiling } = body;

  const url = `https://www.billiger.de/search?searchstring=${encodeURIComponent(query)}`;

  const html = await fetchHtml(url, { Referer: "https://www.billiger.de/" });
  if (!html) {
    return NextResponse.json({ site: "billiger.de", offers: [], error: "Nicht erreichbar" });
  }

  const $ = cheerio.load(html);
  const offers: RawOffer[] = [];

  $("[data-test-item-view-tile]").each((_i, el) => {
    if (offers.length >= 5) return false;

    // billiger uses /baseproducts/ for aggregator pages and /products/ for
    // direct-product pages — accept either.
    const link = $(el)
      .find('a[href*="/baseproducts/"], a[href*="/products/"]')
      .first();
    const href = link.attr("href") ?? "";
    if (!href) return;
    const itemUrl = href.startsWith("http") ? href : `https://www.billiger.de${href}`;

    const title = truncate(
      link.attr("title")?.trim() ||
        link.find(".line-clamp-2").first().text().trim() ||
        link.text().trim()
    );
    if (!title) return;

    const wishBtn = $(el).find("button[data-wishlist-button]").first();
    const priceCents = parseInt(wishBtn.attr("data-price") ?? "", 10);
    let price: number | null = Number.isFinite(priceCents) && priceCents > 0 ? priceCents / 100 : null;
    if (price == null) {
      const priceText = $(el).find("strong[data-price]").first().text().trim();
      price = parseMoney(priceText);
    }
    if (!price || price < 1) return;
    if (priceFloor && price < priceFloor) return;
    if (priceCeiling && price > priceCeiling) return;

    const compareText = $(el).text().match(/([\d.]+)\s*Preise\s*vergleichen/i);
    const seller = compareText
      ? truncate(`billiger.de (${compareText[1]} Preise)`, 40)
      : "billiger.de (Preisvergleich)";

    const ratingMatch = $(el).find(".svg-rating-stars").first().attr("style")?.match(/--rating:\s*(\d+)/);
    const rating = ratingMatch ? `★ ${(parseInt(ratingMatch[1], 10) / 20).toFixed(1)}` : undefined;

    const imageUrl =
      $(el).find("img[data-bde-image]").first().attr("src") ??
      $(el).find("img").first().attr("src") ??
      "";

    offers.push({
      title,
      site: "billiger.de",
      seller,
      condition: "Neu",
      price,
      shipping: "Versand laut Händler",
      delivery: "ab-Preis (Preisvergleich)",
      url: itemUrl,
      imageUrl,
      isOnline: true,
      sellerType: "gewerblich",
      rating,
    });
  });

  return NextResponse.json({ site: "billiger.de", offers });
}
