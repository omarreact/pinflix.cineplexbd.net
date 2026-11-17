import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getRuntimeEnv } = vi.hoisted(() => ({ getRuntimeEnv: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflare", () => ({ getRuntimeEnv }));
import { getCatalogue, getMovie } from "@/lib/tmdb";

const fetchMock = vi.fn();
const movie = { id: 693134, title: "Dune: Part Two", vote_average: 8.1 };
beforeEach(() => { getRuntimeEnv.mockResolvedValue({ TMDB_READ_TOKEN: "server-token-secret" }); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks(); });

describe("server-side TMDB adapter", () => {
  it("works offline with labelled demo data and performs no fetch without credentials", async () => {
    getRuntimeEnv.mockResolvedValue({});
    expect((await getCatalogue()).source).toBe("demo");
    expect((await getMovie(693134)).movie?.title).toBe("Dune: Part Two");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a fixed TMDB host, bounded discovery parameters and a server-only bearer token", async () => {
    fetchMock.mockResolvedValue(Response.json({ results: [movie, { id: -1, title: "bad" }], total_pages: 900, page: 2, total_results: 1 }));
    const result = await getCatalogue({ genre: "Science Fiction", sort: "rating", page: 2 });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url.origin).toBe("https://api.themoviedb.org");
    expect(url.pathname).toBe("/3/discover/movie");
    expect(url.searchParams.get("with_genres")).toBe("878");
    expect(url.searchParams.get("include_adult")).toBe("false");
    expect(url.searchParams.get("sort_by")).toBe("vote_average.desc");
    expect(options.headers.Authorization).toBe("Bearer server-token-secret");
    expect(result.movies).toHaveLength(1);
    expect(result.totalPages).toBe(500);
    expect(JSON.stringify(result)).not.toContain("server-token-secret");
  });

  it("encodes hostile search terms as data and omits unsupported genre/sort query parameters", async () => {
    fetchMock.mockResolvedValue(Response.json({ results: [], total_pages: 1 }));
    const query = "Dune&api_key=attacker/http://evil";
    await getCatalogue({ query, genre: "Action", sort: "newest" });
    const [url] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/3/search/movie");
    expect(url.searchParams.get("query")).toBe(query);
    expect(url.searchParams.has("api_key")).toBe(false);
    expect(url.searchParams.has("with_genres")).toBe(false);
    expect(url.searchParams.has("sort_by")).toBe(false);
  });

  it("uses optional KV without placing legacy API credentials in cache keys", async () => {
    const get = vi.fn().mockResolvedValue(null), put = vi.fn().mockResolvedValue(undefined);
    getRuntimeEnv.mockResolvedValue({ TMDB_API_KEY: "legacy-key-secret", MOVIE_CACHE: { get, put } });
    fetchMock.mockResolvedValue(Response.json({ results: [movie] }));
    await getCatalogue();
    expect(fetchMock.mock.calls[0][0].searchParams.get("api_key")).toBe("legacy-key-secret");
    expect(get.mock.calls[0][0]).not.toContain("legacy-key-secret");
    expect(put.mock.calls[0][0]).not.toContain("legacy-key-secret");
    expect(put.mock.calls[0][2]).toMatchObject({ expirationTtl: 3600 });
  });

  it("cache failures do not disable live reads, and upstream errors disclose no secrets", async () => {
    getRuntimeEnv.mockResolvedValue({ TMDB_READ_TOKEN: "server-token-secret", MOVIE_CACHE: { get: vi.fn().mockRejectedValue(new Error("cache")), put: vi.fn().mockRejectedValue(new Error("cache")) } });
    fetchMock.mockResolvedValueOnce(Response.json({ results: [movie] }));
    expect((await getCatalogue()).source).toBe("tmdb");
    fetchMock.mockRejectedValueOnce(new Error("https://api.themoviedb.org/?api_key=server-token-secret"));
    const result = await getCatalogue();
    expect(result.source).toBe("demo");
    expect(result.warning).toBeTruthy();
    expect(JSON.stringify(result)).not.toContain("server-token-secret");
  });

  it("handles a live 404 distinctly from an outage and blocks invalid IDs without outbound fetch", async () => {
    fetchMock.mockResolvedValueOnce(new Response("missing", { status: 404 }));
    expect(await getMovie(693134)).toEqual({ movie: null, source: "tmdb" });
    fetchMock.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    expect(await getMovie(693134)).toMatchObject({ source: "demo", movie: { id: 693134 }, warning: expect.any(String) });
    fetchMock.mockClear();
    expect((await getMovie(-1)).movie).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requests video/provider metadata once and selects the normalized country", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ ...movie, "watch/providers": { results: { US: { rent: [{ provider_name: "US provider" }] } } } }));
    const result = await getMovie(693134, "us");
    const [url] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/3/movie/693134");
    expect(url.searchParams.get("append_to_response")).toBe("videos,watch/providers");
    expect(result.movie?.providers[0]?.name).toBe("US provider");
  });
});
