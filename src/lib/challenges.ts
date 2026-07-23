import { getSql, type TransactionSql } from "./db";
import { ensureRankingSnapshotColumns } from "./ensure-schema";
import { reverseChallengeResult, applyChallengeResult } from "./ranking";
import { getTournamentEntry, requirePlayableTournament } from "./tournaments";
import type { Challenge, TournamentEntry } from "./types";

const CHALLENGE_RANGE = 5;
const CHALLENGE_DEADLINE_DAYS = 14;
const MONTHLY_LIMIT_DAYS = 30;

/** Il sfidato deve essere davanti in classifica (posizione minore), entro CHALLENGE_RANGE. */
function isWithinChallengeRange(
  challengerPosition: number,
  challengedPosition: number
): boolean {
  const positionsAhead = challengerPosition - challengedPosition;
  return positionsAhead >= 1 && positionsAhead <= CHALLENGE_RANGE;
}

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

  if (!isWithinChallengeRange(challenger.position, challenged.position)) {
    const positionsAhead = challenger.position - challenged.position;
    if (positionsAhead <= 0) {
      return "Puoi sfidare solo giocatori davanti a te in classifica";
    }
    return `Puoi sfidare solo giocatori fino a ${CHALLENGE_RANGE} posizioni davanti a te (differenza: ${positionsAhead})`;
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
  score?: string | null
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

  const normalizedScore = score?.trim() || null;

  await sql`
    UPDATE challenges
    SET status = 'completed',
        winner_id = ${winnerId},
        score = ${normalizedScore},
        completed_at = NOW()
    WHERE id = ${challengeId}
  `;

  const challenges = await getTournamentChallenges(challenge.tournament_id);
  return challenges.find((c) => c.id === challengeId)!;
}

async function resolvePositionsForUndo(
  challenge: Challenge,
  winnerId: number,
  loserId: number,
  tx: TransactionSql
): Promise<{ winnerPos: number; loserPos: number }> {
  if (
    challenge.winner_position_before != null &&
    challenge.loser_position_before != null
  ) {
    return {
      winnerPos: challenge.winner_position_before,
      loserPos: challenge.loser_position_before,
    };
  }

  const winner = await getTournamentEntry(
    challenge.tournament_id,
    winnerId,
    tx
  );
  const loser = await getTournamentEntry(challenge.tournament_id, loserId, tx);
  if (!winner || !loser) {
    throw new Error("Giocatore non trovato nel torneo");
  }

  if (winner.position < loser.position) {
    const gap = loser.position - winner.position;
    if (gap > 1) {
      // Sfidato aveva vinto: era salito di una posizione
      return {
        winnerPos: winner.position + 1,
        loserPos: loser.position,
      };
    }
    return {
      loserPos: winner.position,
      winnerPos: loser.position + gap,
    };
  }

  return {
    winnerPos: winner.position + 1,
    loserPos: loser.position,
  };
}

async function undoRankingIfApplied(
  challenge: Challenge,
  tx: TransactionSql
): Promise<void> {
  if (!challenge.ranking_applied) return;

  const winnerId = challenge.winner_id;
  if (!winnerId) throw new Error("Risultato non valido");

  const loserId =
    winnerId === challenge.challenger_id
      ? challenge.challenged_id
      : challenge.challenger_id;

  const { winnerPos, loserPos } = await resolvePositionsForUndo(
    challenge,
    winnerId,
    loserId,
    tx
  );

  await reverseChallengeResult(
    challenge.tournament_id,
    winnerId,
    loserId,
    winnerPos,
    loserPos,
    tx
  );
}

export async function deleteChallenge(challengeId: number): Promise<void> {
  const sql = getSql();
  const rows = await sql<Challenge[]>`
    SELECT * FROM challenges WHERE id = ${challengeId}
  `;
  const challenge = rows[0];

  if (!challenge) throw new Error("Sfida non trovata");
  if (challenge.status === "cancelled") {
    throw new Error("Sfida già annullata");
  }

  await requirePlayableTournament(challenge.tournament_id);

  await ensureRankingSnapshotColumns();

  await sql.begin(async (tx) => {
    if (challenge.status === "completed") {
      await undoRankingIfApplied(challenge, tx);
    }

    await tx`DELETE FROM challenges WHERE id = ${challengeId}`;

    await tx`
      UPDATE tournament_entries SET status = 'active'
      WHERE tournament_id = ${challenge.tournament_id}
      AND player_id IN (${challenge.challenger_id}, ${challenge.challenged_id})
    `;
  });
}

export async function updateChallengeResult(
  challengeId: number,
  winnerId: number,
  score?: string | null
): Promise<Challenge> {
  const sql = getSql();
  const rows = await sql<Challenge[]>`
    SELECT * FROM challenges WHERE id = ${challengeId}
  `;
  const challenge = rows[0];

  if (!challenge) throw new Error("Sfida non trovata");
  if (challenge.status !== "completed") {
    throw new Error("Solo le sfide concluse possono essere modificate");
  }
  if (
    winnerId !== challenge.challenger_id &&
    winnerId !== challenge.challenged_id
  ) {
    throw new Error("Vincitore non valido");
  }

  await requirePlayableTournament(challenge.tournament_id);

  await ensureRankingSnapshotColumns();

  const wasRankingApplied = challenge.ranking_applied;
  const loserId =
    winnerId === challenge.challenger_id
      ? challenge.challenged_id
      : challenge.challenger_id;
  const normalizedScore = score?.trim() || null;

  await sql.begin(async (tx) => {
    if (wasRankingApplied) {
      await undoRankingIfApplied(challenge, tx);
    }

    await tx`
      UPDATE challenges
      SET winner_id = ${winnerId},
          score = ${normalizedScore},
          completed_at = NOW(),
          ranking_applied = FALSE,
          winner_position_before = NULL,
          loser_position_before = NULL
      WHERE id = ${challengeId}
    `;

    if (wasRankingApplied) {
      const winner = await getTournamentEntry(
        challenge.tournament_id,
        winnerId,
        tx
      );
      const loser = await getTournamentEntry(
        challenge.tournament_id,
        loserId,
        tx
      );
      if (!winner || !loser) throw new Error("Giocatore non trovato nel torneo");

      await tx`
        UPDATE challenges
        SET winner_position_before = ${winner.position},
            loser_position_before = ${loser.position}
        WHERE id = ${challengeId}
      `;

      await applyChallengeResult(
        challenge.tournament_id,
        winnerId,
        loserId,
        tx
      );

      await tx`
        UPDATE challenges SET ranking_applied = TRUE WHERE id = ${challengeId}
      `;
    }
  });

  const challenges = await getTournamentChallenges(challenge.tournament_id);
  return challenges.find((c) => c.id === challengeId)!;
}

export async function revertChallengeResult(
  challengeId: number
): Promise<Challenge> {
  const sql = getSql();
  const rows = await sql<Challenge[]>`
    SELECT * FROM challenges WHERE id = ${challengeId}
  `;
  const challenge = rows[0];

  if (!challenge) throw new Error("Sfida non trovata");
  if (challenge.status !== "completed") {
    throw new Error("Solo le sfide concluse possono essere annullate");
  }

  await requirePlayableTournament(challenge.tournament_id);

  await ensureRankingSnapshotColumns();

  await sql.begin(async (tx) => {
    await undoRankingIfApplied(challenge, tx);

    await tx`
      UPDATE challenges
      SET status = 'active',
          winner_id = NULL,
          score = NULL,
          completed_at = NULL,
          ranking_applied = FALSE,
          winner_position_before = NULL,
          loser_position_before = NULL
      WHERE id = ${challengeId}
    `;

    await tx`
      UPDATE tournament_entries SET status = 'in_challenge'
      WHERE tournament_id = ${challenge.tournament_id}
      AND player_id IN (${challenge.challenger_id}, ${challenge.challenged_id})
    `;
  });

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

  const challengeIds = expired.map((c) => c.id);
  const playerIds = [
    ...new Set(expired.flatMap((c) => [c.challenger_id, c.challenged_id])),
  ];

  await sql.begin(async (tx) => {
    await tx`
      UPDATE challenges SET status = 'cancelled'
      WHERE id = ANY(${challengeIds})
    `;
    await tx`
      UPDATE tournament_entries SET status = 'active'
      WHERE tournament_id = ${tournamentId}
      AND player_id = ANY(${playerIds})
      AND status = 'in_challenge'
    `;
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
  return sql<TournamentEntry[]>`
    SELECT te.*, p.name, p.phone
    FROM tournament_entries te
    JOIN players p ON te.player_id = p.id
    WHERE te.tournament_id = ${tournamentId}
      AND te.player_id != ${playerId}
      AND te.status = 'active'
      AND te.position < ${player.position}
      AND te.position >= ${player.position - CHALLENGE_RANGE}
      AND NOT EXISTS (
        SELECT 1 FROM challenges c
        WHERE c.tournament_id = ${tournamentId}
          AND c.status != 'cancelled'
          AND (
            (c.challenger_id = ${playerId} AND c.challenged_id = te.player_id)
            OR (c.challenger_id = te.player_id AND c.challenged_id = ${playerId})
          )
          AND c.created_at > NOW() - (${MONTHLY_LIMIT_DAYS} || ' days')::interval
      )
    ORDER BY te.position ASC
  `;
}
