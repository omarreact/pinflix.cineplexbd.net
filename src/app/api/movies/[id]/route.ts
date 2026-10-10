import { NextRequest, NextResponse } from "next/server";
import { parseMovieId } from "@/lib/catalogue-options";
import { getMovie } from "@/lib/tmdb";
import { checkApiRateLimit } from "@/lib/api-rate-limit";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const limited = await checkApiRateLimit(request);
  if (limited) return limited;
  const id = parseMovieId((await context.params).id);
  if (!id) return NextResponse.json({ error: "Invalid movie ID." }, { status: 400 });
  const result = await getMovie(id, request.nextUrl.searchParams.get("region") || "BD");
  return NextResponse.json(result, { status: result.movie ? 200 : 404, headers: { "Cache-Control": "private, no-store" } });
}
