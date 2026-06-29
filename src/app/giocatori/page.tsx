"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import PlayerManager from "@/components/PlayerManager";
import TournamentParticipants from "@/components/TournamentParticipants";
import type { Player, Tournament, TournamentEntry } from "@/lib/types";

export default function GiocatoriPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [entries, setEntries] = useState<TournamentEntry[]>([]);

  const loadPlayers = useCallback(async () => {
    const res = await fetch("/api/players");
    const data = await res.json();
    setPlayers(Array.isArray(data) ? data : []);
  }, []);

  const loadTournaments = useCallback(async () => {
    const res = await fetch("/api/tournaments");
    const data = await res.json();
    const active = data.active ?? [];
    setActiveTournaments(active);
    if (active.length === 1 && !selectedTournamentId) {
      setSelectedTournamentId(String(active[0].id));
    }
  }, [selectedTournamentId]);

  const loadEntries = useCallback(async () => {
    if (!selectedTournamentId) {
      setEntries([]);
      return;
    }
    const res = await fetch(
      `/api/tournaments/${selectedTournamentId}/entries`
    );
    const data = await res.json();
    setEntries(data.entries ?? []);
  }, [selectedTournamentId]);

  useEffect(() => {
    loadPlayers();
    loadTournaments();
  }, [loadPlayers, loadTournaments]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  function refresh() {
    loadPlayers();
    loadEntries();
  }

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">Anagrafica</h1>
          <p className="mt-1 text-sm text-gray-600">
            Giocatori permanenti del club — restano nel database tra un torneo e
            l&apos;altro
          </p>
        </div>

        <PlayerManager players={players} onUpdated={refresh} />

        {activeTournaments.length > 0 && (
          <div className="space-y-4">
            {activeTournaments.length > 1 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Torneo per gestione partecipanti
                </label>
                <select
                  value={selectedTournamentId}
                  onChange={(e) => setSelectedTournamentId(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Seleziona torneo...</option>
                  {activeTournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedTournamentId && (
              <TournamentParticipants
                tournamentId={parseInt(selectedTournamentId, 10)}
                entries={entries}
                allPlayers={players}
                onUpdated={refresh}
              />
            )}
          </div>
        )}
      </main>
    </>
  );
}
