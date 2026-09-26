# BRD 11: Inventory Operations

| Field | Value |
|---|---|
| Status | Implemented (mock adapters) |
| Version | 0.2 (2026-09-27) |
| Phase | Phase 1 (frontend completion) |
| Covers (master BR) | INV-01..08, CART-08 (reservation), ADM-03/10 |
| Depends on | BRD 02, 04, 06 |
| Not in this BRD | Purchase orders and supplier management (INV-06, P3), warehouse robotics or scanning |

## 1. Purpose and scope
Make stock trustworthy. Today stock is only checked, not reduced, when an order is placed, and admin stock edits have no reason. This BRD adds a stock ledger, reasons, reservations, thresholds and bulk tools.

## 2. User stories
- As a warehouse user I record received stock, damage and corrections with a reason.
- As an admin I see every stock change and who made it.
- As a shopper I never buy something that just sold out.
- As an admin I import stock levels from a spreadsheet and get a clear error report.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| IV-01 | Stock movement ledger: receive, sale, cancellation, return, damage, correction; each with quantity, reason, actor and time | Stock on hand always equals the sum of movements; the ledger cannot be edited, only appended |
| IV-02 | Stock adjustment screen requiring a reason code and optional note | Saving without a reason is refused; every change appears in the ledger and audit log |
| IV-03 | Reserve stock when an order is placed and release it on cancellation, payment failure or timeout (default 15 minutes) | Two shoppers cannot both buy the last unit; abandoned payments free their stock after the timeout |
| IV-04 | Sales reduce stock and cancellations restore it, keeping available and reserved counts separate | The product page shows available stock only; orders and stock agree |
| IV-05 | Low-stock thresholds per product with a dashboard list and a notification to staff | Crossing the threshold creates one alert until stock is replenished |
| IV-06 | CSV export and import of stock with validation and a downloadable error report | Bad rows are skipped and listed; good rows apply atomically per file |
| IV-07 | Locations (warehouses): stock per location with totals; orders draw from the first location that can fulfil | Location totals add up to product stock; moving stock between locations is a paired ledger entry |
| IV-08 | Backorder and pre-order flags with expected date shown to shoppers | A flagged product can be bought at zero stock with a clear delivery message |
| IV-09 | Permissions and audit | `inventory:write` is required; imports and adjustments are audited |

## 4. Deliverables
Admin inventory screens, ledger, import and export, reservation logic in the mock order and payment adapters, storefront stock messaging.

## 5. Business rules
1. Reservations expire; expired ones release stock automatically.
2. Negative stock is never allowed except for explicit backorder products.
3. Ledger entries are permanent.

## 6. Non-functional notes
Reservation logic must be safe under concurrent requests (locks or atomic updates when the backend arrives).

## 7. What we need from you before starting
- Your stock policy: reservation timeout, low-stock default threshold.
- A sample stock spreadsheet if you want import tested with real data.

## 8. Open questions
- Single warehouse for now or multiple locations from the start (proposed: both supported, one seeded)?
- Should pre-orders be allowed at launch?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
| 2026-09-27 | Built IV-01..IV-09 on mock adapters. One shared stock store (`MockInventoryStore`) holds the append-only ledger, reservations, per-variant thresholds and backorder flags, settings and low-stock alerts; the shop catalog, search and cart read live stock from it and the admin reads physical counts | Slice built |
| 2026-09-27 | Stock on hand is the catalog baseline plus the sum of ledger movements (never edited, only appended). Available = on hand minus units held by unpaid orders. Cash-on-delivery orders sell at once; online orders reserve, then sell on verified payment; failure or cancel releases; the reservation expires (default 15 minutes) and the order is then cancelled with "payment window expired". A retry after failure re-checks availability | IV-01, IV-03, IV-04 |
| 2026-09-27 | Two seeded locations (Main warehouse, Bengaluru hub); the catalog baseline sits in the main warehouse. Sales come from the first location that can fulfil the whole line, otherwise drain in priority order. Transfers are two ledger entries sharing a transfer id | IV-07; answers the "multiple locations" open question (both supported, one holds stock) |
| 2026-09-27 | Backorder flag with expected date (IV-08): a flagged variant can be bought at zero stock, on hand may go negative only for these; the shop shows "Backorder" and "Ships around <date>" on cards, product page and cart lines. Pre-orders use the same flag (no separate pre-order type) | Simplest reading of the open question; can be split later |
| 2026-09-27 | Low-stock alert (IV-05): one alert per variant when available reaches its threshold (default 5, overridable per variant), cleared when restocked above it. Shown on the stock screen and dashboard. Delivery to staff by email or push arrives with BRD 10; shoppers still see "Only N left" at the fixed shop threshold of 5 | Notification delivery belongs to BRD 10 |
| 2026-09-27 | Adjustments need a reason code (fitted to the kind of change) and a note for "Other"; damage and removals cannot take a location below zero; existing variants' stock is read-only in the product form (change it in Inventory), a new variant's typed quantity becomes an opening receipt | IV-02 |
| 2026-09-27 | Import sets target stock per SKU and location from CSV (needed columns sku, location, on_hand), up to 5,000 rows and 1 MB; bad rows are skipped and listed with a downloadable error report, good rows apply in one save; export writes the same format; exported cells that start with = + - or @ are prefixed so spreadsheets cannot run them as formulas | IV-06 |
| 2026-09-27 | Permissions: reading stock needs `product:read`; every change and the Inventory menu need the new `inventory:write` (given to the demo admin); adjustments, transfers, policy, settings and imports are audited. Cancelling an order in the console returns its units | IV-09 |
| 2026-09-27 | Known limits: the shop and admin keep separate mock stock in development (a shared backend fixes this); while an online order waits for payment the shopper's own cart shows the held units as unavailable; reservations are checked and written in one synchronous step here, a real backend needs row locks or atomic updates | Same reasons as before |
