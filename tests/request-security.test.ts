import { describe, expect, it } from "vitest";
import { isValidMovieId, parseMovieId } from "@/lib/request-security";

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
