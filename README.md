# Gigibidi – privater Audio-Player

Eine kleine Web-App zum Hochladen von Audiodateien, die dann für **jeden mit dem
geheimen Link** abspielbar sind – inklusive optionalem Video. Ein zweiter
geheimer Link führt zum **passwortgeschützten Editor**, über den Audios
eingepflegt und bearbeitet werden.

- **Framework:** Next.js (App Router) · Grotesk-Schrift (Space Grotesk) · Blauton-Design
- **Hosting:** Vercel
- **Datenbank + Datei-Speicher:** Supabase (Postgres + Storage)
- **Keep-alive:** täglicher Vercel-Cron, damit das Supabase-Projekt nicht pausiert

## Zwei Links (Permalinks)

| Zweck | Pfad |
| --- | --- |
| Öffentliche Audio-Seite (zum Anhören) | `/v/<PUBLIC_SLUG>` |
| Editor (Audios verwalten, passwortgeschützt) | `/a/<ADMIN_SLUG>` |

Die Startseite `/` und alle anderen Pfade liefern bewusst **404** – erreichbar
ist die App nur über diese beiden geheimen Links.

## Environment-Variablen

Siehe `.env.example`. Auf Vercel unter **Project → Settings → Environment Variables**:

| Variable | Beschreibung |
| --- | --- |
| `SUPABASE_URL` | Projekt-URL aus Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-Role-Key (nur serverseitig!) |
| `PUBLIC_SLUG` | geheimer Pfad der öffentlichen Seite |
| `ADMIN_SLUG` | geheimer Pfad des Editors |
| `SESSION_SECRET` | zufälliger String zum Signieren der Login-Cookies |
| `CRON_SECRET` | optional; schützt den Keep-alive-Endpunkt |

## Passwort für den Editor

Das Editor-Passwort liegt **in Supabase** (Tabelle `app_config`,
Schlüssel `admin_password_hash`) – gespeichert wird nur ein SHA-256-Hash.
Beim **allerersten Login** über den geheimen Admin-Link wird das eingegebene
Passwort als neues Passwort gesetzt. Danach lässt es sich im Editor jederzeit
ändern.

## Setup (Kurzfassung)

1. Supabase-Projekt anlegen, `supabase/schema.sql` im SQL-Editor ausführen.
2. Repo mit Vercel verbinden, obige Environment-Variablen setzen, deployen.
3. Editor öffnen (`/a/<ADMIN_SLUG>`), Passwort setzen, Audios hochladen.

## Lokale Entwicklung

```bash
npm install
cp .env.example .env.local   # Werte eintragen
npm run dev
```
