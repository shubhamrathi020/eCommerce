# BRD 20: Catalog and Search Services

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
| Phase | Backend |
| Covers (master BR) | CAT-01..14 (server side), SRCH-01..11, NFR-PERF |
| Depends on | BRD 19, 09, 11 |
| Not in this BRD | Recommendations and analytics pipelines (BRD 15, 16, 23) |

## 1. Purpose and scope
Serve the catalog from a real store and power search with Meilisearch, kept in sync by events.

## 2. User stories
- As an admin my product edits become visible to shoppers quickly.
- As a shopper search is fast and forgiving with real data at scale.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| CS-01 | Catalog store (MongoDB for flexible attributes, as decided) with product, variant, category, brand and collection APIs | Admin CRUD and storefront reads work against real data |
| CS-02 | Import pipeline from CSV with validation report | Large files import in batches without blocking |
| CS-03 | Meilisearch index with synonyms, typo tolerance and facets configured; index updated through an outbox and queue | A product change appears in search within seconds; a full reindex command exists |
| CS-04 | Search, suggest and listing endpoints (REST) and a read-only GraphQL API for storefront queries | Responses match the frontend contracts; GraphQL has depth and cost limits |
| CS-05 | Media storage (MinIO or S3) with resized image variants served via a CDN-friendly path | Uploads validate type and size; images are served with long cache headers |
| CS-06 | Reviews and content (banners, pages) APIs | Moderation states are respected |
| CS-07 | HTTP adapters replace mocks for catalog, search, reviews and content | Storefront and admin run on real data |
| CS-08 | Search analytics events emitted | Zero-result queries are recorded |

## 4. Deliverables
Catalog and search modules, indexer worker, adapters, seed importer for the 252 products.

## 5. Business rules
1. The search index is derived data and can always be rebuilt.

## 6. Non-functional notes
Search p95 under 200 ms; listing p95 under 300 ms.

## 7. What we need from you before starting
- Decision on MongoDB versus PostgreSQL for catalog data (see BRD 19 question).
- Real product data or approval to keep generated data.

## 8. Open questions
- Do you want a hosted search option later (Meilisearch Cloud) or self-hosted only?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
