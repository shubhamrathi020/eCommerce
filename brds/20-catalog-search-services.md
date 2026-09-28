# BRD 20: Catalog and Search Services

| Field | Value |
|---|---|
| Status | Built: catalog store, search, listing/facets, category tree, admin product management, storefront wiring (CS-01, CS-03, CS-04 REST part, CS-07 catalog/search/category part) |
| Version | 0.2 (2026-09-28) |
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
| 2026-09-28 | Catalog store built on MongoDB (native driver, not Prisma's Mongo connector — kept Prisma scoped to Postgres). Seeded with the exact same 252-product fixture the frontend mock uses (`pnpm db:seed:catalog`) so both sides start from one dataset | CS-01, CS-02 (seed importer only; CSV upload deferred) |
| 2026-09-28 | Meilisearch index built: synonyms (mirrors the mock's groups), typo tolerance (Meilisearch default), per-attribute/variant-axis facets, exact "ignore this facet's own filter" counts (extra targeted queries, matching the mock's `matching(ignore)` behaviour), price-range facet stats. Listing, search and category-tree REST endpoints serve real data | CS-03 (index+facets part; outbox/queue deferred, see below), CS-04 (REST part; GraphQL deferred) |
| 2026-09-28 | Admin product management (list/get/create/update/bulk status/bulk delete-drafts) against the real store, permission-enforced server side, keeps Meilisearch in sync on every write. A real fix along the way: draft/archived products are now genuinely invisible to shoppers on the same store admin manages — a real gap in BRD 06's mock (which used entirely separate, disconnected data for admin vs. shop) that is now closed for real | CS-01 (admin CRUD part) |
| 2026-09-28 | Frontend wiring: `HttpCatalogApi`/`HttpCategoryApi`/`HttpSearchApi`/`HttpAdminProductApi` behind a new `AppConfig.realCatalog` flag (default `false`); cart, checkout, orders, reviews (write side) and content stay on mocks. Verified live in a browser with `realCatalog: true`: home, category browsing, typo-tolerant search ("smartphon" → 4 smartphones), a product page (variants, related, bought-together, reviews) and facet filtering all confirmed hitting the real API by reading the network log, not assumed | CS-07 (catalog/search/category part) |
| 2026-09-28 | 25 new backend integration tests (Vitest + supertest against real Mongo + real Meilisearch) plus 12 new frontend adapter tests (`HttpTestingController`) — 47/47 api tests, 135/135 shared-data-access tests | Verification |
| 2026-09-28 | Deliberately not in this slice (recorded, not silent): CSV import pipeline (CS-02's upload part), GraphQL API (CS-04's other half), media/upload storage — CS-05, existing static image paths reused as-is, outbox+queue between Mongo and Meilisearch — CS-03's ideal (BRD 23 hasn't built messaging yet, so writes sync directly instead), reviews/content write side (CS-06, `ReviewApi`/`AdminContentApi` stay mock; `CatalogApi.reviews()` itself is real, reading the same seeded reviews), search analytics events (CS-08) | Scoped down, same pattern as BRD 19 |
