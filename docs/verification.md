# Verification

## Automated checks

Run the project's test, typecheck, and Next.js build scripts. With a development server running, run `node scripts/verify-app.mjs http://127.0.0.1:3000` for public HTTP smoke checks. Unit fixtures deliberately include malformed metadata and hostile external URLs; client tests exercise isolation between guest and Firebase account watchlists. The local tests do not emulate Firebase Security Rules or remote Firestore behavior.

The smoke script checks the public app response, catalogue/search/detail routes, metadata files, and anonymous watchlist protection. It is a native-fetch HTTP integration check, not a browser automation test. A passing ordinary Next.js build does not establish a passing OpenNext Workers build.

## Local browser review

1. Browse the catalogue; change genre, sort, country, and search query. Confirm empty results explain what to change. Search takes precedence over genre; live TMDB search preserves upstream relevance rather than applying discovery sort parameters.
2. Open a movie. Check title, synopsis, trailer behavior, and availability attribution. Demo availability must remain distinguishable from live availability.
3. Add and remove movies in the demo watchlist. Refresh the page and confirm saves persist. Clear storage and verify the list clears.
4. Use the app at a narrow mobile width and a desktop width. Navigate controls with Tab/Shift+Tab, activate them with the keyboard, and check visible focus.
5. Inspect Credits/Privacy content, image alternative text, loading/error states, and browser console errors.

## Workers and real account checks

Use WSL or Ubuntu CI for the OpenNext build and a Workers preview. The prototype Firestore rules and index are deployed to the `pinflix` database; review and harden them before a broad launch. Enable Google Authentication in Firebase and authorize the intended app domains before testing account flows. [OpenNext Windows guidance](https://opennext.js.org/cloudflare#windows-support).

1. Confirm live TMDB queries return expected titles and do not disclose the bearer token in HTML, browser requests, or logs.
2. Complete Google sign-in and confirm account data persists in Firestore. Log out, reload, and sign in again.
3. Save a movie as user A, then sign in as user B. User B must not see, edit, or delete user A's saved record. Repeat using Firebase client calls with the Firebase Emulator Suite or a non-production test project.
5. Request missing/invalid movie IDs and excessive query parameters. Check clear bounded errors and no unintended outbound URL fetches.
6. Confirm correct site metadata/canonical origin, Google callback, cookies on HTTPS, CSP, and external-link destinations in the actual Worker runtime.
7. Confirm optional cache bindings degrade safely if unavailable and cached entries contain no secrets or private account data.

## Status interpretation

The initial handoff can verify the runnable local demo, test fixtures, TypeScript, and local builds. Google provider activation was deferred, so real Google OAuth and authenticated Firestore persistence remain unverified until the provider is enabled, its support email is selected, and an authorized domain is configured. No local test should be reported as evidence that a remote resource is working or that a deployment occurred.
