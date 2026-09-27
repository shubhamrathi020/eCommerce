# Project Memory

Living record of decisions, facts and learned patterns. Append only; correct with a new dated entry that supersedes the old one. Changes to steering docs are proposed and reviewed first (see README.md).

## Project facts
- Owner: Shubham Rathi, solo, no fixed timeline. Working dir: `C:\shubhu\coding\claude\eCommerce`. Platform: Windows 11 (PowerShell + Git Bash).
- Goal: full eCommerce app that also demonstrates system design concepts (caching, queues, rate limiting, universal search, Docker, K8s, etc.).
- Build order: frontend (mock data) -> backend -> infra. Per-module BRDs in `brds/`, updated on every change.

## Decisions
| Date | Decision | Why |
|---|---|---|
| 2026-09-26 | Master BR v1.0 approved | Baseline scope |
| 2026-09-26 | General-purpose catalog (fashion, electronics, grocery, ...) | Category-driven attributes/variants, not niche-specific |
| 2026-09-26 | Modular monolith first, services later | Avoid early complexity, still teach boundaries |
| 2026-09-26 | Search: Meilisearch first | Lightweight, quick to run locally |
| 2026-09-26 | Payments: Razorpay (test mode) | India/INR focus |
| 2026-09-26 | DB: PostgreSQL + MongoDB (catalog) + Redis; queue: RabbitMQ (Kafka in P3) | As proposed in BR |
| 2026-09-26 | K8s local first (kind/minikube), cloud later | Cost and simplicity |
| 2026-09-26 | B2B deferred; keep price/customer models extensible | Add only if not disruptive |
| 2026-09-26 | Frontend on mock data behind swappable API interfaces (architecture.md 2.2) | Backend not started; swap by config |
| 2026-09-26 | Steering docs v0.1 reviewed and confirmed | Consistency across tasks |
| 2026-09-27 | Scaffolded with Nx 23.2 + Angular 22.1 (zoneless, SSR, esbuild), TypeScript 6, Vitest (analog) for unit tests, Playwright e2e for storefront, Tailwind 4 + CDK, pnpm as package manager | `npm` install crashed (npm arborist bug) so pnpm was used; Nx `angular-monorepo` preset also generated an unwanted `api` app, so an empty workspace + Angular generators was used |
| 2026-09-27 | BRD 12 (hardening) implemented: bottom-bar stacking, mobile load more, focus management, offline banner; bundle and hydration behaviour measured and verified rather than assumed; cross-browser suite run for real | Twelfth and last phase-1 slice |
| 2026-09-27 | BRD 10 (notifications) implemented: bell, preferences, alert subscriptions, admin templates with versioning, delivery log | Eleventh slice |
| 2026-09-27 | BRD 11 (inventory) implemented: append-only stock ledger, reservations with expiry, two seeded locations, backorder, CSV import and export | Tenth slice |
| 2026-09-27 | BRD 09 (content and SEO) implemented with placeholder brand and content; content store shared by storefront and admin mocks | Ninth slice |
| 2026-09-27 | BRD 08 (DevOps) implemented: Docker verified, Kubernetes manifests render-checked only | Eighth slice |
| 2026-09-27 | BRD 07 (reviews) implemented: review store overlay, ratings recomputed on every catalog call | Seventh slice |
| 2026-09-27 | BRD 06 (admin console) implemented; admin runs on port 4201 with separate seeded data | Sixth slice |
| 2026-09-27 | BRD 05 (accounts) implemented with a mock identity store, guards and a dev-only mailbox | Fifth slice |
| 2026-09-27 | BRD 03 (search) implemented with a mock engine behind the listing call and a `SearchApi` for suggestions | Fourth slice |
| 2026-09-27 | BRD 04 (cart and checkout) implemented on mock adapters; `libs/shared/state` added | Third slice |
| 2026-09-27 | BRD 02 (catalog) implemented on mock data: 252 products, seeded generator, lazy JSON fixtures | Second slice |
| 2026-09-27 | Steering updated (approved): `libs/shared/core`, mock-data location, Angular 22/pnpm baseline | First slice deviations |
| 2026-09-27 | Nx workspace uses path aliases (`@ecom/...`, tsconfig.base paths), not TS project references | `@nx/angular` does not support project references |
| 2026-09-26 | Confirmed: Tailwind + Angular CDK, Nx monorepo, placeholder brand palette (indigo/amber) until a brand is chosen; test runner and Storybook-vs-showcase chosen by Claude at scaffold | User confirmation |

## Open items
- Brand name/logo/final palette (placeholder in use).
- Add e2e (Playwright) + axe contrast checks once a stable flow exists.

## Patterns and lessons (fill as they emerge)
- Shell of Windows Git Bash: a large multi-file heredoc can fail to parse; write files with the Write tool instead.
- Angular resources: `resource.value()` throws in error state; guard with `hasValue()`. Errors must be `Error` instances (use `ApiException`) or they are wrapped.
- Signals: never write to a signal inside a `computed` (NG0600); load persisted state in the constructor, not lazily in a computed. Output names must not match native DOM events (`toggle`, `change`...).
- SSR: an Angular Router navigation during SSR becomes a real 302; set `RESPONSE_INIT.status` for 404s. Keep server rendering free of `window`/`matchMedia` (guard, jsdom lacks matchMedia too).
- Route guards: call every `inject()` before the first `await`.
- Header has search forms too: when scripting the browser, scope selectors (e.g. `aside form`) or you may click the wrong submit button.
- Search box tests: drive with real DOM events and wait a few debounce periods; keep `mockLatencyMs: 0`.
- Identity in mocks: `MockUserStore` holds users, session and lockout data; anything that must follow the signed-in owner (cart, orders, addresses) reads `currentUserId()` from it.
- Admin mocks: `MockAdminState` holds an overlay (edits, notes, roles, audit) over seeded data; every admin API calls `state.require(permission)` first and `state.record(...)` on writes.
- When a test looks for a button by attribute (e.g. `aria-pressed`), scope it to the component; pages often have several.
- Never run broad process killers (for example `taskkill /IM node.exe`); stop a dev server by the port it listens on.
- Python patch scripts: write regexes containing `` with `chr(92)` or a raw string, or use the Edit tool; a plain string turns `` into an invisible backspace.
- Anything a spec imports from `@ecom/shared/data-access` must be exported from its index (a missing export shows up as `Cannot convert undefined or null to object` in TestBed.inject).
- Stock: `MockInventoryStore` is the single source of stock in the mocks. Shop reads (catalog, search, cart) call `inventory.apply(products)` for available units; admin calls `apply(products, 'onHand')`. Never write stock into a product; add a ledger movement (`sell`, `restore`, `adjust`, `transfer`) so on hand always equals baseline plus movements.
- Notifications: `MockNotificationStore` is the single source for the bell, preferences, alert subscriptions, templates and the delivery log (one storage key, like the other stores). Any mock API or trigger point that sends a message calls its `deliver(templateKey, to, vars, { userId?, link? })`, never `MockMailbox` directly, so every send is logged and (with a `userId`) reaches the bell.
- Cross-app gap: admin product edits (price, title, etc.) are NOT visible to the shop's own catalog reads in this mock (separate stores, a known limitation). A trigger that depends on an admin edit (e.g. a price-drop alert) must run at the moment the admin saves, not wait for a later shop-side read. Stock is the one exception: `MockInventoryStore` is shared, so admin stock changes ARE seen by the shop.
- Never bind an `NgOptimizedImage`'s `priority` (or any "first render only" hint) to a live array index in a list that can grow without a full replace (e.g. "load more"/infinite scroll). Angular throws if `priority` changes after that image has already been measured. Decide the priority set once, when the list is freshly loaded, and keep it fixed while appending.
- When two independent feature libraries (`type:feature`) need to coordinate UI (e.g. stacking fixed bars so they don't overlap) they cannot import each other — the module boundaries forbid `type:feature` depending on `type:feature`. Put a small shared signal-based service in `shared/core` instead (see `BottomBarService`).
- Zoneless tests: drive test hosts with signals and `await fixture.whenStable()`.

## Skills index
_None yet. Format: `name`: what it automates (path)._
