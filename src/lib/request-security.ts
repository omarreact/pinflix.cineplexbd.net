export function isValidMovieId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 2_147_483_647
  );
}

export function parseMovieId(value: string | null): number | null {
  if (!value || !/^[1-9]\d{0,9}$/.test(value)) return null;
  const movieId = Number(value);
  return isValidMovieId(movieId) ? movieId : null;
}
