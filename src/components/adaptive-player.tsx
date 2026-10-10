"use client";

import { Pause, Play, RefreshCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { isAllowedMediaSource, normalizeMediaSource } from "@/lib/media-source";

export function AdaptivePlayer({ source, title }: { source?: string | null; title: string }) {
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
  const [volume, setVolume] = useState(80);

  const normalized = source ? normalizeMediaSource(source) : null;

  useEffect(() => {
    if (!source) {
      setUnsupported(true);
      return;
    }
    setReady(Boolean(normalized));
    setUnsupported(!Boolean(normalized));
  }, [normalized, source]);

  useEffect(() => {
    const stored = Number.parseInt(window.localStorage.getItem("pinflix:volume") ?? "80", 10);
    if (!Number.isNaN(stored)) setVolume(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("pinflix:volume", String(volume));
  }, [volume]);

  if (!source || unsupported || !normalized || !isAllowedMediaSource(source)) {
    return (
      <div className="playback-unavailable" role="status" aria-live="polite">
        <p>Playback is unavailable for this source.</p>
        <button className="button button-secondary" type="button" onClick={() => setUnsupported(false)}>
          <RefreshCcw size={16} /> Retry
        </button>
      </div>
    );
  }

  const mediaProps = normalized.type === "embed"
    ? { src: normalized.url }
    : { src: normalized.url, controls: true, muted, volume, playsInline: true, preload: "metadata" as const, poster: undefined };

  return (
    <div className="adaptive-player" aria-label={`${title} player`}>
      <video {...mediaProps} onLoadedData={() => setReady(true)} onCanPlay={() => setReady(true)} onError={() => setUnsupported(true)}>
        Your browser does not support the video tag.
      </video>
      <div className="adaptive-player-controls">
        <button type="button" aria-label={ready ? "Pause" : "Play"}>
          {ready ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button type="button" aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((current) => !current)}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          aria-label="Volume"
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
        />
      </div>
    </div>
  );
}
