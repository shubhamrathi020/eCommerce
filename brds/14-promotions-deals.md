# BRD 14: Promotions Engine and Deals

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
| Phase | Phase 2 (frontend) |
| Covers (master BR) | PRM-03..09, PAY-09 |
| Depends on | BRD 04, 06 |
| Not in this BRD | Loyalty programmes beyond a simple points balance (P3), B2B price lists |

## 1. Purpose and scope
Move beyond single coupons: automatic offers, flash deals with a stock cap and countdown, clear stacking rules and gift cards or store credit.

## 2. User stories
- As a marketer I set up "buy two get one", tiered discounts and category sales with dates.
- As a shopper I see a deal countdown and the remaining quantity.
- As an admin I test a promotion against a sample cart before it goes live.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| PE-01 | Rule-based promotions: buy X get Y, tiered discounts, category-wide sales, scheduled start and end | The cart applies eligible promotions automatically and shows each saving as its own line |
| PE-02 | Flash deals with a stock cap, countdown on home and product pages | The deal ends at the time or when the cap sells out, whichever is first |
| PE-03 | Stacking and priority rules between promotions and coupons | Conflicts resolve the same way every time; the best allowed outcome is applied |
| PE-04 | Customer segments (first order, returning) | Segment offers apply only to matching customers |
| PE-05 | Gift cards and store credit: issue, balance, redeem at checkout | Balance never goes negative; usage is audited |
| PE-06 | Promotion simulator in the admin | A sample cart shows exactly which rules fire and why |
| PE-07 | Price presentation rules (MRP and strike-through) that avoid misleading discounts | A discount label needs a valid earlier price |

## 4. Deliverables
Admin promotion screens and simulator, cart engine changes, deal UI.

## 5. Business rules
1. Server-side pricing only; the browser never decides a discount.

## 6. Non-functional notes
Promotion evaluation must stay fast on large carts.

## 7. What we need from you before starting
- The promotions you plan to run at launch.

## 8. Open questions
- Should loyalty points be included now or later?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
