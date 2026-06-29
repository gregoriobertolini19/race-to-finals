import { NextResponse } from "next/server";
import { cancelExpiredChallenges } from "@/lib/challenges";
import {
  attachMatchStatsToEntries,
  getTournamentMatchStats,
} from "@/lib/match-stats";
import {
  getTournamentEntries,
  requireTournament,
} from "@/lib/tournaments";
import { maybeRunWeeklyUpdate } from "@/lib/ranking";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tournamentId = parseInt(id, 10);
  const tournament = await requireTournament(tournamentId);

  if (tournament.status === "draft") {
    return NextResponse.json(
      { error: "Il torneo non è ancora stato avviato" },
      { status: 400 }
    );
  }

  await cancelExpiredChallenges(tournamentId);
  const weekly = await maybeRunWeeklyUpdate(tournamentId);
  const entries = attachMatchStatsToEntries(
    await getTournamentEntries(tournamentId),
    await getTournamentMatchStats(tournamentId)
  );

  return NextResponse.json({
    tournament,
    entries,
    weeklyUpdate: weekly,
  });
}
