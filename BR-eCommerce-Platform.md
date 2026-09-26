# Business Requirements Document (BRD): eCommerce Platform

| Field | Value |
|---|---|
| Version | 1.0 (Baseline, decisions finalised) |
| Date | 2026-09-26 |
| Owner | Shubham Rathi |
| Status | Approved baseline; living document (updated on every scope change) |
| Purpose | Define what the platform must do (business view). Design and implementation come after this is approved. |

**Priority legend (MoSCoW):** **M** = Must have, **S** = Should have, **C** = Could have, **W** = Won't have (this release).
**Phase legend:** **P1** = MVP, **P2** = Growth, **P3** = Scale/Advanced.

---

## 1. Vision & Objectives

Build a modern, multi-vendor-capable, cloud-native eCommerce web application in the class of Amazon/Flipkart/Shopify storefronts. It serves as (a) a functional product and (b) a reference implementation of production-grade system design.

**Business objectives**
1. Let customers discover, buy and receive products with a fast, trustworthy, low-friction experience.
2. Let sellers and admins manage catalog, inventory, orders, pricing and promotions efficiently.
3. Handle traffic spikes (sales, flash deals) without downtime or overselling.
4. Be secure, auditable and compliant (payments, privacy).
5. Serve as a learning platform demonstrating caching, queues, rate limiting, search, containers, orchestration, observability, etc.

**Success metrics (targets)**

| Metric | Target |
|---|---|
| Page load (LCP) on product/listing pages | < 2.5 s (p75) |
| API latency (read) | p95 < 300 ms; (write) p95 < 800 ms |
| Search latency | p95 < 200 ms |
| Availability | 99.9% |
| Checkout conversion | > 2.5% |
| Cart abandonment | < 70% |
| Oversell incidents | 0 |
| Peak load | 1,000 orders/min, 10,000 concurrent users (design target) |

## 2. Scope

### 2.1 In scope
- Customer storefront (web, responsive/PWA)
- Seller/vendor portal
- Admin/back-office console
- Backend services and APIs (REST + GraphQL)
- Search, recommendations, notifications, payments, shipping integrations
- Infra: containers, orchestration, CI/CD, monitoring

### 2.2 Out of scope (this release)
- Native mobile apps (PWA covers mobile; native is P3+)
- Physical warehouse robotics / WMS depth beyond stock tracking
- Own payment gateway/PCI card vault (use a PSP such as Stripe/Razorpay)
- Own logistics fleet (integrate carriers)
- Live-stream commerce, AR try-on, blockchain/NFT

### 2.3 Assumptions
- Third-party PSP, email/SMS, maps and shipping providers are used via sandbox/test mode.
- Single currency/region at launch (India, INR) with the design ready for multi-currency and i18n.
- Initially a single company operates the store; the marketplace (multi-seller) is enabled in P2.

### 2.4 Constraints
- Stack: Angular (frontend), Node.js (backend), PostgreSQL and/or MongoDB, GraphQL.
- Must run locally via Docker Compose and deploy to Kubernetes.

## 3. Stakeholders & User Personas

| Persona | Description | Key needs |
|---|---|---|
| Guest shopper | Unregistered visitor | Browse, search, cart, guest checkout |
| Registered customer | Account holder | Wishlist, order history, saved addresses/payments, returns |
| Seller / Vendor | Sells on the platform (P2) | List products, manage stock/orders, payouts, analytics |
| Admin | Store operator | Full catalog, users, orders, promotions, config, reports |
| Customer support agent | Handles issues | View orders/users, refunds, tickets |
| Warehouse / Fulfilment staff | Packs and ships | Pick lists, labels, stock updates |
| Marketing manager | Runs campaigns | Coupons, banners, SEO, segments |
| Finance | Reconciliation | Payments, refunds, settlements, tax reports |
| Developer / DevOps | Runs the platform | Observability, deployments, feature flags |

---

## 4. Functional Requirements

Each requirement has an ID. Priority / Phase columns are proposed and open to change during review.

### 4.1 Identity, Authentication & Account (AUTH)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| AUTH-01 | Register with email + password; email verification | M | P1 |
| AUTH-02 | Login/logout, refresh tokens, "remember me" | M | P1 |
| AUTH-03 | Password reset via email link/OTP | M | P1 |
| AUTH-04 | Social login (Google; optionally Facebook/Apple) | S | P1 |
| AUTH-05 | Phone/OTP login | S | P2 |
| AUTH-06 | Multi-factor authentication (TOTP/SMS) for admins, optional for users | S | P2 |
| AUTH-07 | Role-based access control (customer, seller, admin, support, etc.) with fine-grained permissions | M | P1 |
| AUTH-08 | Session/device management, and logout from all devices | C | P2 |
| AUTH-09 | Account lockout / throttling after failed logins, CAPTCHA on abuse | M | P1 |
| AUTH-10 | Profile management (name, phone, avatar, preferences) | M | P1 |
| AUTH-11 | Address book (multiple addresses, default shipping/billing) | M | P1 |
| AUTH-12 | Saved payment methods (tokenised via PSP) | S | P2 |
| AUTH-13 | Account deletion / data export (GDPR-style) | S | P2 |
| AUTH-14 | Guest checkout and guest-to-account conversion | M | P1 |

### 4.2 Product Catalog (CAT)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| CAT-01 | Product CRUD: title, description (rich text), brand, images, videos, specs, tags | M | P1 |
| CAT-02 | Hierarchical categories & subcategories, breadcrumbs | M | P1 |
| CAT-03 | Variants/options (size, colour, etc.) with per-variant SKU, price, stock, images | M | P1 |
| CAT-04 | Product attributes/facets configurable per category | M | P1 |
| CAT-05 | Bulk import/export (CSV/Excel) with validation and error report | S | P2 |
| CAT-06 | Product bundles / kits / "frequently bought together" | C | P3 |
| CAT-07 | Brands and collections (curated groups) | S | P2 |
| CAT-08 | Draft / published / archived lifecycle, scheduled publish | S | P2 |
| CAT-09 | Digital products / downloadable goods and gift cards | C | P3 |
| CAT-10 | Media management: multiple images, zoom, CDN-served, auto-resize/WebP | M | P1 |
| CAT-11 | SEO fields per product/category (slug, meta title/description, structured data/JSON-LD) | M | P1 |
| CAT-12 | Product Q&A | C | P3 |
| CAT-13 | Localised product content (multi-language) | C | P3 |
| CAT-14 | Approval workflow for seller-submitted products | S | P2 |

### 4.3 Search & Discovery (SRCH)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| SRCH-01 | Full-text search across title, description, brand, category, SKU | M | P1 |
| SRCH-02 | Autocomplete / type-ahead suggestions | M | P1 |
| SRCH-03 | Typo tolerance / fuzzy matching, synonyms, stemming | M | P1 |
| SRCH-04 | Faceted filtering (price, brand, rating, attributes, availability) and sorting | M | P1 |
| SRCH-05 | Relevance ranking with boosts (popularity, stock, margin, sponsored) | S | P2 |
| SRCH-06 | "Did you mean", zero-result handling, popular/trending searches | S | P2 |
| SRCH-07 | Recent searches and search history per user | C | P2 |
| SRCH-08 | Near-real-time index sync from catalog/inventory changes | M | P1 |
| SRCH-09 | Visual/voice/barcode search | C | P3 |
| SRCH-10 | Search analytics (top queries, no-result queries, CTR) | S | P2 |
| SRCH-11 | Personalised ranking | C | P3 |

### 4.4 Storefront Experience (UX)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| UX-01 | Home page with banners, featured categories, deals, recommendations (CMS-driven) | M | P1 |
| UX-02 | Product listing page: grid/list, pagination or infinite scroll, filters | M | P1 |
| UX-03 | Product detail page: gallery, variant picker, price, stock, delivery estimate, reviews | M | P1 |
| UX-04 | Responsive design (mobile-first), accessibility (WCAG 2.1 AA) | M | P1 |
| UX-05 | PWA: installable, offline shell, push notifications | S | P3 |
| UX-06 | Server-side rendering (Angular SSR) for SEO and speed | M | P1 |
| UX-07 | Dark mode, i18n / RTL support | C | P3 |
| UX-08 | Recently viewed, compare products | S | P2 |
| UX-09 | Static/CMS pages (About, FAQ, T&C, Privacy, Contact) | M | P1 |
| UX-10 | Sitemap, robots, canonical URLs, Open Graph tags | M | P1 |
| UX-11 | Cookie consent and privacy preferences | M | P1 |

### 4.5 Wishlist, Reviews & Social (ENG)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| ENG-01 | Wishlist (add/remove/move to cart, share) | M | P1 |
| ENG-02 | Ratings and reviews (verified purchase badge, photos) | M | P1 |
| ENG-03 | Review moderation (profanity/spam filter, admin approve/reject) | S | P2 |
| ENG-04 | Helpful votes, sort/filter reviews | S | P2 |
| ENG-05 | Back-in-stock and price-drop alerts | S | P2 |
| ENG-06 | Share product on social channels | C | P2 |
| ENG-07 | Referral programme | C | P3 |

### 4.6 Cart (CART)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| CART-01 | Add/update/remove items; quantity limits | M | P1 |
| CART-02 | Cart persists for guests (cookie/session) and users (server side); merge on login | M | P1 |
| CART-03 | Real-time price and stock validation in the cart | M | P1 |
| CART-04 | Apply/remove coupons; show discount breakdown | M | P1 |
| CART-05 | Shipping and tax estimation before checkout | S | P1 |
| CART-06 | Save for later, cart sharing | C | P2 |
| CART-07 | Abandoned-cart reminders (email/push) | S | P2 |
| CART-08 | Soft stock reservation while in checkout (time-boxed) | S | P2 |

### 4.7 Checkout & Payments (PAY)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| PAY-01 | Multi-step checkout: address, shipping method, payment, review | M | P1 |
| PAY-02 | Online payments via PSP: cards, UPI, net banking, wallets | M | P1 |
| PAY-03 | Cash on Delivery (with eligibility rules and limits) | S | P1 |
| PAY-04 | 3-D Secure / SCA support | M | P1 |
| PAY-05 | Idempotent payment/order creation (no double charges on retry) | M | P1 |
| PAY-06 | Webhook handling for async payment status; reconciliation job | M | P1 |
| PAY-07 | Refunds (full/partial) to the original method | M | P1 |
| PAY-08 | EMI / Buy-Now-Pay-Later | C | P3 |
| PAY-09 | Store credit / wallet / gift card redemption | S | P2 |
| PAY-10 | Multi-currency pricing and display | C | P3 |
| PAY-11 | Invoice generation (PDF) with GST/tax details | M | P1 |
| PAY-12 | Fraud checks (velocity rules, risk scoring, AVS/CVV via PSP) | S | P2 |
| PAY-13 | Split payments / seller payouts (marketplace) | S | P2 |

### 4.8 Pricing, Promotions & Tax (PRM)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| PRM-01 | Base price, sale price, scheduled price changes | M | P1 |
| PRM-02 | Coupon codes (percent/flat/free shipping; min cart value; usage caps; expiry) | M | P1 |
| PRM-03 | Automatic promotions (buy X get Y, tiered discounts, category-wide sales) | S | P2 |
| PRM-04 | Flash sales / lightning deals with countdown and limited stock | S | P2 |
| PRM-05 | Customer-segment or first-order pricing | C | P3 |
| PRM-06 | Loyalty points: earn and redeem | C | P3 |
| PRM-07 | Tax engine (GST/VAT, inclusive/exclusive, HSN codes, regional rules) | M | P1 |
| PRM-08 | Promotion stacking and conflict rules | S | P2 |
| PRM-09 | Price rules for B2B/wholesale tiers | C | P3 |

### 4.9 Inventory Management (INV)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| INV-01 | Stock level per SKU; available/reserved/committed counts | M | P1 |
| INV-02 | Prevent overselling under concurrent orders | M | P1 |
| INV-03 | Multi-warehouse / location inventory | S | P2 |
| INV-04 | Low-stock and out-of-stock alerts, backorder/pre-order options | S | P2 |
| INV-05 | Stock adjustments with reason codes and audit trail | M | P1 |
| INV-06 | Purchase orders / supplier management | C | P3 |
| INV-07 | Reservation release on payment failure/timeout/cancel | M | P1 |
| INV-08 | Inventory sync API/CSV for sellers | S | P2 |

### 4.10 Orders & Fulfilment (ORD)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| ORD-01 | Order lifecycle: Placed, Paid, Confirmed, Packed, Shipped, Out for delivery, Delivered, Cancelled, Returned, Refunded | M | P1 |
| ORD-02 | Order confirmation page + email/SMS | M | P1 |
| ORD-03 | Customer order history, order detail, invoice download | M | P1 |
| ORD-04 | Customer-initiated cancellation (before shipping) | M | P1 |
| ORD-05 | Order tracking with carrier status timeline | M | P1 |
| ORD-06 | Split orders/shipments (multi-seller or multi-warehouse) | S | P2 |
| ORD-07 | Admin order management: search, filter, status update, notes, manual order creation | M | P1 |
| ORD-08 | Pick/pack workflow, packing slips, shipping labels | S | P2 |
| ORD-09 | Shipping carrier integration (rates, label, tracking webhooks) | S | P2 |
| ORD-10 | Shipping rules: flat, weight/zone based, free-shipping threshold, delivery-date estimation, pin-code serviceability | M | P1 |
| ORD-11 | Delivery slots / express / same-day | C | P3 |
| ORD-12 | Order audit log (who changed what, when) | M | P1 |

### 4.11 Returns, Refunds & Support (RET)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| RET-01 | Return/exchange request with reason and images, per return policy window | M | P2 |
| RET-02 | Return approval workflow, reverse pickup, QC, restock or scrap | S | P2 |
| RET-03 | Refund processing linked to payment module | M | P2 |
| RET-04 | Support tickets/contact form; order-linked | S | P2 |
| RET-05 | Live chat / chatbot for FAQs and order status | C | P3 |
| RET-06 | Dispute management (chargebacks) | C | P3 |

### 4.12 Marketplace & Seller Portal (SEL)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| SEL-01 | Seller onboarding with KYC and admin approval | S | P2 |
| SEL-02 | Seller dashboard: products, orders, inventory, earnings | S | P2 |
| SEL-03 | Commission rules per category/seller; payout schedule and statements | S | P2 |
| SEL-04 | Seller ratings and policies | C | P3 |
| SEL-05 | Seller-level shipping settings and returns | C | P3 |
| SEL-06 | Seller analytics and reports | C | P3 |
| SEL-07 | Sponsored listings / ads | C | P3 |

### 4.13 Admin & Back-office (ADM)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| ADM-01 | Dashboard: sales, orders, revenue, AOV, top products, low stock, conversion | M | P1 |
| ADM-02 | Manage users, roles, permissions | M | P1 |
| ADM-03 | Manage catalog, categories, brands, media | M | P1 |
| ADM-04 | Manage orders, payments, refunds, shipments | M | P1 |
| ADM-05 | Manage coupons, promotions, banners, CMS pages | M | P1 |
| ADM-06 | Store settings: currency, tax, shipping, payment methods, email templates | M | P1 |
| ADM-07 | Audit logs and activity history | M | P1 |
| ADM-08 | Reports and export (CSV/Excel/PDF): sales, tax, inventory, customers | S | P2 |
| ADM-09 | Feature flags / A-B test management | C | P3 |
| ADM-10 | Bulk actions across all lists | S | P2 |
| ADM-11 | Customer segmentation and campaign targeting | C | P3 |

### 4.14 Notifications (NTF)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| NTF-01 | Transactional email (verify, order confirm, shipped, delivered, refund) | M | P1 |
| NTF-02 | SMS/WhatsApp notifications for order events and OTP | S | P2 |
| NTF-03 | Web push and in-app notification centre | S | P2 |
| NTF-04 | Templated, localised, admin-editable messages | S | P2 |
| NTF-05 | User notification preferences and unsubscribe | M | P1 |
| NTF-06 | Marketing emails/newsletters | C | P3 |
| NTF-07 | Retry with backoff, delivery status tracking, dead-letter handling | M | P1 |

### 4.15 Recommendations & Personalisation (REC)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| REC-01 | Related / similar products | S | P2 |
| REC-02 | "Customers also bought" (co-purchase) | S | P2 |
| REC-03 | Personalised home feed based on behaviour | C | P3 |
| REC-04 | Trending / best sellers / new arrivals | S | P2 |
| REC-05 | Behaviour event tracking pipeline (views, clicks, add-to-cart, purchases) | S | P2 |
| REC-06 | ML-based ranking / AI assistant / semantic search | C | P3 |

### 4.16 Analytics & Reporting (ANL)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| ANL-01 | Business KPIs: GMV, orders, AOV, conversion funnel, cohort/retention | S | P2 |
| ANL-02 | Product analytics: views, add-to-cart rate, sell-through | S | P2 |
| ANL-03 | Marketing attribution (UTM tracking) | C | P3 |
| ANL-04 | Event streaming to a warehouse/analytics store | C | P3 |
| ANL-05 | Scheduled report delivery | C | P3 |

### 4.17 Content & SEO (CMS)

| ID | Requirement | Pri | Ph |
|---|---|---|---|
| CMS-01 | Manage banners, homepage sections, landing pages | M | P1 |
| CMS-02 | Blog/content pages | C | P3 |
| CMS-03 | SEO: URL slugs, redirects (301), sitemap.xml, structured data | M | P1 |
| CMS-04 | Email/notification template editor | S | P2 |

---

## 5. Non-Functional Requirements

### 5.1 Performance & Scalability (NFR-PERF)
- Horizontally scalable, stateless services; autoscaling on CPU/RPS/queue depth.
- Read-heavy paths (catalog, search, listing) served from cache/CDN wherever possible.
- Support flash-sale spikes (10x normal traffic) without oversell or data loss.
- Pagination on all lists; cursor-based for large sets.
- Lazy loading, code splitting, image optimisation on the frontend.

### 5.2 Availability & Reliability (NFR-REL)
- 99.9% uptime target; no single point of failure in the design.
- Graceful degradation (e.g., if recommendations or search fail, the site still works).
- Circuit breakers, timeouts, retries with backoff, bulkheads between services.
- Backups (PITR for databases), tested restore, RPO ≤ 15 min, RTO ≤ 1 h.
- Zero-downtime deployments (rolling/blue-green/canary).

### 5.3 Consistency & Data Integrity (NFR-DATA)
- Strong consistency for money, inventory, orders (ACID).
- Eventual consistency accepted for search index, recommendations, analytics.
- Distributed transactions handled via saga/outbox patterns; all handlers idempotent.
- Full audit trail for financial and admin actions.

### 5.4 Security & Compliance (NFR-SEC)
- OWASP Top 10 mitigation (XSS, CSRF, SQLi/NoSQLi, SSRF, etc.); input validation everywhere.
- Passwords hashed (Argon2/bcrypt); JWT with short-lived access + rotating refresh tokens.
- TLS everywhere; secrets in a vault/K8s secrets; encryption at rest for PII.
- PCI-DSS scope minimised (card data never touches our servers; PSP tokenisation).
- Rate limiting, bot protection, WAF; API abuse protection.
- GDPR/DPDP-style privacy: consent, data export/erasure, data-retention policy.
- Regular dependency and container vulnerability scanning; SAST/DAST in CI.
- Least-privilege RBAC; admin actions logged.

### 5.5 Observability (NFR-OBS)
- Structured logging with correlation/trace IDs; centralised log storage.
- Metrics (RED/USE), dashboards, and alerts (SLO based).
- Distributed tracing across services.
- Health/readiness/liveness endpoints; synthetic uptime checks.

### 5.6 Usability & Accessibility (NFR-UX)
- Mobile-first responsive design; WCAG 2.1 AA; support for latest 2 versions of major browsers.
- Consistent design system; clear errors and empty states.

### 5.7 Maintainability & Operability (NFR-MNT)
- Clean modular architecture; API documentation (OpenAPI + GraphQL schema).
- Automated tests: unit, integration, contract, E2E, load (target ≥ 80% coverage on core services).
- CI/CD with automated build, test, scan, deploy; infrastructure as code.
- Config via environment; feature flags; database migrations versioned.

### 5.8 Portability & Localisation (NFR-LOC)
- Containerised; runs on any Kubernetes cluster / cloud.
- i18n-ready (strings externalised), multi-currency-ready data model, timezone-safe.

---

## 6. System Design Concepts to Demonstrate

This maps each concept to where it is applied in the product, so the technology exercises are tied to real requirements.

| Concept | Where it's applied | Related reqs | Phase |
|---|---|---|---|
| **Caching** (CDN, browser, Redis cache-aside, write-through, TTL/invalidation, cache stampede protection) | Product/category pages, home page, sessions, cart, price/stock snapshot, search suggestions | CAT, UX, SRCH, CART | P1 |
| **Message queue / event streaming** (RabbitMQ/Kafka/BullMQ) | Order events, email/SMS, inventory sync, search indexing, analytics ingestion | ORD, NTF, INV, SRCH | P1 |
| **Rate limiting & throttling** (token bucket / sliding window, per IP/user/API key) | Login, OTP, search, checkout, public APIs | AUTH-09, NFR-SEC | P1 |
| **Universal search** (Elasticsearch/OpenSearch/Meilisearch) | Products, categories, brands, orders/users in admin | SRCH | P1 |
| **API gateway / BFF** (routing, auth, aggregation) | Single entry for web, seller, admin clients | All | P1 |
| **REST + GraphQL** | REST for transactions/webhooks; GraphQL for flexible storefront queries | UX, CAT | P1 |
| **Microservices / modular monolith** with service boundaries (auth, catalog, cart, order, payment, inventory, notification, search) | Whole platform (start as a modular monolith, split selectively) | All | P1-P2 |
| **Polyglot persistence** (PostgreSQL for transactional data, MongoDB for catalog/flexible docs, Redis for cache/session, search index) | Data layer | NFR-DATA | P1 |
| **Saga / outbox / idempotency** | Order, payment, inventory workflow | PAY-05, INV-07 | P1 |
| **Concurrency control** (optimistic/pessimistic locking, Redis distributed locks, atomic decrement) | Inventory reservation, coupon usage caps | INV-02, PRM-02 | P1 |
| **CQRS / event sourcing (selective)** | Order history, search read-models, analytics | ORD, ANL | P3 |
| **Database scaling** (indexing, read replicas, partitioning/sharding, connection pooling) | Orders, events, catalog | NFR-PERF | P2 |
| **Circuit breaker, retry, timeout, bulkhead** | PSP, carrier, email provider calls | NFR-REL | P2 |
| **Dead-letter queues & retry policies** | Notification, payment webhooks | NTF-07, PAY-06 | P1 |
| **Background jobs & scheduling (cron)** | Abandoned carts, reconciliation, report generation, expiry of reservations | CART-07, PAY-06 | P1 |
| **File/object storage + CDN** (S3/MinIO) | Product images, invoices, KYC docs | CAT-10 | P1 |
| **Containerisation (Docker) & orchestration (Kubernetes)**: Deployments, Services, Ingress, HPA, ConfigMaps/Secrets, probes, Helm | Deployment of every service | NFR-MNT | P1-P2 |
| **CI/CD & IaC** (GitHub Actions, Helm/Terraform) | Build, test, scan, deploy | NFR-MNT | P1-P2 |
| **Observability** (Prometheus, Grafana, Loki/ELK, OpenTelemetry/Jaeger) | Platform-wide | NFR-OBS | P2 |
| **Load balancing, autoscaling, blue-green/canary** | Ingress and K8s | NFR-REL | P2 |
| **Security patterns** (OAuth2/OIDC, JWT rotation, RBAC, WAF, secrets mgmt) | Auth and edge | NFR-SEC | P1-P2 |
| **Feature flags & A/B testing** | Rollouts | ADM-09 | P3 |
| **Real-time** (WebSockets/SSE) | Order tracking, stock/price updates, notifications | ORD-05, NTF-03 | P2 |
| **Data pipeline / analytics** (event stream to warehouse) | Recommendations, BI | REC, ANL | P3 |
| **Multi-tenancy** | Marketplace sellers | SEL | P2 |
| **Testing at scale** (k6/JMeter load tests, chaos tests) | Flash-sale scenarios | NFR-PERF | P2 |

---

## 7. Proposed Technology Direction (for discussion, not final)

| Layer | Proposal | Notes |
|---|---|---|
| Frontend | Angular (latest LTS) + SSR, NgRx/Signals, Angular Material or Tailwind, PWA | Three apps: storefront, admin, seller (Nx monorepo) |
| API layer | Node.js (NestJS/TypeScript) with REST + GraphQL (Apollo) | API gateway/BFF |
| Transactional DB | PostgreSQL | Users, orders, payments, inventory, promotions |
| Document DB | MongoDB | Catalog with flexible attributes, reviews, CMS content (optional; decision in review) |
| Cache/session/locks | Redis | |
| Queue / events | RabbitMQ or Kafka (+ BullMQ for jobs) | To decide in review |
| Search | Elasticsearch / OpenSearch (or Meilisearch for lighter option) | |
| Object storage | MinIO (local) / S3 | |
| Infra | Docker, Docker Compose (local), Kubernetes (kind/minikube locally; cloud later), Helm, NGINX Ingress | |
| Observability | Prometheus, Grafana, Loki, OpenTelemetry, Jaeger | |
| CI/CD | GitHub Actions | |
| Third-party | Stripe/Razorpay (test), SendGrid/SES or Mailhog (dev), Twilio (test), carrier sandbox (Shiprocket/Delhivery) | |

**Suggested architecture approach:** start as a **modular monolith** with clear domain modules and event-driven boundaries, then extract high-load services (search, inventory, notification, order) into separate deployables in P2, so system design concepts are introduced progressively without early complexity.

---

## 8. Release Roadmap (proposed)

| Phase | Theme | Highlights |
|---|---|---|
| **P1: MVP** | Core buy flow, secure and fast | Auth/RBAC, catalog + variants, search + facets, cart, checkout + PSP + COD, orders, inventory with concurrency safety, coupons, tax/invoice, email notifications, admin basics, Redis cache, queue, rate limiting, Docker Compose, basic CI |
| **P2: Growth** | Marketplace, operations, resilience | Sellers and payouts, returns/refunds, multi-warehouse, carrier integration, promotions engine, reviews moderation, recommendations v1, real-time tracking, SMS/push, analytics, K8s deploy + HPA, observability, circuit breakers, load testing |
| **P3: Scale/Advanced** | Intelligence and reach | Personalisation/ML, semantic/visual search, loyalty, BNPL, multi-currency/i18n, PWA/push, feature flags/A-B, CQRS/event streaming to warehouse, chat/chatbot, ads |

## 9. Key Business Rules (initial list)

1. A product variant can only be purchased if `available stock ≥ requested quantity`; stock is reserved at checkout start for a configurable window (default 10 min) and released on failure/timeout.
2. An order is confirmed only after payment success (or COD confirmation).
3. Coupons are validated server-side at cart and again at order placement; usage caps are enforced atomically.
4. Prices are captured on the order at placement time and are immutable afterwards.
5. Cancellation is allowed only before the "Shipped" state; refunds are issued to the original payment method.
6. Returns are allowed within a configurable window (default 7 days from delivery) for eligible categories.
7. Every stock change, price change, refund and admin action is audit logged.
8. Payment and order-creation APIs are idempotent via client-supplied keys.
9. Reviews are allowed only from verified purchasers (configurable).
10. COD is limited by order value, pin-code and customer history.

## 10. Risks & Dependencies

| Risk | Impact | Mitigation |
|---|---|---|
| Scope too large for one build | Delays | Strict phased roadmap; MVP first |
| Over-engineering with microservices too early | Complexity | Modular monolith first, extract later |
| Overselling under load | Revenue/brand loss | Atomic reservation, locks, load tests |
| Payment inconsistency (paid but no order) | Financial | Webhooks + reconciliation + idempotency |
| Search/DB drift | Wrong results | Outbox events + reindex job |
| Third-party outages | Failed flows | Timeouts, retries, circuit breakers, fallbacks |
| Security/PII exposure | Legal | Threat modelling, encryption, least privilege |
| Local machine limits (many containers) | Slow dev | Compose profiles; run only needed services |

## 11. Decisions Log (resolved from review, 2026-09-26)

| # | Question | Decision |
|---|---|---|
| 1 | Business model | Single store (B2C) in P1; marketplace in P2 (as proposed) |
| 2 | Product niche | **General-purpose, all major categories** (fashion, electronics, grocery, etc.). Catalog attributes/variants must be category-driven and configurable, not hard-coded per niche |
| 3 | Region / currency | India, INR, GST first; design stays multi-currency/i18n-ready |
| 4 | Databases | PostgreSQL + MongoDB (Mongo for the flexible catalog) + Redis |
| 5 | Message broker | RabbitMQ in P1; Kafka for analytics in P3 |
| 6 | Search engine | **Meilisearch first**; Elasticsearch/OpenSearch can be revisited later |
| 7 | Payment gateway | **Razorpay** (test mode) |
| 8 | Architecture | **Modular monolith first**, extract services later |
| 9 | Kubernetes | **Local first** (kind/minikube); cloud added later |
| 10 | B2B features | Deferred. Add later only if it does not disrupt existing development; keep the pricing/customer model extensible (customer groups, price tiers) so it stays cheap to add |
| 11 | P2/P3 scope | Keep as is |
| 12 | Team / timeline | Solo build, no fixed timeline; deliver in vertical slices |

**Build order:** frontend first (Angular, running on dummy/mock data behind swappable data-access interfaces), then backend, then infra. Each major functionality gets its own detailed BRD under `brds/`, and BRDs are updated whenever scope changes.

## 12. Approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Product owner | Shubham Rathi | Approved (baseline v1.0) | 2026-09-26 |

**Next steps:** (1) steering docs (`steering/`), (2) frontend scaffold (Nx monorepo, Angular), (3) per-module BRDs in `brds/` as each module starts, (4) build P1 storefront on mock data, then admin, then backend.
