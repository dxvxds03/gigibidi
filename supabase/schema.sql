-- ============================================================
--  Audio/Video-Web-App – Datenbankschema
--  Jedes Medium hat einen eigenen Permalink (slug) + eigene Unterseite.
-- ============================================================

-- --- Medien (Audio + Video) ----------------------------------
create table if not exists public.tracks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text,                              -- eigener Permalink /m/<slug>
  kind         text not null default 'audio',     -- 'audio' | 'video'
  storage_path text not null,
  mime         text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists tracks_sort_idx on public.tracks (sort_order);
create unique index if not exists tracks_slug_key on public.tracks (slug);

-- --- App-Konfiguration + Secrets (Passwort-Hash, Überschrift) -
create table if not exists public.app_config (
  key   text primary key,
  value text
);

-- --- Row Level Security --------------------------------------
-- RLS aktiv + KEINE Policies => anon/authenticated kommen NICHT ran.
-- Der Server nutzt den service_role-Key und umgeht RLS bewusst.
alter table public.tracks     enable row level security;
alter table public.app_config enable row level security;

insert into public.app_config (key, value) values
  ('heading', 'Meine Medien')
on conflict (key) do nothing;

-- ============================================================
--  Storage-Bucket 'audio' (haelt Audios UND Videos, oeffentlich
--  lesbar fuer die Permalinks). Datei-Limit 50 MB (Free-Tier-Max).
--  Uploads laufen direkt vom Browser via signierter Upload-URL.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('audio', 'audio', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;
