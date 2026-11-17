import type { Metadata } from "next";
import { Watchlist } from "@/components/watchlist";
export const metadata: Metadata = { title: "Your watchlist", description: "Keep the films that catch your eye in your personal Pinflix watchlist.", robots: { index: false, follow: true } };
export default function WatchlistPage() { return <Watchlist />; }
