"use client";

import { AlertCircle, Maximize, Pause, Play, RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import { normalizeMediaSource } from "@/lib/media-source";

type Quality = { index: number; label: string };
type Subtitle = { index: number; label: string };
const QUALITY_KEY = "pinflix:preferred-quality";

export function AdaptivePlayer({ source, title, onFatalError }: {
  source?: string | null;
  title: string;
  /** Invoked when retries are exhausted. The caller may choose a different CDN source. */
  onFatalError?: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const onFatalRef = useRef(onFatalError);
  onFatalRef.current = onFatalError;
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
    if (!video || !normalized || !["hls", "mp4"].includes(normalized.type)) {
      setLoading(false);
      return;
    }
    let disposed = false;
    let hls: Hls | null = null;
    let recoveryAttempts = 0;
    let notified = false;

    const fail = (message: string) => {
      if (disposed || notified) return;
      notified = true;
      setLoading(false);
      setError(message);
      onFatalRef.current?.(message);
    };
    const handleVideoError = () => {
      if (disposed || !video.error) return;
      fail("This stream could not be loaded. Please try again.");
    };
    const handleEnded = () => {
      if (!disposed) {
        setPlaying(false);
        setLoading(false);
      }
    };

    video.addEventListener("error", handleVideoError);
    video.addEventListener("ended", handleEnded);
    setError(null);
    setLoading(true);
    setPlaying(false);
    setQualities([]);
    setSelectedQuality(-1);
    setSubtitles([]);
    setSelectedSubtitle(-1);

    const initialize = async () => {
      if (normalized.type === "mp4") {
        video.src = normalized.url;
        video.load();
        return;
      }
      try {
        const { default: HlsJs } = await import("hls.js");
        if (disposed) return;
        if (HlsJs.isSupported()) {
          hls = new HlsJs({
            enableWorker: true,
            capLevelToPlayerSize: true,
            startLevel: -1,
            maxBufferLength: 25,
            backBufferLength: 25,
          });
          hlsRef.current = hls;
          const engine = hls;
          engine.on(HlsJs.Events.MANIFEST_PARSED, () => {
            if (disposed) return;
            const levels = engine.levels.map((level, index) => ({
              index,
              label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)} kbps`,
            }));
            setQualities([{ index: -1, label: "Best · Auto" }, ...levels]);
            try {
              const preference = window.localStorage.getItem(QUALITY_KEY);
              const chosen = preference && preference !== "auto"
                ? levels.find(level => level.label === preference)
                : undefined;
              if (chosen) {
                engine.nextLevel = chosen.index;
                setSelectedQuality(chosen.index);
              }
            } catch { /* Private browsing may block local storage. */ }
            setLoading(false);
          });
          engine.on(HlsJs.Events.SUBTITLE_TRACKS_UPDATED, () => {
            if (disposed) return;
            setSubtitles(engine.subtitleTracks.map((track, index) => ({
              index, label: track.name || track.lang || `Subtitle ${index + 1}`,
            })));
          });
          engine.on(HlsJs.Events.ERROR, (_event, data) => {
            if (disposed || !data.fatal) return;
            if (data.type === HlsJs.ErrorTypes.MEDIA_ERROR && recoveryAttempts < 1) {
              recoveryAttempts++;
              engine.recoverMediaError();
              return;
            }
            // Fatal network errors already exhausted hls.js loading policies.
            // Do not restart indefinitely; signal the caller to try another source.
            fail(data.type === HlsJs.ErrorTypes.NETWORK_ERROR
              ? "Connection to the video source was interrupted."
              : "Your browser could not decode this video stream.");
          });
          engine.attachMedia(video);
          engine.loadSource(normalized.url);
          return;
        }
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = normalized.url;
          video.load();
          return;
        }
        fail("This browser does not support HLS video.");
      } catch {
        if (disposed) return;
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = normalized.url;
          video.load();
        } else {
          fail("The player could not start on this browser.");
        }
      }
    };

    void initialize();
    return () => {
      disposed = true;
      video.removeEventListener("error", handleVideoError);
      video.removeEventListener("ended", handleEnded);
      hls?.destroy();
      if (hlsRef.current === hls) hlsRef.current = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [normalized?.url, normalized?.type, retry]);

  if (!normalized || (normalized.type !== "hls" && normalized.type !== "mp4")) {
    return <div className="playback-unavailable" role="status">This video format is unavailable.</div>;
  }

  const chooseQuality = (index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.nextLevel = index;
    setSelectedQuality(index);
    const label = qualities.find(item => item.index === index)?.label ?? "auto";
    try { window.localStorage.setItem(QUALITY_KEY, index < 0 ? "auto" : label); } catch { /* Optional preference. */ }
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
    try {
      await video.play();
      setError(null);
    } catch {
      setError("Playback could not start. Check your connection and try again.");
    }
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
      onPlaying={() => { setPlaying(true); setLoading(false); setError(null); }}
      onPause={() => setPlaying(false)}
      onCanPlay={() => setLoading(false)}
      onWaiting={() => setLoading(true)}
      onStalled={() => setLoading(true)}
    >Your browser does not support HTML5 video.</video>
    <div className="adaptive-player-controls" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
      <button type="button" className="button button-secondary" onClick={() => void togglePlay()} aria-label={playing ? "Pause" : "Play"}>
        {playing ? <Pause size={16}/> : <Play size={16}/>} {playing ? "Pause" : "Play"}
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
      <button type="button" className="icon-button" onClick={toggleFullscreen} aria-label="Fullscreen"><Maximize size={18}/></button>
      <button type="button" className="icon-button" onClick={() => {setError(null);setRetry(value => value + 1);}} aria-label="Retry video"><RefreshCcw size={18}/></button>
      {loading && !error ? <span role="status" style={{ fontSize: 12, color: "var(--muted)" }}>Buffering…</span> : null}
    </div>
    {error ? <p role="alert" className="notice" style={{ marginTop: 12 }}>
      <AlertCircle size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 7 }}/>{error}
    </p> : null}
  </div>;
}
