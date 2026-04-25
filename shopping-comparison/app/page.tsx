"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import SearchForm from "@/components/SearchForm";
import SiteStatus from "@/components/SiteStatus";
import OfferCard from "@/components/OfferCard";
import { rankOffers } from "@/lib/ranking";
import type { Offer, ScrapeResult, RawOffer, ScrapeRequest } from "@/lib/types";

const OfferMap = dynamic(() => import("@/components/OfferMap"), { ssr: false, loading: () => <div className="w-full h-96 bg-gray-100 rounded-xl animate-pulse" /> });

const SITES = ["amazon.de", "check24.de", "billiger.de", "ebay.de", "kleinanzeigen.de", "vinted.de"];

export default function Home() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Record<string, "loading" | "done" | "error" | "idle">>({});
  const [query, setQuery] = useState("");

  async function handleSearch(q: string, condition: string, ceiling?: number) {
    setQuery(q);
    setOffers([]);
    setLoading(true);
    setStatus(Object.fromEntries(SITES.map((s) => [s, "loading"])));

    const req: ScrapeRequest = { query: q, condition: condition as any, priceCeiling: ceiling };
    const allOffers: RawOffer[] = [];

    const promises = SITES.map(async (site) => {
      try {
        const res = await fetch(`/api/${site.split(".")[0]}`, {
          method: "POST",
          body: JSON.stringify(req),
          headers: { "Content-Type": "application/json" },
        });
        const result: ScrapeResult = await res.json();
        if (result.offers && result.offers.length > 0) {
          allOffers.push(...result.offers);
          setStatus((prev) => ({ ...prev, [site]: "done" }));
        } else {
          setStatus((prev) => ({ ...prev, [site]: result.error ? "error" : "done" }));
        }
      } catch (e) {
        console.error(`Error scraping ${site}:`, e);
        setStatus((prev) => ({ ...prev, [site]: "error" }));
      }
    });

    await Promise.all(promises);
    const ranked = rankOffers(allOffers);
    setOffers(ranked);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🛍️ Preisvergleich</h1>
          <p className="text-gray-600 text-lg">Durchsuche 6 deutsche Shops gleichzeitig</p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <SearchForm onSearch={handleSearch} loading={loading} />
        </div>

        {/* Site Status */}
        {loading || Object.values(status).some((s) => s !== "idle") ? (
          <div className="mb-8">
            <SiteStatus status={status} />
          </div>
        ) : null}

        {/* Results */}
        {offers.length > 0 ? (
          <div className="space-y-8">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Anzahl Angebote</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{offers.length}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Günstigster Preis</div>
                <div className="text-2xl font-bold text-green-600 mt-1">
                  €{Math.min(...offers.map((o) => o.price)).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Best Value</div>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  €{offers[0]?.score.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "−"}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Lokal verfügbar</div>
                <div className="text-2xl font-bold text-indigo-600 mt-1">{offers.filter((o) => o.lat && o.lng).length}</div>
              </div>
            </div>

            {/* Map */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Lieferstellen auf der Karte</h2>
              <OfferMap offers={offers} />
            </div>

            {/* Cards */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Alle Angebote (nach Wert sortiert)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map((offer) => (
                  <OfferCard key={`${offer.site}-${offer.url}`} offer={offer} />
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-gray-700">
              <strong>Hinweis:</strong> Die Bewertung berücksichtigt Preis, Versandkosten, Vertrauensfaktoren (z.B. Amazon
              vs. Privatverkäufer) und Abholungsreichweite. Klicke auf ein Angebot, um die vollständigen Details zu sehen.
            </div>
          </div>
        ) : !loading ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Gib einen Produktnamen ein und klicke "Suchen", um zu starten.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
