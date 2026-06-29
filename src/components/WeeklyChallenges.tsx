"use client";

import { useMemo, useState } from "react";
import type { Challenge, Tournament } from "@/lib/types";
import {
  formatWeekRange,
  formatWeekTitle,
  getChallengePlayDate,
  getWeekNumber,
  groupChallengesByPlayWeek,
  isCurrentWeek,
} from "@/lib/weeks";

interface Props {
  challenges: Challenge[];
  tournament: Tournament;
  onUpdated: () => void;
}

type SortableChallenge = Challenge & { sortOrder: number };

function challengeSortOrder(c: Challenge): number {
  if (c.status === "active" || c.status === "pending") return 0;
  if (c.status === "completed") return 1;
  return 2;
}

export default function WeeklyChallenges({
  challenges,
  tournament,
  onUpdated,
}: Props) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const weeks = useMemo(() => {
    const grouped = groupChallengesByPlayWeek(challenges);
    const sortedKeys = [...grouped.keys()].sort((a, b) => a.localeCompare(b));

    return sortedKeys.map((weekStart) => {
      const weekChallenges = grouped
        .get(weekStart)!
        .map((c) => ({ ...c, sortOrder: challengeSortOrder(c) }))
        .sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          const dateA = getChallengePlayDate(a);
          const dateB = getChallengePlayDate(b);
          return dateA.localeCompare(dateB);
        });

      const weekNum = getWeekNumber(weekStart, tournament.started_at);
      const activeCount = weekChallenges.filter(
        (c) => c.status === "active" || c.status === "pending"
      ).length;
      const completedCount = weekChallenges.filter(
        (c) => c.status === "completed"
      ).length;

      return {
        weekStart,
        weekNum,
        label: formatWeekRange(weekStart),
        isCurrent: isCurrentWeek(weekStart),
        activeCount,
        completedCount,
        challenges: weekChallenges,
      };
    });
  }, [challenges, tournament.started_at]);

  async function submitResult(
    challengeId: number,
    winnerId: number,
    score: string
  ) {
    setLoadingId(challengeId);
    setError("");
    try {
      const res = await fetch(`/api/challenges/${challengeId}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerId, score }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setLoadingId(null);
    }
  }

  if (challenges.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
        Nessuna sfida ancora. Lancia la prima sfida qui sopra.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-emerald-950">
          Calendario settimanale
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Calendario per settimana di gioco (Settimana 1, 2, 3…) dalla data di
          avvio del torneo. La classifica si aggiorna ogni lunedì.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {weeks.map((week) => (
        <section
          key={week.weekStart}
          className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm"
        >
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
            <div>
              <h3 className="text-lg font-bold text-emerald-950">
                {formatWeekTitle(week.weekNum)}
              </h3>
              <p className="text-sm text-gray-600">{week.label}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {week.isCurrent && (
                <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-medium text-white">
                  In corso
                </span>
              )}
              {week.activeCount > 0 && (
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                  {week.activeCount} in atto
                </span>
              )}
              {week.completedCount > 0 && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  {week.completedCount} concluse
                </span>
              )}
            </div>
          </header>

          <ul className="divide-y divide-emerald-50">
            {week.challenges.map((c) => (
              <li key={c.id} className="px-4 py-3">
                {c.status === "completed" ? (
                  <CompletedRow challenge={c} />
                ) : c.status === "cancelled" ? (
                  <CancelledRow challenge={c} />
                ) : (
                  <ActiveRow
                    challenge={c}
                    loading={loadingId === c.id}
                    onSubmit={submitResult}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MatchTitle({ c }: { c: Challenge }) {
  return (
    <p className="font-medium text-gray-900">
      <span className="text-gray-500">#{c.challenger_position}</span>{" "}
      {c.challenger_name}{" "}
      <span className="text-gray-400">vs</span>{" "}
      <span className="text-gray-500">#{c.challenged_position}</span>{" "}
      {c.challenged_name}
    </p>
  );
}

function ActiveRow({
  challenge: c,
  loading,
  onSubmit,
}: {
  challenge: Challenge;
  loading: boolean;
  onSubmit: (id: number, winnerId: number, score: string) => void;
}) {
  const [score, setScore] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <MatchTitle c={c} />
          <p className="mt-0.5 text-xs text-sky-700">
            In corso
            {c.scheduled_at ? (
              <>
                {" "}
                · Partita{" "}
                {new Date(c.scheduled_at + "T12:00:00").toLocaleDateString(
                  "it-IT"
                )}
              </>
            ) : (
              ` · Lanciata il ${new Date(c.created_at).toLocaleDateString("it-IT")}`
            )}
          </p>
        </div>
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
          Da giocare
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <input
          type="text"
          placeholder="Punteggio (es. 9-7)"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="button"
          disabled={loading || !score}
          onClick={() => onSubmit(c.id, c.challenger_id, score)}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Vince {c.challenger_name?.split(" ")[0]}
        </button>
        <button
          type="button"
          disabled={loading || !score}
          onClick={() => onSubmit(c.id, c.challenged_id, score)}
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          Vince {c.challenged_name?.split(" ")[0]}
        </button>
      </div>
    </div>
  );
}

function CompletedRow({ challenge: c }: { challenge: Challenge }) {
  const winnerName =
    c.winner_id === c.challenger_id
      ? c.challenger_name
      : c.challenged_name;

  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <MatchTitle c={c} />
        <p className="mt-1 text-sm text-emerald-800">
          <span className="font-semibold">{winnerName}</span> vince
          {c.score && (
            <span className="font-mono text-emerald-900"> {c.score}</span>
          )}
          {c.completed_at && (
            <span className="text-gray-500">
              {" "}
              · {new Date(c.completed_at).toLocaleDateString("it-IT")}
            </span>
          )}
        </p>
      </div>
      {c.ranking_applied ? (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          In classifica
        </span>
      ) : (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          In attesa lunedì
        </span>
      )}
    </div>
  );
}

function CancelledRow({ challenge: c }: { challenge: Challenge }) {
  return (
    <div className="opacity-60">
      <MatchTitle c={c} />
      <p className="mt-0.5 text-xs text-gray-500">
        Annullata (non giocata entro 14 giorni)
      </p>
    </div>
  );
}
