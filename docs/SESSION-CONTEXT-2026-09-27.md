# Session Context Snapshot (2026-09-27)

Saved when the first long session was compacted (right after BRD 09, commit `8007702`) and **kept up to date after every BRD** (rule in `CLAUDE.md`; it is committed together with each BRD). Read this to recover the full background at any time.

**Last updated:** after BRD 11 (Inventory operations). See section 8 for what changed since the first snapshot.

Full raw transcript of the original session (every message and tool call):
`C:\Users\rathi\.claude\projects\C--shubhu-coding-claude-clock\77a953cb-5b5a-42e0-8e36-1214243d6d50.jsonl`

## 1. Goal and process rules

- Build a fully fledged eCommerce web app in `C:\shubhu\coding\claude\eCommerce`: Angular frontend, Node.js backend later, PostgreSQL + MongoDB (catalog) + Redis, RabbitMQ, Meilisearch, Razorpay (test mode), Docker, Kubernetes. It demonstrates system-design concepts. Solo project, no timeline.
- Frontend first on mock data. Steering docs (rules, architecture, design, security, memory) are followed on every task.
- Per-module BRDs are kept updated on every change. Skills are created only after review.
- **Commit after each BRD before moving to the next.**
- `PROJECT-LOG.md` (plain-English decisions, briefs, commands, problems, change history) is updated after every task.
- The user gave advance approval for all decisions and asked to proceed BRD by BRD without waiting.
- Decisions: general-purpose catalog (all categories); Meilisearch first; Razorpay; modular monolith first; K8s local first then cloud; B2B deferred; RabbitMQ in phase 1 and Kafka in phase 3; India, INR and GST.

## 2. Technical concepts

- Nx 23 workspace with path aliases `@ecom/...`. Tags type:app/feature/ui/data-access/util/models and scope:storefront/admin/shared are enforced by ESLint.
- Angular 22 zoneless, standalone components, signals, `rxResource`/`linkedSignal`. SSR on the storefront (`RenderMode.Server`). Tailwind 4 + CDK, Vitest (analog), Playwright (Edge locally, Chromium in CI), pnpm 9.15.9 pinned via `packageManager`, TypeScript 6.
- Mock-adapter architecture: abstract API classes in `libs/shared/data-access/src/lib`, mock implementations in `src/mock`, selected by `provideDataAccess({useMocks})`. Admin adapters come from `provideAdminDataAccess` (admin app only).
- Server-authoritative money: integers in paise. Pricing, tax, shipping and coupons live only in the mock "server" (`cart-engine.ts`).
- Mocks are stored under `ecom.mock.*` keys. Storefront (port 4200) and admin (port 4201) are different origins, so mock data is not shared in development.
- Security patterns: server-side permission checks in mock APIs (`MockAdminState.require`), audit logging (`record`), route guards as convenience only, `safeReturnUrl`, lockout after 5 failures, salted hash (fallback hash without Web Crypto), neutral enumeration-safe messages, nonce+hash CSP on the SSR server, `ALLOWED_HOSTS`, non-root containers, safe content renderer (`renderContent`) that escapes everything.
- DevOps: multi-stage Dockerfiles (storefront node:22-alpine non-root uid 1000 with read-only FS; admin nginx-unprivileged uid 101), docker-compose, Kustomize manifests (2 replicas, probes, HPA, PDB, ingress; render-checked only), GitHub Actions `ci.yml` (never run, no remote), 6 Playwright smoke tests passing.
- Testing pattern: `RouterTestingHarness` + `settle()` loops, axe-core checks (contrast and region rules disabled in jsdom), zoneless tests with signals.

## 3. Where things are

- Docs: `BR-eCommerce-Platform.md` (v1.0 with decisions log), `CLAUDE.md`, `PROJECT-LOG.md`, `steering/{README,rules,architecture,design,security,memory}.md`, `brds/01…25-*.md` + `brds/README.md` (index, status, order), `docs/RUNBOOK.md`, `docs/VERIFICATION-CHECKLIST.md`.
- Libraries: `libs/shared/{models,util,core,data-access,state,ui}`, `libs/storefront/{shell,catalog,checkout,account}`, `libs/admin/console`.
- Apps: `apps/storefront` (SSR, `server.ts` with `/healthz`, `/readyz`, security headers, CSP nonce, `/robots.txt`, `/sitemap.xml`, `ALLOWED_HOSTS`, graceful SIGTERM), `apps/admin`, `apps/storefront-e2e`.
- Tools and deploy: `tools/generate-mock-data/generate.mjs` (seeded: 252 products, 1,854 reviews, 68 brands, SVG images), `deploy/k8s/base/*`, `docker-compose.yml`, `.dockerignore`, `.github/workflows/ci.yml`.

BRD 09 (latest, commit `8007702`):
- `libs/shared/util`: `content-format.ts` (`renderContent`, `htmlToSource`), `seo-files.ts` (`buildRobotsTxt`, `buildSitemapXml`).
- `libs/shared/models`: `content.ts`.
- `libs/shared/data-access`: `content.api.ts` (ContentApi and AdminContentApi), `mock/content-store.ts`, `mock/mock-content.api.ts`, `mock/admin/mock-admin-content.api.ts`.
- Storefront: home page and footer read managed content; `static-page.ts` supports `?preview=1`; `redirect-or-not-found.ts` catch-all; `server.ts` serves robots and sitemap.
- Admin: `libs/admin/console/src/lib/content/*` (banners, sections, pages, links, redirects), permission `content:write`.

## 4. Errors met and how they were fixed

- npm install crash → pnpm. Nx template added an `api` app → empty workspace plus generators. `@nx/angular` rejected TS project references → path-alias tsconfig. TS6 `baseUrl` error → removed.
- Large Bash heredocs failed to parse silently → write files with the Write tool and run python from the scratchpad. Python non-raw `\b` became backspace (lint `no-control-regex`) → use `\s` or `chr(92)`.
- SSR: `resource.value()` throws in error state → guard with `hasValue()`. NG0600 signal write in computed → load state in the constructor. Route guard injected Router after await → inject before await. 400 from prod server → `ALLOWED_HOSTS`. CSP violations → per-request nonce, hash of static script, `inlineCritical:false`.
- Docker: pnpm version mismatch → `packageManager: pnpm@9.15.9`. Admin nginx crash → quoted regex with braces. Playwright config failed loading Nx native → plain config. Sign-in race before hydration → wait for a visible effect. `getByLabel('Email')` ambiguity → scope to `main`.
- Tests: `crypto.subtle` missing in jsdom → labelled fallback hash. Missing `MockContentStore` export → add to data-access index (anything a spec imports must be exported there).
- Mistake: `taskkill /F /IM node.exe` was too broad. Rule recorded in `steering/memory.md`: stop servers by port.

## 5. Status

- BRDs 01 to 09 built and committed one by one on mocks. BRDs 10 to 25 drafted.
- Latest run: `pnpm exec nx run-many -t lint test build` green for all 14 projects. Production server checked: robots.txt disallows private paths, sitemap has 380 URLs, `/` and `/pages/about` return 200, `/nope` returns 404.
- Known limitations: Kubernetes only render-checked, CI never run; contrast and Lighthouse not measured; admin and shop mock data separate in dev; stock not reduced on orders (BRD 11); mobile bottom-bar overlap, no mobile "load more", about 570 kB initial bundle (warning limit raised to 600 kB), a form submitted before hydration does a native submit (BRD 12).

## 6. Pending and next

- Next in `brds/README.md`: **BRD 11 Inventory operations** (recommended), then BRD 10 Notifications, then BRD 12 Hardening. Then user sign-off with `docs/VERIFICATION-CHECKLIST.md`, then backend BRDs 19 to 25 and phase 2/3 frontend BRDs 13 to 18.
- Inputs still owed by the user (placeholders in use): brand name, logo and palette; real legal page text; banner images; real domain; stock policy (reservation timeout, low-stock threshold); notification decisions; performance and browser targets.
- Setup items owed: GitHub remote (CI never run), Docker Desktop Kubernetes or kind, Razorpay test account (keep the secret private), MongoDB + Postgres decision, cloud provider, email provider.

## 7. User messages, in order (abridged)

1. Create a BR document for a full eCommerce app (Angular, Node.js, Postgres/MongoDB/GraphQL, caching, queues, rate limiting, search, Docker, K8s); review first, then proceed.
2. Decisions on open questions (see section 1), document approved, start with frontend on dummy data, create steering docs, patterns become skill files after review, per-module BRDs kept updated.
3. "confirmed", "approved", "yes".
4. Go ahead with BRD 04, pick the path you favour, commit after each BRD, advance approval for all decisions.
5. Create a living document of commands, decisions and work briefs in simple English, updated automatically (this is `PROJECT-LOG.md`).
6. Go BRD by BRD without waiting; explain how BRDs are made and which doc is followed.
7. Retry Docker verification.
8. Generate the remaining BRD files and list what the user should do to verify and finish phase 1.
9. Go ahead with BRD 9 with placeholders.
10. After BRD 9, compact the session; then: add the original context to a file (this file).

## 8. Updates since the first snapshot

### After BRD 11: Inventory operations (mock)

What was built (details in `brds/11-inventory-operations.md` change log):
- `libs/shared/models/src/lib/inventory.ts`: movement kinds, locations, settings, policy, rows, alerts, `STOCK_REASONS`, import report types. `Variant.backorder`, `StockStatus 'backorder'` and `CartLine.backorder` added.
- `libs/shared/data-access/src/mock/inventory-store.ts`: `MockInventoryStore` (root-provided, key `ecom.mock.inventory.v1`). Append-only ledger; reservations with expiry; two seeded locations (`loc-main` Main warehouse, `loc-blr` Bengaluru hub); thresholds, backorder, settings (15 min, threshold 5); one alert per variant until restocked. Methods: `apply(products, 'available' | 'onHand')`, `rows`, `reserve`, `sell` (idempotent per order), `release`, `expire`, `restore`, `receiveOpening`, `adjust`, `transfer`, `setPolicy`, `saveSettings`, `applyLevels`.
- Shop wiring: `mock-catalog.api.ts`, `mock-search.api.ts`, `mock-cart-state.ts` call `inventory.apply(...)`. `mock-order.api.ts` reserves (online) or sells (COD) before saving the order, sweeps expired reservations (`cancelExpiredOrders` in `mock-order-store.ts`), and releases or restores on cancel. `mock-payment.api.ts` sells on verified payment and releases on failure.
- Admin wiring: `MockAdminState.inventory`; `loadProducts` now returns `{ product (on-hand applied), baseline, ... }` and is exported; product form stock is read-only for existing variants (new variants record an opening receipt); admin order cancel restores units; dashboard low-stock uses per-variant thresholds. New `AdminInventoryApi` (`lib/inventory.api.ts`) and `mock/admin/mock-admin-inventory.api.ts` (CSV parse/export/import with formula defusing).
- Admin UI: `libs/admin/console/src/lib/inventory/{inventory-layout,stock-page,ledger-page,import-page,settings-page}.ts`; routes under `inventory` need permission `inventory:write` (added to the demo admin); nav item "Inventory".
- Shop UI: "Backorder" badge on product card, product page (with expected date) and cart line.
- Tests: `mock/inventory.spec.ts` (25 tests: store rules, CSV helpers, shop and admin flows), an admin inventory UI test in `admin-flow.spec.ts`, a backorder product-page test in `catalog-pages.spec.ts`; `admin.spec.ts` updated (product form no longer changes stock). All 14 projects lint, test and build green.

Errors met and fixed this round:
- COD test failed on the order-value limit (₹5,000) with quantity 3, so the test uses quantity 1.
- A Python patch wrote a real newline into a TypeScript string (`'sku,location,on_hand\n...'`); fixed with the Edit tool. Prefer the Edit or Write tools over Python for text containing backslashes.
- The in-app preview tool read a different project's `.claude/launch.json` ("clockwork"), so the admin was started with `pnpm start:admin` in the background and opened with `preview_start` using a URL; the server was stopped by port 4201 afterwards.

Decisions and rules added:
- `CLAUDE.md` "After every task" now includes: update `docs/SESSION-CONTEXT-*.md` and include it in that BRD's commit (user request).
- `steering/memory.md`: stock pattern (never write stock into a product; add a ledger movement).

Status now: BRDs 01 to 09 and 11 built; 10 and 12 remain in phase 1. Known limits added: shop and admin have separate stock in dev; a shopper's own cart shows held units as unavailable while an online order awaits payment; staff low-stock alerts are in-app only until BRD 10.

Next: BRD 10 (Notifications and preferences, marked "recommended next" in `brds/README.md`), then BRD 12 (Hardening), then the user's sign-off using `docs/VERIFICATION-CHECKLIST.md` (new items B15 and C10 cover inventory).

User messages since the first snapshot:
- "yeah. commit in next BRD and this session compact file will also be keep updating with the new context"

### After BRD 10: Notifications and preferences (mock)

What was built (details in `brds/10-notifications-preferences.md` change log):
- `libs/shared/models/src/lib/notification.ts`: `NotificationPreferences`, `AppNotification`, `AlertKind`/`AlertSubscription`, `MessageTemplate`/`MessageTemplateVersion`, `DeliveryLogEntry`/`DeliveryQuery`.
- `libs/shared/data-access/src/mock/notification-store.ts`: `MockNotificationStore` (root-provided, one key `ecom.mock.notifications.v1`) — bell entries, preferences, alert subscriptions, 9 seeded message templates (with version history), a seeded delivery log (2 sent, 1 failed). Key methods: `notify`/`markRead`/`markAllRead`, `preferences`/`savePreferences`/`unsubscribeToken`/`unsubscribe` (signed `userId:channel` token, a checksum stand-in for HMAC), `subscribe`/`removeAlert`/`checkAlerts` (fires back-in-stock once, price-drop repeatedly from a new baseline), `templates`/`saveTemplate` (rejects unknown `{{variables}}`)/`restoreVersion`, `deliver` (renders a template, mails via `MockMailbox`, logs delivery, pushes a bell entry when `userId` is given), `sendTest`, `retry`.
- Storefront APIs: `PreferenceApi`, `AlertApi`, `NotificationApi` (`lib/notification.api.ts`, mocks in `mock/mock-notification.api.ts`) — all need a signed-in session except `unsubscribe(token)`.
- Admin API: `AdminNotificationApi` (same file) / `mock/admin/mock-admin-notification.api.ts`, permission `notification:manage` (added to the demo admin); CSV-style helpers not needed here (reuses inventory's `parseCsv`/`csvCell` pattern only where relevant — actually not used by this BRD).
- Triggers wired in: `mock-order.api.ts` (placed/cancelled), `mock-payment.api.ts` (paid), `mock-admin.api.ts` `MockAdminOrderApi.advance()` (packed/shipped/delivered/cancelled) and `MockAdminProductApi.update()` (price cut → `checkAlerts` immediately, since admin edits are not visible to the shop's own catalog reads — see the limitation below), `mock-review.api.ts` `submit()` (review status). `mock-catalog.api.ts`'s shared `run()` calls `notifications.checkAlerts(stockedProducts)` on every catalog read (home/listing/product/search) — the "polling" this mock uses for back-in-stock.
- Shared state: `libs/shared/state/src/lib/notification.store.ts` — `NotificationStore` (signal-backed unread count + list); `AuthStore` calls `notifications.refresh(loggedIn)` after login/logout and on init, so the header badge updates without a reload.
- Shop UI: header bell (`libs/storefront/shell/src/lib/header/header.ts`, signed-in only) linking to `/notifications`; new pages `preferences-page.ts`, `notifications-page.ts`, `alerts-page.ts`, `unsubscribe-page.ts` under `libs/storefront/account`; routes `/account/preferences`, `/account/alerts`, `/notifications` (guarded) and `/unsubscribe` (public); "Notify me"/"Alert me on price drop" buttons on `product-page.ts`; new `bell`/`mail`/`trash` icons in `IconComponent`.
- Admin UI: `libs/admin/console/src/lib/notifications/{notifications-layout,templates-page,delivery-log-page}.ts`; routes under `notifications`, permission `notification:manage`; nav item "Notifications".
- Tests: `mock/notification.spec.ts` (15 tests: preferences, unsubscribe token, alert triggers including the admin-save price-drop path, the bell, review-status, admin templates/versioning/send-test/delivery-log/retry), storefront UI tests in `account-flow.spec.ts` (4 new) and `catalog-pages.spec.ts` (1 new), a header test in `shell.spec.ts`, and an admin UI test in `admin-flow.spec.ts`. All 14 projects lint, test and build green.

Errors met and fixed this round:
- `admin-state.ts` `require()` only returned `{id, name}`; `sendTest` needed the admin's email, so it now also returns `email`.
- A misplaced `const` split a class from its `@Injectable()` decorator ("Decorators are not valid here") — fixed by moving the constant above the decorator, not between it and the class.
- Two `transact()` callbacks in the notification store returned `void` where `AlertSubscription[]` was declared — fixed by returning the filtered list.
- Production build (`prod` template checking) flagged `resource.value()` as possibly `undefined` on the preferences page where dev mode didn't; fixed by narrowing with `@if (prefs(); as p)` instead of repeated `prefs()` calls, and using `toSignal(control.valueChanges)` instead of reading `.value` inside a `computed()` (a plain property read is not reactive, so the live preview would never update from typing).
- First test attempt at an inventory correction used a quantity larger than the location actually held ("Only 9 unit(s)... cannot go below zero"); fixed by reading the exact on-hand figure first.
- A price-drop test tried to trigger via an admin product edit, then read the shop's catalog to see it — but admin product edits are **not** visible to the shop's own catalog reads in this mock (a pre-existing, documented limitation: only the stock ledger is shared between admin and shop, not product records). Fixed the actual feature (not just the test): `MockAdminProductApi.update()` now calls `checkAlerts` itself right when a price drops, rather than relying on a later shop-side read that would never see the change.
- `reviews-flow.spec.ts` and one `catalog-pages.spec.ts` test timed out (5000ms) only when three projects' test suites ran concurrently (CPU contention) — confirmed flaky, not a regression, by re-running `storefront-catalog` alone (20/20 green).
- An alerts-page image-only `<a>` failed axe's "link-name" check; fixed like `cart-line.ts` does, by making the decorative image link `aria-hidden`/`tabindex="-1"` and letting the adjacent text link carry the accessible name.
- `NotificationsPageComponent` showed stale (empty) data because `NotificationStore` only refreshes on sign-in/out, not on new orders placed via direct API calls; fixed by calling `store.refresh(true)` when the notifications page opens.

Decisions:
- Order/security/payment messages are not a preference toggle — always on, shown as a disabled "Always on" row.
- Marketing defaults to off; alerts default to on. Answers BRD 10's open question ("marketing off by default") as proposed.
- No SMS/WhatsApp (out of scope, per BRD 10 answering its second open question by deferring).
- `steering/memory.md` gained two rules: notification sends must go through the store's `deliver()` (never `MockMailbox` directly), and the cross-app data gap (admin edits invisible to the shop) with the one exception (shared inventory ledger).

Status now: BRDs 01 to 11 built; only BRD 12 (Hardening) remains in phase 1. `docs/VERIFICATION-CHECKLIST.md` has new items B16 and C11 for notifications, and known-limit #10 about the bell not being a live push.

Next: BRD 12 (Frontend hardening and polish) — the user asked to do BRD 10 then BRD 12, so this is next, followed by the user's sign-off using `docs/VERIFICATION-CHECKLIST.md`.

User messages since the previous update:
- "okay go ahead with BRD 10 then BRD 12"

### After BRD 12: Frontend hardening and polish (phase 1 complete)

What was built (details in `brds/12-frontend-hardening.md` change log):
- **FH-01 (stacking bottom bars):** new `libs/shared/core/src/lib/bottom-bar.service.ts` (`BottomBarService`) lets independent feature libraries coordinate fixed UI without importing each other (module boundaries forbid `type:feature` → `type:feature`). Cookie banner (`ConsentService.needsDecision()`) now outranks the compare bar and the product page's mobile sticky "Add to cart" bar; on mobile the compare bar also yields to a page's own action bar via `[class.max-md:hidden]`. Also confirmed `CompareBarComponent` (rendered at `apps/storefront/src/app/app.ts` root) was real, working code, just untested — added `compare-bar.spec.ts`.
- **FH-02 (mobile load more):** `libs/storefront/catalog/src/lib/listing/listing-page.ts` — a real crawlable `<a routerLink queryParamsHandling="merge">` "Load more" link (mobile only, `lg:hidden`) appends the next page's items to an `accumulated` signal instead of replacing them; desktop keeps the numbered `<ui-pagination>`. Scroll position is preserved by recording `window.scrollY` on click and restoring it right after the Router's own `Scroll` event (which would otherwise jump to top). A query change (filters/sort/search) or the back button resets to a single page, the normal behaviour.
  - **Real bug found and fixed along the way:** `[priority]="i < 4"` on `ui-product-card` recomputed from a live array index; once a list can grow via append, Angular's `NgOptimizedImage` throws when `priority` changes on an already-rendered, already-measured image. Fixed by freezing the "above the fold" id set once per fresh page load (see `priorityIds`/`accumulated.priorityIds` in `listing-page.ts`) — caught by the new FH-02 test, not by inspection.
- **FH-05 (bundle):** measured, not assumed — 633.93 kB raw / ~163.05 kB real (gzip-estimated) transfer for the storefront initial bundle. Confirmed (grep on build output) admin-only mock adapters are not present (tree-shaken correctly). Raised `apps/storefront/project.json`'s budget from 600kb to 660kb with the reasoning recorded in the BRD rather than silently bumped; deeper code-splitting of the mock adapters was considered and explicitly not attempted (regression risk for a metric — raw bytes — that overstates real network cost).
- **FH-06 (safe before hydration):** verified, not rebuilt. `provideClientHydration(withEventReplay())` was already on (`apps/storefront/src/app/app.config.ts`, from BRD 08); grepped for any raw `addEventListener('submit', ...)` that would bypass it — none found, every form uses Angular's own `(submit)`/`(ngSubmit)`.
- **FH-07 (offline banner):** new `libs/shared/core/src/lib/network-status.service.ts` (`NetworkStatusService`, listens to `window` `online`/`offline`) and `libs/storefront/shell/src/lib/offline-banner/offline-banner.ts`, rendered above the header in `shell-layout.ts`. Tested.
- **FH-08 (focus management):** `shell-layout.ts` now focuses the new route's `<h1>` (falling back to the `#main` landmark, e.g. while a skeleton shows) after every `NavigationEnd`. New `docs/ACCESSIBILITY-CHECKLIST.md` — a human keyboard-and-screen-reader pass, explicit about what axe-core in the test suite already covers vs. what still needs a person and a real screen reader.
- **FH-09 (cross-browser):** `apps/storefront-e2e/playwright.config.mts` gained `firefox`, `webkit`, `mobile-chrome` (Pixel 5), `mobile-safari` (iPhone 14) and `tablet` (iPad gen 7) projects; local `retries` raised from 0 to 1 (six projects sharing two dev servers is genuinely contention-prone). **Actually ran** the full suite twice: Chromium, WebKit and all three viewport profiles are green — 28 passed outright plus 2 "flaky" (failed once under the six-project load, passed alone and on retry: confirmed not a regression by running that one test in isolation, 4.9s). **Firefox could not be verified**: `browserType.launch: spawn UNKNOWN`, reproduced twice in isolation — a process-spawn restriction specific to this sandboxed dev environment, not an app bug. The project is configured for CI/a normal machine; documented as an honest environment limitation.
- **FH-10 (visual regression) and FH-04 (Lighthouse in CI): not built, on purpose.** FH-10 answers BRD 12's own open question ("is this worth the maintenance for you now?") by leaving it for the user to decide. FH-04 needs a CI pipeline that does not exist yet (no GitHub remote — unchanged BRD 08 limitation); building an unrunnable Lighthouse step would be unverifiable busywork.
- **FH-03 (contrast in the browser suite):** still not automated, for the same reason recorded since BRD 01 — jsdom cannot compute colour. Covered instead by the new accessibility checklist's human pass.
- **FH-11 (cleanup):** zero TODO/FIXME without an owner (checked), zero lint warnings across all 14 projects (checked). `steering/memory.md` gained the FH-02 lesson (never bind an image's `priority`/similar "first render only" hint to a live array index once a list can be appended to) and the FH-01 pattern (a small `shared/core` coordinator service when feature libraries can't import each other).
- Playwright's Firefox, WebKit and Chromium browser binaries were downloaded this session (`npx playwright install`) — needed again on a fresh machine/container.

Status now: **Phase 1 (BRDs 01–12) is complete.** `brds/README.md` marks 12 Built; the "recommended order" section is done and now points at the sign-off gate. `docs/VERIFICATION-CHECKLIST.md` updated (phase-1-complete framing, new section D checks for the bottom-bar stack/load-more/offline banner, known-limits 11–12 for the consciously-deferred items and the Firefox environment note) and closes with an explicit ask for the user's sign-off. `docs/ACCESSIBILITY-CHECKLIST.md` is new.

Next: **awaiting the user's phase-1 sign-off** via `docs/VERIFICATION-CHECKLIST.md`. After that (per `brds/README.md`'s existing plan, unchanged): backend track BRDs 19, 20, 21 in order, then 22/23, 24, 25; phase 2/3 frontend BRDs 13–18 can run in parallel with the backend track once phase 1 is signed off.

User messages since the previous update:
- (same instruction carried over) "okay go ahead with BRD 10 then BRD 12" — both now done.

### After the F1–F4 checklist follow-up: Kubernetes verified for real, and a BRD 12 claim corrected

Trigger: the user replied with F1–F4 from `docs/VERIFICATION-CHECKLIST.md` marked "DONE" (GitHub remote created, Docker Desktop Kubernetes turned on, Razorpay test account created, MongoDB+PostgreSQL confirmed).

What happened:
- **F1 (GitHub remote):** already configured (`origin` → `https://github.com/shubhamrathi020/eCommerce.git`), reachable, and already has history through BRD 11 pushed (from before this correction, outside this session's visibility). Two commits (BRD 10 `7ae9944`, BRD 12 `31ebca1`) are local-only, not pushed. Did **not** push without asking — the user's own checklist wording said "I will push"; asked them directly instead.
- **F2 (Kubernetes): verified for real, not just rendered.** Docker Desktop Kubernetes was reachable (`kubectl cluster-info`, node Ready). Built `shop-storefront:local` and `shop-admin:local`, installed `ingress-nginx` (official cloud manifest), `kubectl apply -k deploy/k8s/base`: both Deployments reached 2/2 Ready, deleting a storefront pod triggered automatic replacement (PDB/rollout genuinely works), both Services and the Ingress routed real traffic. `shop.localtest.me` / `admin.localtest.me` couldn't be hit directly in a browser because port 80 on this machine is already owned by another local Apache instance (a real, documented finding, not a manifest bug) — verified instead via `kubectl port-forward svc/ingress-nginx-controller` + a `Host:` header, confirming `/healthz`, `/`, `/robots.txt` all correct through the real ingress. HPA objects are created correctly but read `cpu: <unknown>` because Docker Desktop has no metrics-server by default (documented, not a bug). Left the `shop` and `ingress-nginx` namespaces running in the user's cluster (their own machine, they turned it on for this); gave teardown commands in the reply.
- **F3 (Razorpay):** acknowledged, no code change (backend track hasn't started; BRD 21 is where the real key would be wired in, as an env var, never pasted into chat).
- **F4 (MongoDB + PostgreSQL):** already the firm, correctly-documented decision (`BR-eCommerce-Platform.md` decision log, `steering/architecture.md`) — confirmed, nothing to edit.
- **A wrong claim found and corrected.** While doing the K8s check, decided to empirically re-verify BRD 12's FH-06 claim ("forms are already safe before hydration, verified via `withEventReplay()`") instead of leaving it resting on a code grep. Wrote a throttled-CPU Playwright script (`chromium` launched directly via `@playwright/test`, CDP `Emulation.setCPUThrottlingRate: 12`) against the **production SSR build** (`docker compose`, port 4000) and clicked "Sign in" the instant the fields existed: it reproduced a genuine native page reload (`/account/login` → `/account/login?`, the signature of an un-intercepted native form GET). The earlier "verified" claim was wrong.
  - **Fixed for real:** new `libs/shared/core/src/lib/app-ready.service.ts` (`AppReadyService`) tracks `ApplicationRef.isStable`, defaulting to `false` — including in the very first server-rendered HTML, so it's a `disabled` attribute from byte one, not a client-side race. `libs/shared/ui/src/lib/button/button.ts` (`ButtonComponent`, used by nearly every button in the app) now disables itself while it's a native `type="submit"` button (checked via `ElementRef`, catching the implicit-default-type case too) and the app isn't ready yet; non-submit buttons are untouched (they were already inert pre-hydration, no native fallback risk). The one submit button not using `uiButton` (the header search box, `libs/storefront/shell/src/lib/search-box/search-box.ts`) got the same guard directly. A disabled submit button also blocks the same form's implicit Enter-key submission (browser behaviour), so both paths are covered.
  - **Bug found while building the fix:** the first version of `AppReadyService` did `const sub = obs.subscribe(v => { ...; sub.unsubscribe(); })` — `isStable` can emit synchronously during `subscribe()` itself, so `sub` was referenced before its `const` finished initializing, throwing on every single page load. Caught by the full regression suite (`storefront-shell` tests failed with "Cannot access 'sub' before initialization"), not by inspection. Fixed by simply never unsubscribing (a `BehaviorSubject` subscription for the app's lifetime is negligible overhead, and setting an already-`true` signal to `true` again is a no-op).
  - **Re-verified after the fix:** same empirical script → only one navigation now (no reload). A second script confirmed the button re-enables once the app stabilizes and a normally-timed sign-in completes normally (`final url: /account`, i.e. genuinely signed in) — no permanent lockout.
  - Full regression suite (all 14 projects, lint+test+build) run twice (once with the TDZ bug still present — caught it — and once after the fix) — both green on the second pass.

Files touched this round: `libs/shared/core/src/lib/app-ready.service.ts` (new), `libs/shared/core/src/index.ts`, `libs/shared/ui/src/lib/button/button.ts`, `libs/storefront/shell/src/lib/search-box/search-box.ts`, `deploy/k8s/base/*` (unchanged, just applied), `docs/RUNBOOK.md` (new troubleshooting rows), `brds/08-devops-foundation.md`, `brds/12-frontend-hardening.md` (correction entry), `brds/README.md`, `PROJECT-LOG.md`, `steering/memory.md`, `docs/VERIFICATION-CHECKLIST.md` (F-section marked done).

Status now: phase 1 (BRDs 01–12) still complete, and now BRD 08's Kubernetes piece is genuinely verified rather than render-checked, and BRD 12's FH-06 is genuinely fixed rather than wrongly assumed. Nothing new is queued; still awaiting the user's phase-1 sign-off, and now also awaiting their answer on whether to push the two pending commits.

User messages since the previous update:
- Pasted back checklist items F1–F4 marked "DONE": GitHub repo created, Docker Desktop Kubernetes turned on, Razorpay test account created, and confirmed "MongoDB plus PostgreSQL" for F4.

### After BRD 19: the backend track begins — a real NestJS + PostgreSQL identity API

Trigger: the user confirmed F1–F4 done (GitHub remote created and pushed by the user, Docker Desktop Kubernetes on, Razorpay test account created, MongoDB+PostgreSQL confirmed) — exactly BRD 19's prerequisites — then said "i pushed the commits, now tell me next step." BRD 19 (Backend foundation and identity API) was the clear next step and was built under the user's standing advance approval.

What was built:
- `apps/api`, a real NestJS server (Nx-generated, tagged `scope:api`, a new eslint boundary rule so it can only ever import `@ecom/shared/models`, never the Angular-only shared libs).
- Real PostgreSQL via Prisma 7 (the new driver-adapter model: connection config lives in `apps/api/prisma.config.ts`, not in the schema — `datasource.url` in `schema.prisma` is a hard error in Prisma 7 now). Migrations applied with `prisma migrate diff --script` + `prisma migrate deploy` (this shell is non-interactive, so `migrate dev` refuses to run).
- Auth: register/login/refresh/logout/me/verify-email/password-reset, Argon2id password hashing with a timing-safe dummy-hash comparison for unknown emails, 15-minute JWT access tokens, rotating refresh tokens stored only as SHA-256 hashes and grouped by a "family" — reusing an already-rotated token revokes the whole family (a stolen, copied cookie gets caught). Same lockout policy as the mock (5 attempts / 15 minutes).
- `permissionsFor()` and `passwordProblem()` relocated out of the mock-only frontend code into `@ecom/shared/models`, so the real backend and the mock frontend now read the exact same source of truth for permissions and password rules.
- Accounts and address-book endpoints, every query scoped by the signed-in user's own id (tested that one customer cannot reach another's address by guessing an id), account export/delete.
- Cross-cutting: a global error filter that always returns the existing `ApiError` shape, request-correlation IDs and structured JSON access logs, `/healthz` (no DB) vs `/readyz` (does `SELECT 1`), rate limiting (300/min global, 10/min on auth endpoints), Helmet, an explicit CORS allow-list with credentials, a custom `x-csrf` header required on cookie-authenticated endpoints, OpenAPI docs at `/docs`.
- Frontend wiring: a new `AppConfig.realAuth` flag (default `false`); when true, only `AuthApi`/`AddressBookApi` switch to real `Http*Api` adapters (a new `ApiClient` holding the access token in memory only, with one transparent refresh-and-retry on 401) — every other module keeps using mocks, bridged by a new `MockUserStore.mirrorSession()`.
- Docker: `apps/api/Dockerfile` (build/migrate/runtime stages) and new `postgres`/`redis`/`api-migrate`/`api` services in `docker-compose.yml`.
- Tests: 22 new integration tests in `apps/api` (Vitest + `supertest`, against a real `ecommerce_test` Postgres database) including a dedicated contract suite (`apps/api/test/contract.spec.ts`) that types response-key lists against the shared frontend models, so a field rename on one side that isn't mirrored on the other fails to compile.

Real end-to-end verification, not just automated tests: ran the storefront in a browser with `realAuth: true` against the live API, signed in as the demo customer, added a real address through the UI, and confirmed the row landed in the actual Postgres database with a direct `psql` query; confirmed via the API's own logs that the 401 → refresh → 200 sequence and the address `POST` both really happened. Also ran the full workspace (`lint`, `test`, `build`) across all 16 projects including `api` — green.

Errors hit and fixed along the way (recorded in `steering/memory.md` for next time): Prisma 7's `datasource.url` removal, `dotenv/config`'s cwd resolving to the workspace root instead of `apps/api` under `pnpm exec`, `migrate dev` refusing non-interactive shells, a missing `@prisma/client-runtime-utils` dependency under pnpm's strict `node_modules`, eslint scanning the generated Prisma client by mistake, and a missing `tslib` in the production Docker image (fixed with `"importHelpers": false`).

Files touched this round: the whole new `apps/api/**` tree; `libs/shared/models/src/lib/user.ts` (relocated `permissionsFor`); `libs/shared/data-access/src/mock/demo-accounts.ts` (re-exports it), `.../mock/mock-user-store.ts` (`mirrorSession`), `.../http/api-client.ts` and `.../http/http-auth.api.ts` (new), `.../lib/provide-data-access.ts` (`realAuth` wiring); `apps/storefront/src/app/app-config.values.ts`, `apps/storefront/src/app/app.config.ts`, `apps/storefront/src/server.ts` (CSP), `apps/admin/src/app/app.config.ts`; `docker-compose.yml`, `eslint.config.mjs`, `.gitignore`, `.dockerignore`, `package.json`/`pnpm-lock.yaml`; docs: `brds/19-backend-foundation.md`, `brds/README.md`, `PROJECT-LOG.md`, `steering/memory.md`, `docs/RUNBOOK.md`, `docs/VERIFICATION-CHECKLIST.md`.

Status now: BRD 19 built and verified for identity, accounts and addresses only. Catalog, cart, orders, search and admin data still run entirely on mocks (BRD 20, 21). No Kubernetes manifests for the API yet (left for BRD 25, recorded as a known gap, not silently skipped). Commits are local only, not pushed — per standing instruction, the user pushes.

User messages since the previous update:
- "i pushed the commits, now tell me next step" (after F1–F4 were confirmed done).
- (Usage-limit interruption and a model switch mid-session, both handled transparently — see the assistant's own running notes; no separate user decision was needed once told to continue.)
- "continue" / "Try again" (resuming after the interruptions above).

### After BRD 20: catalog and search on MongoDB + Meilisearch, wired into the frontend

Trigger: continuing "go ahead with remaining BRDs" — after BRD 20's backend-only commit (`47e8e60`, stopped early on a usage-limit warning), the user said "you can go ahead, and i have mongodb compass and tableplus so can do both SQL and NoSQL DB part using that" — confirming they have their own tools to inspect Postgres and Mongo directly, and to continue.

What was finished (on top of the `47e8e60` backend slice):
- **Frontend wiring**: `HttpCatalogApi`, `HttpCategoryApi`, `HttpSearchApi` (`libs/shared/data-access/src/http/http-catalog.api.ts`) and `HttpAdminProductApi` (`http-admin-catalog.api.ts`), all following the exact adapter pattern BRD 19 established. A new `AppConfig.realCatalog` flag (default `false`) swaps `CatalogApi`/`CategoryApi`/`SearchApi` (storefront) and `AdminProductApi` (admin) to the real backend; `ReviewApi` (the write side of reviews) deliberately stays mock, since `CatalogApi.reviews()` (the read side) is the part that went real.
- **12 new frontend adapter tests** (`HttpTestingController`): query-string encoding for listing/search (including JSON-encoded `filters`), the admin adapter's `{ count }` → `number` mapping, etc. — 135/135 `shared-data-access` tests pass.
- **Real end-to-end verification, live in a browser**, not just automated tests: started `docker compose`'s Postgres/Redis/Mongo/Meilisearch, `pnpm db:seed:catalog`, `pnpm start:api`, flipped `realCatalog: true` on the storefront, and drove the built-in browser through:
  - the home page (deals, featured, new arrivals, top rated, brands) — confirmed via the network log that every request hit `localhost:3333`, not the mock;
  - `/c/men-clothing` category listing — 6 real products, correct breadcrumb, out-of-stock item sorted last;
  - `/search?q=smartphon` — a deliberate typo, correctly matched 4 smartphones via Meilisearch's real typo tolerance (not the mock's hand-rolled edit-distance code);
  - a product page — variants, "frequently bought together", "related products" and the reviews tab, each confirmed as its own real API call in the network log.
  - Reverted `realCatalog` back to `false` and stopped the temporary dev servers afterward, per the flag's documented default.
- **A real bug found and fixed while building this, not left in**: `MeiliSearch` isn't the client class's actual export name in the installed `meilisearch` package (it's `Meilisearch`), and `client.waitForTask()` isn't a real method (it's `client.tasks.waitForTask()`) — both caught by the TypeScript build failing, not by a runtime surprise later. Also found and fixed a more subtle bug: writing `private readonly mongo = inject(MongoService)` (Angular's `inject()`) inside a **NestJS** service — `inject` isn't exported by `@nestjs/common` at all, and the resulting broken import silently cascaded into dozens of unrelated "implicitly any" TypeScript errors across the whole file rather than failing cleanly at the mistake itself. Fixed by using NestJS's actual pattern, constructor injection; recorded as a lesson in `steering/memory.md` since the failure mode (one wrong import causing a wall of unrelated-looking errors) is worth recognizing quickly next time.
- Two real test bugs caught and fixed by actually running the tests against the real backend (not just reasoning about them): the "duplicate SKU" admin test failed because `AdminCatalogService.create()` was checking SKU uniqueness against an empty list instead of every existing product's variants (a real product-level bug, not just a test bug — fixed in `admin-catalog.service.ts`); a price-range listing test asserted a price ceiling (₹100) below every actual product's price in that category, so it always returned zero results — fixed by checking the real fixture's price distribution first and picking a realistic bound.

Docs updated to reflect BRD 20 as built: `brds/20-catalog-search-services.md` (status + change log), `brds/README.md`, `PROJECT-LOG.md`, `steering/memory.md`, `docs/RUNBOOK.md`, `docs/VERIFICATION-CHECKLIST.md`.

Status now: BRD 19 and BRD 20 are both built and verified end to end. Cart, checkout, orders and payments (BRD 21) are the next and last piece needed before the shop can run entirely off mocks for nothing except phase-2/3 frontend features. Not pushed — the user pushes.

User messages since the previous update:
- "we're reaching the usage limit, please finish with stable change" (mid-turn interrupt; wrapped up the backend-only slice as commit `47e8e60` with an honest "what's done / what's deferred" summary).
- "you can go ahead, and i have mongodb compass and tableplus so can do both SQL and NoSQL DB part using that" (after switching back to `claude-sonnet-5`) — continue with the frontend wiring and finish BRD 20 properly.

### After BRD 21: cart, checkout, orders and payments — the shop runs end to end on the real backend

Trigger: "yes go ahead" — continuing straight from BRD 20's completion, per the standing "go ahead with remaining BRDs" instruction.

What was built:
- **Pricing engine relocated**: `priceCart`, `evaluateCoupon`, `shippingFee`, `codEligibility`, `deliverabilityProblem`, `ORDER_TRANSITIONS`, and `formatMoney`/`discountPercent` all moved out of the mock (and `@ecom/shared/util`) into `@ecom/shared/models`, the same "one source of truth on both sides" pattern used for `permissionsFor` (BRD 19) and the catalog rules (BRD 20). The mock and `@ecom/shared/util` now just re-export them, so nothing broke.
- **Server-side cart** (`apps/api/src/app/commerce/cart.service.ts`, Postgres): one row per owner (`user:<id>` or `guest:<token>`), a long-lived non-sensitive `gcid` cookie identifies a guest, merged into the account's cart automatically right after sign-in/register (`CartService.mergeGuestIntoUser`, wired into `AuthController`).
- **Orders and the state machine** (`order.service.ts`): idempotent placement (client-supplied key), guest/account ownership enforced on every read (a guest can never see or cancel another guest's order — this was a real gap I made sure not to repeat from the mock, which had no such check since it relied on physical browser-storage isolation that doesn't exist on a shared server).
- **Inventory** (`inventory.service.ts`): atomic per-line Mongo stock decrement, no separate reservation ledger (same simplification BRD 20 made for the catalog itself). Online-payment orders hold stock for a real 15-minute window; a lazy sweep (same pattern as the mock's `cancelExpiredOrders`) releases it if the window runs out.
- **Razorpay integration** (`razorpay.service.ts`): real SDK usage (order creation, refunds), real HMAC-SHA256 signature verification for both the checkout confirmation and the webhook endpoint, a startup check that refuses a live-mode key outright. No real Razorpay account exists in this environment, so the actual provider calls couldn't be exercised — cash on delivery was verified completely end to end instead, and the signature math itself was verified with real cryptographic assertions (computing the same HMAC the checkout widget would, with a fake test secret, and confirming the server accepts a correct one and rejects a tampered one).
- **Admin order management** (`admin-order.service.ts`/`admin-order.controller.ts`): list/get/advance/add-note against real orders, `order:refund` required to advance status (matches the mock's exact permission, not a guess), automatic Razorpay refund attempt on cancelling a paid order when keys are configured.
- **Frontend wiring**: `HttpCartApi`/`HttpCheckoutApi`/`HttpOrderApi`/`HttpPaymentApi` and `HttpAdminOrderApi`, behind a new `AppConfig.realCommerce` flag (default `false`). A new `ApiClient.optional()` call mode was needed (existing `.public()`/`.authed()` didn't fit): attaches the bearer token when signed in but never forces auth or retries on 401, since cart/checkout/order endpoints work for guests by design.

A real bug found and fixed by actually placing an order, not by reading the code: the first version of the atomic stock decrement used `{ 'variants.id': ..., 'variants.$.stock': { $gte: n } }` as a MongoDB *query* filter — but the positional `$` operator only has meaning inside the *update* document, not the query, so that filter matched zero documents every single time and every order placement failed with "some items are no longer available". Found within minutes by testing the actual flow with curl, fixed with `$elemMatch` in the filter (`{ variants: { $elemMatch: { id, stock: { $gte: n } } } }`) and the positional `$` kept only in the `$inc` update. Recorded in `steering/memory.md`.

Real end-to-end verification, live in a browser, not just automated tests: added a real product to a real cart (confirmed via the network log hitting `localhost:3333`), went through the full checkout flow (address form, real shipping options fetched from the API, cash on delivery), placed a real order, and independently confirmed both the order row in Postgres (`select * from orders`) and the stock decrement in MongoDB (45 → 44 on the exact variant), then cancelled the order through the UI and confirmed via the order-tracking page that its status and timeline updated to "Cancelled".

47 new automated tests this round: 13 backend integration tests (`commerce.spec.ts`, guest/guest ownership isolation, idempotency, payment-fail stock release and retry, admin state-machine enforcement), 4 Razorpay signature-verification unit tests (real HMAC math, no account needed), 8 frontend HTTP-adapter tests (cart/checkout/order/payment) plus 2 for the admin order adapter — 64/64 `api` tests, 143/143 `shared-data-access` tests, full workspace (15 projects) lint/test/build clean.

Docs updated: `brds/21-commerce-services.md` (status: Built), `brds/README.md`, `PROJECT-LOG.md`, `steering/memory.md`, `docs/RUNBOOK.md`, `docs/VERIFICATION-CHECKLIST.md`.

Status now: **BRDs 19, 20 and 21 are all built and verified.** The shop can run entirely on the real backend end to end (sign-in, catalog, search, cart, checkout, cash-on-delivery orders); only online payment needs the user's own Razorpay test keys to actually complete a transaction. The backend track's remaining pieces (BRD 22 caching/rate limiting, BRD 23 messaging, BRD 24 observability, BRD 25 Kubernetes/cloud) are all optimization/ops layers on top of a now-complete core, not new customer-facing capability. Not pushed — the user pushes.

User messages since the previous update:
- "yes go ahead" (after being asked whether to start BRD 21).

### After BRD 22: caching and rate limiting — Redis finally put to use

Trigger: "continue" — after BRD 21's completion, per the standing "go ahead with remaining BRDs" instruction.

What was built:
- **Redis wiring** (`redis.service.ts`): first real use of `REDIS_URL`, provisioned since BRD 19 but unused until now. `keyPrefix` (`ecom:` / `ecom:test:` under `NODE_ENV=test`) namespaces dev and test keys on the same Redis instance, the same pattern already used for the Meilisearch index suffix and the Mongo test database name.
- **Cache-aside catalog caching** (`cache.service.ts`, wired into `catalog.service.ts`): `CacheService.getOrSet(key, ttl, tags, factory)` caches `home`/`listing`/`product`/`categoryTree`, tagged for invalidation (a broad `catalog:listings` tag plus precise `product:<id>`/`variant:<id>` tags). Per-process request coalescing (an in-flight `Map`) prevents a stampede of concurrent misses on one instance — documented as not covering multiple instances, which would need a distributed lock.
- **HTTP caching** (`http-cache.interceptor.ts`): a `@HttpCacheControl(seconds)` decorator adds `Cache-Control`/`ETag` (SHA-256 of the body) to catalog responses and answers a matching `If-None-Match` with a real `304`.
- **Configurable per-route rate limiting** (`rate-limit.guard.ts`): a custom guard + `@RateLimitBucket(name)` decorator, not `@nestjs/throttler`'s `@Throttle()` — reading `@nestjs/throttler`'s own source showed `@Throttle()`'s arguments are evaluated at module-import time, before `loadConfig()` ever runs, so they can never read a runtime-configured limit. The custom guard reads `ApiConfig.rateLimits` per request via DI, uses a Redis `INCR`+`EXPIRE` fixed window, sets `Retry-After`, and fails open if Redis is unreachable. Applied to search-suggest, coupon-apply and checkout; limits configurable via `RATE_LIMIT_SEARCH_PER_MIN`/`RATE_LIMIT_COUPON_PER_MIN`/`RATE_LIMIT_CHECKOUT_PER_MIN`. Login's proposed "5 per 15 minutes per email" limit was already covered by BRD 19's `AuthService` lockout, so nothing new was added there.
- **Distributed coupon-redemption counter** (`coupon-redemption.service.ts`): a real Redis `INCR`/`DECR` cap-enforcing counter, wired into order placement (claim), cancellation and expiry-sweep (release). Demonstrated on one hardcoded coupon (`WELCOME10`, cap 500) as a working proof of the mechanism; extending it to more coupons or an admin-editable cap is a product decision for later. The "stock reservations" half of BRD 22's CR-05 needed nothing new — BRD 21's atomic `$elemMatch` Mongo decrement already covers it.
- **Cache/limiter stats** (`cache-stats.controller.ts`): `GET /admin/system/cache-stats` (new `system:read` permission) returns hit/miss/coalesced/rate-limit-blocked counts and a hit ratio — a lightweight endpoint rather than the full metrics dashboard BRD 22 proposed (deferred to BRD 24). Bot/CAPTCHA abuse hooks (CR-06) were not built.

A real gap found only by re-running the test suite, not by reading the code: two `commerce.spec.ts` assertions started failing with an off-by-N stock count once the product-page cache was added — the 120-second cache on `GET /catalog/products/:slug` was never being invalidated when `InventoryService.take`/`giveBack` changed stock during order placement/cancellation, because cache invalidation had only been wired into the admin catalog-write path, not the order/inventory path. Fixed by tagging `product()`'s cache entries per-variant (so `InventoryService`, which only ever holds a `variantId`, can invalidate precisely) and having `InventoryService` invalidate both that tag and the broad `catalog:listings` tag on every stock change. Recorded in `steering/memory.md` as a general lesson: a new cache over data more than one service writes needs every writer checked, not just the one you were touching.

Real end-to-end verification, live against the running dev server, not just automated tests: `GET /catalog/home` twice returned the same `ETag`, and repeating it with a matching `If-None-Match` returned a real `304`; hammering `GET /search/suggest` past its configured 60/minute limit returned `429` with a `Retry-After` header; signing in as the seeded admin and calling `GET /admin/system/cache-stats` returned live hit/miss/rate-limit-blocked numbers; and a full guest cart → apply `WELCOME10` → place order → cancel order cycle showed the Redis key `ecom:coupon:redemptions:WELCOME10` go `(nil) → 1 → 0`, confirming the claim/release logic works on a real order, not just in a unit test.

Automated tests: all 65 `api` tests green (including the two previously-failing stock-mismatch tests, now fixed), full workspace (15 projects) `lint`+`test`+`build` all green.

Docs updated: `brds/22-caching-rate-limiting.md` (status: Built), `brds/README.md`, `PROJECT-LOG.md`, `steering/memory.md`, `docs/RUNBOOK.md`, `docs/VERIFICATION-CHECKLIST.md`.

Status now: **BRDs 19 through 22 are all built and verified.** The shop runs end to end on the real backend, now with caching (faster repeat reads, tagged invalidation kept correct across both admin writes and order-time stock changes) and basic abuse protection (rate limits with `Retry-After`, a working distributed coupon cap). Remaining backend track: BRD 23 (messaging), BRD 24 (observability — where the full metrics dashboard this BRD deferred belongs), BRD 25 (Kubernetes/cloud/load tests). Not pushed — the user pushes.

User messages since the previous update:
- "continue" (after BRD 21's completion, triggering BRD 22).

### After BRD 23: messaging, jobs and notifications — RabbitMQ, an outbox, real emails, real-time order tracking

Trigger: "proceed with remaining BRDs" — the user's plan-wide go-ahead to keep working through 23, 24, 25 without stopping to ask BRD by BRD.

What was built:
- **RabbitMQ added to the stack** (`docker-compose.yml`, `RABBITMQ_URL`, `amqplib`): one topic exchange, a notifications queue bound to `order.*`/`payment.*`/`cart.*`, a retry queue (per-message `expiration` gives a real 2s/8s/20s backoff via RabbitMQ's own dead-letter-on-TTL-expiry — no delayed-message plugin needed) and a dead-letter queue, all declared once by `RabbitService`.
- **Transactional outbox** (`OutboxEvent` in Postgres, `OutboxService`, `OutboxRelayService`): every order/payment write that should notify someone (`OrderService.place/cancel/sweepExpired`, `PaymentService.confirm`, `AdminOrderService.advance`) inserts its event row in the *same* `$transaction` as the domain write, so the two can never disagree. A relay polls unpublished rows every 2 seconds under a Redis lock and publishes them, marking a row published only once the broker confirms it.
- **Notification consumer** (`NotificationConsumerService`): turns each event into a real email via the existing dev `MailService` — order confirmed/cancelled/expired, payment confirmed/refunded, cart abandoned. Retries a failure 3 times with backoff, then dead-letters it; dedupes by the outbox event's own id via a Redis `SETNX`, so an at-least-once redelivery never sends a second email.
- **Dead-letter inspect/replay**: `GET`/`POST /admin/system/dead-letters(/replay)` (new `system:read`/`system:write` permissions).
- **Active scheduled jobs** (`SchedulerService`): promoted BRD 21's lazy-only `sweepExpired` to also run every 30 seconds, and added a new abandoned-cart reminder every 5 minutes — both under a Redis lock released right after the job finishes, so exactly one instance does the work per tick across any number of replicas.
- **Real-time order tracking** (`GET /orders/:id/stream`, Server-Sent Events over Redis pub/sub): a status change reaches an open tracking tab immediately, no reload.

Two real bugs found only by running the actual test suite, not by reading the code:
1. The Redis locks for the relay and scheduler were only ever released by TTL expiry, not after the job finished — so a *single* instance's own next tick could be blocked by its own previous lock for up to 10 seconds. First noticed as a flaky test (passed the second time, failed the first, only in this one spec file) before the real cause was found: a previous test file's app had grabbed the lock near the end of its life and closed without releasing it, and the next spec file's fresh app inherited that still-unexpired lock in the same shared Redis. Fixed by releasing the lock in a `finally` right after the job's work completes; the TTL is now purely a crash-safety net.
2. `OrderStreamOwnershipGuard` had to become a real `CanActivate` guard rather than an `await` inside the `@Sse()` handler, because Nest's SSE machinery resolves the handler's returned Observable and starts committing a 200 response *before* subscribing to (and thereby actually running) it — an ownership error thrown from inside the handler became an in-stream `{type:'error'}` message, not an HTTP 404, until the check moved to a guard that runs first.

No real email provider account exists in this environment (same situation BRD 21 was in with Razorpay), so the "provider" behind all of this is still the dev `MailService`/`/dev/outbox` — the pipeline in front of it (outbox → RabbitMQ → consumer → retry/DLQ) is real and would keep working unchanged once a real provider is wired in. Kafka analytics streaming, an SMS/WhatsApp provider and the CAPTCHA integration point were out of scope for this BRD as planned, and remain unbuilt.

Real end-to-end verification, live against the running dev server, not just automated tests: placing a real cash-on-delivery order produced a real "Order confirmed: ORD-..." email in `/dev/outbox` within about a second; opening the SSE stream for that order and cancelling it from a second terminal pushed a live `cancelled` update into the still-open first terminal with no reload; the checkout rate limit (BRD 22) still returned `429` under load; `/admin/system/cache-stats` and `/admin/system/dead-letters` both returned live data against the real server.

Automated tests: 71/71 `api` tests green (7 new in `messaging.spec.ts`: real order-confirmation/cancellation emails through the whole pipeline, redelivery de-duplication, dead-letter inspect/replay, the abandoned-cart reminder, SSE ownership), full workspace (15 projects) lint/test/build all green.

Docs updated: `brds/23-messaging-notifications-backend.md` (status: Built), `brds/README.md`, `PROJECT-LOG.md`, `steering/memory.md`, `docs/RUNBOOK.md`, `docs/VERIFICATION-CHECKLIST.md`.

Status now: **BRDs 19 through 23 are all built and verified.** The shop runs end to end on the real backend with caching, rate limiting and now real messaging: customers get real order/payment emails, an abandoned cart gets one reminder, and an open order-tracking tab updates live. Remaining backend track: BRD 24 (observability — the full metrics dashboard BRD 22/23 both deferred belongs here), BRD 25 (Kubernetes/cloud/load tests). Not pushed — the user pushes.

User messages since the previous update:
- "proceed with remaining BRDs" (triggering BRD 23, and signalling to keep going through 24/25 without asking each time).

### After BRD 24: observability and reliability — circuit breakers, Prometheus/Grafana, alerts, centralised logs, a real restore drill

Trigger: continuing the same "proceed with remaining BRDs" go-ahead, straight from BRD 23's completion.

What was built (in the order it was built, since each piece stood on the previous one):
- **OB-05, resilience, built first** because it's the most directly testable: `apps/api/src/app/resilience/circuit-breaker.ts` is a real, hand-rolled circuit breaker (timeout, a couple of quick retries for a blip, then open after 3 consecutive failures for a cooldown, then a single half-open probe) wrapping every Razorpay and Meilisearch call. Every failure — one call or the breaker already open — surfaces as the same friendly, non-fatal error, never the raw SDK/fetch exception (that redesign happened mid-BRD, after a test written to prove the "friendly error" claim caught that only the breaker-open path actually got one). Cash on delivery and plain catalog browsing are completely unaffected by either provider being down.
- **OB-01, metrics**: a real `prom-client`-backed `/metrics` endpoint — HTTP RED metrics labelled by matched route *pattern* (bounded cardinality, not the raw URL), plus gauges pulled at scrape time from the cache/breaker/outbox state BRD 22/23/24 already track internally. Prometheus, Grafana (pre-provisioned datasource and a real 8-panel dashboard) and Alertmanager added to `docker-compose.yml`.
- **OB-04, alerts**: 5 real Prometheus alert rules routed through Alertmanager to a webhook receiver that logs every alert (`alert-log`) — no real Slack/email account exists in this environment (same posture as Razorpay/the email provider), so this is a real, working, honestly-labelled stand-in.
- **OB-02, logs**: Loki + Promtail, shipping every docker-compose container's own stdout into Loki, searchable in Grafana by the same request-id/service labels the API's structured logs already carry.
- **OB-06, backups**: real `pg_dump`/`mongodump` scripts and a real, timed restore drill that restores into a disposable database and checks row counts against the source, not just the exit code.

The single best moment of this BRD: actually stopping the real Meilisearch container and watching the *entire* chain react for real, live, in order — the breaker opened on the live server (`consecutiveFailures: 3`), Prometheus scraped that as `circuit_breaker_state{dependency="meilisearch"} 2`, the `CircuitBreakerOpen` alert rule went `inactive → pending → firing`, Alertmanager marked it active, and `alert-log`'s own output showed `[alert] FIRING CircuitBreakerOpen: A circuit breaker is open: meilisearch` — and that same line, separately, was searchable in Loki by service label within seconds. Restarting Meilisearch closed the breaker on its own on the next request, no restart or manual step needed. Separately, a real backup-then-restore-drill cycle against the live local Postgres restored into a disposable database in 1.9 seconds total (well inside the BRD's 60-minute RTO target) with row counts verified equal to the live database's, not just "the command exited 0".

Two real things fixed along the way, both caught by tests, not by review: (1) the very first version only wrapped `CircuitOpenError` into a friendly message, leaving a single non-breaker-open failure to leak the raw exception as an opaque 500 — a test written specifically to check "does every failure path get the friendly message" caught this, and every failure now does; (2) prom-client's per-gauge `collect()` callback needed to reference the gauge it belongs to from inside its own constructor call, which looks circular but isn't (the callback runs later, well after construction finishes) — TypeScript/ESLint fought this pattern (`let x!: T; x = new Gauge(...)` vs `prefer-const`) before landing on a plain `const` self-reference, which is both correct and lint-clean.

Explicitly deferred, not silently dropped: OB-03 (OpenTelemetry/Jaeger distributed tracing) — a large, driver-compatibility-risky lift for a single-process monolith that already has structured, request-id-correlated logs, which is what OB-02's own acceptance criterion actually needs. OB-07 (frontend error/performance reporting with consent) — a distinct frontend feature not attempted this pass. Both are named as real decisions in BRD 24's own change log, not gaps discovered later.

Automated tests: 84/84 `api` tests (10 new — 8 unit tests for the circuit breaker itself, plus a live-network-failure integration test against a genuinely unreachable Meilisearch port, plus a new `metrics.spec.ts`). Full workspace lint/test/build green for every project this BRD touched (`apps/api` and root-level config). Two pre-existing, unrelated frontend test timeouts were found in `libs/storefront/catalog` during a full `nx run-many` — confirmed via isolated reruns (with every Docker container, including this BRD's new ones, stopped) to be pre-existing environmental flakiness in that untouched library, not a regression from this BRD's 100%-backend changes; recorded in `steering/memory.md` rather than chased further.

Docs updated: `brds/24-observability-reliability.md` (status: Built), `brds/README.md`, `PROJECT-LOG.md`, `steering/memory.md`, `docs/RUNBOOK.md`, `docs/VERIFICATION-CHECKLIST.md`.

Status now: **BRDs 19 through 24 are all built and verified.** The shop runs end to end on the real backend with caching, messaging and now real observability: every number on the Grafana dashboard, every alert, and the restore drill's timing came from an actual, induced failure and an actual recovery, not seeded data. Remaining backend track: BRD 25 (Kubernetes, cloud, load testing). Not pushed — the user pushes.

User messages since the previous update: none new — this BRD continued under the same "proceed with remaining BRDs" go-ahead as BRD 23.

### After BRD 25: Kubernetes, load testing and what could not be done without a cloud account

Trigger: "proceed with remaining BRDs", then "finish inprogress BRD and stop" (the BRD was interrupted by a usage limit and finished after the user asked what was left).

Built and verified locally: the full stack on the Docker Desktop cluster (frontends, API, Postgres, Mongo, Redis, RabbitMQ, Meilisearch), ingress, secrets from gitignored files, enforced NetworkPolicies, HPA (API grew 2 to 7 pods), disruption budgets, and a replica-ratio canary with an automatic-abort script. k6 load tests: browse p95 7.8 ms, search 53 ms, checkout 88 ms (223 orders, no 5xx, no outbox backlog), and the flash-sale last-unit race - 80 buyers for 20 units ended at stock exactly 0 with exactly 20 orders, twice.

Bugs only the Kubernetes run could find: an es2021 build target that broke every Prisma query in the production image (never in `nx serve`) - fixed by targeting es2022; Postgres cannot run under the `restricted` Pod Security level, so it lives alone in `shop-data` at `baseline`; RabbitMQ's exec probe needs a longer timeout; the migrate Job needed `COREPACK_HOME`; the catalog-seed Job needed a NetworkPolicy rule (which also proved Docker Desktop enforces them); stale `:local` image tags. Also made the global per-IP rate limit configurable, because it was the first thing every test hit.

Written but never run: `deploy/terraform/aws`, `.github/workflows/deploy.yml` (no cloud account; `terraform` not installed). The CI image job now also builds and Trivy-scans the API image. The 10,000-user / 1,000-orders-per-minute targets were not tested. Details and honest caveats: `docs/CAPACITY-PLAN.md`.

Status: **BRDs 19-25 are built**; the backend track is complete apart from what needs a cloud account. Remaining overall: frontend phases 2-3 (BRDs 13-18, still drafts), your phase 1 sign-off, the deferred items listed in the BRD 22-24 change logs, and real credentials (email provider, Razorpay, alert channel, cloud). Nothing is pushed - the user pushes.

### After BRD 13: returns, refunds and support (frontend, mock-backed)

Trigger: "start with Frontend BRDs 13-18 and complete those". BRD 13 is the first of six.

Built: models (`libs/shared/models/src/lib/returns.ts`, including the pure `computeRefund` and `attachmentProblem` the real backend can reuse), abstract `ReturnApi`/`SupportApi`/`AdminReturnApi`/`AdminSupportApi` (`libs/shared/data-access/src/lib/returns.api.ts`), a device-local `MockReturnStore` (key `ecom.mock.returns.v1`), mocks for all four, five new notification templates, new permissions (`return:write:own`, `support:write:own`, `return:manage`, `support:manage`). Storefront: `/account/returns`, `/account/returns/new?order=`, `/account/returns/:id`, `/account/support`, `/account/support/new`, `/account/support/:id`, plus "Return items", "Get help" and refund status on the order page. Admin: `/returns/queue`, `/returns/queue/:id`, `/returns/refunds`, `/returns/policy`, `/support`, `/support/:id`.

How to try it by hand: sign in as the demo customer, place a cash-on-delivery order, wait about 6 minutes for the mock to mark it delivered, then open it and choose "Return items". Sign in to the admin as the demo admin to work the queue.

Decisions taken by default (see the BRD's section 8): refunds only, 7-day window, ₹49 fee when the customer changes their mind, store credit for COD. Limitations: store credit cannot be spent yet; attachments are metadata only (no bytes are stored); returns read orders from the device-local order store, so with `realCommerce` on they cannot see backend orders; staff-set permissions are in the browser session, so a session saved before this change must sign out and in to pick up the new permission names.

### After BRD 14: promotions engine and deals (frontend, mock-backed)

Built: `libs/shared/models/src/lib/promotions.ts` (pure engine: `evaluatePromotions`, `ineligibleReason`, gift-card helpers), `priceCart(stored, products, now, extras)` now takes optional promotions/context/wallet and returns a `trace`; `CartTotals` gained optional `promotionDiscount`, `giftCardApplied`, `creditApplied`; `Order` gained `promotions` and `tender`. Mock side: `MockPromotionStore` (key `ecom.mock.promotions.v1`; seeded demo promotions whose dates roll forward), `PromotionApi`/`WalletApi`/`AdminPromotionApi`/`AdminGiftCardApi`. Flash-deal units sold are counted from live orders, so cancelling an order puts them back. Wallet: a gift card or store credit is spent when the order is placed and returned when it is cancelled or its payment window expires (`cancelExpiredOrders` takes an `onCancel` hook); a wallet-covered order is confirmed and paid at once. Storefront: offer lines in the cart/summary/invoice, a gift card and store credit panel in the cart, a deal banner on product pages and a deals strip on the home page. Admin: Promotions (list, editor, simulator, gift cards, price health), permission `promotion:manage`.

Try it: add the "Casa Moda Pro Cotton Slim Shirt" to the cart as a guest and see "Fashion fest" and "Welcome offer" as separate lines; apply the demo gift card `GIFT500`; add two of the signature tee (p-0001) and apply `FLAT100` to see the exclusive flash deal beat the coupon and explain why; in the admin, run the same cart through the Simulator.

Limitations: with `realCommerce` on, none of this applies (the real cart has no promotion engine yet); the 5-second per-test timeout was raised to 30 seconds in the heavy UI specs because they load the whole catalog and run axe on a busy machine.

### After BRD 15: recommendations and personalisation (frontend, mock-backed)

Built: `libs/shared/models/src/lib/recommendations.ts` (pure rules: `activityByProduct`, `coPurchases`, `similarity`, `interestProfile`, `applyRules`), `PersonalisationService` and the `EVENT_SINK` token in `@ecom/shared/core` (`AnalyticsService.track` now records a `SinkEvent` with an anonymous visitor id, only with consent and not while opted out), `MockEventStore` with deterministic demo events (`seedEvents`), `RecommendationApi`/`AdminRecommendationApi` and their mocks (`RecommendationEngine` builds all rows), `MockRecConfigStore` (key `ecom.mock.rec-config.v1`, events key `ecom.mock.events.v1`). Events are emitted for product views (product page), add-to-cart (`CartStore`), `checkout_start`/`payment_start`/`purchase` (checkout), and the existing search events. Storefront: `app-reco-row`, `app-product-recos`, `app-home-recos` (deferred) and `/personalisation`. Admin: `/recommendations`, permission `recommendation:manage`. BRD 16 (analytics) reads the same event stream, including the search, funnel and `utm_source` events the seeds already contain.

Try it: accept analytics in the cookie banner, browse a few products in one category, and reload the home page to see "Recommended for you" replace "Popular right now"; open `/personalisation` to opt out or clear your history; in the admin pin a product and press Preview.

Limitations: the visitor id is per browser, so there is no cross-device personalisation; the real backend has no event store yet.

### After BRD 16: analytics and reporting (frontend, mock-backed)

Built: `libs/shared/models/src/lib/analytics.ts` (pure: `funnel`, `productPerformance`, `searchReport`, `campaignReport`, `cohortTable`, `toCsv`), `AttributionService` in core (reads `utm_*` on navigation, first/last touch, 30-day window, consent- and opt-out-gated; the shell captures it and `AnalyticsService` stamps `first_touch`/`last_touch` on `checkout_start`, `payment_start` and `purchase` events), `AdminAnalyticsApi` and `MockAdminAnalyticsApi` (reports cached per period and data version; schedules in `ecom.mock.report-schedules.v1`; `runDue()` delivers due reports to `MockMailbox`). The listing page now records `search_result_click`. Admin: `/analytics/{funnel,products,search,campaigns,cohorts,reports}` with a shared period selector (`?days=7|30|90`), permission `analytics:read`. Purchase events now carry `unitPrice` for revenue.

Try it: open Admin > Analytics; change the period; sort the product table; export CSV; open Search and follow a zero-result link; under Scheduled reports add one for yourself, press Send now, then open the demo mailbox (`/dev/mailbox` in the shop). To see your own numbers appear, accept analytics in the shop, visit `/?utm_source=google&utm_medium=cpc&utm_campaign=test`, buy something, and look at Campaigns.

Limitations: events live in this browser plus deterministic demo data, so the numbers are demo-grade, not a store's real figures; revenue is item revenue before discounts.

### After BRD 17: marketplace and seller portal (frontend, mock-backed)

Built: a **new app** `apps/seller` (Seller Centre, port 4202, `pnpm start:seller`) and library `libs/seller/portal` (tag `scope:seller`, with a matching lint boundary), copied from the admin app's shape. Pure rules in `libs/shared/models/src/lib/marketplace.ts`; `MockSellerStore` (key `ecom.mock.sellers.v1`) which also registers a **catalog extension** (`registerCatalogExtension` in `catalog-data.ts`) so approved seller listings and demo ownership reach every `loadCatalogData()` caller; `PayoutCalculator`; `SellerPublicApi`, `SellerPortalApi`, `AdminSellerApi` and mocks. `Role` gained `seller`; `Order` gained optional `shipments`; `MockOrderApi` creates shipments at placement and shows orders through `applyShipments`. Demo data: sellers Urban Threads (`seller@shop.test`, owns catalog items p-0010 to p-0013 and two own listings), Acme Home & Kitchen (p-0100 to p-0103, 8% override) and an applicant, Fresh Bazaar, waiting for approval. Demo accounts missing from an existing browser's saved users are now added on start.

Try it: place a cash-on-delivery order containing p-0010 (Urban Threads) and p-0100 (Acme) and the signature tee; on the order page see three shipments. Sign in at the seller app as `seller@shop.test`, open Orders, pack, ship (with a tracking number) and deliver; in the admin open Marketplace > Payouts, preview and issue a statement for Urban Threads, then mark it paid with a reference. Apply as a new seller in the seller app and approve yourself in the admin.

Limitations: nothing of this exists in the real backend; `realCommerce` ignores it; the seller app is not in docker-compose, Kubernetes manifests or CI.

### After BRD 18: localisation, dark mode and installable app (frontend)

Built: `libs/shared/core/src/lib/i18n/` (`message-format.ts`, `messages.en.ts`, `messages.hi.ts`, `i18n.service.ts`, `translate.pipe.ts` named `t`, `locale-date.pipe.ts` named `date`), `theme.service.ts`, `pwa.ts` (`provideShopServiceWorker`, production only), `push-optin.service.ts`, `network-status.service.ts` (now also reads the saved-copy marker). `MoneyPipe` and `formatMoney` are locale-aware with cached `Intl` formatters. Shared UI has `ui-theme-toggle` and `ui-language-picker`; `theme.css` has dark tokens (`data-theme` plus `prefers-color-scheme`). Storefront public files: `sw.js`, `manifest.webmanifest`, `offline.html`, `theme-init.js` (copied to admin and seller), `icons/`. `apps/storefront/src/server.ts` serves `sw.js` with `Cache-Control: no-cache`.

Rules to remember: add strings to `messages.en.ts` first (the Hindi file is typed against it, so a missing key fails the build); use `t`, `date` and `money` pipes, never `DatePipe`; use logical Tailwind classes (`ms-`, `ps-`, `text-start`, `start-0`) not `ml-`, `pl-`, `text-left`, `left-0`; use `text-on-status` on coloured backgrounds, not `text-white`. The service worker keeps a never-save list (cart, checkout, orders, account, notifications, wishlist, payment, personalisation, unsubscribe and `/api/`); change it only with a test in `pwa.spec.ts`.

Try it: in the footer pick Hindi, then Light/Dark; after `pnpm exec nx build storefront` with the server started on port 4000 (`node dist/apps/storefront/server/server.mjs`) run `node scripts/pwa-check.mjs`. In development the service worker is off.

Limitations: see the BRD change log (translated surfaces only, unreviewed Hindi, English flash before Hindi, mock push).

### Repository split (frontend / backend / contracts)

Three sibling folders under `claude/`: `eCommerce` (frontend, keeps the full history), `eCommerce-api` (NestJS API, Prisma, `deploy/`, `scripts/backup|restore-drill|seed-flash-sale`, `docs/RUNBOOK.md`, `CANARY-RELEASE.md`, `CAPACITY-PLAN.md`, its own CI and deploy workflow; fresh git history) and `eCommerce-contracts` (`@ecom/contracts`: everything that used to be `libs/shared/models`, built to ES modules and CommonJS).

Dependency: both repositories use `"@ecom/contracts": "link:../eCommerce-contracts"`. Consequences: build the contracts package first (`pnpm install && pnpm build` there); Docker builds receive it as a named build context `contracts_src` (compose does this); CI cannot install a `link:` path, so before pushing for CI, publish the contracts repository and run `pnpm add github:<account>/eCommerce-contracts#v0.1.0` in both repositories, then delete the `contracts` stage in the Dockerfiles. The CI files were rewritten for that final state and have not been run.

Where things are now: requirements (`brds/`, `BR-eCommerce-Platform.md`), `PROJECT-LOG.md`, `steering/` and these session notes stay in the frontend repository for the whole project. The mock data generator (`tools/generate-mock-data`) stays in the frontend; the API has its own copy of the resulting JSON in `apps/api/seed-data`. Any old reference below to `apps/api`, `deploy/` or `libs/shared/models` means the corresponding place in the other repositories.
