# PinFlix — Cloudflare R2 media CDN

## Live deployment boundary

- **PinFlix app**: `https://pinflix30.vercel.app`, sourced from `omarreact/pinflix.cineplexbd.net` on `main`.
- **Media Worker**: `pinflix-media-api`, custom hostname `https://media.pincodeit.com`.
- **Private media bucket**: `pinflix-media`. Public `r2.dev` bucket access remains **disabled**.
- **Worker R2 binding**: `MEDIA`. Worker secret: `SIGNING_KEY`. The Worker also has `CORS_ORIGINS` including `https://pinflix30.vercel.app`.
- **Catalogue**: metadata comes from TMDB, but **video files never come from TMDB**.
- **Delivery**: the browser requests signed HLS/MP4 directly from the Cloudflare Worker after the app resolves an opted-in R2 catalogue manifest.

Cloudflare Worker and R2 configuration are already present. No CineplexBD mirroring or external stream proxy is part of this deployment.

## Architecture

```text
PinFlix movie page or TV episode selector
  -> POST /api/playback/session (same origin; request scoped to a TMDB ID)
  -> GET https://media.pincodeit.com/public-resolve?key=<catalogue-key>
  -> Worker reads catalog-public/<catalogue-key>.json from private R2
  -> Worker checks public:true and object presence
  -> Signed HLS/MP4 URL returned to browser
  -> hls.js/native video -> https://media.pincodeit.com/m/media/...?exp=...&sig=...
  -> Cloudflare Worker validates HMAC and expiry, reads R2 with byte ranges
```

Keys:
- Movie: `movie:693134` -> `catalog-public/movie:693134.json`
- Episode: `tv:1396:s1e2` -> `catalog-public/tv:1396:s1e2.json`

TMDB IDs above are **identifier examples only**. Never publish diagnostic or unrelated media as if they were full commercial titles.

## 1. Upload an authorized video asset

Cloudflare Dashboard -> R2 -> `pinflix-media` -> Upload (or use Wrangler).

```bash
npx wrangler login
npx wrangler r2 object put "pinflix-media/media/owned-movie/master.mp4" \
  --file="./owned-movie.mp4" --content-type="video/mp4" --remote
```

For adaptive HLS, upload the master and variant playlists and **every referenced segment**, preserving relative paths. The Worker signs local segment references when it rewrites the playlist. External segment hosts and traversal paths are not accepted. Supported objects include `.m3u8`, `.ts`, `.m4s`, `.mp4`, `.aac`, `.vtt`, and auxiliary HLS keys.

## 2. Publish a movie catalogue manifest

Preview the manifest:

```bash
node scripts/r2-catalogue.mjs --kind movie --id 693134 \
  --source "Original HD=media/owned-movie/master.mp4"
```

After uploading the video **and confirming distribution rights**, publish:

```bash
node scripts/r2-catalogue.mjs --kind movie --id 693134 \
  --source "Original HD=media/owned-movie/master.mp4" \
  --publish --rights-confirmed
```

This uploads `catalog-public/movie:693134.json`, whose shape is:

```json
{
  "public": true,
  "sources": [{
    "label": "Original HD",
    "path": "media/owned-movie/master.mp4"
  }]
}
```

Set the TMDB ID to the **actual licensed video's** metadata identifier, not an arbitrary sample.

## 3. Publish a TV episode

```bash
npx wrangler r2 object put "pinflix-media/media/my-series/s1/e2/master.m3u8" \
  --file="./master.m3u8" --content-type="application/vnd.apple.mpegurl" --remote

node scripts/r2-catalogue.mjs --kind tv --id 1396 --season 1 --episode 2 \
  --source "Adaptive HD=media/my-series/s1/e2/master.m3u8" \
  --publish --rights-confirmed
```

For HLS, also upload variant playlists and all segments, using the **exact keys** referenced in the playlists. The Worker validates the master file exists, but cannot guarantee its referenced assets are present until playback is tested.

The show's TV detail page can resolve `tv:<id>:s<season>e<episode>` from an episode card. If episode metadata is not available, a season/episode selector provides direct R2 catalogue lookup.

## 4. Verify

```bash
curl -sS https://media.pincodeit.com/health
curl -sS "https://media.pincodeit.com/public-resolve?key=movie:693134"
curl -sS "https://media.pincodeit.com/public-resolve?key=tv:1396:s1e2"
```

An empty `"sources":[]` response means that no valid public manifest + R2 media object was found. It is **not** a successful video stream.

Use a signed URL returned by `public-resolve`:

```bash
curl -I "<SIGNED_MP4_OR_M3U8_URL>"
curl -i -H "Range: bytes=0-1023" "<SIGNED_MP4_URL>" -o /dev/null
```

Expected outcomes: `200` for playlists, `206` for MP4 byte ranges, correct CORS for `pinflix30.vercel.app`, and `403` for expired/bad signatures. Browser test in Chrome/Android and Safari/iOS; verify HLS variants and subtitles if available.

## 5. Protection, CDN cache and limits

- **Media stays private** in R2. Never turn on the bucket's public development hostname.
- `SIGNING_KEY` must remain a Worker secret. Never commit it or the TMDB token.
- The current Worker uses `/public-resolve` with opted-in manifests. This is a *public title* design, **not user-entitlement gating or DRM**.
- The present signing TTL is six hours. Manifest and signed media caching require expiry and access-control review. The Worker has `Cache-Control` headers but no verified cache-hit acceleration or Singapore pinning.
- Cloudflare R2 storage, request operations, and Worker usage can incur costs. This is **not unlimited free hosting**.
- You must have distribution rights for every video that you publish.
- Vercel's `PLAYBACK_EDGE_BASE_URL` defaults to `https://media.pincodeit.com`. Keep the app's URL allowlist and Worker hostname in agreement.
- Debug files live under `media/diagnostic/`; they are *not* movie or episode sources.

## Existing infrastructure verification

As of 2026-10-10, R2 inventory contained only:
`media/diagnostic/edge-health.mp4`, `edge-index.m3u8`, `edge-segment000.ts`, and `test.vtt`.
Real movie and TV playback will correctly show unavailable until their actual authorized media objects and manifest entries are published.

Existing `pinflix.pages.dev` static build is separate from the current full Next.js Vercel runtime. Do not swap domains or deploy over it just to change the media origin.
