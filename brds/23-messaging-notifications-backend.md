# BRD 23: Messaging, Jobs and Notifications Backend

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
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
