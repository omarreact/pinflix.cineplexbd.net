import "server-only";
import { getRuntimeEnv } from "./cloudflare";
import { tmdbRequest } from "./tmdb";
import { DEMO_MOVIES } from "./demo-data";
import { DEMO_TV_SHOWS, mapTvShow } from "./tv";
import { list, mapMovie, object } from "./tmdb-mapping";

export type SearchKind = "all" | "movie" | "tv";
export interface SearchHit {
  id:number; kind:"movie"|"tv"; title:string; description:string;
  date:string; posterPath:string|null; rating:number;
}
export interface SearchResponse {
  items:SearchHit[]; query:string; kind:SearchKind; source:"tmdb"|"demo"; warning?:string;
}

export function normalizeKind(value:string|null|undefined):SearchKind {
  return value==="movie"||value==="tv"?value:"all";
}
export function normalizeQuery(input:string):string {return input.trim().slice(0,80);}

function demoSearch(query:string,kind:SearchKind,limit:number):SearchResponse {
  const term=query.toLowerCase();
  const movies=kind==="tv"?[]:DEMO_MOVIES.map(movie=>({
    id:movie.id,kind:"movie" as const,title:movie.title,description:movie.overview,
    date:movie.releaseDate,posterPath:movie.posterPath,rating:movie.rating
  }));
  const shows=kind==="movie"?[]:DEMO_TV_SHOWS.map(show=>({
    id:show.id,kind:"tv" as const,title:show.title,description:show.overview,
    date:show.firstAirDate,posterPath:show.posterPath,rating:show.rating
  }));
  return {items:[...movies,...shows].filter(item=>item.title.toLowerCase().includes(term))
    .slice(0,limit),query,kind,source:"demo"};
}

export async function searchDiscovery(input:string,kind:SearchKind="all",limit=12):Promise<SearchResponse> {
  const query=normalizeQuery(input);
  const safeLimit=Math.max(1,Math.min(20,Math.floor(limit)||12));
  if (query.length<2) return {items:[],query,kind,source:"demo"};
  const env=await getRuntimeEnv();
  if (!env.TMDB_READ_TOKEN&&!env.TMDB_API_KEY) return demoSearch(query,kind,safeLimit);
  try {
    const path=kind==="all"?"/search/multi":kind==="movie"?"/search/movie":"/search/tv";
    const raw=object(await tmdbRequest(path,{query,language:"en-US",include_adult:"false",page:"1"},env));
    const items:SearchHit[]=[];
    for(const entry of list(raw.results)){
      const item=object(entry);
      const mediaType=kind==="all"?item.media_type:kind;
      if(mediaType==="movie"){
        const mapped=mapMovie(item);
        if(mapped&&item.adult!==true)items.push({id:mapped.id,kind:"movie",
          title:mapped.title,description:mapped.overview,date:mapped.releaseDate,
          posterPath:mapped.posterPath,rating:mapped.rating});
      }else if(mediaType==="tv"){
        const mapped=mapTvShow(item);
        if(mapped)items.push({id:mapped.id,kind:"tv",title:mapped.title,
          description:mapped.overview,date:mapped.firstAirDate,
          posterPath:mapped.posterPath,rating:mapped.rating});
      }
      if(items.length>=safeLimit)break;
    }
    return {items,query,kind,source:"tmdb"};
  }catch{
    return {...demoSearch(query,kind,safeLimit),
      warning:"Live search is temporarily unavailable. Showing preview matches."};
  }
}
