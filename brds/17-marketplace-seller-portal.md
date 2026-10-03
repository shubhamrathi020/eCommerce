# BRD 17: Marketplace and Seller Portal

| Field | Value |
|---|---|
| Status | Built (frontend, mock-backed; includes the new seller app) |
| Version | 0.2 (2026-10-03) |
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

## 8. Open questions - decided by default (please confirm or change)
You asked me to proceed without waiting for answers, so these defaults were used:
- **Marketplace at launch or later:** built now as a separate seller app, so the single-store shop is unchanged. The store's own products have no seller and ship as before; a cart that mixes in a seller's items splits into one shipment per seller.
- **Commission model (your approval was needed):** a percentage of what the shopper paid for the seller's items after offers. The most specific rule wins: a seller's own override, then a rule for that seller, then the category (leaf first), then the default. Defaults seeded: 10% overall, 6% electronics, 12% fashion; editable in Admin > Marketplace > Commission.
- **Payout schedule:** none is automatic. An admin issues a statement for a period (up to 13 months) from delivered shipments, less commission, minus refunded returns, and records the bank transfer reference. Shipments and returns can be on one statement only. Real bank payments are not made.
- **KYC fields collected:** store and legal name, mobile, GSTIN and PAN (format-checked only; nothing verifies them with the government), pickup address, bank holder, IFSC and account number. Only the last four digits of the account number are kept.
- **What approval does:** the applicant gains the `seller` role; they sign in again to see the portal. A rejected applicant sees the reason and can apply again. Suspending a seller takes their listings (and the catalog items assigned to them) off sale immediately.
- **Listings:** a new one starts as a draft and needs admin approval. Editing price, MRP or stock of a live listing applies at once; editing its title, brand, category or description sends it back for approval.
- **Seller rating:** the review-count-weighted mean of the ratings of all that seller's products, so it moves when reviews do.

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
| 2026-10-03 | Built. MP-01 to MP-06 implemented as a mock-backed slice with a **new Nx app, `apps/seller`** (port 4202) and library `libs/seller/portal`, plus admin screens (Marketplace: applications, sellers, listings, commission, payouts). Pure rules in `@ecom/shared/models` (`marketplace.ts`: KYC checks, commission resolution, statement totals, seller rating, shipment status). New `seller` role and `seller:portal`/`seller:manage` permissions; a demo seller account (`seller@shop.test`) and three demo sellers. Approved seller listings and seller ownership reach the whole shop through one catalog extension hook, so the catalog, cart, orders and search all see them. Orders with seller items are split into per-seller shipments with their own status and tracking; the order is as far along as its slowest shipment, so a return window starts only when every shipment is delivered. Shoppers see a seller card (name, rating, policies) on product pages and shipments on the order page. Isolation: the portal API derives the seller from the signed-in user and answers another seller's ids with not-found; sellers see only ship-to details and their own lines. Verified by 30 data-access tests (including isolation, the split, a reconciling payout and a refunded return reversing a sale), 12 UI flows with axe (5 seller portal, 7 admin), the new app's lint/test/build, and workspace lint/test/build (API unit tests need Docker/Postgres). **Not done, on purpose:** sponsored ads (P3); the real backend (nothing here exists server-side, and with `realCommerce` on none of it applies); Docker/Kubernetes/CI wiring for the seller app (a Dockerfile and nginx config exist but nothing builds or deploys them yet); real KYC verification; real payouts; seller images (listings use a placeholder); variants and multiple images per listing; sellers answering reviews; the admin order page does not yet show shipments | Deliver the marketplace slice of phase 2 |
