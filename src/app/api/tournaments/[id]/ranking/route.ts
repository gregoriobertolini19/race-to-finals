import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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

    const [entries, matchStats, jar] = await Promise.all([
      getTournamentEntries(tournamentId),
      getTournamentMatchStats(tournamentId),
      cookies(),
    ]);

    const withStats = attachMatchStatsToEntries(entries, matchStats);
    const canViewPhones = await canViewSensitivePlayerData(
      jar.get(ADMIN_COOKIE)?.value,
      jar.get(PLAYER_COOKIE)?.value
    );

    return NextResponse.json({
      tournament,
      entries: canViewPhones ? withStats : redactEntryPhones(withStats),
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Errore nel caricamento della classifica";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
