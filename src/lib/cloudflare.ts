import "server-only";

export async function getRuntimeEnv(): Promise<Partial<CloudflareEnv>> {
  let bindings: Partial<CloudflareEnv> = {};

  // Vercel runs standard Next.js. Do not initialize the OpenNext/Cloudflare
  // adapter there; read server-side environment variables directly instead.
  if (!process.env.VERCEL) {
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      bindings = (await getCloudflareContext({ async: true })).env;
    } catch {
      // Standard Next.js runtimes have no Worker bindings.
    }
  }

  return {
    ...bindings,
    TMDB_READ_TOKEN: bindings.TMDB_READ_TOKEN || process.env.TMDB_READ_TOKEN,
    TMDB_API_KEY: bindings.TMDB_API_KEY || process.env.TMDB_API_KEY,
  };
}
