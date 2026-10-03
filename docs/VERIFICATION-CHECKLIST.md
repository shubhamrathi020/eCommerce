# Phase 1 Frontend: Verification Checklist and Your To-Do List

Phase 1 (BRDs 01 to 12) is complete. Use this to check everything built, and see `docs/ACCESSIBILITY-CHECKLIST.md` for the keyboard and screen-reader pass. Tick items as you go and tell me anything that looks wrong.

## A. Get it running (10 minutes)

| # | Step | Command or action | You should see |
|---|---|---|---|
| A1 | Install | `pnpm install` | No errors |
| A2 | Everything is green | `pnpm verify` | Lint, tests and builds succeed for all 14 projects |
| A3 | Start the shop | `pnpm start:storefront` then open http://localhost:4200 | Home page with banner, categories, deals |
| A4 | Start the admin | `pnpm start:admin` then open http://localhost:4201 | Admin sign in page |
| A5 | Containers (optional) | Start Docker Desktop, then `pnpm docker:up` | Shop on http://localhost:4000, admin on http://localhost:4001; `pnpm docker:down` to stop |
| A6 | Browser smoke tests (optional) | `pnpm e2e` | 6 tests pass |

## B. Walk through the shop as a customer (about 30 minutes)

Development helpers: sign-in pages have a "Development only: fill demo ..." button, and `/dev/mailbox` shows the emails the shop would send.

| # | Area | Try this | Expected |
|---|---|---|---|
| B1 | Browse | Open a category, pick filters (brand, price), change sort, go to page 2 | URL changes, results and counts update, back button works |
| B2 | Product page | Change size or colour, zoom the image, check a pin code (for example 560001) | Price, stock and SKU change; delivery date appears |
| B3 | Search | Type "lap", then search "labtop" and "sneekers", then "qzqzqz" | Suggestions appear; typos still find products; the last shows a friendly no-results page |
| B4 | Cart | Add two products, change quantity, apply `WELCOME10`, try `EXPIRED50` | Discount shown; expired code gives a clear message; free-shipping hint updates |
| B5 | Guest checkout | Checkout with cash on delivery (pin 560001) | Order page with a tracking timeline; it advances over about 6 minutes |
| B6 | Online payment | Checkout with online payment, click "Simulate failed payment", then "Retry", then success | Order stays pending after failure, becomes paid after success |
| B7 | Order extras | Open the invoice, print preview, cancel a confirmed order | Invoice shows GST; header and footer hidden when printing |
| B8 | Account | Register a new account, open `/dev/mailbox`, click the verify link | Account shows verified; sign out and in works |
| B9 | Guest to account | Add an item as a guest, then sign in | The item is in your account cart |
| B10 | Addresses | Add two addresses, make one default, place an order | Checkout is pre-filled and offers "Save this address" |
| B11 | Wrong passwords | Try 5 wrong passwords for one email | You are locked out with a time message |
| B12 | Reviews | Buy a product, open its Reviews tab, write a review; write another with a link in the text | First goes live; the second is "waiting for moderation" |
| B13 | Wishlist and compare | Heart two products, compare three products | Wishlist page and compare table work |
| B16 | Notifications (BRD 10) | Sign in, open the bell (empty), place a cash-on-delivery order, open the bell again; go to Preferences, turn marketing on, use "Show my unsubscribe link", open it in a new tab; on a product page use "Alert me on price drop", then check `/account/alerts` | The order appears unread in the bell; the unsubscribe page confirms and turns marketing back off; the alert is listed and removable |
| B15 | Stock (BRD 11) | Place a cash-on-delivery order for an item, then open its page; place an online order but do not pay | Stock drops by the ordered units; the unpaid order holds its units for 15 minutes, then it cancels itself and the units return |
| B14 | Privacy | Account, Privacy, export data, then (with a throwaway account) delete it | JSON downloads; account is gone |

## C. Walk through the admin (about 20 minutes)

Sign in with "fill demo admin" at http://localhost:4201 (admin data is separate from the shop's data in development; see known issues).

| # | Area | Try this | Expected |
|---|---|---|---|
| C1 | Dashboard | Switch 7, 30 and 90 days; open "View as table" | Figures and chart change; table matches |
| C2 | Products | Search, filter by status, bulk archive two, create a product, edit price and stock | Changes persist; validation messages are clear |
| C3 | Orders | Filter by status, open a confirmed order, mark packed then shipped, add a note | Only valid steps offered; timeline updates |
| C4 | Coupons and users | Create a coupon, deactivate it, grant admin to a seeded user | Saved; you cannot change your own role |
| C5 | Reviews | Approve, reject and delete flagged reviews | Queue shrinks; actions appear in the audit log |
| C6 | Audit and settings | Open both | Every change above is listed; settings are read-only |
| C7 | Access | Sign in with the demo customer at the admin | Refused with a clear message |
| C8 | Content (BRD 09) | Content: add a banner, reorder or hide home sections, create a draft page and preview it, add a footer link, add a redirect (try a loop) | Validation messages are clear; the page preview shows no scripts; loops are refused |
| C11 | Notifications (BRD 10) | Notifications: edit a template with an unknown `{{variable}}` (refused), save a valid change, restore an earlier version, send a test to your own mailbox; open the delivery log, filter by Failed, retry one | Unknown variables are refused; a new version appears each save; the test mail arrives at `/dev/mailbox`; a retried message becomes Sent |
| C10 | Inventory (BRD 11) | Inventory: filter Low stock, open Manage on a row, record a change without a reason (refused), then with one; transfer units to the second warehouse; turn on backorder with a date; open Ledger; export and re-import the CSV; add a bad row and download the error report; change the settings | Every step appears in the ledger and audit log; the shop shows Backorder and the date; bad rows are listed and skipped |
| C9 | SEO files (BRD 09) | Run the production server (`pnpm docker:up`) and open http://localhost:4000/robots.txt and /sitemap.xml | Private paths are disallowed; sitemap lists categories, brands, products and pages |

## D. Look and feel (you decide)

- [ ] Overall design, colours and spacing are acceptable as a base (or list changes).
- [ ] Mobile: use your browser's phone view on home, listing, product, cart and checkout. On a listing page, scroll down and use "Load more"; confirm your scroll position doesn't jump.
- [ ] With items in Compare, open a product page on a phone-width view before deciding the cookie banner: only the cookie banner shows, nothing overlaps it.
- [ ] Keyboard only: can you sign in, search and add to cart without a mouse? See `docs/ACCESSIBILITY-CHECKLIST.md` for the full pass.
- [ ] Turn off your Wi-Fi for a moment: an offline banner appears under the header.
- [ ] Anything confusing, missing or ugly? Write it down, however small.

## E. Inputs I need from you (so I can finish phase 1)

| # | What | Why | Blocking |
|---|---|---|---|
| E1 | Brand name, logo file, and preferred colours | Currently placeholders ("Shop", indigo and amber) | BRD 09, 12 |
| E2 | Text for About, FAQ, Terms and Privacy pages | Currently placeholders; needs your real or legal-reviewed text | BRD 09 |
| E3 | Banner images or approval to keep generated placeholders | Home page banners | BRD 09 |
| E4 | The real site address (domain) you plan to use | Sitemap, canonical links, allowed hosts | BRD 09, 19 |
| E5 | Stock policy: reservation timeout (proposed 15 min), low-stock threshold (proposed 5) | Inventory rules | BRD 11 |
| E6 | Which notifications are launch-ready (order updates, price drop, back in stock) and marketing opt-in default | Notification rules | BRD 10 |
| E7 | Performance and browser targets (proposed: Lighthouse 90+ on mobile; Chrome, Edge, Safari, Firefox; phone widths 360 and 390) | Hardening goals | BRD 12 |
| E8 | Answers to the "Open questions" in BRDs 09 to 12 | Scope decisions | each BRD |

## F. Things to set up on your side (needed later, none block phase 1)

| # | Item | Needed for |
|---|---|---|
| F1 | ~~Create a GitHub repository~~ Done — the remote is configured and reachable. Two commits (BRD 10, BRD 12) are not pushed yet; I asked separately whether you want me to push them or would rather do it yourself | CI verification |
| F2 | ~~Turn on Kubernetes~~ Done and verified for real: both apps deployed with 2 replicas, self-healed a deleted pod, both ingress routes answered correctly. See `brds/08-devops-foundation.md`'s change log | Verifying the Kubernetes manifests (BRD 08 and 25) |
| F3 | ~~Razorpay test account~~ Done — ready for BRD 21 (Commerce services) when the backend track starts; nothing to do in the frontend yet | Real payments (BRD 21) |
| F4 | ~~Decide the database mix~~ Confirmed: MongoDB plus PostgreSQL. This was already the settled decision (see `BR-eCommerce-Platform.md`'s decision log and `steering/architecture.md`); no document changed | Backend design (BRD 19, 20) |
| F5 | Choose the cloud provider and rough budget | BRD 25 |
| F6 | An email sender domain and provider choice | BRD 23 |

## G0. The backend has started (BRD 19 to 24)

Optional to check now (the frontend still works entirely on mocks without it): `docker compose up -d postgres redis mongo meilisearch`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:seed:catalog`, `pnpm start:api`, set `realAuth: true`, `realCatalog: true` and `realCommerce: true` in `apps/storefront/src/app/app-config.values.ts`, `pnpm start:storefront`. Sign in as the demo customer, add an address, then check it is really in Postgres: `docker exec -it shop-postgres-1 psql -U ecommerce -d ecommerce -c "select * from saved_addresses;"`. Browse a category, search for something (try a small typo), open a product page. Add it to your cart, check out with cash on delivery, and check the order landed for real: `docker exec -it shop-postgres-1 psql -U ecommerce -d ecommerce -c "select id, status, \"paymentStatus\" from orders order by \"createdAt\" desc limit 5;"`. If you have MongoDB Compass or a similar tool, point it at `mongodb://localhost:27017` (database `ecommerce_catalog`) to see the products, categories, brands and reviews collections directly, and watch a variant's `stock` field actually drop when you place an order; TablePlus (or any Postgres client) at `localhost:5432` (db `ecommerce`, user/password `ecommerce`) shows the `carts` and `orders` tables the same way. Meilisearch's own dashboard is at `http://localhost:7700`. Online payment needs your own Razorpay test keys in `apps/api/.env` (see `.env.example`) — without them, `realCommerce: true` still gives you a full real cart/checkout/COD flow, only the "pay online" button won't complete. Set the flags back to `false` when done.

**Caching and rate limiting (BRD 22), optional to check with any HTTP client (curl, Postman) against `http://localhost:3333`:** request `GET /catalog/home` twice and note the `ETag` header is identical both times; send the second request again with `If-None-Match: "<that etag>"` and you should get back `304 Not Modified` with an empty body. Call `GET /search/suggest?q=phone` more than 60 times inside a minute and you should start getting `429 Too Many Requests` with a `Retry-After` header (this is the same `RATE_LIMIT_SEARCH_PER_MIN` value in `apps/api/.env`). Sign in as `admin@shop.test` / `Admin@1234`, take the `accessToken` it returns, and call `GET /admin/system/cache-stats` with `Authorization: Bearer <token>` — you should see live `hits`/`misses`/`hitRatio` numbers move as you browse the catalog. If you have `redis-cli` (`docker exec -it shop-redis-1 redis-cli`), `KEYS "ecom:*"` shows the cache keys and tag sets it is using, and `GET "ecom:coupon:redemptions:WELCOME10"` shows the live count of that coupon's use, which increases when an order using it is placed and decreases again if that order is cancelled.

**Messaging and real-time order tracking (BRD 23):** place any order (cash on delivery is simplest), then check `GET /dev/outbox` (or the storefront's `/dev/mailbox`) within a few seconds — a real "Order confirmed: ORD-..." email should appear, having gone through a real database outbox row, a real RabbitMQ publish and a real consumer, not a direct function call. Cancel it and a "Order cancelled" email follows the same way. For the live-tracking part, open two terminals: in one, `curl -N http://localhost:3333/orders/<id>/stream` (with your session's cookie/token) and leave it running; in the other, cancel or advance that same order — the first terminal should print the new status immediately, with the stream still open, no reload. If you have RabbitMQ's own management UI (http://localhost:15672, guest/guest), the "Queues" tab shows `ecom.q.notifications`/`ecom.q.retry`/`ecom.q.dlq` and their message rates moving as you place orders. An admin with the `system:write` permission (the seeded `admin@shop.test` has both `system:read` and `system:write`) can inspect and replay anything that ended up in the dead-letter queue at `GET`/`POST /admin/system/dead-letters(/replay)`.

**Observability and resilience (BRD 24):** `docker compose up -d prometheus grafana alertmanager alert-log loki promtail`, then open Grafana at http://localhost:3001 (no login needed) — the "eCommerce API overview" dashboard under the eCommerce folder should already show real numbers (request rate, cache hit ratio, ...) moving as you browse the shop. To see the resilience story for real: `docker stop shop-meili` (or your Meilisearch container's actual name), then browse a category or search a few times — the page should show a clear "Search is temporarily unavailable" message rather than an error page or a hang, and `GET /admin/system/resilience` (as the seeded admin) should show the `meilisearch` breaker as `"open"`. Within about a minute, Prometheus's `CircuitBreakerOpen` alert should be firing (`curl http://localhost:9090/api/v1/rules`) and `docker compose logs alert-log` should show it arrive. `docker start` the container back and the breaker closes on its own on the next request — no restart needed. `pnpm backup` then `pnpm restore:drill` runs a real, timed backup-and-restore rehearsal and prints whether it met the BRD's RTO target.

## G. Known limitations to acknowledge (already recorded in each BRD)

1. The admin (port 4201) and the shop (port 4200) have separate mock data, so admin actions do not change the shop in development. A real backend fixes this. (Stock is the one exception: it is shared, so admin stock changes and back-in-stock alerts do work across both.)
2. All data is mock and lives in your browser storage; clearing site data resets it.
3. (Fixed in BRD 11) Stock now reduces when an order is placed. While an online order waits for payment, your own cart shows those units as unavailable.
3a. (BRD 22) Cache stampede protection only de-duplicates concurrent requests within one running API process; a multi-instance deployment would need a distributed lock instead (documented, not built). The coupon-redemption cap is a real, working Redis counter but is only wired up for one hardcoded coupon (`WELCOME10`, cap 500) as a demonstration; extending it to more coupons or an admin-editable cap is a product decision for later. Bot/CAPTCHA abuse hooks (BRD 22's CR-06) were not built, and cache/rate-limit metrics are a lightweight `/admin/system/cache-stats` endpoint rather than a full dashboard (deferred to BRD 24).
3b. (BRD 23) No real email provider account exists in this environment, so delivered emails still land in the dev outbox (`/dev/outbox`), not a real inbox — the plumbing in front of it (outbox, RabbitMQ, retry/DLQ, the consumer) is real and would keep working unchanged once a provider is wired into `MailService`. Kafka analytics streaming, an SMS/WhatsApp provider and the CAPTCHA integration point were out of scope for this BRD, as planned, and remain unbuilt. Server-Sent Events push order updates to an open tab; a tab that wasn't open when the change happened just sees it on its next normal page load, same as before this BRD.
3e. (BRD 13) Returns, refunds and support run on mocks only: no real money moves, store credit cannot yet be spent at checkout, attachments store only name/type/size, and returns read orders from the device-local order store so they cannot see orders placed through the real backend (`realCommerce`). Exchanges were not built (refunds only).
3d. (BRD 25) The Terraform (`deploy/terraform/aws`) and deploy pipeline (`.github/workflows/deploy.yml`) were written but never run - no cloud account exists here, and `terraform` isn't even installed, so "staging created and destroyed from code" is not demonstrated. The design targets (10,000 concurrent users, 1,000 orders/minute) were not tested; the largest run was 80 concurrent users on one machine. The canary's automatic abort was verified on synthetic samples, not a genuinely failing canary. Queue-depth autoscaling (KEDA) isn't built. Per-IP rate limits at their defaults would throttle a real flash sale from shared addresses.
3c. (BRD 24) Distributed tracing (OpenTelemetry/Jaeger) and frontend error/performance reporting with consent were explicitly deferred, not attempted — see the BRD's own change log for the reasoning. No real Slack/email/PagerDuty account exists in this environment, so alerts route to a webhook receiver that only logs them (`alert-log`); pointing Alertmanager at a real destination is a one-line config change, not a rebuild. Circuit breakers exist for Razorpay and Meilisearch only (the two genuine external-provider dependencies); RabbitMQ/Redis/Postgres/MongoDB have their own retry/reconnection behaviour already (the driver libraries', not a hand-rolled breaker) and were not additionally wrapped. Loki/Promtail only centralise logs from containers actually started via `docker compose` — a host-run `pnpm start:api` dev server's logs are not shipped anywhere.

_Items 4 to 10 below were resolved in BRD 12; kept here as a record of what phase 1 closed._
4. On mobile, the compare bar and the sticky add-to-cart bar can overlap (fixed in BRD 12).
5. Listings use page links on mobile instead of "load more" (BRD 12).
6. The shop's first-load JavaScript is about 570 kB (target under 500 kB, BRD 12).
7. Kubernetes manifests were render-checked but never applied; the CI pipeline has never run.
8. Colour contrast and Lighthouse scores were not measured automatically (BRD 12).
9. A form submitted before the page finishes loading does a plain reload (BRD 12).
10. The notification bell refreshes on sign-in, sign-out and opening the notifications page, not by a live push (BRD 10).
11. Colour-contrast checks and Lighthouse scores are not automated (no CI pipeline exists yet); visual regression testing was left as an open decision for you (BRD 12).
12. Firefox could not be launched in the sandboxed environment this was built in, so the Firefox browser-test project is configured but unverified here; Chromium, WebKit and three phone/tablet sizes were all confirmed green (BRD 12).

## H. Phase 1 sign-off

Phase 1 of the frontend is complete when BRDs 09 to 12 are built (done), all of section B and C pass, section D is acceptable, and section G items 4 to 10 are resolved (done; 11 and 12 are open decisions or environment notes, not blockers). Reply with what you verified and what you want changed — this is the sign-off point for phase 1. Reply with what you verified and what you want changed.

**Kubernetes and load tests (BRD 25):** with Docker Desktop's Kubernetes running, follow the RUNBOOK's Kubernetes section, then `curl -sk -H "Host: api.localtest.me" https://127.0.0.1:18443/catalog/home` through the ingress port-forward. To see the headline guarantee yourself, run the flash-sale test in `deploy/load-tests/README.md`: 80 simulated buyers race for 20 units and afterwards `node scripts/seed-flash-sale.mjs p-0005-v1` should print stock 0 with exactly 20 orders. `kubectl -n shop get hpa` shows the API autoscaling during `checkout.js`.

**Returns, refunds and support (BRD 13):** sign in as the demo customer, place a cash-on-delivery order and wait about six minutes for it to show "Delivered" (the seeded demo orders belong to other customers, so you need to place your own). On the order page choose "Return items": pick a quantity and a reason and confirm the refund breakdown appears before you submit; "changed my mind" shows a return fee and store credit, "damaged" shows free pickup. Submit, then open Account > Returns and see the timeline. Sign in to the admin as the demo admin, open Returns, approve with a pickup date, mark picked up, record the check (choose restock), issue the refund, and confirm Inventory > Ledger has a "return" entry and the customer's timeline reads refunded. Then raise a support question from the order page, reply to it from Admin > Support, and confirm the customer sees the timestamped reply. Check Returns > Policy: change the window and confirm an existing request keeps the numbers it was made under.
