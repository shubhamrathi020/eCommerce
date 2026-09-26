# BRD 16: Analytics and Reporting

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
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

## 8. Open questions
- Which report format do you need for accounting?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
