import "server-only";
import { getRuntimeEnv } from "./cloudflare";

export async function checkApiRateLimit(request: Request): Promise<Response | null> {
  const env = await getRuntimeEnv();
  if (!env.API_RATE_LIMITER) return null;
  // Cloudflare sets this trusted header at the Worker boundary. The local
  // simulator uses one shared preview bucket; this is not a global quota.
  const key = request.headers.get("cf-connecting-ip") || "local-preview";
  try {
    const { success } = await env.API_RATE_LIMITER.limit({ key });
    return success ? null : Response.json({ error: "Please wait a moment before searching again." }, { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Discovery is temporarily unavailable. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
