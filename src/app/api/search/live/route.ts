import {NextRequest,NextResponse} from "next/server";
import {checkApiRateLimit} from "@/lib/api-rate-limit";
import {normalizeKind,searchDiscovery} from "@/lib/discovery";
export async function GET(request:NextRequest){
  const limited=await checkApiRateLimit(request);
  if(limited)return limited;
  const p=request.nextUrl.searchParams;
  const q=p.get("q")||p.get("query")||"";
  const data=await searchDiscovery(q,normalizeKind(p.get("type")),Number(p.get("limit")||8));
  return NextResponse.json(data,{headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
