# Project Log

A plain-English diary of what is being built, why, and which commands were used. It is updated at the end of every task (this is a standing rule in `CLAUDE.md`). Newest entries are added at the bottom of each section.

**How to read it:** "Decision" = a choice that shapes the project. "Brief" = what was done and why. "Commands" = the terminal commands worth knowing, each with a one-line meaning.

---

## 1. Key decisions (and why)

| Date | Decision | Plain-English reason |
|---|---|---|
| 2026-09-26 | Build an all-category store (fashion, electronics, grocery...) | One catalog model with per-category attributes instead of a niche-specific design |
| 2026-09-26 | Modular monolith first, split into services later | Simpler to build and debug alone; boundaries are kept clean so services can be extracted |
| 2026-09-26 | Frontend first on mock data, backend later | Lets us see and refine the product early; mocks sit behind interfaces so swapping to the real backend is a config change |
| 2026-09-26 | Search: Meilisearch first. Payments: Razorpay. Queue: RabbitMQ. DBs: PostgreSQL + MongoDB + Redis | Lightweight, India-friendly, and covers the system-design topics we want to practise |
| 2026-09-26 | Kubernetes locally first, cloud later; B2B later | Keep cost and scope down |
| 2026-09-26 | One BRD (requirements doc) per module; commit after each BRD | Small, reviewable steps; docs stay in sync with code |
| 2026-09-27 | Angular 22 + Nx + pnpm + Tailwind + Vitest | pnpm because `npm install` crashed on this machine; Nx to keep apps and libraries organised |
| 2026-09-27 | Money is always stored as whole paise (integers) | Avoids rounding errors; formatting happens only when displaying |
| 2026-09-27 | The client never calculates prices, tax, shipping or discounts | Those come from the API (mock now, server later), so they cannot be tampered with |
| 2026-09-27 | User gave advance approval for future decisions | I choose sensible defaults and record them here |
| 2026-09-27 | Cart state in its own shared library; catalog talks to it through a token | Feature libraries may not import each other; this keeps them independent |
| 2026-09-27 | Admin app on its own port with its own seeded demo data; permissions checked on every API call | Different browser address means separate storage; real backend will unify |
| 2026-09-27 | Mock emails go to a local mailbox page instead of being sent | Lets every email flow be tested without a mail server |
| 2026-09-27 | Access checks in the browser (route guards) are only for convenience; the real backend must enforce access | Anything in the browser can be bypassed |
| 2026-09-27 | Search results still come from the catalog listing call (with a query); the real search server will replace only the data source | Pages stay the same when Meilisearch arrives |
| 2026-09-27 | Payment window is behind an interface; mock now, real Razorpay later | Checkout page stays unchanged when the real one is added |

## 2. Work briefs (what was done)

### Step 0: Requirements and rules (2026-09-26)
- Wrote the master business requirements (`BR-eCommerce-Platform.md`): about 190 requirements across accounts, catalog, search, cart, payments, orders, admin and more, plus non-functional needs and a map of system-design concepts.
- Wrote the steering docs (`steering/`): rules, architecture, design system, security, and a memory file. These are the rules I follow on every task.
- Wrote `CLAUDE.md` so every session starts by reading those rules.

### Step 1: App shell and design system, BRD 01 (2026-09-27)
- Created the Nx workspace with a storefront (server-side rendered) and an admin placeholder.
- Built design tokens (colors, spacing, fonts) and the first shared components (button, form field, price, rating, drawer, toast...).
- Built header with mega menu, mobile drawer, footer, cookie banner, static pages, SEO service, error handling.
- Result: lint, tests and build pass; verified in the browser.

### Step 2: Catalog, BRD 02 (2026-09-27)
- Generated 252 products, 1,854 reviews and images with a seeded script (same data every time).
- Built home page, category/brand/collection/search listing with filters, sort and pagination (all stored in the URL), product page with variants, gallery, delivery check and reviews, compare, recently viewed.
- Server-rendered pages include SEO tags and structured data; unknown pages return real 404s.

### Step 3: Cart and checkout, BRD 04 (2026-09-27)
- Wrote `brds/04-cart-checkout.md`.
- Built the mock "server": a pricing engine that decides tax (GST included), shipping, coupons and stock; plus cart, checkout, order and payment APIs.
- Built the cart store (shared), mini-cart drawer, cart page with coupons, four-step guest checkout, a mock Razorpay window (success, failure, cancel, retry), order confirmation with a tracking timeline, cancel, a printable invoice and an orders list.
- Try it: add a product, apply `WELCOME10`, check out, choose online payment and use "Simulate failed payment" then "Retry".
- Tests: 30 for the data layer, plus cart store, page flows and accessibility checks. Everything (lint, tests, build for 12 projects) passes.
- Not done yet: stock is not reduced when an order is placed; no saved addresses; accounts come next.

### Step 4: Search, BRD 03 (2026-09-27)
- Wrote `brds/03-search.md` (numbered 03 because search was planned before cart; it was built after BRD 04).
- Built a small search engine that behaves like Meilisearch: matches every word, prefix on the last word, typo tolerance, synonyms (tee = t-shirt, mobile = smartphone...), plural handling and relevance ranking.
- New header search box with suggestions (queries, products, categories, brands), recent and popular searches, full keyboard support.
- Search results page: Relevance sort by default, a notice when the spelling was corrected, and a friendly no-results page with popular searches.
- Try it: type "lap", then search "labtop" or "sneekers" (typos still work).

### Step 5: Accounts, BRD 05 (2026-09-27)
- Wrote `brds/05-accounts.md`.
- Built a mock identity system: register, sign in and out, lockout after 5 wrong passwords, forgot and reset password, email verification, roles and permissions in the session.
- Account pages: home, profile and password, address book, privacy (export data as JSON, delete account), wishlist page, and account order history.
- Your guest cart is merged into your account cart when you sign in; checkout pre-fills your details and saved addresses and can save a new address.
- Emails are not really sent: a development-only page `/dev/mailbox` shows them (verification links, reset links, order confirmations).
- Try it: open `/account/login`, use the "Development only: fill demo customer" button, sign in; or register a new account and open `/dev/mailbox` to verify it.

### Step 6: Admin console, BRD 06 (2026-09-27)
- Wrote `brds/06-admin-console.md`.
- Built the back-office app (`apps/admin`, runs on port 4201): dashboard with revenue chart, product management (search, filters, bulk actions, create and edit with variants), order processing (only valid status steps, cancel, notes), coupons, users and admin roles, audit log and a read-only settings view.
- Every write is recorded in the audit log, and the mock API checks permissions on every call (not only the page guards).
- The admin app has its own seeded demo data (about 60 orders over 30 days) because it runs on a different browser address from the shop; a real backend will let both share data.
- Try it: run `pnpm exec nx serve admin`, open http://localhost:4201, use "Development only: fill demo admin", sign in.

### Step 7: Reviews, BRD 07 (2026-09-27)
- Wrote `brds/07-reviews.md`.
- Customers who bought a product can now write one review (stars, title, text), edit or delete it; other shoppers can mark reviews helpful. Ratings everywhere update when a review goes live.
- Simple safety checks: reviews with links or blocked words are held for moderation and hidden from others (the author still sees them with a "waiting" note).
- Admin console got a Reviews page to approve, reject or delete held reviews (audited).
- Try it: sign in as the demo customer, place a cash-on-delivery order, open that product's Reviews tab and write a review.

### Step 8: DevOps foundation, BRD 08 (2026-09-27)
- Wrote `brds/08-devops-foundation.md`.
- Started Docker Desktop (it was installed but not running) and built and ran both apps as containers. Storefront image 247 MB, admin image 79 MB; both run as non-root and report healthy.
- Storefront server now has health endpoints, strict security headers, a Content-Security-Policy with a per-request nonce, and safe shutdown for rolling updates.
- Added a `docker-compose.yml`, Kubernetes manifests (Kustomize: 2 replicas, probes, autoscaling, disruption budget, ingress), a GitHub Actions pipeline, and 6 end-to-end smoke tests that drive a real browser through shopping, sign in and the admin.
- Wrote `docs/RUNBOOK.md` with all everyday commands and troubleshooting.
- Not verified: the Kubernetes manifests were only checked by rendering (no cluster on this machine), and the CI file has not run yet (no GitHub remote).

### Step 9: Planning the rest (2026-09-27)
- Drafted BRDs 09 to 25 (planned, not built): phase 1 completion (content and SEO, notifications, inventory operations, hardening), phase 2 and 3 frontend (returns, promotions, recommendations, analytics, marketplace, localisation and PWA) and the backend track (foundation, catalog and search, commerce, caching and rate limiting, messaging, observability, Kubernetes and cloud).
- Updated the BRD index with status, dependencies and a recommended order.
- Wrote `docs/VERIFICATION-CHECKLIST.md`: what to run and click to verify everything built so far, the inputs needed from the owner, setup tasks, known limitations and the phase 1 sign-off rule.

### Step 10: Content and SEO management, BRD 09 (2026-09-27)
- Built with placeholder brand and text (as agreed); real ones can be entered later in the admin without code changes.
- Admin console has a new Content area: home banners (schedule, order, alt text), home sections (show, hide, rename, reorder), pages (safe text editor with live preview, draft or published), footer links and redirects (loops are refused).
- The shop home page and footer now read this content. Draft pages are hidden from shoppers and can be previewed by staff.
- The shop server now serves `/robots.txt` and `/sitemap.xml` (380 public URLs; cart, checkout, account and search are excluded).
- Try it: `pnpm start:admin`, sign in as the demo admin, open Content. Note the admin and shop keep separate mock data in development.

### Step 11: Inventory operations, BRD 11 (2026-09-27)
- Stock is now trustworthy. Every change is a permanent ledger entry (who, what, why, when); stock on hand is the starting stock plus all entries.
- Shop side: cash-on-delivery orders take their stock at once. Online orders hold stock for 15 minutes while unpaid, turn it into a sale when payment is verified, and give it back on failure, cancellation or timeout (the unpaid order is then cancelled). Two shoppers can no longer buy the last unit.
- Admin side: a new Inventory area with the stock table (on hand, reserved, available, low and out of stock), adjust, transfer between two warehouses, low-stock threshold and backorder per variant, the ledger, CSV import and export with an error report, and settings (reservation minutes, default threshold). Low-stock alerts show once per item until restocked.
- Backorder: a flagged item can be bought at zero stock and the shop says when it ships.
- Try it: `pnpm start:admin`, sign in as the demo admin, open Inventory. Note the shop and admin keep separate mock data in development.
- Not done here: emailing staff about low stock (BRD 10), pre-orders as a separate type.

### Step 12: Notifications and preferences, BRD 10 (2026-09-27)
- A notification bell in the shop header (signed-in shoppers) with an unread badge, a full list at `/notifications`, and mark read/mark all read.
- Preferences at `/account/preferences`: marketing (with a consent date), back-in-stock alerts and price-drop alerts; order updates always reach you and are shown as such rather than a toggle. A working one-click unsubscribe link (`/unsubscribe?token=...`) turns off one channel without signing in.
- "Notify me" on out-of-stock products and "Alert me on price drop" on the product page; manage them at `/account/alerts`.
- Admin "Notifications" area: edit the wording of every message with a live preview and only its own variables allowed, keep every past version and restore one, send yourself a test, and see the delivery log with retry for failures.
- Try it: sign in as the demo customer, place a cash-on-delivery order, open the bell. As the demo admin, open Notifications to edit a template or see the delivery log.

### Step 13: Frontend hardening and polish, BRD 12 (2026-09-27) — phase 1 complete
- Fixed bars that could overlap on mobile (cookie banner, compare bar, the product page's sticky "Add to cart") now form one stack; the cookie banner always wins.
- Mobile listings get a "Load more" button that adds results to the page instead of replacing them, keeps your scroll position, and still uses real, crawlable page links underneath. Found and fixed a real bug along the way (an image loading hint could be applied to the wrong picture once results could be appended).
- Added an offline banner, and focus now jumps to the new page's heading after every navigation (also wrote `docs/ACCESSIBILITY-CHECKLIST.md` for the keyboard and screen-reader pass a person should still do).
- Verified rather than assumed: measured the real bundle size (163 kB actually sent over the network, not the bigger "raw" number the build warns about) and adjusted that warning with the reasoning written down; confirmed the safe-before-hydration behaviour Angular already gives us is genuinely in effect; ran the browser test suite on Chromium, Safari (WebKit) and three phone/tablet sizes and confirmed all green (Firefox could not be launched in this sandboxed environment; recorded, not silently skipped).
- Left undone on purpose, with the reason written in the BRD: colour-contrast checks in the automated suite, Lighthouse scores in CI (no CI pipeline exists yet), and visual regression testing (an open question for you to decide, not assumed).
- This was the last BRD of phase 1. See `docs/VERIFICATION-CHECKLIST.md` for what to check to sign it off.

### Step 14: Kubernetes verified for real, and a wrong claim corrected (2026-09-27)
- You turned on Docker Desktop Kubernetes, so the manifests from BRD 08 were actually applied for the first time (not just render-checked): both apps came up with 2 replicas, self-healed when a pod was deleted, and were reachable through a real ingress controller with the right routes and security headers.
- While checking that, I re-verified a claim I had made in BRD 12 ("forms are already safe from an accidental early submit") instead of leaving it as an assumption, and it turned out to be wrong under a real, slow-loading test. Fixed properly: a submit button now stays disabled, starting from the very first HTML the server sends, until the app has actually finished loading. Confirmed with the same test that it now works, and that a normally-timed sign-in is unaffected.
- Your setup checklist (F1 to F4): F2 (Kubernetes) is verified as above. F4 (MongoDB + PostgreSQL) was already the settled decision, nothing to change. F1 (GitHub remote) is configured and reachable; two commits (BRD 10, BRD 12) are not pushed yet — see the note to you. F3 (Razorpay) is ready for when the backend track starts.

### Step 15: Backend foundation and identity API, BRD 19 (2026-09-28) — the backend track begins
- A real server now exists: `apps/api` (NestJS) with a real PostgreSQL database (Prisma). Sign-in, your profile and your saved addresses can run against it instead of the browser-only mock, one flag away (`realAuth: true` in the storefront/admin config) — everything else keeps using mock data until its own turn.
- Passwords are properly hashed (Argon2id), sign-in tokens are short-lived and rotate on every refresh, and a stolen/copied refresh token gets caught and signs out that whole sign-in — not just something described in the plan, built and tested.
- Verified for real, not just with automated tests: ran the storefront against the live API in a browser, signed in, saved an address, and confirmed the row landed in the real database.
- `docker compose up` now also brings up the database, cache and the API (with a one-time migration-and-seed step first).
- Try it: `docker compose up -d postgres redis`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm start:api`, then flip `realAuth: true` in `apps/storefront/src/app/app-config.values.ts` and `pnpm start:storefront`.
- Not built yet: the catalog, cart, orders, search and everything else still run on mock data (that is BRD 20 and 21); no cloud deployment yet.

### Step 16: Catalog and search services, BRD 20 (2026-09-28) — the shop and search box can run for real
- Browsing, filtering and searching the catalog can now run against a real database (MongoDB) and a real search engine (Meilisearch) instead of the in-browser mock — one flag away (`realCatalog: true`), same as sign-in was in BRD 19.
- Search is genuinely typo-tolerant and fast (Meilisearch, not a hand-rolled approximation): tried it with a misspelled word ("smartphon") and it still found every smartphone.
- Admin can now create, edit and publish products against the same store the shop reads — and a real gap from BRD 06 is now closed: a draft product used to just live in a disconnected mock; now it is genuinely invisible to shoppers until published, on one shared store.
- Verified for real: browsed the shop, searched, opened a product page (with related items and reviews) and filtered by a facet, all in a live browser against the real API — confirmed by reading the actual network requests, not assumed.
- Try it: `docker compose up -d mongo meilisearch`, `pnpm db:seed:catalog`, `pnpm start:api`, then flip `realCatalog: true` in `apps/storefront/src/app/app-config.values.ts` and `pnpm start:storefront`.
- Not built yet: cart, checkout, orders and payments still run on mock data (that is BRD 21); writing a new review still only saves to the mock, not the real store yet; no CSV bulk import or image upload pipeline yet.

### Step 17: Commerce services, BRD 21 (2026-09-28) — the shop can run end to end on the real backend
- You can now add something to a real cart, check out, and place a real order against the real database — cash on delivery works completely, right now, with no extra setup beyond starting the server.
- Two shoppers racing for the very last unit of something can never both win: stock is taken atomically at the moment an order is placed, not just "hoped to be enough".
- Online payment (Razorpay) is built for real — the actual signature checking, the actual order/refund calls — but it needs your own free Razorpay test-mode keys to actually take a payment. Add them to `apps/api/.env` yourself (I will never ask you to paste them into chat); cash on delivery needs nothing extra.
- Admin can now move a real order through packed / shipped / delivered, or cancel it (which puts the stock back automatically), against the real database.
- Verified for real, live in a browser: added a real item to a real cart, filled in the checkout form, chose cash on delivery, placed the order, and confirmed the row in Postgres and the stock reduction in MongoDB by querying them directly — then cancelled the order through the UI and confirmed the stock came back.
- A real bug was found and fixed while testing this, not left in: the very first version of the "take stock atomically" logic used an invalid database query that matched nothing, so every single order would have failed. Caught immediately by actually placing a test order, not just by reading the code.
- Try it: `pnpm start:api`, then flip `realCatalog: true` and `realCommerce: true` in `apps/storefront/src/app/app-config.values.ts` and `pnpm start:storefront`. Add something to your cart and check out with cash on delivery.
- Not built yet: invoices as a real PDF, and a job that automatically double-checks every payment against Razorpay's own records (both are on the list for later, once messaging and scheduling exist).

## 3. Useful commands (with meaning)

| Command | What it does |
|---|---|
| `pnpm install` | Installs all project dependencies |
| `pnpm exec nx serve storefront` | Starts the storefront at http://localhost:4200 with live reload |
| `pnpm exec nx build storefront` | Production build (also checks size budgets) |
| `pnpm exec nx test <project>` | Runs the unit tests of one project (e.g. `shared-data-access`) |
| `pnpm exec nx lint <project>` | Checks code style and accessibility rules |
| `pnpm exec nx run-many -t lint test build` | Runs lint, tests and build for every project (the "is everything green?" check) |
| `node tools/generate-mock-data/generate.mjs` | Regenerates all mock products, reviews and images |
| `pnpm exec nx g @nx/angular:library --name=<x> --directory=libs/<path> ...` | Creates a new library with the right structure |
| `git add -A && git commit -m "..."` | Saves a snapshot of the work (one commit per finished BRD) |
| `pnpm exec nx test storefront-checkout` | Runs the cart, checkout and order page tests |
| `pnpm docker:up` / `pnpm docker:down` | Build and start (or stop) both apps as containers: shop on 4000, admin on 4001 |
| `pnpm e2e` | Real-browser smoke tests (Edge locally, Chromium in CI) |
| `pnpm k8s:render` | Print the Kubernetes manifests (no cluster needed) |
| `pnpm exec nx serve admin` | Starts the admin console at http://localhost:4201 |
| `pnpm exec nx test admin-console` | Runs the admin page tests |
| `pnpm exec nx test storefront-account` | Runs the sign-in, account and address-book page tests |
| `pnpm exec nx test shared-data-access` | Runs data-layer tests including cart pricing and search |

## 4. Problems met and how they were solved

| Problem | Fix (plain English) |
|---|---|
| `npm install` crashed | Used pnpm instead |
| Nx template added an unwanted backend app | Started from an empty Nx workspace and added only what we need |
| Page crashed when a CMS page was missing | Angular resources throw if you read a value while in error state; check `hasValue()` first |
| "Writing to signals in computed" error | Load saved state in the constructor, never inside a computed value |
| Mega menu would not open on click | Hover and click cancelled each other; hover now opens, click confirms |
| Old product links returned 200 | Fixed so they send a proper redirect (302) to the new address |
| Password hashing failed in the test runner | `crypto.subtle` is missing in that environment (and on plain http); added a clearly labelled fallback hash for the mock |
| Production server answered 400 to every page | Angular blocks unknown Host headers; added an `ALLOWED_HOSTS` list |
| Docker build failed at `pnpm install` | Container used a newer pnpm; pinned it with `packageManager` in `package.json` |
| Admin container kept restarting | An nginx regex with braces must be quoted |
| Browser blocked inline scripts under the strict CSP | Added a per-request nonce, and turned off critical-CSS inlining (adds inline handlers) |
| Checkout redirect for an empty cart crashed | A route guard used `inject()` after an `await`; injection must happen before the first await (found by a test) |
| Bundle grew past the 500 kB warning | Mock adapters ship in the bundle for now; warning limit raised to 600 kB and noted to revisit |

## 5. Change history

| Date | Change |
|---|---|
| 2026-09-26 | Master BR approved (v1.0); steering docs created |
| 2026-09-27 | BRD 01 built and committed |
| 2026-09-27 | BRD 02 built and committed |
| 2026-09-27 | Project log created (this file); BRD 04 started |
| 2026-09-27 | BRD 04 built and committed |
| 2026-09-27 | BRD 03 (search) built and committed |
| 2026-09-27 | BRD 05 (accounts) built and committed |
| 2026-09-27 | BRD 06 (admin console) built and committed |
| 2026-09-27 | BRD 07 (reviews) built and committed |
| 2026-09-27 | BRD 08 (DevOps foundation) built and committed |
| 2026-09-27 | BRDs 09 to 25 drafted; verification checklist written |
| 2026-09-27 | BRD 09 (content and SEO) built and committed |
| 2026-09-27 | BRD 11 (inventory operations) built and committed; session context file added and kept up to date |
| 2026-09-27 | BRD 10 (notifications and preferences) built and committed |
| 2026-09-27 | BRD 12 (frontend hardening) built and committed; phase 1 of the frontend complete |
| 2026-09-27 | Kubernetes manifests applied and verified on a real local cluster; a wrong "already safe" claim about early form submits found and fixed for real |
| 2026-09-28 | BRD 19 (backend foundation and identity API) built, verified against a real database and a real browser session, and committed — first backend slice |
| 2026-09-28 | BRD 20 (catalog and search services) built on MongoDB + Meilisearch, verified live in a browser (listing, typo-tolerant search, product page, facets all confirmed against the real API), and committed |
| 2026-09-28 | BRD 21 (commerce services) built: cart, checkout, orders, COD and the order state machine on the real database, real Razorpay integration code; verified live in a browser (a real order placed, confirmed in Postgres/MongoDB, then cancelled), and committed — the shop can now run end to end on the real backend |
| 2026-09-29 | BRD 22 (caching and rate limiting) built: Redis-backed cache-aside catalog caching with tagged invalidation, HTTP ETag/304 support, per-route rate limiting, and a distributed coupon-redemption counter; verified live against the real server (a real 304 on a repeat request, a real 429 with `Retry-After` after the search limit, the coupon counter incrementing and releasing across a placed-and-cancelled order), full workspace lint/test/build green, and committed — bot/CAPTCHA hooks and a full metrics dashboard explicitly deferred |
| 2026-09-29 | BRD 23 (messaging, jobs, notifications) built: RabbitMQ added to the stack with a transactional Postgres outbox, retry-with-backoff and a dead-letter queue (inspect/replay endpoints), real order/payment/abandoned-cart emails through the whole pipeline, active scheduled jobs (payment-window sweep, abandoned-cart reminders) guarded by a Redis lock so exactly one instance runs each tick, and real-time order tracking over Server-Sent Events; two real bugs caught by the test suite itself (a Redis lock that only ever expired instead of releasing, blocking an instance's own next tick; an SSE ownership check that had to move into a Guard because Nest commits the 200 response before the handler's Observable is even subscribed) fixed before committing; 71/71 api tests (7 new), full workspace lint/test/build green, live-verified (a real confirmation email inside ~1s of placing an order; an open SSE stream showing `confirmed` then, live, `cancelled` from a second terminal) |
| 2026-09-29 | BRD 24 (observability and reliability) built: a real circuit breaker (timeout/retry/open-on-failure) wraps every Razorpay and Meilisearch call so either outage degrades gracefully instead of 500ing; Prometheus + Grafana (a real provisioned "eCommerce API overview" dashboard) added and scraping a real `/metrics` endpoint; 5 real Prometheus alert rules routed through Alertmanager to a logging webhook receiver; Loki + Promtail centralising every container's logs; real `pg_dump`/`mongodump` backup and restore-drill scripts. Live-verified end to end by actually stopping Meilisearch: watched the breaker open on the live server, watched Prometheus mark `CircuitBreakerOpen` firing, watched the exact alert land in Alertmanager and then in the logging webhook's real output and separately in Loki, restarted Meilisearch and watched the breaker recover on its own with no manual intervention — then ran a real restore drill (1.9s total against a 60-minute RTO target, row counts verified equal to the live database). 84/84 api tests, full workspace lint/test/build green. Distributed tracing (OpenTelemetry/Jaeger) and frontend error reporting deferred, explicitly, as a scope decision, not an oversight |
| 2026-10-02 | BRD 25 (Kubernetes, cloud, load testing) built locally: the whole stack runs on Kubernetes with enforced network policies, no secrets in the repo, autoscaling (API grew 2 → 7 pods under load) and a canary release with an automatic-abort script; k6 load tests pass (browse p95 7.8 ms, search 53 ms, checkout 88 ms with 223 orders and no 5xx) and the flash-sale race — 80 buyers, 20 units — ended with stock exactly 0 and exactly 20 orders, twice. Running the built image on Kubernetes for the first time found a build-target bug (es2021) that crashed every database request in the production image but never in `nx serve`, now fixed. The CD pipeline and Terraform are written but never run (no cloud account); the design targets of 10,000 users and 1,000 orders/min were not tested |
| 2026-10-03 | BRD 13 (returns, refunds, support) built as a mock-backed frontend slice: customers request returns from delivered orders (items, quantities, reason, attachments) and see the refund the API computed before submitting; staff approve with a pickup date or reject with a reason, record the quality check (restock or scrap writes the stock ledger) and issue the refund; customers follow a five-stage timeline; cancelled prepaid orders move from "refund in progress" to "refunded"; support tickets (create, reply, close, staff queue with assignee); admin policy page (window, fee, non-returnable categories and products). Tests: 20 new data-access tests, 6 storefront UI flows, 5 admin UI flows and 3 order-page tests, all with axe checks. Also fixed a pre-existing time-bomb in `http-auth.api.spec.ts` (a hard-coded session expiry of 2026-10-01 had passed). The mock is device-local; returns do not see orders from the real backend (`realCommerce`), and no real money moves |
