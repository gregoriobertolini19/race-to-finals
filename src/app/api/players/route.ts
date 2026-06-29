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
    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome obbligatorio" }, { status: 400 });
    }
    const player = await addPlayer(name);
    return NextResponse.json(player, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
