# BRD 16: Analytics and Reporting

| Field | Value |
|---|---|
| Status | Built (frontend, mock-backed; reads the browser-stored event stream plus demo data) |
| Version | 0.2 (2026-10-03) |
| Phase | Phase 2 (frontend) |
| Covers (master BR) | ANL-01..05, ADM-08, SRCH-10 |
| Depends on | BRD 06, 15 |
| Not in this BRD | A full data warehouse (BRD 23 provides the event stream) |

## 1. Purpose and scope
Answer business questions: where shoppers drop off, what sells, what people search for and cannot find.

## 2. User stories
- As an owner I see the shopping funnel and drop-off points.
- As a merchandiser I see top and slow products.
- As a marketer I see which campaigns bring buyers.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| AN-01 | Funnel: product view, add to cart, checkout start, payment, order | Each step shows counts and drop-off percentage for a chosen period |
| AN-02 | Product performance: views, add-to-cart rate, sell-through | Sortable table with export |
| AN-03 | Search analytics: top queries, zero-result queries, click-through | Zero-result list links to the query so it can be fixed with synonyms |
| AN-04 | Cohort and retention view | Weekly cohorts display retention correctly |
| AN-05 | Campaign attribution using UTM parameters | Orders are tagged with the first and last campaign |
| AN-06 | Exports (CSV, PDF) and scheduled reports | A scheduled report arrives in the mock mailbox |

## 4. Deliverables
Admin analytics screens and export, mock aggregate API.

## 5. Business rules
1. Aggregates only; no individual customer tracking screens.

## 6. Non-functional notes
Reports paginate and cache.

## 7. What we need from you before starting
- The five questions you most want answered.

## 8. Open questions - decided by default (please confirm or change)
You asked me to proceed without waiting for answers, so these defaults were used:
- **The five questions answered:** where shoppers drop off (funnel), which products sell and which do not (product performance with sell-through), what people search for and cannot find (search), which campaigns bring buyers (campaigns), and whether buyers come back (cohorts).
- **Report format for accounting:** CSV (opens in any spreadsheet; formula-looking cells are neutralised) plus "Print or save as PDF" from the browser. A designed PDF layout was not built; tell me if your accountant needs specific columns.
- **Revenue figures** are item revenue (units times the price paid) before discounts, shipping and tax, because the event stream does not carry order totals. They are labelled that way on screen; they will not match the orders report to the rupee.
- **Funnel unit:** distinct anonymous visitors per step in the chosen period (7, 30 or 90 days), not sessions.
- **Attribution:** first touch and last touch, from `utm_source`, `utm_medium`, `utm_campaign` in the landing URL, kept 30 days, only after the shopper accepts analytics; orders with none count as "direct".
- **Retention:** weekly cohorts of anonymous visitors by their first order, five weeks.
- **Scheduled reports:** daily or weekly, to any email address, delivered to the mock mailbox in this demo. They are sent when they come due and the schedules page is opened, or on "Send now"; in the real system a scheduled job (BRD 23) does it.

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
| 2026-10-03 | Built. AN-01 to AN-06 implemented over the BRD 15 event stream: shopping funnel, sortable paginated product performance, search analytics with zero-result list linking to the shop's search, weekly cohort retention, campaign attribution (first and last touch, orders tagged), CSV export (whole report, audited), print-to-PDF and scheduled reports delivered to the mock mailbox. Pure aggregate functions live in `@ecom/shared/models` (`analytics.ts`); no function returns one shopper's activity, and a test checks that no visitor id appears in any report. New: `AttributionService` (core), `search_result_click` and campaign tags on funnel events, `Order.attribution`, permission `analytics:read`, `AppConfig.storefrontUrl`. Verified by 16 data-access tests (including consent-gated attribution, 30-day expiry, tag sanitising, order tagging), 6 admin UI flows and 2 storefront flows with axe, and workspace lint/test/build (API unit tests need Docker/Postgres). **Not done, on purpose:** a designed PDF; revenue after discounts/tax; a synonym editor (the zero-result list links to the live search so you can see the problem, but there is no admin screen to add synonyms yet); server-side aggregation (the browser-stored events only reflect this device plus the demo data); the real backend does not tag orders with a campaign | Deliver the analytics slice of phase 2 |
