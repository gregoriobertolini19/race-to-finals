import { NextResponse } from "next/server";
import { deleteChallenge } from "@/lib/challenges";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteChallenge(parseInt(id, 10));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
