/** Safe TMDB image or bundled preview asset URL. Shared by server and client views. */
export function posterUrl(path: string | null, size = "w500"): string {
  if (!path) return "/poster-fallback.svg";
  if (path.startsWith("/posters/") || path === "/poster-fallback.svg") return path;
  if (path.startsWith("https://image.tmdb.org/")) return path;
  if (!/^\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(path)) return "/poster-fallback.svg";
  return "https://image.tmdb.org/t/p/" + size + path;
}
