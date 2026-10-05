# G.tok redesign roadmap

Goal: a production-ready, natural-feeling way to discover rising GitHub repositories.

## Decisions

- Feed: rising repos via GitHub search (`created:>DATE`, sorted by stars), client-only, no backend.
- Interaction: full-screen vertical feed (scroll/swipe up for next), mobile-first, keyboard on desktop.
- Card: owner, name, description, topics, language, stars, forks, README excerpt with expand.
- Controls: time window (Today / Week / Month) and language. Seen repos are hidden by default.
- Save: local only (localStorage). GitHub login is out of scope for now.
- Look: clean, quiet, content-first, follows system light/dark theme, one accent color.
- Stack: Vite, React, TypeScript, Vitest, ESLint. No Bootstrap, no CDN CSS.
- Hosting: local only. CI runs lint, typecheck, tests and build.

Each milestone stops for Boss review before the next one starts.

## Milestone 1: foundation and data layer

- [x] Replace CRA with Vite + React + TypeScript; remove Bootstrap and react-tinder-card
- [x] GitHub search client: time window, language, pagination, rate-limit detection
- [x] README loader from raw.githubusercontent.com with sanitised Markdown rendering
- [x] Local storage for saved and seen repos
- [x] Unit tests for the data layer
- [x] CI workflow on ubuntu-latest (lint, typecheck, test, build)
- [x] Minimal page that renders live results to prove the data path

## Milestone 2: vertical feed

- [ ] Full-screen snap-scrolling feed with infinite loading
- [ ] Repo card layout with README excerpt and expand sheet
- [ ] Action rail: save, open on GitHub, share/copy link
- [ ] Time window chips and language picker
- [ ] Keyboard: j/k or arrows to move, s to save, o to open
- [ ] Loading, empty, offline and rate-limited states

## Milestone 3: saved, history and polish

- [ ] Saved list view with remove and open
- [ ] Seen-history reset
- [ ] System theme, design tokens, motion that respects reduced-motion
- [ ] PWA: manifest, icons, installable, cached shell

## Milestone 4: hardening

- [ ] Accessibility pass (focus order, labels, contrast, screen-reader announcements)
- [ ] Component tests for feed interactions
- [ ] Performance pass (bundle size, image sizing, README fetch only near viewport)
- [ ] README update
