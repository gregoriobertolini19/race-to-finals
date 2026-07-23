import { NextResponse } from "next/server";
import {
  createTournament,
  getTournaments,
} from "@/lib/tournaments";

export async function GET() {
  try {
    const tournaments = await getTournaments();
    return NextResponse.json({
      tournaments,
      active: tournaments.filter((t) => t.status === "active"),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore database";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, endDate, playerIds } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome obbligatorio" }, { status: 400 });
    }
    const tournament = await createTournament(name, endDate, playerIds);
    return NextResponse.json(tournament, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
