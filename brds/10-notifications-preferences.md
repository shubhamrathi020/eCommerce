# BRD 10: Notifications and Preferences

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
| Phase | Phase 1 (frontend completion) |
| Covers (master BR) | NTF-01..07, ENG-05, AUTH-10 (preferences), NFR-SEC (consent) |
| Depends on | BRD 04, 05, 06 |
| Not in this BRD | Real email, SMS or push delivery (backend phase, BRD 23), WhatsApp |

## 1. Purpose and scope
Give shoppers control over what they are sent, a notification centre inside the app, and staff a way to manage message templates and see delivery status. Back-in-stock and price-drop alerts live here.

## 2. User stories
- As a customer I choose which emails I receive and can unsubscribe with one click.
- As a customer I see order updates in a notification bell.
- As a shopper I ask to be told when an out-of-stock item returns or a price drops.
- As an admin I edit message templates, preview them and see what was sent.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| NC-01 | Preferences page: order updates (always on), marketing, price-drop alerts, back-in-stock alerts; explicit opt-in for marketing with a timestamp | Changes persist per account; transactional messages cannot be switched off |
| NC-02 | One-click unsubscribe page reached from an email link with a signed token (no sign in needed) | The link works once per preference and shows a clear confirmation |
| NC-03 | Notification centre: bell with unread count, list, mark read, mark all read; fed by order, review and alert events | Unread count updates without a reload; the list is keyboard and screen-reader friendly |
| NC-04 | "Notify me" on out-of-stock products and "Alert me" on price for signed-in users | Subscribing shows confirmation; the shopper can review and remove subscriptions |
| NC-05 | Triggering: when stock returns or price falls (admin change in the mock), matching subscribers get a notification and a mock email | Only subscribed users are notified, once per event |
| NC-06 | Admin template editor with variables ({{orderId}}, {{name}}), live preview, versioning and "send test to mailbox" | Unknown variables are rejected; previous versions can be restored |
| NC-07 | Delivery log in the admin: event, recipient, status (queued, sent, failed, retried), retry button | Failed sends show a reason and can be retried |
| NC-08 | Privacy and accessibility | Marketing needs consent; no personal data in analytics; axe reports no serious issues |

## 4. Deliverables
Storefront preferences and notification centre, alert subscriptions, admin templates and delivery log, mock `NotificationApi` and `PreferenceApi`.

## 5. Business rules
1. Order, security and payment messages are always sent.
2. Marketing requires opt-in and stores when and how it was given.
3. An alert fires once per stock or price event.

## 6. Non-functional notes
Notification centre polls or receives pushed updates (server events later); templates are cached.

## 7. What we need from you before starting
- Wording and tone for the standard emails (order placed, shipped, delivered, refund).
- Decide which alerts are launch-ready (price drop and back in stock are proposed).

## 8. Open questions
- Should marketing default to off everywhere (proposed) or ask at sign up?
- Do you want SMS or WhatsApp in phase 2?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
