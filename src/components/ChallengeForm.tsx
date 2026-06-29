"use client";

import { useState } from "react";
import type { TournamentEntry } from "@/lib/types";

interface Props {
  tournamentId: number;
  entries: TournamentEntry[];
  onCreated: () => void;
}

export default function ChallengeForm({
  tournamentId,
  entries,
  onCreated,
}: Props) {
  const [challengerId, setChallengerId] = useState("");
  const [challengedId, setChallengedId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [opponents, setOpponents] = useState<TournamentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeEntries = entries.filter((e) => e.status === "active");

  async function loadOpponents(playerId: string) {
    setChallengerId(playerId);
    setChallengedId("");
    if (!playerId) {
      setOpponents([]);
      return;
    }
    const res = await fetch(
      `/api/tournaments/${tournamentId}/players/${playerId}/opponents`
    );
    const data = await res.json();
    setOpponents(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengerId: parseInt(challengerId, 10),
          challengedId: parseInt(challengedId, 10),
          scheduledAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChallengerId("");
      setChallengedId("");
      setScheduledAt("");
      setOpponents([]);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-4 text-lg font-semibold text-emerald-950">Nuova sfida</h2>
      <p className="mb-4 text-sm text-gray-600">
        Lo sfidato accetta automaticamente. Indica la data di gioco: la sfida
        entrerà nel calendario di quella settimana. La partita va giocata entro
        2 settimane dalla lancio.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Sfidante
          </label>
          <select
            value={challengerId}
            onChange={(e) => loadOpponents(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          >
            <option value="">Seleziona...</option>
            {activeEntries.map((e) => (
              <option key={e.player_id} value={e.player_id}>
                #{e.position} {e.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Sfidato (±5 posizioni)
          </label>
          <select
            value={challengedId}
            onChange={(e) => setChallengedId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
            disabled={!challengerId}
          >
            <option value="">Seleziona...</option>
            {opponents.map((e) => (
              <option key={e.player_id} value={e.player_id}>
                #{e.position} {e.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Data partita
          </label>
          <input
            type="date"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            La sfida verrà inserita nella settimana di gioco corrispondente
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? "Invio..." : "Lancia sfida"}
      </button>
    </form>
  );
}
