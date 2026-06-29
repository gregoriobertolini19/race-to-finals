import { NextResponse } from "next/server";
import {
  addPlayerToRunningTournament,
  getTournamentEntries,
  requirePlayableTournament,
  requireTournament,
  setStandby,
} from "@/lib/tournaments";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tournamentId = parseInt(id, 10);
  const tournament = await requireTournament(tournamentId);

  if (tournament.status === "draft") {
    return NextResponse.json({ tournament, entries: [] });
  }

  return NextResponse.json({
    tournament,
    entries: await getTournamentEntries(tournamentId),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    const { playerId } = await request.json();
    const entry = await addPlayerToRunningTournament(tournamentId, playerId);
    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    await requirePlayableTournament(tournamentId);

    const { playerId, enable } = await request.json();
    const entry = await setStandby(tournamentId, playerId, enable);
    return NextResponse.json(entry);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
