import { getSql } from "./db";

let rankingSnapshotColumnsReady = false;

/** Aggiunge colonne snapshot classifica se mancano (migration 002). */
export async function ensureRankingSnapshotColumns(): Promise<void> {
  if (rankingSnapshotColumnsReady) return;

  const sql = getSql();
  await sql`
    ALTER TABLE challenges
    ADD COLUMN IF NOT EXISTS winner_position_before INTEGER
  `;
  await sql`
    ALTER TABLE challenges
    ADD COLUMN IF NOT EXISTS loser_position_before INTEGER
  `;

  rankingSnapshotColumnsReady = true;
}
