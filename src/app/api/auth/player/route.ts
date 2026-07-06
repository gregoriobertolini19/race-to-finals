import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  PLAYER_COOKIE,
  SESSION_MS,
  canViewSensitivePlayerData,
  createPlayerSessionToken,
  isPlayerAuthConfigured,
  verifyPlayerPassword,
} from "@/lib/auth";

export async function GET() {
  const jar = await cookies();
  const authenticated = await canViewSensitivePlayerData(
    jar.get(ADMIN_COOKIE)?.value,
    jar.get(PLAYER_COOKIE)?.value
  );

  return NextResponse.json({ authenticated });
}

export async function POST(request: Request) {
  if (!isPlayerAuthConfigured()) {
    return NextResponse.json(
      { error: "Accesso giocatori non configurato" },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const password = (body.password ?? "").trim();
  if (!password) {
    return NextResponse.json(
      { error: "Inserisci la password" },
      { status: 400 }
    );
  }

  if (!verifyPlayerPassword(password)) {
    return NextResponse.json(
      { error: "Password non corretta" },
      { status: 401 }
    );
  }

  const token = await createPlayerSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PLAYER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_MS / 1000),
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PLAYER_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
