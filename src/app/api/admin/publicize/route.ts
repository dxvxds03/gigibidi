import { NextResponse } from "next/server";
import { copy } from "@vercel/blob";
import { isAuthenticated } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmal-Aktion (eingeloggt aufrufen): kopiert alle privaten Blob-Videos in
// oeffentliche Blobs (dauerhafte URL, native Wiedergabe) und aktualisiert die DB.
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const supabase = getServiceClient();
  const { data: rows } = await supabase
    .from("tracks")
    .select("id, slug, title, url, storage_path, storage")
    .eq("storage", "blob");

  const results: any[] = [];
  for (const r of rows ?? []) {
    if (!r.url) {
      results.push({ slug: r.slug, ok: false, error: "keine URL" });
      continue;
    }
    try {
      const dest = `public/${r.slug}.mp4`;
      const pub = await copy(r.url, dest, {
        access: "public",
        addRandomSuffix: false,
        contentType: "video/mp4",
      });
      await supabase
        .from("tracks")
        .update({ storage: "blob-public", url: pub.url, storage_path: pub.pathname })
        .eq("id", r.id);
      results.push({ slug: r.slug, ok: true, url: pub.url });
    } catch (e: any) {
      results.push({ slug: r.slug, ok: false, error: e?.message ?? String(e) });
    }
  }

  return NextResponse.json({ count: results.length, results });
}
