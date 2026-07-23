"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import RankingTable from "@/components/RankingTable";
import ExportRankingPdfButton from "@/components/ExportRankingPdfButton";
import type { Tournament, TournamentEntry } from "@/lib/types";

export default function TournamentRankingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<TournamentEntry[]>([]);
  const [weeklyMessage, setWeeklyMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${id}/ranking`);
    const data = await res.json();
    if (!res.ok) {
      if (data.error?.includes("non è ancora")) {
        router.replace(`/tornei/${id}/impostazioni`);
        return;
      }
      setError(data.error);
      return;
    }
    setTournament(data.tournament);
    setEntries(data.entries ?? []);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function applyRanking() {
    setApplying(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/ranking/apply`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWeeklyMessage(data.message);
      setTournament(data.tournament);
      setEntries(data.entries);
    } catch (err) {
      setWeeklyMessage(err instanceof Error ? err.message : "Errore");
    } finally {
      setApplying(false);
    }
  }

  if (error) {
    return (
      <>
        <Nav />
        <p className="text-red-600">{error}</p>
      </>
    );
  }

  if (!tournament) {
    return (
      <>
        <Nav />
        <p className="text-ink-muted">Caricamento...</p>
      </>
    );
  }

  const isActive = tournament.status === "active";

  return (
    <>
      <Nav tournament={tournament} />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Classifica</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {tournament.name} · Top 8 alle Finals
              {isActive && " · Aggiornamento ogni lunedì"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportRankingPdfButton
              tournament={tournament}
              entries={entries}
            />
            {isActive && (
              <>
                <Link
                  href={`/tornei/${id}/gioca`}
                  className="rounded-lg border border-border-accent bg-surface px-4 py-2 text-sm font-medium text-accent-dark shadow-sm hover:bg-accent-subtle"
                >
                  Vista giocatore
                </Link>
                <Link
                  href={`/tornei/${id}/sfide`}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  Vai alle sfide
                </Link>
                <Link
                  href={`/tornei/${id}/impostazioni`}
                  className="rounded-lg border border-border-accent bg-surface px-4 py-2 text-sm font-medium text-accent-dark shadow-sm hover:bg-accent-subtle"
                >
                  Aggiungi giocatore
                </Link>
                <button
                  onClick={applyRanking}
                  disabled={applying}
                  className="rounded-lg border border-border-accent bg-surface px-4 py-2 text-sm font-medium text-accent-dark shadow-sm hover:bg-accent-subtle disabled:opacity-50"
                >
                  {applying ? "Aggiornamento..." : "Applica classifica"}
                </button>
              </>
            )}
          </div>
        </div>

        {tournament.status === "completed" && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Torneo concluso — classifica finale
          </div>
        )}

        {weeklyMessage && (
          <div className="rounded-lg border border-border-accent bg-accent-muted px-4 py-3 text-sm text-ink">
            {weeklyMessage}
          </div>
        )}

        <RankingTable entries={entries} />
      </div>
    </>
  );
}
