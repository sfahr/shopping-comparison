import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchHtml, parseMoney, truncate } from "@/lib/scrapeUtils";
import type { RawOffer, ScrapeRequest } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const body: ScrapeRequest = await req.json();
  const { query, priceFloor, priceCeiling } = body;

  const url = `https://www.vinted.de/catalog?search_text=${encodeURIComponent(query)}&order=relevance`;

  const html = await fetchHtml(url, {
    Referer: "https://www.vinted.de/",
    Cookie: "anon_id=1",
  });
  if (!html) {
    return NextResponse.json({ site: "vinted.de", offers: [], error: "Nicht erreichbar" });
  }

  if (html.includes("Access Denied") || /<title>[^<]*captcha/i.test(html)) {
    return NextResponse.json({ site: "vinted.de", offers: [], error: "Blockiert" });
  }

  const $ = cheerio.load(html);
  const offers: RawOffer[] = [];

  $(".feed-grid__item").each((_i, el) => {
    if (offers.length >= 3) return false;

    const overlayHref = $(el).find("[data-testid$='--overlay-link']").first().attr("href") ?? "";
    const itemUrl = overlayHref.startsWith("http")
      ? overlayHref
      : overlayHref ? `https://www.vinted.de${overlayHref}` : "";
    if (!itemUrl) return;

    const title = truncate(
      $(el).find("[data-testid$='--description-title']").first().text().trim()
    );
    if (!title) return;

    // Two prices live next to each other: base (".title-content" / caption) and total inkl. Käuferschutz (subtitle).
    // Use the higher one as the offer price since that's what the buyer actually pays.
    const priceTexts = $(el)
      .find(".web_ui__Text__caption, .web_ui__Text__subtitle, .title-content")
      .map((_, n) => $(n).text().trim())
      .get()
      .filter((s) => s.includes("€"));
    const prices = priceTexts.map(parseMoney).filter((p): p is number => !!p && p > 0);
    const price = prices.length ? Math.max(...prices) : null;
    if (!price || price < 1) return;
    if (priceFloor && price < priceFloor) return;
    if (priceCeiling && price > priceCeiling) return;

    const subtitle = $(el).find("[data-testid$='--description-subtitle']").first().text().trim();
    const cond = subtitle.toLowerCase().includes("neu") ? "Neu" : "Gebraucht";

    const imageUrl =
      $(el).find("[data-testid$='--image--img']").first().attr("src") ??
      $(el).find("img").first().attr("src") ??
      "";

    offers.push({
      title,
      site: "vinted.de",
      seller: "Vinted-Verkäufer",
      condition: cond,
      price,
      shipping: "inkl. Versand + Käuferschutz",
      delivery: "Versand möglich",
      url: itemUrl,
      imageUrl,
      isOnline: true,
      sellerType: "privat",
      sellerCountry: "DE",
    });
  });

  return NextResponse.json({ site: "vinted.de", offers });
}
