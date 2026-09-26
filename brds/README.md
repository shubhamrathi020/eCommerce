# Module BRDs

Detailed business requirements per major functionality. The master `../BR-eCommerce-Platform.md` stays the high-level baseline; each module BRD refines its requirement IDs into user stories and acceptance criteria.

## Naming
`NN-<module>.md` (e.g. `01-catalog.md`, `02-search.md`, `03-cart.md`).

## Template
1. Purpose and scope (master BR IDs covered, e.g. CAT-01..CAT-11)
2. Personas and user stories
3. Functional requirements and acceptance criteria (Given/When/Then)
4. Screens and flows (list, wireframe notes)
5. Data model / DTO contract (used by mock adapters and future API)
6. Business rules and edge cases
7. Non-functional notes (performance, a11y, SEO, security)
8. Mock-data needs
9. Open questions
10. Change log (date, what changed, why)

## Index
| BRD | Status |
|---|---|
| [01-shell-design-system](01-shell-design-system.md) | Implemented (storefront shell) |
| [02-catalog](02-catalog.md) | Implemented (mock data) |
| [03-search](03-search.md) | Implemented (mock engine) |
| [04-cart-checkout](04-cart-checkout.md) | Implemented (mock adapters) |
| [05-accounts](05-accounts.md) | Implemented (mock identity) |
| [06-admin-console](06-admin-console.md) | Implemented (mock, separate seeded data) |
| [07-reviews](07-reviews.md) | Implemented (mock) |
