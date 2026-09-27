# BRD 19: Backend Foundation and Identity API

| Field | Value |
|---|---|
| Status | Implemented: identity, accounts and addresses (BF-01..09 except GraphQL/OTel, out of scope) |
| Version | 0.2 (2026-09-28) |
| Phase | Backend |
| Covers (master BR) | NFR-SEC, NFR-MNT, NFR-OBS (basics), AUTH-01..13 (server side) |
| Depends on | BRD 05, 08 |
| Not in this BRD | Catalog, commerce and search (BRD 20, 21) |

## 1. Purpose and scope
Create the real server (Node.js with NestJS as a modular monolith), its database, and the identity and account API, then switch the frontend from mock to real for accounts.

## 2. User stories
- As a developer I start the backend, database and cache with one command.
- As a customer my account data is stored securely on a server.
- As an operator I see health, logs and API documentation.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| BF-01 | Modular monolith skeleton with clear domain modules, shared config, validation and error format matching the frontend `ApiException` | Errors from the API map to the same codes the frontend already handles |
| BF-02 | PostgreSQL with versioned migrations and seed data (demo accounts) | A clean database can be created and migrated with one command |
| BF-03 | Auth API: register, login, refresh, logout, verify email, reset password; Argon2id hashing; short-lived access token and rotating refresh token in an HttpOnly cookie with reuse detection | Stolen refresh tokens are detected; passwords are never logged or returned |
| BF-04 | Role and permission enforcement on every endpoint | The same permission names as the frontend are enforced server-side |
| BF-05 | Accounts and address book API | Contract tests prove the responses match the frontend models |
| BF-06 | OpenAPI documentation, request correlation ids, structured logs, health and readiness endpoints | Docs load; every log line carries a correlation id |
| BF-07 | Compose stack adds PostgreSQL and Redis; backend container follows the same hardening as the frontends | `docker compose up` gives a working stack |
| BF-08 | HTTP adapters for auth, accounts and addresses selected by `useMocks: false` | The storefront signs in against the real API with no page changes |
| BF-09 | Security basics: CORS allow-list, CSRF protection for cookie auth, rate limit hook, dependency audit in CI | Automated security tests pass |

## 4. Deliverables
`apps/api`, migrations, Docker and CI updates, HTTP adapters, contract tests.

## 5. Business rules
1. No secrets in source control; configuration by environment.
2. Passwords and tokens are never returned by any endpoint.

## 6. Non-functional notes
p95 under 300 ms for reads on a developer laptop; zero-downtime migration approach documented.

## 7. What we need from you before starting
- Approve NestJS and PostgreSQL (proposed) and the ORM choice (Prisma proposed).
- A domain name plan for cookies and CORS.

## 8. Open questions
- Keep everything in PostgreSQL, or PostgreSQL plus MongoDB for the catalog as decided earlier?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
| 2026-09-28 | Built on NestJS (modular monolith, `apps/api`) with PostgreSQL via Prisma 7 (driver-adapter model: connection details live in `apps/api/prisma.config.ts`, never in the schema). Migrations run with `pnpm db:migrate` (dev, prompts) or `pnpm db:migrate:deploy` (CI/containers, no prompt); demo accounts seeded with `pnpm db:seed`, same emails/passwords/ids as the frontend mock so "fill demo customer/admin" still works once a page uses the real API | BF-01, BF-02 |
| 2026-09-28 | Auth API: register, login, refresh, logout, `me`, verify-email, password-reset request/confirm. Argon2id hashing (OWASP parameters) with a dummy-hash comparison so an unknown email takes the same time as a wrong password. Access tokens are 15-minute JWTs; refresh tokens are random, stored only as SHA-256 hashes, rotated on every use and grouped in a "family" per sign-in — presenting an already-rotated token (a copied cookie) revokes the whole family, not just that token. Same lockout policy as the mock (5 attempts, 15 minutes). A password reset or a password change signs out every other device | BF-03 |
| 2026-09-28 | Permissions enforced on the server with the exact same names the frontend already uses: `permissionsFor(roles)` moved out of the mock-only code into `@ecom/shared/models` so both sides read one source of truth. Verified with a request carrying a valid token but no permissions — refused with 403, not merely hidden in the UI | BF-04 |
| 2026-09-28 | Accounts and address book API, byte-for-byte the same validation messages as the mock. Every address query is scoped by the signed-in user's id in the `WHERE` clause, so one customer cannot read or edit another's address even by guessing an id (tested). Account export omits secrets; account deletion removes the user, their addresses and their sessions in one transaction | BF-05 |
| 2026-09-28 | OpenAPI docs at `/docs` (off by default in production, `API_DOCS=on` to enable). Every response carries `x-request-id` (client-supplied only if it looks like an id, otherwise generated — so a client cannot inject text into the logs); every log line is one JSON object with that id, method, path, status and timing, no bodies or headers (which can carry PII). `/healthz` never touches the database (so an outage does not restart every pod); `/readyz` does | BF-06 |
| 2026-09-28 | `docker-compose.yml` gained `postgres`, `redis`, an `api-migrate` one-shot (runs migrations then the seed, then exits) and `api` (waits for `api-migrate` to succeed, non-root, read-only filesystem). `apps/api/Dockerfile` has build / migrate / runtime stages so the runtime image carries no schema tooling | BF-07 |
| 2026-09-28 | Frontend: new `AppConfig.realAuth` flag (default `false`, mocks unchanged). With it on, `AuthApi` and `AddressBookApi` are `Http*Api` adapters talking to the real API through a new `ApiClient` (in-memory access token only, one transparent refresh-and-retry on a 401, shared across concurrent requests). Every other module (catalog, cart, orders, reviews, admin...) still runs on mocks; `MockUserStore.mirrorSession()` keeps them working by mirroring the real session into the existing mock session storage. Verified with the storefront actually running against the real API in a browser: signed in, saved an address, confirmed the row in Postgres and the request log showing the real 401-then-refresh-then-200 sequence | BF-08 |
| 2026-09-28 | Security basics: CORS is an explicit allow-list with credentials (nothing else gets CORS headers at all, tested); the refresh/logout/change-password endpoints need a custom `x-csrf` header in addition to the `SameSite=Lax` cookie (a cross-site page cannot add a custom header without a CORS preflight, which only our own origins pass); a stricter rate limit on the auth endpoints (10/min) sits under a global one (300/min); Helmet security headers; `pnpm audit` already runs in CI for the whole workspace | BF-09 |
| 2026-09-28 | Contract tests (not just unit tests): a dedicated suite asserts every response's keys are exactly the shared frontend model's keys, typed against the model itself, so a field rename that is not mirrored on both sides fails to compile, not just fails at runtime | BF-05, "contract tests prove the responses match" |
| 2026-09-28 | Not in this slice: GraphQL (the architecture doc allows REST-first, GraphQL to follow for reads later), OpenTelemetry/tracing (arrives with BRD 24 Observability), and Kubernetes manifests for the API (BRD 08's manifests cover the two frontends only; adding `api`/`postgres`/`redis` to `deploy/k8s/base` is left for BRD 25) | Recorded gaps, not silent ones |
