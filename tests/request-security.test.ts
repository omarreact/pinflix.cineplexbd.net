import { describe, expect, it } from "vitest";
import { isSameOriginMutation, isValidMovieId, parseMovieId, readBoundedJsonObject } from "@/lib/request-security";

describe("watchlist movie identifier validation", () => {
  it("accepts positive 32-bit integer movie IDs", () => {
    expect(isValidMovieId(693134)).toBe(true);
    expect(isValidMovieId(2_147_483_647)).toBe(true);
    expect(parseMovieId("693134")).toBe(693134);
  });

  it.each([0, -1, 1.5, NaN, Infinity, 2_147_483_648, "693134", null, {}, true])(
    "rejects an untrusted body identifier: %j", (value) => {
      expect(isValidMovieId(value)).toBe(false);
    },
  );

  it.each([null, "", "0", "-1", "1.5", "1e3", "01", " 1", "1 ", "2147483648", "693134 OR 1=1"])(
    "rejects ambiguous or hostile URL identifier: %s", (value) => {
      expect(parseMovieId(value)).toBeNull();
    },
  );
});

describe("playback session request security", () => {
  const url = "https://pinflix30.vercel.app/api/playback/session";
  it("accepts same-origin browsers and rejects cross-origin browsers", () => {
    expect(isSameOriginMutation(new Request(url, { headers: { origin: "https://pinflix30.vercel.app" } }))).toBe(true);
    expect(isSameOriginMutation(new Request(url, { headers: { origin: "https://evil.example" } }))).toBe(false);
    expect(isSameOriginMutation(new Request(url, { headers: { origin: "null" } }))).toBe(false);
    expect(isSameOriginMutation(new Request(url, { headers: { "sec-fetch-site": "cross-site" } }))).toBe(false);
    expect(isSameOriginMutation(new Request(url))).toBe(true);
  });
  it("reads small JSON objects and refuses arrays and malformed content", async () => {
    expect(await readBoundedJsonObject(new Request(url, { method: "POST", body: '{"movieId":693134}' }))).toEqual({ movieId: 693134 });
    expect(await readBoundedJsonObject(new Request(url, { method: "POST", body: "[]" }))).toBeNull();
    expect(await readBoundedJsonObject(new Request(url, { method: "POST", body: "{oops}" }))).toBeNull();
  });
  it("rejects oversized payloads with or without a content length header", async () => {
    const large = "x".repeat(5000);
    expect(await readBoundedJsonObject(new Request(url, { method: "POST", body: large }))).toBeNull();
    expect(await readBoundedJsonObject(new Request(url, { method: "POST", body: "{}", headers: { "content-length": "9000" } }))).toBeNull();
  });
});
