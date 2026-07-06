"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { fetchJson } from "@/lib/fetch-json";
import type { TournamentEntry } from "@/lib/types";
import { formatPhoneDisplay, phoneHref } from "@/lib/phone";
import { displayPlayerName } from "@/lib/player-name";

interface Props {
  tournamentId: number;
  player: TournamentEntry | null;
}

export default function AvailableOpponentsList({
  tournamentId,
  player,
}: Props) {
  const [opponents, setOpponents] = useState<TournamentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!player) {
      setOpponents([]);
      setLoadError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");

    fetchJson<TournamentEntry[]>(
      `/api/tournaments/${tournamentId}/players/${player.player_id}/opponents`
    )
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setOpponents([]);
          setLoadError(result.error);
          return;
        }
        setOpponents(Array.isArray(result.data) ? result.data : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tournamentId, player]);

  if (!player) return null;

  if (player.status === "standby") {
    return (
      <StatusCard variant="warning">
        Sei in <strong>stand-by</strong> e non puoi sfidare nessuno finché non
        torni attivo.
      </StatusCard>
    );
  }

  if (player.status === "in_challenge") {
    return (
      <StatusCard variant="info">
        Hai già una <strong>sfida in corso</strong>. Finisci quella partita
        prima di cercare un nuovo avversario.
      </StatusCard>
    );
  }

  if (loadError) {
    return (
      <StatusCard variant="neutral">
        {loadError}
      </StatusCard>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border-accent bg-surface p-5 text-sm text-ink-muted shadow-sm">
        Caricamento avversari disponibili...
      </div>
    );
  }

  if (opponents.length === 0) {
    return (
      <StatusCard variant="neutral">
        Nessun avversario sfidabile al momento (fino a 5 posizioni davanti,
        attivo e senza sfide recenti).
      </StatusCard>
    );
  }

  return (
    <div className="rounded-xl border border-border-accent bg-surface shadow-sm">
      <div className="border-b border-border bg-accent-subtle px-5 py-4">
        <h2 className="text-lg font-semibold text-ink">Puoi sfidare</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Giocatori fino a 5 posizioni davanti a te — contattali per organizzare
          la partita.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {opponents.map((opponent) => (
          <li
            key={opponent.player_id}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
          >
            <div>
              <p className="font-semibold text-ink">
                <span className="mr-2 font-mono text-ink-muted">
                  #{opponent.position}
                </span>
                {displayPlayerName(opponent.name)}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">Disponibile</p>
            </div>
            {phoneHref(opponent.phone) ? (
              <a
                href={phoneHref(opponent.phone)!}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                {formatPhoneDisplay(opponent.phone)}
              </a>
            ) : (
              <span className="text-sm text-ink-muted">Telefono non disponibile</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusCard({
  children,
  variant,
}: {
  children: ReactNode;
  variant: "warning" | "info" | "neutral";
}) {
  const styles = {
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    info: "border-sky-200 bg-sky-50 text-sky-900",
    neutral: "border-border bg-surface-alt text-ink-secondary",
  };

  return (
    <div
      className={`rounded-xl border px-5 py-4 text-sm shadow-sm ${styles[variant]}`}
    >
      {children}
    </div>
  );
}
