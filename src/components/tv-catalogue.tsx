"use client";
import Link from "next/link";
import {ArrowRight,ChevronLeft,ChevronRight,Search,SlidersHorizontal,Star,Film} from "lucide-react";
import {useEffect,useRef,useState} from "react";
import {posterUrl} from "@/components/movie-card";
import type {TvCatalogueResult,TvShow} from "@/lib/tv";
import type {CatalogueOptions} from "@/lib/types";

const GENRES=["All shows","Drama","Comedy","Animation","Crime","Mystery","Documentary","Family","Action & Adventure","Sci-Fi & Fantasy"];
export function TvCard({show,index=0}: {show:TvShow;index?:number}){
  const [failed,setFailed]=useState(false);
  return <article className="movie-card tv-card">
    <div className="poster-wrap">
      <Link className="poster-link" href={"/tv/"+show.id} aria-label={"Explore "+show.title}>
        {show.posterPath&&!failed?<img src={posterUrl(show.posterPath)} alt={show.title+" poster"} width={400} height={600}
          loading={index<4?"eager":"lazy"} onError={()=>setFailed(true)}/>
          :<div className="tv-poster-placeholder"><Film size={36}/><span>PINFLIX · TV</span></div>}
        <span className="poster-explore">View series <ArrowRight size={16}/></span>
      </Link>
      {show.rating>0?<span className="rating"><Star size={12} fill="currentColor"/>{show.rating.toFixed(1)}</span>:null}
    </div>
    <div className="movie-card-info">
      <p className="movie-meta">{show.firstAirDate.slice(0,4)||"Series"}<span aria-hidden="true">·</span>{show.genres[0]||"TV Show"}</p>
      <h3><Link href={"/tv/"+show.id}>{show.title}</Link></h3>
    </div>
  </article>;
}

export function TvCatalogue({initial,initialOptions}:{
  initial:TvCatalogueResult;initialOptions:CatalogueOptions;
}){
  const [query,setQuery]=useState(initialOptions.query||"");
  const [options,setOptions]=useState<CatalogueOptions>({query:"",genre:"",sort:"popular",page:1,...initialOptions});
  const [data,setData]=useState(initial);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [retry,setRetry]=useState(0);
  const firstKey=useRef(JSON.stringify({query:initialOptions.query||"",genre:initialOptions.genre||"",sort:initialOptions.sort||"popular",page:initialOptions.page||1}));
  useEffect(()=>{
    const timer=setTimeout(()=>setOptions(current=>current.query===query.trim()?current:{...current,query:query.trim(),page:1}),320);
    return ()=>clearTimeout(timer);
  },[query]);
  useEffect(()=>{
    const key=JSON.stringify({query:options.query||"",genre:options.genre||"",sort:options.sort||"popular",page:options.page||1});
    if(key===firstKey.current&&retry===0)return;
    const controller=new AbortController();
    setLoading(true);setError(null);
    const p=new URLSearchParams({query:options.query||"",genre:options.genre||"",sort:options.sort||"popular",page:String(options.page||1)});
    fetch("/api/tv?"+p,{signal:controller.signal})
      .then(async response=>{if(!response.ok)throw new Error("Could not load TV shows.");return response.json() as Promise<TvCatalogueResult>;})
      .then(result=>setData(result))
      .catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"Unable to load TV shows.");})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[options,retry]);
  const update=(next:Partial<CatalogueOptions>)=>setOptions(current=>({...current,...next,page:1}));
  return <div className="container collection tv-collection">
    <div className="tv-intro"><p className="eyebrow">SERIES & STORIES</p><h1>TV Shows<span className="accent-dot">.</span></h1>
      <p>Discover something worth watching, from quick episodes to unforgettable seasons.</p>
      <Link className="text-link" href="/search?type=tv">Search all shows <ArrowRight size={16}/></Link>
    </div>
    <div className="search-sort-row">
      <label className="search-form"><Search size={19}/><span className="sr-only">Search TV shows</span>
        <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search TV series…" maxLength={80}/>
      </label>
      <label className="sort-picker"><SlidersHorizontal size={17}/><span className="sr-only">Sort TV shows</span>
        <select value={options.sort||"popular"} onChange={event=>update({sort:event.target.value as CatalogueOptions["sort"]})}>
          <option value="popular">Popular</option><option value="rating">Top rated</option><option value="newest">Newest</option>
        </select></label>
    </div>
    <div className="genre-list" role="group" aria-label="Filter TV genres">{GENRES.map(name=>{
      const genre=name==="All shows"?"":name;
      return <button key={name} className={"genre-chip "+((options.genre||"")===genre?"active":"")}
        onClick={()=>update({genre})} aria-pressed={(options.genre||"")===genre}>{name}</button>;
    })}</div>
    <div className="results-heading"><p aria-live="polite">{loading?"Finding shows…":data.totalResults.toLocaleString()+" TV shows"}</p>
      <span className={"source-label "+(data.source==="demo"?"demo":"")}>{data.source==="demo"?"Preview collection":"TMDB series"}</span></div>
    {data.warning?<p className="notice">{data.warning}</p>:null}
    {error?<div className="provider-empty" role="alert">{error} <button className="button button-secondary" onClick={()=>setRetry(r=>r+1)}>Retry</button></div>
      :data.shows.length===0?<div className="provider-empty"><h3>No shows found</h3><p>Try another title or genre.</p>
        <button className="button button-secondary" onClick={()=>{setQuery("");setOptions({query:"",genre:"",sort:"popular",page:1});}}>Clear filters</button>
      </div>
      :<div className={"movie-grid "+(loading?"is-loading":"")} aria-busy={loading}>{data.shows.map((show,index)=><TvCard key={show.id} show={show} index={index}/>)}</div>}
    {!error&&data.totalPages>1?<nav className="pagination" aria-label="TV pages">
      <button className="button button-secondary" disabled={loading||data.page<=1} onClick={()=>setOptions(current=>({...current,page:Math.max(1,data.page-1)}))}>
        <ChevronLeft size={16}/> Previous</button><span>Page {data.page} of {data.totalPages}</span>
      <button className="button button-secondary" disabled={loading||data.page>=data.totalPages} onClick={()=>setOptions(current=>({...current,page:data.page+1}))}>
        Next <ChevronRight size={16}/></button>
    </nav>:null}
  </div>;
}
