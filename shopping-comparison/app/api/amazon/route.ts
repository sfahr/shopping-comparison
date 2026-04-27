import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchHtml, parseMoney, truncate } from "@/lib/scrapeUtils";
import type { RawOffer, ScrapeRequest } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const body: ScrapeRequest = await req.json();
  const { query, condition, priceFloor, priceCeiling } = body;

  const condParam = condition === "new" ? "&s-ref-marker=aps_new"
    : condition === "used" ? "&s-ref-marker=aps_used" : "";
  const url = `https://www.amazon.de/s?k=${encodeURIComponent(query)}&language=de_DE${condParam}`;

  const html = await fetchHtml(url);
  if (!html) {
    return NextResponse.json({ site: "amazon.de", offers: [], error: "Nicht erreichbar oder blockiert" });
  }

  if (html.includes("captcha") || html.includes("Robot Check")) {
    return NextResponse.json({ site: "amazon.de", offers: [], error: "CAPTCHA erkannt" });
  }

  const $ = cheerio.load(html);
  const offers: RawOffer[] = [];

  $('[data-asin]').each((_i, el) => {
    if (offers.length >= 5) return false;
    const asin = $(el).attr("data-asin");
    if (!asin || asin.length < 5) return;

    const title = truncate(
      $(el).find("h2 span, h2 a span").first().text().trim()
    );
    if (!title) return;

    const priceWhole = $(el).find(".a-price .a-price-whole").first().text().trim();
    const priceFraction = $(el).find(".a-price .a-price-fraction").first().text().trim();
    const priceRaw = priceWhole ? `${priceWhole}${priceFraction}` : $(el).find(".a-price").first().text().trim();
    const price = parseMoney(priceRaw);
    if (!price || price < 1) return;
    if (priceFloor && price < priceFloor) return;
    if (priceCeiling && price > priceCeiling) return;

    const sellerText = $(el).find(".a-size-small .a-color-secondary").text();
    const isAmazon = sellerText.toLowerCase().includes("amazon") || !sellerText;
    const seller = isAmazon ? "Amazon" : truncate(sellerText, 40);

    const itemCondition = $(el).find(".a-color-secondary:contains('Gebraucht'), .a-color-secondary:contains('Renewed')").text();
    const cond = itemCondition.includes("Gebraucht") ? "Gebraucht"
      : itemCondition.includes("Renewed") ? "Refurbished" : "Neu";

    const imageUrl = $(el).find("img.s-image").attr("src") ?? "";
    const prime = $(el).find(".s-prime").length > 0;

    offers.push({
      title,
      site: "amazon.de",
      seller,
      condition: cond,
      price,
      shipping: prime ? "Prime kostenlos" : "Versand berechnen",
      delivery: prime ? "Morgen lieferbar" : "Versand möglich",
      url: `https://www.amazon.de/dp/${asin}`,
      imageUrl,
      isOnline: true,
      sellerType: isAmazon ? "amazon" : "gewerblich",
    });
  });

  return NextResponse.json({ site: "amazon.de", offers });
}
