"use client";

import type { TournamentEntry } from "@/lib/types";
import { displayPlayerName } from "@/lib/player-name";
import { formatPhoneDisplay, phoneHref } from "@/lib/phone";

const statusLabels: Record<TournamentEntry["status"], string> = {
  active: "Attivo",
  standby: "Stand-by",
  in_challenge: "In sfida",
};

const statusColors: Record<TournamentEntry["status"], string> = {
  active: "bg-accent-muted text-accent-dark",
  standby: "bg-amber-100 text-amber-800",
  in_challenge: "bg-sky-100 text-sky-800",
};

interface Props {
  entries: TournamentEntry[];
  highlightTop?: number;
  hidePhone?: boolean;
  highlightPlayerId?: number;
}

export default function RankingTable({
  entries,
  highlightTop = 8,
  hidePhone = false,
  highlightPlayerId,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-accent bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-dark text-on-dark">
          <tr>
            <th className="px-4 py-3 font-semibold">Pos.</th>
            <th className="px-4 py-3 font-semibold">Giocatore</th>
            {!hidePhone && (
              <th className="px-4 py-3 font-semibold">Telefono</th>
            )}
            <th className="px-3 py-3 text-center font-semibold">Partite</th>
            <th className="px-3 py-3 text-center font-semibold">Vittorie</th>
            <th className="px-3 py-3 text-center font-semibold">Sconfitte</th>
            <th className="px-4 py-3 font-semibold">Stato</th>
            <th className="px-4 py-3 font-semibold">Finals</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const qualifies = entry.position <= highlightTop;
            const isSelf = highlightPlayerId === entry.player_id;
            return (
              <tr
                key={entry.player_id}
                className={`border-t border-border ${
                  qualifies ? "bg-accent-subtle/60" : ""
                } ${isSelf ? "ring-2 ring-inset ring-accent" : ""}`}
              >
                <td className="px-4 py-3 font-mono font-bold text-ink">
                  {entry.position}
                </td>
                <td className="px-4 py-3 font-medium text-ink">
                  {displayPlayerName(entry.name)}
                  {isSelf && (
                    <span className="ml-2 text-xs font-medium text-accent-dark">
                      (tu)
                    </span>
                  )}
                </td>
                {!hidePhone && (
                  <td className="px-4 py-3">
                    {phoneHref(entry.phone) ? (
                      <a
                        href={phoneHref(entry.phone)!}
                        className="text-accent-dark hover:underline"
                      >
                        {formatPhoneDisplay(entry.phone)}
                      </a>
                    ) : (
                      <span className="text-ink-muted">
                        {formatPhoneDisplay(entry.phone)}
                      </span>
                    )}
                  </td>
                )}
                <td className="px-3 py-3 text-center font-mono text-ink-secondary">
                  {entry.matches_played ?? 0}
                </td>
                <td className="px-3 py-3 text-center font-mono font-medium text-ink">
                  {entry.wins ?? 0}
                </td>
                <td className="px-3 py-3 text-center font-mono font-medium text-ink">
                  {entry.losses ?? 0}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[entry.status]}`}
                  >
                    {statusLabels[entry.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {qualifies && entry.status !== "standby" ? (
                    <span className="text-xs font-semibold text-accent-dark">
                      Qualificato
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
