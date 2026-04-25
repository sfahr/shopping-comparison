"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Offer } from "@/lib/types";

interface Props {
  offers: Offer[];
}

const HOME_LAT = 50.1816;
const HOME_LNG = 8.6322;

export default function OfferMap({ offers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const initMap = async () => {
      const L = await import("leaflet");

      // Clean up existing map instance
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const mapContainer = containerRef.current!;

      const map = L.map(mapContainer).setView([HOME_LAT, HOME_LNG], 7);
      mapRef.current = map;

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
        }
      ).addTo(map);

      const bounds = L.latLngBounds([[HOME_LAT, HOME_LNG]]);

      // Home marker
      L.marker([HOME_LAT, HOME_LNG], {
        icon: L.divIcon({
          html: '<div style="font-size: 28px; line-height: 1;">🏠</div>',
          iconSize: [32, 32],
          className: "home-marker",
        }),
      })
        .bindPopup("📍 Startort (PLZ 60439)")
        .addTo(map);

      // Offer markers
      const localOffers = offers.filter((o) => o.lat && o.lng);
      localOffers.forEach((offer) => {
        if (!offer.lat || !offer.lng) return;
        bounds.extend([offer.lat, offer.lng]);

        const dist = haversine(HOME_LAT, HOME_LNG, offer.lat, offer.lng);
        const popup = `
          <div style="font-size: 12px; max-width: 180px;">
            <strong>${offer.title}</strong><br/>
            €${offer.price.toFixed(2)}<br/>
            ${Math.round(dist)} km entfernt
          </div>
        `;

        L.marker([offer.lat, offer.lng], {
          icon: L.divIcon({
            html: `<div style="background: ${offer.siteColor}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; font-size: 14px;">${offer.rank}</div>`,
            iconSize: [32, 32],
            className: "offer-marker",
          }),
        })
          .bindPopup(popup)
          .addTo(map);
      });

      if (localOffers.length > 0) {
        map.fitBounds(bounds, { maxZoom: 9, padding: [50, 50] });
      }
    };

    initMap();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [offers]);

  return <div ref={containerRef} className="w-full h-96 rounded-xl border border-gray-300 bg-gray-100" />;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
