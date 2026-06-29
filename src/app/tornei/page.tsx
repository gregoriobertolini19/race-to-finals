"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import type { Tournament } from "@/lib/types";

const statusLabel: Record<Tournament["status"], string> = {
  draft: "Bozza",
  active: "In corso",
  completed: "Concluso",
};

const statusColor: Record<Tournament["status"], string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-emerald-100 text-emerald-800",
  completed: "bg-slate-100 text-slate-600",
};

function tournamentHref(t: Tournament) {
  if (t.status === "draft") return `/tornei/${t.id}/impostazioni`;
  return `/tornei/${t.id}`;
}

export default function TorneiPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeList, setActiveList] = useState<Tournament[]>([]);
  const [name, setName] = useState("");
  const [endDate, setEndDate] = useState("2026-10-08");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/tournaments");
    const data = await res.json();
    setTournaments(data.tournaments);
    setActiveList(data.active);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createTournament(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, endDate: endDate || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setName("");
      window.location.href = `/tornei/${data.id}/impostazioni`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">Gestione tornei</h1>
          <p className="mt-1 text-sm text-gray-600">
            Crea edizioni, configura i partecipanti e avvia i campionati
          </p>
        </div>

        {activeList.length > 0 && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {activeList.length === 1 ? (
              <>
                Torneo in corso:{" "}
                <Link
                  href={`/tornei/${activeList[0].id}`}
                  className="font-semibold underline"
                >
                  {activeList[0].name}
                </Link>
              </>
            ) : (
              <>
                {activeList.length} tornei in corso —{" "}
                <Link href="/" className="font-semibold underline">
                  scegli quale aprire
                </Link>
              </>
            )}
          </div>
        )}

        <form
          onSubmit={createTournament}
          className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold text-emerald-950">
            Nuovo torneo
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nome torneo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Race to Finals 2026"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data fine campionato
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
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
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Creazione..." : "Crea torneo"}
          </button>
        </form>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-emerald-950">Tutti i tornei</h2>
          {tournaments.length === 0 ? (
            <p className="text-sm text-gray-500">Nessun torneo creato</p>
          ) : (
            tournaments.map((t) => (
              <Link
                key={t.id}
                href={tournamentHref(t)}
                className="flex items-center justify-between rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-400"
              >
                <div>
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">
                    {t.player_count ?? 0} giocatori
                    {t.end_date && ` · Fine ${t.end_date}`}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[t.status]}`}
                >
                  {statusLabel[t.status]}
                </span>
              </Link>
            ))
          )}
        </div>
      </main>
    </>
  );
}
