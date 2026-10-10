"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Globe2, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CatalogueOptions, CatalogueResult } from "@/lib/types";
import { buildMediaTheme, asThemeVars } from "@/lib/media-theme";
import { MovieCard } from "@/components/movie-card";

export const REGIONS = [{ code: "BD", name: "Bangladesh" }, { code: "US", name: "United States" }, { code: "GB", name: "United Kingdom" }, { code: "IN", name: "India" }, { code: "CA", name: "Canada" }, { code: "AU", name: "Australia" }];
const GENRES = ["All films", "Science Fiction", "Drama", "Animation", "Action", "Adventure", "Comedy", "Thriller", "Romance", "Fantasy"];
const queryKey = (options: CatalogueOptions) => JSON.stringify([options.query ?? "", options.genre ?? "", options.sort ?? "popular", options.page ?? 1, options.region ?? "BD"]);

export function Catalogue({ initial, initialOptions = {} }: { initial: CatalogueResult; initialOptions?: CatalogueOptions }) {
  const [options, setOptions] = useState<CatalogueOptions>({ query: "", genre: "", sort: "popular", page: 1, region: "BD", ...initialOptions });
  const [search, setSearch] = useState(initialOptions.query ?? "");
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const initialKey = useRef(queryKey(initialOptions));
  const catalogueRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (queryKey(options) === initialKey.current && retry === 0) { setData(initial); setLoading(false); setError(null); return; }
    const controller = new AbortController();
    let active = true;
    const params = new URLSearchParams({ query: options.query ?? "", genre: options.genre ?? "", sort: options.sort ?? "popular", page: String(options.page ?? 1), region: options.region ?? "BD" });
    setLoading(true);
    setError(null);
    fetch(`/api/catalog?${params}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("The collection could not be loaded. Please try again."); return response.json() as Promise<CatalogueResult>; })
      .then((result) => { if (active) setData(result); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [options, retry, initial]);

  function applyFilter(update: Partial<CatalogueOptions>) { setOptions((current) => ({ ...current, ...update, page: 1 })); }
  function onSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); applyFilter({ query: search.trim(), genre: "" }); catalogueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function reset() { setSearch(""); setOptions({ query: "", genre: "", sort: "popular", page: 1, region: options.region }); }
  const region = options.region ?? "BD";
  const featured = initial.movies[0];
  const isFiltered = Boolean(options.query || options.genre);
  const heroTheme = buildMediaTheme(featured?.backdropPath || featured?.posterPath || featured?.title || "Pinflix");

  return <>
    <section className="hero container" aria-labelledby="hero-title" style={asThemeVars(heroTheme)}>
      <div className="hero-copy"><p className="eyebrow"><span className="status-dot" /> CURATED FOR THE CURIOUS</p><h1 id="hero-title">Your next<br />great <em>film.</em></h1><p className="hero-description">Big feelings. New worlds. Stories that stay.<br className="desktop-break" /> Find something worth your evening.</p><div className="hero-actions"><a href="#collection" className="button button-primary">Find your film <ArrowDown size={18} /></a><Link href="/watchlist" className="text-link">Make it a movie night <ArrowUpRight size={18} /></Link></div><div className="hero-note"><span className="film-rings" aria-hidden="true"><i /><i /><i /></span><p>Made for film lovers.<br /><strong>From the first frame to the last.</strong></p></div></div>
      <div className="hero-art"><img src="/cinema-landscape.svg" width="800" height="790" alt="An illustrated sun over a surreal desert cinema landscape" fetchPriority="high" /><div className="hero-art-label"><span>THE EVENING EDIT</span><span>01 / A NEW PERSPECTIVE</span></div><div className="hero-art-caption"><span className="art-caption-icon"><Sparkles size={22} /></span><div><p>Get lost in a different world.</p><span>A film for every kind of feeling.</span></div>{featured ? <Link href={`/movie/${featured.id}?region=${region}`} className="icon-button" aria-label={`Explore our featured film, ${featured.title}`}><ArrowUpRight size={23} /></Link> : null}</div></div>
    </section>
    <div className="editorial-strip"><div className="container strip-inner"><span>A WORLD OF CINEMA</span><span><i /> LESS SCROLLING, MORE STORIES</span><span><i /> YOUR NEXT FAVORITE IS HERE</span><span className="strip-last"><i /> PRESS PLAY ON POSSIBILITY</span></div></div>
    <section ref={catalogueRef} id="collection" className="container collection" aria-labelledby="collection-title">
      <div className="section-heading"><div><p className="eyebrow">FIND YOUR NEXT OBSESSION</p><h2 id="collection-title">The collection<span className="accent-dot">.</span></h2></div><div className="collection-tools"><label className="region-picker"><Globe2 size={17} /><span className="sr-only">Viewing region</span><select value={region} onChange={(event) => applyFilter({ region: event.target.value })}>{REGIONS.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label></div></div>
      <div className="search-sort-row"><form onSubmit={onSearch} className="search-form" role="search"><Search size={21} aria-hidden="true" /><label className="sr-only" htmlFor="film-search">Search films</label><input id="film-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="A title, a story, a world to discover…" maxLength={150} autoComplete="off" />{search ? <button type="button" className="icon-button clear-search" aria-label="Clear search" onClick={() => { setSearch(""); applyFilter({ query: "" }); }}><X size={18} /></button> : null}<button type="submit" className="search-submit">Search <ArrowRight size={16} /></button></form><label className="sort-picker"><SlidersHorizontal size={17} /><span className="sr-only">Sort films</span><select disabled={Boolean(options.query)} value={options.query ? "relevance" : options.sort} onChange={(event) => applyFilter({ sort: event.target.value as CatalogueOptions["sort"] })}>{options.query ? <option value="relevance">Search relevance</option> : null}<option value="popular">Most popular</option><option value="rating">Top rated</option><option value="newest">Newest first</option></select></label></div>
      <div className="genre-list" role="group" aria-label="Filter by genre">{GENRES.map((genre) => { const value = genre === "All films" ? "" : genre; return <button key={genre} className={`genre-chip ${options.genre === value ? "active" : ""}`} aria-pressed={options.genre === value} onClick={() => { setSearch(""); applyFilter({ genre: value, query: "" }); }}>{genre}</button>; })}</div>
      <div className="results-heading"><p aria-live="polite">{loading ? "Finding your next film…" : options.query ? `${data.totalResults.toLocaleString()} ${data.totalResults === 1 ? "result" : "results"} for “${options.query}”` : `${data.totalResults.toLocaleString()} stories to explore`}</p><span className={`source-label ${data.source === "demo" ? "demo" : ""}`}><span className="status-dot" />{data.source === "demo" ? "Preview collection" : "TMDB collection"}</span></div>
      {data.warning ? <p className="notice">{data.warning}</p> : null}
      {error ? <div className="empty-state" role="alert"><span className="empty-icon"><Search size={28} /></span><h3>A brief intermission.</h3><p>{error}</p><button className="button button-primary" onClick={() => setRetry((current) => current + 1)}>Try again <ArrowRight size={17} /></button></div> : data.movies.length === 0 ? <div className="empty-state"><span className="empty-icon"><Search size={28} /></span><h3>No films in this frame.</h3><p>Try a different title or genre. A great story is still out there.</p><button className="button button-primary" onClick={reset}>Explore all films <ArrowRight size={17} /></button></div> : <div className={`movie-grid ${loading ? "is-loading" : ""}`} aria-busy={loading}>{data.movies.map((movie, index) => <MovieCard movie={movie} key={movie.id} index={index} region={region} />)}</div>}
      {!error && data.totalPages > 1 ? <nav className="pagination" aria-label="Catalogue pages"><button className="button button-secondary" disabled={loading || data.page <= 1} onClick={() => { setOptions((current) => ({ ...current, page: Math.max(1, data.page - 1) })); catalogueRef.current?.scrollIntoView({ behavior: "smooth" }); }}><ChevronLeft size={17} /> Previous</button><span>Page <strong>{data.page}</strong> of {data.totalPages}</span><button className="button button-secondary" disabled={loading || data.page >= data.totalPages} onClick={() => { setOptions((current) => ({ ...current, page: data.page + 1 })); catalogueRef.current?.scrollIntoView({ behavior: "smooth" }); }}>Next <ChevronRight size={17} /></button></nav> : null}
      {isFiltered ? <button className="reset-link" onClick={reset}>Clear all filters <X size={15} /></button> : null}
    </section>
    <section className="container watchlist-promo"><div className="promo-art" aria-hidden="true"><BookmarkIllustration /></div><div><p className="eyebrow">SAVE THE GOOD ONES</p><h2>Tomorrow’s movie night.<br /><em>Sorted.</em></h2><p>Keep the films that catch your eye in one little place.<br />Your watchlist is ready whenever you are.</p><Link href="/watchlist" className="button button-primary">Your watchlist <ArrowUpRight size={18} /></Link></div><span className="promo-counter" aria-hidden="true">TO BE<br />CONTINUED.</span></section>
  </>;
}

function BookmarkIllustration() { return <svg viewBox="0 0 220 240" fill="none"><rect x="34" y="36" width="136" height="174" rx="8" fill="#24363b" transform="rotate(-12 34 36)" /><rect x="66" y="28" width="126" height="170" rx="8" fill="#ccdc8b" transform="rotate(9 66 28)" /><path d="M113 28h30v58l-15-10-15 10V28Z" fill="#0d171b" /><circle cx="131" cy="133" r="30" stroke="#0d171b" strokeWidth="2" /><path d="m124 119 21 14-21 14v-28Z" fill="#0d171b" /><path d="M39 11v15M31 19h16M199 195v15M191 202h16" stroke="#f38870" strokeWidth="2" /></svg>; }
