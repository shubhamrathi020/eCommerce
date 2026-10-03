# BRD 15: Recommendations and Personalisation

| Field | Value |
|---|---|
| Status | Built (frontend, mock-backed; events are stored on the device) |
| Version | 0.2 (2026-10-03) |
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

## 8. Open questions - decided by default (please confirm or change)
You asked me to proceed without waiting for answers, so these defaults were used:
- **Personalisation at launch:** built now, but it degrades safely. A new visitor, an opted-out visitor, or someone with little history sees "Popular right now" (labelled as such), never an empty gap.
- **What behaviour data may be collected (your approval was needed):** only four kinds of event, each with an anonymous browser id and a time and nothing else: a product view, an add to cart, a purchase (grouped by order so "bought together" can be counted), and the search and checkout-step events the funnel needs. No name, email, phone, address, account id or IP is ever in an event. Recording needs the shopper to accept analytics, and stops if they opt out.
- **Where it lives:** in this demo the events sit in the browser's own storage. The real backend (BRD 23's event stream) would hold them server-side; the engine in `@ecom/shared/models` is written to move there unchanged.
- **Demo data:** about 2,500 deterministic demo events (marked `seed`) generated from the catalog so trending, best sellers and "bought together" have real numbers on day one. They are recomputed each day and never mixed into a shopper's own history.
- **Thresholds:** a browse row needs at least 3 items, a "bought together" row at least 2, a bought-together pairing needs 2 shared orders (admin-editable), and a visitor needs a small amount of recent activity before their own history drives the home page.

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
| 2026-10-03 | Built. RC-01 to RC-06 implemented. Pure, explainable rules (`@ecom/shared/models`: `recommendations.ts`) over tracked events; `AnalyticsService` now feeds an `EVENT_SINK` (consent and opt-out gated, anonymous visitor id), the mock sink stores events on the device; product-page rows (similar, frequently bought together) and home rows (personalised or cold start, trending, best sellers) replace the previous fixed-list heuristics and load after the main content (home rows are `@defer`red); admin page to switch strategies, pin, exclude and boost products and preview rows with the event numbers; a public Personalisation and privacy page (opt out, clear history) linked from the footer and the account page. Verified by 19 data-access tests (rule maths, determinism, consent gating, opt-out, clear history, cold start, hiding thin rows, admin changes taking effect at once, validation, audit), 6 UI flows with axe, and workspace lint/test/build (API unit tests need Docker/Postgres). **Not done, on purpose:** machine-learning ranking (REC-06, P3); server-side event storage; the Frequently-bought-together and Related rows no longer call the catalog API's `related`/`boughtTogether` (they remain in `CatalogApi` for the real backend, which still serves them, but the product page does not use them); a returning-visitor signal across devices (the anonymous id is per browser) | Deliver the recommendations slice of phase 2 |
