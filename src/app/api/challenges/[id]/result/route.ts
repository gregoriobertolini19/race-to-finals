import { NextResponse } from "next/server";
import {
  recordResult,
  revertChallengeResult,
  updateChallengeResult,
} from "@/lib/challenges";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { winnerId, score } = await request.json();
    if (!winnerId) {
      return NextResponse.json(
        { error: "Seleziona il vincitore" },
        { status: 400 }
      );
    }
    const challenge = await recordResult(parseInt(id, 10), winnerId, score);
    return NextResponse.json(challenge);
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
    const { winnerId, score } = await request.json();
    if (!winnerId) {
      return NextResponse.json(
        { error: "Seleziona il vincitore" },
        { status: 400 }
      );
    }
    const challenge = await updateChallengeResult(
      parseInt(id, 10),
      winnerId,
      score
    );
    return NextResponse.json(challenge);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const challenge = await revertChallengeResult(parseInt(id, 10));
    return NextResponse.json(challenge);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
