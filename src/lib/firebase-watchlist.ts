import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { execute, field } from "firebase/firestore/pipelines";
import { getFirebaseFirestore } from "@/lib/firebase";
import type { Movie } from "@/lib/types";

const VALID_MOVIE_GENRES = new Set([
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "Foreign",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Science Fiction",
  "TV Movie",
  "Thriller",
  "War",
  "Western",
]);

function isStoredImagePath(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" &&
      value.length <= 255 &&
      /^\/[A-Za-z0-9_./-]+\.(jpg|png|webp|svg)$/.test(value))
  );
}

export function isStoredMovie(value: unknown): value is Movie {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const movie = value as Partial<Movie>;
  return (
    Number.isSafeInteger(movie.id) &&
    Number(movie.id) > 0 &&
    Number(movie.id) <= 2147483647 &&
    typeof movie.title === "string" &&
    movie.title.length > 0 &&
    movie.title.length <= 200 &&
    typeof movie.overview === "string" &&
    movie.overview.length <= 5000 &&
    typeof movie.releaseDate === "string" &&
    movie.releaseDate.length <= 32 &&
    typeof movie.rating === "number" &&
    Number.isFinite(movie.rating) &&
    movie.rating >= 0 &&
    movie.rating <= 10 &&
    isStoredImagePath(movie.posterPath) &&
    isStoredImagePath(movie.backdropPath) &&
    Array.isArray(movie.genres) &&
    movie.genres.length <= 20 &&
    movie.genres.every(
      (genre) => typeof genre === "string" && VALID_MOVIE_GENRES.has(genre),
    ) &&
    (movie.runtime === null ||
      (typeof movie.runtime === "number" &&
        Number.isFinite(movie.runtime) &&
        movie.runtime >= 0 &&
        movie.runtime <= 1000)) &&
    typeof movie.language === "string" &&
    movie.language.length <= 8 &&
    (movie.tagline === undefined ||
      (typeof movie.tagline === "string" && movie.tagline.length <= 300))
  );
}

function isStoredWatchlistEntry(
  value: unknown,
  userId: string,
): value is { ownerUid: string; movieId: string; movie: Movie; savedAt: Timestamp } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entry = value as {
    ownerUid?: unknown;
    movieId?: unknown;
    movie?: unknown;
    savedAt?: unknown;
  };
  return (
    entry.ownerUid === userId &&
    typeof entry.movieId === "string" &&
    isStoredMovie(entry.movie) &&
    entry.movieId === String(entry.movie.id) &&
    entry.savedAt instanceof Timestamp
  );
}

export async function listFirebaseWatchlist(userId: string): Promise<Movie[]> {
  const snapshot = await execute(
    getFirebaseFirestore()
      .pipeline()
      .collection(collection(getFirebaseFirestore(), "users", userId, "watchlist"))
      .where(field("ownerUid").equal(userId))
      .sort(field("savedAt").descending())
      .limit(500),
  );

  return snapshot.results.map((result) => {
    const value: unknown = result.data();
    if (!isStoredWatchlistEntry(value, userId)) {
      throw new Error("Firestore returned an invalid watchlist record.");
    }
    return value.movie;
  });
}

export async function saveFirebaseWatchlistMovie(
  userId: string,
  movie: Movie,
): Promise<void> {
  await setDoc(
    doc(getFirebaseFirestore(), "users", userId, "watchlist", String(movie.id)),
    {
      ownerUid: userId,
      movieId: String(movie.id),
      movie,
      savedAt: serverTimestamp(),
    },
  );
}

export async function deleteFirebaseWatchlistMovie(
  userId: string,
  movieId: number,
): Promise<void> {
  await deleteDoc(
    doc(getFirebaseFirestore(), "users", userId, "watchlist", String(movieId)),
  );
}
