"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Clapperboard, Play, RefreshCw } from "lucide-react";
import type { TvEpisode, TvSeason, TvSeasonResult } from "@/lib/tv";
import { PlaybackPanel } from "@/components/playback-panel";

type ActiveEpisode = { season: number; number: number; title: string };

export function TvEpisodeGuide({ showId, showTitle, seasons }: {
  showId: number; showTitle: string; seasons: TvSeason[];
}) {
  const playableSeasons = seasons.filter(item => Number.isInteger(item.number) && item.number > 0 && item.number <= 999);
  const [selectedSeason, setSelectedSeason] = useState<number>(playableSeasons[0]?.number ?? 1);
  const [episodes, setEpisodes] = useState<TvEpisode[]>([]);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveEpisode | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!playableSeasons.length) return;
    const controller = new AbortController();
    setLoading(true);
    setWarning(null);
    setActive(null);
    setEpisodes([]);
    fetch(`/api/tv/${showId}/seasons/${selectedSeason}`, {
      signal: controller.signal, cache: "no-store",
    }).then(async response => {
      if (!response.ok) throw new Error("Episodes could not be loaded.");
      return response.json() as Promise<TvSeasonResult>;
    }).then(result => {
      if (!controller.signal.aborted) {
        setEpisodes(result.episodes);
        setWarning(result.warning || null);
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted)
        setWarning(error instanceof Error ? error.message : "Episodes could not be loaded.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [showId, selectedSeason, retry, playableSeasons.length]);

  if (!playableSeasons.length) {
    return <p className="notice">Episodes are not currently listed for this series.</p>;
  }

  return <div className="episode-guide">
    <div className="episode-season-picker" role="group" aria-label="Choose a season">
      {playableSeasons.map(season => (
        <button className={`genre-chip ${selectedSeason === season.number ? "active" : ""}`}
          key={season.number} type="button" aria-pressed={selectedSeason === season.number}
          onClick={() => setSelectedSeason(season.number)}>
          {season.title || `Season ${season.number}`}
        </button>
      ))}
    </div>
    <p className="episode-count" aria-live="polite">
      {loading ? "Loading episodes…" : episodes.length ? `${episodes.length} episodes` : "No episode details available"}
    </p>
    {warning ? <p className="notice" role="status">{warning} <button
      className="reset-link" type="button" onClick={() => setRetry(value => value + 1)}>
      <RefreshCw size={14} /> Retry</button></p> : null}
    <div className="episode-list" aria-busy={loading}>
      {episodes.map(episode => (
        <article className="episode-row" key={episode.number}>
          <span className="episode-index">{String(episode.number).padStart(2, "0")}</span>
          <div className="episode-summary">
            <h3>{episode.name}</h3>
            <p className="episode-secondary">{[episode.airDate, episode.runtime ? `${episode.runtime} min` : ""].filter(Boolean).join(" · ")}</p>
            {episode.overview ? <p className="episode-overview">{episode.overview}</p> : null}
          </div>
          <button type="button" className="button button-secondary episode-watch"
            aria-label={`Select ${showTitle}, season ${selectedSeason}, episode ${episode.number}`}
            onClick={() => setActive({ season: selectedSeason, number: episode.number, title: episode.name })}>
            <Play size={16} /> Watch episode
          </button>
        </article>
      ))}
    </div>
    {active ? <div className="episode-playback" aria-live="polite">
      <div className="episode-playback-heading"><span><Clapperboard size={20} />
        Season {active.season}, Episode {active.number} · {active.title}</span>
        <button type="button" className="icon-button" onClick={() => setActive(null)} aria-label="Close episode player"><ChevronDown size={21} /></button>
      </div>
      <PlaybackPanel key={`${showId}:${active.season}:${active.number}`}
        tvId={showId} season={active.season} episode={active.number}
        title={`${showTitle} · S${active.season}E${active.number}`} autoStart />
    </div> : null}
  </div>;
}
