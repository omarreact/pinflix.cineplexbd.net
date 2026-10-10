"use client";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Search,X,Film,ArrowRight} from "lucide-react";
import {useEffect,useRef,useState} from "react";
import {posterUrl} from "@/components/movie-card";
import type {SearchResponse,SearchKind} from "@/lib/discovery";

export function LiveSearch({onNavigate}: {onNavigate?:()=>void}){
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [kind,setKind]=useState<SearchKind>("all");
  const [data,setData]=useState<SearchResponse|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [active,setActive]=useState(-1);
  const ref=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    const handle=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement|null;
      const editing=target?.matches("input, textarea, select, [contenteditable=true]");
      if((event.key==="/"&&!editing)||(event.key.toLowerCase()==="k"&&(event.ctrlKey||event.metaKey))){
        event.preventDefault();setOpen(true);
      }else if(event.key==="Escape")setOpen(false);
    };
    window.addEventListener("keydown",handle);
    return ()=>window.removeEventListener("keydown",handle);
  },[]);
  useEffect(()=>{if(open)ref.current?.focus();},[open]);
  useEffect(()=>{
    if(!open||query.trim().length<2){
      setData(null);setLoading(false);setError(null);setActive(-1);return;
    }
    const controller=new AbortController();
    setLoading(true);setError(null);setActive(-1);
    const timer=window.setTimeout(()=>{
      const params=new URLSearchParams({q:query.trim(),type:kind,limit:"8"});
      fetch("/api/search/live?"+params,{signal:controller.signal,cache:"no-store"})
        .then(async r=>{if(!r.ok)throw new Error("Search is temporarily unavailable.");return r.json() as Promise<SearchResponse>;})
        .then(result=>{if(!controller.signal.aborted)setData(result);})
        .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Could not search titles.");})
        .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    },300);
    return ()=>{window.clearTimeout(timer);controller.abort();};
  },[open,query,kind]);
  const close=()=>{setOpen(false);onNavigate?.();};
  const results=data?.items||[];
  const searchUrl="/search?q="+encodeURIComponent(query.trim())+"&type="+kind;
  function submit(){
    if(query.trim().length<2)return;
    close();router.push(searchUrl);
  }
  return <>
    <button type="button" className="live-search-trigger" onClick={()=>setOpen(true)}
      aria-label="Search movies and TV shows"><Search size={17}/> <span>Search</span></button>
    {open?<div className="live-search-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)close();}}>
      <section className="live-search-dialog" role="dialog" aria-modal="true" aria-label="Search movies and TV shows">
        <div className="live-search-top">
          <Search size={21}/>
          <form onSubmit={event=>{event.preventDefault();submit();}}>
            <label className="sr-only" htmlFor="global-search-input">Search movies and TV shows</label>
            <input id="global-search-input" ref={ref} value={query} maxLength={80} autoComplete="off"
              placeholder="Search movies and TV shows…" onChange={event=>setQuery(event.target.value)}
              onKeyDown={event=>{
                if(event.key==="ArrowDown"){event.preventDefault();setActive(i=>Math.min(results.length-1,i+1));}
                if(event.key==="ArrowUp"){event.preventDefault();setActive(i=>Math.max(-1,i-1));}
                if(event.key==="Enter"&&active>=0&&results[active]){
                  event.preventDefault();const hit=results[active];close();router.push("/"+(hit.kind==="tv"?"tv":"movie")+"/"+hit.id);
                }
              }}
            />
          </form>
          <button type="button" className="icon-button" onClick={close} aria-label="Close search"><X size={21}/></button>
        </div>
        <div className="live-search-tabs" role="group" aria-label="Search category">
          {([["all","All"],["movie","Movies"],["tv","TV Shows"]] as const).map(([value,label])=>
            <button type="button" key={value} className={"genre-chip "+(kind===value?"active":"")}
              onClick={()=>setKind(value)} aria-pressed={kind===value}>{label}</button>)}
        </div>
        <div className="live-search-body" aria-live="polite">
          {query.trim().length<2?<p className="live-search-hint">Start typing to discover movies and television shows.</p>:null}
          {loading?<p className="live-search-hint">Searching…</p>:null}
          {error?<p className="notice" role="alert">{error}</p>:null}
          {!loading&&!error&&data?.warning?<p className="notice">{data.warning}</p>:null}
          {!loading&&!error&&data&&results.length===0?<p className="live-search-hint">No titles found. Try a different search.</p>:null}
          {!loading&&!error&&results.map((hit,index)=><Link
            className={"live-search-item "+(active===index?"is-active":"")} key={hit.kind+":"+hit.id}
            href={"/"+(hit.kind==="tv"?"tv":"movie")+"/"+hit.id} onClick={close}>
            <span className="live-search-poster">{hit.posterPath?<img src={posterUrl(hit.posterPath)} width={48} height={68} alt=""/>:<Film size={21}/>}</span>
            <span><strong>{hit.title}</strong><small>{hit.kind==="tv"?"TV Show":"Movie"} {hit.date?"· "+hit.date.slice(0,4):""}</small></span>
            <ArrowRight size={17}/>
          </Link>)}
          {data?.source==="demo"&&query.trim().length>=2?<p className="live-search-footnote">Preview results · Live catalogue requires TMDB configuration</p>:null}
        </div>
        {query.trim().length>=2?<Link className="live-search-all" href={searchUrl} onClick={close}>View search results <ArrowRight size={17}/></Link>:null}
      </section>
    </div>:null}
  </>;
}
