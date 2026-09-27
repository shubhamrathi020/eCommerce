# Runbook

Everyday commands for building, running, testing and deploying the shop. Commands use `pnpm` (the version is pinned in `package.json`).

## 1. First time

```bash
pnpm install
```

Needs Node 22 and pnpm (`corepack enable` picks the pinned version). Docker Desktop is needed for containers.

## 2. Run for development

| Command | What it does |
|---|---|
| `pnpm start:storefront` | Shop at http://localhost:4200 (live reload, server-side rendering) |
| `pnpm start:admin` | Admin console at http://localhost:4201 |

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
pnpm docker:up      # builds both images and starts them
pnpm docker:down    # stops and removes them
```

| App | URL | Container user | Health |
|---|---|---|---|
| Storefront (Node, server-side rendering) | http://localhost:4000 | node (uid 1000), read-only filesystem | `/healthz`, `/readyz` |
| Admin console (nginx, static) | http://localhost:4001 | nginx (uid 101) | `/healthz` |

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
| `docker` says it cannot connect to the daemon | Docker Desktop is not running; start it and retry |
| Storefront returns `400 Bad Request` with a "host is not allowed" message | The host name is missing from `ALLOWED_HOSTS` |
| Admin container keeps restarting | Check `docker compose logs admin` (usually an nginx config error) |
| Image build fails at `pnpm install` | The pnpm version must match `packageManager` in `package.json`; do not change the lockfile by hand |
| E2E test clicks "Sign in" but nothing happens | The app had not finished loading; wait for a visible effect first (the smoke tests do) |
| `pnpm audit` reports issues | Reported in CI but not blocking yet; triage and upgrade the package |

## 7. Not covered yet

Backend services and databases, cloud deployment, Helm, secrets management and observability stacks arrive with the backend phase.
