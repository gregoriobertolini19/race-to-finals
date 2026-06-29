import { NextResponse } from "next/server";
import { recordResult } from "@/lib/challenges";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { winnerId, score } = await request.json();
    const challenge = await recordResult(parseInt(id, 10), winnerId, score);
    return NextResponse.json(challenge);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
