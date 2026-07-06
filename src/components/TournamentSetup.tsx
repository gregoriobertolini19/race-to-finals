"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Player, Tournament, TournamentEntry } from "@/lib/types";
import { displayPlayerName } from "@/lib/player-name";
import TournamentParticipants from "@/components/TournamentParticipants";

interface Props {
  tournament: Tournament;
  entries: TournamentEntry[];
  allPlayers: Player[];
  onUpdated: () => void;
}

export default function TournamentSetup({
  tournament,
  entries,
  allPlayers,
  onUpdated,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [localEntries, setLocalEntries] = useState(entries);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  useEffect(() => {
    setLocalEntries(entries);
  }, [entries]);

  const enrolledIds = new Set(localEntries.map((e) => e.player_id));
  const availablePlayers = allPlayers.filter((p) => !enrolledIds.has(p.id));

  async function patch(action: string, payload: Record<string, unknown> = {}) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (action === "start") {
        router.push(`/tornei/${tournament.id}`);
        return;
      }
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setLoading(false);
    }
  }

  function addPlayer(playerId: number) {
    patch("addPlayers", { playerIds: [playerId] });
  }

  function removePlayer(playerId: number) {
    patch("removePlayer", { playerId });
  }

  function saveOrder(orderedPlayerIds: number[]) {
    const reordered = orderedPlayerIds
      .map((id, index) => {
        const entry = localEntries.find((e) => e.player_id === id);
        return entry ? { ...entry, position: index + 1 } : null;
      })
      .filter((e): e is TournamentEntry => e !== null);

    setLocalEntries(reordered);
    patch("setOrder", { orderedPlayerIds });
  }

  function moveToPosition(playerId: number, newPosition: number) {
    const ordered = localEntries.map((e) => e.player_id);
    const fromIdx = ordered.indexOf(playerId);
    if (fromIdx < 0) return;

    const targetIdx = Math.min(
      Math.max(newPosition - 1, 0),
      ordered.length - 1
    );
    if (fromIdx === targetIdx) return;

    ordered.splice(fromIdx, 1);
    ordered.splice(targetIdx, 0, playerId);
    saveOrder(ordered);
  }

  function handleDrop(targetPlayerId: number) {
    if (draggedId === null || draggedId === targetPlayerId) return;
    const ordered = localEntries.map((e) => e.player_id);
    const fromIdx = ordered.indexOf(draggedId);
    const toIdx = ordered.indexOf(targetPlayerId);
    if (fromIdx < 0 || toIdx < 0) return;

    ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, draggedId);
    setDraggedId(null);
    saveOrder(ordered);
  }

  function startTournament() {
    if (!confirm("Avviare il torneo? La classifica diventerà ufficiale.")) return;
    patch("start");
  }

  const isDraft = tournament.status === "draft";
  const isActive = tournament.status === "active";
  const isCompleted = tournament.status === "completed";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/tornei" className="text-sm text-accent-dark hover:underline">
            ← Tornei
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-ink">
            {tournament.name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Stato:{" "}
            <span className="font-medium">
              {isDraft && "Bozza"}
              {isActive && "In corso"}
              {isCompleted && "Concluso"}
            </span>
            {tournament.end_date && ` · Fine: ${tournament.end_date}`}
          </p>
        </div>

        {isDraft && (
          <button
            onClick={startTournament}
            disabled={loading || localEntries.length < 2}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Avvia torneo
          </button>
        )}

        {isActive && (
          <button
            onClick={() => {
              if (confirm("Concludere il torneo?")) patch("complete");
            }}
            disabled={loading}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-alt disabled:opacity-50"
          >
            Concludi torneo
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {isDraft && (
        <div className="rounded-xl border border-border-accent bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-ink">
            Seleziona giocatori
          </h2>
          <p className="mb-4 text-sm text-ink-muted">
            Scegli dall&apos;anagrafica chi partecipa, poi imposta la classifica
            iniziale trascinando le righe o cambiando il numero di posizione.
          </p>

          {availablePlayers.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {allPlayers.length === 0
                ? "Aggiungi giocatori in Anagrafica prima di creare il torneo."
                : "Tutti i giocatori sono già iscritti."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availablePlayers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addPlayer(p.id)}
                  disabled={loading}
                  className="rounded-lg border border-border-accent bg-accent-subtle px-3 py-1.5 text-sm font-medium text-accent-dark hover:bg-accent-muted disabled:opacity-50"
                >
                  + {displayPlayerName(p.name)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isActive && (
        <TournamentParticipants
          tournamentId={tournament.id}
          entries={localEntries}
          allPlayers={allPlayers}
          onUpdated={onUpdated}
        />
      )}

      {!isActive && (
      <div className="overflow-hidden rounded-xl border border-border-accent bg-surface shadow-sm">
        {isDraft && localEntries.length > 0 && (
          <p className="border-b border-border bg-accent-subtle/60 px-4 py-2 text-xs text-accent-dark">
            Trascina le righe oppure modifica il numero di posizione
          </p>
        )}
        <table className="w-full text-left text-sm">
          <thead className="bg-dark text-on-dark">
            <tr>
              {isDraft && <th className="w-10 px-2 py-3" aria-label="Trascina" />}
              <th className="px-4 py-3 font-semibold">Pos.</th>
              <th className="px-4 py-3 font-semibold">Giocatore</th>
              {isDraft && (
                <th className="px-4 py-3 font-semibold">Azioni</th>
              )}
            </tr>
          </thead>
          <tbody>
            {localEntries.length === 0 ? (
              <tr>
                <td
                  colSpan={isDraft ? 4 : 2}
                  className="px-4 py-8 text-center text-ink-muted"
                >
                  Nessun giocatore iscritto
                </td>
              </tr>
            ) : (
              localEntries.map((e) => (
                <tr
                  key={e.player_id}
                  draggable={isDraft && !loading}
                  onDragStart={() => setDraggedId(e.player_id)}
                  onDragEnd={() => setDraggedId(null)}
                  onDragOver={(event) => {
                    if (isDraft) event.preventDefault();
                  }}
                  onDrop={() => handleDrop(e.player_id)}
                  className={`border-t border-border ${
                    draggedId === e.player_id ? "bg-accent-muted/80" : ""
                  } ${isDraft ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  {isDraft && (
                    <td className="px-2 py-3 text-center text-ink-muted">⋮⋮</td>
                  )}
                  <td className="px-4 py-3">
                    {isDraft ? (
                      <input
                        type="number"
                        min={1}
                        max={localEntries.length}
                        defaultValue={e.position}
                        key={`${e.player_id}-${e.position}`}
                        disabled={loading}
                        onBlur={(event) => {
                          const value = parseInt(event.target.value, 10);
                          if (!Number.isNaN(value)) {
                            moveToPosition(e.player_id, value);
                          }
                        }}
                        className="w-14 rounded border border-border px-2 py-1 text-center font-mono text-sm focus:border-accent focus:outline-none"
                      />
                    ) : (
                      <span className="font-mono font-bold">{e.position}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{displayPlayerName(e.name)}</td>
                  {isDraft && (
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => removePlayer(e.player_id)}
                        disabled={loading}
                        className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 disabled:opacity-50"
                      >
                        Rimuovi
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {isDraft && localEntries.length > 0 && (
        <p className="text-sm text-ink-muted">
          Quando il torneo è avviato potrai aggiungere altri giocatori dalle
          Impostazioni: entreranno in ultima posizione.
        </p>
      )}

      {isActive && (
        <p className="text-sm text-accent-dark">
          Vai alla{" "}
          <Link
            href={`/tornei/${tournament.id}`}
            className="font-medium underline"
          >
            Classifica
          </Link>{" "}
          o alle{" "}
          <Link
            href={`/tornei/${tournament.id}/sfide`}
            className="font-medium underline"
          >
            Sfide
          </Link>
          .
        </p>
      )}
    </div>
  );
}
