import { NextResponse } from "next/server";
import { checkApiRateLimit } from "@/lib/api-rate-limit";
import { isSameOriginMutation, readBoundedJsonObject } from "@/lib/request-security";
import { isSignedR2Source, parseR2Selection, r2CatalogueKey } from "@/lib/r2-playback";
import { resolveMainPinflix } from "@/lib/main-pinflix";

export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

type EdgeResolveResponse = {
  sources?: unknown;
  error?: unknown;
};

const DEFAULT_EDGE_BASE_URL = "https://media.pincodeit.com";

function getEdgeBaseUrl() {
  const raw = process.env.PLAYBACK_EDGE_BASE_URL || DEFAULT_EDGE_BASE_URL;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    return url;
  } catch {
    return null;
  }
}

function cleanTitle(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 180) : "";
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ status: "error", message: "Request origin not allowed." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ status: "error", message: "JSON request required." }, { status: 415, headers: { "Cache-Control": "no-store" } });
  }
  const limited = await checkApiRateLimit(request);
  if (limited) return limited;
  const payload = await readBoundedJsonObject(request);
  if (!payload) {
    return NextResponse.json({ status: "error", message: "Invalid request body." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const selection = parseR2Selection(payload);
  const title = cleanTitle(payload.title);
  if (!selection) {
    return NextResponse.json({ status: "error", message: "Invalid video selection." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  // Prioritize the same working source resolution as main PinFlix.
  // A TMDB identifier cannot be passed directly to that resolver: first match
  // its title and kind against the provider's own search results.
  const year = typeof payload.year === "number" && Number.isInteger(payload.year) &&
    payload.year >= 1880 && payload.year <= 2100 ? payload.year : undefined;
  const main = await resolveMainPinflix({
    kind: selection.kind,
    title,
    year,
    ...(selection.kind === "tv" ? { season: selection.season, episode: selection.episode } : {}),
  });

  if (main.status === "ready") {
    return NextResponse.json({
      status: "ready", title, ...selection,
      delivery: "main-pinflix", sources: main.sources,
    }, { headers: { "Cache-Control": "private, no-store" } });
  }

  // Keep the existing signed-R2 path as a secondary source for authorised
  // media. Missing/unpublished R2 objects never block the working main CDN.
  const edgeBase = getEdgeBaseUrl();
  if (!edgeBase) {
    return NextResponse.json({
      status: "unavailable", title,
      message: main.reason === "unmatched"
        ? "No matching title was found in the main PinFlix playback catalogue."
        : "Playback is temporarily unavailable.",
    }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const key = r2CatalogueKey(selection);
  const resolveUrl = new URL("/public-resolve", edgeBase);
  resolveUrl.searchParams.set("key", key);

  let response: Response;
  try {
    response = await fetch(resolveUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return NextResponse.json({
      status: "unavailable",
      message: main.reason === "unmatched"
        ? "No matching title in main PinFlix; R2 playback is also unreachable."
        : "The playback sources are temporarily unavailable.",
      key,
      title,
    }, { status: 502 });
  }

  let data: EdgeResolveResponse = {};
  try {
    data = await response.json() as EdgeResolveResponse;
  } catch {
    return NextResponse.json({
      status: "unavailable",
      message: "The video playback service returned an invalid response.",
      key,
      title,
    }, { status: 502 });
  }

  if (!response.ok) {
    const message = main.reason === "unmatched"
      ? "No matching title in the main PinFlix catalogue, and no R2 video is published for this title."
      : main.reason === "no-stream"
        ? "The main PinFlix title has no working source, and no R2 video is published."
        : "The main PinFlix playback service and R2 CDN are temporarily unavailable.";
    return NextResponse.json({ status: "unavailable", message, key, title }, {
      status: response.status === 404 ? 404 : 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const sources = Array.isArray(data.sources) ? data.sources.filter(item => isSignedR2Source(item, edgeBase.origin)).slice(0, 8) : [];

  if (sources.length === 0) {
    return NextResponse.json({
      status: "unavailable",
      message: main.reason === "unmatched"
        ? "This title is not matched to main PinFlix and no R2 video is cataloged."
        : "No available source found for this video.",
      key,
      title,
      sources: [],
    }, { status: 404 });
  }

  return NextResponse.json({
    status: "ready",
    key,
    ...selection,
    title,
    edge: edgeBase.origin,
    delivery: "r2",
    sources,
  }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
