"use client";
import Image from "next/image";
import type { Offer } from "@/lib/types";

interface Props {
  offer: Offer;
}

export default function OfferCard({ offer }: Props) {
  const isBest = offer.rank === 1;
  const riskColor = offer.risk === "Niedrig" ? "bg-green-100 text-green-800" :
    offer.risk === "Mittel" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800";

  return (
    <a
      href={offer.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-xl border-2 overflow-hidden hover:shadow-lg transition-shadow ${
        isBest ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white"
      }`}
    >
      {/* Image */}
      <div className="relative w-full h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
        {offer.imageUrl ? (
          <img
            src={offer.imageUrl}
            alt={offer.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="text-5xl text-gray-300">📦</div>
        )}
      </div>

      {/* Best badge */}
      {isBest && (
        <div className="absolute top-3 left-3 bg-amber-400 text-amber-900 px-3 py-1 rounded-full text-sm font-bold">
          🏆 Best
        </div>
      )}

      {/* Body */}
      <div className="p-4 flex flex-col gap-3">
        {/* Title */}
        <h3 className="font-semibold text-base line-clamp-3 text-gray-800 hover:text-blue-600">
          {offer.title}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-green-600">€{offer.price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-sm text-gray-600">{offer.shipping}</span>
        </div>

        {/* Delivery */}
        <div className="text-sm text-gray-600">{offer.delivery}</div>

        {/* Badges row */}
        <div className="flex gap-2 flex-wrap">
          <span
            className="px-2.5 py-1 text-xs font-semibold rounded-full text-white"
            style={{ backgroundColor: offer.siteColor }}
          >
            {offer.site.split(".")[0]}
          </span>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            {offer.condition}
          </span>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${riskColor}`}>
            {offer.risk}
          </span>
        </div>

        {/* Seller & rating */}
        <div className="text-sm text-gray-700">
          <span className="font-medium">{offer.seller}</span>
          {offer.rating && <span className="text-gray-500"> • {offer.rating}</span>}
          {offer.distance && <span className="text-gray-500"> • {offer.distance}</span>}
        </div>

        {/* Rank & why */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-gray-400">#{offer.rank}</span>
            <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-700 rounded">
              Score: €{offer.score.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-gray-600">{offer.explanation}</p>
        </div>
      </div>
    </a>
  );
}
