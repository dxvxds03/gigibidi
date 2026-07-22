import { NextResponse } from "next/server";
import crypto from "crypto";
import { isAuthenticated } from "@/lib/auth";
import { MEDIA_BUCKET, getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

// Erzeugt eine signierte Upload-URL, damit der Browser die (evtl. grosse)
// Datei DIREKT zu Supabase Storage hochlaedt (umgeht das 4.5 MB Limit von
// Vercel-Serverless-Funktionen).
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const filename = String(body?.filename ?? "");
  const dot = filename.lastIndexOf(".");
  const ext =
    dot >= 0
      ? filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "")
      : "bin";
  const path = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext || "bin"}`;

  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Signieren fehlgeschlagen." },
      { status: 500 }
    );
  }

  // signedUrl kann relativ oder absolut sein -> immer absolut zurueckgeben.
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  let signedUrl = data.signedUrl;
  if (!/^https?:\/\//.test(signedUrl)) {
    signedUrl = `${base}${signedUrl.startsWith("/") ? "" : "/"}${signedUrl}`;
  }

  return NextResponse.json({ signedUrl, path, token: data.token });
}
