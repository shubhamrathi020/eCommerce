# BRD 21: Commerce Services: Cart, Orders and Payments

| Field | Value |
|---|---|
| Status | Built: cart, checkout, orders, cash on delivery, the order state machine, admin order management, real Razorpay integration code (needs your own test keys to actually exercise) |
| Version | 0.2 (2026-09-28) |
| Phase | Backend |
| Covers (master BR) | CART-01..08, PAY-01..13, ORD-01..12, INV-02/03/07, PRM-02/07 |
| Depends on | BRD 19, 20, 11 |
| Not in this BRD | Caching and rate limiting (BRD 22), asynchronous messaging (BRD 23) |

## 1. Purpose and scope
Move money and orders onto the server with correctness under load: pricing, inventory reservation, the order state machine and the real Razorpay integration.

## 2. User stories
- As a shopper my order is created once and stock is held for me.
- As the owner payments are verified server-side and reconciled.
- As finance every amount can be traced.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| CM21-01 | Server-side cart (PostgreSQL and Redis) with guest and account merge | Cart survives devices for accounts |
| CM21-02 | Pricing engine service: tax, shipping, coupons and promotions computed only on the server | Amounts equal the mock engine on the same inputs |
| CM21-03 | Order state machine with allowed transitions and audit history | Illegal transitions are impossible |
| CM21-04 | Inventory reservation with atomic operations or locks; release on timeout, cancel or failure | A load test cannot oversell |
| CM21-05 | Razorpay integration: create order, verify signature server-side, webhooks with signature check, refunds | Duplicate webhooks and retries never double-charge or double-ship |
| CM21-06 | Idempotency keys on order and payment endpoints; outbox pattern for events | Retrying a request returns the original result |
| CM21-07 | Reconciliation job comparing provider records with orders | Mismatches produce an alert and a report |
| CM21-08 | Invoice generation (PDF) and order documents | Invoices match totals and tax lines |
| CM21-09 | Admin order and refund APIs | Permissions and audit enforced |
| CM21-10 | HTTP adapters replace mocks for cart, checkout, orders, payments | End-to-end tests pass against the real backend |

## 4. Deliverables
Commerce modules, Razorpay adapter, workers, adapters, load tests for the last-unit race.

## 5. Business rules
1. Amounts are integers in paise.
2. Money and stock use strong consistency.

## 6. Non-functional notes
Handle 1,000 orders per minute in the design target; every write endpoint idempotent.

## 7. What we need from you before starting
- A Razorpay account in test mode (key id and secret kept in a secret store, never in the repo).
- A registered business identity for real invoices later (GSTIN).

## 8. Open questions
- Which payment methods are enabled at launch (UPI, cards, net banking, wallets, COD)?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
| 2026-09-28 | Server-side cart built on Postgres (CM21-01): one row per owner, guest identified by a long-lived, non-sensitive cookie (`gcid`), merged into the account's cart right after sign-in/register — the server-side version of the mock's `mergeGuestIntoUser`. Pricing (tax, shipping, coupons) is the exact same rules as the mock, relocated into `@ecom/shared/models` (`cart-derive.ts`) so both sides compute money identically | CM21-01, CM21-02 |
| 2026-09-28 | Order state machine built on Postgres (CM21-03): `ORDER_TRANSITIONS` also relocated into `@ecom/shared/models`, so the mock admin screens and the real `AdminOrderApi` enforce the exact same transitions. Placement is idempotent on a client-supplied key (CM21-06): retrying returns the original order, never a duplicate | CM21-03, CM21-06 (order endpoints) |
| 2026-09-28 | Inventory taken atomically straight from the catalog store (CM21-04): each line is a guarded `$elemMatch` + positional-`$` Mongo update (`stock: { $gte: quantity }`), so two shoppers racing for the last unit can never both win. Online-payment orders hold their stock for a real 15-minute window; a lazy sweep (run at the top of every order-touching call, same pattern as the mock's `cancelExpiredOrders`) cancels an order whose window ran out and gives the stock back. Not full multi-document ACID across an order's lines (standalone MongoDB here has no replica set) — documented as a scoped-down simplification, not a silent gap; a genuine cross-order race on a multi-item order is the one case a customer might see "some items are no longer available" instead of a clean decrement | CM21-04 |
| 2026-09-28 | Real Razorpay integration code (CM21-05): order creation, HMAC-SHA256 payment-signature verification (constant-time compare), a webhook endpoint verified against the raw request body (not the re-parsed JSON), and refunds issued automatically when an admin cancels a paid order and keys are configured. The API refuses to start with a live-mode key (`rzp_live_...`) — test mode only, ever. No real Razorpay test keys exist in this environment; cash on delivery was verified fully end-to-end instead (see below), and the signature-verification math itself was verified without needing an account, by computing the same HMAC Razorpay's checkout widget would and checking the server accepts it and rejects a tampered one | CM21-05 |
| 2026-09-28 | Admin order management (CM21-09): list/filter/get/advance/add-note against real orders, `order:refund` required to advance status (matching the mock's exact permission), `order:read:any` for read/note actions. Reconciliation against the provider (CM21-07) and invoice PDFs (CM21-08) are not built — recorded as deferred, not silent; CM21-07 needs a working Razorpay connection to reconcile against, so it isn't meaningful without real keys, and both are more naturally scheduled alongside BRD 23/24's scheduling and observability infrastructure | CM21-09 |
| 2026-09-28 | Frontend wiring: `HttpCartApi`/`HttpCheckoutApi`/`HttpOrderApi`/`HttpPaymentApi` (storefront) and `HttpAdminOrderApi` (admin) behind a new `AppConfig.realCommerce` flag (default `false`). A new `ApiClient.optional()` call mode attaches the bearer token when the caller is signed in but never forces sign-in or refreshes on a 401 — cart/checkout/order/payment endpoints work for guests by design | CM21-10 |
| 2026-09-28 | Verified live in a browser, not just with automated tests: added a real product to a real server-side cart, went through the real checkout flow (address, real shipping options from the API, cash on delivery), placed a real order, and confirmed the row in Postgres and the stock decrement in MongoDB directly — then cancelled it through the UI and confirmed the order's status and timeline updated. A real bug was found and fixed in the process: the first version of the atomic stock decrement used an invalid MongoDB query (`variants.$.stock` in the filter, where `$` only has meaning in the update document), which matched zero documents and made every order placement fail; fixed using `$elemMatch` in the filter with the positional `$` kept in the update, and recorded as a lesson in `steering/memory.md` | Verification |
| 2026-09-28 | 13 new backend integration tests (Vitest + supertest against real Postgres + real Mongo, including a full guest-ownership isolation test and an admin state-machine test) plus 4 signature-verification unit tests plus 8 new frontend adapter tests — 64/64 api tests, 143/143 shared-data-access tests. Full workspace (15 projects) lint/test/build clean | Verification |
