import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// The app uses explicit TMDB KV caching, not ISR. R2 is optional for future assets.
export default defineCloudflareConfig();
