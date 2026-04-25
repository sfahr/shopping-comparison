import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchHtml, parseMoney, truncate } from "@/lib/scrapeUtils";
import type { RawOffer, ScrapeRequest } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const body: ScrapeRequest = await req.json();
  const { query, priceCeiling } = body;

  const url = `https://www.check24.de/p/?q=${encodeURIComponent(query)}&sort=price`;

  const html = await fetchHtml(url, { Referer: "https://www.check24.de/" });
  if (!html) {
    return NextResponse.json({ site: "check24.de", offers: [], error: "Nicht erreichbar" });
  }

  if (html.includes("captcha") || html.includes("Access Denied")) {
    return NextResponse.json({ site: "check24.de", offers: [], error: "Blockiert" });
  }

  const $ = cheerio.load(html);
  const offers: RawOffer[] = [];

  $("[class*='product'], [data-product], li[role='presentation']").each((_i, el) => {
    if (offers.length >= 3) return false;

    const title = truncate(
      $(el).find("h2, h3, [class*='title'], a").first().text().trim()
    );
    if (!title || title.length < 4) return;

    const priceRaw = $(el).find("[class*='price'], .preis, [data-price]").first().text().trim();
    const price = parseMoney(priceRaw);
    if (!price || price < 1) return;
    if (priceCeiling && price > priceCeiling) return;

    const merchant = truncate($(el).find("[class*='merchant'], [class*='shop']").first().text().trim() || "Händler", 40);
    const href = $(el).find("a[href]").first().attr("href") ?? "";
    const itemUrl = href.startsWith("http") ? href : `https://www.check24.de${href}`;
    const imageUrl = $(el).find("img").attr("src") ?? "";

    offers.push({
      title,
      site: "check24.de",
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

  return NextResponse.json({ site: "check24.de", offers });
}
