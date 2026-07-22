import { notFound } from "next/navigation";
import { getServiceClient, publicMediaUrl, Track } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  const src = publicMediaUrl(item.storage_path);

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
