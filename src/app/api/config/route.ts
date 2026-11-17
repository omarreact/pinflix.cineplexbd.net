import { getRuntimeEnv } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = await getRuntimeEnv();
  return Response.json(
    {
      catalogueSource:
        env.TMDB_READ_TOKEN?.trim() || env.TMDB_API_KEY?.trim() ? "tmdb" : "demo",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
