const ALLOWED_HOSTS = new Set([
  "media.pincodeit.com",
  "youtube.com", "www.youtube.com", "youtu.be",
  "vimeo.com", "player.vimeo.com",
  "archive.org", "www.archive.org",
  "cdn.jsdelivr.net", "images.ctfassets.net",
  "image.tmdb.org", "lh3.googleusercontent.com",
  "storage.googleapis.com",
]);

export type AllowedMediaSource = {
  type: "hls" | "dash" | "mp4" | "embed";
  url: string;
};

export function isAllowedMediaSource(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return false;
    const localDev = process.env.NODE_ENV === "development"
      && ["localhost", "127.0.0.1"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !(localDev && parsed.protocol === "http:")) return false;
    if (parsed.hostname === "media.pincodeit.com") {
      return /^\/m\/media\/[a-zA-Z0-9_.\/-]+$/.test(parsed.pathname)
        && !parsed.pathname.includes("..")
        && !!parsed.searchParams.get("exp")
        && !!parsed.searchParams.get("sig");
    }
    return localDev || ALLOWED_HOSTS.has(parsed.hostname) ||
      parsed.hostname.endsWith(".youtube.com") || parsed.hostname.endsWith(".vimeo.com");
  } catch { return false; }
}

export function normalizeMediaSource(source: string): AllowedMediaSource | null {
  if (!source || !isAllowedMediaSource(source)) return null;
  const pathname = new URL(source).pathname.toLowerCase();
  if (pathname.endsWith(".m3u8")) return { type: "hls", url: source };
  if (pathname.endsWith(".mpd")) return { type: "dash", url: source };
  if (pathname.endsWith(".mp4")) return { type: "mp4", url: source };
  return { type: "embed", url: source };
}
