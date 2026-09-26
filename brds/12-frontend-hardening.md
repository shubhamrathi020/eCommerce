# BRD 12: Frontend Hardening and Polish

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
| Phase | Phase 1 (frontend completion) |
| Covers (master BR) | NFR-UX, NFR-PERF, NFR-MNT, UX-04, CT-05/CT-15/CT-16 follow-ups, known issues from BRD 01 to 08 |
| Depends on | BRD 01 to 11 |
| Not in this BRD | New features; dark mode and PWA (BRD 18) |

## 1. Purpose and scope
Close every known gap so phase 1 can be signed off: measured performance, verified colour contrast, fixed layout bugs, cross-browser confidence and cleaner code.

## 2. User stories
- As a mobile shopper I am never covered by overlapping bars.
- As a user of assistive technology I can complete every main journey.
- As the owner I have numbers proving speed and accessibility targets are met.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| FH-01 | Fix overlapping bottom bars on mobile (compare bar, sticky add-to-cart, cookie banner) with one ordered stack | No two fixed bars overlap at 360 px width in any combination |
| FH-02 | Mobile "load more" on listings (deferred from BRD 02) while keeping crawlable page links | Load more appends results, keeps scroll, updates the URL, and works with the back button |
| FH-03 | Automated colour-contrast and accessibility checks in the browser tests for every main page | No serious or critical findings; contrast at least 4.5 to 1 for text |
| FH-04 | Performance budgets measured with Lighthouse in CI for home, listing, product and cart on a mobile profile | Score at least 90; LCP under 2.5 s; layout shift under 0.1; failures block the pipeline |
| FH-05 | Bundle diet: bring the initial storefront bundle under 500 kB (currently about 570 kB) by lazy-loading mock adapters and trimming shared code | Budget warning cleared without raising the limit |
| FH-06 | Forms safe before the app finishes loading (no accidental native submit) | Submitting early never reloads the page or loses input |
| FH-07 | Error, offline and empty states audit with a shared pattern | Every page has a friendly failure state with a retry; an offline banner appears when the network drops |
| FH-08 | Keyboard and screen-reader pass with a written checklist; focus moves to the page heading after route changes | Checklist passes on all primary journeys |
| FH-09 | Cross-browser and viewport smoke tests (Chromium, Firefox, WebKit; phone and tablet widths) | Smoke suite green on all targets |
| FH-10 | Visual regression baseline for key screens | Unintended pixel changes fail the check |
| FH-11 | Cleanup: remove placeholders, dead code and duplicated helpers; resolve lint warnings; update steering docs with patterns learned | Repository has no TODO without an owner and no unused exports |

## 4. Deliverables
Fixes, browser tests, Lighthouse configuration in CI, updated docs.

## 5. Business rules
1. No feature work in this BRD.
2. Every fix has a test or a check that would have caught it.

## 6. Non-functional notes
Targets from the master BR: LCP under 2.5 s, availability, accessibility level AA.

## 7. What we need from you before starting
- Approve the performance targets.
- Tell us which browsers and phone sizes matter most to you.

## 8. Open questions
- Is visual regression testing worth the maintenance for you now?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
