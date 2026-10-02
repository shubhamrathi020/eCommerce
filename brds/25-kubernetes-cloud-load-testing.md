# BRD 25: Kubernetes, Cloud Deployment and Load Testing

| Field | Value |
|---|---|
| Status | Built locally (cloud deployment and the CD pipeline written but never run) |
| Version | 0.2 (2026-10-02) |
| Phase | Backend |
| Covers (master BR) | NFR-REL, NFR-PERF, NFR-MNT (CD, IaC) |
| Depends on | BRD 08, 19 to 24 |
| Not in this BRD | Multi-region active-active |

## 1. Purpose and scope
Run the full stack on Kubernetes locally, then in a cloud, and prove it handles a flash sale.

## 2. User stories
- As an operator I deploy a release with one command and roll back safely.
- As the owner I know the system survives peak traffic.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| K8-01 | Full stack manifests or Helm charts (frontends, API, workers, PostgreSQL, Redis, RabbitMQ, Meilisearch, MongoDB) for a local cluster | One command brings up the whole system on a fresh cluster |
| K8-02 | Secrets management (sealed or external secrets), config per environment, network policies | No secret in the repository; pods only talk to what they need |
| K8-03 | Autoscaling on CPU and queue depth; pod disruption budgets; rolling and canary releases | A canary release can be aborted automatically on errors |
| K8-04 | Continuous delivery pipeline: build, scan images, deploy to staging, promote to production | Failed health checks stop a promotion |
| K8-05 | Cloud deployment on the chosen provider with infrastructure as code | Staging environment created and destroyed from code |
| K8-06 | Load tests (k6) for browse, search, checkout and a flash-sale last-unit scenario with pass or fail thresholds | No oversell; p95 targets met at design load |
| K8-07 | Capacity plan, cost estimate and disaster recovery runbook | Documented and reviewed |

## 4. Deliverables
Manifests or charts, IaC, pipelines, load test scripts, reports.

## 5. Business rules
1. Environments are reproducible from the repository.

## 6. Non-functional notes
Targets: 99.9% availability, 10,000 concurrent users, 1,000 orders per minute.

## 7. What we need from you before starting
- Choose the cloud provider and budget.
- Enable a local Kubernetes cluster (Docker Desktop Kubernetes is easiest).

## 8. Open questions
- Which cloud (AWS, GCP, Azure) and region?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
| 2026-10-02 | Built, with three requirements only partly met (see below). **K8-01** done and verified: the whole stack (storefront, admin, API, Postgres, Mongo, Redis, RabbitMQ, Meilisearch) runs on the local Kubernetes cluster from `kubectl apply -k deploy/k8s/data-tier` then `deploy/k8s/base`; a real order was placed through the ingress over HTTPS. **K8-02** done: no secret in the repository (kustomize `secretGenerator` reads gitignored env files; only `.example` templates are committed), and ingress NetworkPolicies that are *enforced* on Docker Desktop (proven when the seed Job was blocked until it was allowed). **K8-03** mostly done: HPA (the API scaled 2 → 7 pods under the checkout test), disruption budgets, rolling updates, and a replica-ratio canary (`api-stable` + `api-canary` behind one Service) with an automatic-abort script (`deploy/scripts/canary-check.sh`, `docs/CANARY-RELEASE.md`) — the abort decision is tested on synthetic healthy/failing/silent samples and a live healthy canary, not on a canary that genuinely fails; scaling on RabbitMQ queue depth needs KEDA and was not built. **K8-06** done: k6 scripts for browse, search, checkout and flash-sale (`deploy/load-tests`); browse p95 7.8 ms, search 53 ms, checkout 88 ms with 223 orders / 0 5xx / 0 outbox backlog, and the flash-sale race (80 buyers, 20 units) ended at stock exactly 0 with exactly 20 orders, twice — no oversell. The design targets (10,000 users, 1,000 orders/min) were not tested and cannot be on one machine. **K8-07** done as a document (`docs/CAPACITY-PLAN.md`: measured vs estimated, rough cost, disaster-recovery runbook) — the cost figures are unchecked estimates. **K8-04 and K8-05 are written but never run**: `.github/workflows/ci.yml` now builds and Trivy-scans the API image and renders both kustomizations (that part is real CI and unrun-on-GitHub only), `.github/workflows/deploy.yml` (staging → canary → promote, rolls back on failed health checks) and `deploy/terraform/aws` (EKS, RDS, ElastiCache) need a real cloud account and registry that do not exist here, and `terraform` is not installed, so they have not even been validated. Real bugs found only by running the built image on Kubernetes: (1) `apps/api/tsconfig.app.json` targeted es2021, which made the build move Prisma's class fields ahead of `super()` and crash every database request — fixed by targeting es2022; (2) Postgres cannot start under the `restricted` Pod Security level (its entrypoint must chown a fresh volume), so it lives alone in a `shop-data` namespace at `baseline`; (3) `rabbitmq-diagnostics` needs a probe timeout above Kubernetes' 1-second default; (4) the migrate Job needed `COREPACK_HOME` under a read-only filesystem; (5) reusing an image tag can run a stale image — tag every build uniquely. Also made the global per-IP rate limit configurable (`RATE_LIMIT_GLOBAL_PER_MIN`), because the hardcoded 300/min was the first limit any single test client hit. | Prove the full stack on Kubernetes and that the system cannot oversell under a flash-sale race, and be explicit about what could not be done without a cloud account |
