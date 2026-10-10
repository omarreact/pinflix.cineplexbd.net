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

  it("accepts only main PinFlix proxied media, with MP4/HLS inferred from the inner URL", () => {
    const params = new URLSearchParams({ id: "mb-123~dune", url: "https://cdn.aoneroom.com/videos/master.m3u8", season: "0", episode: "0" });
    const url = "https://pinflix.pincodeit.com/api/proxy-stream?" + params;
    expect(isAllowedMediaSource(url)).toBe(true);
    expect(normalizeMediaSource(url)?.type).toBe("hls");
    params.set("url", "https://cdn.aoneroom.com/videos/film.mp4");
    expect(normalizeMediaSource("https://pinflix.pincodeit.com/api/proxy-stream?" + params)?.type).toBe("mp4");
    params.set("url", "https://malicious.example/video.mp4");
    expect(isAllowedMediaSource("https://pinflix.pincodeit.com/api/proxy-stream?" + params)).toBe(false);
  });

  it("falls back to readable theme values when no media seed is available", () => {
    const theme = buildMediaTheme();
    expect(theme.bg).toMatch(/^#/);
    expect(theme.accent).toMatch(/^#/);
    expect(theme.accentContrast).toMatch(/^#/);
    expect(theme.border).toMatch(/^#/);
  });
});
