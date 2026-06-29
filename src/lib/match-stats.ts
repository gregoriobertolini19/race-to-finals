import { getSql } from "./db";
import type { TournamentEntry } from "./types";

export interface PlayerMatchStats {
  matches_played: number;
  wins: number;
  losses: number;
}

const emptyStats = (): PlayerMatchStats => ({
  matches_played: 0,
  wins: 0,
  losses: 0,
});

export async function getTournamentMatchStats(
  tournamentId: number
): Promise<Map<number, PlayerMatchStats>> {
  const sql = getSql();
  const challenges = await sql<
    { challenger_id: number; challenged_id: number; winner_id: number }[]
  >`
    SELECT challenger_id, challenged_id, winner_id
    FROM challenges
    WHERE tournament_id = ${tournamentId}
      AND status = 'completed'
      AND winner_id IS NOT NULL
  `;

  const stats = new Map<number, PlayerMatchStats>();

  function ensure(playerId: number): PlayerMatchStats {
    if (!stats.has(playerId)) stats.set(playerId, emptyStats());
    return stats.get(playerId)!;
  }

  for (const c of challenges) {
    const loserId =
      c.winner_id === c.challenger_id ? c.challenged_id : c.challenger_id;

    ensure(c.challenger_id).matches_played++;
    ensure(c.challenged_id).matches_played++;
    ensure(c.winner_id).wins++;
    ensure(loserId).losses++;
  }

  return stats;
}

export function attachMatchStatsToEntries(
  entries: TournamentEntry[],
  stats: Map<number, PlayerMatchStats>
): TournamentEntry[] {
  return entries.map((entry) => ({
    ...entry,
    ...(stats.get(entry.player_id) ?? emptyStats()),
  }));
}
