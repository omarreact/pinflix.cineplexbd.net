#!/usr/bin/env node
/**
 * Publish an existing, authorized R2 video asset through the PinFlix Worker.
 * Default mode previews the manifest; --publish requires --rights-confirmed.
 *
 * Examples:
 * node scripts/r2-catalogue.mjs --kind movie --id 123 --source "HD=media/movies/123/master.m3u8"
 * node scripts/r2-catalogue.mjs --kind tv --id 123 --season 1 --episode 2 --source "HD=media/tv/123/s1/e2/master.m3u8" --publish --rights-confirmed
 */
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const flags = {};
const sources = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (["--publish", "--rights-confirmed", "--help"].includes(arg)) {
    flags[arg.slice(2)] = true;
    continue;
  }
  if (!["--kind", "--id", "--season", "--episode", "--source"].includes(arg) || !args[i + 1]) {
    console.error("Invalid argument: " + arg);
    process.exit(2);
  }
  if (arg === "--source") sources.push(args[++i]);
  else flags[arg.slice(2)] = args[++i];
}
if (flags.help) {
  console.log("Usage: node scripts/r2-catalogue.mjs --kind movie|tv --id TMDB_ID [--season N --episode N] --source 'Label=media/path/video.mp4' [--source 'HLS=media/path/master.m3u8'] [--publish --rights-confirmed]");
  process.exit(0);
}

const validId = value => typeof value === "string" && /^[1-9]\d{0,9}$/.test(value) &&
  Number(value) <= 2_147_483_647;
const validIndex = value => typeof value === "string" && /^[1-9]\d{0,2}$/.test(value);
if (!["movie", "tv"].includes(flags.kind) || !validId(flags.id) ||
    (flags.kind === "tv" && (!validIndex(flags.season) || !validIndex(flags.episode))) ||
    (flags.kind === "movie" && (flags.season || flags.episode)) ||
    sources.length < 1 || sources.length > 8) {
  console.error("Specify a valid movie or TV ID, episode indices if applicable, and 1–8 sources.");
  process.exit(2);
}

const mapped = sources.map(source => {
  const index = source.indexOf("=");
  const label = index >= 1 ? source.slice(0, index).trim() : "";
  const path = index >= 1 ? source.slice(index + 1).trim() : "";
  const valid = /^[a-zA-Z0-9_-]+$/.test(label.replaceAll(" ", "_")) &&
    label.length <= 80 && /^media\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*\.(mp4|m3u8)$/i.test(path) &&
    !path.split("/").some(part => part === "." || part === "..");
  if (!valid) {
    console.error("Each --source must be Label=media/path/file.mp4 or .m3u8 using R2-compatible paths.");
    process.exit(2);
  }
  return { label, path };
});
const key = flags.kind === "movie" ? `movie:${flags.id}` :
  `tv:${flags.id}:s${flags.season}e${flags.episode}`;
const r2Key = `catalog-public/${key}.json`;
const document = JSON.stringify({ public: true, sources: mapped }, null, 2) + "\n";

console.log(`R2 bucket: pinflix-media\nManifest: ${r2Key}\n${document}`);
if (!flags.publish) {
  console.log("Preview only. To publish, add --publish --rights-confirmed after uploading the asset(s).");
  process.exit(0);
}
if (!flags["rights-confirmed"]) {
  console.error("Publishing requires --rights-confirmed: use only content you have the right to distribute.");
  process.exit(2);
}
const dir = await mkdtemp(join(tmpdir(), "pinflix-r2-"));
try {
  const filename = join(dir, "catalog.json");
  await writeFile(filename, document, { mode: 0o600 });
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  execFileSync(executable, [
    "wrangler", "r2", "object", "put", `pinflix-media/${r2Key}`,
    "--file", filename, "--content-type", "application/json", "--remote",
  ], { stdio: "inherit", shell: false });
  console.log("Published. Playback is available only after the corresponding media objects exist in R2.");
} finally {
  await rm(dir, { recursive: true, force: true });
}
