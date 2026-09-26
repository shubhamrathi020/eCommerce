# BRD 18: Localisation, Theming and PWA

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
| Phase | Phase 3 (frontend) |
| Covers (master BR) | UX-05, UX-07, NFR-LOC, PAY-10 (display) |
| Depends on | BRD 01 to 12 |
| Not in this BRD | Translating product content (CAT-13) |

## 1. Purpose and scope
Reach more people: another language, dark mode and an installable, offline-friendly app.

## 2. User stories
- As a Hindi speaker I use the shop in Hindi.
- As a night user I switch to dark mode.
- As a mobile user I install the shop on my phone.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| LX-01 | Translation framework with English and Hindi; all strings externalised | Switching language changes every visible string with no layout breakage |
| LX-02 | Locale-aware dates, numbers and currency | Amounts follow the chosen locale without changing stored values |
| LX-03 | Right-to-left readiness | A test language flips the layout correctly |
| LX-04 | Dark mode with a system default and a manual toggle | Contrast stays AA in both themes |
| LX-05 | Installable web app with offline shell and cached browsing | The app opens offline with a friendly message and cached pages |
| LX-06 | Web push opt-in for order updates (needs backend) | Opt-in is explicit and revocable |

## 4. Deliverables
Translation files, theme toggle, service worker, manifest.

## 5. Business rules
1. No text concatenation; plurals handled properly.

## 6. Non-functional notes
Service worker must never serve stale prices at checkout.

## 7. What we need from you before starting
- Approved Hindi translations or a translator.

## 8. Open questions
- Which languages beyond Hindi?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
