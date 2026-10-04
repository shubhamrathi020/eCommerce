# eCommerce (frontend)

Angular apps for the shop: the **storefront** (server-side rendered, installable), the **admin console** and the **seller portal**, built as an Nx workspace with pnpm. They run entirely on built-in mock data unless pointed at the real backend.

The project is split into seven repositories that sit side by side (the last four are further implementations of the same product, see `brds/26-react-and-go-stack.md` and `brds/27-node-and-dotnet-backends.md`):

| Repository | What it holds |
|---|---|
| `eCommerce` | **This repository**: the frontend apps, and the requirements (`brds/`), project log and steering docs for the whole project |
| `eCommerce-api` | The NestJS backend, database schema, Docker, Kubernetes, Terraform and monitoring |
| `eCommerce-contracts` | The shared package `@ecom/contracts`: API types, error codes and the pure pricing, promotion and returns rules that the browser and the server must agree on |
| `eCommerce-go` | A Go backend serving the same API as the Nest one, on the same databases (port 3334) |
| `eCommerce-node` | A plain Node.js (Express) backend serving the same API as the Nest one, on the same databases (port 3335) |
| `eCommerce-dotnet` | An ASP.NET Core backend serving the same API as the Nest one, on the same databases (port 3336) |
| `eCommerce-react` | The storefront, admin console and seller portal in React; each works with mock data or any of the four backends (`VITE_BACKEND=nest\|go\|node\|dotnet`) |

## Start

```bash
pnpm install
pnpm start:storefront     # http://localhost:4200
pnpm start:admin          # http://localhost:4201
pnpm start:seller         # http://localhost:4202
pnpm verify               # lint, unit tests and production builds
```

Everyday commands, containers and troubleshooting: [docs/RUNBOOK.md](docs/RUNBOOK.md). Reading order for the project: [CLAUDE.md](CLAUDE.md), then `steering/`, then the BRD for the module in [brds/](brds/README.md).

## Working with the contracts package

`package.json` installs the contracts package from its tagged GitHub release:

```json
"@ecom/contracts": "github:shubhamrathi020/eCommerce-contracts#v0.1.0"
```

pnpm downloads that tag and builds it on install, so nothing needs to sit next to this repository. Always depend on a tag, never a branch.

To change the contract: edit and tag it in `eCommerce-contracts`, push the tag, then in this repository and in `eCommerce-api` run `pnpm add -w github:shubhamrathi020/eCommerce-contracts#<new-tag>`. A breaking change needs both sides updated before either is deployed. To try an unreleased change locally, temporarily point the dependency at the folder (`pnpm add -w link:../eCommerce-contracts`, after `pnpm build` there) and put the tag back before committing.
