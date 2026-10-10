import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap { const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"; return [{ url: origin, changeFrequency: "daily", priority: 1 }, { url: `${origin}/about`, changeFrequency: "monthly", priority: 0.5 }, { url: `${origin}/tv`, changeFrequency: "daily", priority: 0.8 }]; }
