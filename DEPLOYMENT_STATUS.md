# Pinflix Deployment Status

Cloudflare Pages deployment is configured to use the lightweight static fallback build:

- Build command: `pnpm build:pages`
- Output directory: `dist`
- Full server-rendered app target: OpenNext Cloudflare Worker pipeline

This file intentionally documents the Pages fallback so a fresh deployment is triggered after the Cloudflare project build configuration was corrected.
