import { NextResponse } from "next/server";
import {
  addPlayersToTournament,
  completeTournament,
  getTournamentById,
  getTournamentEntries,
  removePlayerFromTournament,
  setTournamentOrder,
  startTournament,
} from "@/lib/tournaments";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tournamentId = parseInt(id, 10);
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) {
    return NextResponse.json({ error: "Torneo non trovato" }, { status: 404 });
  }
  const entries = await getTournamentEntries(tournamentId);
  return NextResponse.json({ tournament, entries });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    const body = await request.json();

    if (body.action === "addPlayers") {
      await addPlayersToTournament(tournamentId, body.playerIds);
      return NextResponse.json({
        tournament: await getTournamentById(tournamentId),
        entries: await getTournamentEntries(tournamentId),
      });
    }

    if (body.action === "removePlayer") {
      await removePlayerFromTournament(tournamentId, body.playerId);
      return NextResponse.json({
        tournament: await getTournamentById(tournamentId),
        entries: await getTournamentEntries(tournamentId),
      });
    }

    if (body.action === "setOrder") {
      await setTournamentOrder(tournamentId, body.orderedPlayerIds);
      return NextResponse.json({
        tournament: await getTournamentById(tournamentId),
        entries: await getTournamentEntries(tournamentId),
      });
    }

    if (body.action === "start") {
      const tournament = await startTournament(tournamentId);
      return NextResponse.json({
        tournament,
        entries: await getTournamentEntries(tournamentId),
      });
    }

    if (body.action === "complete") {
      const tournament = await completeTournament(tournamentId);
      return NextResponse.json({ tournament });
    }

    return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
