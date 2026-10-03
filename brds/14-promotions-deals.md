# BRD 14: Promotions Engine and Deals

| Field | Value |
|---|---|
| Status | Built (frontend, mock-backed; the real backend does not run promotions yet) |
| Version | 0.2 (2026-10-03) |
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

## 8. Open questions - decided by default (please confirm or change)
You asked me to proceed without waiting for answers, so these defaults were used. Each is one setting or one rule to change:
- **Loyalty points: not built** (listed as P3 in the scope). Store credit and gift cards cover the "balance" need now.
- **Promotions at launch:** you did not list any, so five demo promotions are seeded to exercise every rule type: "Snack attack" (buy 2 get 1 free on snacks), "Fashion fest" (10% off fashion), "Electronics bonanza" (tiered, exclusive), "Welcome offer" (5% off a first order over ₹999) and a flash deal on the signature tee. Edit or delete them in Admin > Promotions.
- **Stacking rule:** stackable offers combine with each other and with a coupon; an exclusive offer never combines with anything. The largest total saving wins; a tie goes to the stackable set; the order of the list never changes the answer.
- **First-order segment:** a signed-in customer is "first order" until they have one non-cancelled order; a guest is judged by the orders on this device.
- **Misleading-discount rule:** a "% off" label is shown only when the MRP is above the selling price and no more than four times it (75% off). The demo catalog has none that break it.
- **Gift cards:** can pay part or all of an order; store credit (from refunds) works the same way. A cancelled order puts both back. Refunds on an order paid partly with either come back as store credit.

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
| 2026-10-03 | Built. PE-01 to PE-07 implemented. The rules live in one pure engine in `@ecom/shared/models` (`promotions.ts`, plus `priceCart` taking optional extras) so the real commerce API can adopt them; without extras `priceCart` is unchanged and the real backend is untouched. Mock persistence is device-local. Verified by 26 new data-access tests (rule maths, scheduling, segments, flash caps, deterministic conflict resolution, a 500-line cart under 500 ms, gift-card ledger and no-negative balance, cancel refunds, simulator, validation, audit), 9 UI flow tests with axe, and workspace lint/test/build (API unit tests need Docker/Postgres, which was not running). **Not done, on purpose:** loyalty points; the real backend running promotions (with `realCommerce` on the cart shows none of this); a UI-level test of a fully gift-card-paid checkout (covered at the API level only); gift-card codes are not rate-limited against guessing (needs the backend); a purchasable gift-card product. A pre-existing hard-coded MRP assumption was tightened (see PE-07) | Deliver the promotions slice of phase 2 |
