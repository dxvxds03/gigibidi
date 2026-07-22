"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Track } from "@/lib/supabase";

type Config = { heading: string; intro: string; video_url: string };

export default function AdminApp({
  authed,
  slug,
  publicSlug,
  initialTracks,
  initialConfig,
}: {
  authed: boolean;
  slug: string;
  publicSlug: string;
  initialTracks: Track[];
  initialConfig: Config;
}) {
  if (!authed) return <Login slug={slug} />;
  return (
    <Dashboard
      slug={slug}
      publicSlug={publicSlug}
      initialTracks={initialTracks}
      initialConfig={initialConfig}
    />
  );
}

function Login({ slug }: { slug: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password, slug }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      if (data.bootstrapped) {
        setHint("Passwort wurde gesetzt. Du wirst eingeloggt …");
      }
      router.refresh();
    } else {
      setErr(data.error || "Login fehlgeschlagen.");
    }
  }

  return (
    <div className="center-screen">
      <div className="login-box">
        <div className="brand">
          <span className="dot" /> Bearbeitung
        </div>
        <h1 className="title" style={{ fontSize: 30, marginBottom: 18 }}>
          Anmelden
        </h1>
        {err ? <div className="notice err">{err}</div> : null}
        {hint ? <div className="notice ok">{hint}</div> : null}
        <form onSubmit={submit} className="card">
          <div className="field">
            <label htmlFor="pw">Passwort</label>
            <input
              id="pw"
              type="password"
              value={password}
              autoFocus
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={busy || !password}>
            {busy ? "Prüfe …" : "Einloggen"}
          </button>
          <p className="muted" style={{ marginTop: 14 }}>
            Beim allerersten Login wird das eingegebene Passwort als neues
            Passwort gespeichert.
          </p>
        </form>
      </div>
    </div>
  );
}

function Dashboard({
  slug,
  publicSlug,
  initialTracks,
  initialConfig,
}: {
  slug: string;
  publicSlug: string;
  initialTracks: Track[];
  initialConfig: Config;
}) {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [config, setConfig] = useState<Config>(initialConfig);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );

  // upload state
  const [newTitle, setNewTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  function flash(kind: "ok" | "err", text: string) {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function refreshTracks() {
    const res = await fetch("/api/tracks");
    if (res.ok) setTracks(await res.json());
  }

  function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !newTitle.trim()) return;
    const fd = new FormData();
    fd.append("title", newTitle.trim());
    fd.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/tracks");
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadPct(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      setUploadPct(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        setNewTitle("");
        setFile(null);
        (document.getElementById("file") as HTMLInputElement).value = "";
        flash("ok", "Audio hochgeladen.");
        refreshTracks();
      } else {
        let e = "Upload fehlgeschlagen.";
        try {
          e = JSON.parse(xhr.responseText).error || e;
        } catch {}
        flash("err", e);
      }
    };
    xhr.onerror = () => {
      setUploadPct(null);
      flash("err", "Netzwerkfehler beim Upload.");
    };
    setUploadPct(0);
    xhr.send(fd);
  }

  async function saveTitle(id: string, title: string) {
    const res = await fetch(`/api/tracks/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) flash("ok", "Titel gespeichert.");
    else flash("err", "Speichern fehlgeschlagen.");
  }

  async function remove(id: string) {
    if (!confirm("Dieses Audio wirklich löschen?")) return;
    const res = await fetch(`/api/tracks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTracks((t) => t.filter((x) => x.id !== id));
      flash("ok", "Gelöscht.");
    } else flash("err", "Löschen fehlgeschlagen.");
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = tracks.findIndex((t) => t.id === id);
    const target = idx + dir;
    if (target < 0 || target >= tracks.length) return;
    const reordered = [...tracks];
    const [item] = reordered.splice(idx, 1);
    reordered.splice(target, 0, item);
    setTracks(reordered);
    await fetch("/api/tracks", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: reordered.map((t) => t.id) }),
    });
  }

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(config),
    });
    if (res.ok) flash("ok", "Einstellungen gespeichert.");
    else flash("err", "Speichern fehlgeschlagen.");
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <main className="wrap">
      <div className="spread" style={{ marginBottom: 26 }}>
        <div>
          <div className="brand">
            <span className="dot" /> Bearbeitung
          </div>
          <h1 className="title" style={{ fontSize: 36, margin: 0 }}>
            Audio verwalten
          </h1>
        </div>
        <div className="row">
          {publicSlug ? (
            <a className="btn ghost" href={`/v/${publicSlug}`} target="_blank">
              Öffentliche Seite ↗
            </a>
          ) : null}
          <button className="ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {msg ? <div className={`notice ${msg.kind}`}>{msg.text}</div> : null}

      {/* Upload */}
      <div className="card">
        <h3>Neues Audio hochladen</h3>
        <form onSubmit={upload}>
          <div className="field">
            <label htmlFor="title">Überschrift</label>
            <input
              id="title"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="z.B. Kapitel 1 – Einleitung"
            />
          </div>
          <div className="field">
            <label htmlFor="file">Audiodatei (mp3, m4a, wav, ogg …)</label>
            <input
              id="file"
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {uploadPct !== null ? (
            <div className="progress">
              <span style={{ width: `${uploadPct}%` }} />
            </div>
          ) : null}
          <div style={{ marginTop: 14 }}>
            <button type="submit" disabled={!file || !newTitle.trim() || uploadPct !== null}>
              {uploadPct !== null ? `Lädt … ${uploadPct}%` : "Hochladen"}
            </button>
          </div>
        </form>
      </div>

      {/* Track list */}
      <div className="card">
        <h3>Vorhandene Audios ({tracks.length})</h3>
        {tracks.length === 0 ? (
          <p className="muted">Noch nichts hochgeladen.</p>
        ) : (
          tracks.map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              first={i === 0}
              last={i === tracks.length - 1}
              onSave={saveTitle}
              onDelete={remove}
              onMove={move}
            />
          ))
        )}
      </div>

      {/* Site config */}
      <div className="card">
        <h3>Seiten-Einstellungen</h3>
        <form onSubmit={saveConfig}>
          <div className="field">
            <label htmlFor="heading">Überschrift der Seite</label>
            <input
              id="heading"
              type="text"
              value={config.heading}
              onChange={(e) => setConfig({ ...config, heading: e.target.value })}
              placeholder="Meine Audios"
            />
          </div>
          <div className="field">
            <label htmlFor="intro">Kurzer Einleitungstext (optional)</label>
            <textarea
              id="intro"
              rows={2}
              value={config.intro}
              onChange={(e) => setConfig({ ...config, intro: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="video">Video-Link (YouTube, Vimeo oder .mp4 – optional)</label>
            <input
              id="video"
              type="url"
              value={config.video_url}
              onChange={(e) => setConfig({ ...config, video_url: e.target.value })}
              placeholder="https://youtu.be/…"
            />
          </div>
          <button type="submit">Einstellungen speichern</button>
        </form>
      </div>

      {/* Password */}
      <ChangePassword flash={flash} />
    </main>
  );
}

function TrackRow({
  track,
  first,
  last,
  onSave,
  onDelete,
  onMove,
}: {
  track: Track;
  first: boolean;
  last: boolean;
  onSave: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const [title, setTitle] = useState(track.title);
  const dirty = title !== track.title;
  return (
    <div className="admin-track">
      <div className="order-btns">
        <button onClick={() => onMove(track.id, -1)} disabled={first} title="Nach oben">
          ▲
        </button>
        <button onClick={() => onMove(track.id, 1)} disabled={last} title="Nach unten">
          ▼
        </button>
      </div>
      <div className="grow">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <button
        className="small"
        onClick={() => onSave(track.id, title.trim())}
        disabled={!dirty || !title.trim()}
      >
        Speichern
      </button>
      <button className="small danger" onClick={() => onDelete(track.id)}>
        Löschen
      </button>
    </div>
  );
}

function ChangePassword({
  flash,
}: {
  flash: (kind: "ok" | "err", text: string) => void;
}) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (res.ok) {
      setPw("");
      flash("ok", "Passwort geändert.");
    } else {
      const d = await res.json().catch(() => ({}));
      flash("err", d.error || "Passwort ändern fehlgeschlagen.");
    }
  }
  return (
    <div className="card">
      <h3>Passwort ändern</h3>
      <form onSubmit={save} className="row" style={{ alignItems: "flex-end" }}>
        <div className="grow" style={{ flex: 1 }}>
          <label htmlFor="np">Neues Passwort (min. 6 Zeichen)</label>
          <input
            id="np"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
        </div>
        <button type="submit" disabled={busy || pw.trim().length < 6}>
          Ändern
        </button>
      </form>
    </div>
  );
}
