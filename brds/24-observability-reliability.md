# BRD 24: Observability and Reliability

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
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
