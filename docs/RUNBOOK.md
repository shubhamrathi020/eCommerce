# Runbook

Everyday commands for building, running, testing and deploying the shop. Commands use `pnpm` (the version is pinned in `package.json`).

## 1. First time

```bash
pnpm install
```

Needs Node 22 and pnpm (`corepack enable` picks the pinned version). Docker Desktop is needed for containers and for the database. Copy `apps/api/.env.example` to `apps/api/.env` if you plan to run the API (dev-only values; never real secrets).

## 2. Run for development

| Command | What it does |
|---|---|
| `pnpm start:storefront` | Shop at http://localhost:4200 (live reload, server-side rendering) |
| `pnpm start:admin` | Admin console at http://localhost:4201 |
| `pnpm start:api` | Backend API at http://localhost:3333 (needs Postgres running, see §4a) |

Development-only helpers: on the sign-in pages a "Development only: fill demo ..." button fills the seeded demo accounts, and `/dev/mailbox` (storefront) shows the emails the shop would send.

## 3. Check everything

| Command | What it does |
|---|---|
| `pnpm verify` | Lint, unit tests and production builds for every project (the same as CI) |
| `pnpm test` / `pnpm lint` / `pnpm build` | One step at a time |
| `pnpm e2e` | Smoke tests in a real browser (Microsoft Edge locally; starts the dev servers if needed) |
| `pnpm mock-data` | Regenerate the seeded mock catalog, reviews and images |

## 4a. The backend API (BRD 19, 20, 21)

Sign-in, profile, addresses, browsing/searching the catalog, and cart/checkout/orders (cash on delivery) all run on the real API now. Online payment needs your own Razorpay test keys (see below); everything else needs nothing extra.

```bash
docker compose up -d postgres redis mongo meilisearch   # or your own local instances
pnpm db:migrate                        # first time and after schema changes (prompts for a migration name)
pnpm db:seed                           # seeds the same demo accounts as the frontend mock
pnpm db:seed:catalog                   # seeds the same 252 products into Mongo and builds the Meilisearch index
pnpm start:api                         # http://localhost:3333, docs at /docs, dev mailbox at /dev/outbox
```

Then, in `apps/storefront/src/app/app-config.values.ts` (or `apps/admin/src/app/app.config.ts`):
- `realAuth: true` — sign-in, profile, addresses.
- `realCatalog: true` — catalog browsing and search. On the admin app, product management also needs `realAuth: true` (the real catalog endpoints check the signed-in user's permissions on the server).
- `realCommerce: true` — cart, checkout, orders. Cash on delivery works immediately; online payment additionally needs `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` in `apps/api/.env` (your own free test-mode keys from the Razorpay dashboard — never paste them into chat; without them `PaymentApi.initiate` refuses with a clear message and COD still works). On the admin app, order management also needs `realAuth: true`.

Set them back to `false` (the default) to go back to the mock. Re-run `pnpm db:seed:catalog` any time you want to reset the catalog back to the seeded 252 products (admin test edits and order-placed stock changes included).

`pnpm exec nx test api` runs the API's own integration tests against **separate** `..._test` stores (a Postgres database and a Mongo database, created automatically, plus a `products_test` Meilisearch index) — it needs Postgres, Mongo and Meilisearch running but never touches your development data.

## 4. Containers (Docker)

```bash
pnpm docker:up      # builds both images and starts them
pnpm docker:down    # stops and removes them
```

| App | URL | Container user | Health |
|---|---|---|---|
| Storefront (Node, server-side rendering) | http://localhost:4000 | node (uid 1000), read-only filesystem | `/healthz`, `/readyz` |
| Admin console (nginx, static) | http://localhost:4001 | nginx (uid 101) | `/healthz` |
| API (NestJS) | http://localhost:3333 | node (uid 1000), read-only filesystem | `/healthz`, `/readyz` |
| PostgreSQL | localhost:5432 | — | `pg_isready` |
| Redis | localhost:6379 | — | `redis-cli ping` |
| MongoDB | localhost:27017 | — | `mongosh --eval db.runCommand('ping')` |
| Meilisearch | http://localhost:7700 | — | `/health` |

Notes
- The storefront only answers to hosts listed in `ALLOWED_HOSTS` (comma separated, wildcards like `*.example.com` allowed). Set it for real domains.
- Both apps send strict security headers, and the storefront uses a per-request nonce for its content security policy.

## 5. Local Kubernetes

The manifests are in `deploy/k8s/base` (Kustomize). They include Deployments (2 replicas, rolling updates that never drop below the desired count, resource limits, startup, readiness and liveness probes, non-root, read-only filesystem), Services, an Ingress, autoscaling (HPA) and disruption budgets.

You need a local cluster (Docker Desktop's Kubernetes, kind or minikube) with an ingress controller and metrics-server.

```bash
pnpm k8s:render                          # print the final manifests (no cluster needed)
docker compose build                     # builds shop-storefront:local and shop-admin:local
# kind only:  kind load docker-image shop-storefront:local shop-admin:local
kubectl apply -k deploy/k8s/base
kubectl -n shop get pods
# then open http://shop.localtest.me and http://admin.localtest.me (both name 127.0.0.1)
```

Useful checks: `kubectl -n shop rollout status deploy/storefront`, `kubectl -n shop describe hpa storefront`, `kubectl -n shop logs deploy/storefront`.

HPA shows `cpu: <unknown>` until you also install metrics-server (Docker Desktop does not ship it): `kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml` (Docker Desktop's cluster needs `--kubelet-insecure-tls` added to its args). If `http://shop.localtest.me` does not load, something else on your machine (commonly another local web server) is already using port 80/443; check with `kubectl -n ingress-nginx get svc` and, if its `EXTERNAL-IP` never leaves `<pending>`, verify with `kubectl -n ingress-nginx port-forward svc/ingress-nginx-controller 18080:80` and `curl -H "Host: shop.localtest.me" http://127.0.0.1:18080/` instead.

## 6. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| API: "Invalid API configuration" on start | A required `.env` value is missing; copy `apps/api/.env.example` to `apps/api/.env` |
| `pnpm exec nx test api` fails to connect | Postgres is not running: `docker compose up -d postgres` |
| Docker `shop-api` image: "Cannot find module 'tslib'" | Fixed by `"importHelpers": false` in `apps/api/tsconfig.app.json`; if it recurs, something reintroduced a `tslib` import and the pruned production install has no dev dependencies |
| `pnpm exec nx test api` fails to connect to Mongo/Meilisearch | `docker compose up -d mongo meilisearch` |
| Catalog listing/search returns nothing even though `realCatalog: true` | The catalog store is empty or stale: `pnpm db:seed:catalog` |
| "Online payment is not set up on this server yet" | No Razorpay test keys in `apps/api/.env`; use cash on delivery, or add your own `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` (test mode only — the API refuses a `rzp_live_...` key outright) |
| Cart/order calls return 403 "Missing CSRF header" | The frontend adapter should already add this automatically; if calling the API directly (curl, Postman), add `x-csrf: 1` to any non-GET `/cart` or `/orders` request |
| `docker` says it cannot connect to the daemon | Docker Desktop is not running; start it and retry |
| Storefront returns `400 Bad Request` with a "host is not allowed" message | The host name is missing from `ALLOWED_HOSTS` |
| Admin container keeps restarting | Check `docker compose logs admin` (usually an nginx config error) |
| Image build fails at `pnpm install` | The pnpm version must match `packageManager` in `package.json`; do not change the lockfile by hand |
| E2E test clicks "Sign in" but nothing happens | The app had not finished loading; wait for a visible effect first (the smoke tests do) |
| `pnpm audit` reports issues | Reported in CI but not blocking yet; triage and upgrade the package |

## 7. Not covered yet

Invoices as a real PDF, and an automated job reconciling payments against Razorpay's own records, aren't built yet (need BRD 23/24's messaging and scheduling infrastructure first). CSV bulk import and an image upload pipeline for the catalog aren't built yet either. Cloud deployment, Helm, secrets management and observability stacks arrive later in the backend phase (BRD 24, 25).
