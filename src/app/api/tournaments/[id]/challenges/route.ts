import { NextResponse } from "next/server";
import {
  cancelExpiredChallenges,
  createChallenge,
  getTournamentChallenges,
} from "@/lib/challenges";
import { requirePlayableTournament } from "@/lib/tournaments";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tournamentId = parseInt(id, 10);
  const tournament = await requirePlayableTournament(tournamentId);
  await cancelExpiredChallenges(tournamentId);
  const challenges = await getTournamentChallenges(tournamentId);
  return NextResponse.json({ tournament, challenges });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    await requirePlayableTournament(tournamentId);

    const { challengerId, challengedId, scheduledAt } = await request.json();
    const challenge = await createChallenge(
      tournamentId,
      challengerId,
      challengedId,
      scheduledAt
    );
    return NextResponse.json(challenge, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
