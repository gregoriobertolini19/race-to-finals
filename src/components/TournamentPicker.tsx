"use client";

import Link from "next/link";
import type { Tournament } from "@/lib/types";

const statusLabel: Record<Tournament["status"], string> = {
  draft: "Bozza",
  active: "In corso",
  completed: "Concluso",
};

const statusColor: Record<Tournament["status"], string> = {
  draft: "bg-surface-alt text-ink-secondary",
  active: "bg-accent-muted text-accent-dark",
  completed: "bg-slate-100 text-slate-600",
};

interface Props {
  tournaments: Tournament[];
}

export default function TournamentPicker({ tournaments }: Props) {
  const active = tournaments.filter((t) => t.status === "active");
  const drafts = tournaments.filter((t) => t.status === "draft");
  const completed = tournaments.filter((t) => t.status === "completed");

  function tournamentHref(t: Tournament) {
    if (t.status === "draft") return `/tornei/${t.id}/impostazioni`;
    return `/tornei/${t.id}`;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Scegli torneo</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Seleziona il torneo per vedere classifica e sfide
        </p>
      </div>

      {active.length > 0 && (
        <TournamentSection
          title="Tornei in corso"
          tournaments={active}
          href={tournamentHref}
          highlight
        />
      )}

      {drafts.length > 0 && (
        <TournamentSection
          title="Bozze"
          tournaments={drafts}
          href={tournamentHref}
        />
      )}

      {completed.length > 0 && (
        <TournamentSection
          title="Tornei conclusi"
          tournaments={completed}
          href={tournamentHref}
        />
      )}

      {tournaments.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-accent bg-surface p-10 text-center">
          <p className="text-ink-muted">Nessun torneo ancora creato</p>
          <Link
            href="/tornei"
            className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Crea il primo torneo
          </Link>
        </div>
      )}

      {tournaments.length > 0 && (
        <p className="text-center text-sm text-ink-muted">
          <Link href="/tornei" className="text-accent-dark hover:underline">
            Gestisci tutti i tornei →
          </Link>
        </p>
      )}
    </div>
  );
}

function TournamentSection({
  title,
  tournaments,
  href,
  highlight,
}: {
  title: string;
  tournaments: Tournament[];
  href: (t: Tournament) => string;
  highlight?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-ink">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {tournaments.map((t) => (
          <Link
            key={t.id}
            href={href(t)}
            className={`rounded-xl border bg-surface p-4 shadow-sm transition hover:border-accent ${
              highlight ? "border-border-accent" : "border-border-accent"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{t.name}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {t.player_count ?? 0} giocatori
                  {t.end_date && ` · Fine ${t.end_date}`}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[t.status]}`}
              >
                {statusLabel[t.status]}
              </span>
            </div>
            {t.status === "active" && (
              <p className="mt-3 text-xs font-medium text-accent-dark">
                Apri classifica e sfide →
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
