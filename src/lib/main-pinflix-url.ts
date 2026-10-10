/** Trusted HTTPS proxy URLs belonging to the original PinFlix application.
 * This tiny module is safe for importing into the 3.0 browser player.
 */
export const MAIN_PINFLIX_ORIGIN = "https://pinflix.pincodeit.com" as const;


const MEDIA_HOSTS = ["aoneroom.com", "hakunaymatata.com"] as const;
const ALLOWED_MEDIA_EXTENSIONS = /\.(m3u8|mp4|m4v|m4s|ts|aac)(?:$)/i;
const MEDIA_ID = /^mb-\d{1,20}~[^\s?#]{1,512}$/;
const QUALITY_TAG = /\b(?:480p|720p|1080p|2160p|4k|web[- .]?dl|bluray|h264|h265)\b/gi;
const YEAR_TAG = /[\[(](?:19|20)\d{2}[\])]/g;


function allowedUpstreamMedia(raw: string): boolean {
  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password &&
      MEDIA_HOSTS.some(host => hostname === host || hostname.endsWith("." + host)) &&
      ALLOWED_MEDIA_EXTENSIONS.test(url.pathname);
  } catch { return false; }
}

/** Only accept media returned via main PinFlix's existing, host-restricted
 * proxy, never user-controlled absolute streaming URLs.
 */
export function isMainProxySource(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.origin !== MAIN_PINFLIX_ORIGIN || url.pathname !== "/api/proxy-stream" ||
        url.username || url.password || url.hash) return false;
    const params = url.searchParams;
    if ([...params.keys()].some(key => !["id","url","season","episode"].includes(key))) return false;
    if (!MEDIA_ID.test(params.get("id") ?? "")) return false;
    if (!allowedUpstreamMedia(params.get("url") ?? "")) return false;
    if ([...params.keys()].some(key => params.getAll(key).length !== 1)) return false;
    for (const key of ["season","episode"]) {
      const value = params.get(key);
      if (value !== null && !/^(?:0|[1-9]\d{0,3})$/.test(value)) return false;
    }
    return true;
  } catch { return false; }
}
export function mainProxyProtocol(raw: string): "hls" | "mp4" | null {
  if (!isMainProxySource(raw)) return null;
  const upstream = new URL(new URL(raw).searchParams.get("url")!);
  return upstream.pathname.toLowerCase().endsWith(".m3u8") ? "hls" : "mp4";
}

