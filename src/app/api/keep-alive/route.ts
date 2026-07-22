import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Wird 1x taeglich vom Vercel-Cron aufgerufen (siehe vercel.json).
 * Fuehrt eine leichte Query aus, damit das Supabase-Projekt als aktiv gilt
 * und nicht automatisch pausiert wird.
 */
export async function GET(req: Request) {
  const required = process.env.CRON_SECRET;
  if (required) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${required}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const supabase = getServiceClient();
    // Schreibenden Heartbeat setzen -> haelt DB nachweislich aktiv.
    const stamp = new Date().toISOString();
    await supabase
      .from("app_config")
      .upsert({ key: "last_keepalive", value: stamp }, { onConflict: "key" });

    const { count } = await supabase
      .from("tracks")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({ ok: true, at: stamp, tracks: count ?? 0 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "error" },
      { status: 500 }
    );
  }
}
