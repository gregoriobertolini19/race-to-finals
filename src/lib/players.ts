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

export async function addPlayer(
  firstName: string,
  lastName: string,
  phone?: string | null
): Promise<Player> {
  const name = formatPlayerName(firstName, lastName);
  if (!firstName.trim()) throw new Error("Nome obbligatorio");
  if (!lastName.trim()) throw new Error("Cognome obbligatorio");

  const sql = getSql();
  const normalizedPhone = normalizePhone(phone);
  const rows = await sql<Player[]>`
    INSERT INTO players (name, phone)
    VALUES (${name}, ${normalizedPhone})
    RETURNING *
  `;
  return rows[0];
}

export function formatPlayerName(firstName: string, lastName: string): string {
  return `${capitalizeNamePart(firstName)} ${capitalizeNamePart(lastName)}`;
}

function capitalizeNamePart(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  return trimmed
    .split(/\s+/)
    .map(
      (word) =>
        word.charAt(0).toLocaleUpperCase("it-IT") +
        word.slice(1).toLocaleLowerCase("it-IT")
    )
    .join(" ");
}

export async function updatePlayer(
  playerId: number,
  data: { name?: string; phone?: string | null }
): Promise<Player> {
  const player = await getPlayerById(playerId);
  if (!player) throw new Error("Giocatore non trovato");

  const name = data.name?.trim() ?? player.name;
  const phone =
    data.phone !== undefined ? normalizePhone(data.phone) : player.phone;

  const sql = getSql();
  const rows = await sql<Player[]>`
    UPDATE players
    SET name = ${name}, phone = ${phone}
    WHERE id = ${playerId}
    RETURNING *
  `;
  return rows[0];
}

function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  return trimmed || null;
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
