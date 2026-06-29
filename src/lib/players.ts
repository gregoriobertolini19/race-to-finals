import { getSql } from "./db";
import type { Player } from "./types";

export async function getAllPlayers(): Promise<Player[]> {
  const sql = getSql();
  return sql<Player[]>`
    SELECT * FROM players ORDER BY name ASC
  `;
}

export async function getPlayerById(id: number): Promise<Player | undefined> {
  const sql = getSql();
  const rows = await sql<Player[]>`
    SELECT * FROM players WHERE id = ${id}
  `;
  return rows[0];
}

export async function addPlayer(name: string): Promise<Player> {
  const sql = getSql();
  const rows = await sql<Player[]>`
    INSERT INTO players (name) VALUES (${name.trim()})
    RETURNING *
  `;
  return rows[0];
}

export async function deletePlayer(playerId: number): Promise<void> {
  const sql = getSql();

  const inActiveTournament = await sql`
    SELECT te.id FROM tournament_entries te
    JOIN tournaments t ON te.tournament_id = t.id
    WHERE te.player_id = ${playerId} AND t.status = 'active'
  `;

  if (inActiveTournament.length > 0) {
    throw new Error(
      "Il giocatore è iscritto a uno o più tornei in corso. Rimuovilo prima dai tornei attivi."
    );
  }

  const activeChallenge = await sql`
    SELECT id FROM challenges
    WHERE status IN ('pending', 'active')
    AND (challenger_id = ${playerId} OR challenged_id = ${playerId})
    LIMIT 1
  `;

  if (activeChallenge.length > 0) {
    throw new Error("Il giocatore ha sfide attive");
  }

  await sql`DELETE FROM players WHERE id = ${playerId}`;
}
