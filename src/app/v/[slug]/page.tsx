import { notFound } from "next/navigation";
import { getServiceClient, publicAudioUrl, Track, SiteConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toEmbed(url: string): { kind: "iframe" | "video"; src: string } {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${id}` };
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${id}` };
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` };
    }
    if (/\.(mp4|webm|ogg|mov)$/i.test(u.pathname)) {
      return { kind: "video", src: url };
    }
    return { kind: "iframe", src: url };
  } catch {
    return { kind: "iframe", src: url };
  }
}

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const expected = process.env.PUBLIC_SLUG;
  if (!expected || slug !== expected) notFound();

  const supabase = getServiceClient();

  const [{ data: tracksData }, { data: configRows }] = await Promise.all([
    supabase.from("tracks").select("*").order("sort_order", { ascending: true }),
    supabase.from("app_config").select("key,value"),
  ]);

  const tracks = (tracksData ?? []) as Track[];
  const cfgMap = new Map((configRows ?? []).map((r: any) => [r.key, r.value]));
  const config: SiteConfig = {
    heading: cfgMap.get("heading") || "Meine Audios",
    intro: cfgMap.get("intro") || null,
    video_url: cfgMap.get("video_url") || null,
  };

  const video = config.video_url ? toEmbed(config.video_url) : null;

  return (
    <main className="wrap">
      <div className="brand">
        <span className="dot" /> Audio Collection
      </div>
      <h1 className="title">{config.heading}</h1>
      {config.intro ? <p className="intro">{config.intro}</p> : null}

      {video ? (
        <div className="video-frame">
          {video.kind === "iframe" ? (
            <iframe
              src={video.src}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Video"
            />
          ) : (
            <video src={video.src} controls playsInline />
          )}
        </div>
      ) : null}

      <div className="section-label">Tracks</div>

      {tracks.length === 0 ? (
        <div className="empty">Noch keine Audios vorhanden.</div>
      ) : (
        tracks.map((t) => (
          <article className="track" key={t.id}>
            <h2>{t.title}</h2>
            <audio controls preload="none" src={publicAudioUrl(t.storage_path)}>
              Dein Browser unterstützt kein Audio.
            </audio>
          </article>
        ))
      )}

      <div className="footer">Privat geteilt · nur über diesen Link erreichbar</div>
    </main>
  );
}
