"use client";

import { useMemo, useState } from "react";
import { displayPlayerName } from "@/lib/player-name";
import type { TournamentEntry } from "@/lib/types";
import { formatPhoneDisplay, phoneHref } from "@/lib/phone";

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

  const selectedOpponent = useMemo(
    () => opponents.find((e) => String(e.player_id) === challengedId),
    [opponents, challengedId]
  );

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
      className="rounded-xl border border-border-accent bg-surface p-5 shadow-sm"
    >
      <h2 className="mb-4 text-lg font-semibold text-ink">Nuova sfida</h2>
      <p className="mb-4 text-sm text-ink-muted">
        Lo sfidato accetta automaticamente. Indica la data di gioco: la sfida
        entrerà nel calendario di quella settimana. La partita va giocata entro
        2 settimane dalla lancio.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-secondary">
            Sfidante
          </label>
          <select
            value={challengerId}
            onChange={(e) => loadOpponents(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            required
          >
            <option value="">Seleziona...</option>
            {activeEntries.map((e) => (
              <option key={e.player_id} value={e.player_id}>
                #{e.position} {displayPlayerName(e.name)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-secondary">
            Sfidato (±5 posizioni)
          </label>
          <select
            value={challengedId}
            onChange={(e) => setChallengedId(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            required
            disabled={!challengerId}
          >
            <option value="">Seleziona...</option>
            {opponents.map((e) => (
              <option key={e.player_id} value={e.player_id}>
                #{e.position} {displayPlayerName(e.name)}
                {e.phone ? ` · ${e.phone}` : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedOpponent && (
          <div className="sm:col-span-2 rounded-lg border border-border-accent bg-accent-subtle px-4 py-3 text-sm">
            <p className="font-medium text-ink">
              Contatta {displayPlayerName(selectedOpponent.name)}
            </p>
            {phoneHref(selectedOpponent.phone) ? (
              <a
                href={phoneHref(selectedOpponent.phone)!}
                className="mt-1 inline-block font-semibold text-accent-dark hover:underline"
              >
                {formatPhoneDisplay(selectedOpponent.phone)}
              </a>
            ) : (
              <p className="mt-1 text-ink-muted">
                Nessun telefono in anagrafica — chiedi a{" "}
                {displayPlayerName(selectedOpponent.name)} di aggiornarlo in
                Giocatori.
              </p>
            )}
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-ink-secondary">
            Data partita
          </label>
          <input
            type="date"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            required
          />
          <p className="mt-1 text-xs text-ink-muted">
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
        className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
      >
        {loading ? "Invio..." : "Lancia sfida"}
      </button>
    </form>
  );
}
