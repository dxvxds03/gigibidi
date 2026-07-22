import { NextResponse } from "next/server";
import { isAuthenticated, setPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const ok = await setPassword(String(body?.password ?? ""));
  if (!ok) {
    return NextResponse.json(
      { error: "Passwort muss mindestens 6 Zeichen haben." },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
