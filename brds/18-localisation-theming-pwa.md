# BRD 18: Localisation, Theming and PWA

| Field | Value |
|---|---|
| Status | Built (frontend, mock-backed; translated surfaces only, Hindi draft) |
| Version | 0.2 (2026-10-03) |
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

## 8. Open questions - decided by default (please confirm or change)
You asked me to proceed without waiting for answers, so these defaults were used:
- **Languages beyond Hindi:** none. English and Hindi only. The Hindi text is a **draft written without a native reviewer**; the language menu labels it "(draft translation)" and says so. Have a Hindi speaker review `messages.hi.ts` before you rely on it.
- **Right-to-left:** a developer-only test language ("rtl", English text, Arabic-Indic digits) so the layout can be checked without a real Arabic translation. It is not offered in the production build.
- **Theme default:** follows the device ("Match my device"); the visitor can force Light or Dark and the choice is remembered. The choice is applied before the first paint so there is no white flash.
- **Installable app and offline:** a hand-written service worker, enabled in production builds only. The cart, checkout, orders, account, payment and every `/api/` request always go to the network and are never saved, so an old price can never reach checkout. Catalog pages the visitor has browsed open from a saved copy when the network fails (at most 7 days old, 40 pages), with a visible warning that prices and stock may be out of date.
- **Push for order updates:** the opt-in is built (explicit, revocable, handles blocked/unsupported browsers, test notification), but there is no push server, so nothing is delivered for real orders.

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
| 2026-10-03 | Built. LX-01 to LX-06 implemented in the frontend. **Language:** a small message framework in `@ecom/shared/core` (`{name}` values and `{count, plural, one {...} other {...}}`), English and a draft Hindi catalog, a `t` pipe, a language menu in the footer, and `lang`/`dir` kept in step on `<html>`. The saved language is applied after the page loads (so server-rendered pages match what the browser builds); a Hindi reader sees English for a moment first. **Dates, numbers and money** follow the language (`date` and `money` pipes, cached formatters) and never change a stored amount. **Right-to-left:** layouts use logical spacing/alignment classes (about 56 files converted) and arrows flip; a dev-only test language checks it. **Dark mode:** dark colour tokens for the shop, admin and seller apps, a Match my device/Light/Dark control, and AA contrast tests for light, chosen-dark and device-dark. **Installable app:** web manifest, icons, a service worker (`apps/storefront/public/sw.js`) and an offline page, plus an offline banner and a saved-copy notice. **Push opt-in:** preferences page section, mock only. Verified by unit tests (message format, locale switching, the shell and cart page in Hindi and the test language with axe, theme contrast, service-worker rules, push states), workspace lint and build, and a real-browser check (`node scripts/pwa-check.mjs`, 13 checks in Chromium against a production build). **Not done, on purpose:** only the surfaces listed in the deliverables are translated (shared components, header, footer, search, cookie banner, mini cart, offline banner, cart page, wallet panel, preferences push section and the new language/theme controls); checkout, account, orders, the product page body, admin and seller stay English; catalogue, CMS and review text is not translated; Hindi has had no native review; the language is not detected on the server; no Arabic or other real RTL translation; icons are simple generated ones; installability was checked structurally and in Chromium, not with Lighthouse; no push server | Deliver the localisation, theming and installable-app slice of phase 2 |
