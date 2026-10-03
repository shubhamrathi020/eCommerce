# BRD 13: Returns, Refunds and Support

| Field | Value |
|---|---|
| Status | Built (frontend, mock-backed; real payment refunds are a backend item) |
| Version | 0.2 (2026-10-03) |
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

## 8. Open questions - decided by default (please confirm or change)
You asked me to proceed without waiting for answers, so these defaults were used. Each is one setting or one rule to change:
- **Exchanges: not built. Refunds only.** An exchange is a return plus a new order; it needs the backend order rules to be real first.
- **Window:** 7 days from the delivery time (admin-editable, 0 to 90).
- **Eligible categories:** everything except categories or products an admin marks non-returnable on the Policy tab.
- **Who pays return shipping:** free pickup when the problem is ours (damaged, defective, wrong item, not as described); a return fee of ₹49 (editable) deducted from the refund when the customer changes their mind or the size/fit is wrong.
- **Shipping charge refund:** only when the problem is ours and the request completes the return of the whole order.
- **Refund method:** original payment method for online orders; store credit for cash-on-delivery (there is no original method to send it to). Store credit is recorded and shown, but there is no way to spend it at checkout yet.
- **Attachments:** at most 3 files, JPEG, PNG, WebP or PDF, 2 MB each.

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
| 2026-10-03 | Built. RF-01 to RF-08 implemented against `ReturnApi`, `SupportApi` and admin counterparts with device-local mocks; refund maths is a pure function in `@ecom/shared/models` (`computeRefund`) so the real backend can share it. Restock writes a `return` ledger entry; scrap writes a `return` and a `damage` entry that cancel out, because the sale already removed the unit. Verified by 20 data-access tests, 14 UI flow tests with axe, workspace lint/test/build. **Not done, on purpose:** exchanges; spending store credit at checkout; real attachment upload; seeing backend orders when `realCommerce` is on; real payment refunds. Decisions in section 8 were taken by default and are awaiting your confirmation | Deliver the returns and support slice of phase 2 |
