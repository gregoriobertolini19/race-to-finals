"use client";

import { useState } from "react";
import type { Tournament, TournamentEntry } from "@/lib/types";

interface Props {
  tournament: Tournament;
  entries: TournamentEntry[];
  highlightTop?: number;
  className?: string;
}

export default function ExportRankingPdfButton({
  tournament,
  entries,
  highlightTop = 8,
  className = "",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    if (entries.length === 0) {
      setError("Nessun giocatore da esportare");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { exportRankingPdf } = await import("@/lib/export-ranking-pdf");
      exportRankingPdf(tournament, entries, { highlightTop });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'export PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleExport}
        disabled={loading || entries.length === 0}
        className="rounded-lg border border-border-accent bg-surface px-4 py-2 text-sm font-medium text-accent-dark shadow-sm hover:bg-accent-subtle disabled:opacity-50"
      >
        {loading ? "Esporto..." : "Esporta PDF"}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
