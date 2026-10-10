"use client";

import { Film, Play, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AdaptivePlayer } from "@/components/adaptive-player";

type PlaybackSource = { label: string; url: string };
type PlaybackSession = {
  status: "ready" | "unavailable" | "error";
  message?: string;
  sources?: PlaybackSource[];
};

export function PlaybackPanel({ movieId, title }: { movieId: number; title: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<PlaybackSource[]>([]);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const activeSource = useMemo(() =>
    sources.find(source => source.url === activeUrl) ?? sources[0],
    [sources, activeUrl]
  );

  const startPlayback = async () => {
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
        cache: "no-store",
      });
      const data = await response.json() as PlaybackSession;
      if (!response.ok || data.status !== "ready" || !data.sources?.length)
        throw new Error(data.message || "No video is available for this title.");
      setSources(data.sources);
      setActiveUrl(data.sources[0].url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Video is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  return <>
    <button className="button button-primary" onClick={() => void startPlayback()} disabled={loading}>
      <Play size={18} fill="currentColor" /> {loading ? "Preparing video…" : "Watch now"}
    </button>
    {open ? <section aria-label="Pinflix playback panel" style={{
      marginTop: 20, border: "1px solid var(--media-border)",
      background: "rgba(8, 13, 20, .72)", borderRadius: 12, padding: 16,
    }}>
      <div className="section-heading" style={{ marginBottom: 14, alignItems: "center" }}>
        <div><p className="eyebrow">NOW PLAYING</p><h2 style={{ fontSize: 24, marginTop: 8 }}>{title}</h2></div>
        <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close playback panel"><X size={22}/></button>
      </div>
      {loading ? <p className="provider-empty" role="status">Preparing your video…</p> : null}
      {error ? <div className="provider-empty" role="alert">
        <span className="empty-icon"><Film size={28}/></span>
        <h3>Playback unavailable</h3>
        <p>{error}</p>
        <button type="button" className="button button-secondary" onClick={() => void startPlayback()}>Try again</button>
      </div> : null}
      {!loading && !error && activeSource ? <>
        <AdaptivePlayer key={activeSource.url} source={activeSource.url} title={title} />
        {sources.length > 1 ? <div aria-label="Playback sources" style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {sources.map(source => <button type="button" key={source.url}
            className={`genre-chip ${source.url === activeSource.url ? "active" : ""}`}
            onClick={() => setActiveUrl(source.url)}>{source.label}</button>)}
        </div> : null}
      </> : null}
    </section> : null}
  </>;
}
