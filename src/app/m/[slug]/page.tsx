import { notFound } from "next/navigation";
import { issueSignedToken, presignUrl } from "@vercel/blob";
import { getServiceClient, publicMediaUrl, Track } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Fuer private Vercel-Blob-Dateien serverseitig eine kurzlebige, signierte
// Wiedergabe-URL erzeugen (Browser streamt direkt vom Blob-CDN, mit Seeking).
async function resolveSrc(item: Track): Promise<string> {
  if (item.storage === "blob") {
    const pathname = item.storage_path;
    const validUntil = Date.now() + 6 * 60 * 60 * 1000; // 6 Stunden
    const token = await issueSignedToken({
      pathname,
      operations: ["get"],
      validUntil,
    });
    const { presignedUrl } = await presignUrl(token, {
      operation: "get",
      pathname,
      access: "private",
      validUntil,
    });
    return presignedUrl;
  }
  return item.url ?? publicMediaUrl(item.storage_path);
}

// Eigene Unterseite fuer EIN einzelnes Medium (Audio oder Video),
// erreichbar unter dem eigenen Permalink /m/<slug>.
export default async function MediaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slug) notFound();

  const supabase = getServiceClient();
  const { data } = await supabase
    .from("tracks")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const item = data as Track | null;
  if (!item) notFound();

  const src = await resolveSrc(item);

  const isVideo = item.kind === "video";

  return (
    <>
      {/* Video-Seiten: Hintergrund schwarz, Lyrics-Muster bleibt sichtbar */}
      {isVideo ? (
        <style>{`:root{--bg:#000}.lyrics-bg-inner{opacity:.32}`}</style>
      ) : null}
      <main className="wrap wrap-single">
        <h1 className="title">{item.title}</h1>

        {isVideo ? (
          <div className="video-frame">
            <video src={src} controls playsInline preload="metadata" />
          </div>
        ) : (
          <div className="single-audio">
            <audio controls preload="none" src={src}>
              Dein Browser unterstützt kein Audio.
            </audio>
          </div>
        )}
      </main>
    </>
  );
}
