import { readFileSync } from "node:fs";

// Validate only public deployment configuration, never read or print secrets.
const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const errors = [];
if (config.kv_namespaces.some(kv => /^0+$/.test(kv.id))) errors.push("Replace the local MOVIE_CACHE placeholder with your real KV namespace ID.");
try {
  const site = new URL(config.vars.NEXT_PUBLIC_SITE_URL);
  if (site.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(site.hostname)) errors.push("Set NEXT_PUBLIC_SITE_URL to your production HTTPS address.");
} catch { errors.push("Set a valid NEXT_PUBLIC_SITE_URL."); }
if (errors.length) {
  console.error("Deployment configuration needs these changes:\n" + errors.map(error => `- ${error}`).join("\n"));
  process.exit(1);
}
console.log("Public deployment configuration is ready. Configure Worker secrets separately before launch.");
