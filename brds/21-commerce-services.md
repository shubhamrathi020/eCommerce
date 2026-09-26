# BRD 21: Commerce Services: Cart, Orders and Payments

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
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
