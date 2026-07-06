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
import { parseScore, resolveMatchResult } from "@/lib/score";
import { displayPlayerName } from "@/lib/player-name";
import { fetchJson } from "@/lib/fetch-json";

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

  async function updateResult(
    challengeId: number,
    winnerId: number,
    score: string
  ) {
    setLoadingId(challengeId);
    setError("");
    try {
      const res = await fetch(`/api/challenges/${challengeId}/result`, {
        method: "PATCH",
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

  async function deleteChallenge(challenge: Challenge) {
    const rankingNote = challenge.ranking_applied
      ? " La classifica tornerà com'era prima di questa sfida."
      : "";
    const message = `Eliminare la sfida ${displayPlayerName(challenge.challenger_name ?? "")} vs ${displayPlayerName(challenge.challenged_name ?? "")}?${rankingNote}`;
    if (!confirm(message)) return;

    setLoadingId(challenge.id);
    setError("");
    try {
      const result = await fetchJson<{ ok: boolean }>(
        `/api/challenges/${challenge.id}`,
        { method: "DELETE" }
      );
      if (!result.ok) throw new Error(result.error);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setLoadingId(null);
    }
  }

  if (challenges.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface-alt px-4 py-10 text-center text-sm text-ink-muted">
        Nessuna sfida ancora. Lancia la prima sfida qui sopra.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink">
          Calendario settimanale
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
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
          className="overflow-hidden rounded-xl border border-border-accent bg-surface shadow-sm"
        >
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-dark-elevated bg-dark px-4 py-3 text-on-dark">
            <div>
              <h3 className="text-lg font-bold text-on-dark">
                {formatWeekTitle(week.weekNum)}
              </h3>
              <p className="text-sm text-on-dark-muted">{week.label}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {week.isCurrent && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-white">
                  In corso
                </span>
              )}
              {week.activeCount > 0 && (
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                  {week.activeCount} in atto
                </span>
              )}
              {week.completedCount > 0 && (
                <span className="rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium text-accent-dark">
                  {week.completedCount} concluse
                </span>
              )}
            </div>
          </header>

          <ul className="divide-y divide-border">
            {week.challenges.map((c) => (
              <li key={c.id} className="px-4 py-3">
                {c.status === "completed" ? (
                  <CompletedRow
                    challenge={c}
                    loading={loadingId === c.id}
                    onUpdate={updateResult}
                    onDelete={() => deleteChallenge(c)}
                  />
                ) : c.status === "cancelled" ? (
                  <CancelledRow challenge={c} />
                ) : (
                  <ActiveRow
                    challenge={c}
                    loading={loadingId === c.id}
                    onSubmit={submitResult}
                    onDelete={() => deleteChallenge(c)}
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
    <p className="font-medium text-ink">
      <span className="text-ink-muted">#{c.challenger_position}</span>{" "}
      {displayPlayerName(c.challenger_name ?? "")}{" "}
      <span className="text-ink-muted">vs</span>{" "}
      <span className="text-ink-muted">#{c.challenged_position}</span>{" "}
      {displayPlayerName(c.challenged_name ?? "")}
    </p>
  );
}

function DeleteChallengeButton({
  loading,
  onDelete,
}: {
  loading: boolean;
  onDelete: () => void;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onDelete}
      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      Elimina sfida
    </button>
  );
}

function ScoreForm({
  challenge: c,
  loading,
  initialChallengerScore,
  initialChallengedScore,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  challenge: Challenge;
  loading: boolean;
  initialChallengerScore?: string;
  initialChallengedScore?: string;
  submitLabel: string;
  onSubmit: (id: number, winnerId: number, score: string) => void;
  onCancel?: () => void;
}) {
  const [challengerScore, setChallengerScore] = useState(
    initialChallengerScore ?? ""
  );
  const [challengedScore, setChallengedScore] = useState(
    initialChallengedScore ?? ""
  );
  const [localError, setLocalError] = useState("");

  function handleConfirm() {
    setLocalError("");
    const result = resolveMatchResult(
      c.challenger_id,
      c.challenged_id,
      parseInt(challengerScore, 10),
      parseInt(challengedScore, 10)
    );
    if ("error" in result) {
      setLocalError(result.error);
      return;
    }
    onSubmit(c.id, result.winnerId, result.score);
  }

  const canSubmit =
    challengerScore.trim() !== "" &&
    challengedScore.trim() !== "" &&
    !loading;

  return (
    <div className="rounded-lg border border-border bg-surface-alt p-3">
      <p className="mb-3 text-xs font-medium text-ink-muted">
        Inserisci i game vinti (es. 6-4, 7-5). Il vincitore viene calcolato
        automaticamente.
      </p>
      <div className="space-y-2">
        <label className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="min-w-0 flex-1 text-sm font-medium text-ink">
              {displayPlayerName(c.challenger_name ?? "")}
            </span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="0"
            value={challengerScore}
            onChange={(e) => setChallengerScore(e.target.value)}
            className="w-20 rounded-lg border border-border bg-surface px-3 py-1.5 text-center text-sm focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="min-w-0 flex-1 text-sm font-medium text-ink">
              {displayPlayerName(c.challenged_name ?? "")}
            </span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="0"
            value={challengedScore}
            onChange={(e) => setChallengedScore(e.target.value)}
            className="w-20 rounded-lg border border-border bg-surface px-3 py-1.5 text-center text-sm focus:border-accent focus:outline-none"
          />
        </label>
      </div>
      {localError && (
        <p className="mt-2 text-xs text-red-600">{localError}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleConfirm}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Salvo..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-alt disabled:opacity-50"
          >
            Annulla
          </button>
        )}
      </div>
    </div>
  );
}

function ActiveRow({
  challenge: c,
  loading,
  onSubmit,
  onDelete,
}: {
  challenge: Challenge;
  loading: boolean;
  onSubmit: (id: number, winnerId: number, score: string) => void;
  onDelete: () => void;
}) {
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
          <div className="mt-2">
            <DeleteChallengeButton loading={loading} onDelete={onDelete} />
          </div>
        </div>
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
          Da giocare
        </span>
      </div>

      <ScoreForm
        challenge={c}
        loading={loading}
        submitLabel="Conferma risultato"
        onSubmit={onSubmit}
      />
    </div>
  );
}

function CompletedRow({
  challenge: c,
  loading,
  onUpdate,
  onDelete,
}: {
  challenge: Challenge;
  loading: boolean;
  onUpdate: (id: number, winnerId: number, score: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const parsed = parseScore(c.score);
  const winnerName = displayPlayerName(
    (c.winner_id === c.challenger_id
      ? c.challenger_name
      : c.challenged_name) ?? ""
  );

  if (editing) {
    return (
      <div className="space-y-3">
        <MatchTitle c={c} />
        <ScoreForm
          key={`edit-${c.id}-${c.score}`}
          challenge={c}
          loading={loading}
          initialChallengerScore={
            parsed ? String(parsed.challengerScore) : undefined
          }
          initialChallengedScore={
            parsed ? String(parsed.challengedScore) : undefined
          }
          submitLabel="Salva modifiche"
          onSubmit={(id, winnerId, score) => {
            onUpdate(id, winnerId, score);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <MatchTitle c={c} />
        <p className="mt-1 text-sm text-accent-dark">
          <span className="font-semibold">{winnerName}</span> vince
          {c.score && (
            <span className="font-mono text-ink"> {c.score}</span>
          )}
          {c.completed_at && (
            <span className="text-ink-muted">
              {" "}
              · {new Date(c.completed_at).toLocaleDateString("it-IT")}
            </span>
          )}
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-accent-dark hover:underline disabled:opacity-50"
          >
            Modifica risultato
          </button>
          <DeleteChallengeButton loading={loading} onDelete={onDelete} />
        </div>
      </div>
      {c.ranking_applied ? (
        <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-ink-muted">
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
      <p className="mt-0.5 text-xs text-ink-muted">
        Annullata (non giocata entro 14 giorni)
      </p>
    </div>
  );
}
