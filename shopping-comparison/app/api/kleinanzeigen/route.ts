import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchHtml, parseMoney, slugify, truncate } from "@/lib/scrapeUtils";
import { geocodePlz, haversineKm } from "@/lib/geocoding";
import type { RawOffer, ScrapeRequest } from "@/lib/types";

export const maxDuration = 10;

const HOME_LAT = 50.1816;
const HOME_LNG = 8.6322;

export async function POST(req: NextRequest) {
  const body: ScrapeRequest = await req.json();
  const { query, priceFloor, priceCeiling, plz = "60439" } = body;

  const slug = slugify(query);
  const url = `https://www.kleinanzeigen.de/s-${plz}/${slug}/k0l16327r100`;

  const html = await fetchHtml(url, { Referer: "https://www.kleinanzeigen.de/" });
  if (!html) {
    return NextResponse.json({ site: "kleinanzeigen.de", offers: [], error: "Nicht erreichbar" });
  }

  const $ = cheerio.load(html);
  const items: RawOffer[] = [];

  const geocodePromises: Promise<void>[] = [];

  $(".ad-listitem article").each((_i, el) => {
    if (items.length >= 3) return false;

    const title = truncate($(el).find(".ellipsis, h2").first().text().trim());
    if (!title) return;

    const priceRaw = $(el).find(".aditem-main--middle--price-shipping--price").text().trim();
    const price = parseMoney(priceRaw);
    if (!price || price < 1) return;
    if (priceFloor && price < priceFloor) return;
    if (priceCeiling && price > priceCeiling) return;

    const href = $(el).find("a[href*='/s-anzeige/']").first().attr("href") ?? "";
    const itemUrl = href ? `https://www.kleinanzeigen.de${href}` : "#";
    if (itemUrl === "#") return;

    const locText = $(el).find(".aditem-main--top--left, .simpletag").text().trim();
    const plzMatch = locText.match(/\b(\d{5})\b/);
    const itemPlz = plzMatch?.[1] ?? plz;

    const shippingText = $(el).find(".aditem-main--middle--price-shipping--shipping").text();
    const hasShipping = shippingText.toLowerCase().includes("versand");
    const shipping = hasShipping ? "Versand möglich" : "Abholung";

    const badgeText = $(el).find(".simpletag").text().toLowerCase();
    const isGewerblich = badgeText.includes("gewerblich");

    const imageUrl = $(el).find("img").first().attr("src") ?? "";

    const idx = items.length;
    items.push({
      title,
      site: "kleinanzeigen.de",
      seller: isGewerblich ? "Gewerblicher Anbieter" : "Privat",
      condition: "Gebraucht",
      price,
      shipping,
      delivery: hasShipping ? "Versand möglich" : `Abholung (PLZ ${itemPlz})`,
      distance: `PLZ ${itemPlz}`,
      url: itemUrl,
      imageUrl,
      isOnline: false,
      sellerType: isGewerblich ? "gewerblich" : "privat",
      lat: null,
      lng: null,
    });

    geocodePromises.push(
      geocodePlz(itemPlz).then((coords) => {
        if (coords) {
          items[idx].lat = coords.lat;
          items[idx].lng = coords.lng;
          const km = Math.round(haversineKm(HOME_LAT, HOME_LNG, coords.lat, coords.lng));
          items[idx].distance = `ca. ${km} km`;
          items[idx].pickupDistanceKm = km;
        }
      })
    );
  });

  await Promise.allSettled(geocodePromises);

  return NextResponse.json({ site: "kleinanzeigen.de", offers: items });
}
