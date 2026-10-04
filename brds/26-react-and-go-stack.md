# BRD 26: Parallel React frontend and Go backend

| Field | Value |
|---|---|
| Status | Done locally (Go backend and all three React apps built and tested; real-backend smoke test done against Go only) |
| Version | 0.2 (2026-10-05) |
| Phase | Platform |
| Covers (master BR) | NFR-MNT (maintainability, technology choice) |
| Depends on | BRD 01 to 25 (the Angular frontend and Nest backend are the reference) |
| Not in this BRD | Replacing the Angular/Nest stack. Both stacks stay; each frontend can use either backend |

## 1. Purpose and scope
Build a second implementation of the whole product with a different stack, on the same databases:

- **eCommerce-go**: a Go backend serving the same HTTP API as the Nest backend, against the same PostgreSQL, MongoDB,
  Meilisearch, Redis and RabbitMQ.
- **eCommerce-react**: a React frontend (storefront, admin console, seller portal) with the same screens and behaviour as
  the Angular one, able to use the Nest or the Go backend or its own mock data.

The existing stack is the specification. "Done" for any piece means it behaves the same as the original, shown by
running the original's own tests against the copy wherever that is possible.

## 2. Decisions
- Two new sibling repositories (decided with the owner), next to `eCommerce`, `eCommerce-api` and `eCommerce-contracts`.
- **The Nest backend remains the owner of the PostgreSQL schema.** Go uses the same tables and never migrates them.
- Scope chosen by the owner: all three frontend apps, and the Go backend at full parity with the Nest API.
- Both frontends depend on the shared `@ecom/contracts` package (types and pure rules). The Go backend ports those rules and is held to
  them with golden tests generated from the TypeScript original.

## 3. Go backend (done)
| Area | Result |
|---|---|
| Identity, accounts, address book | Same routes, error shapes, cookies and JWT claims; Argon2id hashes and tokens interoperate with Nest |
| Catalog, search, admin catalog | Mongo + Meilisearch (REST), cache-aside with tagged invalidation, stampede protection |
| Cart, checkout, orders, payments | Server-side cart, atomic stock holds, idempotent orders, Razorpay (test mode) with webhook, live tracking over SSE |
| Messaging | Transactional outbox, RabbitMQ relay, notification consumer with retry and dead-lettering, scheduled jobs |
| Operations | Prometheus metrics, circuit breakers, rate limits, health probes, 43 MB distroless image, CI |

Verification: the 8 integration spec files of the Nest API run unchanged against the Go server (64 tests; the one test that
calls a Nest internal is replaced by a Go test); 400 generated carts, coupons, money formats, product summaries and sort orders match the TypeScript output exactly; a password hashed by Node verifies in Go and the reverse.

## 4. React frontend (done)
Approach: a pnpm workspace (`eCommerce-react`) with `packages/{core,data-access,state,ui}` and `apps/{storefront,admin,seller}`.
The Angular data-access layer (abstract API classes, about 8,800 lines of mock backends, HTTP adapters) depends on Angular only through
`inject()`, `@Injectable`, signals and `HttpClient`; `packages/core` supplies small stand-ins for those (a DI container, signals, a
`fetch` client) so the same code runs unchanged. Components were rewritten from the Angular templates with the same Tailwind
classes and the same wording. Backend choice is a build/start setting: `VITE_BACKEND=mock|nest|go`.

| Step | Content | Status |
|---|---|---|
| R0 | Workspace, tooling, theme tokens, ESLint layering rules | done |
| R1 | Runtime stand-ins, data-access copy, fetch client (mock, Nest and Go modes) | done (244 tests carried over) |
| R2 | Shared UI components, form helper, state stores and guards | done (90 + 12 tests) |
| R3 | Storefront: shell, home, listing, search, product, reviews, compare, cart, checkout, orders, invoice, account, returns, support, wishlist, preferences, personalisation, PWA | done (101 tests) |
| R4 | Admin console: 41 routes (dashboard, products, orders, inventory, returns, promotions, analytics, marketplace, recommendations, support, notifications, reviews, coupons, users, audit, content) | done (37 tests) |
| R5 | Seller portal: sign-in, application, overview, products, orders, payouts | done (5 tests) |
| R6 | Flow tests with axe, browser smoke test against mock and the Go API, production images, CI | done, see below |

Verification:
- The Angular flow tests were ported screen by screen (same steps, same expected messages) and pass, including axe checks of the main pages in English, Hindi and the right-to-left test language.
- Browser smoke test: every admin route renders with no console errors on mock data; the seller portal pages likewise.
- Against the **Go API** with real databases: browse the catalog, add to cart, check out as a guest with cash on delivery (the order is in PostgreSQL as `confirmed`), sign in to the admin console with the seeded staff account, see that order and advance it to `packed` (confirmed in PostgreSQL). Online payment correctly reports that Razorpay test keys are missing.
- Production images (nginx, read-only, non-root) build and pass their health check; the storefront image was run and its security headers, SPA fallback and service-worker caching checked.
- **Not done:** the same live run against the Nest API (its adapters are identical, only the port differs), a real-Razorpay payment, and any run on GitHub Actions.

Known differences from the Angular apps: no server-side rendering (single-page apps; add a prerender step if search-engine
visibility matters); forms use a small `useForm` helper instead of Angular reactive forms; the `__ui` component showcase and the
Angular `showcase` route were not ported.

## 5. Business rules
1. Behaviour and wording must match the original; where they differ, the original is right.
2. Money is computed only by the shared rules and the server, never by a screen.
3. A frontend must work against the Nest backend, the Go backend and the mocks without code changes.

## 6. Change log
| Date | Change | Reason |
|---|---|---|
| 2026-10-04 | Go backend built and verified; React work started | Owner request: a React + Go copy on the same databases |
| 2026-10-05 | React storefront, admin and seller built and tested; images, CI and docs added; smoke test against the Go API | Finish the owner's request |
