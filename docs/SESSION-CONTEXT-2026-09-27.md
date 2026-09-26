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
