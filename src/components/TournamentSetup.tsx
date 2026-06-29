"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Player, Tournament, TournamentEntry } from "@/lib/types";

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

  const enrolledIds = new Set(entries.map((e) => e.player_id));
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

  function movePlayer(playerId: number, direction: "up" | "down") {
    const ordered = entries.map((e) => e.player_id);
    const idx = ordered.indexOf(playerId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= ordered.length) return;
    [ordered[idx], ordered[swapIdx]] = [ordered[swapIdx], ordered[idx]];
    patch("setOrder", { orderedPlayerIds: ordered });
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
          <Link href="/tornei" className="text-sm text-emerald-700 hover:underline">
            ← Tornei
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-emerald-950">
            {tournament.name}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
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
            disabled={loading || entries.length < 2}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
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
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
        <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-emerald-950">
            Seleziona giocatori
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            Scegli dall&apos;anagrafica chi partecipa. Puoi riordinare la
            classifica iniziale prima di avviare.
          </p>

          {availablePlayers.length === 0 ? (
            <p className="text-sm text-gray-500">
              {allPlayers.length === 0
                ? "Aggiungi giocatori in Anagrafica prima di creare il torneo."
                : "Tutti i giocatori sono già iscritti."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availablePlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addPlayer(p.id)}
                  disabled={loading}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                >
                  + {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-emerald-50 text-emerald-900">
            <tr>
              <th className="px-4 py-3 font-semibold">Pos.</th>
              <th className="px-4 py-3 font-semibold">Giocatore</th>
              {isDraft && (
                <th className="px-4 py-3 font-semibold">Azioni</th>
              )}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={isDraft ? 3 : 2}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Nessun giocatore iscritto
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.player_id} className="border-t border-emerald-100">
                  <td className="px-4 py-3 font-mono font-bold">{e.position}</td>
                  <td className="px-4 py-3 font-medium">{e.name}</td>
                  {isDraft && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => movePlayer(e.player_id, "up")}
                          disabled={loading || e.position === 1}
                          className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 disabled:opacity-50"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => movePlayer(e.player_id, "down")}
                          disabled={loading || e.position === entries.length}
                          className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 disabled:opacity-50"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removePlayer(e.player_id)}
                          disabled={loading}
                          className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 disabled:opacity-50"
                        >
                          Rimuovi
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isActive && (
        <p className="text-sm text-emerald-700">
          Torneo in corso. Vai alla{" "}
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
