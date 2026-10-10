# Deployment checklist

## Cloudflare deployment target

This project is configured for the OpenNext/Cloudflare Workers path, which is the safe production target for the current Next.js 16 app structure. Pages-only hosting is not the primary deployment model unless the project is reconfigured for that architecture.

## Required environment variables

Set these in the Cloudflare Workers environment or your hosting platform:

- `TMDB_READ_TOKEN`
- `TMDB_API_KEY` (optional fallback)
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL` (optional for Firestore client config)
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)

## Deployment checks

1. Confirm Cloudflare KV/R2 bindings if you use them.
2. Validate production `NEXT_PUBLIC_SITE_URL` is an HTTPS domain, not localhost.
3. Ensure Firebase Auth is enabled and the production hostname is added to authorized domains.
4. Test watchlist ownership in a staging project before launch.
5. Review Firestore security rules before broad access.
6. Run the project build and tests before deploy.

## Demo mode

If TMDB credentials are missing, the app automatically uses demo data without exposing a warning to end users unless the runtime is in development.
