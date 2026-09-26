# eCommerce Platform: Claude Instructions

Full-stack eCommerce app (Angular, Node.js, PostgreSQL/MongoDB, Redis, RabbitMQ, Meilisearch, Docker, K8s). Solo project, built in vertical slices, frontend first on mock data.

## Before every task
1. Read `steering/rules.md` (always) and `steering/memory.md` (decisions and learned patterns).
2. Read the steering doc(s) relevant to the task: `steering/architecture.md`, `steering/design.md`, `steering/security.md`.
3. Read the module BRD in `brds/` if one exists; otherwise the master `BR-eCommerce-Platform.md`.
4. If the task conflicts with a steering doc or BRD, stop and ask. Do not silently deviate.

## After every task
- Update `PROJECT-LOG.md` (plain-English decisions, work brief, new commands, problems solved, change history). This is mandatory, not optional.
- Commit after each finished BRD before starting the next one.
- If scope or behaviour changed, update the affected BRD (and the master BR if needed).
- If you noticed a repeated pattern, or a new decision was made, propose an update to the steering docs or a new skill. Show the proposed diff and wait for review; do not edit steering docs unilaterally.

## Map
- `PROJECT-LOG.md`: living plain-English diary of decisions, work and commands (keep updated)
- `BR-eCommerce-Platform.md`: master business requirements (approved baseline v1.0)
- `brds/`: per-module BRDs (created as each module starts)
- `steering/`: how we build (architecture, design, rules, security, memory)
