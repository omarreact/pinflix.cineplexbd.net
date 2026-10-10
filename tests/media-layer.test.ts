import { describe, expect, it } from "vitest";
import { buildMediaTheme } from "@/lib/media-theme";
import { isAllowedMediaSource, normalizeMediaSource } from "@/lib/media-source";

describe("media safety and theme layer", () => {
  it("accepts allowed public media domains and rejects unknown sources", () => {
    expect(isAllowedMediaSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isAllowedMediaSource("https://archive.org/download/test.mp4")).toBe(true);
    expect(isAllowedMediaSource("https://stream.example.com/video.mp4")).toBe(false);
    expect(normalizeMediaSource("https://example.com/file.m3u8")).toBeNull();
    expect(normalizeMediaSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.type).toBe("embed");
  });

  it("falls back to readable theme values when no media seed is available", () => {
    const theme = buildMediaTheme();
    expect(theme.bg).toMatch(/^#/);
    expect(theme.accent).toMatch(/^#/);
    expect(theme.accentContrast).toMatch(/^#/);
    expect(theme.border).toMatch(/^#/);
  });
});
