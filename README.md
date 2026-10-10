# Pinflix

Pinflix is a media discovery app for film lovers. It helps people browse and search a movie catalogue, inspect details, watch legal trailers or embedded previews, and save titles to a watchlist. The app is intentionally not a Netflix clone and uses a media-aware design language rather than a fixed dark-red branding system.

This repository is built with Next.js 16, React, TypeScript, TMDB, Firebase Auth, Firestore, and Cloudflare Workers/OpenNext. It supports a fully functional demo mode without credentials and a live mode with production configuration.

## Product goals

- Discover titles with search, filters, and curated browsing
- Show legal metadata and provider links via TMDB/JustWatch where available
- Default to demo content when no TMDB token is configured
- Support local browser watchlists and optional authenticated Firestore watchlists
- Deploy safely on Cloudflare with explicit environment validation
- Avoid unauthorized streaming sources or scraping

## Local development

Use Node.js 22+ and pnpm. Run these commands from the repo root:

```sh
npm exec --yes pnpm@11.25.0 install
npm exec --yes pnpm@11.25.0 dev
```

You can also run the PowerShell helper:

```powershell
./Start-Pinflix.ps1
```

Then open http://127.0.0.1:3000.

Demo mode behavior:

- If no TMDB credential is present, the app uses curated demo metadata instead of a live catalogue.
- Watchlists still work in the browser local store.
- Firebase sign-in remains available if the project is configured, but it will fail gracefully in demo mode.

## Required environment variables

Copy `.env.example` to `.env.local` or `.dev.vars.example` to `.dev.vars` and set values you need.

### App runtime secrets

| Variable | Required | Purpose |
| --- | --- | --- |
| `TMDB_READ_TOKEN` | Optional for demo, required for live TMDB metadata | Server-side TMDB read token |
| `TMDB_API_KEY` | Optional legacy fallback | Alternate TMDB access key |
| `NEXT_PUBLIC_SITE_URL` | Recommended in production | Canonical origin for metadata and redirects |

### Firebase public config

These values must be public web app config values, not secret API keys.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

### Cloudflare / media bindings

```env
MOVIE_CACHE= # optional KV binding
MEDIA_BUCKET= # optional R2 bucket binding
```

The app must not expose secrets in client-side code. Public Firebase config is safe to expose; server-only credentials stay on the backend.

## Firebase setup

1. Create a Firebase project and enable Authentication.
2. Enable Google sign-in from Authentication → Sign-in method.
3. Add `localhost` and `127.0.0.1` as authorized domains for local development.
4. Configure Firestore and deploy the rules in `firestore.rules` and `firestore.indexes.json`.
5. Add the public config values into `.env.local` or your deployment environment.
6. Keep rules restrictive and validate the watchlist schema before public launch.

## TMDB setup

1. Create a TMDB account and generate a read token.
2. Add it as `TMDB_READ_TOKEN` in the server environment.
3. Set `NEXT_PUBLIC_SITE_URL` to your production HTTPS origin.
4. If TMDB is unavailable, the app automatically falls back to demo metadata.

## Safe media-source policy

This project does not scrape, host, or redistribute unauthorized third-party copyrighted streams.

Allowed sources for embedded or adaptive playback include:

- TMDB metadata and trailer metadata
- YouTube or Vimeo embeds where the copyright holder allows embedding
- Internet Archive public-domain media
- user-owned media
- Cloudflare R2 media owned or authorized by the project
- explicitly licensed IPTV/live sources

Disallowed:

- unauthorized copyrighted stream scraping
- bypassing access controls
- hardcoded public stream URLs without legal authorization

## Cloudflare deployment

The repository is configured for the OpenNext/Cloudflare Workers path, which is the safest choice for this app’s server-rendered Next.js route structure. Cloudflare Pages deployment should be treated as a static/SSR hosting integration only when the project is explicitly configured for that mode.

### Build commands

```sh
npm exec --yes pnpm@11.25.0 typecheck
npm exec --yes pnpm@11.25.0 test
npm exec --yes pnpm@11.25.0 build
npm exec --yes pnpm@11.25.0 build:worker
```

### Production checklist

- Set production `NEXT_PUBLIC_SITE_URL`
- Set TMDB token in the hosting environment
- Add Firebase public config values
- Confirm Cloudflare bindings for `MOVIE_CACHE` and any R2 resources
- Test sign-in and Firestore watchlist ownership rules in a staging project
- Review `firestore.rules` before broad release
- Verify the deployment app has no secret leaks in public config

## Testing

```sh
npm exec --yes pnpm@11.25.0 test
npm exec --yes pnpm@11.25.0 typecheck
npm exec --yes pnpm@11.25.0 build
```

This project includes tests covering catalogue normalization, demo fallback behaviour, request security, metadata mapping, and media-layer safety checks. A lint script is intentionally not enforced because ESLint is not configured in this repository.

## Deployment notes

See [DEPLOYMENT.md](DEPLOYMENT.md) for a production-ready Cloudflare deployment checklist and operational notes.

## Attribution

The app uses TMDB metadata and artwork where applicable. Credits and provider links should preserve TMDB attribution and legal notices in the UI.
