import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchHtml, parseMoney, truncate } from "@/lib/scrapeUtils";
import type { RawOffer, ScrapeRequest } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const body: ScrapeRequest = await req.json();
  const { query, condition, priceFloor, priceCeiling } = body;

  const condParam = condition === "new" ? "&LH_ItemCondition=1000"
    : condition === "used" ? "&LH_ItemCondition=3000" : "";
  const url = `https://www.ebay.de/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_BIN=1${condParam}&_sop=15`;

  const html = await fetchHtml(url);
  if (!html) {
    return NextResponse.json({ site: "ebay.de", offers: [], error: "Nicht erreichbar" });
  }

  const $ = cheerio.load(html);
  const offers: RawOffer[] = [];

  $(".s-item").each((_i, el) => {
    if (offers.length >= 3) return false;

    const title = truncate($(el).find(".s-item__title").text().replace("Neu eingestellt:", "").trim());
    if (!title || title === "Shop on eBay") return;

    const priceRaw = $(el).find(".s-item__price").first().text().trim();
    const price = parseMoney(priceRaw);
    if (!price || price < 1) return;
    if (priceFloor && price < priceFloor) return;
    if (priceCeiling && price > priceCeiling) return;

    const shippingText = $(el).find(".s-item__shipping, .s-item__logisticsCost").text().trim();
    const shippingFree = shippingText.toLowerCase().includes("kostenlos") || shippingText.includes("+0");
    const shipping = shippingFree ? "Kostenlos" : shippingText || "Versand berechnen";

    const sellerText = $(el).find(".s-item__seller-info").text().trim();
    const seller = truncate(sellerText || "eBay-Verkäufer", 40);

    const condText = $(el).find(".SECONDARY_INFO, .s-item__subtitle").text().trim();
    const cond = condText.includes("Gebraucht") ? "Gebraucht"
      : condText.includes("Generalüberholt") ? "Refurbished" : "Neu";

    const locationText = $(el).find(".s-item__location").text().toLowerCase();
    const isThirdCountry = locationText.includes("china") || locationText.includes("usa") || locationText.includes("hongkong");
    const isGewerblich = $(el).find(".s-item__seller-info").text().includes("%");

    const url = $(el).find("a.s-item__link").attr("href")?.split("?")[0] ?? "#";
    const imageUrl = $(el).find("img").attr("src") ?? "";

    if (!url || url === "#") return;

    offers.push({
      title,
      site: "ebay.de",
      seller,
      condition: cond,
      price,
      shipping,
      delivery: "Versand möglich",
      url,
      imageUrl,
      isOnline: true,
      sellerType: isGewerblich ? "gewerblich" : "privat",
      isThirdCountry,
    });
  });

  return NextResponse.json({ site: "ebay.de", offers });
}
