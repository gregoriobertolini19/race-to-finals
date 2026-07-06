"use client";

import { useState } from "react";
import type { Player, TournamentEntry } from "@/lib/types";
import { displayPlayerName } from "@/lib/player-name";

interface Props {
  tournamentId: number;
  entries: TournamentEntry[];
  allPlayers?: Player[];
  onUpdated: () => void;
}

export default function TournamentParticipants({
  tournamentId,
  entries,
  allPlayers = [],
  onUpdated,
}: Props) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const enrolledIds = new Set(entries.map((e) => e.player_id));
  const available = allPlayers.filter((p) => !enrolledIds.has(p.id));

  async function toggleStandby(entry: TournamentEntry) {
    setError("");
    const enable = entry.status !== "standby";
    const res = await fetch(`/api/tournaments/${tournamentId}/entries`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: entry.player_id, enable }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    onUpdated();
  }

  async function addToTournament(playerId: number) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">
          Partecipanti torneo attivo
        </h2>
        <p className="text-sm text-ink-muted">
          Stand-by e iscrizioni tardive si gestiscono qui.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {available.length > 0 && (
        <div className="rounded-xl border border-border-accent bg-surface p-4 shadow-sm">
          <p className="mb-2 text-sm font-medium text-ink-secondary">
            Iscrivi nuovo giocatore al torneo (ultima posizione)
          </p>
          <div className="flex flex-wrap gap-2">
            {available.map((p) => (
              <button
                key={p.id}
                onClick={() => addToTournament(p.id)}
                disabled={loading}
                className="rounded-lg border border-border-accent bg-accent-subtle px-3 py-1.5 text-sm text-accent-dark hover:bg-accent-muted disabled:opacity-50"
              >
                + {displayPlayerName(p.name)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border-accent bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-dark text-on-dark">
            <tr>
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Stato</th>
              <th className="px-4 py-3 font-semibold">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.player_id} className="border-t border-border">
                <td className="px-4 py-3 font-mono">{e.position}</td>
                <td className="px-4 py-3 font-medium">{displayPlayerName(e.name)}</td>
                <td className="px-4 py-3 capitalize">{e.status}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleStandby(e)}
                    disabled={e.status === "in_challenge"}
                    className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                  >
                    {e.status === "standby" ? "Esci stand-by" : "Stand-by"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
