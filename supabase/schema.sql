-- ============================================================
--  Audio-Web-App – Datenbankschema
--  Ausfuehren im Supabase SQL Editor (oder via MCP apply_migration).
-- ============================================================

-- --- Tracks (die Audiodateien) -------------------------------
create table if not exists public.tracks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  storage_path text not null,
  mime         text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists tracks_sort_idx on public.tracks (sort_order);

-- --- App-Konfiguration + Secrets (Passwort-Hash, Video-URL …) -
-- Wird NUR serverseitig mit dem service_role-Key gelesen/geschrieben.
create table if not exists public.app_config (
  key   text primary key,
  value text
);

-- --- Row Level Security --------------------------------------
-- RLS aktiv + KEINE Policies => anon/authenticated kommen NICHT ran.
-- Der Server nutzt den service_role-Key und umgeht RLS bewusst.
alter table public.tracks     enable row level security;
alter table public.app_config enable row level security;

-- Startwerte fuer die oeffentliche Seite (optional anpassbar im Editor)
insert into public.app_config (key, value) values
  ('heading', 'Meine Audios')
on conflict (key) do nothing;

-- ============================================================
--  Storage-Bucket 'audio' (oeffentlich lesbar, damit die Audios
--  ueber den Permalink abspielbar sind). Uploads laufen nur
--  serverseitig ueber den service_role-Key.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('audio', 'audio', true)
on conflict (id) do update set public = true;
