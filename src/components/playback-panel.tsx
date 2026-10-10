"use client";

import { ExternalLink, Film, Play, Radio, X } from "lucide-react";
import { useMemo, useState } from "react";

type PlaybackSource = {
  label: string;
  url: string;
};

type PlaybackSession = {
  status: "ready" | "unavailable" | "error";
  message?: string;
  sources?: PlaybackSource[];
  edge?: string;
  key?: string;
};

const panelStyle = {
  marginTop: "20px",
  border: "1px solid var(--media-border)",
  background: "rgba(8, 13, 20, .72)",
  borderRadius: "12px",
  padding: "16px",
} as const;

const videoStyle = {
  width: "100%",
  maxHeight: "min(62vh, 580px)",
  borderRadius: "10px",
  background: "#020617",
  display: "block",
} as const;

const sourceListStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "12px",
} as const;

const smallTextStyle = {
  color: "var(--muted)",
  fontSize: "11px",
  lineHeight: 1.7,
  marginTop: "10px",
} as const;

function isHls(url: string) {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return url.toLowerCase().includes(".m3u8");
  }
}

export function PlaybackPanel({ movieId, title }: { movieId: number; title: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<PlaybackSource[]>([]);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [edge, setEdge] = useState<string | null>(null);
  const activeSource = useMemo(() => sources.find((source) => source.url === activeUrl) ?? sources[0], [sources, activeUrl]);
  const activeIsHls = activeSource ? isHls(activeSource.url) : false;

  async function startPlayback() {
    setOpen(true);
    setLoading(true);
    setError(null);
    setSources([]);
    setActiveUrl(null);

    try {
      const response = await fetch("/api/playback/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId, title }),
      });
      const payload = await response.json() as PlaybackSession;
      if (!response.ok || payload.status !== "ready" || !payload.sources?.length) {
        throw new Error(payload.message || "Playback is not available for this title yet.");
      }
      setSources(payload.sources);
      setActiveUrl(payload.sources[0]?.url ?? null);
      setEdge(payload.edge ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Playback could not be started.");
    } finally {
      setLoading(false);
    }
  }

  return <>
    <button className="button button-primary" onClick={startPlayback} disabled={loading}>
      <Play size={18} fill="currentColor" />
      {loading ? "Preparing playback…" : "Watch now"}
    </button>

    {open ? <section style={panelStyle} aria-label="Pinflix playback panel">
      <div className="section-heading" style={{ marginBottom: "14px", alignItems: "center" }}>
        <div>
          <p className="eyebrow"><Radio size={13} /> CLOUDFLARE PLAYBACK EDGE</p>
          <h2 style={{ fontSize: "24px", marginTop: "8px" }}>{title}</h2>
        </div>
        <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close playback panel"><X size={22} /></button>
      </div>

      {loading ? <div className="provider-empty" role="status">Requesting a signed playback source from Cloudflare…</div> : null}

      {error ? <div className="provider-empty" role="alert">
        <span className="empty-icon"><Film size={28} /></span>
        <h3>Playback not ready yet.</h3>
        <p>{error}</p>
        <p style={smallTextStyle}>Add an authorized catalog entry in the Cloudflare media worker for <strong>movie:{movieId}</strong>, then this button will play it automatically.</p>
      </div> : null}

      {!loading && !error && activeSource ? <>
        <video
          key={activeSource.url}
          controls
          playsInline
          preload="metadata"
          src={activeSource.url}
          style={videoStyle}
          onError={() => setError(activeIsHls ? "This source is HLS. If this browser cannot play it directly, open it in a native player or add an HLS player library." : "This playback source could not be loaded.")}
        />
        <div style={sourceListStyle} aria-label="Playback sources">
          {sources.map((source) => <button key={source.url} className={`genre-chip ${source.url === activeSource.url ? "active" : ""}`} onClick={() => { setError(null); setActiveUrl(source.url); }}>{source.label}</button>)}
          <a className="genre-chip" href={activeSource.url} target="_blank" rel="noopener noreferrer">Open source <ExternalLink size={13} /></a>
        </div>
        <p style={smallTextStyle}>Playback source signed by {edge ?? "Cloudflare"}. UI is served from Vercel; media is served from the Cloudflare edge.</p>
      </> : null}
    </section> : null}
  </>;
}
