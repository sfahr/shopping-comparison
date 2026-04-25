import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchHtml, parseMoney, truncate } from "@/lib/scrapeUtils";
import type { RawOffer, ScrapeRequest } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const body: ScrapeRequest = await req.json();
  const { query, priceCeiling } = body;

  const url = `https://www.billiger.de/search?q=${encodeURIComponent(query)}&sort=price`;

  const html = await fetchHtml(url, { Referer: "https://www.billiger.de/" });
  if (!html) {
    return NextResponse.json({ site: "billiger.de", offers: [], error: "Nicht erreichbar" });
  }

  const $ = cheerio.load(html);
  const offers: RawOffer[] = [];

  $("[class*='product'], [class*='item'], li[data-product-id]").each((_i, el) => {
    if (offers.length >= 3) return false;

    const title = truncate(
      $(el).find("h2, h3, [class*='title'], a[title]").first().text().trim() ||
      $(el).find("a").first().attr("title") || ""
    );
    if (!title || title.length < 4) return;

    const priceRaw = $(el).find("[class*='price'], .preis, [data-price]").first().text().trim();
    const price = parseMoney(priceRaw);
    if (!price || price < 1) return;
    if (priceCeiling && price > priceCeiling) return;

    const merchant = truncate(
      $(el).find("[class*='merchant'], [class*='shop'], [class*='seller']").first().text().trim() || "Händler",
      40
    );
    const href = $(el).find("a[href]").first().attr("href") ?? "";
    const itemUrl = href.startsWith("http") ? href : `https://www.billiger.de${href}`;
    const imageUrl = $(el).find("img").attr("src") ?? "";

    offers.push({
      title,
      site: "billiger.de",
      seller: merchant,
      condition: "Neu",
      price,
      shipping: "inkl. Versand",
      delivery: "Versand möglich",
      url: itemUrl,
      imageUrl,
      isOnline: true,
      sellerType: "gewerblich",
    });
  });

  return NextResponse.json({ site: "billiger.de", offers });
}
