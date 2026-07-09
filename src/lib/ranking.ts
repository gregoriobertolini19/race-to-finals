import { getSql, type Sql, type TransactionSql } from "./db";
import { ensureRankingSnapshotColumns } from "./ensure-schema";
import { getTournamentEntry, requireTournament } from "./tournaments";
import type { Challenge } from "./types";

export async function applyChallengeResult(
  tournamentId: number,
  winnerId: number,
  loserId: number,
  sql: Sql | TransactionSql = getSql()
): Promise<void> {
  const winner = await getTournamentEntry(tournamentId, winnerId, sql);
  const loser = await getTournamentEntry(tournamentId, loserId, sql);
  if (!winner || !loser) throw new Error("Giocatore non trovato nel torneo");

  const winnerPos = winner.position;
  const loserPos = loser.position;

  // Solo se il vincitore era dietro in classifica (numero posizione maggiore)
  if (winnerPos > loserPos) {
    await sql`
      UPDATE tournament_entries SET position = position + 1
      WHERE tournament_id = ${tournamentId}
      AND position >= ${loserPos} AND position < ${winnerPos}
      AND player_id != ${winnerId}
    `;
    await sql`
      UPDATE tournament_entries SET position = ${loserPos}
      WHERE tournament_id = ${tournamentId} AND player_id = ${winnerId}
    `;
  }
}

export async function reverseChallengeResult(
  tournamentId: number,
  winnerId: number,
  loserId: number,
  winnerPos: number,
  loserPos: number,
  sql: Sql | TransactionSql = getSql()
): Promise<void> {
  if (winnerPos > loserPos) {
    await sql`
      UPDATE tournament_entries SET position = position - 1
      WHERE tournament_id = ${tournamentId}
      AND position > ${loserPos} AND position <= ${winnerPos}
      AND player_id != ${winnerId}
    `;
    await sql`
      UPDATE tournament_entries SET position = ${winnerPos}
      WHERE tournament_id = ${tournamentId} AND player_id = ${winnerId}
    `;
  }
}

export async function applyStandbyPenalties(
  tournamentId: number
): Promise<number> {
  const sql = getSql();
  const now = new Date();
  const entries = await sql<
    { player_id: number; position: number; standby_since: string }[]
  >`
    SELECT te.player_id, te.position, te.standby_since
    FROM tournament_entries te
    WHERE te.tournament_id = ${tournamentId}
    AND te.status = 'standby' AND te.standby_since IS NOT NULL
  `;

  let penalties = 0;
  const maxRows = await sql<{ max: number }[]>`
    SELECT MAX(position)::int AS max FROM tournament_entries
    WHERE tournament_id = ${tournamentId}
  `;
  const maxPosition = maxRows[0]?.max ?? 0;

  for (const entry of entries) {
    const standbyStart = new Date(entry.standby_since);
    const daysInStandby = Math.floor(
      (now.getTime() - standbyStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysInStandby < 30) continue;

    const monthEnd = new Date(standbyStart);
    monthEnd.setDate(monthEnd.getDate() + 30);

    let sundayCount = 0;
    const cursor = new Date(monthEnd);
    while (cursor <= now) {
      if (cursor.getDay() === 0) sundayCount++;
      cursor.setDate(cursor.getDate() + 1);
    }

    if (sundayCount === 0) continue;

    const newPosition = Math.min(entry.position + sundayCount, maxPosition);
    if (newPosition !== entry.position) {
      await sql`
        UPDATE tournament_entries SET position = ${newPosition}
        WHERE tournament_id = ${tournamentId} AND player_id = ${entry.player_id}
      `;
      penalties++;
    }
  }

  return penalties;
}

export async function applyPendingRankingUpdates(
  tournamentId: number
): Promise<{ applied: number; penalties: number }> {
  await requireTournament(tournamentId);
  await ensureRankingSnapshotColumns();
  const sql = getSql();

  const pending = await sql<Challenge[]>`
    SELECT * FROM challenges
    WHERE tournament_id = ${tournamentId}
    AND status = 'completed' AND ranking_applied = FALSE AND winner_id IS NOT NULL
    ORDER BY completed_at ASC
  `;

  let applied = 0;

  await sql.begin(async (tx) => {
    for (const challenge of pending) {
      const winnerId = challenge.winner_id!;
      const loserId =
        winnerId === challenge.challenger_id
          ? challenge.challenged_id
          : challenge.challenger_id;

      const winner = await getTournamentEntry(tournamentId, winnerId, tx);
      const loser = await getTournamentEntry(tournamentId, loserId, tx);
      if (!winner || !loser) throw new Error("Giocatore non trovato nel torneo");

      await tx`
        UPDATE challenges
        SET winner_position_before = ${winner.position},
            loser_position_before = ${loser.position}
        WHERE id = ${challenge.id}
      `;

      await applyChallengeResult(tournamentId, winnerId, loserId, tx);

      await tx`
        UPDATE challenges SET ranking_applied = TRUE WHERE id = ${challenge.id}
      `;

      await tx`
        UPDATE tournament_entries SET status = 'active'
        WHERE tournament_id = ${tournamentId}
        AND player_id IN (${challenge.challenger_id}, ${challenge.challenged_id})
        AND status = 'in_challenge'
      `;

      applied++;
    }
  });

  const penalties = await applyStandbyPenalties(tournamentId);

  if (applied > 0 || penalties > 0) {
    await sql`
      INSERT INTO ranking_updates (tournament_id, challenges_applied, notes)
      VALUES (
        ${tournamentId},
        ${applied},
        ${
          penalties > 0
            ? `Penalità stand-by applicate: ${penalties}`
            : "Aggiornamento settimanale"
        }
      )
    `;
  }

  return { applied, penalties };
}

export function isMonday(): boolean {
  return new Date().getDay() === 1;
}

export async function getLastRankingUpdate(tournamentId: number) {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM ranking_updates
    WHERE tournament_id = ${tournamentId}
    ORDER BY applied_at DESC LIMIT 1
  `;
  return rows[0];
}

export async function shouldRunWeeklyUpdate(
  tournamentId: number
): Promise<boolean> {
  const lastUpdate = (await getLastRankingUpdate(tournamentId)) as
    | { applied_at: string }
    | undefined;

  if (!isMonday()) return false;
  if (!lastUpdate) return true;

  const last = new Date(lastUpdate.applied_at);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);

  return last < startOfWeek;
}

export async function maybeRunWeeklyUpdate(tournamentId: number): Promise<{
  ran: boolean;
  applied: number;
  penalties: number;
}> {
  if (!(await shouldRunWeeklyUpdate(tournamentId))) {
    return { ran: false, applied: 0, penalties: 0 };
  }
  const result = await applyPendingRankingUpdates(tournamentId);
  return { ran: true, ...result };
}
