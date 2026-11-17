import type { Metadata } from "next";
import { AppProviders } from "@/components/app-providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Pinflix — Find your next great film", template: "%s · Pinflix" },
  description: "Find a film worth your evening. Discover movies, save your personal watchlist, and explore legal viewing options in your region.",
  icons: { icon: "/icon.svg" },
  openGraph: { title: "Pinflix — Find your next great film", description: "A little less scrolling. A little more cinema.", type: "website", siteName: "Pinflix" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><AppProviders><SiteHeader /><main id="main-content">{children}</main><SiteFooter /></AppProviders></body></html>;
}
