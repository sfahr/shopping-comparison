import { NextRequest, NextResponse } from "next/server";
import type { ScrapeRequest } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const body: ScrapeRequest = await req.json();

  // eBay has disabled traditional scraping and their public APIs require authentication
  // Use Kleinanzeigen.de or Amazon.de for search results instead
  return NextResponse.json({
    site: "ebay.de",
    offers: [],
    error: "eBay-Scraping temporär nicht verfügbar. Bitte nutzen Sie Amazon oder Kleinanzeigen.",
  });
}
