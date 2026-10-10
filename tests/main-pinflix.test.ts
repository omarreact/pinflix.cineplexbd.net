import { describe, expect, it, vi } from "vitest";
import { cleanLookupTitle, findProviderMatch, isMainProxySource, mainProxyProtocol, normalizeMatchTitle, resolveMainPinflix } from "@/lib/main-pinflix";

const source = (file = "stream.m3u8", host = "cdn.aoneroom.com") => {
  const q = new URLSearchParams({
    id: "mb-123~dune-2021",
    url: `https://${host}/path/${file}`,
    season: "0", episode: "0",
  });
  return `https://pinflix.pincodeit.com/api/proxy-stream?${q}`;
};
const movie = { kind: "movie" as const, title: "Dune", year: 2021 };
const found = { id: "mb-123~dune-2021", title: "Dune (2021)", kind: "movie" as const, year: 2021 };

describe("main PinFlix playback bridge", () => {
  it("matches only the correct title, type and year", () => {
    expect(findProviderMatch(movie,[found])).toEqual(found);
    expect(findProviderMatch(movie,[{...found,year:1984}])).toBeNull();
    expect(findProviderMatch(movie,[{...found,title:"Dune Part Two"}])).toBeNull();
    expect(findProviderMatch(movie,[{...found,kind:"show"}])).toBeNull();
    expect(normalizeMatchTitle("Dune (2021) 1080P")).toBe("dune");
    expect(normalizeMatchTitle("Dune 2021")).toBe("dune");
    expect(cleanLookupTitle("Breaking Bad · S2E4","tv")).toBe("Breaking Bad");
  });
  it("rejects untrusted proxy destinations and identifies proxied protocols",()=>{
    expect(isMainProxySource(source())).toBe(true);
    expect(mainProxyProtocol(source())).toBe("hls");
    expect(mainProxyProtocol(source("film.mp4"))).toBe("mp4");
    expect(isMainProxySource(source("file.m3u8","evil.example.com"))).toBe(false);
    expect(isMainProxySource(source().replace("pinflix.pincodeit.com","evil.example.com"))).toBe(false);
    expect(isMainProxySource(source().replace("https%3A%2F%2F","http%3A%2F%2F"))).toBe(false);
    expect(isMainProxySource(source()+"&redirect=https://evil.example")).toBe(false);
  });
  it("resolves via original search API then source API, no direct upstream credentials",async()=>{
    const fetchMock=vi.fn()
      .mockResolvedValueOnce(Response.json({catalog:[found]}))
      .mockResolvedValueOnce(Response.json({sources:[
        {quality:"MovieBox 1080p",url:source()},
        {quality:"Unauthorized",url:"https://evil.example.com/movie.m3u8"},
      ]}));
    const result=await resolveMainPinflix(movie,fetchMock as typeof fetch);
    expect(result).toMatchObject({status:"ready",sources:[{url:source()}]});
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const search=fetchMock.mock.calls[0][0] as URL;
    const resolve=fetchMock.mock.calls[1][0] as URL;
    expect(search.origin).toBe("https://pinflix.pincodeit.com");
    expect(search.pathname).toBe("/api/search/live");
    expect(resolve.searchParams.get("id")).toBe(found.id);
  });
  it("does not call the playback resolver on mismatched titles",async()=>{
    const fetchMock=vi.fn().mockResolvedValue(Response.json({catalog:[{...found,title:"Dune Part Two"}]}));
    expect(await resolveMainPinflix(movie,fetchMock as typeof fetch)).toEqual({status:"unavailable",reason:"unmatched"});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
