# BRD 02: Catalog (Home, Listing, Product Detail)

| Field | Value |
|---|---|
| Status | Draft for review |
| Version | 0.1 (2026-09-26) |
| Covers (master BR) | CAT-01..04, CAT-07, CAT-10, CAT-11, UX-01..03, UX-06, UX-08, ENG-02 (read-only display), INV-01 (display only), PRM-01 (display), CMS-01 |
| Depends on | BRD 01 |

## 1. Purpose and scope
Let shoppers browse the product catalog: a home page, category/brand/collection listings with filters, and rich product detail pages, all working on mock data behind `CatalogApi`. Server-side search is BRD 03; add-to-cart wiring is BRD 04 (buttons exist and call a stubbed `CartApi`).

**Out of scope:** admin CRUD (admin BRD), reviews submission, Q&A, bundles, digital products, multi-language content.

## 2. User stories
- As a shopper, I browse the home page for deals, categories and recommended products.
- As a shopper, I open a category, filter by price, brand, rating, availability and category-specific attributes (size, colour, RAM, organic...), sort, and paginate; the URL reflects my choices so I can share it.
- As a shopper, I open a product, view images with zoom, choose variants, see price/discount/stock/delivery estimate, read specs and reviews.
- As a shopper, I see recently viewed products and can compare up to 4 products.
- As a search engine, I get server-rendered pages with metadata and structured data.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| CT-01 | Home page sections from mock CMS: hero carousel, category tiles, deals (with countdown), featured rows, new arrivals, best sellers, brand strip | Sections render from data; missing/empty sections are hidden, not broken; images lazy-loaded below fold |
| CT-02 | Category listing `/c/:slug` with breadcrumb, product grid, result count | Sub-category products included; invalid slug gives 404 |
| CT-03 | Filters: price range, brand, rating, availability, discount, plus dynamic attribute facets defined per category | Facet counts shown and update with selection; filters combine (AND across groups, OR within group) |
| CT-04 | Sorting: relevance/featured, price low-high, high-low, newest, rating, discount | Sort is stable and reflected in URL |
| CT-05 | Pagination (page numbers on desktop, load more on mobile); page size 24 | Query params `page`, `sort`, filter keys; back button restores state and scroll |
| CT-06 | Active-filter chips, clear all, mobile filter drawer | Removing chip updates results and URL |
| CT-07 | States: skeleton loading, empty result (with suggestions), error with retry | Each state visible via mock error/empty flags |
| CT-08 | Product card: image (hover second image on desktop), title, brand, rating + count, Price component, discount badge, stock badge, wishlist toggle (stub), quick add for single-variant items | Whole card is one link target with accessible name; no layout shift |
| CT-09 | PDP `/p/:slug`: gallery with thumbnails and zoom, title, brand, rating, price/MRP/discount, variant selectors (option groups; unavailable combos disabled), quantity, add to cart, buy now, delivery estimate by pin code (mock serviceability), offers, highlights | Selecting variant updates price, images, SKU, and stock; URL keeps `?variant=`; sticky add-to-cart bar on mobile |
| CT-10 | PDP tabs: description (sanitized rich text), specifications table (category-driven), reviews summary + list (rating distribution, sorting, verified badge) | Specs come from attribute definitions, not hard-coded per niche |
| CT-11 | Related products and "frequently bought together" row (mock) | Rows hide when no data |
| CT-12 | Recently viewed (localStorage, last 12) and compare (up to 4, comparison table) | Persist across refresh; compare table aligns attributes and highlights differences |
| CT-13 | Brand `/b/:slug` and collection `/collections/:slug` pages using the listing component | Reuse CT-02..07 |
| CT-14 | SEO: SSR HTML for home/category/PDP, unique title/description, canonical (filters/sort canonicalise to base), Open Graph, JSON-LD `Product` (price, availability, rating) and `BreadcrumbList` | Verified in server response; no duplicate-content for filter permutations (`noindex` on filtered pages beyond page 1) |
| CT-15 | Performance | LCP < 2.5 s on mobile profile with mock latency; images via `NgOptimizedImage` with `srcset`; listing skeleton avoids CLS |
| CT-16 | Accessibility | Gallery, variant picker, filters and carousel fully keyboard operable; axe 0 serious issues |

## 4. Screens
Home, Category/Brand/Collection listing (+ mobile filter drawer), PDP (+ zoom lightbox), Compare page, Recently viewed strip.

## 5. Data contract (DTOs, future API shape)
```ts
type Money = { amount: number; currency: 'INR' }; // minor units (paise)

interface Category { id; slug; name; parentId?; path: string[]; attributeDefs: AttributeDef[] }
interface AttributeDef { key; label; type: 'enum'|'number'|'boolean'|'text'; unit?; filterable: boolean; variantAxis: boolean; values?: string[] }
interface Brand { id; slug; name; logoUrl? }

interface Product {
  id; slug; title; brandId; categoryId; categoryPath: string[];
  description: string;              // sanitized HTML
  highlights: string[];
  images: ImageRef[];               // {url, alt, width, height}
  attributes: Record<string, string|number|boolean>;   // non-variant specs
  variantAxes: string[];            // e.g. ['size','colour']
  variants: Variant[];
  price: { min: Money; max: Money; mrpMin?: Money };   // derived for listing
  rating: { average: number; count: number; distribution: number[5] };
  tags: string[]; status: 'published';
  sellerId?: string;                // future marketplace hook
  seo?: { title?; description? };
}
interface Variant { id; sku; options: Record<string,string>; price: Money; mrp?: Money; stock: number; images?: ImageRef[]; barcode? }

interface ListingQuery { categorySlug?; brandSlug?; collectionSlug?; q?; filters: Record<string,string[]>; priceMin?; priceMax?; sort; page; pageSize }
interface ListingResult { items: ProductSummary[]; total: number; facets: Facet[]; page; pageSize }
```
`CatalogApi`: `home()`, `categoryTree()`, `category(slug)`, `listing(query)`, `product(slug)`, `related(id)`, `reviews(productId, query)`, `serviceability(pin, productId)`.

## 6. Business rules and edge cases
- Displayed price = variant price; in listing show "from" price when variants differ. Discount % = (MRP - price)/MRP, hidden below 1%.
- Stock: 0 = "Out of stock" (variant option struck through); <= threshold (default 5) = "Only N left".
- Out-of-stock products stay visible and rankable last; PDP offers notify-me (stub).
- Slug changes must not break URLs (mock: `slugHistory` for redirect, real: 301).
- Unknown variant in URL falls back to the first available variant.
- Delivery estimate: mock rules by pin-code prefix; invalid pin shows inline error.

## 7. Non-functional notes
SSR must not depend on browser APIs. Mock latency configurable (0 for SSR/tests). Rich text sanitized. Images from local placeholders or a stable seedable source.

## 8. Mock-data needs
About 250 products across fashion (size/colour), electronics (storage/RAM/colour, spec-heavy), grocery (weight/pack size, organic/veg flags), home, beauty, sports, books, toys; 40+ categories with attribute definitions; 25+ brands; 3+ images each; ratings/reviews (about 1,500 reviews); some out-of-stock, discounted, and single-variant products. Generated by `tools/generate-mock-data` with a fixed seed.

## 9. Open questions
- Page size and infinite scroll vs pagination on desktop (proposed: pagination desktop, load more mobile).
- Real product images later (placeholder images for now).

## 10. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-26 | Initial draft | Start of build |
