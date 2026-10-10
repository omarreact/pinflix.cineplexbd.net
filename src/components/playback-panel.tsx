"use client";

import { Film, Play, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdaptivePlayer } from "@/components/adaptive-player";

type PlaybackSource = { label: string; url: string };
type PlaybackSession = { status: "ready" | "unavailable" | "error"; message?: string; sources?: PlaybackSource[] };
type PlaybackPanelProps =
  | { movieId: number; title: string; tvId?: never; season?: never; episode?: never; autoStart?: boolean }
  | { tvId: number; season: number; episode: number; title: string; movieId?: never; autoStart?: boolean };

export function PlaybackPanel(props: PlaybackPanelProps) {
  const { title, autoStart = false } = props;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<PlaybackSource[]>([]);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [switchNotice, setSwitchNotice] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const initializedRef = useRef(false);
  const sourceRef = useRef<PlaybackSource[]>([]);
  const urlRef = useRef<string | null>(null);
  sourceRef.current = sources;
  urlRef.current = activeUrl;
  const activeSource = useMemo(
    () => sources.find(source => source.url === activeUrl) ?? sources[0],
    [sources, activeUrl]
  );

  const startPlayback = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setOpen(true);
    setLoading(true);
    setError(null);
    setSwitchNotice(null);
    try {
      const response = await fetch("/api/playback/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(typeof props.tvId === "number"
          ? { kind: "tv", tvId: props.tvId, season: props.season, episode: props.episode, title }
          : { kind: "movie", movieId: props.movieId, title }),
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json() as PlaybackSession;
      if (!response.ok || data.status !== "ready" || !data.sources?.length) {
        throw new Error(data.message || "Video is not available for this title.");
      }
      if (controller.signal.aborted) return;
      setSources(data.sources);
      setActiveUrl(data.sources[0].url);
    } catch (reason) {
      if (controller.signal.aborted) return;
      setSources([]);
      setActiveUrl(null);
      setError(reason instanceof Error ? reason.message : "Video is temporarily unavailable.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [props, title]);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (!autoStart || initializedRef.current) return;
    initializedRef.current = true;
    void startPlayback();
    // Each TV episode player is keyed by its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const onFatalError = useCallback((message: string) => {
    const candidates = sourceRef.current;
    const current = candidates.findIndex(source => source.url === urlRef.current);
    if (current >= 0 && current + 1 < candidates.length) {
      setSwitchNotice("The first source stopped. Trying another available quality.");
      setActiveUrl(candidates[current + 1].url);
      return;
    }
    // A rejected segment can be caused by an expired signed URL.
    // Request a fresh session only on an explicit user retry: this prevents loops.
    setSwitchNotice(null);
    setError(message + " Use Try again to request a fresh playback link.");
  }, []);

  const close = () => {
    requestRef.current?.abort();
    setOpen(false);
    setSources([]);
    setActiveUrl(null);
    setLoading(false);
    setError(null);
    setSwitchNotice(null);
  };

  return <>
    <button className="button button-primary" onClick={() => void startPlayback()} disabled={loading}>
      <Play size={18} fill="currentColor" /> {loading ? "Preparing video…" :
        typeof props.tvId === "number" ? "Watch episode" : "Watch now"}
    </button>
    {open ? <section aria-label="Pinflix playback panel" style={{
      marginTop: 20, border: "1px solid var(--media-border)",
      background: "rgba(8, 13, 20, .72)", borderRadius: 12, padding: 16,
    }}>
      <div className="section-heading" style={{ marginBottom: 14, alignItems: "center" }}>
        <div><p className="eyebrow">NOW PLAYING</p><h2 style={{ fontSize: 24, marginTop: 8 }}>{title}</h2></div>
        <button className="icon-button" onClick={close} aria-label="Close playback panel"><X size={22}/></button>
      </div>
      {loading ? <p className="provider-empty" role="status">Preparing your video…</p> : null}
      {error ? <div className="provider-empty" role="alert">
        <span className="empty-icon"><Film size={28}/></span>
        <h3>Playback unavailable</h3>
        <p>{error}</p>
        <button type="button" className="button button-secondary" onClick={() => void startPlayback()}>
          Try again
        </button>
      </div> : null}
      {!loading && !error && activeSource ? <>
        <AdaptivePlayer key={activeSource.url} source={activeSource.url}
          title={title} onFatalError={onFatalError}/>
        {switchNotice ? <p className="notice" role="status">{switchNotice}</p> : null}
        <p style={{ marginTop: 10, fontSize: 11, color: "var(--muted)" }}>Delivered via Cloudflare R2</p>
        {sources.length > 1 ? <div aria-label="Playback sources" style={{
          display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap",
        }}>
          {sources.map(source => <button type="button" key={source.url}
            className={`genre-chip ${source.url === activeSource.url ? "active" : ""}`}
            onClick={() => { setSwitchNotice(null); setActiveUrl(source.url); }}>
            {source.label}
          </button>)}
        </div> : null}
      </> : null}
    </section> : null}
  </>;
}
