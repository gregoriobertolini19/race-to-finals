import { NextResponse } from "next/server";
import { getChallengeableOpponents } from "@/lib/challenges";
import { requirePlayableTournament } from "@/lib/tournaments";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const { id, playerId } = await params;
  const tournamentId = parseInt(id, 10);
  await requirePlayableTournament(tournamentId);

  const opponents = await getChallengeableOpponents(
    tournamentId,
    parseInt(playerId, 10)
  );
  return NextResponse.json(opponents);
}
