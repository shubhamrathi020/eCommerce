# BRD 06: Admin Console

| Field | Value |
|---|---|
| Status | Implemented (mock adapters, seeded demo data) |
| Version | 0.2 (2026-09-27) |
| Covers (master BR) | ADM-01..07, ADM-10 (bulk actions on products), CAT-01/08 (product management, lifecycle), ORD-07/12 (order management, audit), PRM-02 (coupon management), AUTH-07 (role-based access) |
| Depends on | BRD 01, 02, 04, 05 |
| Not in this BRD | Media uploads, category/attribute management, banners/CMS editor, reports export (ADM-08), seller portal, real-time updates, refunds through the payment provider |

## 1. Purpose and scope
A separate back-office app (`apps/admin`) for store staff: see how the business is doing, manage products, process orders, run coupons, manage staff roles, and see who changed what.

It runs on mock adapters and its own seeded demo data (about 60 orders over 30 days, demo customers). Because the admin and storefront are separate browser origins in development, they cannot share the mock data; a real backend will unify them. Every change is recorded in an audit log.

## 2. User stories
- As an admin I sign in and land on a dashboard with revenue, orders, average order value, new customers, a revenue chart, top products and low-stock alerts.
- As an admin I find products quickly (search, filter by status, sort), edit price, stock and details, create products, publish/archive them, and apply bulk actions.
- As an admin I work through orders: filter by status and payment, open an order, move it forward (packed, shipped, delivered), cancel it, and leave notes.
- As an admin I create and switch coupons on or off.
- As an admin I see users and can grant or remove the admin role (but not my own).
- As an admin I can see an audit trail of every change.
- As a non-admin, I cannot use the console.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| AD-01 | Console access is limited to users with admin permissions (AUTH-07) | Signed-out users go to the admin sign in; a customer account is refused with a clear message; the sidebar only shows areas the user's permissions allow |
| AD-02 | Dashboard (ADM-01) for 7, 30 or 90 days | Shows revenue, order count, average order value, new customers, revenue by day chart (with a text table alternative), order status breakdown, top 5 products, low-stock list |
| AD-03 | Product list (ADM-03) | Search by title/brand/SKU, filter by status, sort by updated/title/price/stock, pagination, status badges, stock totals; numbers formatted with the money pipe |
| AD-04 | Product edit and create (CAT-01) | Edit title, brand, description, highlights, status, tags and per-variant price, MRP and stock; inline validation (title required, price greater than zero, MRP not below price, stock is a whole number 0 or more); saving records an audit entry |
| AD-05 | Lifecycle (CAT-08) | Products are Draft, Published or Archived; new products start as Draft; only Published products would be shown on the storefront |
| AD-06 | Bulk actions (ADM-10) | Select rows, then Publish, Archive or Delete drafts; confirmation shown; result summarised |
| AD-07 | Order list (ORD-07) | Search by order number or customer, filter by status and payment method, date range, pagination |
| AD-08 | Order detail and processing | Shows items, address, totals, payment and timeline; allowed transitions only (confirmed to packed to shipped to delivered, cancel before shipping); adds timeline entries; notes can be added |
| AD-09 | Coupons (PRM-02) | List with usage and status; create and edit (percent, flat, free shipping; minimum; cap; expiry); activate or deactivate; duplicate codes rejected |
| AD-10 | Users and roles (ADM-02) | List users with roles and order counts; grant or revoke admin; cannot change your own role; changes are audited |
| AD-11 | Audit log (ADM-07, ORD-12) | Every product, order, coupon and role change is recorded with who, when, what; the list is searchable and paginated |
| AD-12 | Settings overview (ADM-06, read only) | Shows store name, currency, tax rules, shipping rules and payment methods as configured |
| AD-13 | Security | Access checks are for convenience only (noted for the backend); no secrets in the app; audit entries never contain passwords; all text output is escaped |
| AD-14 | Accessibility and quality | Keyboard-operable tables and forms; labelled controls; axe reports no serious issues on the main pages; lazy-loaded routes; responsive down to tablet width |

## 4. Screens
Sign in, dashboard, products list, product form, orders list, order detail, coupons list and form, users, audit log, settings.

## 5. Contracts (summary)
`AdminProductApi` (list, get, create, update, bulk), `AdminOrderApi` (list, get, advance, cancel, addNote), `AdminCouponApi` (list, save, setActive), `AdminUserApi` (list, setRole), `AdminDashboardApi` (metrics), `AuditApi` (list).

## 6. Business rules
1. Order transitions: pending payment to cancelled; confirmed to packed or cancelled; packed to shipped or cancelled; shipped to delivered. Nothing else.
2. A product needs at least one variant; a variant needs a unique SKU.
3. Deleting is allowed only for Draft products.
4. An admin cannot remove their own admin role.
5. Every write action records an audit entry.

## 7. Non-functional notes
Client-rendered only (no SSR). Tables are paginated at 20 rows. Lazy routes per area.

## 8. Mock-data needs
Seeded orders (about 60 across statuses), demo customers, existing 252 products, existing coupons.

## 9. Open questions
None (advance approval given for decisions).

## 10. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft | Start of build |
| 2026-09-27 | Implemented AD-01..AD-14: permission-guarded admin app with sidebar; dashboard (KPIs, revenue chart with a table alternative, status breakdown, top products, low stock, 7/30/90 days); product list (search, status filter, sort, pagination, bulk publish/archive/delete drafts); product create and edit with variants and validation; order list with filters and order detail (allowed transitions only, cancel with confirmation, internal notes); coupon management; users and admin role toggle with safeguards; audit log; read-only settings. 62 data-layer tests and admin page tests with accessibility checks pass; checked in the browser | Slice built |
| 2026-09-27 | Data: because the admin app runs on its own origin (port 4201) in development, it cannot see the storefront's mock orders or edits. It uses its own seeded data: about 60 demo orders across 30 days, 12 demo customers, the 252 products. A real backend will make both apps share data | Browser storage is per origin |
| 2026-09-27 | Permission checks run in the mock API on every call (not only in route guards), as the real backend must | Guards are only a convenience |
| 2026-09-27 | Category cannot be changed after a product is created; new products reuse an existing product's images (no uploads yet) | Media management is out of scope |
| 2026-09-27 | Admin adapters are provided only by the admin app (`provideAdminDataAccess`), so the storefront bundle does not carry them. Storefront initial bundle is now about 569 kB (warning limit 600 kB) | Keeps bundles separate |
| 2026-09-27 | Not built: media upload, category and attribute management, banner and CMS editing, report export, pagination size choice | As scoped |
