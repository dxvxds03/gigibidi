import { notFound } from "next/navigation";
import Link from "next/link";
import { getServiceClient, Track, SiteConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Optionale Gesamt-Uebersicht aller Medien mit Links zu den Einzelseiten.
export default async function OverviewPage({
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
    heading: cfgMap.get("heading") || "Meine Medien",
    intro: cfgMap.get("intro") || null,
  };

  return (
    <main className="wrap">
      <div className="brand">
        <span className="dot" /> Übersicht
      </div>
      <h1 className="title">{config.heading}</h1>
      {config.intro ? <p className="intro">{config.intro}</p> : null}

      <div className="section-label">
        {tracks.length} {tracks.length === 1 ? "Eintrag" : "Einträge"}
      </div>

      {tracks.length === 0 ? (
        <div className="empty">Noch keine Medien vorhanden.</div>
      ) : (
        tracks.map((t) => (
          <Link className="track track-link" key={t.id} href={`/m/${t.slug}`}>
            <span className={`kind kind-${t.kind}`}>
              {t.kind === "video" ? "▶ Video" : "♪ Audio"}
            </span>
            <span className="track-title">{t.title}</span>
            <span className="track-go">Öffnen →</span>
          </Link>
        ))
      )}

      <div className="footer">Privat geteilt · nur über diesen Link erreichbar</div>
    </main>
  );
}
