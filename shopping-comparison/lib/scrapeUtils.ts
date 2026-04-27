export const DE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Cache-Control": "no-cache",
};

export async function fetchHtml(
  url: string,
  extraHeaders?: Record<string, string>,
  timeoutMs: number = 8000,
  maxBytes?: number,
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { ...DE_HEADERS, ...extraHeaders },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    if (!maxBytes || !res.body) return await res.text();

    // Streaming read with a byte cap. Used for sites whose SSR response is
    // huge (e.g. Vinted's ~8 MB catalog) — we only need the top-of-page
    // listings and parsing the full body OOMs the 512 MB Render free tier.
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buf = "";
    let received = 0;
    while (received < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      buf += decoder.decode(value, { stream: true });
    }
    buf += decoder.decode();
    try { await reader.cancel(); } catch { /* ignore */ }
    return buf;
  } catch {
    return null;
  }
}

export function parseMoney(raw: string): number | null {
  // Handles "1.299,00 €", "€1,299.00", "1299", "ab 1.299 €"
  const cleaned = raw.replace(/[^\d.,]/g, "").trim();
  if (!cleaned) return null;

  // European format: 1.299,00
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  // US/neutral format: 1,299.00
  if (/^\d{1,3}(,\d{3})*(\.\d{1,2})?$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/,/g, ""));
  }
  // Plain integer or decimal
  const n = parseFloat(cleaned.replace(",", "."));
  return isNaN(n) ? null : n;
}

export function truncate(s: string, max = 80): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
