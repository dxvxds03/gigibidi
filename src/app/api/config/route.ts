import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

const KEYS = ["heading", "intro", "video_url"] as const;

export async function PATCH(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const rows = KEYS.map((key) => ({
    key,
    value: String(body?.[key] ?? "").trim(),
  }));

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("app_config")
    .upsert(rows, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
