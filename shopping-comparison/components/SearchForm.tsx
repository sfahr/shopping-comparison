"use client";
import { useState, FormEvent } from "react";

interface Props {
  onSearch: (query: string, condition: string, priceCeiling?: number) => void;
  loading: boolean;
}

export default function SearchForm({ onSearch, loading }: Props) {
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState("either");
  const [ceiling, setCeiling] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim(), condition, ceiling ? parseFloat(ceiling) : undefined);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-2xl mx-auto">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Produkt suchen, z. B. Canon EOS R5…"
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Suche…" : "Suchen"}
        </button>
      </div>
      <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span>Zustand:</span>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1"
            disabled={loading}
          >
            <option value="either">Alle</option>
            <option value="new">Neu</option>
            <option value="used">Gebraucht</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span>Max. Preis (€):</span>
          <input
            type="number"
            value={ceiling}
            onChange={(e) => setCeiling(e.target.value)}
            placeholder="kein Limit"
            className="border border-gray-300 rounded-lg px-2 py-1 w-28"
            min={0}
            disabled={loading}
          />
        </label>
      </div>
    </form>
  );
}
