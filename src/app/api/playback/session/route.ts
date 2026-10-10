import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PlaybackSource = {
  label: string;
  url: string;
};

type EdgeResolveResponse = {
  sources?: unknown;
  error?: unknown;
};

const DEFAULT_EDGE_BASE_URL = "https://media.pincodeit.com";

function getEdgeBaseUrl() {
  const raw = process.env.PLAYBACK_EDGE_BASE_URL || DEFAULT_EDGE_BASE_URL;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

function cleanTitle(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 180) : "";
}

function isPlaybackSource(value: unknown): value is PlaybackSource {
  if (!value || typeof value !== "object") return false;
  const source = value as Record<string, unknown>;
  if (typeof source.label !== "string" || typeof source.url !== "string") return false;
  try {
    const url = new URL(source.url);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

async function readPayload(request: Request) {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

export async function POST(request: Request) {
  const edgeBase = getEdgeBaseUrl();
  if (!edgeBase) {
    return NextResponse.json({ status: "unavailable", message: "Playback edge is not configured." }, { status: 503 });
  }

  const payload = await readPayload(request);
  const movieId = Number(payload.movieId);
  const title = cleanTitle(payload.title);

  if (!Number.isSafeInteger(movieId) || movieId <= 0) {
    return NextResponse.json({ status: "error", message: "Invalid movie selection." }, { status: 400 });
  }

  const key = `movie:${movieId}`;
  const resolveUrl = new URL("/public-resolve", edgeBase);
  resolveUrl.searchParams.set("key", key);

  let response: Response;
  try {
    response = await fetch(resolveUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({
      status: "unavailable",
      message: "Playback edge is unreachable right now.",
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
      message: "Playback edge returned an invalid response.",
      key,
      title,
    }, { status: 502 });
  }

  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : "Playback edge rejected this request.";
    return NextResponse.json({ status: "unavailable", message, key, title }, { status: response.status });
  }

  const sources = Array.isArray(data.sources) ? data.sources.filter(isPlaybackSource).slice(0, 8) : [];

  if (sources.length === 0) {
    return NextResponse.json({
      status: "unavailable",
      message: "No authorized playback source is cataloged for this title yet.",
      key,
      title,
      sources: [],
    }, { status: 404 });
  }

  return NextResponse.json({
    status: "ready",
    key,
    movieId,
    title,
    edge: edgeBase.origin,
    sources,
  }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
