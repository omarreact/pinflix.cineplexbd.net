import type {Metadata} from "next";
import Link from "next/link";
import {Search,ArrowUpRight,Star,Film} from "lucide-react";
import {searchDiscovery,normalizeKind} from "@/lib/discovery";
import {posterUrl} from "@/components/movie-card";
export const metadata:Metadata={title:"Search movies and TV",description:"Search Pinflix for movies and television shows."};
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
export default async function SearchPage({searchParams}:Props){
  const params=await searchParams;
  const q=typeof params.q==="string"?params.q:typeof params.query==="string"?params.query:"";
  const type=normalizeKind(typeof params.type==="string"?params.type:null);
  const results=await searchDiscovery(q,type,20);
  const urlFor=(kind:"all"|"movie"|"tv")=>"/search?q="+encodeURIComponent(results.query)+"&type="+kind;
  return <section className="container collection search-page">
    <div className="tv-intro"><p className="eyebrow">DISCOVER MORE</p><h1>Search<span className="accent-dot">.</span></h1>
      <p>Find movies and television series in one place.</p></div>
    <form className="search-page-form" action="/search" method="get" role="search">
      <label className="search-form"><Search size={21}/><span className="sr-only">Search titles</span>
        <input name="q" defaultValue={results.query} maxLength={80} autoFocus placeholder="Search a movie or series…"/></label>
      <input type="hidden" name="type" value={type}/>
      <button className="button button-primary" type="submit">Search</button>
    </form>
    <nav className="genre-list" aria-label="Search types">{([["all","All titles"],["movie","Movies"],["tv","TV Shows"]] as const).map(([kind,label])=>
      <Link key={kind} className={"genre-chip "+(kind===type?"active":"")} href={urlFor(kind)} aria-current={kind===type?"page":undefined}>{label}</Link>)}</nav>
    {results.warning?<p className="notice">{results.warning}</p>:null}
    <div className="results-heading"><p>{results.query?results.items.length+" matching titles":"Enter two or more characters to start searching."}</p>
      <span className={"source-label "+(results.source==="demo"?"demo":"")}>{results.source==="demo"?"Preview matches":"Live TMDB results"}</span></div>
    {results.query.length>=2&&results.items.length===0?<div className="provider-empty"><h3>No matching titles</h3><p>Try another search term.</p></div>:null}
    <div className="search-results-list">{results.items.map(hit=><Link key={hit.kind+":"+hit.id}
        className="search-result" href={"/"+(hit.kind==="tv"?"tv":"movie")+"/"+hit.id}>
      <span className="search-result-poster">{hit.posterPath?<img src={posterUrl(hit.posterPath)} width={72} height={106} alt=""/>:<Film size={23}/>}</span>
      <span className="search-result-copy"><strong>{hit.title}</strong><small>{hit.kind==="tv"?"TV Show":"Movie"} {hit.date?"· "+hit.date.slice(0,4):""} {hit.rating>0?"· ★ "+hit.rating.toFixed(1):""}</small>
        <span>{hit.description||"Explore title details."}</span></span><ArrowUpRight size={20}/></Link>)}</div>
  </section>;
}
