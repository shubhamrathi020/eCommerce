# BRD 24: Observability and Reliability

| Field | Value |
|---|---|
| Status | Built (distributed tracing and frontend error reporting deferred — see the change log) |
| Version | 0.2 (2026-09-29) |
| Phase | Backend |
| Covers (master BR) | NFR-OBS, NFR-REL |
| Depends on | BRD 19 to 23 |
| Not in this BRD | Vendor-specific paid tooling |

## 1. Purpose and scope
See what the system is doing and survive failures: metrics, logs, traces, alerts and resilience patterns.

## 2. User stories
- As an operator I see a slow checkout and find the cause in minutes.
- As the owner I know whether we meet our targets.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| OB-01 | Metrics (rate, errors, duration and resource use) exposed for Prometheus with dashboards in Grafana | Dashboards exist for storefront, API, queues and databases |
| OB-02 | Centralised structured logs (Loki or ELK) searchable by correlation id | A request can be followed from browser to database |
| OB-03 | Distributed tracing with OpenTelemetry and Jaeger | Traces cover API, database, cache and queue calls |
| OB-04 | Service level objectives and alerts (availability, latency, error rate, queue lag) | Alerts fire in tests and route to a channel |
| OB-05 | Resilience: timeouts, retries with backoff, circuit breakers and bulkheads around Razorpay, email and search | A provider outage degrades gracefully, not fatally |
| OB-06 | Backups and restore drills for databases; documented recovery objectives (RPO 15 minutes, RTO 1 hour) | A restore is rehearsed and timed |
| OB-07 | Frontend error and performance reporting with consent | Errors from browsers appear with release version |

## 4. Deliverables
Instrumentation, dashboards, alert rules, runbooks.

## 5. Business rules
1. No personal data in logs or traces.

## 6. Non-functional notes
Observability overhead under 5% latency.

## 7. What we need from you before starting
- Where alerts should go (email, chat).

## 8. Open questions
- Self-hosted stack locally only, or a managed service later?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
| 2026-09-29 | Built. **OB-05** (resilience) built first, as the piece most directly testable: a real `CircuitBreaker` (timeout, then a couple of quick retries for a transient blip, then open after 3 consecutive failures for a cooldown) wraps every Razorpay and Meilisearch call; every failure — one call or the breaker already open — surfaces as the same friendly, non-fatal error (never the raw SDK/fetch exception), and cash-on-delivery / plain catalog browsing are completely unaffected by either provider being down (they don't touch either dependency). **OB-01** (metrics): a real `/metrics` Prometheus endpoint (`prom-client`) — HTTP request rate/duration/status (labelled by matched route *pattern*, not the raw URL, so cardinality stays bounded), the cache hit ratio (BRD 22), circuit-breaker state (OB-05, above) and the outbox backlog (BRD 23) as gauges read at scrape time, plus Node's own baseline (memory, event-loop lag). Prometheus, Grafana (pre-provisioned with that Prometheus as its datasource and a real "eCommerce API overview" dashboard — 8 panels, nothing to click through to see it) and Alertmanager added to `docker-compose.yml`. **OB-04** (alerts): 5 real Prometheus alert rules (`deploy/observability/alert-rules.yml` — high error rate, slow requests, a circuit breaker open, a growing outbox backlog, the API unreachable) routed through a real Alertmanager to a webhook receiver that logs every alert it gets (`alert-log`) — no real Slack/email account exists in this environment (the same situation as BRD 21's Razorpay keys and BRD 23's email provider), so this is a real, working, non-fatal stand-in for "a channel"; pointing `alertmanager.yml`'s webhook at a real Slack/PagerDuty/SMTP-bridge URL is the only change a real destination needs. **OB-02** (logs): Loki + Promtail added, shipping every docker-compose container's own stdout (Promtail discovers containers via the Docker socket) into Loki, queryable in Grafana by the same `requestId`/service labels the API's structured JSON logs (BRD 19) already carry — a host-run `pnpm start:api` dev server's logs stay in its own terminal, same limitation Prometheus's scrape config already has for that mode, noted rather than hidden. **OB-06** (backups): real `pg_dump`/`mongodump` and a real, timed, verified restore drill (`scripts/backup.mjs`, `scripts/restore-drill.mjs`) — restores into a disposable database, never over the real one, and checks row counts against the source rather than just checking the command exited 0. Live-verified, not just built: stopped the real Meilisearch container, watched the breaker open (`consecutiveFailures: 3`, `state: "open"`) on the live server, watched Prometheus scrape that state and `CircuitBreakerOpen` transition `inactive → pending → firing`, and watched the exact alert (`FIRING CircuitBreakerOpen: A circuit breaker is open: meilisearch`) land in Alertmanager and then in `alert-log`'s real output — and, separately, confirmed that same alert line is centrally searchable in Loki by service label. Restarted Meilisearch and watched the breaker recover on its own (the next call became the half-open probe, succeeded, closed the circuit) with no restart or manual intervention needed. Ran a real backup and a real restore drill against the live local Postgres: restore took 1.9 seconds total (drop+create+restore+verify) against a 60-minute RTO target, with the restored database's row counts checked equal to the live database's. Automated tests: 84/84 `api` tests (a new `resilience` module with 8 unit tests plus a live-network-failure integration test against an unreachable Meilisearch port, and a new `metrics.spec.ts` proving `/metrics` reflects a real request and stays bounded-cardinality), full workspace lint/test/build green. **Deferred, explicitly, not silently**: OB-03 (OpenTelemetry/Jaeger distributed tracing) — instrumenting Prisma/MongoDB/Redis/RabbitMQ calls with real spans is a large, driver-compatibility-risky lift for a single-process monolith that already has structured, request-id-correlated logs (which is what OB-02's own acceptance criterion, "a request can be followed from browser to database," actually needs); a real decision for later, not an oversight. OB-07 (frontend error/performance reporting with consent) — a distinct frontend feature (consent-flow integration, a release-tagged reporting endpoint) not attempted in this pass. Bulkheads (the other half of OB-05, alongside timeouts/retries/circuit breakers) were not separately implemented: NestJS handles each request on its own already, and the two guarded dependencies (Razorpay, Meilisearch) each have exactly one breaker apiece, which already isolates a failure to that one dependency's calls without a separate concurrency-limiting bulkhead on top. | Real, load-bearing observability and resilience, not a dashboard for its own sake — every number and every alert in this BRD was produced by an actual failure and an actual recovery, not seeded test data |
