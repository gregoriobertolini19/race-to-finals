import { getSql } from "./db";
import { getTournamentEntry, requireTournament } from "./tournaments";
import type { Challenge, TournamentEntry } from "./types";

const CHALLENGE_RANGE = 5;
const CHALLENGE_DEADLINE_DAYS = 14;
const MONTHLY_LIMIT_DAYS = 30;

export async function getTournamentChallenges(
  tournamentId: number,
  includeCompleted = true
): Promise<Challenge[]> {
  const sql = getSql();

  if (includeCompleted) {
    return sql<Challenge[]>`
      SELECT c.*,
        pc.name AS challenger_name, tec.position AS challenger_position,
        pd.name AS challenged_name, ted.position AS challenged_position
      FROM challenges c
      JOIN players pc ON c.challenger_id = pc.id
      JOIN players pd ON c.challenged_id = pd.id
      JOIN tournament_entries tec ON tec.tournament_id = c.tournament_id AND tec.player_id = c.challenger_id
      JOIN tournament_entries ted ON ted.tournament_id = c.tournament_id AND ted.player_id = c.challenged_id
      WHERE c.tournament_id = ${tournamentId}
      ORDER BY c.created_at DESC
    `;
  }

  return sql<Challenge[]>`
    SELECT c.*,
      pc.name AS challenger_name, tec.position AS challenger_position,
      pd.name AS challenged_name, ted.position AS challenged_position
    FROM challenges c
    JOIN players pc ON c.challenger_id = pc.id
    JOIN players pd ON c.challenged_id = pd.id
    JOIN tournament_entries tec ON tec.tournament_id = c.tournament_id AND tec.player_id = c.challenger_id
    JOIN tournament_entries ted ON ted.tournament_id = c.tournament_id AND ted.player_id = c.challenged_id
    WHERE c.tournament_id = ${tournamentId}
    AND c.status NOT IN ('completed', 'cancelled')
    ORDER BY c.created_at DESC
  `;
}

export async function validateChallenge(
  tournamentId: number,
  challengerId: number,
  challengedId: number
): Promise<string | null> {
  if (challengerId === challengedId) {
    return "Non puoi sfidare te stesso";
  }

  const challenger = await getTournamentEntry(tournamentId, challengerId);
  const challenged = await getTournamentEntry(tournamentId, challengedId);

  if (!challenger || !challenged) {
    return "Giocatore non iscritto al torneo";
  }

  if (challenger.status === "standby") {
    return "Sei in stand-by e non puoi sfidare";
  }
  if (challenged.status === "standby") {
    return "Il giocatore sfidato è in stand-by";
  }
  if (challenger.status === "in_challenge") {
    return "Hai già una sfida in corso";
  }
  if (challenged.status === "in_challenge") {
    return "Il giocatore sfidato ha già una sfida in corso";
  }

  const diff = Math.abs(challenger.position - challenged.position);
  if (diff > CHALLENGE_RANGE) {
    return `Puoi sfidare solo giocatori entro ${CHALLENGE_RANGE} posizioni (differenza: ${diff})`;
  }

  const sql = getSql();
  const recentChallenge = await sql`
    SELECT id FROM challenges
    WHERE tournament_id = ${tournamentId} AND status != 'cancelled'
    AND (
      (challenger_id = ${challengerId} AND challenged_id = ${challengedId})
      OR (challenger_id = ${challengedId} AND challenged_id = ${challengerId})
    )
    AND created_at > NOW() - (${MONTHLY_LIMIT_DAYS} || ' days')::interval
    LIMIT 1
  `;

  if (recentChallenge.length > 0) {
    return "Puoi sfidare lo stesso giocatore solo una volta al mese";
  }

  return null;
}

export async function createChallenge(
  tournamentId: number,
  challengerId: number,
  challengedId: number,
  scheduledAt: string
): Promise<Challenge> {
  if (!scheduledAt?.trim()) {
    throw new Error("La data della partita è obbligatoria");
  }

  const error = await validateChallenge(
    tournamentId,
    challengerId,
    challengedId
  );
  if (error) throw new Error(error);

  const sql = getSql();
  let challengeId = 0;

  await sql.begin(async (tx) => {
    const rows = await tx<{ id: number }[]>`
      INSERT INTO challenges (tournament_id, challenger_id, challenged_id, status, scheduled_at)
      VALUES (${tournamentId}, ${challengerId}, ${challengedId}, 'active', ${scheduledAt})
      RETURNING id
    `;
    challengeId = rows[0].id;
    await tx`
      UPDATE tournament_entries SET status = 'in_challenge'
      WHERE tournament_id = ${tournamentId} AND player_id IN (${challengerId}, ${challengedId})
    `;
  });

  const challenges = await getTournamentChallenges(tournamentId);
  return challenges.find((c) => c.id === challengeId)!;
}

export async function recordResult(
  challengeId: number,
  winnerId: number,
  score: string
): Promise<Challenge> {
  const sql = getSql();
  const rows = await sql<Challenge[]>`
    SELECT * FROM challenges WHERE id = ${challengeId}
  `;
  const challenge = rows[0];

  if (!challenge) throw new Error("Sfida non trovata");
  if (challenge.status !== "active" && challenge.status !== "pending") {
    throw new Error("Sfida non attiva");
  }
  if (
    winnerId !== challenge.challenger_id &&
    winnerId !== challenge.challenged_id
  ) {
    throw new Error("Vincitore non valido");
  }

  await sql`
    UPDATE challenges
    SET status = 'completed', winner_id = ${winnerId}, score = ${score}, completed_at = NOW()
    WHERE id = ${challengeId}
  `;

  const challenges = await getTournamentChallenges(challenge.tournament_id);
  return challenges.find((c) => c.id === challengeId)!;
}

export async function cancelExpiredChallenges(
  tournamentId: number
): Promise<number> {
  const sql = getSql();
  const expired = await sql<
    { id: number; challenger_id: number; challenged_id: number }[]
  >`
    SELECT id, challenger_id, challenged_id FROM challenges
    WHERE tournament_id = ${tournamentId} AND status IN ('pending', 'active')
    AND created_at < NOW() - (${CHALLENGE_DEADLINE_DAYS} || ' days')::interval
  `;

  if (expired.length === 0) return 0;

  await sql.begin(async (tx) => {
    for (const c of expired) {
      await tx`UPDATE challenges SET status = 'cancelled' WHERE id = ${c.id}`;
      await tx`
        UPDATE tournament_entries SET status = 'active'
        WHERE tournament_id = ${tournamentId}
        AND player_id IN (${c.challenger_id}, ${c.challenged_id})
        AND status = 'in_challenge'
      `;
    }
  });

  return expired.length;
}

export async function getChallengeableOpponents(
  tournamentId: number,
  playerId: number
): Promise<TournamentEntry[]> {
  const player = await getTournamentEntry(tournamentId, playerId);
  if (!player || player.status !== "active") return [];

  const sql = getSql();
  const allPlayers = await sql<TournamentEntry[]>`
    SELECT te.*, p.name, p.phone FROM tournament_entries te
    JOIN players p ON te.player_id = p.id
    WHERE te.tournament_id = ${tournamentId} AND te.player_id != ${playerId}
    AND te.status = 'active'
    AND ABS(te.position - ${player.position}) <= ${CHALLENGE_RANGE}
    ORDER BY te.position ASC
  `;

  const results: TournamentEntry[] = [];
  for (const opponent of allPlayers) {
    const err = await validateChallenge(
      tournamentId,
      playerId,
      opponent.player_id
    );
    if (err === null) results.push(opponent);
  }
  return results;
}
