const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "vimeo.com",
  "player.vimeo.com",
  "archive.org",
  "www.archive.org",
  "cdn.jsdelivr.net",
  "images.ctfassets.net",
  "image.tmdb.org",
  "lh3.googleusercontent.com",
  "storage.googleapis.com",
]);

export type AllowedMediaSource = {
  type: "hls" | "dash" | "mp4" | "embed";
  url: string;
};

export function isAllowedMediaSource(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return true;
    return ALLOWED_HOSTS.has(parsed.hostname) || parsed.hostname.endsWith(".youtube.com") || parsed.hostname.endsWith(".vimeo.com");
  } catch {
    return false;
  }
}

export function normalizeMediaSource(source: string): AllowedMediaSource | null {
  if (!source || !isAllowedMediaSource(source)) return null;
  const lower = source.toLowerCase();
  if (lower.includes(".m3u8") || lower.includes("hls")) return { type: "hls", url: source };
  if (lower.includes(".mpd") || lower.includes("dash")) return { type: "dash", url: source };
  if (lower.includes(".mp4") || lower.includes("video/mp4")) return { type: "mp4", url: source };
  return { type: "embed", url: source };
}
