import { NextResponse } from "next/server";
import crypto from "crypto";
import { isAuthenticated } from "@/lib/auth";
import { getServiceClient, Track } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []) as Track[]);
}

// Legt einen neuen Eintrag an, NACHDEM die Datei bereits direkt zu Supabase
// hochgeladen wurde. Generiert automatisch einen eigenen Permalink-Slug.
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? "").trim();
  const storage_path = String(body?.storage_path ?? "").trim();
  const kind = body?.kind === "video" ? "video" : "audio";
  const mime = body?.mime ? String(body.mime) : null;

  if (!title) return NextResponse.json({ error: "Titel fehlt." }, { status: 400 });
  if (!storage_path)
    return NextResponse.json({ error: "Datei-Pfad fehlt." }, { status: 400 });

  const supabase = getServiceClient();

  const { data: maxRow } = await supabase
    .from("tracks")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const slug = crypto.randomBytes(9).toString("hex");

  const { data, error } = await supabase
    .from("tracks")
    .insert({ title, slug, kind, storage_path, mime, sort_order: nextOrder })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as Track, { status: 201 });
}

// Reihenfolge aktualisieren ({ order: [id, id, ...] }).
export async function PATCH(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const order = body?.order;
  if (!Array.isArray(order)) {
    return NextResponse.json({ error: "Ungültige Reihenfolge." }, { status: 400 });
  }
  const supabase = getServiceClient();
  await Promise.all(
    order.map((id: string, i: number) =>
      supabase.from("tracks").update({ sort_order: i }).eq("id", id)
    )
  );
  return NextResponse.json({ ok: true });
}
