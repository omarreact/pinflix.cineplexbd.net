import { NextRequest,NextResponse } from "next/server";
import { checkApiRateLimit } from "@/lib/api-rate-limit";
import { normalizeCatalogueOptions } from "@/lib/catalogue-options";
import { getTvCatalogue } from "@/lib/tv";
export async function GET(request:NextRequest){
  const limited=await checkApiRateLimit(request);
  if(limited)return limited;
  const q=request.nextUrl.searchParams;
  const options=normalizeCatalogueOptions({
    query:q.get("query")||q.get("q")||"",genre:q.get("genre")||"",
    sort:q.get("sort") as "popular"|"rating"|"newest",
    page:Number(q.get("page")||1)});
  const result=await getTvCatalogue(options);
  return NextResponse.json(result,{headers:{"Cache-Control":"private, no-store"}});
}
