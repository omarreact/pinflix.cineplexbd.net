import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MovieDetailView } from "@/components/movie-detail";
import { getMovie } from "@/lib/tmdb";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return { title: "Film not found" };
  const { movie } = await getMovie(Number(id));
  return movie ? { title: movie.title, description: movie.overview.slice(0, 155), openGraph: { title: `${movie.title} · Pinflix`, description: movie.overview.slice(0, 155) } } : { title: "Film not found" };
}

export default async function MoviePage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  const region = typeof query.region === "string" && /^[A-Z]{2}$/.test(query.region) ? query.region : "BD";
  const initial = await getMovie(Number(id), region);
  if (!initial.movie) notFound();
  return <MovieDetailView initial={initial} initialRegion={region} />;
}
