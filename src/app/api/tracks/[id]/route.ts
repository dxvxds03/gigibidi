import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { AUDIO_BUCKET, getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Titel fehlt." }, { status: 400 });

  const supabase = getServiceClient();
  const { error } = await supabase.from("tracks").update({ title }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const { id } = await params;
  const supabase = getServiceClient();

  const { data: row } = await supabase
    .from("tracks")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("tracks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (row?.storage_path) {
    await supabase.storage.from(AUDIO_BUCKET).remove([row.storage_path]);
  }
  return NextResponse.json({ ok: true });
}
