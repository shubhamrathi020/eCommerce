# BRD 17: Marketplace and Seller Portal

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
| Phase | Phase 2 (frontend) |
| Covers (master BR) | SEL-01..07, CAT-14, ORD-06, PAY-13 |
| Depends on | BRD 05, 06, 11, 13 |
| Not in this BRD | Sponsored ads (SEL-07, P3) |

## 1. Purpose and scope
Open the store to multiple sellers: onboarding, their own catalog and orders, commission and payouts.

## 2. User stories
- As a seller I apply, get approved and manage my products, stock and orders.
- As an admin I approve sellers and products and set commission.
- As a shopper I see who sells an item and the seller rating.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| MP-01 | Seller application with KYC fields and admin approval | Approved sellers gain access; rejected ones see the reason |
| MP-02 | Seller portal: products (submitted for approval), inventory, orders | A seller sees only their own data |
| MP-03 | Commission rules per category or seller; payout statements | Statements reconcile with delivered orders |
| MP-04 | Split orders for multi-seller carts with separate tracking | Each shipment has its own status and seller |
| MP-05 | Seller ratings and policies shown to shoppers | Ratings update from reviews of that seller |
| MP-06 | Product approval workflow | Only approved products appear on the storefront |

## 4. Deliverables
New seller app, admin approval screens, order splitting.

## 5. Business rules
1. Sellers cannot see other sellers or customer data beyond what they ship to.

## 6. Non-functional notes
Strict tenant isolation is required.

## 7. What we need from you before starting
- Your commission model and payout schedule.

## 8. Open questions
- Marketplace at launch or after the single-store launch?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
