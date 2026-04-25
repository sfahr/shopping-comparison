import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchHtml, parseMoney, truncate } from "@/lib/scrapeUtils";
import type { RawOffer, ScrapeRequest } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const body: ScrapeRequest = await req.json();
  const { query, priceCeiling } = body;

  const tokens = encodeURIComponent(query).replace(/%20/g, "+");
  const url = `https://geizhals.de/?cat=subcat&xf=15386_${tokens}&sort=price`;

  const html = await fetchHtml(url, { Referer: "https://geizhals.de/" });
  if (!html) {
    return NextResponse.json({ site: "geizhals.de", offers: [], error: "Nicht erreichbar" });
  }

  if (html.includes("captcha") || html.includes("Something has gone wrong")) {
    return NextResponse.json({ site: "geizhals.de", offers: [], error: "Blockiert" });
  }

  const $ = cheerio.load(html);
  const offers: RawOffer[] = [];

  $(".productlist__item, article.listitem").each((_i, el) => {
    if (offers.length >= 3) return false;

    const title = truncate(
      $(el).find(".productlist__title a, .listitem__title").first().text().trim()
    );
    if (!title) return;

    const priceRaw = $(el).find(".productlist__price, .price--best").first().text().trim();
    const price = parseMoney(priceRaw);
    if (!price || price < 1) return;
    if (priceCeiling && price > priceCeiling) return;

    const merchant = truncate($(el).find(".productlist__merchant, .merchant").first().text().trim() || "Händler", 40);
    const href = $(el).find("a[href]").first().attr("href") ?? "";
    const itemUrl = href.startsWith("http") ? href : `https://geizhals.de${href}`;
    const imageUrl = $(el).find("img").attr("src") ?? "";

    offers.push({
      title,
      site: "geizhals.de",
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

  return NextResponse.json({ site: "geizhals.de", offers });
}
