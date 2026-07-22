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

  return (
    <main className="wrap wrap-single">
      <div className="brand">
        <span className="dot" /> {item.kind === "video" ? "Video" : "Audio"}
      </div>
      <h1 className="title">{item.title}</h1>

      {item.kind === "video" ? (
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

      <div className="footer">Privat geteilt · nur über diesen Link erreichbar</div>
    </main>
  );
}
