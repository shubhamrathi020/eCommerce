# Phase 1 Frontend: Verification Checklist and Your To-Do List

Use this to check everything built so far (BRDs 01 to 08) and to give the inputs needed to finish phase 1 (BRDs 09 to 12). Tick items as you go and tell me anything that looks wrong.

## A. Get it running (10 minutes)

| # | Step | Command or action | You should see |
|---|---|---|---|
| A1 | Install | `pnpm install` | No errors |
| A2 | Everything is green | `pnpm verify` | Lint, tests and builds succeed for all 14 projects |
| A3 | Start the shop | `pnpm start:storefront` then open http://localhost:4200 | Home page with banner, categories, deals |
| A4 | Start the admin | `pnpm start:admin` then open http://localhost:4201 | Admin sign in page |
| A5 | Containers (optional) | Start Docker Desktop, then `pnpm docker:up` | Shop on http://localhost:4000, admin on http://localhost:4001; `pnpm docker:down` to stop |
| A6 | Browser smoke tests (optional) | `pnpm e2e` | 6 tests pass |

## B. Walk through the shop as a customer (about 30 minutes)

Development helpers: sign-in pages have a "Development only: fill demo ..." button, and `/dev/mailbox` shows the emails the shop would send.

| # | Area | Try this | Expected |
|---|---|---|---|
| B1 | Browse | Open a category, pick filters (brand, price), change sort, go to page 2 | URL changes, results and counts update, back button works |
| B2 | Product page | Change size or colour, zoom the image, check a pin code (for example 560001) | Price, stock and SKU change; delivery date appears |
| B3 | Search | Type "lap", then search "labtop" and "sneekers", then "qzqzqz" | Suggestions appear; typos still find products; the last shows a friendly no-results page |
| B4 | Cart | Add two products, change quantity, apply `WELCOME10`, try `EXPIRED50` | Discount shown; expired code gives a clear message; free-shipping hint updates |
| B5 | Guest checkout | Checkout with cash on delivery (pin 560001) | Order page with a tracking timeline; it advances over about 6 minutes |
| B6 | Online payment | Checkout with online payment, click "Simulate failed payment", then "Retry", then success | Order stays pending after failure, becomes paid after success |
| B7 | Order extras | Open the invoice, print preview, cancel a confirmed order | Invoice shows GST; header and footer hidden when printing |
| B8 | Account | Register a new account, open `/dev/mailbox`, click the verify link | Account shows verified; sign out and in works |
| B9 | Guest to account | Add an item as a guest, then sign in | The item is in your account cart |
| B10 | Addresses | Add two addresses, make one default, place an order | Checkout is pre-filled and offers "Save this address" |
| B11 | Wrong passwords | Try 5 wrong passwords for one email | You are locked out with a time message |
| B12 | Reviews | Buy a product, open its Reviews tab, write a review; write another with a link in the text | First goes live; the second is "waiting for moderation" |
| B13 | Wishlist and compare | Heart two products, compare three products | Wishlist page and compare table work |
| B14 | Privacy | Account, Privacy, export data, then (with a throwaway account) delete it | JSON downloads; account is gone |

## C. Walk through the admin (about 20 minutes)

Sign in with "fill demo admin" at http://localhost:4201 (admin data is separate from the shop's data in development; see known issues).

| # | Area | Try this | Expected |
|---|---|---|---|
| C1 | Dashboard | Switch 7, 30 and 90 days; open "View as table" | Figures and chart change; table matches |
| C2 | Products | Search, filter by status, bulk archive two, create a product, edit price and stock | Changes persist; validation messages are clear |
| C3 | Orders | Filter by status, open a confirmed order, mark packed then shipped, add a note | Only valid steps offered; timeline updates |
| C4 | Coupons and users | Create a coupon, deactivate it, grant admin to a seeded user | Saved; you cannot change your own role |
| C5 | Reviews | Approve, reject and delete flagged reviews | Queue shrinks; actions appear in the audit log |
| C6 | Audit and settings | Open both | Every change above is listed; settings are read-only |
| C7 | Access | Sign in with the demo customer at the admin | Refused with a clear message |

## D. Look and feel (you decide)

- [ ] Overall design, colours and spacing are acceptable as a base (or list changes).
- [ ] Mobile: use your browser's phone view on home, listing, product, cart and checkout.
- [ ] Keyboard only: can you sign in, search and add to cart without a mouse?
- [ ] Anything confusing, missing or ugly? Write it down, however small.

## E. Inputs I need from you (so I can finish phase 1)

| # | What | Why | Blocking |
|---|---|---|---|
| E1 | Brand name, logo file, and preferred colours | Currently placeholders ("Shop", indigo and amber) | BRD 09, 12 |
| E2 | Text for About, FAQ, Terms and Privacy pages | Currently placeholders; needs your real or legal-reviewed text | BRD 09 |
| E3 | Banner images or approval to keep generated placeholders | Home page banners | BRD 09 |
| E4 | The real site address (domain) you plan to use | Sitemap, canonical links, allowed hosts | BRD 09, 19 |
| E5 | Stock policy: reservation timeout (proposed 15 min), low-stock threshold (proposed 5) | Inventory rules | BRD 11 |
| E6 | Which notifications are launch-ready (order updates, price drop, back in stock) and marketing opt-in default | Notification rules | BRD 10 |
| E7 | Performance and browser targets (proposed: Lighthouse 90+ on mobile; Chrome, Edge, Safari, Firefox; phone widths 360 and 390) | Hardening goals | BRD 12 |
| E8 | Answers to the "Open questions" in BRDs 09 to 12 | Scope decisions | each BRD |

## F. Things to set up on your side (needed later, none block phase 1)

| # | Item | Needed for |
|---|---|---|
| F1 | Create a GitHub repository and give me the remote address (I will push, and the CI pipeline will run for the first time) | CI verification |
| F2 | Turn on Docker Desktop Kubernetes (Settings, Kubernetes) or install kind or minikube, plus an ingress controller | Verifying the Kubernetes manifests (BRD 08 and 25) |
| F3 | A Razorpay account in test mode (key id and secret; keep the secret private, do not paste it here) | Real payments (BRD 21) |
| F4 | Decide MongoDB plus PostgreSQL (as decided earlier) or PostgreSQL only | Backend design (BRD 19, 20) |
| F5 | Choose the cloud provider and rough budget | BRD 25 |
| F6 | An email sender domain and provider choice | BRD 23 |

## G. Known limitations to acknowledge (already recorded in each BRD)

1. The admin (port 4201) and the shop (port 4200) have separate mock data, so admin actions do not change the shop in development. A real backend fixes this.
2. All data is mock and lives in your browser storage; clearing site data resets it.
3. Stock is checked but not yet reduced when an order is placed (fixed in BRD 11).
4. On mobile, the compare bar and the sticky add-to-cart bar can overlap (fixed in BRD 12).
5. Listings use page links on mobile instead of "load more" (BRD 12).
6. The shop's first-load JavaScript is about 570 kB (target under 500 kB, BRD 12).
7. Kubernetes manifests were render-checked but never applied; the CI pipeline has never run.
8. Colour contrast and Lighthouse scores were not measured automatically (BRD 12).
9. A form submitted before the page finishes loading does a plain reload (BRD 12).

## H. Phase 1 sign-off

Phase 1 of the frontend is complete when BRDs 09 to 12 are built, all of section B and C pass, section D is acceptable, and section G items 3 to 9 are resolved. Reply with what you verified and what you want changed.
