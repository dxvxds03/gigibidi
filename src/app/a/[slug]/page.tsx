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

  if (authed) {
    const supabase = getServiceClient();
    const { data: tracksData } = await supabase
      .from("tracks")
      .select("*")
      .order("sort_order", { ascending: true });
    tracks = (tracksData ?? []) as Track[];
  }

  return (
    <AdminApp
      authed={authed}
      slug={slug}
      publicSlug={process.env.PUBLIC_SLUG || ""}
      initialTracks={tracks}
    />
  );
}
