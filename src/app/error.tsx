"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) { return <section className="container empty-state not-found" role="alert"><p className="eyebrow">A BRIEF INTERMISSION</p><h1>The film club<br />will be right <em>back.</em></h1><p>We couldn’t load this page. Give it another try.</p><button className="button button-primary" onClick={retry}>Try again <ArrowRight size={17} /></button><Link className="text-link" href="/">Return to the collection</Link></section>; }
