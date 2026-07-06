"use client";

import { displayPlayerName } from "@/lib/player-name";
import type { TournamentEntry } from "@/lib/types";

interface Props {
  entries: TournamentEntry[];
  value: string;
  onChange: (playerId: string) => void;
}

export default function PlayerPicker({ entries, value, onChange }: Props) {
  const sorted = [...entries].sort((a, b) => a.position - b.position);

  return (
    <div className="rounded-xl border border-border-accent bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">Chi sei?</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Seleziona il tuo nome per vedere chi puoi sfidare. Ti verrà chiesta la
        password del torneo. La scelta resta salvata su questo dispositivo.
      </p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-4 w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      >
        <option value="">Seleziona il tuo nome...</option>
        {sorted.map((e) => (
          <option key={e.player_id} value={e.player_id}>
            #{e.position} {displayPlayerName(e.name)}
          </option>
        ))}
      </select>
    </div>
  );
}
