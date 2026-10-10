import assert from "node:assert/strict";

const base = new URL(process.argv[2] || process.env.PINFLIX_TEST_URL || "http://127.0.0.1:3000");
let checks = 0;

async function request(path, options = {}) {
  const response = await fetch(new URL(path, base), { ...options, redirect: "manual", signal: AbortSignal.timeout(30_000) });
  const body = await response.text();
  return { response, body, json: () => JSON.parse(body) };
}
function checked(label) { checks += 1; console.log(`PASS ${label}`); }

try {
  for (const [path, text] of [["/", "Pinflix"], ["/watchlist", "watchlist"], ["/about", "JustWatch"], ["/sign-in", "Sign in"], ["/movie/693134", "Dune"]]) {
    const { response, body } = await request(path);
    assert.equal(response.status, 200, `${path} status`);
    assert.match(response.headers.get("content-type") || "", /text\/html/, `${path} HTML`);
    assert.ok(body.toLowerCase().includes(text.toLowerCase()), `${path} expected content`);
    checked(`page ${path}`);
  }

  const catalogue = await request("/api/catalog");
  assert.equal(catalogue.response.status, 200);
  const data = catalogue.json();
  assert.ok(["demo", "tmdb"].includes(data.source));
  assert.ok(Array.isArray(data.movies) && data.movies.length > 0);
  assert.ok(data.movies.every(movie => Number.isInteger(movie.id) && typeof movie.title === "string"));
  assert.ok(!Object.hasOwn(data, "TMDB_READ_TOKEN"));
  checked(`catalogue API (${data.source})`);

  const search = await request("/api/search?q=Interstellar&region=BD");
  assert.equal(search.response.status, 200);
  assert.ok(search.json().movies.some(movie => movie.title.toLowerCase().includes("interstellar")));
  checked("search API");

  const filtered = await request("/api/catalog?genre=Animation&sort=rating&region=BD");
  assert.equal(filtered.response.status, 200);
  assert.ok(filtered.json().movies.every(movie => movie.genres.includes("Animation")));
  checked("genre discovery API");

  const detail = await request("/api/movies/693134?region=BD");
  assert.equal(detail.response.status, 200);
  assert.equal(detail.json().movie.id, 693134);
  assert.ok(Array.isArray(detail.json().movie.providers));
  if (detail.json().source === "demo") {
    assert.deepEqual(detail.json().movie.providers, []);
    assert.equal(detail.json().movie.trailer, null);
    assert.equal(detail.json().movie.providerLink, null);
  }
  checked("movie detail API and honest demo availability");

  assert.equal((await request("/api/movies/1e3")).response.status, 400);
  const missingMoviePage = await request("/movie/invalid-id");
  assert.ok([200, 404].includes(missingMoviePage.response.status));
  assert.ok(missingMoviePage.body.includes("noindex"));
  assert.ok(missingMoviePage.body.includes("404"));
  assert.equal((await request("/definitely-missing-pinflix-route")).response.status, 404);
  checked("invalid IDs and streamed not-found pages");

  const configuration = await request("/api/config");
  assert.equal(configuration.response.status, 200);
  const config = configuration.json();
  assert.deepEqual(Object.keys(config), ["catalogueSource"]);
  checked("server configuration endpoint exposes no secrets");

  const robots = await request("/robots.txt"), sitemap = await request("/sitemap.xml");
  assert.equal(robots.response.status, 200);
  assert.match(robots.body, /User-Agent|User-agent|user-agent/);
  assert.equal(sitemap.response.status, 200);
  assert.match(sitemap.body, /<urlset/);
  checked("robots and sitemap metadata");

  console.log(`\n${checks} HTTP smoke checks passed at ${base.origin}. Google sign-in and remote Firestore access are not exercised by this script.`);
} catch (error) {
  console.error(`FAIL after ${checks} successful checks: ${error.message}`);
  process.exitCode = 1;
}
