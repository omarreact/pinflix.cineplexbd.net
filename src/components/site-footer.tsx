import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="container footer-top"><div><Link className="wordmark" href="/">pinflix<span className="brand-dot">.</span></Link><p>A little less scrolling.<br />A little more cinema.</p></div><div className="footer-links"><Link href="/">Find a film <ArrowUpRight size={15} /></Link><Link href="/watchlist">Your watchlist <ArrowUpRight size={15} /></Link><Link href="/about">About & privacy <ArrowUpRight size={15} /></Link></div></div>
    <div className="container footer-bottom"><div className="attribution"><a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" aria-label="The Movie Database"><img src="/tmdb-logo.svg" alt="TMDB" width="88" height="18" /></a><span>This product uses the TMDB API but is not endorsed or certified by TMDB.</span><span>Watch-provider data powered by <a href="https://www.justwatch.com/" target="_blank" rel="noopener noreferrer">JustWatch</a>.</span></div><p>For the love of film. © {new Date().getFullYear()} Pinflix</p></div>
  </footer>;
}
