"use client";

import type { TournamentEntry } from "@/lib/types";
import { formatPhoneDisplay, phoneHref } from "@/lib/phone";

const statusLabels: Record<TournamentEntry["status"], string> = {
  active: "Attivo",
  standby: "Stand-by",
  in_challenge: "In sfida",
};

const statusColors: Record<TournamentEntry["status"], string> = {
  active: "bg-emerald-100 text-emerald-800",
  standby: "bg-amber-100 text-amber-800",
  in_challenge: "bg-sky-100 text-sky-800",
};

interface Props {
  entries: TournamentEntry[];
  highlightTop?: number;
}

export default function RankingTable({ entries, highlightTop = 8 }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-emerald-50 text-emerald-900">
          <tr>
            <th className="px-4 py-3 font-semibold">Pos.</th>
            <th className="px-4 py-3 font-semibold">Giocatore</th>
            <th className="px-4 py-3 font-semibold">Telefono</th>
            <th className="px-4 py-3 font-semibold">Stato</th>
            <th className="px-4 py-3 font-semibold">Finals</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const qualifies = entry.position <= highlightTop;
            return (
              <tr
                key={entry.player_id}
                className={`border-t border-emerald-100 ${
                  qualifies ? "bg-emerald-50/60" : ""
                }`}
              >
                <td className="px-4 py-3 font-mono font-bold text-emerald-900">
                  {entry.position}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {entry.name}
                </td>
                <td className="px-4 py-3">
                  {phoneHref(entry.phone) ? (
                    <a
                      href={phoneHref(entry.phone)!}
                      className="text-emerald-700 hover:underline"
                    >
                      {formatPhoneDisplay(entry.phone)}
                    </a>
                  ) : (
                    <span className="text-gray-400">
                      {formatPhoneDisplay(entry.phone)}
                    </span>
                  )}
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
                    <span className="text-xs font-semibold text-emerald-700">
                      Qualificato
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
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
