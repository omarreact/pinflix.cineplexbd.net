"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Bookmark, Menu, X } from "lucide-react";
import { useState } from "react";
import { useWatchlist } from "@/components/app-providers";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { movies, ready, user, authError, signOutUser } = useWatchlist();
  return <header className="site-header">
    <div className="container header-inner">
      <Link href="/" className="wordmark" aria-label="Pinflix home" onClick={() => setMenuOpen(false)}><span className="brand-symbol" aria-hidden="true">p</span>pinflix<span className="brand-dot">.</span></Link>
      <button className="icon-button menu-toggle" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
      <nav id="main-navigation" aria-label="Main navigation" className={`main-nav ${menuOpen ? "is-open" : ""}`}>
        <Link href="/" aria-current={pathname === "/" ? "page" : undefined} onClick={() => setMenuOpen(false)}>Discover</Link>
        <Link href="/watchlist" aria-current={pathname === "/watchlist" ? "page" : undefined} onClick={() => setMenuOpen(false)}><Bookmark size={16} /> Watchlist <span className="nav-count">{ready ? movies.length : 0}</span></Link>
        <Link href="/about" aria-current={pathname === "/about" ? "page" : undefined} onClick={() => setMenuOpen(false)}>Our story</Link>
        {user ? <button className="nav-account" onClick={() => void signOutUser()}>Sign out <ArrowUpRight size={16} /></button> : <Link href="/sign-in" className="nav-account" onClick={() => setMenuOpen(false)}>Sign in <ArrowUpRight size={16} /></Link>}
      </nav>
      {authError ? <p className="notice" role="alert">{authError}</p> : null}
    </div>
  </header>;
}
