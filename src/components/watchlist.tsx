"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, Check, Cloud, Search } from "lucide-react";
import { useState } from "react";
import { useWatchlist } from "@/components/app-providers";
import { MovieCard } from "@/components/movie-card";

export function Watchlist() {
  const { movies, ready, authEnabled, authStatus, storageWarning, syncState } = useWatchlist();
  const [query, setQuery] = useState("");
  const filtered = movies.filter((movie) => movie.title.toLowerCase().includes(query.toLowerCase().trim()));
  return <section className="container watchlist-page"><div className="page-heading"><p className="eyebrow">YOUR PERSONAL FILM CLUB</p><h1>Save the good <em>ones.</em></h1><p>The films you want to come back to. All in one place.</p></div><div className="watchlist-summary"><div><span className="watchlist-total">{ready ? movies.length.toString().padStart(2, "0") : "—"}</span><div><strong>{movies.length === 1 ? "Film" : "Films"} in your watchlist</strong><p>{authStatus === "authenticated" && syncState === "synced" ? <><Check size={14} /> Saved to your account</> : syncState === "syncing" ? <><Cloud size={14} /> Syncing your collection…</> : "Saved in this browser"}</p></div></div>{authEnabled && authStatus !== "authenticated" ? <Link href="/sign-in" className="text-link">Sign in to sync <ArrowRight size={17} /></Link> : <span className="small-label">A LITTLE PLAN FOR A GREAT EVENING</span>}</div>
    {storageWarning ? <p className="notice" role="status">{storageWarning}</p> : null}{syncState === "error" ? <p className="notice" role="status">Account sync is unavailable. Changes made during this visit may not persist. Refresh later to reload your account; unsynced removals may reappear.</p> : null}
    {!ready ? <div className="loading-state" role="status"><span className="loading-dot" /> Opening your collection…</div> : movies.length === 0 ? <div className="empty-state watchlist-empty"><span className="empty-icon"><Bookmark size={30} /></span><h2>Your next movie night<br />starts with a little bookmark.</h2><p>Tap the bookmark on any film that catches your eye.<br />We’ll keep it here for when the mood is right.</p><Link href="/#collection" className="button button-primary">Find a film to save <ArrowRight size={18} /></Link><span className="local-note">No account needed. Saved on this device.</span></div> : <><div className="watchlist-search"><Search size={19} /><label className="sr-only" htmlFor="watchlist-search">Search your watchlist</label><input id="watchlist-search" placeholder="Find a film in your watchlist…" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={150} /><span>{filtered.length} {filtered.length === 1 ? "film" : "films"}</span></div>{filtered.length ? <div className="movie-grid">{filtered.map((movie, index) => <MovieCard movie={movie} key={movie.id} index={index} />)}</div> : <div className="empty-state"><h2>No saved films match “{query}”.</h2><button className="button button-secondary" onClick={() => setQuery("")}>Show all saved films</button></div>}</>}
  </section>;
}
