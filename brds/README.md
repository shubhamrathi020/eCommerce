# Module BRDs

Detailed business requirements per major functionality. The master `../BR-eCommerce-Platform.md` stays the high-level baseline; each module BRD refines its requirement IDs into user stories and acceptance criteria.

## How a BRD is written
1. Pick the master BR requirement IDs the module covers.
2. Follow the template below, using `steering/design.md`, `architecture.md` and `security.md` for shape and rules.
3. Build in vertical slices; when done, add a change log entry describing anything that differed from the plan and commit before starting the next BRD.

**Template:** purpose and scope, user stories, requirements with acceptance criteria, screens or deliverables, data contracts, business rules, non-functional notes, mock-data needs or prerequisites, open questions, change log.

## Index and status

| # | BRD | Phase | Status | Depends on |
|---|---|---|---|---|
| 01 | [Shell and design system](01-shell-design-system.md) | 1 | Built | none |
| 02 | [Catalog](02-catalog.md) | 1 | Built (mock) | 01 |
| 03 | [Search](03-search.md) | 1 | Built (mock engine) | 01, 02 |
| 04 | [Cart and checkout](04-cart-checkout.md) | 1 | Built (mock) | 01, 02 |
| 05 | [Accounts](05-accounts.md) | 1 | Built (mock identity) | 01, 02, 04 |
| 06 | [Admin console](06-admin-console.md) | 1 | Built (mock, separate seeded data) | 01, 02, 04, 05 |
| 07 | [Reviews](07-reviews.md) | 1 | Built (mock) | 02, 04, 05, 06 |
| 08 | [DevOps foundation](08-devops-foundation.md) | 1 | Built (Docker and Kubernetes both verified for real) | all apps |
| 09 | [Content and SEO management](09-content-seo.md) | 1 | Built (mock, placeholders) | 01, 02, 06 |
| 10 | [Notifications and preferences](10-notifications-preferences.md) | 1 | Built (mock) | 04, 05, 06 |
| 11 | [Inventory operations](11-inventory-operations.md) | 1 | Built (mock) | 02, 04, 06 |
| 12 | [Frontend hardening and polish](12-frontend-hardening.md) | 1 | Built (FH-03, 04, 10 consciously deferred) | 01 to 11 |
| 13 | [Returns, refunds and support](13-returns-refunds-support.md) | 2 | Draft | 04, 05, 06, 10, 11 |
| 14 | [Promotions engine and deals](14-promotions-deals.md) | 2 | Draft | 04, 06 |
| 15 | [Recommendations and personalisation](15-recommendations.md) | 2 | Draft | 02, 03, 05, 10 |
| 16 | [Analytics and reporting](16-analytics-reporting.md) | 2 | Draft | 06, 15 |
| 17 | [Marketplace and seller portal](17-marketplace-seller-portal.md) | 2 | Draft | 05, 06, 11, 13 |
| 18 | [Localisation, theming and PWA](18-localisation-theming-pwa.md) | 3 | Draft | 01 to 12 |
| 19 | [Backend foundation and identity API](19-backend-foundation.md) | Backend | Built (identity, accounts, addresses) | 05, 08 |
| 20 | [Catalog and search services](20-catalog-search-services.md) | Backend | Built (catalog, search, admin products) | 19, 09, 11 |
| 21 | [Commerce services](21-commerce-services.md) | Backend | Built (cart, checkout, orders, COD; online payment needs your own Razorpay test keys) | 19, 20, 11 |
| 22 | [Caching and rate limiting](22-caching-rate-limiting.md) | Backend | Built (bot/CAPTCHA hooks and a full metrics dashboard deferred) | 19, 20, 21 |
| 23 | [Messaging, jobs and notifications backend](23-messaging-notifications-backend.md) | Backend | Built (Kafka analytics streaming, SMS/WhatsApp and the CAPTCHA hook out of scope, as planned) | 19 to 21, 10 |
| 24 | [Observability and reliability](24-observability-reliability.md) | Backend | Built (distributed tracing and frontend error reporting deferred) | 19 to 23 |
| 25 | [Kubernetes, cloud and load testing](25-kubernetes-cloud-load-testing.md) | Backend | Draft | 08, 19 to 24 |

## Recommended order from here
1. ~~Finish phase 1 of the frontend: 09, 11, 10, 12~~ — done. Phase 1 (BRDs 01 to 12) is complete.
2. **Sign-off gate:** you verify phase 1 with `docs/VERIFICATION-CHECKLIST.md` and `docs/ACCESSIBILITY-CHECKLIST.md`.
3. **Backend track:** 19 (done: identity, accounts, addresses), 20 (done: catalog, search, admin products), 21 (done: cart, checkout, orders, COD; online payment code is real but needs your own Razorpay test keys to exercise), 22 (done: Redis caching with tagged invalidation, HTTP ETags, per-route rate limiting, a distributed coupon-redemption counter), 23 (done: RabbitMQ messaging with a transactional outbox, retry/dead-letter queues, real order/payment emails, active scheduled jobs, real-time order tracking over SSE), 24 (done: circuit breakers around Razorpay/Meilisearch, Prometheus + Grafana metrics dashboards, Loki-centralised logs, real alert rules routed through Alertmanager, a real timed backup/restore drill; distributed tracing and frontend error reporting deferred) — the shop now notifies customers for real, tracks orders live, degrades gracefully when a provider is down, and is actually observable. Then 25 (Kubernetes, cloud, load tests — also where the API joins the Kubernetes manifests).
4. **Phase 2 and 3 frontend (13 to 18)** can run in parallel with the backend track once phase 1 is signed off; 13, 14 and 17 depend on backend rules being real for full value.
