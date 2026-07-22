"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Track } from "@/lib/supabase";

const VIDEO_EXT = ["mp4", "mov", "webm", "m4v", "ogv", "mkv"];

function detectKind(file: File): "audio" | "video" {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (VIDEO_EXT.includes(ext) || file.type.startsWith("video/")) return "video";
  return "audio";
}

export default function AdminApp({
  authed,
  slug,
  publicSlug,
  initialTracks,
}: {
  authed: boolean;
  slug: string;
  publicSlug: string;
  initialTracks: Track[];
}) {
  if (!authed) return <Login slug={slug} />;
  return <Dashboard publicSlug={publicSlug} initialTracks={initialTracks} />;
}

function Login({ slug }: { slug: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    if (res.ok) router.refresh();
    else setErr(data.error || "Login fehlgeschlagen.");
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
        </form>
      </div>
    </div>
  );
}

function Dashboard({
  publicSlug,
  initialTracks,
}: {
  publicSlug: string;
  initialTracks: Track[];
}) {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );

  const [newTitle, setNewTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  function flash(kind: "ok" | "err", text: string) {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 5000);
  }

  // Upload: Videos gehen zu Vercel Blob (grosse Dateien), Audios zu Supabase.
  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !newTitle.trim()) return;
    const kind = detectKind(file);

    try {
      setUploadPct(0);
      let commitBody: Record<string, unknown>;

      if (kind === "video") {
        // Vercel Blob – Direkt-Upload (Multipart, sehr grosse Dateien moeglich)
        const { upload: blobUpload } = await import("@vercel/blob/client");
        const blob = await blobUpload(file.name, file, {
          access: "private",
          handleUploadUrl: "/api/uploads/blob",
          multipart: true,
          contentType: file.type || undefined,
          onUploadProgress: (p) => setUploadPct(Math.round(p.percentage)),
        });
        commitBody = {
          title: newTitle.trim(),
          kind,
          storage: "blob",
          url: blob.url,
          storage_path: blob.pathname,
          mime: file.type || null,
        };
      } else {
        // Supabase – signierte Upload-URL, direkter PUT mit Fortschritt
        const signRes = await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ filename: file.name }),
        });
        if (!signRes.ok) throw new Error((await signRes.json()).error || "Signieren fehlgeschlagen.");
        const { signedUrl, path } = await signRes.json();

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", signedUrl);
          xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) setUploadPct(Math.round((ev.loaded / ev.total) * 100));
          };
          xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
              ? resolve()
              : reject(new Error(`Upload fehlgeschlagen (HTTP ${xhr.status}).`));
          xhr.onerror = () => reject(new Error("Netzwerkfehler beim Upload."));
          xhr.send(file);
        });

        commitBody = {
          title: newTitle.trim(),
          kind,
          storage: "supabase",
          storage_path: path,
          mime: file.type || null,
        };
      }

      // Eintrag anlegen (erzeugt den Permalink-Slug)
      const commitRes = await fetch("/api/tracks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(commitBody),
      });
      if (!commitRes.ok) throw new Error((await commitRes.json()).error || "Anlegen fehlgeschlagen.");
      const created: Track = await commitRes.json();

      setTracks((t) => [...t, created]);
      setNewTitle("");
      setFile(null);
      const el = document.getElementById("file") as HTMLInputElement | null;
      if (el) el.value = "";
      flash("ok", `${kind === "video" ? "Video" : "Audio"} hochgeladen – Permalink erstellt.`);
    } catch (err: any) {
      flash("err", err?.message || "Upload fehlgeschlagen.");
    } finally {
      setUploadPct(null);
    }
  }

  async function saveTitle(id: string, title: string) {
    const res = await fetch(`/api/tracks/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      setTracks((t) => t.map((x) => (x.id === id ? { ...x, title } : x)));
      flash("ok", "Titel gespeichert.");
    } else flash("err", "Speichern fehlgeschlagen.");
  }

  async function remove(id: string) {
    if (!confirm("Diesen Eintrag wirklich löschen? Der Permalink wird ungültig.")) return;
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
            Medien verwalten
          </h1>
        </div>
        <div className="row">
          {publicSlug ? (
            <a className="btn ghost" href={`/v/${publicSlug}`} target="_blank">
              Übersicht ↗
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
        <h3>Neues Audio / Video hochladen</h3>
        <form onSubmit={upload}>
          <div className="field">
            <label htmlFor="title">Überschrift</label>
            <input
              id="title"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="z.B. Grußwort von Oma"
            />
          </div>
          <div className="field">
            <label htmlFor="file">Datei (.m4a, .mp3, .mp4, .mov …)</label>
            <input
              id="file"
              type="file"
              accept="audio/*,video/*,.m4a,.mp4,.mov"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <p className="muted" style={{ marginTop: 8 }}>
                Erkannt als <strong>{detectKind(file) === "video" ? "Video" : "Audio"}</strong>{" "}
                · {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            ) : null}
          </div>
          {uploadPct !== null ? (
            <div className="progress">
              <span style={{ width: `${uploadPct}%` }} />
            </div>
          ) : null}
          <div style={{ marginTop: 14 }}>
            <button type="submit" disabled={!file || !newTitle.trim() || uploadPct !== null}>
              {uploadPct !== null ? `Lädt … ${uploadPct}%` : "Hochladen & Permalink erstellen"}
            </button>
          </div>
        </form>
      </div>

      {/* Liste */}
      <div className="card">
        <h3>Vorhandene Medien ({tracks.length})</h3>
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
              flash={flash}
            />
          ))
        )}
      </div>

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
  flash,
}: {
  track: Track;
  first: boolean;
  last: boolean;
  onSave: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  flash: (kind: "ok" | "err", text: string) => void;
}) {
  const [title, setTitle] = useState(track.title);
  const dirty = title !== track.title;
  const permalink =
    typeof window !== "undefined" ? `${window.location.origin}/m/${track.slug}` : `/m/${track.slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(permalink);
      flash("ok", "Permalink kopiert.");
    } catch {
      flash("err", "Kopieren nicht möglich.");
    }
  }

  return (
    <div className="admin-item">
      <div className="admin-item-top">
        <div className="order-btns">
          <button onClick={() => onMove(track.id, -1)} disabled={first} title="Nach oben">
            ▲
          </button>
          <button onClick={() => onMove(track.id, 1)} disabled={last} title="Nach unten">
            ▼
          </button>
        </div>
        <span className={`kind kind-${track.kind}`}>
          {track.kind === "video" ? "▶ Video" : "♪ Audio"}
        </span>
        <div className="grow">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
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
      <div className="permalink-row">
        <input type="text" readOnly value={permalink} onFocus={(e) => e.target.select()} />
        <button className="small" onClick={copy}>
          Kopieren
        </button>
        <a className="btn ghost small" href={`/m/${track.slug}`} target="_blank">
          Öffnen ↗
        </a>
      </div>
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
          <input id="np" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <button type="submit" disabled={busy || pw.trim().length < 6}>
          Ändern
        </button>
      </form>
    </div>
  );
}
