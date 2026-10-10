"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Clock3, Film, Globe2, Play, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { MovieResult } from "@/lib/types";
import { buildMediaTheme, asThemeVars } from "@/lib/media-theme";
import { REGIONS } from "@/components/catalogue";
import { posterUrl, SaveButton } from "@/components/movie-card";

export function MovieDetailView({ initial, initialRegion }: { initial: MovieResult; initialRegion: string }) {
  const [result, setResult] = useState(initial);
  const [region, setRegion] = useState(initialRegion);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const movie = result.movie;
  const movieId = initial.movie?.id;
  useEffect(() => {
    if (region === initialRegion) { setResult(initial); setLoading(false); setError(null); return; }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/movies/${movieId}?region=${region}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Viewing options could not be refreshed. Please try another region."); return response.json() as Promise<MovieResult>; })
      .then((data) => { if (active) setResult(data); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load viewing options."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [region, initialRegion, initial, movieId]);
  if (!movie) return <section className="container empty-state"><h1>This film is out of frame.</h1><Link className="button button-primary" href="/">Explore the collection</Link></section>;
  const regionName = REGIONS.find((item) => item.code === region)?.name ?? region;
  const validTrailer = movie.trailer?.site === "YouTube" && /^[A-Za-z0-9_-]{11}$/.test(movie.trailer.key) ? movie.trailer : null;
  const mediaTheme = buildMediaTheme(movie.backdropPath || movie.posterPath || movie.title);
  const groups = ["subscription", "rent", "buy"] as const;
  const groupNames = { subscription: "With a subscription", rent: "Rent the film", buy: "Buy the film" };
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : "Runtime unavailable";
  return <article className="container film-detail" style={asThemeVars(mediaTheme)}>
    <Link className="back-link" href={`/?region=${region}#collection`}><ArrowLeft size={17} /> Back to the collection</Link>
    <div className="film-layout"><div className="detail-poster"><img src={posterFailed ? "/poster-fallback.svg" : posterUrl(movie.posterPath)} alt={`${movie.title} poster`} width="500" height="750" fetchPriority="high" onError={() => setPosterFailed(true)} /><div className="poster-credit">{result.source === "demo" ? "PINFLIX · ORIGINAL PREVIEW ART" : "POSTER VIA TMDB"}</div></div><div className="film-info"><p className="eyebrow">{result.source === "demo" ? "THE PREVIEW COLLECTION" : "FROM THE WORLD OF CINEMA"}</p><h1>{movie.title}</h1>{movie.tagline ? <p className="film-tagline">{movie.tagline}</p> : null}<div className="detail-meta"><span className="detail-rating"><Star size={17} fill="currentColor" /> {movie.rating.toFixed(1)} <small>/ 10</small></span><span>{movie.releaseDate.slice(0, 4) || "Date TBA"}</span><span><Clock3 size={15} /> {runtime}</span></div><div className="detail-genres">{movie.genres.map((genre) => <span key={genre}>{genre}</span>)}</div><div className="detail-actions"><SaveButton movie={movie} variant="full" />{validTrailer ? <button className="button button-primary" onClick={() => setTrailerOpen(!trailerOpen)} aria-expanded={trailerOpen} aria-controls="film-trailer">{trailerOpen ? <X size={18} /> : <Play size={18} fill="currentColor" />}{trailerOpen ? "Close trailer" : "Watch trailer"}</button> : null}</div><section className="synopsis"><h2>The story</h2><p>{movie.overview || "A synopsis is not available for this film yet."}</p></section><dl className="film-facts"><div><dt>Original language</dt><dd>{movie.language.toUpperCase()}</dd></div><div><dt>Released</dt><dd>{movie.releaseDate || "To be announced"}</dd></div><div><dt>Film reference</dt><dd><a href={`https://www.themoviedb.org/movie/${movie.id}`} target="_blank" rel="noopener noreferrer">View on TMDB <ArrowUpRight size={14} /></a></dd></div></dl></div></div>
    {result.warning ? <p className="notice">{result.warning}</p> : null}
    {trailerOpen && validTrailer ? <section id="film-trailer" className="trailer-section" aria-label="Film trailer"><div className="section-heading"><h2>A first look.</h2><button className="icon-button" onClick={() => setTrailerOpen(false)} aria-label="Close trailer"><X size={22} /></button></div><iframe src={`https://www.youtube-nocookie.com/embed/${validTrailer.key}`} title={validTrailer.name || `${movie.title} trailer`} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /><p>Trailer hosted on YouTube. Playing it connects to YouTube’s services.</p></section> : null}
    <section className="provider-section" aria-labelledby="providers-title"><div className="section-heading"><div><p className="eyebrow">MAKE IT A MOVIE NIGHT</p><h2 id="providers-title">Where to watch<span className="accent-dot">.</span></h2></div><label className="region-picker"><Globe2 size={17} /><span className="sr-only">Choose viewing region</span><select value={region} onChange={(event) => setRegion(event.target.value)}>{REGIONS.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label></div>
      {error ? <p className="notice" role="alert">{error}</p> : null}
      {loading ? <div className="provider-empty" role="status">Checking viewing options for {regionName}…</div> : !error && movie.providers.length > 0 && movie.providerLink ? <><div className="provider-grid">{groups.map((group) => { const providers = movie.providers.filter((provider) => provider.type === group); return providers.length ? <div className="provider-group" key={group}><h3>{groupNames[group]}</h3><div>{providers.map((provider) => <span className="provider-name" key={`${group}-${provider.name}`}>{provider.logoPath ? <img src={posterUrl(provider.logoPath, "w92")} alt="" width="36" height="36" loading="lazy" /> : <Film size={20} />}{provider.name}</span>)}</div></div> : null; })}</div><a className="button button-primary" href={movie.providerLink} target="_blank" rel="noopener noreferrer">Check viewing options <ArrowUpRight size={18} /></a></> : !error ? <div className="provider-empty"><span className="empty-icon"><Film size={28} /></span><h3>{result.source === "demo" ? "Your preview, without the guesswork." : "No viewing options listed here yet."}</h3><p>{result.source === "demo" ? "These films are part of our preview collection. We haven’t verified streaming, rental or purchase availability." : `No providers are listed for ${regionName} at the moment. Try another region or check the film on TMDB.`}</p><a className="text-link" href={`https://www.themoviedb.org/movie/${movie.id}/watch?locale=${region}`} target="_blank" rel="noopener noreferrer">Explore the film on TMDB <ArrowUpRight size={17} /></a></div> : null}
      <p className="provider-attribution">Watch-provider information powered by <a href="https://www.justwatch.com/" target="_blank" rel="noopener noreferrer">JustWatch</a> via TMDB. Availability and prices can change; confirm with the provider.</p>
    </section>
  </article>;
}
