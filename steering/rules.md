# Rules

## 1. Working agreement
- Work in **vertical slices**: one feature end to end (route, UI, state, data access, tests) per task.
- Frontend first. Backend does not exist yet, so all data comes from mock data behind interfaces (see architecture.md).
- Before coding a module, confirm a BRD exists in `brds/`. If not, draft a short one (goals, user stories, acceptance criteria, screens, data shape, open questions) and get it reviewed first.
- Keep changes small and reviewable. Do not refactor unrelated code. Do not add features not in the BRD; list them as suggestions instead.
- Ask when a requirement is ambiguous and the answer changes the design. Otherwise choose the default in these docs and state it.
- Update the BRD in the same task whenever behaviour or scope changes.
- Never commit, push, or install global tooling without being asked.

## 2. Tech baseline (frontend)
- Angular 22 (zoneless, SSR, esbuild), TypeScript 6 `strict: true`, Nx 23 monorepo with path aliases (`@ecom/...`), **pnpm** as package manager. Versions are logged in memory.md.
- Apps: `storefront` (SSR), `admin`, `seller` (P2). Shared code in `libs/`.
- Standalone components only (no NgModules), `OnPush` change detection everywhere, **Signals** for local/UI state, new control flow (`@if/@for/@switch`), `inject()` instead of constructor injection, typed reactive forms.
- Lazy-loaded routes per feature; `@defer` for below-the-fold blocks.
- RxJS only for real async streams (HTTP, events); convert to signals with `toSignal` at the edge.
- Global/shared state: NgRx SignalStore (or plain signal services when trivial). No state in components that other features need.
- Styling: Tailwind CSS + design tokens (design.md). No inline styles, no `!important`.
- Lint/format: ESLint (angular-eslint) + Prettier, enforced in CI and pre-commit.

## 3. Code conventions
- File names: kebab-case with Angular suffixes (`product-card.component.ts`, `cart.store.ts`, `catalog.service.ts`).
- Selector prefix `app-` (storefront), `adm-` (admin), `sel-` (seller), `ui-` (shared UI lib).
- One component per file; keep templates under ~150 lines, split otherwise.
- Types over classes for data (`interface`/`type`); no `any` (use `unknown` and narrow). No non-null `!` without a comment.
- Naming: `Product`, `ProductDto` (wire shape), `ProductVm` (view model) when they differ; map at the data-access boundary.
- Money is stored as **integer minor units (paise)** with a currency code; format only in the view via a pipe. Never use floats for money.
- Dates are ISO-8601 UTC strings on the wire; format in the view with the user's locale.
- IDs are opaque strings.
- Comments: explain *why*, not *what*. No commented-out code, no TODO without an owner/issue reference.
- Text shown to users goes through i18n keys once i18n is set up (P3); until then, keep strings in templates but never concatenate translated fragments.
- Errors: typed error results from data access; a single global error handler + toast service; never swallow errors silently.

## 4. Folder layout (Nx)
```
apps/
  storefront/  admin/  seller/
libs/
  shared/
    ui/            # dumb presentational components (ui-*)
    util/          # pure helpers, pipes, validators (no Angular services with state)
    core/          # cross-cutting services: config, storage, toast, error handler, SEO, consent, flags, analytics
    models/        # domain types shared by apps
    data-access/   # API clients + mock adapters (see architecture.md)
  storefront/<feature>/   # feature libs: pages, feature stores, feature components
  admin/<feature>/
tools/generate-mock-data/   # seeded scripts that write JSON fixtures into libs/shared/data-access/src/mock/data/
```
Dependency rule (enforced with Nx tags in eslint.config.mjs; `core` is tagged `type:util`): `app -> feature -> data-access/ui/util/models`. UI libs never import data-access. Features never import other features directly.

## 5. Testing
- Unit tests (Jest or Vitest, per Angular default at scaffold time) for stores, services, pipes, utils. Component tests with Testing Library for behaviour, not implementation.
- Every store/service function with logic (cart totals, coupon rules, filtering) needs tests, including edge cases.
- E2E (Playwright) for critical flows: browse, search, add to cart, checkout, login. Added per slice once the flow is stable.
- A task is "done" when: builds, lint passes, tests pass, and the feature is verified in the running app (desktop and mobile widths) with no console errors.

## 6. Performance rules
- Images: `NgOptimizedImage`, explicit width/height, lazy below the fold, responsive `srcset`.
- No large libs without justification (check bundle impact). Budgets in `angular.json`: initial bundle warning 600 kB (raised from 500 while mock adapters ship in the bundle; revisit when HTTP adapters replace them), error 1 MB.
- Track lists with `track` by id. Avoid function calls in templates; use `computed`.

## 7. Git (when asked to commit)
- Conventional Commits (`feat(cart): ...`, `fix(search): ...`, `docs(brd): ...`).
- One logical change per commit. Never commit secrets, `.env`, or build output.

## 8. Definition of done (per task)
0. `PROJECT-LOG.md` updated.
1. Matches BRD acceptance criteria.
2. Follows design.md (tokens, responsive, accessible) and security.md.
3. Tests, lint, and build pass.
4. Verified in the browser at mobile and desktop widths.
5. BRD and, if needed, steering proposals updated.
