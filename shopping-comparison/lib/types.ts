export type SiteName =
  | "amazon.de"
  | "ebay.de"
  | "kleinanzeigen.de"
  | "vinted.de";

export type Condition = "Neu" | "Gebraucht" | "Refurbished";
export type Risk = "Niedrig" | "Mittel" | "Hoch";

export interface RawOffer {
  title: string;
  site: SiteName;
  seller: string;
  condition: Condition;
  price: number;
  shipping: string;
  delivery: string;
  distance?: string;
  rating?: string;
  url: string;
  imageUrl?: string;
  lat?: number | null;
  lng?: number | null;
  isOnline?: boolean;
  sellerType?: "amazon" | "gewerblich" | "privat";
  sellerCountry?: string;
  isAuction?: boolean;
  isThirdCountry?: boolean;
  pickupDistanceKm?: number;
}

export interface Offer extends RawOffer {
  rank: number;
  siteColor: string;
  trustPenalty: number;
  distancePenalty: number;
  score: number;
  risk: Risk;
  lat: number | null;
  lng: number | null;
  isOnline: boolean;
  explanation: string;
}

export interface ScrapeRequest {
  query: string;
  condition?: "new" | "used" | "either";
  priceFloor?: number;
  priceCeiling?: number;
  plz?: string;
}

export interface ScrapeResult {
  site: SiteName;
  offers: RawOffer[];
  error?: string;
}
