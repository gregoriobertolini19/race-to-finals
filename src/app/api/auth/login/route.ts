import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  createSessionToken,
  isAuthConfigured,
  SESSION_MS,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Login non configurato (ADMIN_PASSWORD / AUTH_SECRET)" },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const password = body.password ?? "";
  if (!password) {
    return NextResponse.json(
      { error: "Inserisci la password" },
      { status: 400 }
    );
  }

  if (!verifyPassword(password)) {
    return NextResponse.json(
      { error: "Password non corretta" },
      { status: 401 }
    );
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
