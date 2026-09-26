# BRD 05: Accounts and Identity

| Field | Value |
|---|---|
| Status | Implemented (mock identity) |
| Version | 0.2 (2026-09-27) |
| Covers (master BR) | AUTH-01, 02, 03, 07, 09, 10, 11, 13 (export and delete), AUTH-14 (guest to account), ENG-01 (wishlist page), ORD-03 (order history for accounts) |
| Depends on | BRD 01, 02, 04 |
| Not in this BRD | Social login (AUTH-04), phone/OTP login (AUTH-05), multi-factor (AUTH-06), device management (AUTH-08), saved payment methods (AUTH-12), real email delivery, the admin app |

## 1. Purpose and scope
Let shoppers create an account, sign in and out, recover a forgotten password, manage their profile and delivery addresses, keep a wishlist page and see their orders. Guest checkout keeps working. Roles and permissions exist in the session so the admin app can rely on them later.

Everything runs on mock adapters (`AuthApi`, `AddressBookApi`). The mock imitates the real design: the server owns identity, the client only holds a session snapshot. Emails are not sent; verification and reset links are shown on screen and labelled "demo".

## 2. User stories
- As a visitor I can register, then sign in, and be returned to the page I came from.
- As a customer I can verify my email, reset a forgotten password, and change my password.
- As a customer I can edit my name and phone, and keep several delivery addresses (one default).
- As a customer my cart follows me: items in my guest cart are merged into my account cart when I sign in.
- As a customer checkout is pre-filled from my profile and saved addresses, and I can save a new address at checkout.
- As a customer I see my orders and my wishlist, can export my data, and can delete my account.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| AC-01 | Register with name, email, password (AUTH-01) | Password needs 8+ characters with upper case, lower case and a digit; duplicate email is rejected with a neutral message; passwords are never stored in plain text (hashed with a per-user salt in the mock) |
| AC-02 | Email verification (demo) | After registering the account shows "Verify your email"; a demo button completes verification; an unverified user can still shop but sees a reminder |
| AC-03 | Sign in and out, session survives refresh (AUTH-02) | Wrong credentials give one generic message; sign out clears the session and shows a guest cart |
| AC-04 | Lockout and throttling (AUTH-09) | 5 failed attempts for an email within 15 minutes blocks sign-in for that email for 15 minutes with a clear message and the time left |
| AC-05 | Forgot and reset password (AUTH-03) | Requesting a reset always shows the same confirmation (no account enumeration); the demo reset link works once and expires after 30 minutes; the old password stops working |
| AC-06 | Return to the intended page | Protected pages redirect to sign in with a `returnUrl`; only internal paths are accepted (no open redirects) |
| AC-07 | Guest-only pages | Signed-in users visiting sign in or register go to their account |
| AC-08 | Roles and permissions in the session (AUTH-07) | Session lists `roles` and `permissions`; `hasPermission()` is available to the UI; demo seed has a customer and an admin |
| AC-09 | Profile (AUTH-10) | Edit name and phone (10-digit mobile); change password needs the current password |
| AC-10 | Address book (AUTH-11) | Add, edit, delete, set default; validation matches checkout; the first address becomes default |
| AC-11 | Cart merge (AUTH-14) | Signing in merges guest cart items into the account cart (quantities added, capped at stock and 10) and clears the guest cart; signing out shows an empty guest cart |
| AC-12 | Checkout for accounts | Contact fields are pre-filled; saved addresses can be picked; "Save this address" adds it to the book; the order is linked to the account |
| AC-13 | Order history for accounts (ORD-03) | `/orders` lists the signed-in customer's orders; guests see the orders placed on this device |
| AC-14 | Wishlist page (ENG-01) | `/wishlist` lists wishlisted products with remove and add to cart (single-variant items), an empty state, and works for guests |
| AC-15 | Privacy (AUTH-13) | "Export my data" downloads a JSON file (profile, addresses, orders); "Delete my account" asks for the password, removes the account, addresses and sign-in, and keeps orders anonymised |
| AC-16 | Security | The session stores no password or hash; the demo session is labelled mock; sign-in forms use correct `autocomplete`; error messages never reveal whether an email exists; account pages are `noindex` |
| AC-17 | Accessibility and quality | axe: 0 serious issues on account pages; forms have visible labels, linked errors and focus management |

## 4. Screens
Sign in, register, forgot password, reset password, verify email, account home, profile and password, address book, orders (existing page), wishlist, privacy (export and delete).

## 5. Contracts (summary)
`User { id, name, email, phone?, roles, permissions, emailVerified, createdAt }`, `Session { user, expiresAt }`, `SavedAddress { id, label, name, phone, address, isDefault }`.
`AuthApi`: `me`, `register`, `login`, `logout`, `verifyEmail`, `requestPasswordReset`, `resetPassword`, `updateProfile`, `changePassword`, `exportData`, `deleteAccount`.
`AddressBookApi`: `list`, `add`, `update`, `remove`, `setDefault`.

## 6. Business rules
1. Email is the unique login (case-insensitive).
2. Roles: `customer` (default) and `admin`. Permissions derive from roles (`order:read:own` and similar for customers, full set for admin).
3. A reset link is single use and valid for 30 minutes.
4. Account deletion keeps order records for accounting but removes personal links.

## 7. Non-functional notes
Account state is browser-only (SSR renders the signed-out shell). All account pages are lazy-loaded.

## 8. Mock-data needs
Two seeded demo accounts (customer and admin) listed in `libs/shared/data-access/src/mock/data/demo-accounts.md`, never used outside local development.

## 9. Open questions
None (advance approval given for decisions).

## 10. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft | Start of build |
| 2026-09-27 | Implemented AC-01..AC-17: register, sign in and out, lockout after 5 failures (15 minutes), forgot and reset password (single use, 30 minutes), email verification, profile and password change, address book, guest-to-account cart merge, checkout pre-fill and "save this address", per-owner order history, wishlist page, data export and account deletion (orders anonymised). 53 data-layer tests plus page tests with accessibility checks pass; checked in the browser | Slice built |
| 2026-09-27 | Design: emails are never sent; a mock mailbox stores them and a development-only page `/dev/mailbox` shows them (verification, reset, order confirmations). This also gives NTF-01 a mock | Lets every email flow be tried without a mail server |
| 2026-09-27 | Passwords: salted SHA-256 (with a fallback hash where Web Crypto is unavailable) in the mock only; the session snapshot never contains a password, hash or token. A real backend will use Argon2id and an HttpOnly cookie | Mock is clearly labelled |
| 2026-09-27 | Route guards are a UX convenience; they let the server render through and re-check in the browser. Real enforcement is the backend's job (noted in security.md) | Session lives in the browser in the mock |
| 2026-09-27 | Demo accounts: see `libs/shared/data-access/src/mock/data/demo-accounts.md`. A "fill demo customer" helper on the sign-in page exists only in development builds | Local testing convenience |
| 2026-09-27 | Wishlist is still stored on the device (not per account) until wishlists move to the server | Backend later |
| 2026-09-27 | Not built: social login, phone OTP, MFA, device management (all P2 or later) | As scoped |
