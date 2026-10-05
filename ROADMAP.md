# G.tok redesign roadmap

Goal: a production-ready, natural-feeling way to discover rising GitHub repositories.

## Decisions

- Feed: rising repos via GitHub search (`created:>=DATE`, sorted by stars), served through a shared Worker/D1 cache.
- Interaction: full-screen vertical feed (scroll/swipe up for next), mobile-first, keyboard on desktop.
- Card: owner, name, description, topics, language, stars, forks, README excerpt with expand.
- Controls: time window (Today / Week / Month) and language. Seen repos are hidden by default.
- Save: local only (localStorage). GitHub login is out of scope for now.
- Look: clean, quiet, content-first, follows system light/dark theme, one accent color.
- Stack: Vite, React, TypeScript, Vitest, ESLint. No Bootstrap, no CDN CSS.
- Hosting: Cloudflare Worker with static assets, custom domain `gtok.dagar.in`. CI checks only; deployment is manual.
- Signals: aggregate daily repository-open counts only. No visitor IDs or server-side browsing history. Recommendations deferred.

Each milestone stops for Boss review before the next one starts.

## Backend and deployment (authorized after milestone 2)

- [x] Shared search and README caches with rate-limit protection and stale fallback
- [x] Aggregate-only open counts in D1, private CLI report and 30-day cleanup
- [x] Same-origin API integration and public privacy disclosure
- [x] Backend tests against SQLite/D1, build and deployment configuration
- [x] Code review, public deployment and live HTTPS/cache/counter verification

## Milestone 1: foundation and data layer

- [x] Replace CRA with Vite + React + TypeScript; remove Bootstrap and react-tinder-card
- [x] GitHub search client: time window, language, pagination, rate-limit detection
- [x] README loader from raw.githubusercontent.com with sanitised Markdown rendering
- [x] Local storage for saved and seen repos
- [x] Unit tests for the data layer
- [x] CI workflow on ubuntu-latest (lint, typecheck, test, build)
- [x] Minimal page that renders live results to prove the data path

## Milestone 2: vertical feed

- [x] Full-screen snap-scrolling feed with infinite loading
- [x] Repo card layout with README excerpt and expand sheet
- [x] Action rail: save, open on GitHub, share/copy link
- [x] Time window chips and language picker
- [x] Keyboard: j/k or arrows to move, s to save, o to open
- [x] Loading, empty, offline and rate-limited states

## Milestone 3: saved, history and polish

- [ ] Saved list view with remove and open
- [ ] Seen-history reset
- [ ] System theme, design tokens, motion that respects reduced-motion
- [ ] PWA: manifest, icons, installable, cached shell

## Milestone 4: hardening

- [ ] Accessibility pass (focus order, labels, contrast, screen-reader announcements)
- [ ] Filter pickers: keep keyboard arrow browsing and type-ahead (currently blurred on change to protect search quota)
- [ ] Component tests for feed interactions
- [ ] Performance pass (bundle size, image sizing, README fetch only near viewport)
- [x] README update
