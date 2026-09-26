# BRD 15: Recommendations and Personalisation

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
| Phase | Phase 2 (frontend) |
| Covers (master BR) | REC-01..05, SRCH-11 (foundation) |
| Depends on | BRD 02, 03, 05, 10 |
| Not in this BRD | Machine-learning ranking and AI assistant (REC-06, P3) |

## 1. Purpose and scope
Show shoppers products they are likely to want, using behaviour events and simple, explainable rules first.

## 2. User stories
- As a shopper I see relevant "you may also like" rows.
- As a returning customer my home page reflects what I browsed.
- As a privacy-minded user I can opt out.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| RC-01 | Event tracking (view, add to cart, purchase) with consent, without personal data in the payload | Nothing is tracked until consent is given |
| RC-02 | Co-purchase and similar-product rows on product pages | Rows hide when data is thin and never show the current product |
| RC-03 | Trending and best sellers by period | Numbers come from tracked events, not hard-coded lists |
| RC-04 | Personalised home rows for signed-in and returning visitors with a sensible cold start | New visitors see popular items instead of an empty section |
| RC-05 | Admin controls to pin, exclude or boost products and to switch a strategy off | Changes take effect without a deploy |
| RC-06 | Privacy controls: opt out and clear history | Opting out removes personalisation and stops tracking |

## 4. Deliverables
Event service (mock), recommendation rows, admin controls.

## 5. Business rules
1. Explainable rules first; no black boxes.

## 6. Non-functional notes
Rows must not delay the page; they load after the main content.

## 7. What we need from you before starting
- Approval of what behaviour data may be collected.

## 8. Open questions
- Is personalisation required at launch or after real traffic exists?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
