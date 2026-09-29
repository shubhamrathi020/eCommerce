# BRD 23: Messaging, Jobs and Notifications Backend

| Field | Value |
|---|---|
| Status | Built (Kafka analytics streaming, SMS/WhatsApp and the CAPTCHA integration point remain out of scope, as planned) |
| Version | 0.2 (2026-09-29) |
| Phase | Backend |
| Covers (master BR) | NTF-01..07, SRCH-08, ANL-04, CART-07, ORD-05 (real time) |
| Depends on | BRD 19, 20, 21, 10 |
| Not in this BRD | Kafka analytics streaming (optional later) |

## 1. Purpose and scope
Decouple work with RabbitMQ: index updates, emails, reservation expiry, abandoned carts, reconciliation and live order tracking.

## 2. User stories
- As a shopper I get order emails reliably.
- As an operator failed jobs retry and land in a dead-letter queue I can inspect.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| MQ-01 | RabbitMQ topology: exchanges, queues, routing for order, inventory, index and notification events | Messages are durable and acknowledged |
| MQ-02 | Outbox relay from PostgreSQL to the broker | No event is lost if the broker is down; none is duplicated downstream |
| MQ-03 | Retry with exponential backoff and dead-letter queues; a tool to inspect and replay | Poison messages do not block queues |
| MQ-04 | Email provider integration with templates from BRD 10, delivery status callbacks | Sent, bounced and failed statuses are recorded |
| MQ-05 | Scheduled jobs: reservation expiry, abandoned-cart reminders, reconciliation, report delivery | Jobs run once across multiple instances |
| MQ-06 | Real-time order tracking over Server-Sent Events or WebSocket | A status change appears in the browser without reload |
| MQ-07 | Consumer idempotency and ordering guarantees where required | Reprocessing a message has no extra effect |

## 4. Deliverables
Broker config, workers, relay, email adapter, SSE endpoint.

## 5. Business rules
1. Consumers must be idempotent.

## 6. Non-functional notes
Queue depth alerts; graceful shutdown drains in-flight messages.

## 7. What we need from you before starting
- Email provider choice and a sender domain.

## 8. Open questions
- SMS or WhatsApp provider for phase 2?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
| 2026-09-29 | Built. RabbitMQ added to the stack (`docker-compose.yml`, `RABBITMQ_URL`) — the topology (`RabbitService`) is one topic exchange, a notifications queue bound to `order.*`/`payment.*`/`cart.*`, a retry queue (per-message `expiration` gives a real 2s/8s/20s backoff via RabbitMQ's own dead-letter-on-TTL-expiry, no delayed-message plugin needed) and a dead-letter queue. **MQ-02**: a transactional Postgres outbox (`OutboxEvent`) — every order/payment write that should notify someone inserts its event row in the *same* `$transaction` as the domain write, so the two can never disagree; `OutboxRelayService` polls it every 2s under a Redis lock and publishes to RabbitMQ, marking a row published only after the broker's own publish-confirm comes back. **MQ-03**: `NotificationConsumerService` retries a failed delivery 3 times with that backoff before moving the message to the dead-letter queue; `GET/POST /admin/system/dead-letters` (new `system:read`/`system:write` permissions) inspect and replay it. **MQ-04**: the consumer turns each event into a real email via the existing dev `MailService` (order confirmed/cancelled/expired, payment confirmed/refunded, cart abandoned) — no real email provider account exists in this environment, so (as with BRD 21's Razorpay keys) the integration is real but the "provider" is still the dev outbox until real credentials are supplied; that swap is contained entirely to `MailService`. **MQ-05**: `SchedulerService` runs the payment-window sweep (BRD 21's `OrderService.sweepExpired`, previously lazy-only) actively every 30s, and a new abandoned-cart reminder every 5 minutes, each under a Redis lock that's released right after the job finishes (a real bug caught by an actual flaky test, not by review — see the change log entry below) so exactly one instance does the work per tick across any number of replicas. **MQ-06**: real-time order tracking via `GET /orders/:id/stream` (Server-Sent Events, Redis pub/sub under the hood) — a status change (paid, packed, shipped, cancelled, ...) reaches an open tracking tab with no reload; ownership is checked by a dedicated `CanActivate` guard, not inside the `@Sse()` handler itself (see the bug entry below for why that distinction mattered). **MQ-07**: the consumer dedupes by the outbox event's own id via a Redis `SETNX`, so an at-least-once redelivery (a crash between "sent" and "acked", or a manual dead-letter replay) never sends a second email. Two real bugs found only by running the actual test suite, not by reading the code: (1) the Redis locks for the relay and scheduler were only ever released by TTL expiry, not after the job finished, so a *single* instance's own next tick could be blocked by its own previous lock for up to 10 seconds — fixed by releasing the lock in a `finally` right after the job's work completes, TTL now purely a crash-safety net; (2) `OrderStreamOwnershipGuard` had to become a real `CanActivate` guard rather than an `await` inside the `@Sse()` handler, because Nest's SSE machinery resolves the handler's returned Observable and starts committing a 200 response *before* subscribing to (and thereby actually running) it — an ownership error thrown from inside the handler became an in-stream `{type:'error'}` message, not an HTTP 404, until the check moved to a guard that runs first. Verified: 71/71 `api` tests (7 new in `messaging.spec.ts`: real order-confirmation and cancellation emails through the whole outbox→broker→consumer→mail pipeline, redelivery de-duplication, dead-letter inspect/replay, the abandoned-cart reminder, and SSE ownership), full workspace (15 projects) lint/test/build green, and live manual verification against the running dev server — a real order's confirmation email appeared in `/dev/outbox` within about a second of placing it; an open SSE stream showed `confirmed` then, two seconds later with no reload, `cancelled`, live, while the order was being cancelled from a second terminal; the checkout rate limit (BRD 22) still returned `429` under load; `/admin/system/cache-stats` and `/admin/system/dead-letters` both returned live data. | RabbitMQ-backed messaging, scheduled jobs and real-time order tracking, following the plan; two scope reductions called out rather than silently dropped (no real email provider account, Kafka/SMS/CAPTCHA left for later exactly as §7/§8/scope already said) |
