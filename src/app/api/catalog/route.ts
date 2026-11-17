import { NextRequest, NextResponse } from "next/server";
import { parseCatalogueRequest } from "@/lib/catalogue-options";
import { getCatalogue } from "@/lib/tmdb";
import { checkApiRateLimit } from "@/lib/api-rate-limit";

export async function GET(request: NextRequest) {
  const limited = await checkApiRateLimit(request);
  if (limited) return limited;
  const result = await getCatalogue(parseCatalogueRequest(request.nextUrl));
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
