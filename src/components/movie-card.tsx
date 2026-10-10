"use client";

import Link from "next/link";
import { ArrowUpRight, Bookmark, Check, Star } from "lucide-react";
import { useState } from "react";
import type { Movie } from "@/lib/types";
import { useWatchlist } from "@/components/app-providers";

export function posterUrl(path: string | null, size = "w500") {
  if (!path) return "/poster-fallback.svg";
  if (path.startsWith("/posters/") || path === "/poster-fallback.svg") return path;
  if (path.startsWith("https://image.tmdb.org/")) return path;
  return `https://image.tmdb.org/t/p/${size}${path.startsWith("/") ? path : `/${path}`}`;
}

export function SaveButton({ movie, variant = "icon" }: { movie: Movie; variant?: "icon" | "full" }) {
  const { isSaved, toggle, ready, pendingIds, syncState } = useWatchlist();
  const saved = isSaved(movie.id);
  return <button className={`${variant === "icon" ? "save-button" : "button button-secondary"} ${saved ? "is-saved" : ""}`} onClick={() => toggle(movie)} disabled={!ready || pendingIds.includes(movie.id) || syncState === "syncing"} aria-label={`${saved ? "Remove" : "Save"} ${movie.title} ${saved ? "from" : "to"} watchlist`} aria-pressed={saved} title={saved ? "Remove from watchlist" : "Save to watchlist"}>{saved ? <Check size={variant === "icon" ? 18 : 19} /> : <Bookmark size={variant === "icon" ? 18 : 19} />}{variant === "full" ? saved ? "Saved to watchlist" : "Save for later" : null}</button>;
}

export function MovieCard({ movie, index = 0, region = "BD" }: { movie: Movie; index?: number; region?: string }) {
  const [failed, setFailed] = useState(false);
  const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : "Date TBA";
  return <article className="movie-card">
    <div className="poster-wrap"><Link href={`/movie/${movie.id}?region=${encodeURIComponent(region)}`} className="poster-link" aria-label={`Explore ${movie.title}`}><img src={failed ? "/poster-fallback.svg" : posterUrl(movie.posterPath)} alt={`${movie.title} poster`} width="400" height="600" loading={index < 4 ? "eager" : "lazy"} onError={() => setFailed(true)} /><span className="poster-explore">Explore film <ArrowUpRight size={17} /></span></Link><span className="rating"><Star size={12} fill="currentColor" /> {Number.isFinite(movie.rating) ? movie.rating.toFixed(1) : "—"}</span><SaveButton movie={movie} /></div>
    <div className="movie-card-info"><p className="movie-meta">{year}<span aria-hidden="true">·</span>{movie.genres[0] ?? "Film"}</p><h3><Link href={`/movie/${movie.id}?region=${encodeURIComponent(region)}`}>{movie.title}</Link></h3></div>
  </article>;
}
