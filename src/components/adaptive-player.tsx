"use client";

import { AlertCircle, Maximize, Pause, Play, RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import { normalizeMediaSource } from "@/lib/media-source";

type Quality = { index: number; label: string };
type Subtitle = { index: number; label: string };
const QUALITY_KEY = "pinflix:preferred-quality";

export function AdaptivePlayer({ source, title }: { source?: string | null; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [selectedQuality, setSelectedQuality] = useState(-1);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState(-1);
  const normalized = source ? normalizeMediaSource(source) : null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !normalized || normalized.type === "embed") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let instance: Hls | null = null;
    setError(null);
    setLoading(true);
    setPlaying(false);
    setQualities([]);
    setSelectedQuality(-1);
    setSubtitles([]);
    setSelectedSubtitle(-1);

    const init = async () => {
      if (normalized.type !== "hls") {
        video.src = normalized.url;
        video.load();
        return;
      }
      try {
        const { default: HlsJs } = await import("hls.js");
        if (cancelled) return;
        if (HlsJs.isSupported()) {
          instance = new HlsJs({
            enableWorker: true,
            capLevelToPlayerSize: true,
            startLevel: -1,
            maxBufferLength: 30,
            backBufferLength: 30,
          });
          const hls = instance;
          hlsRef.current = hls;
          hls.on(HlsJs.Events.MANIFEST_PARSED, () => {
            if (cancelled) return;
            const levels = hls.levels.map((level, index) => ({
              index,
              label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)} kbps`,
            }));
            setQualities([{ index: -1, label: "Best · Auto" }, ...levels]);
            const preference = window.localStorage.getItem(QUALITY_KEY);
            const preferred = preference && preference !== "auto"
              ? levels.find((level) => level.label === preference)
              : undefined;
            if (preferred) {
              hls.nextLevel = preferred.index;
              setSelectedQuality(preferred.index);
            }
            setLoading(false);
          });
          hls.on(HlsJs.Events.SUBTITLE_TRACKS_UPDATED, () => {
            if (cancelled) return;
            setSubtitles(hls.subtitleTracks.map((track, index) => ({
              index, label: track.name || track.lang || `Subtitle ${index + 1}`,
            })));
          });
          hls.on(HlsJs.Events.ERROR, (_event, data) => {
            if (cancelled || !data.fatal) return;
            if (data.type === HlsJs.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
              return;
            }
            setLoading(false);
            setError("Video playback was interrupted. Please retry or choose another source.");
          });
          hls.loadSource(normalized.url);
          hls.attachMedia(video);
          return;
        }
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = normalized.url;
          video.load();
          return;
        }
        setError("This browser cannot play this video format.");
        setLoading(false);
      } catch {
        if (cancelled) return;
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = normalized.url;
          video.load();
        } else {
          setError("The video player could not be initialized.");
          setLoading(false);
        }
      }
    };
    void init();
    return () => {
      cancelled = true;
      instance?.destroy();
      if (hlsRef.current === instance) hlsRef.current = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [normalized?.url, normalized?.type, retry]);

  if (!normalized || normalized.type === "embed") {
    return <div className="playback-unavailable" role="status">This playback format is unavailable.</div>;
  }

  const chooseQuality = (index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.nextLevel = index;
    setSelectedQuality(index);
    const label = qualities.find(item => item.index === index)?.label ?? "auto";
    window.localStorage.setItem(QUALITY_KEY, index < 0 ? "auto" : label);
  };
  const chooseSubtitle = (index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.subtitleTrack = index;
    hls.subtitleDisplay = index >= 0;
    setSelectedSubtitle(index);
  };
  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) { video.pause(); return; }
    try { await video.play(); } catch { setError("Playback could not start. Check your connection and try again."); }
  };
  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (video?.requestFullscreen) void video.requestFullscreen();
  };

  return <div className="adaptive-player" aria-label={`${title} player`}>
    <video
      ref={videoRef}
      controls
      playsInline
      preload="metadata"
      style={{ width: "100%", display: "block", background: "#020617", borderRadius: "10px", maxHeight: "min(62vh, 580px)" }}
      onPlaying={() => { setPlaying(true); setLoading(false); }}
      onPause={() => setPlaying(false)}
      onCanPlay={() => setLoading(false)}
      onWaiting={() => setLoading(true)}
      onError={() => { setLoading(false); setError("This video couldn't be loaded. Retry or choose another source."); }}
    >
      Your browser does not support HTML5 video.
    </video>
    <div className="adaptive-player-controls" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
      <button type="button" className="button button-secondary" onClick={() => void togglePlay()} aria-label={playing ? "Pause" : "Play"}>
        {playing ? <Pause size={16} /> : <Play size={16} />}{playing ? "Pause" : "Play"}
      </button>
      {qualities.length > 1 ? <label className="region-picker">Quality
        <select value={selectedQuality} onChange={event => chooseQuality(Number(event.target.value))} aria-label="Video quality">
          {qualities.map(q => <option value={q.index} key={q.index}>{q.label}</option>)}
        </select>
      </label> : null}
      {subtitles.length ? <label className="region-picker">Subtitles
        <select value={selectedSubtitle} onChange={event => chooseSubtitle(Number(event.target.value))} aria-label="Subtitle track">
          <option value={-1}>Off</option>
          {subtitles.map(s => <option key={s.index} value={s.index}>{s.label}</option>)}
        </select>
      </label> : null}
      <button type="button" className="icon-button" onClick={toggleFullscreen} aria-label="Fullscreen"><Maximize size={18} /></button>
      <button type="button" className="icon-button" onClick={() => setRetry(value => value + 1)} aria-label="Retry video"><RefreshCcw size={18} /></button>
      {loading && !error ? <span role="status" style={{ fontSize: 12, color: "var(--muted)" }}>Buffering…</span> : null}
    </div>
    {error ? <p role="alert" className="notice" style={{ marginTop: 12 }}><AlertCircle size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 7 }} />{error}</p> : null}
  </div>;
}
