import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getChallengeableOpponents } from "@/lib/challenges";
import {
  ADMIN_COOKIE,
  PLAYER_COOKIE,
  canViewSensitivePlayerData,
} from "@/lib/auth";
import { requirePlayableTournament } from "@/lib/tournaments";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  try {
    const { id, playerId } = await params;
    const tournamentId = parseInt(id, 10);
    await requirePlayableTournament(tournamentId);

    const opponents = await getChallengeableOpponents(
      tournamentId,
      parseInt(playerId, 10)
    );

    const jar = await cookies();
    const canViewPhones = await canViewSensitivePlayerData(
      jar.get(ADMIN_COOKIE)?.value,
      jar.get(PLAYER_COOKIE)?.value
    );

    if (!canViewPhones) {
      return NextResponse.json(
        { error: "Password richiesta", requiresAuth: true },
        { status: 401 }
      );
    }

    return NextResponse.json(opponents);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Errore nel caricamento avversari";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
