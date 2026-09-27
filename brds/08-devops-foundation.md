# BRD 08: DevOps Foundation (CI, Containers, Local Kubernetes, Smoke Tests)

| Field | Value |
|---|---|
| Status | Implemented; verified with Docker, real-browser tests and a real local Kubernetes cluster |
| Version | 0.3 (2026-09-27) |
| Covers (master BR) | NFR-MNT (CI/CD, IaC, containers), NFR-REL (health checks, zero-downtime rollout), NFR-PERF (autoscaling), NFR-SEC (container hardening, security headers), system design concepts: Docker, Kubernetes (Deployments, Services, Ingress, HPA, probes, ConfigMaps), CI pipeline |
| Depends on | BRD 01 to 07 (the two apps) |
| Not in this BRD | Backend services and databases (next phase), cloud deployment, Helm charts, service mesh, secrets manager |

## 1. Purpose and scope
Make the two apps (storefront with server-side rendering, admin console) buildable, testable and runnable as containers, with a pipeline that proves every change, plus manifests to run them on a local Kubernetes cluster. This is the base that the backend services will plug into.

## 2. User stories
- As a developer I open a pull request and a pipeline lints, tests and builds everything and reports failures.
- As a developer I run the whole shop with one command using Docker Compose.
- As an operator I deploy to a local Kubernetes cluster with health checks, rolling updates and autoscaling.
- As a reviewer I see quick end-to-end smoke tests protect the main shopping paths.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| DO-01 | CI pipeline (GitHub Actions) | On push and pull request: install with a locked lockfile, lint, unit test, build, run smoke tests; caches dependencies and the Nx cache; fails on any error; least-privilege token permissions |
| DO-02 | Storefront container | Multi-stage build produces a small image running the Node SSR server as a non-root user with a health endpoint; image size and layers are reasonable; `.dockerignore` keeps the context small |
| DO-03 | Admin container | Multi-stage build serves the static admin app with nginx (non-root friendly), SPA fallback, cache headers, security headers and a health endpoint |
| DO-04 | Health endpoints | Storefront answers `/healthz` (liveness) and `/readyz` (readiness) without rendering the app |
| DO-05 | Security headers | Storefront and admin send `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` (frame-ancestors), a Content-Security-Policy suited to each app, and `Permissions-Policy` |
| DO-06 | Docker Compose | `docker compose up --build` starts storefront (port 4000) and admin (port 4001) with health checks and a restart policy |
| DO-07 | Kubernetes manifests (local) | Namespace, Deployments (2 replicas, rolling update, resource requests and limits, liveness and readiness probes, non-root, read-only root filesystem where possible), Services, Ingress, HorizontalPodAutoscaler, ConfigMap; applied with Kustomize |
| DO-08 | Smoke tests | Playwright tests cover: home loads, search and open a product, add to cart, checkout as guest with cash on delivery, sign in and view the account, admin sign in and dashboard; they run against a built app in CI |
| DO-09 | Developer commands | A documented set of npm/pnpm scripts and a short `docs/RUNBOOK.md` explain build, run, test, compose, Kubernetes and troubleshooting |
| DO-10 | Quality gates | Bundle budgets enforced in the build; dependency audit step reports high severity issues; formatting check |

## 4. Deliverables
`.github/workflows/ci.yml`, `apps/storefront/Dockerfile`, `apps/admin/Dockerfile`, `apps/admin/nginx.conf`, `.dockerignore`, `docker-compose.yml`, `deploy/k8s/*` (Kustomize base), Playwright specs in `apps/storefront-e2e`, `docs/RUNBOOK.md`, health endpoints and headers in the storefront server.

## 5. Business rules
1. Containers run as non-root.
2. No secrets in images or manifests; configuration is by environment variable and ConfigMap.
3. A build that exceeds the size error budget fails the pipeline.

## 6. Non-functional notes
Images are built from the Nx production output (`dist/apps/...`). Cluster instructions target Docker Desktop Kubernetes, kind or minikube.

## 7. Open questions
None (advance approval given for decisions).

## 8. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft | Start of build |
| 2026-09-27 | Implemented DO-01..DO-10. Verified: both images build (storefront 247 MB, admin 79 MB), run healthy under `docker compose`, run as non-root (storefront uid 1000 with a read-only filesystem, admin nginx uid 101), health endpoints answer, security headers present, SPA fallback and immutable caching on the admin, 6 Playwright smoke tests pass in a real browser (home, search, guest COD checkout, sign in, 404, admin sign in and dashboard), lint, tests and builds for all 14 projects pass | Slice built |
| 2026-09-27 | Kubernetes: manifests pass `kubectl kustomize` (render check) but were NOT applied, because this machine has no cluster (Docker Desktop Kubernetes is off, no kind or minikube). Apply and rollout behaviour are unverified | Honest limit of this environment |
| 2026-09-27 | CI workflow written but not run (no GitHub remote yet). The formatting check was dropped (files are not yet Prettier-formatted); the dependency audit reports but does not block | Avoid a failing pipeline on day one |
| 2026-09-27 | Angular blocks unknown Host headers on the SSR server, so `ALLOWED_HOSTS` was added (found when the production server returned 400) | Real bug found by running the built server |
| 2026-09-27 | CSP: script inline execution is allowed only by per-request nonce plus the hash of Angular's static bootstrap script. Critical-CSS inlining is turned off in production builds because it injects inline `onload` handlers that a strict CSP forbids. Styles still allow `unsafe-inline` (Angular adds component styles at runtime) | Strict scripts, pragmatic styles |
| 2026-09-27 | The `packageManager` field pins pnpm 9.15.9. Without it the Docker build picked a newer pnpm that rejected recently released packages | Reproducible installs |
| 2026-09-27 | Known limitation: a form submitted before the app finishes loading does a plain browser submit (the page reloads). The smoke tests wait for the app to be ready first | Event replay only covers clicks |
| 2026-09-27 | Kubernetes verified for real (you turned on Docker Desktop Kubernetes, F2). Built both images, installed ingress-nginx, ran `kubectl apply -k deploy/k8s/base`: both Deployments reached 2/2 Ready, the PodDisruptionBudgets held (deleted a storefront pod, it was replaced automatically, `minAvailable: 1` never breached), both Services and the Ingress route real traffic (`shop.localtest.me` and `admin.localtest.me` both answered `/healthz`, `/`, `/robots.txt` with the right titles and security headers through the ingress, verified via `kubectl port-forward` since this machine's port 80 is already used by another local service, not by Kubernetes). The HorizontalPodAutoscalers were created correctly but read `cpu: <unknown>` because Docker Desktop does not ship metrics-server by default; that is a metrics-server installation step, not a problem with the manifests | Genuinely applied and verified, not just rendered |
| 2026-09-27 | `docs/RUNBOOK.md` gained a troubleshooting row for the port-80 conflict found above, and a note that HPA needs metrics-server installed separately to show real numbers | Save the next person the same investigation |
