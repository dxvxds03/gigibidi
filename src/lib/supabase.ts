import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service-role key.
 * NEVER import this into a client component.
 */
let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase ist nicht konfiguriert. Bitte SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY setzen."
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

// Bucket haelt Audios UND Videos (oeffentlich lesbar fuer die Permalinks).
export const MEDIA_BUCKET = "audio";

export function publicMediaUrl(storagePath: string): string {
  const url = process.env.SUPABASE_URL ?? "";
  return `${url}/storage/v1/object/public/${MEDIA_BUCKET}/${storagePath}`;
}

export type MediaKind = "audio" | "video";

export type MediaStorage = "supabase" | "blob" | "blob-public";

export type Track = {
  id: string;
  title: string;
  slug: string;
  kind: MediaKind;
  storage: MediaStorage;
  url: string | null;
  storage_path: string;
  mime: string | null;
  sort_order: number;
  created_at: string;
};

export type SiteConfig = {
  heading: string;
  intro: string | null;
};
