import "server-only";
import { getRuntimeEnv } from "./cloudflare";
import { GENRE_IDS, normalizeCatalogueOptions } from "./catalogue-options";
import { getDemoCatalogue, getDemoMovie } from "./demo-data";
import { list, mapMovie, mapMovieDetail, number, object } from "./tmdb-mapping";
import type { CatalogueOptions, CatalogueResult, MovieResult } from "./types";

class TMDBError extends Error { constructor(public status: number) { super(`TMDB returned status ${status}`); } }

async function tmdbRequest(path: string, params: Record<string, string>, env: Partial<CloudflareEnv>): Promise<unknown> {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const cacheKey = `tmdb:v1:${url.pathname}:${url.searchParams.toString()}`;
  if (env.MOVIE_CACHE) {
    try { const cached = await env.MOVIE_CACHE.get<unknown>(cacheKey, "json"); if (cached !== null) return cached; }
    catch { /* Cache failures must not disable catalogue reads. */ }
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (env.TMDB_READ_TOKEN) headers.Authorization = `Bearer ${env.TMDB_READ_TOKEN}`;
  else if (env.TMDB_API_KEY) url.searchParams.set("api_key", env.TMDB_API_KEY);
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!response.ok) throw new TMDBError(response.status);
  const data: unknown = await response.json();
  if (env.MOVIE_CACHE) {
    try { await env.MOVIE_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: path.startsWith("/search") ? 900 : 3600 }); }
    catch { /* A miss is harmless; the next request can fetch again. */ }
  }
  return data;
}

export async function getCatalogue(options: CatalogueOptions = {}): Promise<CatalogueResult> {
  const opts = normalizeCatalogueOptions(options);
  const env = await getRuntimeEnv();
  if (!env.TMDB_READ_TOKEN && !env.TMDB_API_KEY) return getDemoCatalogue(opts);
  try {
    const params: Record<string, string> = { language: "en-US", include_adult: "false", page: String(opts.page) };
    let path = "/discover/movie";
    if (opts.query) { path = "/search/movie"; params.query = opts.query; }
    else {
      params.sort_by = opts.sort === "rating" ? "vote_average.desc" : opts.sort === "newest" ? "primary_release_date.desc" : "popularity.desc";
      params["vote_count.gte"] = opts.sort === "rating" ? "500" : "50";
      params["primary_release_date.lte"] = new Date().toISOString().slice(0, 10);
      if (opts.genre) params.with_genres = String(GENRE_IDS[opts.genre]);
    }
    const raw = object(await tmdbRequest(path, params, env));
    const movies = list(raw.results).map(mapMovie).filter(movie => movie !== null);
    return { movies, page: number(raw.page, opts.page), totalPages: Math.min(500, Math.max(1, number(raw.total_pages, 1))), totalResults: number(raw.total_results), source: "tmdb" };
  } catch {
    // Never return upstream URLs/errors that could contain a credential.
    return { ...getDemoCatalogue(opts), warning: "Live discovery is temporarily unavailable. You’re browsing the demo collection." };
  }
}

export async function getMovie(id: number, region = "BD"): Promise<MovieResult> {
  if (!Number.isInteger(id) || id < 1 || id > 2_147_483_647) return { movie: null, source: "demo" };
  const normalizedRegion = normalizeCatalogueOptions({ region }).region;
  const env = await getRuntimeEnv();
  if (!env.TMDB_READ_TOKEN && !env.TMDB_API_KEY) return { movie: getDemoMovie(id), source: "demo" };
  try {
    const raw = await tmdbRequest(`/movie/${id}`, { language: "en-US", append_to_response: "videos,watch/providers" }, env);
    return { movie: mapMovieDetail(raw, normalizedRegion), source: "tmdb" };
  } catch (error) {
    if (error instanceof TMDBError && error.status === 404) return { movie: null, source: "tmdb" };
    return { movie: getDemoMovie(id), source: "demo", warning: "Live movie details are temporarily unavailable. Demo details are shown when available." };
  }
}
