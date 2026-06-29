import { NextResponse } from "next/server";
import { applyPendingRankingUpdates } from "@/lib/ranking";
import {
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

    const result = await applyPendingRankingUpdates(tournamentId);
    const entries = await getTournamentEntries(tournamentId);

    return NextResponse.json({
      ...result,
      tournament,
      entries,
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
