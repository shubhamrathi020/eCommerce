# BRD 13: Returns, Refunds and Support

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
| Phase | Phase 2 (frontend) |
| Covers (master BR) | RET-01..06, PAY-07, ORD-01 (returned states) |
| Depends on | BRD 04, 05, 06, 10, 11 |
| Not in this BRD | Chatbot or live chat (RET-05, P3), real payment refunds (backend phase) |

## 1. Purpose and scope
Handle what happens after delivery: return requests, quality checks, refunds and customer support tickets.

## 2. User stories
- As a customer I request a return within the allowed window and follow its progress.
- As an admin I approve returns, record the check result and trigger the refund.
- As a customer I raise a support question about an order and see replies.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| RF-01 | Return request from a delivered order: choose items and quantities, reason, comments | Only eligible items within the return window can be selected; one open request per item |
| RF-02 | Admin returns queue with approve, reject (with reason), pickup scheduling and quality-check result | Every state change is audited and notifies the customer |
| RF-03 | Refund calculation: item price, proportional discount, shipping rules; original method or store credit | Refund amounts are computed by the API and shown before approval |
| RF-04 | Refund status timeline for the customer (requested, approved, picked up, checked, refunded) | Timeline matches the admin state; prepaid cancellations move from refund pending to refunded |
| RF-05 | Restock or scrap decision writes to the inventory ledger | Restocked items reappear in available stock |
| RF-06 | Support tickets linked to an order: create, list, reply, close; admin queue with status and assignee | A customer sees only their own tickets; replies are timestamped |
| RF-07 | Policy settings: return window, eligible categories, non-returnable flags | Changes apply to new requests only |
| RF-08 | Accessibility and privacy | Forms are accessible; attachments are limited by type and size |

## 4. Deliverables
Storefront return and support screens, admin queues, mock `ReturnApi` and `SupportApi`.

## 5. Business rules
1. Default return window is 7 days from delivery.
2. Refunds go to the original method unless it is unavailable.

## 6. Non-functional notes
Long-running steps are asynchronous in the real backend.

## 7. What we need from you before starting
- Your return policy (window, eligible categories, who pays return shipping).

## 8. Open questions
- Are exchanges needed, or refunds only?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
