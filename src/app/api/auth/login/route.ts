import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  createSessionToken,
  isAuthConfigured,
  SESSION_MS,
  verifyPin,
} from "@/lib/auth";

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Login non configurato (ADMIN_PIN / AUTH_SECRET)" },
      { status: 500 }
    );
  }

  let body: { pin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const pin = body.pin?.trim() ?? "";
  if (!pin) {
    return NextResponse.json({ error: "Inserisci il PIN" }, { status: 400 });
  }

  if (!verifyPin(pin)) {
    return NextResponse.json({ error: "PIN non corretto" }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_MS / 1000),
  });

  return response;
}
