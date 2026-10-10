# Pinflix deployment architecture

## Production delivery paths

| Component | Owner | Deployment trigger |
| --- | --- | --- |
| Next.js UI and app routes | Vercel project `pinflix3.0` (`pinflix30.vercel.app`) | Vercel's GitHub integration on `main` |
| UI validation | GitHub Actions `.github/workflows/ci.yml` | Push to `main` and pull requests; **builds only** |
| Licensed/owned media and CDN API | Cloudflare Worker `pinflix-media-api` at `media.pincodeit.com`, with private R2 bucket `pinflix-media` | Separately managed; never deployed by the UI workflow |
| Optional OpenNext frontend Worker `pinflix` | GitHub Actions `.github/workflows/deploy.yml` | **Manual workflow_dispatch only**; needs Cloudflare token |
| Cloudflare Pages `pinflix.pages.dev` | Separate static fallback | Not the canonical Vercel UI; not changed by these GitHub workflows |

The UI and media backend are independent. An ordinary commit to this repository must not publish Cloudflare Workers. The media API's source is not the OpenNext UI Worker bundle.

## Routine release (Vercel)

1. Commit the Next.js app to the `main` branch in `omarreact/pinflix.cineplexbd.net`.
2. GitHub Actions runs `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, and `pnpm build` for Vercel parity.
3. Vercel deploys through its existing Git integration. Check the production deployment and verify the home, movie detail, and watchlist routes.
4. CDN playback URLs are resolved through `/api/playback/session`, pointing to `https://media.pincodeit.com`. A configured licensed or owned media entry is necessary for playable titles.

**No Cloudflare API token is needed for GitHub CI or the Vercel UI deployment.**

## Main PinFlix playback integration

PinFlix 3.0 retains its TMDB-powered discovery UI and existing adaptive player.
The `POST /api/playback/session` server route now **first** matches the selected
movie or TV show by exact normalized title, media type and non-conflicting year
against the **main** application's provider-only
`https://pinflix.pincodeit.com/api/search/live`. It then requests that provider
identifier from `https://pinflix.pincodeit.com/api/resolve`, preserving the
original app's CDN/stream proxy, Range response and rewritten HLS segments.
The browser never uses the provider's raw media URLs or an API key.

Only strictly validated HTTPS `/api/proxy-stream` sources on the main PinFlix
origin are accepted. Browser CSP permits that exact origin for media and
connect operations. R2 session resolution remains a **secondary fallback**
for already-published authorized media. No Cloudflare media Worker or backend
repository is redeployed by this UI change.

**Scope and limitations:** A TMDB title with no exact matching title in the
main provider catalogue is not automatically playable, even when it appears in
PinFlix 3.0's catalog. Source matching avoids wrong movies and TV series, and
individual sources still require end-to-end playback verification on target
devices. Main API downtime or upstream availability can affect playback. No
provider credentials are copied into client code.

## Cloudflare media backend

`pinflix-media-api` is a separate existing Worker that signs and serves authorized media from the private `pinflix-media` R2 bucket. It has independent settings, bindings, secrets and deployment lifecycle. Do not deploy the app's `wrangler.jsonc` to `pinflix-media-api`: that file targets the **`pinflix` frontend Worker**, not the media Worker.

Preserve the R2 private bucket, `SIGNING_KEY`, domain, and signed URL behavior. Manage changes to the media Worker separately after reviewing the Worker source and testing diagnostic HLS/MP4, CORS, and byte-range responses. Do not upload unauthorized third-party streams.

## Optional manual Cloudflare frontend

`Deploy Cloudflare Frontend (manual only)` exists only for an intentional alternative OpenNext frontend release.

1. Open GitHub → Actions → **Deploy Cloudflare Frontend (manual only)** → **Run workflow**.
2. Configure the `CLOUDFLARE_API_TOKEN` production/repository secret first, with least-privilege Worker deployment access.
3. The action validates, builds, and deploys the `pinflix` **frontend** Worker; it will not deploy the media Worker.

The workflow no longer listens to `push` and will not fail on normal Vercel UI changes because a Cloudflare API token is absent.

## Application configuration

On Vercel, use an HTTPS `NEXT_PUBLIC_SITE_URL` appropriate to the desired canonical UI hostname. `TMDB_READ_TOKEN` enables live metadata; without it, the application uses demo metadata. Configure Firebase public variables and authorized domains for sign-in. Keep server credentials on the backend only.

## Smoke checks

- UI: homepage, movie detail, watchlist, and mobile layout work without an error overlay.
- APIs: catalogue and `/api/playback/session` return deliberate success or unavailable states, never invented video links.
- CDN: `/health` returns a healthy media API response; diagnostic HLS and MP4 resolve from authorized R2 objects and are signed.
- Security: public R2 development domains remain disabled, and no secret or internal development instructions appear in the user-facing UI.
- Playback: test an owned/licensed video in browsers that require hls.js and browsers with native HLS.

CI success alone does **not** prove Vercel deployment health or end-to-end media playback.
