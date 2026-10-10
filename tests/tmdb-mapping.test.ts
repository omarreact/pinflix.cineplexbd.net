import { describe, expect, it } from "vitest";
import { mapMovie, mapMovieDetail, safeImagePath, safeProviderLink } from "@/lib/tmdb-mapping";

const rawMovie = { id: 693134, title: "Dune: Part Two", release_date: "2024-02-27", vote_average: 8.1, genre_ids: [878, 12] };

describe("untrusted TMDB metadata normalization", () => {
  it("drops invalid records and bounds optional metadata safely", () => {
    for (const input of [null, [], { ...rawMovie, id: 0 }, { ...rawMovie, id: 1.5 }, { ...rawMovie, title: {} }]) {
      expect(mapMovie(input)).toBeNull();
    }
    const movie = mapMovie({ ...rawMovie, title: "t".repeat(300), overview: "s".repeat(6000), vote_average: 99,
      release_date: "bad-date", runtime: -1, poster_path: "https://attacker.test/image.jpg", backdrop_path: "/safe_123.jpg" });
    expect(movie?.title).toHaveLength(200);
    expect(movie?.overview).toHaveLength(5000);
    expect(movie).toMatchObject({ rating: 10, releaseDate: "", runtime: null, posterPath: null, backdropPath: "/safe_123.jpg", genres: ["Science Fiction", "Adventure"] });
    expect(mapMovie({ ...rawMovie, vote_average: NaN })?.rating).toBe(0);
  });
  it("accepts only relative image filenames and HTTPS TMDB provider hosts", () => {
    expect(safeImagePath("/poster-123.jpg")).toBe("/poster-123.jpg");
    for (const path of ["//attacker.test/x.jpg", "/../x.jpg", "/x.svg", "/x.jpg?query=1", "javascript:alert(1)"]) expect(safeImagePath(path)).toBeNull();
    expect(safeProviderLink("https://www.themoviedb.org/movie/693134/watch")).toBe("https://www.themoviedb.org/movie/693134/watch");
    for (const link of ["http://www.themoviedb.org/movie/1", "https://www.themoviedb.org.attacker.test/", "https://attacker.test/?next=themoviedb.org", "javascript:alert(1)", "//www.themoviedb.org/movie/1"]) expect(safeProviderLink(link)).toBeNull();
  });
  it("selects country-specific providers, deduplicates by payment type, and drops hostile logos/links", () => {
    const movie = mapMovieDetail({ ...rawMovie, "watch/providers": { results: {
      BD: { link: "https://attacker.test/watch", flatrate: [
        { provider_name: "Service", logo_path: "/logo.png" }, { provider_name: "Service" },
      ], rent: [{ provider_name: "Service", logo_path: "https://attacker.test/logo.png" }] },
      US: { link: "https://www.themoviedb.org/movie/693134/watch", buy: [{ provider_name: "US-only" }] },
    } } }, "BD");
    expect(movie?.providers).toEqual([{ name: "Service", logoPath: "/logo.png", type: "subscription" }, { name: "Service", logoPath: null, type: "rent" }]);
    expect(movie?.providerLink).toBeNull();
    expect(mapMovieDetail({ ...rawMovie }, "BD")?.providers).toEqual([]);
  });
  it("embeds only an official YouTube trailer with a valid video key", () => {
    const invalid = [
      { site: "Vimeo", type: "Trailer", official: true, key: "123456789ab" },
      { site: "YouTube", type: "Clip", official: true, key: "123456789ab" },
      { site: "YouTube", type: "Trailer", official: false, key: "123456789ab" },
      { site: "YouTube", type: "Trailer", official: true, key: "a?autoplay=1" },
      { site: "YouTube", type: "Trailer", official: true, key: "https://evil" },
    ];
    expect(mapMovieDetail({ ...rawMovie, videos: { results: invalid } })?.trailer).toBeNull();
    expect(mapMovieDetail({ ...rawMovie, videos: { results: [...invalid, { site: "YouTube", type: "Trailer", official: true, key: "AbC_123-xyz", name: "Official" }] } })?.trailer)
      .toEqual({ key: "AbC_123-xyz", site: "YouTube", name: "Official" });
  });
});
