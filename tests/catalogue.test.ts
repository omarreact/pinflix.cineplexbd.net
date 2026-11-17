import { describe, expect, it } from "vitest";
import { normalizeCatalogueOptions, parseCatalogueRequest, parseMovieId } from "@/lib/catalogue-options";
import { DEMO_MOVIES, getDemoCatalogue, getDemoMovie } from "@/lib/demo-data";

describe("catalogue query normalization", () => {
  it("bounds query/page and accepts only known sort, genre and country shape", () => {
    const opts = normalizeCatalogueOptions({ query: `  ${"x".repeat(100)}  `, page: 2000, region: "us", genre: "Action", sort: "rating" });
    expect(opts).toMatchObject({ query: "x".repeat(80), page: 500, region: "US", genre: "", sort: "rating" });
    expect(normalizeCatalogueOptions({ page: -4, region: "../../US", genre: "<script>" })).toMatchObject({ page: 1, region: "BD", genre: "", sort: "popular" });
    expect(normalizeCatalogueOptions({ page: 2.5 })).toMatchObject({ page: 1 });
  });
  it("parses URL options and query takes precedence over an unsupported search genre filter", () => {
    expect(parseCatalogueRequest(new URL("https://pinflix.example/api/catalogue?q=Interstellar&genre=Comedy&region=gb&sort=newest&page=2")))
      .toMatchObject({ query: "Interstellar", genre: "", region: "GB", sort: "newest", page: 2 });
    expect(parseCatalogueRequest(new URL("https://pinflix.example/api/catalogue?page=Infinity&sort=attack")))
      .toMatchObject({ page: 1, sort: "popular" });
  });
  it.each(["-1", "0", "01", "1e3", "1.5", "2147483648", "http://attacker", "693134?x=1"])("rejects ambiguous route movie ID %s", value => {
    expect(parseMovieId(value)).toBeNull();
  });
});

describe("usable and clearly separated demo catalogue", () => {
  it("supports title search, genre discovery, sorted results and pagination without mutating seeds", () => {
    expect(getDemoCatalogue({ query: "INTERSTELLAR", genre: "Comedy" }).movies.map(movie => movie.title)).toEqual(["Interstellar"]);
    const animation = getDemoCatalogue({ genre: "Animation" });
    expect(animation.movies.length).toBeGreaterThan(0);
    expect(animation.movies.every(movie => movie.genres.includes("Animation"))).toBe(true);
    const sorted = getDemoCatalogue({ sort: "rating" }).movies;
    expect(sorted.map(movie => movie.rating)).toEqual(sorted.map(movie => movie.rating).sort((a, b) => b - a));
    const first = getDemoCatalogue(), second = getDemoCatalogue({ page: 2 });
    expect(first.source).toBe("demo");
    expect(first.movies).toHaveLength(8);
    expect(second.movies.length).toBe(DEMO_MOVIES.length - 8);
    expect(new Set([...first.movies, ...second.movies].map(movie => movie.id)).size).toBe(DEMO_MOVIES.length);
    expect(DEMO_MOVIES[0].id).toBe(693134);
  });
  it("does not invent demo trailers or watch-provider availability", () => {
    expect(getDemoMovie(693134)).toMatchObject({ providers: [], providerLink: null, trailer: null });
    expect(getDemoMovie(2_147_483_647)).toBeNull();
    expect(getDemoCatalogue({ query: "no-known-movie-xyz" }).movies).toEqual([]);
  });
});
