interface LatLng { lat: number; lng: number; }

const cache = new Map<string, LatLng | null>();

// Pre-seeded common German PLZ codes
const KNOWN: Record<string, LatLng> = {
  "60439": { lat: 50.1816, lng: 8.6322 }, // Niederursel Frankfurt (home)
  "10115": { lat: 52.5317, lng: 13.3839 }, // Berlin Mitte
  "20095": { lat: 53.5511, lng: 9.9937 },  // Hamburg
  "80331": { lat: 48.1351, lng: 11.5820 }, // München
  "70173": { lat: 48.7758, lng: 9.1829 },  // Stuttgart
  "40213": { lat: 51.2254, lng: 6.7763 },  // Düsseldorf
  "50667": { lat: 50.9381, lng: 6.9592 },  // Köln
  "28195": { lat: 53.0793, lng: 8.8017 },  // Bremen
  "30159": { lat: 52.3727, lng: 9.7386 },  // Hannover
  "04109": { lat: 51.3397, lng: 12.3731 }, // Leipzig
};

export async function geocodePlz(plz: string): Promise<LatLng | null> {
  if (cache.has(plz)) return cache.get(plz)!;
  if (KNOWN[plz]) {
    cache.set(plz, KNOWN[plz]);
    return KNOWN[plz];
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(plz)}&country=DE&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "claude-shopping-comparison/1.0" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) { cache.set(plz, null); return null; }
    const data = await res.json();
    if (!data[0]) { cache.set(plz, null); return null; }
    const result: LatLng = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    cache.set(plz, result);
    return result;
  } catch {
    cache.set(plz, null);
    return null;
  }
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
