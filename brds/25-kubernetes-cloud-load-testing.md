# BRD 25: Kubernetes, Cloud Deployment and Load Testing

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
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
