"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PlayerHeader from "@/components/PlayerHeader";
import PlayerPicker from "@/components/PlayerPicker";
import PlayerAuthGate from "@/components/PlayerAuthGate";
import AvailableOpponentsList from "@/components/AvailableOpponentsList";
import RankingTable from "@/components/RankingTable";
import ExportRankingPdfButton from "@/components/ExportRankingPdfButton";
import { fetchJson } from "@/lib/fetch-json";
import {
  getStoredPlayerId,
  setStoredPlayerId,
} from "@/lib/player-storage";
import type { Tournament, TournamentEntry } from "@/lib/types";

type RankingResponse = {
  tournament: Tournament;
  entries: TournamentEntry[];
};

type PlayerAuthResponse = {
  authenticated: boolean;
};

export default function PlayerViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const tournamentId = parseInt(id, 10);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<TournamentEntry[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [playerAuthed, setPlayerAuthed] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [rankingResult, authResult] = await Promise.all([
      fetchJson<RankingResponse>(`/api/tournaments/${id}/ranking`),
      fetchJson<PlayerAuthResponse>("/api/auth/player"),
    ]);

    setPlayerAuthed(authResult.ok && authResult.data.authenticated);
    setCheckingAuth(false);

    if (!rankingResult.ok) {
      if (rankingResult.error.includes("non è ancora")) {
        router.replace(`/tornei/${id}/impostazioni`);
        return;
      }
      setError(rankingResult.error);
      setLoading(false);
      return;
    }

    setTournament(rankingResult.data.tournament);
    setEntries(rankingResult.data.entries ?? []);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const stored = getStoredPlayerId(tournamentId);
    if (stored) setSelectedPlayerId(String(stored));
  }, [tournamentId]);

  useEffect(() => {
    if (!selectedPlayerId) return;
    const exists = entries.some(
      (e) => String(e.player_id) === selectedPlayerId
    );
    if (exists) {
      setStoredPlayerId(tournamentId, parseInt(selectedPlayerId, 10));
    }
  }, [selectedPlayerId, entries, tournamentId]);

  const selectedPlayer = useMemo(
    () =>
      entries.find((e) => String(e.player_id) === selectedPlayerId) ?? null,
    [entries, selectedPlayerId]
  );

  async function handlePlayerAuthenticated() {
    setPlayerAuthed(true);
    await load();
  }

  const isPlayable = tournament?.status === "active";

  if (loading) {
    return (
      <>
        <PlayerHeader />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <p className="text-ink-muted">Caricamento...</p>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PlayerHeader />
        <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
          <button
            type="button"
            onClick={load}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Riprova
          </button>
        </main>
      </>
    );
  }

  if (!tournament) {
    return (
      <>
        <PlayerHeader />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <p className="text-ink-muted">Torneo non trovato.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <PlayerHeader tournamentName={tournament.name} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Classifica</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Top 8 alle Finals
              {tournament.status === "completed" && " · Torneo concluso"}
            </p>
          </div>
          <ExportRankingPdfButton
            tournament={tournament}
            entries={entries}
          />
        </div>

        {isPlayable && (
          <>
            <PlayerPicker
              entries={entries}
              value={selectedPlayerId}
              onChange={setSelectedPlayerId}
            />
            {selectedPlayer && !checkingAuth && !playerAuthed && (
              <PlayerAuthGate onAuthenticated={handlePlayerAuthenticated} />
            )}
            {selectedPlayer && playerAuthed && (
              <AvailableOpponentsList
                tournamentId={tournamentId}
                player={selectedPlayer}
              />
            )}
          </>
        )}

        <RankingTable
          entries={entries}
          hidePhone
          highlightPlayerId={
            selectedPlayer ? selectedPlayer.player_id : undefined
          }
        />
      </main>
    </>
  );
}
