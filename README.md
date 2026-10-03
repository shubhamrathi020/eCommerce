# eCommerce (frontend)

Angular apps for the shop: the **storefront** (server-side rendered, installable), the **admin console** and the **seller portal**, built as an Nx workspace with pnpm. They run entirely on built-in mock data unless pointed at the real backend.

The project is split into three repositories that sit side by side:

| Repository | What it holds |
|---|---|
| `eCommerce` | **This repository**: the frontend apps, and the requirements (`brds/`), project log and steering docs for the whole project |
| `eCommerce-api` | The NestJS backend, database schema, Docker, Kubernetes, Terraform and monitoring |
| `eCommerce-contracts` | The shared package `@ecom/contracts`: API types, error codes and the pure pricing, promotion and returns rules that the browser and the server must agree on |

## Start

```bash
cd ../eCommerce-contracts && pnpm install && pnpm build    # once, and after contract changes
cd ../eCommerce
pnpm install
pnpm start:storefront     # http://localhost:4200
pnpm start:admin          # http://localhost:4201
pnpm start:seller         # http://localhost:4202
pnpm verify               # lint, unit tests and production builds
```

Everyday commands, containers and troubleshooting: [docs/RUNBOOK.md](docs/RUNBOOK.md). Reading order for the project: [CLAUDE.md](CLAUDE.md), then `steering/`, then the BRD for the module in [brds/](brds/README.md).

## Working with the contracts package

`package.json` depends on the contracts package by path:

```json
"@ecom/contracts": "link:../eCommerce-contracts"
```

That works on this machine only. Before CI or a container build can run anywhere else, publish `eCommerce-contracts` (for example to GitHub) and switch both this repository and the backend to a tagged git dependency:

```bash
pnpm add -w github:<your-account>/eCommerce-contracts#v0.1.0
```

Then delete the `contracts` stage and the two `COPY --from=contracts` lines in `apps/storefront/Dockerfile`, `apps/admin/Dockerfile` and `apps/seller/Dockerfile` (they exist only to supply the sibling folder to a Docker build). Always depend on a tag, never a branch.

A change to the contract is made in `eCommerce-contracts`, tagged, and then taken up here and in the backend; a breaking change needs both sides updated before either is deployed.
