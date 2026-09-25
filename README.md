# OddsFlow

OddsFlow is an Angular 21 odds dashboard built around mock live-sports data, designed primarily to demonstrate production-style architecture and deterministic testing. It stimulates moving odds, scores, and match statuses, provides a functional slip with exact monetary calculations, and is covered by a two-layer test suite of ~1,200 lines of Jasmine/Karma unit tests and 8 Cypress E2E suites.

---

## Table of contents

- [Purpose](#purpose)
- [Highlights](#highlights)
- [Architecture](#architecture)
  - [Folder structure](#folder-structure)
  - [Data flow](#data-flow)
  - [State management with signals](#state-management-with-signals)
  - [Event-driven live feed](#event-driven-live-feed)
- [Key engineering decisions](#key-engineering-decisions)
  - [Money as integer cents](#money-as-integer-cents)
  - [Validation at the source](#validation-at-the-source)
  - [Deterministic simulation hooks](#deterministic-simulation-hooks)
  - [Tennis scoring as a state machine](#tennis-scoring-as-a-state-machine)
  - [SSR-safe storage & theming](#ssr-safe-storage--theming)
- [Testing strategy](#testing-strategy)
  - [Layered testing approach](#layered-testing-approach)
  - [Unit tests (Jasmine + Karma)](#unit-tests-jasmine--karma)
  - [End-to-end tests (Cypress)](#end-to-end-tests-cypress)
  - [Determinism: the core testing principle](#determinism-the-core-testing-principle)
- [Project commands](#project-commands)
- [Deployment (Docker + nginx)](#deployment-docker--nginx)
- [Technologies](#technologies)
- [Test evidence](#test-evidence)
- [What I learned](#what-i-learned)

---

## Purpose

> **An odds dashboard with mock data, whose primary focus is unit testing and E2E testing.**

OddsFlow is a personal project intended to demonstrate:

- Design a **feature-based, signal-driven Angular architecture** that separates domain models, state stores, and thin presentational components.
- Model a **real-time data stream** in a way that is testable even though it is backed only by mock data.
- Write **~1,200 lines of unit tests** (Jasmine/Karma) against stores, reducers, pure helpers, and hostile edge cases.
- Write **8 E2E suites** (Cypress) that treat the app as a black box and assert behavior through observable UI state — never through timing.
- Enforce **determinism across both layers** so the entire suite runs reproducibly, fast, and without flakiness.

Everything else — theming, SSR, Docker — is scaffolding that makes the app a realistic, production-shaped vehicle for those tests.

---

## Highlights

- **Angular 21** application using the modern signal-based paradigm:
  - Standalone components (no `NgModule`)
  - `input()` / `output()` / `computed()` / `effect()` — no decorator-based inputs or `@HostBinding`
  - Native control flow (`@if`, `@for`) instead of `*ngIf` / `*ngFor`
- **Signal-based stores** (`MatchesStore`, `BetSlipStore`) with immutable updates — no `mutate()`
- **Mock live data feed** modeled as an event-sourced `LiveEvent` discriminated union; no backend required
- **Exact money math**: stakes and payouts are stored as integer cents, eliminating float drift (`0.1 + 0.2 === 0.3`, never `0.30000000000000004`)
- **Deterministic testability built in**: the mock feed can be paused (`?sim=off`), the loading phase is controllable (`?loadMs=`), and the tick loop is a public method — so both unit and E2E tests run without flakiness
- **~1,200 lines of unit tests** covering stores, reducers, pure helpers, and extreme edge cases
- **8 Cypress E2E suites** covering every user journey and layout behavior, using `data-cy` hooks and production-precision currency helpers
- **SSR + hydration with event replay**, plus a portable nginx/Docker deployment tuned for Angular SPA deep links and immutable asset caching

---

## Architecture

### Folder structure

The project follows a **feature-first** layout: everything a domain owns lives together, while cross-cutting infrastructure is centralized in `core/`.

```
src/app/
├── core/                          # Framework-agnostic infrastructure & domain
│   ├── data/
│   │   └── seed-matches.ts        # Frozen mock dataset consumed by both store & simulator
│   ├── models/                    # Pure domain types (no Angular imports)
│   │   ├── match.model.ts         # Match, SportType, MatchStatus, OddsSelection
│   │   ├── bet-slip.model.ts       # BetSlipItem
│   │   ├── live-event.model.ts     # Discriminated union of feed events
│   │   └── odds-trend.model.ts     # TrendInfo (direction + timestamp)
│   └── services/                  # Stores & infrastructure services
│       ├── matches.store.ts         # Event → state reducer (odds, scores, tennis)
│       ├── bet-slip.store.ts        # Slip state, cents-based math, stake rules
│       ├── mock-live-event.service.ts  # Simulated real-time feed (pausable)
│       ├── theme.service.ts          # Dark/light theming with OS-preference sync
│       └── safe-storage.service.ts   # SSR-safe localStorage wrapper
└── features/                      # Feature-scoped UI
    ├── dashboard/
    │   ├── dashboard.component.ts  # Sport tabs + loading skeleton orchestration
    │   └── components/
    │       ├── match-card/          # Renders marks, scores, odds buttons
    │       ├── match-card-skeleton/ # Accessible loading placeholder
    │       └── odds-button/         # Trending/flash animation + selection
    └── bet-slip/
        └── bet-slip.component.ts   # Slip rows, stake editing, totals, place bet
```

Rationale:

- **`core/models` is pure TypeScript** — no Angular decorators. Domain invariants (e.g. `StatusTransitions`, `MatchStatus`) live where they can be reasoned about in isolation and unit-tested without a DI container.
- **Stores are the single source of truth.** Components read via `computed()` signals and never mutate state directly; the store owns all rules.
- **Components are thin presenters.** Business logic lives in stores and pure helper functions (e.g. `sanitizeStakeCents`, `parseLoadDelay`) that are trivially testable.

### Data flow

```
MockLiveEventService  ── events$ ──►  MatchesStore  ── computed() ──►  MatchCard
        ▲                                   │                                    │
        │                 setMatchesSource() │                                   ▼
        └────── reads live store state ──────┘                    BetSlipStore (snapshot on pick)
```

1. `MatchesStore` ingests the mock feed through a private `LiveEvent` subject and applies each event with domain validation (see below).
2. The store **feeds its own live state back** to the simulator via `setMatchesSource()`, so the feed always acts on applied state — not on frozen mock data.
3. The dashboard renders matches through `computed()` signals; odds buttons derive trend direction from the last applied update.
4. Picking an odds button writes a **snapshot** (odds at time of pick) into `BetSlipStore`. Live odds keep moving on the cards, but the slip stays frozen — this snapshot/stream separation is asserted in E2E (`loading-live.cy.ts`).
5. `BetSlipStore` evicts selections automatically when their match becomes non-bettable (finished/cancelled) via an `effect()`.

### State management with signals

Both stores own a private `signal` and expose derived state through `computed()`:

```ts
private readonly _items = signal<Record<string, BetSlipItem>>({});
public readonly items = computed(() => Object.values(this._items()));
public readonly totalPayout = computed(() =>
  this.items().reduce((sum, item) => sum + item.potentialPayout, 0)
);
```

Design rules applied throughout:

- **No `mutate()`** — every update creates a new object (`_items.update(...)`), keeping history/purity guarantees and making the reducer path testable.
- **Derived state is always computed**, never manually re-synced.
- **`effect()` is used deliberately** (bet-slip eviction) and kept side-effect-light.

### Event-driven live feed

The mock feed is modeled as a **discriminated union**, so the store's reducer is exhaustive and type-safe:

```ts
export type LiveEvent =
  | OddsUpdateEvent     // { type: 'ODDS_UPDATE'; matchId; selection; newOdds }
  | ScoreUpdateEvent    // { type: 'SCORE_UPDATE'; matchId; homeScore; awayScore }
  | TennisScoreUpdateEvent // { type: 'TENNIS_SCORE_UPDATE'; ... }
  | StatusChangeEvent;  // { type: 'STATUS_CHANGE'; oldStatus; newStatus }
```

The `switch` in `MatchesStore.updateFromEvent()` is a classic **event-sourcing reducer**: each event is validated against current state, transformed purely, and only then merged back into the signal map.

---

## Key engineering decisions

### Money as integer cents

All monetary values (`stake`, `potentialPayout`) are stored as **integer cents**. Floating-point money is an anti-pattern — `0.1 + 0.2 !== 0.3`. Utilities enforce the invariant:

- `toCents(euros)` — converts input to cents.
- `sanitizeStakeCents(stake)` — non-finite → `0`, clamped to `[0, MAX_STAKE_CENTS = €100,000]`.
- `payoutCents(stakeCents, odds)` — exact via `Math.round`.

`updateStake` is a **no-op on non-finite input** (NaN/Infinity can never corrupt stored state) and returns the final applied value so the component can reflect clamping in the input UI. These rules are unit-tested in `bet-slip.store.spec.ts` and stress-tested end-to-end in `bet-slip-totals.cy.ts` (decimal stakes, the €100k cap, and the clamp path).

### Validation at the source

Rather than "garbage in, guard out", the stores reject bad input at the earliest point:

- `BetSlipStore.addSelection` refuses odds `<= 0` and selections whose match is not `live`/`scheduled`.
- `MatchesStore` ignores `ODDS_UPDATE` for non-live matches, non-positive odds, or selections the sport doesn't price (no draw `'X'` for non-soccer, enforced by `isSelectionValidForSport`).
- Status changes must follow the legal transition table `STATUS_TRANSITIONS` (`scheduled → live|cancelled`, `live → finished|cancelled`, terminal states are terminal).

This keeps the reducer small and the invariants local, and it is directly exercised by `matches.store.spec.ts` and the edge-case suite.

### Deterministic simulation hooks

Real-time feeds are a classic source of E2E flakiness. The mock feed is built to be **shut off** for tests:

- `?sim=off` — pauses the `interval()` feed entirely (checked in the `MockLiveEventService` constructor).
- `?loadMs=` — overrides the simulated fetch latency (default 900ms, clamped to `[0, 10000]`) so loading/skeleton states are assertable.
- `tick()` is **public** — unit tests drive the simulation step-by-step via `MockLiveEventService` and `fakeAsync`, while `Math.random` is stubbed or replaced with a **seeded PRNG** (see `edge-cases.spec.ts`) for reproducible long runs.

`parseLoadDelay` and the leader logic are pure functions and unit-tested directly.

### Tennis scoring as a state machine

Tennis is the trickiest domain rule and is implemented as an explicit state machine in `applyTennisUpdate`:

- Points `0 → 15 → 30 → 40`; a point that lands one side on `40` scores a **game**.
- `6` games with a `2`-game lead wins a **set** (tracked in `sets`).
- First to `SETS_TO_WIN = 2` sets finishes the match, auto-transitioning status to `finished`.

The edge-case suite spins up long seeded simulations to thousands of events and asserts each invariant holds at every step — no `ScoreUpdateEvent` can ever apply to a tennis match, and tennis points can never be described as a `SCORE_UPDATE`.

### SSR-safe storage & theming

- `SafeStorageService` guards every `localStorage` access with `isPlatformBrowser` + try/catch (private-mode and SSR-safe), falling back to `null`/`false` rather than throwing.
- `ThemeService` honors a stored user choice over the OS preference, keeps following the live OS `prefers-color-scheme` when no choice exists, and applies the theme via `data-theme` on `<html>` — with `destroyRef.onDestroy` cleanup.

---

## Testing strategy

Testing is the heart of this project. The primary focus is a **two-layer, deterministic test suite**: fast reducer/unit specs in Jasmine + Karma, and black-box behavioral suites in Cypress that treat the dashboard as a real product.

### Layered testing approach

| Layer | Tool | Files | Covers |
|-------|------|-------|--------|
| Unit — stores | Jasmine + Karma | `bet-slip.store.spec.ts`, `matches.store.spec.ts` | Slip math, odds/score reducers, status transitions, stake rules |
| Unit — edge cases | Jasmine + Karma | `edge-cases.spec.ts` (554 lines) | Seeded-PRNG long simulations, invariants, pure helpers, SSR safety |
| Unit — utilities | Jasmine + Karma | `safe-storage.service.spec.ts`, `app.spec.ts` | Storage failure modes, smoke tests |
| E2E | Cypress | `e2e/*.cy.ts` (8 specs) | Full user journeys: slip flow, lifecycle, toggles, totals, navigation, loading, live feed, responsive layout |

### Unit tests (Jasmine + Karma)

~1,200 lines of specs run headless in CI:

```bash
npm run test:ci          # ChromeHeadlessNoSandbox, single run
```

Notable techniques:

- **Fake feed service** — tests provide a `Subject`-backed `MockLiveEventService` double, so the store is driven by exact events instead of the interval.
- **`fakeAsync` + `tick`** — timers (the load delay) are controlled precisely.
- **Seeded PRNG** — `edge-cases.spec.ts` swaps `Math.random` for a deterministic generator so 2,000-event simulations reproduce identically every run.
- **Pure-function isolation** — helpers like `sanitizeStakeCents`, `payoutCents`, `parseLoadDelay`, `isSelectionValidForSport`, and `emptyTennisScore` are exercised directly with hostile inputs (NaN, Infinity, empty strings, negative odds).

### End-to-end tests (Cypress)

```bash
npm run e2e              # cypress run (headless)
npm run e2e:open         # cypress open (interactive)
```

> **Note:** Specs live in `e2e/` at the project root (not the Cypress default `cypress/e2e/`), configured via `cypress.config.ts` → `specPattern`.


The E2E suite treats the app as a black box via `data-cy` hooks and a tiny `helpers.ts` that mirrors the app's own currency/payout math (`formatEur`, `round2`) for exact assertions:

| Spec | What it proves |
|------|----------------|
| `bet-slip-flow.cy.ts` | Add/remove/toggle selections end-to-end |
| `bet-slip-lifecycle.cy.ts` | Slip reacts to match finishing/cancelling |
| `bet-slip-toggles.cy.ts` | Selection UI state stays in sync with the store |
| `bet-slip-totals.cy.ts` | Decimal stakes, €100k clamp, 6-selection totals & scroll |
| `dashboard-navigation.cy.ts` | Sport tab switching and routing |
| `loading-live.cy.ts` | Skeleton/`aria-live` loading states + **snapshot frozen while stream updates** |
| `responsive.cy.ts` | Layout correctness at multiple viewports |
| `temp-feed-slip.cy.ts` | Feed-driven odds movement with the slip intact |

### Determinism: the core testing principle

Every test datum is controlled:

1. `visitApp()` always mounts with `?sim=off` unless a specific run wants the live feed (then `Math.random` is stubbed in-page, e.g. `loading-live.cy.ts`).
2. Currency assertions reuse production-precision helpers, so the test can never drift from the app's rounding.
3. There are no sleeps, no arbitrary waits, and no "run X times and hope" tests — Cypress retries are driven by assertions on observable state.

The result: the entire suite (unit + E2E) is reproducible, fast, and free of flaky timing.

---

## Project commands

```bash
npm install            # install dependencies
npm start              # dev server → http://localhost:4200
npm run build          # production build (SSR + client) into dist/
npm test               # unit tests (watch)
npm run test:ci        # unit tests, single headless run
npm run e2e            # Cypress E2E, headless
npm run e2e:open       # Cypress interactive
npm run serve:ssr:OddsFlow  # serve the SSR build locally
```

Useful query params while developing:

```text
?sim=off         Pause the live odds/score simulation
?loadMs=3000     Simulate a slow fetch to inspect the loading skeleton
```

---

## Deployment (Docker + nginx)

The Dockerfile is a two-stage build (compile → serve) and nginx is tuned for Angular SPA semantics:

```bash
docker build -t oddsflow .
docker run -p 8080:80 oddsflow   # → http://localhost:8080
```

- `index.csr.html` SPA fallback (`try_files`) so client-side routes and deep links resolve.
- Hashed assets (`main-*.js`, hashed CSS/images/fonts) are served `immutable` with a 1-year cache.
- HTML docs are never cached (`no-store`), and `server_tokens off` hides the nginx version.
- The build uses `npm ci` (exact lockfile install) and layer caching around `package-lock.json`.

---

## Technologies

- **Angular 21** — standalone components, signals, `input()`/`output()`/`computed()`/`effect()`, native control flow, SSR + hydration with event replay
- **RxJS 7** — the mock live feed stream + `takeUntilDestroyed`
- **Jasmine + Karma** — unit tests with code coverage (`karma-coverage`)
- **Cypress 15** — black-box E2E tests
- **TypeScript 5.9** — strict mode
- **SCSS** — component styles
- **Docker + nginx** — containerized, cache-tuned production serving

---

## Test evidence

The app isn't visually impressive — that was never the goal. What is worth showing is the test suite passing.

### Unit & Integrations Suite (Jasmine + Karma)

![Jasmine and Karma test suite execution in terminal](./assets/jasmine_test.png)

### End-to-End Suite (Cypress)

![Cypress E2E test](./assets/cypress_test.png)
---

## What I learned

Building OddsFlow made several things concrete that I previously only understood in theory.

**Testability has to be designed in — it can't be retrofitted.**  
The most consequential architectural decisions — the `?sim=off` query param, the public `tick()` method, the `setMatchesSource()` feedback loop — were all made to serve the test suite. I reached for those seams early, and they paid off every time I needed to drive state from a spec. Bolting on testability later is expensive; planning for it from the start is essentially free.

**Determinism is something you enforce, not something you get for free.**  
`setInterval` and `Math.random` are invisible until a flaky test appears. Treating them as seams I could swap out — a `?sim=off` flag, a seeded PRNG in `edge-cases.spec.ts`, `fakeAsync`/`tick` in unit tests — meant the entire suite can reproduce identically on any machine. Flakiness is almost always a design problem, not a timing problem.

**Pure functions are the easiest unit of testing, by a wide margin.**  
Pulling `sanitizeStakeCents`, `payoutCents`, `parseLoadDelay`, and `isSelectionValidForSport` out as standalone functions — rather than burying the logic inside service methods — made the most hostile edge cases (NaN, Infinity, negative odds, empty strings) trivial to exercise with zero Angular DI setup. The barrier to writing a new spec dropped to basically nothing.

**Float math is a real-world bug, not a language trivia question.**  
`0.1 + 0.2 !== 0.3` sounds like a JavaScript quirk until you see it in a payout total. Integer cents eliminate the entire class of problem, and writing the E2E test that asserted `€150.00` (never `€149.99999...`) made the consequence tangible rather than theoretical.

**E2E tests should assert on state, not on time.**  
Early instinct: `cy.wait(500)` after every interaction. Every one of those is a flakiness bomb. Replacing them with assertions on observable DOM state (`cy.contains`, `.should('have.text', ...)`) made the suite faster and the failures meaningful — the test now breaks because something is wrong, not because the CI runner was slow that day.

**TypeScript's type system is also a test.**  
Modeling the live feed as a discriminated union and the store's `switch` as exhaustive meant that adding a new event type produced a compile error everywhere it wasn't handled. The compiler caught entire categories of bugs before Jasmine ever ran — and that's a feedback loop you get essentially for free if you reach for it.