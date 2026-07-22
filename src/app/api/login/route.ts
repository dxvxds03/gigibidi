import { NextResponse } from "next/server";
import { COOKIE, createSessionToken, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  // Slug muss zum geheimen Admin-Link passen.
  if (!process.env.ADMIN_SLUG || body?.slug !== process.env.ADMIN_SLUG) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 });
  }

  const { ok, bootstrapped } = await verifyPassword(String(body?.password ?? ""));
  if (!ok) {
    return NextResponse.json({ error: "Falsches Passwort." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, bootstrapped });
  res.cookies.set(COOKIE.name, createSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE.ttl,
  });
  return res;
}
