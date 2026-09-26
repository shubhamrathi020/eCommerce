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
