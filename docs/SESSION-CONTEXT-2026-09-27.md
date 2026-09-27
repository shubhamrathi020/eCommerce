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
