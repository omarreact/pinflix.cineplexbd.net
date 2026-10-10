// Secret names augment generated binding types; actual values never enter source.
interface CloudflareEnv {
  TMDB_READ_TOKEN?: string;
  TMDB_API_KEY?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  DEFAULT_WATCH_REGION?: string;
  MOVIE_CACHE?: { get: (key: string, type?: string) => Promise<unknown>; put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>; };
  API_RATE_LIMITER?: { limit: number; period: number; };
  MEDIA_BUCKET?: unknown;
}
