import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchHtml, parseMoney, truncate } from "@/lib/scrapeUtils";
import type { RawOffer, ScrapeRequest } from "@/lib/types";

export const maxDuration = 10;

const TAB_NOTICE = /Wird in neuem Fenster oder Tab geöffnet/g;

export async function POST(req: NextRequest) {
  const body: ScrapeRequest = await req.json();
  const { query, condition, priceFloor, priceCeiling } = body;

  const condParam = condition === "new" ? "&LH_ItemCondition=1000"
    : condition === "used" ? "&LH_ItemCondition=3000" : "";
  const url = `https://www.ebay.de/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_BIN=1${condParam}&_sop=15`;

  const html = await fetchHtml(url, {
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    "Referer": "https://www.ebay.de/",
    "Cookie": "ebay_locale=de",
  });
  if (!html) {
    return NextResponse.json({ site: "ebay.de", offers: [], error: "Nicht erreichbar" });
  }

  const $ = cheerio.load(html);
  const offers: RawOffer[] = [];

  $("li.s-card").each((_i, el) => {
    if (offers.length >= 3) return false;

    const href = $(el).find("a").first().attr("href") ?? "";
    if (!href.includes("ebay.de/itm/")) return;
    const itemUrl = href.split("?")[0];

    const title = truncate(
      $(el).find(".s-card__title").first().text().replace(TAB_NOTICE, "").trim()
    );
    if (!title || title === "Shop on eBay") return;

    const priceRaw = $(el).find(".s-card__price").first().text().trim();
    const price = parseMoney(priceRaw);
    if (!price || price < 1) return;
    if (priceFloor && price < priceFloor) return;
    if (priceCeiling && price > priceCeiling) return;

    const cardText = $(el).text();
    const subtitle = $(el).find(".s-card__subtitle").first().text().trim();
    const cond = subtitle.includes("Gebraucht") ? "Gebraucht"
      : subtitle.includes("Generalüberholt") || subtitle.includes("Refurbished") ? "Refurbished"
      : "Neu";

    const isPrivat = subtitle.includes("Privat");
    const isGewerblich = subtitle.includes("Gewerblich") || (!isPrivat && subtitle.includes("|"));

    let shipping = "Versand berechnen";
    if (/Kostenlose[rn]?\s+(Lieferung|Versand|Abholung)/i.test(cardText)) {
      shipping = "Kostenlos";
    } else {
      const m = cardText.match(/\+\s*EUR\s*([\d.,]+)\s*Lieferung/i);
      if (m) shipping = `+EUR ${m[1]} Versand`;
    }

    let seller = "eBay-Verkäufer";
    $(el).find(".su-card-container__attributes__secondary").each((_, row) => {
      const rowText = $(row).text().trim();
      const m = rowText.match(/^(\S+)\s+\d{1,3}(?:[.,]\d)?\s*%\s*positiv/);
      if (m) { seller = truncate(m[1], 40); return false; }
    });

    const imageUrl = $(el).find("img").first().attr("src") ?? "";

    offers.push({
      title,
      site: "ebay.de",
      seller,
      condition: cond,
      price,
      shipping,
      delivery: "Versand möglich",
      url: itemUrl,
      imageUrl,
      isOnline: true,
      sellerType: isGewerblich ? "gewerblich" : "privat",
    });
  });

  return NextResponse.json({ site: "ebay.de", offers });
}
