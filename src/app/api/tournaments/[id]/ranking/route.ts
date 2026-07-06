import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cancelExpiredChallenges } from "@/lib/challenges";
import {
  ADMIN_COOKIE,
  PLAYER_COOKIE,
  canViewSensitivePlayerData,
} from "@/lib/auth";
import {
  attachMatchStatsToEntries,
  getTournamentMatchStats,
} from "@/lib/match-stats";
import { redactEntryPhones } from "@/lib/redact-phones";
import {
  getTournamentEntries,
  requireTournament,
} from "@/lib/tournaments";
import { maybeRunWeeklyUpdate } from "@/lib/ranking";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const jar = await cookies();
    const canViewPhones = await canViewSensitivePlayerData(
      jar.get(ADMIN_COOKIE)?.value,
      jar.get(PLAYER_COOKIE)?.value
    );

    return NextResponse.json({
      tournament,
      entries: canViewPhones ? entries : redactEntryPhones(entries),
      weeklyUpdate: weekly,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Errore nel caricamento della classifica";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
