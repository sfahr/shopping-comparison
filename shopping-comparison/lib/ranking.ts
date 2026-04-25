import type { Offer, RawOffer, Risk, SiteName } from "./types";

export const SITE_COLORS: Record<SiteName, string> = {
  "amazon.de": "#b25400",
  "check24.de": "#ffc300",
  "billiger.de": "#d4143c",
  "ebay.de": "#0064d2",
  "kleinanzeigen.de": "#1b7a1b",
  "vinted.de": "#09b1ba",
};

function trustPenalty(raw: RawOffer): number {
  const { site, sellerType, isAuction, isThirdCountry, pickupDistanceKm, sellerCountry } = raw;

  if (site === "amazon.de") {
    return sellerType === "amazon" ? 0 : 5;
  }

  if (site === "check24.de" || site === "billiger.de") {
    return 5; // assume not Trusted-Shops certified unless scraped
  }

  if (site === "ebay.de") {
    if (isAuction) return 25;
    if (isThirdCountry) return 30;
    if (sellerType === "privat") return 10;
    return 0; // gewerblich DE/EU
  }

  if (site === "kleinanzeigen.de") {
    if (sellerType === "gewerblich") return 0;
    const dist = pickupDistanceKm ?? 0;
    if (dist <= 100) return 15;
    return 60;
  }

  if (site === "vinted.de") {
    if (isThirdCountry) return 60;
    const country = sellerCountry?.toUpperCase() ?? "DE";
    if (country === "DE") return 10;
    return 20; // other EU
  }

  return 5;
}

function distancePenalty(raw: RawOffer): number {
  if (raw.shipping !== "Abholung" || raw.isOnline) return 0;
  const km = raw.pickupDistanceKm ?? 0;
  if (km <= 100) return 0;
  if (km <= 200) return 20;
  return 50;
}

function riskLabel(trust: number, distance: number): Risk {
  const combined = trust + distance;
  if (combined <= 10) return "Niedrig";
  if (combined <= 30) return "Mittel";
  return "Hoch";
}

function explanation(raw: RawOffer, trust: number, distance: number): string {
  const parts: string[] = [`€${raw.price.toFixed(2)} Preis`];
  if (trust > 0) parts.push(`+${trust} Vertrauens-Aufschlag`);
  if (distance > 0) parts.push(`+${distance} Entfernungs-Aufschlag`);
  return parts.join(" · ");
}

export function rankOffers(raws: RawOffer[]): Offer[] {
  const scored = raws.map((raw) => {
    const trust = trustPenalty(raw);
    const dist = distancePenalty(raw);
    const score = raw.price + trust + dist;
    return {
      ...raw,
      siteColor: SITE_COLORS[raw.site],
      trustPenalty: trust,
      distancePenalty: dist,
      score,
      risk: riskLabel(trust, dist),
      lat: raw.lat ?? null,
      lng: raw.lng ?? null,
      isOnline: raw.isOnline ?? true,
      explanation: explanation(raw, trust, dist),
      rank: 0,
    } as Offer;
  });

  scored.sort((a, b) => a.score - b.score);
  scored.forEach((o, i) => { o.rank = i + 1; });
  return scored;
}
