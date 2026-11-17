import { GENRE_IDS } from "./catalogue-options";
import type { Movie, MovieDetail } from "./types";

export function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
export function text(value: unknown): string { return typeof value === "string" ? value : ""; }
export function number(value: unknown, fallback = 0): number { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }

export function safeImagePath(value: unknown): string | null {
  const path = text(value);
  return /^\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(path) ? path : null;
}
export function safeProviderLink(value: unknown): string | null {
  try {
    const url = new URL(text(value));
    return url.protocol === "https:" && ["www.themoviedb.org", "themoviedb.org"].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}

export function mapMovie(value: unknown): Movie | null {
  const raw = object(value);
  const id = number(raw.id);
  if (!Number.isInteger(id) || id < 1 || id > 2_147_483_647 || !text(raw.title)) return null;
  const genres = Array.isArray(raw.genres)
    ? list(raw.genres).map(genre => text(object(genre).name)).filter(Boolean)
    : list(raw.genre_ids).map(id => Object.keys(GENRE_IDS).find(name => GENRE_IDS[name] === id) || "").filter(Boolean);
  return {
    id, title: text(raw.title).slice(0, 200), overview: text(raw.overview).slice(0, 5000),
    releaseDate: /^\d{4}-\d{2}-\d{2}$/.test(text(raw.release_date)) ? text(raw.release_date) : "",
    rating: Math.min(10, Math.max(0, number(raw.vote_average))),
    posterPath: safeImagePath(raw.poster_path), backdropPath: safeImagePath(raw.backdrop_path),
    genres, runtime: number(raw.runtime) > 0 ? number(raw.runtime) : null,
    language: text(raw.original_language).slice(0, 8), tagline: text(raw.tagline).slice(0, 300),
  };
}

export function mapMovieDetail(value: unknown, region = "BD"): MovieDetail | null {
  const movie = mapMovie(value);
  if (!movie) return null;
  const raw = object(value);
  const providerRegion = object(object(object(raw["watch/providers"]).results)[region]);
  const providers: MovieDetail["providers"] = [];
  for (const [kind, field] of [["subscription", "flatrate"], ["rent", "rent"], ["buy", "buy"]] as const) {
    for (const value of list(providerRegion[field])) {
      const provider = object(value);
      const name = text(provider.provider_name).slice(0, 100);
      if (name && !providers.some(existing => existing.name === name && existing.type === kind))
        providers.push({ name, logoPath: safeImagePath(provider.logo_path), type: kind });
    }
  }
  const rawTrailer = list(object(raw.videos).results).map(object).find(video =>
    video.site === "YouTube" && video.type === "Trailer" && video.official === true && /^[\w-]{11}$/.test(text(video.key))
  );
  return {
    ...movie, providers, providerLink: safeProviderLink(providerRegion.link),
    trailer: rawTrailer ? { key: text(rawTrailer.key), site: "YouTube", name: text(rawTrailer.name).slice(0, 160) || "Official trailer" } : null,
  };
}
