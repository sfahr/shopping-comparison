"use client";

interface Props {
  status: Record<string, "loading" | "done" | "error" | "idle">;
  errors?: Record<string, string>;
}

const SITES = ["amazon.de", "ebay.de", "kleinanzeigen.de", "vinted.de", "geizhals.de", "billiger.de"];
const NAMES: Record<string, string> = {
  "amazon.de": "Amazon",
  "ebay.de": "eBay",
  "kleinanzeigen.de": "K.-Anzeigen",
  "vinted.de": "Vinted",
  "geizhals.de": "Geizhals",
  "billiger.de": "billiger",
};

export default function SiteStatus({ status, errors = {} }: Props) {
  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {SITES.map((site) => {
        const s = status[site] ?? "idle";
        const name = NAMES[site];
        const icon = s === "done" ? "✓" : s === "error" ? "✕" : s === "loading" ? "⏳" : "−";
        const color =
          s === "done"
            ? "bg-green-100 text-green-800"
            : s === "error"
              ? "bg-red-100 text-red-800"
              : s === "loading"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-600";
        const errorMsg = errors?.[site];
        return (
          <div
            key={site}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 ${color} transition-colors ${errorMsg ? 'cursor-help' : ''}`}
            title={errorMsg || ''}
          >
            <span>{icon}</span>
            <span>{name}</span>
          </div>
        );
      })}
    </div>
  );
}
