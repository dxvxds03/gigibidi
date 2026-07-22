import { notFound } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getServiceClient, Track } from "@/lib/supabase";
import AdminApp from "./AdminApp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const expected = process.env.ADMIN_SLUG;
  if (!expected || slug !== expected) notFound();

  const authed = await isAuthenticated();

  let tracks: Track[] = [];
  let config = { heading: "", intro: "", video_url: "" };

  if (authed) {
    const supabase = getServiceClient();
    const [{ data: tracksData }, { data: configRows }] = await Promise.all([
      supabase.from("tracks").select("*").order("sort_order", { ascending: true }),
      supabase.from("app_config").select("key,value"),
    ]);
    tracks = (tracksData ?? []) as Track[];
    const cfg = new Map((configRows ?? []).map((r: any) => [r.key, r.value]));
    config = {
      heading: cfg.get("heading") || "",
      intro: cfg.get("intro") || "",
      video_url: cfg.get("video_url") || "",
    };
  }

  return (
    <AdminApp
      authed={authed}
      slug={slug}
      publicSlug={process.env.PUBLIC_SLUG || ""}
      initialTracks={tracks}
      initialConfig={config}
    />
  );
}
