# Razorpay test-mode payment: what was built, what went wrong, what is still open

Written 2026-10-10 for later review. Everything here ran in Razorpay **test mode** with the test keys in `eCommerce-api/apps/api/.env`
(git-ignored). The servers refuse to start with a live key (`RAZORPAY_KEY_ID` must start with `rzp_test_`), so no real money can move.

## 1. Summary

| Question | Answer |
|---|---|
| Does an online order create a real order at Razorpay on all four backends? | Yes: Nest, Go, Node and .NET, read back through Razorpay's own API (amount and receipt matched). |
| Does a forged signature get refused, and a correctly signed one confirm the order? | Yes, on all four. The payment id in this check was simulated. |
| Can a shopper actually pay through Razorpay's own window? | Yes, now. Built in `eCommerce-react` (storefront). Paid with Razorpay's test card, order confirmed, Razorpay shows the order `paid`. |
| Which backend was that last test against? | Node (port 3335) with the React storefront dev server. Not repeated on Nest, Go or .NET (the API contract is identical and covered by section 2). |
| Does the Angular storefront have it? | **No.** It still has only the mock payment dialog (`libs/storefront/checkout`, `MockPaymentLauncher`). |

## 2. What was built

### Backends (no change needed)
`POST /orders/:id/payment/initiate` creates the Razorpay order and returns `{ providerOrderId, keyId, amount, currency }`.
`POST /orders/:id/payment/confirm` verifies `HMAC_SHA256(providerOrderId|providerPaymentId, keySecret)` and confirms the order.
`POST /orders/:id/payment/fail` releases the stock hold. `POST /webhooks/razorpay` exists on all four backends.

### One harness fix (`eCommerce-api`, commit "test: keep Razorpay keys out of remote-server specs")
The shared specs assume online payment is *not* configured. With real keys in `.env`, the Go/Node/.NET servers that the harness
spawns would have inherited them and one spec would have failed. `apps/api/test/test-app.ts` now blanks the three `RAZORPAY_*`
variables for the spawned server. The full Nest suite (84 tests) and the Node run (64 + 3 skipped) passed with the keys loaded.

### React storefront (`eCommerce-react`)
- `apps/storefront/src/checkout/payment.tsx`
  - `RazorpayPaymentLauncher`: loads `https://checkout.razorpay.com/v1/checkout.js` once, opens Razorpay Checkout with the public key id
    and order id from the payment session, and resolves `success | failed | dismissed`.
  - `AutoPaymentLauncher`: picks the mock dialog when the session's key is the mock key (the in-browser mock data layer), Razorpay's
    window for every real backend. `CheckoutPage.tsx` uses it, so `VITE_BACKEND=nest|go|node|dotnet` just works.
- `nginx/default.conf.template` and `Dockerfile`: the production Content-Security-Policy now lets **only the storefront image** load
  Razorpay (script `checkout.razorpay.com`; frames `api.razorpay.com`, `checkout.razorpay.com`; connect `api.razorpay.com`,
  `lumberjack.razorpay.com`; images `cdn.razorpay.com`). The admin and seller images keep the old, tighter policy.
- `apps/storefront/src/checkout/razorpay-launcher.spec.ts`: 7 tests for the adapter.

## 3. The issue that was found (and fixed)

### What happened
First version of the adapter: on Razorpay's `payment.failed` event it told the server the payment failed (`/payment/fail`, which
releases the order's stock hold) and called `close()` on the window.

In the browser, Razorpay **ignored `close()`**: its window stayed open on a "Payment could not be completed. Retry with..." screen.
So the page believed the payment had failed while the shopper could still pay inside the window.

### Why it matters
If the shopper then paid successfully in that still-open window:
- Razorpay would capture the money,
- the adapter had already resolved, so Razorpay's success callback would be ignored,
- the order would stay `pending_payment` with its stock released, and the page would say "payment did not go through".

That is money taken with no confirmed order (in live mode; in test mode, the same logic error).

### The fix
`RazorpayPaymentLauncher` no longer reports a failure straight away. It remembers the failure reason, leaves the window alone, and:
- a later success (the shopper retried inside the window) resolves as **success**,
- closing the window after a failure resolves as **failed** (only now does `/payment/fail` run, and the page's own "Retry payment"
  calls `initiate` again, which reclaims the stock),
- closing the window with no failure is a plain **dismissal**.

Two tests pin this: "a failure is reported only when the shopper closes the window" and "a payment that succeeds after a failed first
attempt is a success".

### Proof it works (from the real run)
Razorpay's own record for order `ORD-MV2K7O46EE2833` (read through their API):

| Attempt | Method | Result |
|---|---|---|
| 1 | card `4111 1111 1111 1111` | `failed`: "this business accepts domestic (Indian) card payments only" |
| 2 | card `5267 3181 8797 5449` | `captured` |

Razorpay order status `paid`, attempts `2`. The browser's request log for the order shows `initiate` then `confirm` (201) and **no**
`/payment/fail`. The storefront showed "Thank you! Your order is placed", status Confirmed, with "Payment received" and
"Order confirmed" in the timeline.

## 4. Test-mode facts worth remembering

- **International test cards are rejected.** Razorpay treats `4111 1111 1111 1111` as international and this test account is
  domestic-only. Use Razorpay's domestic test card Mastercard `5267 3181 8797 5449` (any future expiry, any CVV, any OTP).
- **Netbanking in test mode failed** on the first run ("Payment could not be completed"). Not investigated further; the card path works.
- **Razorpay's API rate-limits** (HTTP 429) when polled in a burst. Back off and retry.
- **Razorpay remembers the contact** after the first payment, so its contact screen is skipped on later runs.

## 5. Not verified / still open

| # | Item | Why it matters |
|---|---|---|
| 1 | **Webhook never exercised.** `POST /webhooks/razorpay` exists on all four backends, `RAZORPAY_WEBHOOK_SECRET` is empty, and Razorpay cannot reach `localhost`. | It is the safety net for "paid at Razorpay but the browser never called `confirm`" (closed tab, lost connection). Needs a public URL (a tunnel such as cloudflared or ngrok) and a webhook configured in the dashboard. |
| 2 | **The production nginx image was not run in a browser.** The CSP substitution was checked by simulating the `sed` for storefront and admin; the dev server has no CSP, so a CSP block would not have shown up. | Razorpay's window could still be blocked in the real image. Build and run `eCommerce-react` with `APP=storefront`, then pay once. |
| 3 | **`Cross-Origin-Opener-Policy: same-origin` and `Permissions-Policy: payment=()`** in the same nginx file. | Some Razorpay flows (popup based 3-D Secure, Google Pay) may need `same-origin-allow-popups` or a delegated `payment` permission. Unknown until tested in the production image. |
| 4 | **Angular storefront has no Razorpay adapter.** | Only the React storefront can take a real test payment. Same `PaymentLauncher` slot exists in `libs/storefront/checkout`; its server uses a nonce-based CSP, so the allowances differ. |
| 5 | **Refunds were never exercised.** | Payment `pay_TmG4ocBD4g3OtH` is now captured in the test dashboard and can be used to test the admin refund path end to end. |
| 6 | **Phone prefill is unverified in a browser.** The first run showed Razorpay's mobile field empty; the adapter now sends `+91` plus the 10 digits (unit tested). | Cosmetic. Because Razorpay remembers the contact, it cannot be seen again without clearing its stored state. |
| 7 | **Only the Node backend** served the browser run. | Low risk (identical contract, covered by section 1), but not literally tested. |
| 8 | **The payment window deadline** (`PAYMENT_WINDOW_MINUTES`) vs. a shopper who sits in Razorpay's window for a long time was not tested. | After the deadline `confirm` is refused and the money would need a refund. |

## 6. Leftovers from testing (safe to delete)

- Dev PostgreSQL: users `paycheck-*@example.com` and about 6 orders (4 from the scripted check, 2 from the browser), 5 of them paid.
- Razorpay test dashboard: about 6 test orders and 3 test payments.
- Demo catalog stock for `p-0001-v1` and the air fryer is a few units lower.
- Nothing secret was committed. The keys were briefly in `eCommerce-api/apps/api/.env.example` (tracked) before being moved to `.env`;
  that edit was never committed or pushed.

## 7. How to repeat the browser test

```bash
# stores (Docker Desktop running)
docker start shop-postgres-1 shop-redis-1 shop-mongo shop-rabbitmq-1 shop-meili

# backend with the keys from eCommerce-api/apps/api/.env (any of the four; Node shown)
cd eCommerce-node && pnpm build && node dist/main.js     # PORT=3335, CORS_ORIGINS must include http://localhost:5190

# storefront
cd eCommerce-react/apps/storefront
VITE_BACKEND=node VITE_API_BASE_URL=http://localhost:3335 pnpm exec vite --port 5190
```

Then: add a product, checkout as a guest, choose online payment, pay with the domestic test card above and any OTP.

## 8. Where the changes are

| Repository | Change |
|---|---|
| `eCommerce-api` | `apps/api/test/test-app.ts` blanks Razorpay keys for spawned servers |
| `eCommerce-react` | `payment.tsx`, `CheckoutPage.tsx`, `razorpay-launcher.spec.ts`, `nginx/default.conf.template`, `Dockerfile`, `packages/data-access/src/index.ts` |
| `eCommerce` | this document and `PROJECT-LOG.md` |

## 9. Update 2026-10-11

- **Production image checked in a browser (item 2 above: done).** The storefront image (nginx, read-only, hardened compose settings)
  took a real test payment end to end (`pay_TmJUY5RWBmKdNo`, order `ORD-MV2RD2Y437EE00` confirmed). It exposed one CSP gap:
  Checkout.js loads Razorpay's fraud-check script from `cdn.razorpay.com`, which `script-src` blocked (the payment still worked).
  Fixed in `eCommerce-react` commit "storefront image: allow Razorpay's second script"; after the rebuild there was no violation.
- **COOP `same-origin` and `Permissions-Policy: payment=()` (item 3)** did not get in the way of the card flow. Wallet/UPI/Google Pay
  flows are still untested.
- **Phone prefill (item 6): still unresolved.** The bundle sends `+919876543210`, Razorpay fills the email but leaves the mobile field
  empty. Cosmetic; the shopper types it once.
- **Service worker error in the console** ("An unknown error occurred when fetching the script") is the embedded test browser's
  limitation: in real Edge the service worker registers fine.
- **New finding, not fixed (webhook).** `POST /webhooks/razorpay` (Nest; the other three backends copy it) gives the stock hold back on
  every `payment.failed` event. Razorpay sends that event for each failed attempt, even while its window stays open, so a failure
  followed by a successful retry inside the window would release the stock, and `payment.captured` (or `confirm`) would then confirm
  the order without taking it again: possible overselling once a webhook is configured. The captured branch also skips the
  confirmation email (outbox) and the live order event. Suggested fix, in all four backends: on `payment.failed` only record the
  attempt (leave the hold to the payment-deadline sweep), and make the captured branch do what `confirm` does. Needs signed test
  events (HMAC with `RAZORPAY_WEBHOOK_SECRET`) in the shared specs.
- **Still open:** the item above, the Angular storefront adapter, a real webhook delivery (needs a public URL), and refunds
  (cancel a paid order from the admin with the keys set; captured test payments `pay_TmG4ocBD4g3OtH` and `pay_TmJUY5RWBmKdNo` exist).

## 10. Update 2026-10-11 (later): open items worked through

| Item | Result |
|---|---|
| **Webhook stock bug** (section 9) | **Fixed in all four backends** (`eCommerce-api`, `-go`, `-node`, `-dotnet`, commit "payments: Razorpay webhook no longer releases stock on a failed attempt"). `payment.failed` no longer changes anything; `payment.captured` takes the stock again if the browser had already reported a failure, then confirms through the same once-only path as the browser's confirm (so the confirmation email and the live order event are sent, exactly once even if the browser and the webhook race). A captured payment whose stock can no longer be reserved still confirms the order and leaves a staff note to check stock or refund. New shared spec `test/payment-webhook.spec.ts` (3 tests, signed events) failed on the old code and passes on all four servers: Nest 68, Go/Node/.NET 67 + the in-process-only skips. |
| **Angular storefront adapter** | **Built** (`libs/storefront/checkout`, same design as React, 7 unit tests) and the SSR server's CSP allows Razorpay. Paid for real in test mode on the production SSR build against Nest: order `ORD-MV2W42D49E4717` confirmed, no CSP violation. The flags `realAuth`/`realCatalog`/`realCommerce` in `apps/storefront/src/app/app-config.values.ts` were switched on only for that run and are committed as `false`. |
| **Refunds** | **Work on Nest and Go.** Cancelling a paid order from the admin refunded it at Razorpay: `ORD-MV2K7O46EE2833` through Nest (`rfnd_TmLZ2rjfaDYSZi`), `ORD-MV2W42D49E4717` through Go (`rfnd_TmLkboU6hH3v2D`), both for the full amount. Node and .NET refunds were not run (same Razorpay call, covered by the shared contract). |
| **One payment cannot be refunded** | `pay_TmJUY5RWBmKdNo` (order `ORD-MV2RD2Y437EE00`, cancelled, `refund_pending`) is refused by Razorpay itself with a generic `BAD_REQUEST_ERROR "invalid request sent"`, also when called directly with no amount. Not our code (Go refunded a different payment fine). **Check it in the Razorpay dashboard** and refund it there if needed. |
| **Order says `refund_pending` after a successful refund** | By design of the contracts: `PaymentStatus` is `pending \| paid \| failed \| cod \| refund_pending`, there is no `refunded`. The success is recorded as a staff note and a `payment.refunded` email. Adding a `refunded` state needs a contracts release and changes in all backends and both frontends: a product decision. |
| **Real webhook delivery** | Not done. Needs a public URL to this machine (a tunnel such as cloudflared or ngrok) and the webhook configured in the Razorpay dashboard with a secret in `RAZORPAY_WEBHOOK_SECRET`. The handler itself is now covered by the signed-event spec. |
| **Phone prefill** | Still unresolved (cosmetic). |

Other gaps noticed while fixing the webhook, not changed:
- A payment captured after the order was already **cancelled** by the payment-deadline sweep is ignored by the webhook (money taken, order cancelled); it would need a manual refund. Worth a staff alert later.
- The webhook confirmation does not empty the shopper's cart (the webhook does not know the guest's cart token); the browser's confirm still does.
