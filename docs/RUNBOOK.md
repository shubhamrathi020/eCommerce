# Runbook

Everyday commands for building, running, testing and deploying the shop. Commands use `pnpm` (the version is pinned in `package.json`).


## 1. First time

This repository is the **frontend** (storefront, admin console, seller portal). The shared contract package `@ecom/contracts` is downloaded from its tagged GitHub release on install (see README.md); the backend is the separate `eCommerce-api` repository.

```bash
pnpm install
```

Needs Node 22 and pnpm (`corepack enable` picks the pinned version). Docker Desktop is only needed for the container images. The frontend works on built-in mock data without the backend (its commands are in `eCommerce-api/docs/RUNBOOK.md`).

## 2. Run for development

| Command | What it does |
|---|---|
| `pnpm start:storefront` | Shop at http://localhost:4200 (live reload, server-side rendering) |
| `pnpm start:admin` | Admin console at http://localhost:4201 |
| `pnpm start:seller` | Seller portal at http://localhost:4202 (marketplace, BRD 17; mock data only) |
| `node scripts/pwa-check.mjs [url]` | Real-browser check of offline pages, dark mode and language against a production build on http://localhost:4000 (BRD 18) |

Development-only helpers: on the sign-in pages a "Development only: fill demo ..." button fills the seeded demo accounts, and `/dev/mailbox` (storefront) shows the emails the shop would send.


## 3. Check everything

| Command | What it does |
|---|---|
| `pnpm verify` | Lint, unit tests and production builds for every project (the same as CI) |
| `pnpm test` / `pnpm lint` / `pnpm build` | One step at a time |
| `pnpm e2e` | Smoke tests in a real browser (Microsoft Edge locally; starts the dev servers if needed) |
| `pnpm mock-data` | Regenerate the seeded mock catalog, reviews and images |


## 4. Containers (Docker)

```bash
pnpm docker:up      # builds the storefront and admin images and starts them
pnpm docker:down    # stops and removes them
```

| App | URL | Container user | Health |
|---|---|---|---|
| Storefront (Node, server-side rendering) | http://localhost:4000 | node (uid 1000), read-only filesystem | `/healthz`, `/readyz` |
| Admin console (nginx, static) | http://localhost:4001 | nginx (uid 101) | `/healthz` |


Notes
- The storefront only answers to hosts listed in `ALLOWED_HOSTS` (comma separated, wildcards like `*.example.com` allowed). Set it for real domains.
- Both apps send strict security headers, and the storefront uses a per-request nonce for its content security policy.

## 5. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Docker `shop-api` image: "Cannot find module 'tslib'" | Fixed by `"importHelpers": false` in `apps/api/tsconfig.app.json`; if it recurs, something reintroduced a `tslib` import and the pruned production install has no dev dependencies |
| Search or online payment returns "temporarily unavailable" | The circuit breaker for that dependency is open (3 consecutive failures) — check `GET /admin/system/resilience`; it closes on its own once the dependency answers again, no restart needed |
| "Online payment is not set up on this server yet" | No Razorpay test keys in `apps/api/.env`; use cash on delivery, or add your own `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` (test mode only — the API refuses a `rzp_live_...` key outright) |
| `docker` says it cannot connect to the daemon | Docker Desktop is not running; start it and retry |
| Storefront returns `400 Bad Request` with a "host is not allowed" message | The host name is missing from `ALLOWED_HOSTS` |
| Admin container keeps restarting | Check `docker compose logs admin` (usually an nginx config error) |
| Image build fails at `pnpm install` | The pnpm version must match `packageManager` in `package.json`; do not change the lockfile by hand |
| E2E test clicks "Sign in" but nothing happens | The app had not finished loading; wait for a visible effect first (the smoke tests do) |
| `pnpm audit` reports issues | Reported in CI but not blocking yet; triage and upgrade the package |

Backend problems (API, databases, Kubernetes) are in `eCommerce-api/docs/RUNBOOK.md`.

## 6. Not covered yet

Invoices as a real PDF, and an automated job reconciling payments against Razorpay's own records, aren't built yet (BRD 23/24's messaging/scheduling infrastructure now exists, but no job was written to use it for either of these). CSV bulk import and an image upload pipeline for the catalog aren't built yet either. Distributed tracing (OpenTelemetry/Jaeger) and frontend error/performance reporting were explicitly deferred in BRD 24 (see its own change log for why); Kubernetes, cloud deployment, Helm and secrets management arrive in BRD 25.
