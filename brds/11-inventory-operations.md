# BRD 11: Inventory Operations

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
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
