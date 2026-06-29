"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import TournamentSetup from "@/components/TournamentSetup";
import type { Player, Tournament, TournamentEntry } from "@/lib/types";

export default function TournamentSetupPage() {
  const params = useParams();
  const id = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<TournamentEntry[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);

  const load = useCallback(async () => {
    const [tournamentRes, playersRes] = await Promise.all([
      fetch(`/api/tournaments/${id}`),
      fetch("/api/players"),
    ]);
    if (tournamentRes.ok) {
      const data = await tournamentRes.json();
      setTournament(data.tournament);
      setEntries(data.entries ?? []);
    }
    if (playersRes.ok) {
      const playersData = await playersRes.json();
      setAllPlayers(Array.isArray(playersData) ? playersData : []);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!tournament) {
    return (
      <>
        <Nav />
        <p className="px-4 py-8 text-gray-500">Caricamento...</p>
      </>
    );
  }

  return (
    <>
      <Nav tournament={tournament} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <TournamentSetup
          tournament={tournament}
          entries={entries}
          allPlayers={allPlayers}
          onUpdated={load}
        />
      </div>
    </>
  );
}
