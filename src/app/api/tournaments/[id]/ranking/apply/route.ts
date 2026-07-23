import { NextResponse } from "next/server";
import { cancelExpiredChallenges } from "@/lib/challenges";
import {
  attachMatchStatsToEntries,
  getTournamentMatchStats,
} from "@/lib/match-stats";
import { applyPendingRankingUpdates } from "@/lib/ranking";
import {
  getTournamentById,
  getTournamentEntries,
  requireTournament,
} from "@/lib/tournaments";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    const tournament = await requireTournament(tournamentId);

    if (tournament.status !== "active") {
      return NextResponse.json(
        { error: "Solo i tornei in corso possono essere aggiornati" },
        { status: 400 }
      );
    }

    await cancelExpiredChallenges(tournamentId);
    const result = await applyPendingRankingUpdates(tournamentId);
    const [entries, matchStats, updatedTournament] = await Promise.all([
      getTournamentEntries(tournamentId),
      getTournamentMatchStats(tournamentId),
      getTournamentById(tournamentId),
    ]);

    return NextResponse.json({
      ...result,
      tournament: updatedTournament ?? tournament,
      entries: attachMatchStatsToEntries(entries, matchStats),
      message:
        result.applied > 0
          ? `Classifica aggiornata: ${result.applied} sfide applicate`
          : "Nessuna sfida in attesa di aggiornamento",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
