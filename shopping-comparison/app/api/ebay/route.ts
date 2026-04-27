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

  // Try eBay.co.uk as fallback (more reliable than de which redirects)
  const url = `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_BIN=1${condParam}&_sop=15`;

  const html = await fetchHtml(url, {
    Referer: "https://www.ebay.co.uk/",
  });
  if (!html) {
    return NextResponse.json({ site: "ebay.de", offers: [], error: "Nicht erreichbar" });
  }

  const $ = cheerio.load(html);
  const offers: RawOffer[] = [];

  // Try German structure first
  let itemSelector = ".s-item";
  let items = $(itemSelector);

  // Fallback to alternative selectors if no items found
  if (items.length === 0) {
    itemSelector = "[data-component-type='s-search-result']";
    items = $(itemSelector);
  }

  items.each((_i, el) => {
    if (offers.length >= 3) return false;

    const title = truncate($(el).find(".s-item__title, h2[role='heading']").text().replace("Neu eingestellt:", "").trim());
    if (!title || title === "Shop on eBay") return;

    const priceRaw = $(el).find(".s-item__price, [class*='price']").first().text().trim();
    const price = parseMoney(priceRaw);
    if (!price || price < 1) return;
    if (priceFloor && price < priceFloor) return;
    if (priceCeiling && price > priceCeiling) return;

    const shippingText = $(el).find(".s-item__shipping, .s-item__logisticsCost, [class*='shipping']").text().trim();
    const shippingFree = shippingText.toLowerCase().includes("kostenlos") || shippingText.toLowerCase().includes("free") || shippingText.includes("+0");
    const shipping = shippingFree ? "Kostenlos" : shippingText || "Versand berechnen";

    const sellerText = $(el).find(".s-item__seller-info, [class*='seller']").text().trim();
    const seller = truncate(sellerText || "eBay-Verkäufer", 40);

    const condText = $(el).find(".SECONDARY_INFO, .s-item__subtitle, [class*='condition']").text().trim();
    const cond = condText.includes("Gebraucht") ? "Gebraucht"
      : condText.includes("Generalüberholt") || condText.includes("Refurbished") ? "Refurbished" : "Neu";

    const locationText = $(el).find(".s-item__location, [class*='location']").text().toLowerCase();
    const isThirdCountry = locationText.includes("china") || locationText.includes("usa") || locationText.includes("hongkong");
    const isGewerblich = $(el).find(".s-item__seller-info, [class*='seller']").text().includes("%");

    const url = $(el).find("a.s-item__link, a[role='link'][href*='/itm/']").attr("href")?.split("?")[0] ?? "#";
    const imageUrl = $(el).find("img[src*='ebayimg']").attr("src") ?? "";

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
