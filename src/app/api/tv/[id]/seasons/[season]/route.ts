import { NextRequest, NextResponse } from "next/server";
import { checkApiRateLimit } from "@/lib/api-rate-limit";
import { getTvSeasonEpisodes } from "@/lib/tv";

type Context = { params: Promise<{ id: string; season: string }> };
export async function GET(request: NextRequest, { params }: Context) {
  const limited = await checkApiRateLimit(request);
  if (limited) return limited;
  const { id, season } = await params;
  if (!/^[1-9]\d{0,9}$/.test(id) || !/^[1-9]\d{0,2}$/.test(season) ||
      Number(id) > 2_147_483_647) {
    return NextResponse.json({ error: "Invalid series or season." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const result = await getTvSeasonEpisodes(Number(id), Number(season));
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
