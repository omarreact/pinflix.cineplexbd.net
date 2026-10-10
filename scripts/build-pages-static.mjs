import { mkdir, writeFile, copyFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const outDir = path.join(process.cwd(), "dist");
await mkdir(outDir, { recursive: true });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
  ? process.env.NEXT_PUBLIC_SITE_URL
  : "https://pinflix.pages.dev";

const html = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pinflix — Find your next great film</title>
  <meta name="description" content="Pinflix is a cinematic movie discovery experience for browsing films, trailers, watch providers, and watchlist ideas." />
  <meta property="og:title" content="Pinflix — Find your next great film" />
  <meta property="og:description" content="A media-aware movie discovery experience by Pincode IT." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${siteUrl}" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #081114;
      --panel: rgba(255, 255, 255, 0.08);
      --panel-strong: rgba(255, 255, 255, 0.14);
      --text: #f6f2e8;
      --muted: #aebfc0;
      --accent: #d5ec7f;
      --accent-2: #f78f72;
      --line: rgba(255, 255, 255, 0.18);
      --shadow: 0 30px 90px rgba(0, 0, 0, 0.45);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 15% 15%, rgba(247, 143, 114, 0.22), transparent 30rem),
        radial-gradient(circle at 80% 0%, rgba(213, 236, 127, 0.16), transparent 28rem),
        linear-gradient(145deg, #081114 0%, #102024 50%, #05090b 100%);
      color: var(--text);
    }
    a { color: inherit; text-decoration: none; }
    .shell { width: min(1180px, calc(100% - 32px)); margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; padding: 24px 0; }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 850; letter-spacing: -0.04em; font-size: 1.45rem; }
    .logo { width: 38px; height: 38px; border-radius: 14px; display: grid; place-items: center; background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #071012; box-shadow: 0 14px 35px rgba(213,236,127,.18); }
    nav { display: flex; gap: 10px; align-items: center; }
    nav a, .chip { border: 1px solid var(--line); padding: 10px 14px; border-radius: 999px; color: var(--muted); background: rgba(255,255,255,.04); }
    nav a:hover { color: var(--text); background: var(--panel); }
    .hero { padding: 52px 0 44px; display: grid; grid-template-columns: 1.05fr .95fr; gap: 36px; align-items: center; }
    .eyebrow { color: var(--accent); font-size: .78rem; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
    h1 { margin: 14px 0; font-size: clamp(3.2rem, 9vw, 7.4rem); line-height: .88; letter-spacing: -0.085em; }
    h1 em { font-family: Georgia, serif; color: var(--accent-2); font-style: italic; letter-spacing: -0.07em; }
    .lede { font-size: clamp(1.05rem, 2vw, 1.35rem); color: var(--muted); max-width: 650px; line-height: 1.7; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
    .button { border: 0; border-radius: 999px; padding: 14px 20px; font-weight: 800; display: inline-flex; gap: 10px; align-items: center; cursor: pointer; }
    .primary { background: var(--accent); color: #081114; }
    .secondary { border: 1px solid var(--line); background: rgba(255,255,255,.08); color: var(--text); }
    .poster-stage { min-height: 520px; border-radius: 36px; position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(213,236,127,.28), rgba(247,143,114,.26)), #15282c; box-shadow: var(--shadow); border: 1px solid var(--line); }
    .sun { position: absolute; width: 260px; height: 260px; right: 8%; top: 8%; border-radius: 999px; background: radial-gradient(circle, #fff0b8 0 18%, #ffb077 19% 42%, transparent 43%); filter: blur(.2px); opacity: .94; }
    .horizon { position: absolute; inset: auto -5% 0; height: 62%; background: linear-gradient(180deg, transparent, rgba(0,0,0,.16) 10%), repeating-linear-gradient(12deg, rgba(255,255,255,.10) 0 2px, transparent 3px 30px); transform: skewY(-5deg); }
    .card-floating { position: absolute; left: 26px; bottom: 26px; right: 26px; padding: 20px; border-radius: 28px; background: rgba(5, 11, 13, .72); backdrop-filter: blur(18px); border: 1px solid var(--line); display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 42px 0; }
    .movie { min-height: 260px; border-radius: 28px; padding: 18px; display: flex; flex-direction: column; justify-content: flex-end; background: linear-gradient(145deg, var(--c1), var(--c2)); box-shadow: 0 20px 50px rgba(0,0,0,.25); position: relative; overflow: hidden; }
    .movie::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 70% 20%, rgba(255,255,255,.25), transparent 25%), linear-gradient(0deg, rgba(0,0,0,.55), transparent 60%); }
    .movie > * { position: relative; }
    .movie h3 { margin: 0 0 8px; font-size: 1.35rem; }
    .movie p { color: rgba(255,255,255,.78); margin: 0; line-height: 1.55; }
    footer { border-top: 1px solid var(--line); color: var(--muted); padding: 26px 0 34px; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    @media (max-width: 860px) { nav { display: none; } .hero { grid-template-columns: 1fr; padding-top: 26px; } .poster-stage { min-height: 380px; } .grid { grid-template-columns: 1fr; } footer { display: block; } }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <a class="brand" href="/"><span class="logo">▶</span><span>Pinflix</span></a>
      <nav aria-label="Main navigation"><a href="#collection">Collection</a><a href="#watchlist">Watchlist</a></nav>
    </header>

    <main>
      <section class="hero">
        <div>
          <p class="eyebrow">Curated for film lovers</p>
          <h1>Your next<br><em>great film.</em></h1>
          <p class="lede">Discover cinematic worlds, explore mood-led collections, and keep the stories you want to watch close at hand.</p>
          <div class="actions"><a class="button primary" href="#collection">Explore films</a><a class="button secondary" href="#watchlist">Build your watchlist</a></div>
        </div>
        <div class="poster-stage" aria-label="Abstract cinematic poster"><div class="sun"></div><div class="horizon"></div><div class="card-floating"><div><strong>The Evening Edit</strong><br><span style="color:var(--muted)">A cinematic discovery experience</span></div><span class="chip">Live</span></div></div>
      </section>

      <section id="collection">
        <p class="eyebrow">Featured collection</p>
        <div class="grid">
          <article class="movie" style="--c1:#273d48;--c2:#f78f72"><h3>Atmosphere</h3><p>Beautifully composed stories with rich moods and unforgettable frames.</p></article>
          <article class="movie" style="--c1:#19252a;--c2:#d5ec7f"><h3>Discovery</h3><p>Find films by feeling, genre, and the kind of evening you want.</p></article>
          <article class="movie" style="--c1:#1e1630;--c2:#4f7cff"><h3>Watchlist</h3><p>Save the films that catch your eye and return when the moment is right.</p></article>
        </div>
      </section>

      <section id="watchlist" class="grid" aria-label="Pinflix highlights">
        <article class="movie" style="--c1:#162832;--c2:#a57cff"><h3>Trailers</h3><p>Preview stories before choosing your next watch.</p></article>
        <article class="movie" style="--c1:#2a1c1c;--c2:#ffb36b"><h3>Providers</h3><p>Explore viewing options where available in your region.</p></article>
        <article class="movie" style="--c1:#10241c;--c2:#76e0b0"><h3>Made for evenings</h3><p>A cleaner way to choose what deserves your time.</p></article>
      </section>
    </main>

    <footer><span>© 2026 Pinflix by Pincode IT</span><span>Find your next great film.</span></footer>
  </div>
</body>
</html>`;

await writeFile(path.join(outDir, "index.html"), html, "utf8");
await writeFile(path.join(outDir, "404.html"), html, "utf8");

for (const asset of ["cinema-landscape.svg", "icon.svg"]) {
  const source = path.join(process.cwd(), "public", asset);
  try {
    await access(source, constants.R_OK);
    await copyFile(source, path.join(outDir, asset));
  } catch {
    // Optional public assets are not required for the generated page.
  }
}

console.log(`Built production Pinflix page in ${outDir}`);
