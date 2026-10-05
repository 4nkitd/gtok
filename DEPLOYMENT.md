# Deployment verification

Verified 2026-10-05 on https://gtok.dagar.in.

- Worker `gtok`, version `64b9444d-e8de-4818-8236-2d12867d8635`.
- Dedicated D1 database `gtok-db`, migration `0001_cache_and_counts.sql` applied.
- Custom domain resolves through both 1.1.1.1 and 8.8.8.8. HTTPS verified with certificate validation enabled.
- Production app, privacy page and database health endpoint return HTTP 200.
- First weekly-feed request returned HTTP 200 / `X-Cache: MISS`. The next request returned `HIT` with identical response content and cache timestamp.
- README endpoint returns HTTP 200 / `HIT` after the browser loaded its first preview.
- Invalid page 999 returns HTTP 400, not the app HTML.
- Browser verification at 390×844 and 1280×800 covered rendered README content, the expanded sheet, closing with Escape and light/dark layouts. No browser page errors were reported.
- One real Open click navigated to GitHub and incremented the production daily total for `kkkkhazix/aihot` from zero to one. That verification open is included in aggregate totals.
- `npm run stats` returns the seven-day aggregate report through a read-only D1 query. Use `--command`, not remote `--file`, which Wrangler treats as a database import and does not return SELECT rows.
- 47 frontend tests and 24 backend tests pass, including a compiled-Worker test in workerd. Lint, both typechecks, production build and upload dry run pass. Final code review found no remaining blockers.
- Daily cleanup configured for 03:17 UTC. Cleanup behavior is tested locally; the first scheduled production execution has not yet occurred.

GitHub requests currently use unauthenticated public access. Shared caching and cooldowns reduce requests but cannot eliminate upstream rate limits for uncached queries. Recommendations, visitor identification, a public analytics dashboard and PWA installation are not part of this release.
