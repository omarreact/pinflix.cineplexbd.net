import type {Metadata} from "next";
import {TvCatalogue} from "@/components/tv-catalogue";
import {getTvCatalogue} from "@/lib/tv";
import type {CatalogueOptions} from "@/lib/types";
export const metadata:Metadata={title:"TV Shows",description:"Find TV series, explore seasons and discover official watching options."};
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
export default async function TvPage({searchParams}:Props){
  const p=await searchParams;
  const value=(key:string)=>typeof p[key]==="string"?p[key] as string:undefined;
  const initialOptions:CatalogueOptions={query:value("q")||"",page:1,sort:"popular",genre:""};
  const initial=await getTvCatalogue(initialOptions);
  return <TvCatalogue initial={initial} initialOptions={initialOptions}/>;
}
