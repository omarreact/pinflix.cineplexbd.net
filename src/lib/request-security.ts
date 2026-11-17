export function isValidMovieId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 2_147_483_647
  );
}

export function parseMovieId(value: string | null): number | null {
  if (!value || !/^[1-9]\d{0,9}$/.test(value)) return null;
  const movieId = Number(value);
  return isValidMovieId(movieId) ? movieId : null;
}

/** Public browser mutations must originate from the same application origin.
 * Non-browser callers without an Origin header remain allowed; this is a
 * browser CSRF safeguard, not an authentication mechanism.
 */
export function isSameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).origin === new URL(request.url).origin && origin !== "null";
  } catch {
    return false;
  }
}

/** Rejects unexpectedly large or malformed JSON before materializing it.
 * No unauthenticated caller should cause unlimited request buffering.
 */
export async function readBoundedJsonObject(
  request: Request,
  maxBytes = 4096,
): Promise<Record<string, unknown> | null> {
  const headerLength = request.headers.get("content-length");
  if (headerLength && (!/^\d+$/.test(headerLength) || Number(headerLength) > maxBytes)) return null;
  const stream = request.body;
  if (!stream) return null;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const payload: unknown = JSON.parse(new TextDecoder().decode(combined));
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
