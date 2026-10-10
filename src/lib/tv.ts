import "server-only";
import { getRuntimeEnv } from "./cloudflare";
import { tmdbRequest } from "./tmdb";
import { list, number, object, safeImagePath, safeProviderLink, text } from "./tmdb-mapping";
import { normalizeCatalogueOptions } from "./catalogue-options";
import type { CatalogueOptions } from "./types";

export const TV_GENRES: Record<string, number> = {
  Drama: 18, Comedy: 35, Animation: 16, Crime: 80, Documentary: 99,
  Family: 10751, Mystery: 9648, "Action & Adventure": 10759,
  "Sci-Fi & Fantasy": 10765, Kids: 10762, Reality: 10764, "War & Politics": 10768,
};

export interface TvShow {
  id: number;
  title: string;
  overview: string;
  firstAirDate: string;
  rating: number;
  posterPath: string | null;
  backdropPath: string | null;
  genres: string[];
  language: string;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
}

export interface TvSeason {
  number: number;
  title: string;
  episodeCount: number;
  airDate: string;
  posterPath: string | null;
}

export interface TvDetail extends TvShow {
  tagline: string;
  seasons: TvSeason[];
  networks: string[];
  trailer: { key: string; name: string } | null;
  providers: string[];
  providerLink: string | null;
}

export interface TvCatalogueResult {
  shows: TvShow[];
  page: number;
  totalPages: number;
  totalResults: number;
  source: "tmdb" | "demo";
  warning?: string;
}

export interface TvDetailResult {
  show: TvDetail | null;
  source: "tmdb" | "demo";
  warning?: string;
}

const DEMO_TV: TvShow[] = [
  [1396, "Breaking Bad", "2008-01-20", ["Drama", "Crime"]],
  [66732, "Stranger Things", "2016-07-15", ["Drama", "Mystery", "Sci-Fi & Fantasy"]],
  [100088, "The Last of Us", "2023-01-15", ["Drama", "Action & Adventure"]],
  [94605, "Arcane", "2021-11-06", ["Animation", "Sci-Fi & Fantasy"]],
  [95396, "Severance", "2022-02-18", ["Drama", "Mystery"]],
  [70523, "Dark", "2017-12-01", ["Mystery", "Drama"]],
  [136315, "The Bear", "2022-06-23", ["Drama", "Comedy"]],
  [1429, "Attack on Titan", "2013-04-07", ["Animation", "Action & Adventure"]],
].map(([id, title, firstAirDate, genres]) => ({
  id: id as number, title: title as string, firstAirDate: firstAirDate as string,
  genres: genres as string[], overview: "Preview listing — connect TMDB for the latest series information.",
  rating: 0, posterPath: null, backdropPath: null, language: "",
  numberOfSeasons: null, numberOfEpisodes: null,
}));

export const DEMO_TV_SHOWS = DEMO_TV;

export function mapTvShow(input: unknown): TvShow | null {
  const raw = object(input);
  const id = number(raw.id);
  const title = text(raw.name);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647 || !title) return null;
  const genres = Array.isArray(raw.genres)
    ? list(raw.genres).map(entry => text(object(entry).name)).filter(Boolean)
    : list(raw.genre_ids).map(genre => Object.keys(TV_GENRES).find(name => TV_GENRES[name] === genre) || "").filter(Boolean);
  return {
    id, title: title.slice(0, 200), overview: text(raw.overview).slice(0, 5000),
    firstAirDate: /^\d{4}-\d{2}-\d{2}$/.test(text(raw.first_air_date)) ? text(raw.first_air_date) : "",
    rating: Math.min(10, Math.max(0, number(raw.vote_average))),
    posterPath: safeImagePath(raw.poster_path), backdropPath: safeImagePath(raw.backdrop_path),
    genres, language: text(raw.original_language).slice(0, 8),
    numberOfSeasons: number(raw.number_of_seasons) > 0 ? number(raw.number_of_seasons) : null,
    numberOfEpisodes: number(raw.number_of_episodes) > 0 ? number(raw.number_of_episodes) : null,
  };
}

function previewDetail(show: TvShow): TvDetail {
  return { ...show, tagline: "", seasons: [], networks: [], trailer: null, providers: [], providerLink: null };
}

function filterDemo(options: CatalogueOptions): TvCatalogueResult {
  const opts = normalizeCatalogueOptions(options);
  opts.genre = !opts.query && options.genre && TV_GENRES[options.genre] ? options.genre : "";
  let shows = DEMO_TV.filter(show =>
    (!opts.query || show.title.toLowerCase().includes(opts.query.toLowerCase())) &&
    (!opts.genre || show.genres.includes(opts.genre)));
  if (opts.sort === "rating") shows = [...shows].sort((a,b) => a.title.localeCompare(b.title));
  if (opts.sort === "newest") shows = [...shows].sort((a,b) => b.firstAirDate.localeCompare(a.firstAirDate));
  const totalResults = shows.length;
  return { shows: shows.slice((opts.page - 1)*8,opts.page*8),page:opts.page,
    totalResults,totalPages:Math.max(1,Math.ceil(totalResults/8)),source:"demo" };
}

export async function getTvCatalogue(options: CatalogueOptions = {}): Promise<TvCatalogueResult> {
  const opts = normalizeCatalogueOptions(options);
  opts.genre = !opts.query && options.genre && TV_GENRES[options.genre] ? options.genre : "";
  const env = await getRuntimeEnv();
  if (!env.TMDB_READ_TOKEN && !env.TMDB_API_KEY) return filterDemo(opts);
  try {
    const params: Record<string,string> = {language:"en-US",page:String(opts.page),include_adult:"false"};
    let path = "/discover/tv";
    if (opts.query) {path="/search/tv";params.query=opts.query;}
    else {
      params.sort_by = opts.sort === "rating" ? "vote_average.desc" : opts.sort === "newest" ? "first_air_date.desc" : "popularity.desc";
      params["vote_count.gte"] = opts.sort === "rating" ? "150" : "20";
      params["first_air_date.lte"] = new Date().toISOString().slice(0,10);
      if (opts.genre && TV_GENRES[opts.genre]) params.with_genres=String(TV_GENRES[opts.genre]);
    }
    const raw = object(await tmdbRequest(path,params,env));
    return {shows:list(raw.results).map(mapTvShow).filter((show):show is TvShow=>show!==null),
      page:number(raw.page,opts.page),totalPages:Math.max(1,Math.min(500,number(raw.total_pages,1))),
      totalResults:number(raw.total_results),source:"tmdb"};
  } catch {
    return {...filterDemo(opts),warning:"Live TV discovery is temporarily unavailable. Showing preview listings."};
  }
}

export async function getTvDetail(id:number, region = "BD"):Promise<TvDetailResult> {
  if (!Number.isSafeInteger(id) || id<1 || id>2_147_483_647) return {show:null,source:"demo"};
  const env=await getRuntimeEnv();
  const preview=DEMO_TV.find(show=>show.id===id);
  if (!env.TMDB_READ_TOKEN && !env.TMDB_API_KEY) return {show:preview?previewDetail(preview):null,source:"demo"};
  try {
    const raw=object(await tmdbRequest("/tv/"+id,{
      language:"en-US",append_to_response:"videos,watch/providers"},env));
    const mapped=mapTvShow(raw);
    if (!mapped) return {show:null,source:"tmdb"};
    const regionCode=/^[A-Z]{2}$/.test(region)?region:"BD";
    const providerRegion=object(object(object(raw["watch/providers"]).results)[regionCode]);
    const trailer=list(object(raw.videos).results).map(object).find(v=>
      v.site==="YouTube" && v.type==="Trailer" && /^[a-zA-Z0-9_-]{11}$/.test(text(v.key)));
    const seasons=list(raw.seasons).map(value=>{
      const season=object(value);
      return {number:number(season.season_number),title:text(season.name).slice(0,100),
        episodeCount:number(season.episode_count),airDate:text(season.air_date),
        posterPath:safeImagePath(season.poster_path)} as TvSeason;
    }).filter(season=>Number.isInteger(season.number)&&season.number>=0);
    const providers=[...list(providerRegion.flatrate),...list(providerRegion.rent),...list(providerRegion.buy)]
      .map(item=>text(object(item).provider_name).slice(0,80)).filter(Boolean);
    return {show:{...mapped,tagline:text(raw.tagline).slice(0,280),seasons,
      networks:list(raw.networks).map(item=>text(object(item).name)).filter(Boolean).slice(0,6),
      trailer:trailer?{key:text(trailer.key),name:text(trailer.name).slice(0,120)}:null,
      providers:[...new Set(providers)],providerLink:safeProviderLink(providerRegion.link)},source:"tmdb"};
  } catch {
    return {show:preview?previewDetail(preview):null,source:"demo",
      warning:"Live show details are unavailable. Preview information is shown when available."};
  }
}
