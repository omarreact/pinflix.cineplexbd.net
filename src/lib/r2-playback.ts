/**
 * The Cloudflare media Worker accepts only public R2 catalogue entries with
 * keys movie:<tmdbId> or tv:<tmdbId>:s<season>e<episode>.
 * Keep this contract aligned with pinflix-media-api's CATALOG_KEY.
 */
export type R2Selection =
  | { kind: "movie"; movieId: number }
  | { kind: "tv"; tvId: number; season: number; episode: number };

function isId(input: unknown): input is number {
  return typeof input === "number" && Number.isSafeInteger(input) && input >= 1 && input <= 2_147_483_647;
}
function isEpisodeIndex(input: unknown): input is number {
  return typeof input === "number" && Number.isInteger(input) && input >= 1 && input <= 999;
}

export function parseR2Selection(value: Record<string, unknown>): R2Selection | null {
  if (value.kind === "tv") {
    if (!isId(value.tvId) || !isEpisodeIndex(value.season) || !isEpisodeIndex(value.episode)) return null;
    return { kind: "tv", tvId: value.tvId, season: value.season, episode: value.episode };
  }
  if (value.kind === "movie" || value.kind === undefined) {
    return isId(value.movieId) ? { kind: "movie", movieId: value.movieId } : null;
  }
  return null;
}

export function r2CatalogueKey(selection: R2Selection): string {
  return selection.kind === "movie"
    ? `movie:${selection.movieId}`
    : `tv:${selection.tvId}:s${selection.season}e${selection.episode}`;
}

export type R2PlaybackSource = { label: string; url: string };
export function isSignedR2Source(value: unknown, origin: string, now = Math.floor(Date.now() / 1000)): value is R2PlaybackSource {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  if (typeof item.label !== "string" || typeof item.url !== "string" ||
      item.label.trim().length < 1 || item.label.length > 80) return false;
  try {
    const url = new URL(item.url);
    const exp = url.searchParams.get("exp") || "";
    const sig = url.searchParams.get("sig") || "";
    return url.origin === origin && url.protocol === "https:" &&
      !url.username && !url.password && !url.hash &&
      /^\/m\/media\/[A-Za-z0-9_.\/-]+\.(m3u8|mp4)$/i.test(url.pathname) &&
      !url.pathname.split("/").includes("..") &&
      /^\d{10,11}$/.test(exp) && Number(exp) > now && Number(exp) <= now + 6 * 3600 + 60 &&
      /^[0-9a-f]{64}$/.test(sig) &&
      [...url.searchParams.keys()].every(key => key === "exp" || key === "sig");
  } catch {
    return false;
  }
}
