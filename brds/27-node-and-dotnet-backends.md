# BRD 27: Node and .NET backends

| Field | Value |
|---|---|
| Status | Done locally (both servers pass the shared integration specs and interop checks; not run on GitHub Actions, not exercised by a browser) |
| Version | 0.1 (2026-10-05) |
| Phase | Platform |
| Covers (master BR) | NFR-MNT (maintainability, technology choice) |
| Depends on | BRD 19 to 25 (the Nest backend is the specification), BRD 26 (the Go backend and the way parity is proven) |
| Not in this BRD | Replacing any existing backend. All four stay; any frontend can use any of them |

## 1. Purpose and scope
Two more implementations of the backend, so that one can switch between four servers (Nest, Go, Node, .NET) and everything works the same:

- **eCommerce-node**: plain Node.js with Express and ordinary libraries, no framework.
- **eCommerce-dotnet**: ASP.NET Core controllers and EF Core.

Both serve the same HTTP API as `eCommerce-api` against the same PostgreSQL, MongoDB, Meilisearch, Redis and RabbitMQ. "The same" means the
Nest integration specs pass unchanged, the same tokens, cookies, password hashes and error bodies are produced, and a user, a refresh
token or a cart created on one server works on the others.

## 2. Decisions
- Two new sibling repositories (owner's choice of stack: Express with plain libraries; ASP.NET Core controllers with EF Core at full
  parity; the .NET 10 SDK installed into the user's own folder, not system-wide).
- **The Nest backend remains the owner of the PostgreSQL schema and of the specs.** The new servers only read and write the tables.
- Ports: Nest 3333, Go 3334, Node 3335, .NET 3336. All four compose files join the external `shop_default` network and list the same CORS origins
  (the Angular and React dev and production ports).
- Node keeps the typed Prisma client for the database (generated from a verbatim copy of the schema, never migrated) and uses the shared
  `@ecom/contracts` package directly, so the business rules are the very same code. .NET has no TypeScript, so it carries a C# port of the
  rules, held to the same golden output as Go (400 generated carts, coupons, money, serviceability, summaries, sort orders).
- The spec harness in `eCommerce-api` runs any server: `API_BIN` (and `API_ARGS`) replace the older `GO_API_BIN`, which still works.

## 3. What was built
| Area | Node (Express) | .NET (ASP.NET Core) |
|---|---|---|
| HTTP pipeline | One `Routes` registrar in Nest's order: rate limit, bucket limit, guards, body validation, handler | Middleware for Express behaviour (HEAD, weak ETags, CORS, body parser, error shape) and MVC resource filters for the same guard order |
| Body validation | A small schema validator with class-validator's whitelist and forbid-unknown rules | Strict System.Text.Json (required members, unknown properties refused) plus `[MaxLength]`, `[OneOf]` |
| Data | Prisma client, same transactions and outbox | EF Core over the Prisma-created tables (camelCase columns, naive UTC timestamps, jsonb as text) |
| Catalog, search, cache | mongodb, Meilisearch SDK, ioredis | MongoDB.Driver, Meilisearch REST, StackExchange.Redis |
| Messaging | amqplib: outbox relay, notification consumer with retry and dead-letter queues, scheduler with Redis locks | RabbitMQ.Client 7: the same topology and flows |
| Operations | Prometheus metrics, circuit breakers, health probes, Docker image, CI | The same, with `prometheus-net` |

## 4. Verification
- The 8 integration spec files of the Nest API (65 tests; 64 run, the one that calls a Nest internal is replaced by a test in each new repository) pass
  against **both** servers, unchanged.
- A differential probe (`eCommerce-api/apps/api/test/parity-probe.spec.ts`) recorded how Nest answers odd requests (malformed JSON, oversized body,
  unknown routes, CORS preflight, HEAD, conditional GETs, missing CSRF, wrong content type, repeated query keys ...). The diff against Node shows one
  cosmetic difference (a request id on one error); against .NET it shows two (the JSON parser's message wording, and a path with a broken percent-encoding).
- Interop with Go running at the same time on the same databases: a user registered on any of the three signs in on the other two, an access token is
  accepted by the others, a refresh cookie rotates across servers and a rotated one is refused (reuse detection), and a cart filled on one is read on the others.
- .NET unit tests (21): golden rules from the TypeScript original, a hash and a token made by Node verified here, configuration, circuit breaker, the
  abandoned-cart job. Node unit tests (24): validator, configuration, breaker, Razorpay signatures, the abandoned-cart job.
- The Node image was built, started read-only as a non-root user, reached `healthy`, answered `/readyz` against the real stores and placed and cancelled a cash-on-delivery order.
- The React apps choose the server with `VITE_BACKEND=nest|go|node|dotnet`.
- **Not done:** a run on GitHub Actions; the .NET Docker image was not run end to end (see the project log for its state); the React apps were not clicked through
  against Node or .NET (they use the same adapters and only the port differs); real Razorpay payments; an OpenAPI page for the new servers.

## 5. Business rules
1. A change to behaviour, an error message or a route is made in `eCommerce-api` first, then repeated in the other three; the specs say whether it matches.
2. The schema is changed only by Nest's migrations; the new servers' copies of it (`prisma/schema.prisma`, `Data/Entities.cs`) follow.
3. A frontend must work against any of the four backends and the mocks without code changes.

## 6. Change log
| Date | Change | Reason |
|---|---|---|
| 2026-10-05 | Node and .NET backends built and verified; spec harness generalised; React backend switch extended | Owner request: two more backends, switchable like Go |
