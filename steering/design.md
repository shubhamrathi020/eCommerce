# Design System

Goal: a clean, fast, trustworthy, modern shopping UI that works for any category (fashion, electronics, grocery). Neutral base so product imagery stands out.

## 1. Principles
1. **Content first:** product imagery and price are the heroes; chrome stays quiet.
2. **Fewer clicks:** shortest path from intent to purchase; sticky add-to-cart, guest checkout, inline validation.
3. **Trust:** clear prices (taxes, shipping shown early), stock status, delivery estimate, return policy, secure-payment cues.
4. **Mobile-first:** design at 360 px first; enhance up.
5. **Accessible by default:** WCAG 2.1 AA.
6. **Consistent:** use tokens and shared `ui-*` components; no one-off styles.

## 2. Tokens (CSS variables, exposed to Tailwind)
Defined once in `libs/shared/ui/styles/tokens.css`. Light and dark themes via `[data-theme]` and `prefers-color-scheme` (dark mode is P3, but tokens are built for it now).

- **Color (semantic, not raw):** `--color-bg`, `--color-surface`, `--color-surface-alt`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-primary`, `--color-primary-contrast`, `--color-accent`, `--color-success`, `--color-warning`, `--color-danger`, `--color-info`, `--color-sale` (price drops/discount badges).
  Starting palette (adjust in review): primary indigo `#4F46E5`, accent amber `#F59E0B`, success `#16A34A`, danger `#DC2626`, text `#111827`, muted `#6B7280`, bg `#FFFFFF`, surface-alt `#F9FAFB`. All text/background pairs must meet 4.5:1 contrast (3:1 for large text and UI borders).
- **Typography:** Inter (system fallback). Scale: 12/14/16/18/20/24/30/36/48 px; body 16 px; line-height 1.5 body, 1.2 headings. Weights 400/500/600/700.
- **Spacing:** 4 px base (`1=4, 2=8, 3=12, 4=16, 6=24, 8=32, 12=48, 16=64`).
- **Radius:** sm 6, md 10, lg 16, full. **Elevation:** 3 shadow levels (card, popover, modal).
- **Breakpoints:** sm 640, md 768, lg 1024, xl 1280, 2xl 1536. Content max width 1280 px, gutters 16 px (mobile) / 24 px (desktop).
- **Motion:** 150 ms (micro), 250 ms (panels), ease-out; honour `prefers-reduced-motion`.
- **Z-index scale:** dropdown 10, sticky 20, drawer 30, modal 40, toast 50.

## 3. Components (`libs/shared/ui`, prefix `ui-`)
Build once, reuse everywhere. Each has states (default, hover, focus, active, disabled, loading, error) and is documented in Storybook (or a dev-only showcase route).

Primitives: Button (primary/secondary/ghost/danger, sizes, icon, loading), IconButton, Input, Textarea, Select, Checkbox, Radio, Switch, QuantityStepper, Badge, Chip, Tag, Avatar, Rating (read/write), Price (MRP strike-through, discount %), Skeleton, Spinner, Tooltip, Divider.
Composite: Card, ProductCard, ProductGrid, Carousel, Gallery (zoom, thumbnails), Tabs, Accordion, Breadcrumb, Pagination, Modal/Dialog, Drawer, Dropdown/Menu, Toast, Alert/Banner, EmptyState, ErrorState, Stepper (checkout), FilterPanel, SortSelect, AddressForm, Table (admin), FormField (label + hint + error).

Use Angular CDK (overlay, a11y, dialog, menu) as the behaviour base for overlays and focus management rather than hand-rolling.

## 4. Layout and key screens
- **App shell:** header (logo, category mega-menu, search with autocomplete, account, wishlist, cart with count), footer (links, newsletter, payment icons), announcement bar. Header is sticky, condensed on scroll. Mobile: hamburger drawer, bottom sticky action bars where useful.
- **Home:** hero carousel, category tiles, deals/countdown, featured rows, recommendations, brand strip.
- **Listing/search:** left filter panel (drawer on mobile), sort, active-filter chips, result count, grid 2 columns (mobile) to 4 (desktop), skeletons while loading, clear empty and no-result states with suggestions.
- **PDP:** gallery left, info right (title, rating, price/discount, variant selectors with unavailable states, quantity, add-to-cart / buy now, delivery pin-code check, offers), tabs (description, specs, reviews, Q&A later), sticky add-to-cart bar on mobile.
- **Cart:** line items, quantity, save for later, coupon, price breakdown, checkout CTA; mini-cart drawer.
- **Checkout:** stepper, guest or login, address, delivery, payment, review; order summary always visible; inline validation; single primary CTA per step.
- **Account/Orders:** order list with status chips, detail with timeline, invoice, cancel/return actions.
- **Admin:** sidebar layout, data tables (sort, filter, bulk actions, pagination), forms with validation summary, dashboard cards + charts. Denser spacing than the storefront but the same tokens.

## 5. UX patterns
- **Loading:** skeletons matching final layout; never layout shift (CLS < 0.1). Optimistic updates for wishlist/cart quantity with rollback on error.
- **Empty/error states:** always explain what happened and offer the next action.
- **Forms:** labels always visible, validate on blur then on change, errors linked with `aria-describedby`, keep entered data on error, autofill attributes set (`autocomplete`), correct mobile keyboards (`inputmode`).
- **Feedback:** toasts for transient success; inline for field errors; dialogs only for destructive/irreversible confirmation.
- **Prices:** always `Price` component; INR formatted `₹1,299`; MRP struck through with % off; taxes label ("inclusive of taxes").
- **Stock:** "In stock", "Only N left" (threshold configurable), "Out of stock" with notify-me.
- **Images:** fixed aspect-ratio boxes per context (1:1 or 4:5 for cards), blur/skeleton placeholders, alt text mandatory.

## 6. Accessibility checklist (each component/page)
- Semantic HTML first (`button`, `a`, `nav`, `main`, headings in order); ARIA only when needed.
- Full keyboard operation, visible focus ring (2 px, token `--color-primary`), logical tab order, focus trap and restore in dialogs/drawers, skip-to-content link.
- Touch targets at least 44x44 px. No color-only meaning. Respect reduced motion. Live regions for cart/toast updates.
- Test with axe (automated) and a keyboard pass before "done".

## 7. Responsive rules
Design and verify at 360, 768, 1280 widths. No horizontal scroll. Grid columns and typography scale by breakpoint tokens, not custom media queries scattered in components.

## 8. Iconography and assets
One icon set (Lucide via SVG components), consistent 20/24 px sizes, `currentColor`. Logos and static images in `apps/*/public`. Product images in mock data use consistent placeholder sources.
