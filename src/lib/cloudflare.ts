import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getRuntimeEnv(): Promise<Partial<CloudflareEnv>> {
  let bindings: Partial<CloudflareEnv> = {};
  try { bindings = (await getCloudflareContext({ async: true })).env; }
  catch { /* Standard next start has no Worker bindings; discovery still works. */ }
  return {
    ...bindings,
    TMDB_READ_TOKEN: bindings.TMDB_READ_TOKEN || process.env.TMDB_READ_TOKEN,
    TMDB_API_KEY: bindings.TMDB_API_KEY || process.env.TMDB_API_KEY,
  };
}
