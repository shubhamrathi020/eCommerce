# BRD 01: App Shell and Design System

| Field | Value |
|---|---|
| Status | Implemented (storefront shell); component set is completed per slice |
| Version | 0.2 (2026-09-27) |
| Covers (master BR) | UX-01 (shell part), UX-04, UX-06, UX-09, UX-10, UX-11, NFR-UX, CMS-01 (banner slot) |
| Depends on | steering/design.md, steering/architecture.md |

## 1. Purpose and scope
Deliver the Nx workspace, the storefront shell (header, footer, layout, routing skeleton, SSR) and the reusable `ui-*` component library so every later module builds on the same foundation.

**In scope:** Nx workspace + storefront app (SSR) + admin app skeleton; shared libs; design tokens; core UI components; app-shell (header, footer, mega-menu, mobile drawer, search box UI only); global services (toast, error handler, SEO, storage, feature flags, config); cookie consent banner; static CMS pages from mock data; 404/error pages; showcase route for components.
**Out of scope:** real catalog/search/cart logic (BRDs 02+), dark mode UI (tokens ready only), i18n runtime.

## 2. User stories
- As a visitor, I see a fast, consistent header and footer on every page and can reach categories, search, cart and account from anywhere.
- As a mobile user, I get a hamburger drawer and touch-friendly controls.
- As a keyboard/screen-reader user, I can skip to content and operate every control.
- As a developer, I can browse every UI component and its states in one place.
- As a visitor, I can accept or decline non-essential cookies.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| SH-01 | Nx workspace with apps `storefront` (SSR), `admin`; libs per steering/rules.md layout | `nx build storefront` and `nx build admin` succeed; Nx tag rules block forbidden imports (lint fails on a test violation) |
| SH-02 | Design tokens (color, type, spacing, radius, shadow, motion, z-index) exposed as CSS variables and Tailwind theme | Changing `--color-primary` in one file restyles the whole app; no hard-coded hex in components (lint/grep check) |
| SH-03 | Core UI components listed in design.md section 3, standalone, OnPush, signal inputs | Each component has all states documented on the showcase route; unit tests cover behaviour |
| SH-04 | Header: logo, category mega-menu (mock categories), search box (UI only, wired in BRD 03), wishlist, account, cart icon with count badge; sticky and condensed on scroll | Works at 360/768/1280 px; menu keyboard operable; badge announces changes via live region |
| SH-05 | Mobile navigation drawer | Focus trapped while open, restored on close, Esc closes |
| SH-06 | Footer with link groups, newsletter form (mock submit), payment icons | Newsletter validates email and shows success/error toast |
| SH-07 | Routing skeleton with lazy feature routes and `NotFound` page | Unknown URL shows 404 with SSR status 404 |
| SH-08 | SSR + hydration enabled; platform-safe storage/window abstractions | No `window is not defined` errors on server; hydration without mismatch warnings |
| SH-09 | `SeoService` (title, description, canonical, Open Graph, JSON-LD) | Each route sets unique title/description; verified in SSR output |
| SH-10 | Global `ErrorHandler` + `ToastService` | Thrown error shows a generic toast and logs details with request id |
| SH-11 | `AppConfig` token, `FeatureFlagService`, `STORAGE` token, `AnalyticsService` (no-op) | Values injectable and overridable in tests |
| SH-12 | Cookie consent banner (accept all / essential only / manage) | Choice persisted; non-essential analytics adapter disabled until accepted |
| SH-13 | Static CMS pages (About, FAQ, T&C, Privacy, Contact) rendered from mock JSON, with sitemap/robots placeholders | Pages reachable by slug, SEO tags present |
| SH-14 | Showcase route `/__ui` (dev only) listing all components with states | Excluded from production build |
| SH-15 | Accessibility baseline: skip link, landmarks, focus ring, reduced motion | axe scan on shell pages: 0 serious/critical issues |
| SH-16 | Performance baseline | Initial bundle within budgets (warn 500 kB, error 1 MB); Lighthouse mobile perf >= 90 on shell pages |
| SH-17 | Tooling: ESLint, Prettier, pre-commit, budgets, CI workflow stub (lint, test, build) | `nx affected -t lint test build` passes locally |

## 4. Screens
Shell (header/footer/drawer), 404, static page template, cookie banner, component showcase.

## 5. Contracts (used by mocks)
- `Category { id, slug, name, parentId?, imageUrl?, order }`: header menu from `CategoryApi.tree()`.
- `CmsPage { slug, title, body(html, sanitized), seo }`.
- `AppConfig { useMocks, apiBaseUrl, razorpayKeyId?, features: Record<string, boolean> }`.

## 6. Business rules and edge cases
- Cart count shows 0 (hidden badge) until the cart module exists; API is stubbed.
- Menu with 3 levels max; long names truncate with tooltip.
- CMS HTML always sanitized (security.md).

## 7. Non-functional notes
CLS < 0.1 on shell, fonts preloaded with `font-display: swap`, no third-party scripts in this slice.

## 8. Mock-data needs
`categories.json` (30+ across fashion, electronics, grocery, home, beauty, sports, books, toys), `cms-pages.json`.

## 9. Open questions
- Brand name/logo (placeholder "Shop" used until decided).

## 10. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-26 | Initial draft | Start of build |
| 2026-09-27 | Implemented SH-01..SH-13, SH-15 (automated structure/ARIA via axe), SH-16 (initial bundle about 415 kB), SH-17 (lint, test, build pass; CI workflow stub not yet added) | Slice built |
| 2026-09-27 | SH-03: built the components the shell needs (icon, button, form field/input, badge, rating, price, skeleton/spinner, empty/error state, toast, breadcrumb, drawer, quantity stepper). Remaining design.md components (carousel, gallery, tabs, accordion, pagination, dropdown, product card, filter panel, table, etc.) are built in the slice that first needs them | Vertical slices |
| 2026-09-27 | SH-14: showcase at `/__ui` is registered only in dev mode (production build does not route to it, though its lazy chunk is still emitted) | Simplicity |
| 2026-09-27 | SH-15/SH-16: colour contrast and Lighthouse were not run in an automated way (jsdom cannot compute contrast). Token pairs were chosen to meet 4.5:1 and visually checked | Tooling gap; to revisit with Playwright + axe in e2e |
| 2026-09-27 | SH-08: SSR uses `RenderMode.Server` (not prerender) so titles and the 404 status are per request | Correct HTTP status for crawlers |
| 2026-09-27 | Admin app is a placeholder page only (builds, uses shared design system) | Scope of this slice |
