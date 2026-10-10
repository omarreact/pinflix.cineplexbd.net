import type {Metadata} from "next";
import {notFound} from "next/navigation";
import Link from "next/link";
import {ArrowLeft,ArrowUpRight,CalendarDays,Play,Star,Film} from "lucide-react";
import {getTvDetail} from "@/lib/tv";
import {TvEpisodeGuide} from "@/components/tv-episode-guide";
import {posterUrl} from "@/lib/poster-url";
type Props={params:Promise<{id:string}>;searchParams:Promise<{region?:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {id}=await params;
  if(!/^[1-9]\d{0,9}$/.test(id))return {title:"Series not found"};
  const result=await getTvDetail(Number(id));
  return {title:result.show?.title||"Series not found",
    description:result.show?.overview.slice(0,155)||"Discover TV series on Pinflix"};
}
export default async function TvShowPage({params,searchParams}:Props){
  const [{id},paramsQuery]=await Promise.all([params,searchParams]);
  if(!/^[1-9]\d{0,9}$/.test(id)||Number(id)>2147483647)notFound();
  const region=typeof paramsQuery.region==="string"&&/^[A-Z]{2}$/.test(paramsQuery.region)?paramsQuery.region:"BD";
  const result=await getTvDetail(Number(id),region);
  const show=result.show;
  if(!show)notFound();
  return <article className="container tv-detail">
    <Link className="back-link" href="/tv"><ArrowLeft size={17}/> Back to TV Shows</Link>
    <div className="tv-detail-layout">
      <div className="tv-detail-poster">{show.posterPath?<img src={posterUrl(show.posterPath)} alt={show.title+" poster"} width={440} height={660}/>
        :<div className="tv-poster-placeholder"><Film size={48}/><span>PINFLIX · TV</span></div>}</div>
      <div className="tv-detail-info"><p className="eyebrow">{result.source==="demo"?"PREVIEW SERIES":"EXPLORE THE SERIES"}</p>
        <h1>{show.title}</h1>{show.tagline?<p className="tv-tagline">{show.tagline}</p>:null}
        <div className="tv-meta">{show.firstAirDate?<span><CalendarDays size={16}/>{show.firstAirDate.slice(0,4)}</span>:null}
          {show.rating>0?<span><Star size={16} fill="currentColor"/>{show.rating.toFixed(1)} / 10</span>:null}
          {show.numberOfSeasons?<span>{show.numberOfSeasons} seasons</span>:null}
          {show.numberOfEpisodes?<span>{show.numberOfEpisodes} episodes</span>:null}</div>
        <div className="detail-genres">{show.genres.map(genre=><span key={genre}>{genre}</span>)}</div>
        <p className="tv-synopsis">{show.overview||"No synopsis is currently available."}</p>
        {show.networks.length?<p className="tv-networks">Networks: {show.networks.join(", ")}</p>:null}
        {show.trailer?<a className="button button-primary" href={"https://www.youtube.com/watch?v="+show.trailer.key}
          target="_blank" rel="noopener noreferrer"><Play size={17}/> Official trailer <ArrowUpRight size={15}/></a>:null}
      </div>
    </div>
    {result.warning?<p className="notice" role="status">{result.warning}</p>:null}
    <section className="tv-seasons" aria-labelledby="tv-season-title">
      <div className="section-heading"><div><p className="eyebrow">EPISODE GUIDE</p><h2 id="tv-season-title">Seasons<span className="accent-dot">.</span></h2></div></div>
      <TvEpisodeGuide showId={show.id} showTitle={show.title} seasons={show.seasons} />
    </section>
    <section className="tv-providers" aria-label="Viewing options">
      <h2>Where to watch</h2>
      {show.providers.length&&show.providerLink?<><p>{show.providers.join(" · ")}</p>
        <a className="text-link" href={show.providerLink} target="_blank" rel="noopener noreferrer">
          Check current availability <ArrowUpRight size={16}/></a></>
        :<p>Streaming availability has not been verified for this show.</p>}
      <p className="tv-attribution">TV data via TMDB; providers via TMDB / JustWatch. Provider availability can vary by region.</p>
    </section>
  </article>;
}
