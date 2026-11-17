import { describe, it, expect } from "vitest";
import { parseR2Selection, r2CatalogueKey, isSignedR2Source } from "@/lib/r2-playback";

describe("Cloudflare R2 movie and TV playback", () => {
  it("preserves legacy movie requests and creates keys recognized by the Worker", () => {
    const movie = parseR2Selection({ movieId: 693134 });
    expect(movie).toEqual({ kind: "movie", movieId: 693134 });
    expect(movie && r2CatalogueKey(movie)).toBe("movie:693134");
    const tv = parseR2Selection({ kind: "tv", tvId: 1396, season: 2, episode: 3 });
    expect(tv).toEqual({ kind: "tv", tvId: 1396, season: 2, episode: 3 });
    expect(tv && r2CatalogueKey(tv)).toBe("tv:1396:s2e3");
  });
  it.each([
    { kind: "tv", tvId: 1396, season: 0, episode: 1 },
    { kind: "tv", tvId: 1396, season: -1, episode: 1 },
    { kind: "tv", tvId: 1396, season: 1, episode: 1000 },
    { kind: "tv", tvId: "1396", season: 1, episode: 1 },
    { kind: "tv", tvId: 1396, season: 1.1, episode: 1 },
    { kind: "tv", tvId: 1396, season: 1, episode: 1, movieId: 123 },
    { kind: "unknown", movieId: 1 },
    { movieId: 2_147_483_648 },
    { movieId: "693134" },
  ])("rejects invalid R2 selections", input => {
    if ("kind" in input && input.kind === "tv" && "movieId" in input) {
      // A mixed-kind object must never be accepted as a valid TV request.
      expect(parseR2Selection(input)).toBeNull();
    } else expect(parseR2Selection(input)).toBeNull();
  });
  it("accepts only signed, unexpired HTTPS media URLs on the selected edge", () => {
    const now = 1_700_000_000;
    const valid = { label: "HD", url: `https://media.pincodeit.com/m/media/film/master.m3u8?exp=1700003600&sig=${"a".repeat(64)}` };
    expect(isSignedR2Source(valid, "https://media.pincodeit.com", now)).toBe(true);
    expect(isSignedR2Source({ ...valid, url: valid.url.replace("media.pincodeit.com", "example.org") }, "https://media.pincodeit.com", now)).toBe(false);
    expect(isSignedR2Source({ ...valid, url: valid.url.replace("1700003600", "1699999999") }, "https://media.pincodeit.com", now)).toBe(false);
    expect(isSignedR2Source({ ...valid, url: valid.url + "&redirect=https://bad.org" }, "https://media.pincodeit.com", now)).toBe(false);
  });
});
