import postgres from "postgres";
import { readFileSync } from "fs";
import { resolve } from "path";

const url = readFileSync(resolve(".env.local"), "utf8").match(/DATABASE_URL=(.+)/)?.[1];
if (!url) throw new Error("DATABASE_URL missing");

const sql = postgres(url);
const TOURNAMENT_ID = 6;

type Entry = { player_id: number; position: number; name: string };
type Challenge = {
  id: number;
  challenger_id: number;
  challenged_id: number;
  winner_id: number;
  ranking_applied: boolean;
  winner_position_before: number | null;
  loser_position_before: number | null;
  completed_at: string;
};

async function getEntries(): Promise<Entry[]> {
  return sql<Entry[]>`
    SELECT te.player_id, te.position, p.name
    FROM tournament_entries te
    JOIN players p ON p.id = te.player_id
    WHERE te.tournament_id = ${TOURNAMENT_ID}
    ORDER BY te.position
  `;
}

async function getEntry(playerId: number) {
  const rows = await sql<{ position: number }[]>`
    SELECT position FROM tournament_entries
    WHERE tournament_id = ${TOURNAMENT_ID} AND player_id = ${playerId}
  `;
  return rows[0];
}

async function movePlayerUpOne(playerId: number, currentPosition: number) {
  if (currentPosition <= 1) return;
  const newPosition = currentPosition - 1;
  const temp = currentPosition + 1_000_000;
  await sql`UPDATE tournament_entries SET position = ${temp} WHERE tournament_id = ${TOURNAMENT_ID} AND player_id = ${playerId}`;
  await sql`UPDATE tournament_entries SET position = ${currentPosition} WHERE tournament_id = ${TOURNAMENT_ID} AND position = ${newPosition}`;
  await sql`UPDATE tournament_entries SET position = ${newPosition} WHERE tournament_id = ${TOURNAMENT_ID} AND player_id = ${playerId}`;
}

async function movePlayerDownOne(playerId: number, currentPosition: number) {
  const below = currentPosition + 1;
  const temp = currentPosition + 1_000_000;
  await sql`UPDATE tournament_entries SET position = ${temp} WHERE tournament_id = ${TOURNAMENT_ID} AND player_id = ${playerId}`;
  await sql`UPDATE tournament_entries SET position = ${currentPosition} WHERE tournament_id = ${TOURNAMENT_ID} AND position = ${below}`;
  await sql`UPDATE tournament_entries SET position = ${below} WHERE tournament_id = ${TOURNAMENT_ID} AND player_id = ${playerId}`;
}

async function applyUpset(winnerId: number, winnerPos: number, loserPos: number) {
  await sql`
    UPDATE tournament_entries SET position = position + 1
    WHERE tournament_id = ${TOURNAMENT_ID}
    AND position >= ${loserPos} AND position < ${winnerPos}
    AND player_id != ${winnerId}
  `;
  await sql`
    UPDATE tournament_entries SET position = ${loserPos}
    WHERE tournament_id = ${TOURNAMENT_ID} AND player_id = ${winnerId}
  `;
}

async function reverseUpset(winnerId: number, winnerPos: number, loserPos: number) {
  await sql`
    UPDATE tournament_entries SET position = position - 1
    WHERE tournament_id = ${TOURNAMENT_ID}
    AND position > ${loserPos} AND position <= ${winnerPos}
    AND player_id != ${winnerId}
  `;
  await sql`
    UPDATE tournament_entries SET position = ${winnerPos}
    WHERE tournament_id = ${TOURNAMENT_ID} AND player_id = ${winnerId}
  `;
}

async function applyResult(winnerId: number, loserId: number) {
  const winner = await getEntry(winnerId);
  const loser = await getEntry(loserId);
  if (!winner || !loser) throw new Error(`Entry missing ${winnerId}/${loserId}`);

  const winnerPos = winner.position;
  const loserPos = loser.position;

  if (winnerPos > loserPos) {
    await applyUpset(winnerId, winnerPos, loserPos);
  } else if (winnerPos < loserPos) {
    await movePlayerUpOne(winnerId, winnerPos);
  }
}

async function reverseResult(
  winnerId: number,
  winnerPosBefore: number,
  loserPosBefore: number
) {
  if (winnerPosBefore > loserPosBefore) {
    await reverseUpset(winnerId, winnerPosBefore, loserPosBefore);
  } else if (winnerPosBefore < loserPosBefore && winnerPosBefore > 1) {
    await movePlayerDownOne(winnerId, winnerPosBefore - 1);
  }
}

function printRanking(label: string, entries: Entry[]) {
  console.log(`\n${label}:`);
  entries.forEach((e) => console.log(`  #${e.position} ${e.name}`));
}

async function main() {
  await sql`ALTER TABLE challenges ADD COLUMN IF NOT EXISTS winner_position_before INTEGER`;
  await sql`ALTER TABLE challenges ADD COLUMN IF NOT EXISTS loser_position_before INTEGER`;

  const applied = await sql<Challenge[]>`
    SELECT id, challenger_id, challenged_id, winner_id, ranking_applied,
           winner_position_before, loser_position_before, completed_at
    FROM challenges
    WHERE tournament_id = ${TOURNAMENT_ID} AND status = 'completed' AND ranking_applied = TRUE
    ORDER BY completed_at ASC
  `;

  console.log(`Reverting ${applied.length} applied challenges...`);
  for (const c of [...applied].reverse()) {
    if (c.winner_position_before == null || c.loser_position_before == null) {
      throw new Error(`Challenge ${c.id} missing position snapshots`);
    }
    const loserId =
      c.winner_id === c.challenger_id ? c.challenged_id : c.challenger_id;
    await reverseResult(c.winner_id, c.winner_position_before, c.loser_position_before);
    console.log(`  Reverted #${c.id} (winner was #${c.winner_position_before})`);
  }

  printRanking("Ranking after revert (initial)", await getEntries());

  await sql`
    UPDATE challenges
    SET ranking_applied = FALSE,
        winner_position_before = NULL,
        loser_position_before = NULL
    WHERE tournament_id = ${TOURNAMENT_ID} AND status = 'completed'
  `;

  const pending = await sql<Challenge[]>`
    SELECT id, challenger_id, challenged_id, winner_id, ranking_applied,
           winner_position_before, loser_position_before, completed_at
    FROM challenges
    WHERE tournament_id = ${TOURNAMENT_ID} AND status = 'completed'
    ORDER BY completed_at ASC
  `;

  console.log(`\nRe-applying ${pending.length} challenges with updated rules...`);
  for (const c of pending) {
    const winnerId = c.winner_id;
    const loserId =
      winnerId === c.challenger_id ? c.challenged_id : c.challenger_id;

    const winner = await getEntry(winnerId);
    const loser = await getEntry(loserId);
    if (!winner || !loser) throw new Error(`Entry missing for challenge ${c.id}`);

    await sql`
      UPDATE challenges
      SET winner_position_before = ${winner.position},
          loser_position_before = ${loser.position}
      WHERE id = ${c.id}
    `;

    await applyResult(winnerId, loserId);

    await sql`UPDATE challenges SET ranking_applied = TRUE WHERE id = ${c.id}`;
    console.log(
      `  Applied #${c.id}: winner #${winner.position} vs loser #${loser.position}`
    );
  }

  printRanking("Final ranking", await getEntries());
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
