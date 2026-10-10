/**
 * Bridges Pinflix 3.0's TMDB-labelled titles to the original PinFlix
 * provider catalogue and playback API. No provider credentials or raw
 * upstream URLs are duplicated into this application.
 */
import { MAIN_PINFLIX_ORIGIN, isMainProxySource } from "@/lib/main-pinflix-url";
export { MAIN_PINFLIX_ORIGIN, isMainProxySource, mainProxyProtocol } from "@/lib/main-pinflix-url";
export type ProviderHit = {
  id: string;
  title: string;
  kind: "movie" | "show";
  year?: number;
};
export type PlaybackRequest = {
  kind: "movie" | "tv";
  title: string;
  year?: number;
  season?: number;
  episode?: number;
};
export type PlaybackSource = { label: string; url: string };
export type MainPlaybackResult =
  | { status: "ready"; sources: PlaybackSource[]; providerId: string }
  | { status: "unavailable"; reason: "unmatched" | "unreachable" | "no-stream" };

export function cleanLookupTitle(title: string, kind: "movie" | "tv"): string {
  const withoutEpisode = kind === "tv"
    ? title.replace(/\s*[·|–-]\s*S\d{1,3}\s*E\d{1,3}\s*$/i, "")
    : title;
  return withoutEpisode.trim().slice(0, 150);
}
export function normalizeMatchTitle(title: string): string {
  return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(YEAR_TAG, " ").replace(QUALITY_TAG, " ")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

/** Exact title and media type. No substring matching that could play
 * the wrong film/season; reject conflicting known release years.
 */
export function findProviderMatch(request: PlaybackRequest, hits: ProviderHit[]): ProviderHit | null {
  const needle = normalizeMatchTitle(cleanLookupTitle(request.title, request.kind));
  if (!needle || needle.length < 2) return null;
  const desiredKind = request.kind === "tv" ? "show" : "movie";
  const candidates = hits.filter(hit => hit.kind === desiredKind && MEDIA_ID.test(hit.id)
    && normalizeMatchTitle(hit.title) === needle
    && (!request.year || !hit.year || Math.abs(request.year - hit.year) <= 1));
  if (!candidates.length) return null;
  // Prefer an explicitly matching year over entries without year metadata.
  return candidates.find(hit => request.year && hit.year === request.year) ?? candidates[0];
}

type SearchResponse = { catalog?: unknown };
type ResolveResponse = { sources?: unknown };
function parseHits(value: unknown): ProviderHit[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).filter(hit => hit && typeof hit === "object")
    .map(hit => hit as Record<string, unknown>)
    .filter(hit => typeof hit.id === "string" && typeof hit.title === "string" &&
      (hit.kind === "movie" || hit.kind === "show"))
    .map(hit => ({ id: hit.id as string, title: hit.title as string, kind: hit.kind as ProviderHit["kind"],
      year: typeof hit.year === "number" && Number.isInteger(hit.year) ? hit.year : undefined }));
}

export async function resolveMainPinflix(request: PlaybackRequest, transport: typeof fetch = fetch): Promise<MainPlaybackResult> {
  const lookup = cleanLookupTitle(request.title, request.kind);
  if (lookup.length < 2) return { status: "unavailable", reason: "unmatched" };
  const search = new URL("/api/search/live", MAIN_PINFLIX_ORIGIN);
  search.searchParams.set("q", lookup);
  search.searchParams.set("kind", request.kind === "tv" ? "show" : "movie");
  let hits: ProviderHit[];
  try {
    const response = await transport(search, {
      headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(6500),
    });
    if (!response.ok) return { status: "unavailable", reason: "unreachable" };
    const data = await response.json() as SearchResponse;
    hits = parseHits(data.catalog);
  } catch { return { status: "unavailable", reason: "unreachable" }; }

  const matched = findProviderMatch(request, hits);
  if (!matched) return { status: "unavailable", reason: "unmatched" };

  const playback = new URL("/api/resolve", MAIN_PINFLIX_ORIGIN);
  playback.searchParams.set("id", matched.id);
  if (request.kind === "tv") {
    playback.searchParams.set("season", String(request.season || 1));
    playback.searchParams.set("episode", String(request.episode || 1));
  }
  let result: ResolveResponse;
  try {
    const response = await transport(playback, {
      headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(9000),
    });
    if (response.status === 404) return { status: "unavailable", reason: "no-stream" };
    if (!response.ok) return { status: "unavailable", reason: "unreachable" };
    result = await response.json() as ResolveResponse;
  } catch { return { status: "unavailable", reason: "unreachable" }; }

  if (!Array.isArray(result.sources)) return { status: "unavailable", reason: "no-stream" };
  const unique = new Set<string>();
  const sources: PlaybackSource[] = [];
  for (const item of result.sources.slice(0, 20)) {
    if (!item || typeof item !== "object") continue;
    const source = item as Record<string, unknown>;
    if (typeof source.url !== "string") continue;
    const absolute = new URL(source.url, MAIN_PINFLIX_ORIGIN).toString();
    if (!isMainProxySource(absolute) || unique.has(absolute)) continue;
    // Refuse mismatched IDs even when a malformed response comes from the backend.
    if (new URL(absolute).searchParams.get("id") !== matched.id) continue;
    unique.add(absolute);
    sources.push({
      label: typeof source.quality === "string" ? source.quality.slice(0, 80) : "Main PinFlix",
      url: absolute,
    });
    if (sources.length === 8) break;
  }
  return sources.length
    ? { status: "ready", providerId: matched.id, sources }
    : { status: "unavailable", reason: "no-stream" };
}
