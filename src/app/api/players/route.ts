import { NextResponse } from "next/server";
import { getAllPlayers, addPlayer } from "@/lib/players";

export async function GET() {
  try {
    return NextResponse.json(await getAllPlayers());
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore database";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { firstName, lastName, phone } = await request.json();
    if (!firstName?.trim()) {
      return NextResponse.json({ error: "Nome obbligatorio" }, { status: 400 });
    }
    if (!lastName?.trim()) {
      return NextResponse.json({ error: "Cognome obbligatorio" }, { status: 400 });
    }
    const player = await addPlayer(firstName, lastName, phone);
    return NextResponse.json(player, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
