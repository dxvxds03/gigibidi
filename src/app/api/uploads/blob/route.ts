import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

// Erzeugt Client-Upload-Tokens fuer Vercel Blob (grosse Videos gehen direkt
// vom Browser zu Blob, an Vercel/Supabase-Limits vorbei). Nur fuer eingeloggte
// Admins.
export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        if (!(await isAuthenticated())) {
          throw new Error("Nicht angemeldet.");
        }
        return {
          allowedContentTypes: ["video/*"],
          addRandomSuffix: true,
          maximumSizeInBytes: 600 * 1024 * 1024, // 600 MB
        };
      },
      onUploadCompleted: async () => {
        // Der Datenbank-Eintrag wird separat ueber /api/tracks angelegt.
      },
    });
    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Blob-Upload fehlgeschlagen." },
      { status: 400 }
    );
  }
}
