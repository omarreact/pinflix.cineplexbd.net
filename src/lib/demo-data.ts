import type { CatalogueOptions, CatalogueResult, Movie, MovieDetail } from "./types";
import { normalizeCatalogueOptions } from "./catalogue-options";

type DemoSeed = [number, string, string, number, number, string[], string, string];
const seeds: DemoSeed[] = [
  [693134, "Dune: Part Two", "2024-02-27", 8.2, 167, ["Science Fiction", "Adventure"], "en", "A desert world. A destiny that changes everything."],
  [157336, "Interstellar", "2014-11-05", 8.4, 169, ["Science Fiction", "Drama", "Adventure"], "en", "A voyage beyond the familiar, anchored by the people we love."],
  [129, "Spirited Away", "2001-07-20", 8.5, 125, ["Animation", "Fantasy", "Family"], "ja", "A young traveller discovers courage in a world of spirits."],
  [569094, "Spider-Man: Across the Spider-Verse", "2023-05-31", 8.3, 140, ["Animation", "Action", "Adventure"], "en", "One hero, infinite possibilities."],
  [545611, "Everything Everywhere All at Once", "2022-03-24", 7.8, 140, ["Action", "Adventure", "Science Fiction"], "en", "An ordinary life unfolds across an extraordinary multiverse."],
  [120, "The Lord of the Rings: The Fellowship of the Ring", "2001-12-18", 8.4, 179, ["Adventure", "Fantasy", "Action"], "en", "The longest journey begins with the smallest step."],
  [105, "Back to the Future", "1985-07-03", 8.3, 116, ["Adventure", "Comedy", "Science Fiction"], "en", "A time machine turns a teenager's world upside down."],
  [10681, "WALL·E", "2008-06-22", 8.1, 98, ["Animation", "Family", "Science Fiction"], "en", "A small robot finds a very big reason to keep going."],
  [194, "Amélie", "2001-04-25", 7.9, 122, ["Comedy", "Romance"], "fr", "Small acts of kindness make an entire city feel different."],
  [27205, "Inception", "2010-07-15", 8.4, 148, ["Action", "Science Fiction", "Thriller"], "en", "A dream can become the most dangerous place to hide."],
  [1124, "The Prestige", "2006-10-19", 8.2, 130, ["Drama", "Mystery", "Thriller"], "en", "Two magicians turn rivalry into obsession."],
  [346698, "Barbie", "2023-07-19", 7.0, 114, ["Comedy", "Adventure", "Fantasy"], "en", "A familiar world meets a very unfamiliar adventure."],
];

// A deliberately small, labelled demo collection. Ratings are sample snapshots;
// availability is never fabricated. Live TMDB supplies current metadata.
export const DEMO_MOVIES: Movie[] = seeds.map(([id, title, releaseDate, rating, runtime, genres, language, overview]) => ({
  id, title, releaseDate, rating, runtime, genres, language, overview,
  posterPath: `/posters/${id}.svg`, backdropPath: null, tagline: overview,
}));

export function getDemoCatalogue(options: CatalogueOptions = {}): CatalogueResult {
  const opts = normalizeCatalogueOptions(options);
  let movies = DEMO_MOVIES.filter(movie =>
    (!opts.query || `${movie.title} ${movie.overview}`.toLocaleLowerCase().includes(opts.query.toLocaleLowerCase())) &&
    (!opts.genre || movie.genres.includes(opts.genre))
  );
  if (opts.sort === "rating") movies = [...movies].sort((a, b) => b.rating - a.rating);
  if (opts.sort === "newest") movies = [...movies].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  const totalResults = movies.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / 8));
  return { movies: movies.slice((opts.page - 1) * 8, opts.page * 8), page: opts.page, totalPages, totalResults, source: "demo" };
}

export function getDemoMovie(id: number): MovieDetail | null {
  const movie = DEMO_MOVIES.find(movie => movie.id === id);
  return movie ? { ...movie, providers: [], providerLink: null, trailer: null } : null;
}
