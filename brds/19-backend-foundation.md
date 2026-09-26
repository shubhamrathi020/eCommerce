# BRD 19: Backend Foundation and Identity API

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
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
