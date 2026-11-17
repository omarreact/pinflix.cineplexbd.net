import { Catalogue } from "@/components/catalogue";
import { getCatalogue } from "@/lib/tmdb";
import { normalizeCatalogueOptions } from "@/lib/catalogue-options";
import type { CatalogueOptions } from "@/lib/types";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : undefined;
  const sort = value("sort");
  const initialOptions: CatalogueOptions = normalizeCatalogueOptions({ query: value("query") ?? "", genre: value("genre") ?? "", sort: sort === "rating" || sort === "newest" ? sort : "popular", page: Math.max(1, Number(value("page")) || 1), region: value("region") ?? "BD" });
  const initial = await getCatalogue(initialOptions);
  return <Catalogue initial={initial} initialOptions={initialOptions} />;
}
