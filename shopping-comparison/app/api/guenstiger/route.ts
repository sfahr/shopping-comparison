import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchHtml, parseMoney, truncate } from "@/lib/scrapeUtils";
import type { RawOffer, ScrapeRequest } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const body: ScrapeRequest = await req.json();
  const { query, priceCeiling } = body;

  const url = `https://www.guenstiger.de/search_products.php?categoryId=0&q=${encodeURIComponent(query)}`;

  const html = await fetchHtml(url, { Referer: "https://www.guenstiger.de/" });
  if (!html) {
    return NextResponse.json({ site: "guenstiger.de", offers: [], error: "Nicht erreichbar" });
  }

  const $ = cheerio.load(html);
  const offers: RawOffer[] = [];

  $(".product, .product-item, [class*='product']").each((_i, el) => {
    if (offers.length >= 3) return false;

    const title = truncate(
      $(el).find("h2, h3, .product-title, [class*='title']").first().text().trim()
    );
    if (!title || title.length < 4) return;

    const priceRaw = $(el).find("[class*='price'], .preis").first().text().trim();
    const price = parseMoney(priceRaw);
    if (!price || price < 1) return;
    if (priceCeiling && price > priceCeiling) return;

    const merchant = truncate(
      $(el).find("[class*='merchant'], [class*='shop'], [class*='anbieter']").first().text().trim() || "Händler",
      40
    );
    const href = $(el).find("a[href]").first().attr("href") ?? "";
    const itemUrl = href.startsWith("http") ? href : `https://www.guenstiger.de${href}`;
    const imageUrl = $(el).find("img").attr("src") ?? "";

    offers.push({
      title,
      site: "guenstiger.de",
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

  return NextResponse.json({ site: "guenstiger.de", offers });
}
