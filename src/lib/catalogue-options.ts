import type { CatalogueOptions } from "./types";

export const GENRE_IDS: Record<string, number> = {
  Action: 28, Adventure: 12, Animation: 16, Comedy: 35, Crime: 80,
  Documentary: 99, Drama: 18, Family: 10751, Fantasy: 14, History: 36,
  Horror: 27, Music: 10402, Mystery: 9648, Romance: 10749,
  "Science Fiction": 878, Thriller: 53, War: 10752, Western: 37,
};

export function normalizeCatalogueOptions(options: CatalogueOptions = {}): Required<CatalogueOptions> {
  const query = (options.query || "").trim().slice(0, 80);
  return {
    query,
    // TMDB search does not support a genre constraint; search takes precedence.
    genre: !query && options.genre && GENRE_IDS[options.genre] ? options.genre : "",
    sort: options.sort === "rating" || options.sort === "newest" ? options.sort : "popular",
    page: Number.isInteger(options.page) ? Math.min(500, Math.max(1, options.page!)) : 1,
    region: /^[A-Z]{2}$/.test((options.region || "BD").toUpperCase()) ? (options.region || "BD").toUpperCase() : "BD",
  };
}

export function parseCatalogueRequest(url: URL): Required<CatalogueOptions> {
  return normalizeCatalogueOptions({
    query: url.searchParams.get("query") || url.searchParams.get("q") || "",
    genre: url.searchParams.get("genre") || "",
    sort: url.searchParams.get("sort") as CatalogueOptions["sort"],
    page: Number(url.searchParams.get("page") || 1),
    region: url.searchParams.get("region") || "BD",
  });
}

export function parseMovieId(value: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2_147_483_647 ? id : null;
}
