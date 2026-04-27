import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchHtml, parseMoney, truncate } from "@/lib/scrapeUtils";
import type { RawOffer, ScrapeRequest } from "@/lib/types";

export const maxDuration = 15;

// Geizhals.de fronts a Cloudflare managed challenge that blocks server-side
// fetches; geizhals.at is the same backend but reachable directly. We pass
// hloc=de so the listed "ab" price reflects merchants that ship to Germany.
export async function POST(req: NextRequest) {
  const body: ScrapeRequest = await req.json();
  const { query, priceFloor, priceCeiling } = body;

  const url = `https://geizhals.at/?fs=${encodeURIComponent(query)}&hloc=de`;

  const html = await fetchHtml(url, { Referer: "https://geizhals.at/" });
  if (!html) {
    return NextResponse.json({ site: "geizhals.de", offers: [], error: "Nicht erreichbar" });
  }

  if (html.includes("Sichere Verbindung wird überprüft") || html.includes("challenge-form")) {
    return NextResponse.json({ site: "geizhals.de", offers: [], error: "Cloudflare-Challenge" });
  }

  const $ = cheerio.load(html);
  const offers: RawOffer[] = [];

  $("article.galleryview__item").each((_i, el) => {
    if (offers.length >= 5) return false;

    const link = $(el).find("a.galleryview__name-link").first();
    const title = truncate(link.text().trim());
    const itemUrl = link.attr("href") ?? "";
    if (!title || !itemUrl) return;

    const priceRaw = $(el).find(".galleryview__price .price").first().text().trim();
    const price = parseMoney(priceRaw);
    if (!price || price < 1) return;
    if (priceFloor && price < priceFloor) return;
    if (priceCeiling && price > priceCeiling) return;

    const offerCount = $(el).find(".galleryview__offercount-link").first().text().trim();
    const ratingLabel = $(el).find(".stars-rating-label").first().text().trim();
    const ratingCount = $(el).find(".stars-rating-label-bottom").first().text().trim();
    const rating = ratingLabel ? `★ ${ratingLabel}${ratingCount ? ` (${ratingCount})` : ""}` : undefined;

    const imageUrl = $(el).find("img.galleryview__image").first().attr("src") ?? "";

    const seller = offerCount
      ? truncate(`Geizhals (${offerCount})`, 40)
      : "Geizhals (Preisvergleich)";

    offers.push({
      title,
      site: "geizhals.de",
      seller,
      condition: "Neu",
      price,
      shipping: "Versand laut Händler",
      delivery: "ab-Preis (DE-Versand)",
      url: itemUrl,
      imageUrl,
      isOnline: true,
      sellerType: "gewerblich",
      rating,
    });
  });

  return NextResponse.json({ site: "geizhals.de", offers });
}
