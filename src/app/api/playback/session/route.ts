import { NextResponse } from "next/server";
import { checkApiRateLimit } from "@/lib/api-rate-limit";
import { isSameOriginMutation, readBoundedJsonObject } from "@/lib/request-security";
import { isSignedR2Source, parseR2Selection, r2CatalogueKey } from "@/lib/r2-playback";

export const dynamic = "force-dynamic";

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
  const edgeBase = getEdgeBaseUrl();
  if (!edgeBase) {
    return NextResponse.json({ status: "unavailable", message: "Playback edge is not configured." }, { status: 503 });
  }

  const selection = parseR2Selection(payload);
  const title = cleanTitle(payload.title);
  if (!selection) {
    return NextResponse.json({ status: "error", message: "Invalid video selection." }, { status: 400, headers: { "Cache-Control": "no-store" } });
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
    const message = response.status === 404 ? "Video not available." : "The video CDN is temporarily unavailable.";
    return NextResponse.json({ status: "unavailable", message, key, title }, { status: response.status });
  }

  const sources = Array.isArray(data.sources) ? data.sources.filter(item => isSignedR2Source(item, edgeBase.origin)).slice(0, 8) : [];

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
    ...selection,
    title,
    edge: edgeBase.origin,
    sources,
  }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
