import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { AUDIO_BUCKET, getServiceClient, Track } from "@/lib/supabase";

export const runtime = "nodejs";

// Liste aller Tracks (nur fuer den Editor; die oeffentliche Seite laedt direkt serverseitig).
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

function safeName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext || "bin"}`;
}

// Upload eines neuen Audios (multipart/form-data: title, file).
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  const file = form.get("file");

  if (!title) return NextResponse.json({ error: "Titel fehlt." }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Datei fehlt." }, { status: 400 });
  }

  const supabase = getServiceClient();
  const path = safeName(file.name || "audio");
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // ans Ende sortieren
  const { data: maxRow } = await supabase
    .from("tracks")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("tracks")
    .insert({
      title,
      storage_path: path,
      mime: file.type || null,
      sort_order: nextOrder,
    })
    .select("*")
    .single();

  if (error) {
    // Rollback der Datei bei DB-Fehler
    await supabase.storage.from(AUDIO_BUCKET).remove([path]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
