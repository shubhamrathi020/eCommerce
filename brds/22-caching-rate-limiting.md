# BRD 22: Caching and Rate Limiting

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
| Phase | Backend |
| Covers (master BR) | NFR-PERF, NFR-SEC, AUTH-09 |
| Depends on | BRD 19, 20, 21 |
| Not in this BRD | Edge or CDN configuration beyond headers |

## 1. Purpose and scope
Make reads fast and protect the system from abuse, using Redis and clear invalidation rules.

## 2. User stories
- As a shopper pages load fast even during a sale.
- As an operator brute-force and scraping attempts are throttled.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| CR-01 | Cache-aside caching for home, category, product and search responses with TTLs and tagged invalidation | Editing a product clears exactly its cached views |
| CR-02 | Stampede protection (locking or request coalescing) for hot keys | A cache miss on a hot key triggers one backend fetch |
| CR-03 | HTTP caching headers and ETags; CDN-ready static assets | Repeat visits use conditional requests |
| CR-04 | Rate limiting (token bucket or sliding window) per IP, user and API key for login, reset, search, coupon and checkout endpoints | Limits return 429 with a retry-after header; limits are configurable |
| CR-05 | Distributed counters for coupon usage caps and stock reservations | Caps hold under concurrent requests |
| CR-06 | Bot and abuse hooks (CAPTCHA integration point, suspicious pattern log) | Repeated abuse is logged and can trigger a challenge |
| CR-07 | Cache and limiter metrics | Hit ratio and blocked requests are visible on a dashboard |

## 4. Deliverables
Redis layer, decorators and middleware, config, tests including concurrency.

## 5. Business rules
1. Never cache personalised or private responses in shared caches.

## 6. Non-functional notes
Hit ratio above 80% for catalog reads under load tests.

## 7. What we need from you before starting
- Approve default limits (proposed: 5 logins per 15 minutes per email).

## 8. Open questions
- Do you plan a CDN at launch?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
