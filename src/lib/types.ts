export interface Movie {
  id: number;
  title: string;
  overview: string;
  releaseDate: string;
  rating: number;
  posterPath: string | null;
  backdropPath: string | null;
  genres: string[];
  runtime: number | null;
  language: string;
  tagline?: string;
}

export interface MovieDetail extends Movie {
  providers: { name: string; logoPath: string | null; type: "subscription" | "rent" | "buy" }[];
  providerLink: string | null;
  trailer: { key: string; site: "YouTube"; name: string } | null;
}

export interface CatalogueOptions {
  query?: string;
  genre?: string;
  sort?: "popular" | "rating" | "newest";
  page?: number;
  region?: string;
}

export interface CatalogueResult {
  movies: Movie[];
  page: number;
  totalPages: number;
  totalResults: number;
  source: "demo" | "tmdb";
  warning?: string;
}

export interface MovieResult {
  movie: MovieDetail | null;
  source: "demo" | "tmdb";
  warning?: string;
}
