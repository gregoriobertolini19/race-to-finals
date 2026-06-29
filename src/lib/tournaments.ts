import { getSql, type Sql, type TransactionSql } from "./db";
import { getPlayerById } from "./players";
import type { Tournament, TournamentEntry } from "./types";

const STANDBY_MIN_DAYS = 14;

const tournamentSelect = `
  SELECT t.*, COUNT(te.id)::int AS player_count
  FROM tournaments t
  LEFT JOIN tournament_entries te ON te.tournament_id = t.id
`;

export async function getTournaments(): Promise<Tournament[]> {
  const sql = getSql();
  return sql<Tournament[]>`
    ${sql.unsafe(tournamentSelect)}
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `;
}

export async function getActiveTournaments(): Promise<Tournament[]> {
  const sql = getSql();
  return sql<Tournament[]>`
    ${sql.unsafe(tournamentSelect)}
    WHERE t.status = 'active'
    GROUP BY t.id
    ORDER BY t.started_at DESC
  `;
}

export async function getTournamentById(
  id: number
): Promise<Tournament | undefined> {
  const sql = getSql();
  const rows = await sql<Tournament[]>`
    ${sql.unsafe(tournamentSelect)}
    WHERE t.id = ${id}
    GROUP BY t.id
  `;
  return rows[0];
}

export async function requireTournament(id: number): Promise<Tournament> {
  const tournament = await getTournamentById(id);
  if (!tournament) throw new Error("Torneo non trovato");
  return tournament;
}

export async function requirePlayableTournament(
  id: number
): Promise<Tournament> {
  const tournament = await requireTournament(id);
  if (tournament.status !== "active") {
    throw new Error("Questo torneo non è in corso");
  }
  return tournament;
}

export async function createTournament(
  name: string,
  endDate?: string,
  playerIds?: number[]
): Promise<Tournament> {
  const sql = getSql();
  const rows = await sql<{ id: number }[]>`
    INSERT INTO tournaments (name, end_date, status)
    VALUES (${name.trim()}, ${endDate ?? null}, 'draft')
    RETURNING id
  `;
  const tournamentId = rows[0].id;

  if (playerIds?.length) {
    await addPlayersToTournament(tournamentId, playerIds);
  }

  return (await getTournamentById(tournamentId))!;
}

export async function addPlayersToTournament(
  tournamentId: number,
  playerIds: number[]
): Promise<void> {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) throw new Error("Torneo non trovato");
  if (tournament.status !== "draft") {
    throw new Error("Puoi aggiungere giocatori solo a tornei in bozza");
  }

  const sql = getSql();
  const maxRows = await sql<{ max: number }[]>`
    SELECT COALESCE(MAX(position), 0)::int AS max
    FROM tournament_entries WHERE tournament_id = ${tournamentId}
  `;
  let position = maxRows[0]?.max ?? 0;

  await sql.begin(async (tx) => {
    for (const playerId of playerIds) {
      if (!(await getPlayerById(playerId))) continue;
      position++;
      await tx`
        INSERT INTO tournament_entries (tournament_id, player_id, position)
        VALUES (${tournamentId}, ${playerId}, ${position})
        ON CONFLICT (tournament_id, player_id) DO NOTHING
      `;
    }
  });
}

export async function removePlayerFromTournament(
  tournamentId: number,
  playerId: number
): Promise<void> {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) throw new Error("Torneo non trovato");
  if (tournament.status !== "draft") {
    throw new Error("Puoi rimuovere giocatori solo da tornei in bozza");
  }

  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`
      DELETE FROM tournament_entries
      WHERE tournament_id = ${tournamentId} AND player_id = ${playerId}
    `;
    await reorderTournamentEntries(tournamentId, tx);
  });
}

export async function setTournamentOrder(
  tournamentId: number,
  orderedPlayerIds: number[]
): Promise<void> {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) throw new Error("Torneo non trovato");
  if (tournament.status !== "draft") {
    throw new Error("Puoi riordinare solo tornei in bozza");
  }

  const sql = getSql();
  await sql.begin(async (tx) => {
    for (let i = 0; i < orderedPlayerIds.length; i++) {
      await tx`
        UPDATE tournament_entries SET position = ${i + 1}
        WHERE tournament_id = ${tournamentId} AND player_id = ${orderedPlayerIds[i]}
      `;
    }
  });
}

async function reorderTournamentEntries(
  tournamentId: number,
  sql: Sql | TransactionSql = getSql()
): Promise<void> {
  const entries = await sql<{ player_id: number }[]>`
    SELECT player_id FROM tournament_entries
    WHERE tournament_id = ${tournamentId}
    ORDER BY position ASC
  `;
  for (let i = 0; i < entries.length; i++) {
    await sql`
      UPDATE tournament_entries SET position = ${i + 1}
      WHERE tournament_id = ${tournamentId} AND player_id = ${entries[i].player_id}
    `;
  }
}

export async function startTournament(
  tournamentId: number
): Promise<Tournament> {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) throw new Error("Torneo non trovato");
  if (tournament.status !== "draft") {
    throw new Error("Solo i tornei in bozza possono essere avviati");
  }

  const sql = getSql();
  const countRows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM tournament_entries
    WHERE tournament_id = ${tournamentId}
  `;

  if ((countRows[0]?.count ?? 0) < 2) {
    throw new Error("Servono almeno 2 giocatori per avviare il torneo");
  }

  await sql`
    UPDATE tournaments SET status = 'active', started_at = NOW()
    WHERE id = ${tournamentId}
  `;

  return (await getTournamentById(tournamentId))!;
}

export async function completeTournament(
  tournamentId: number
): Promise<Tournament> {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) throw new Error("Torneo non trovato");
  if (tournament.status !== "active") {
    throw new Error("Solo un torneo in corso può essere concluso");
  }

  const sql = getSql();
  await sql`
    UPDATE tournaments SET status = 'completed' WHERE id = ${tournamentId}
  `;
  return (await getTournamentById(tournamentId))!;
}

export async function deleteTournament(tournamentId: number): Promise<void> {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) throw new Error("Torneo non trovato");

  const sql = getSql();
  await sql`DELETE FROM tournaments WHERE id = ${tournamentId}`;
}

export async function getTournamentEntries(
  tournamentId: number
): Promise<TournamentEntry[]> {
  const sql = getSql();
  return sql<TournamentEntry[]>`
    SELECT te.*, p.name, p.phone
    FROM tournament_entries te
    JOIN players p ON te.player_id = p.id
    WHERE te.tournament_id = ${tournamentId}
    ORDER BY te.position ASC
  `;
}

export async function getTournamentEntry(
  tournamentId: number,
  playerId: number
): Promise<TournamentEntry | undefined> {
  const sql = getSql();
  const rows = await sql<TournamentEntry[]>`
    SELECT te.*, p.name, p.phone
    FROM tournament_entries te
    JOIN players p ON te.player_id = p.id
    WHERE te.tournament_id = ${tournamentId} AND te.player_id = ${playerId}
  `;
  return rows[0];
}

export async function addPlayerToRunningTournament(
  tournamentId: number,
  playerId: number
): Promise<TournamentEntry> {
  const tournament = await requirePlayableTournament(tournamentId);
  if (!(await getPlayerById(playerId))) throw new Error("Giocatore non trovato");

  const existing = await getTournamentEntry(tournament.id, playerId);
  if (existing) throw new Error("Giocatore già iscritto al torneo");

  const sql = getSql();
  const maxRows = await sql<{ max: number }[]>`
    SELECT COALESCE(MAX(position), 0)::int AS max
    FROM tournament_entries WHERE tournament_id = ${tournament.id}
  `;

  await sql`
    INSERT INTO tournament_entries (tournament_id, player_id, position)
    VALUES (${tournament.id}, ${playerId}, ${(maxRows[0]?.max ?? 0) + 1})
  `;

  return (await getTournamentEntry(tournament.id, playerId))!;
}

export async function setStandby(
  tournamentId: number,
  playerId: number,
  enable: boolean
): Promise<TournamentEntry> {
  const entry = await getTournamentEntry(tournamentId, playerId);
  if (!entry) throw new Error("Giocatore non iscritto al torneo");
  if (entry.status === "in_challenge") {
    throw new Error("Non puoi andare in stand-by con una sfida in corso");
  }

  const sql = getSql();

  if (enable) {
    await sql`
      UPDATE tournament_entries
      SET status = 'standby', standby_since = NOW()
      WHERE tournament_id = ${tournamentId} AND player_id = ${playerId}
    `;
  } else {
    const standbySince = entry.standby_since
      ? new Date(entry.standby_since)
      : null;
    if (standbySince) {
      const days = Math.floor(
        (Date.now() - standbySince.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (days < STANDBY_MIN_DAYS) {
        throw new Error(
          `Lo stand-by dura minimo ${STANDBY_MIN_DAYS} giorni (ancora ${STANDBY_MIN_DAYS - days} giorni)`
        );
      }
    }
    await sql`
      UPDATE tournament_entries
      SET status = 'active', standby_since = NULL
      WHERE tournament_id = ${tournamentId} AND player_id = ${playerId}
    `;
  }

  return (await getTournamentEntry(tournamentId, playerId))!;
}
