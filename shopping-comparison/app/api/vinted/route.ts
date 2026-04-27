import { NextRequest, NextResponse } from "next/server";
import type { ScrapeRequest } from "@/lib/types";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const body: ScrapeRequest = await req.json();

  // Vinted uses JavaScript rendering which cannot be accessed via traditional scraping
  // Their public APIs are not documented or accessible
  // Use Kleinanzeigen.de or Amazon.de for search results instead
  return NextResponse.json({
    site: "vinted.de",
    offers: [],
    error: "Vinted-Scraping temporär nicht verfügbar. Bitte nutzen Sie Amazon oder Kleinanzeigen.",
  });
}
