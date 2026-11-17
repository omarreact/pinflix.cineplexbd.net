import Link from "next/link";
import { ArrowLeft, Film } from "lucide-react";
export default function NotFound() { return <section className="container not-found empty-state"><span className="empty-icon"><Film size={32} /></span><p className="eyebrow">404 · A MISSING FRAME</p><h1>This story took<br />a different <em>turn.</em></h1><p>The page or film you’re looking for isn’t in this collection.<br />There are plenty of good stories back home.</p><Link href="/" className="button button-primary"><ArrowLeft size={17} /> Back to discovering</Link></section>; }
