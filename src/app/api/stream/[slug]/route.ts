import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liefert ein privates Vercel-Blob-Video aus: holt es serverseitig mit dem
// Read-Write-Token und reicht es (inkl. Range/Seeking) an den Browser durch.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = getServiceClient();
  const { data } = await supabase
    .from("tracks")
    .select("url, storage, mime")
    .eq("slug", slug)
    .maybeSingle();

  if (!data || data.storage !== "blob" || !data.url) {
    return new Response("Not found", { status: 404 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return new Response("Blob nicht konfiguriert", { status: 500 });

  const range = req.headers.get("range");
  const upstream = await fetch(data.url, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(range ? { Range: range } : {}),
    },
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`Blob-Fehler ${upstream.status}`, { status: 502 });
  }

  const headers = new Headers();
  for (const h of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
  ]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!headers.has("content-type")) {
    headers.set("content-type", data.mime || "video/mp4");
  }
  if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "private, max-age=3600");

  return new Response(upstream.body, { status: upstream.status, headers });
}
