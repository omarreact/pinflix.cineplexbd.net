"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Clock3, Play, Star, X } from "lucide-react";
import { useState } from "react";
import type { MovieResult } from "@/lib/types";
import { buildMediaTheme, asThemeVars } from "@/lib/media-theme";
import { posterUrl, SaveButton } from "@/components/movie-card";

export function MovieDetailView({ initial, initialRegion }: { initial: MovieResult; initialRegion: string }) {
  const result = initial;
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const movie = result.movie;
  if (!movie) return <section className="container empty-state"><h1>This film is out of frame.</h1><Link className="button button-primary" href="/">Explore the collection</Link></section>;
  const validTrailer = movie.trailer?.site === "YouTube" && /^[A-Za-z0-9_-]{11}$/.test(movie.trailer.key) ? movie.trailer : null;
  const mediaTheme = buildMediaTheme(movie.backdropPath || movie.posterPath || movie.title);
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : "Runtime unavailable";
  return <article className="container film-detail" style={asThemeVars(mediaTheme)}>
    <Link className="back-link" href={`/?region=${initialRegion}#collection`}><ArrowLeft size={17} /> Back to the collection</Link>
    <div className="film-layout"><div className="detail-poster"><img src={posterFailed ? "/poster-fallback.svg" : posterUrl(movie.posterPath)} alt={`${movie.title} poster`} width="500" height="750" fetchPriority="high" onError={() => setPosterFailed(true)} /><div className="poster-credit">{result.source === "demo" ? "PINFLIX · ORIGINAL PREVIEW ART" : "POSTER VIA TMDB"}</div></div><div className="film-info"><p className="eyebrow">{result.source === "demo" ? "THE PREVIEW COLLECTION" : "FROM THE WORLD OF CINEMA"}</p><h1>{movie.title}</h1>{movie.tagline ? <p className="film-tagline">{movie.tagline}</p> : null}<div className="detail-meta"><span className="detail-rating"><Star size={17} fill="currentColor" /> {movie.rating.toFixed(1)} <small>/ 10</small></span><span>{movie.releaseDate.slice(0, 4) || "Date TBA"}</span><span><Clock3 size={15} /> {runtime}</span></div><div className="detail-genres">{movie.genres.map((genre) => <span key={genre}>{genre}</span>)}</div><div className="detail-actions"><SaveButton movie={movie} variant="full" />{validTrailer ? <button className="button button-primary" onClick={() => setTrailerOpen(!trailerOpen)} aria-expanded={trailerOpen} aria-controls="film-trailer">{trailerOpen ? <X size={18} /> : <Play size={18} fill="currentColor" />}{trailerOpen ? "Close trailer" : "Watch trailer"}</button> : null}</div><section className="synopsis"><h2>The story</h2><p>{movie.overview || "A synopsis is not available for this film yet."}</p></section><dl className="film-facts"><div><dt>Original language</dt><dd>{movie.language.toUpperCase()}</dd></div><div><dt>Released</dt><dd>{movie.releaseDate || "To be announced"}</dd></div><div><dt>Film reference</dt><dd><a href={`https://www.themoviedb.org/movie/${movie.id}`} target="_blank" rel="noopener noreferrer">View on TMDB <ArrowUpRight size={14} /></a></dd></div></dl></div></div>
    {result.warning ? <p className="notice">{result.warning}</p> : null}
    {trailerOpen && validTrailer ? <section id="film-trailer" className="trailer-section" aria-label="Film trailer"><div className="section-heading"><h2>A first look.</h2><button className="icon-button" onClick={() => setTrailerOpen(false)} aria-label="Close trailer"><X size={22} /></button></div><iframe src={`https://www.youtube-nocookie.com/embed/${validTrailer.key}`} title={validTrailer.name || `${movie.title} trailer`} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /><p>Trailer hosted on YouTube. Playing it connects to YouTube’s services.</p></section> : null}
  </article>;
}
