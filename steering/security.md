# Security and Privacy Rules

Applies to every task. Frontend rules apply now; backend rules are recorded so we design for them from the start. Aligns with BRD section 5.4.

## 1. Frontend rules (now)
- **XSS:** rely on Angular's default sanitization. Never use `innerHTML` with untrusted data, `bypassSecurityTrust*`, `eval`, or `new Function`. If rich text (product descriptions, CMS) must render, sanitize with DOMPurify against an allowlist and document it in the component.
- **Secrets:** no API keys, secrets, or private tokens in the frontend code, env files, or mock data. Only public identifiers (e.g. Razorpay *key id*, never key secret) via `AppConfig`.
- **Tokens/sessions:** target design is a short-lived access token in memory and a refresh token in an `HttpOnly; Secure; SameSite=Lax` cookie set by the backend. Do not store real tokens in `localStorage`. (Mock auth uses fake tokens and is the only exception; it must be clearly labelled `mock`.)
- **CSRF:** cookie-based auth requires CSRF protection (double-submit token or SameSite + custom header); the HTTP adapter sends `x-csrf-token` when configured.
- **CSP and headers (SSR server + later ingress):** strict CSP (no `unsafe-inline` scripts; nonces for required inline), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `frame-ancestors 'none'`, HSTS. Angular `autoCsp` build option to be evaluated.
- **Third-party scripts:** each (Razorpay checkout, analytics) needs a justification, pinned version or SRI when possible, and loads only on the pages that need it. Payment is done through the PSP's hosted or iframe flow; card data never enters our code or state.
- **Input validation:** validate on the client for UX, never as a security boundary; the backend re-validates everything. Sanitize/encode data in URLs (`encodeURIComponent`), validate redirect targets (allowlist internal paths only, to avoid open redirects).
- **Route protection:** guards are UX only; the backend enforces authorization. Never rely on hiding a button as access control.
- **Sensitive data in UI:** mask phone/email where sensible, never log PII, tokens, or payment data to the console/analytics. Avoid PII in URLs and query params.
- **Dependencies:** minimal, pinned via lockfile; run `npm audit` in CI; review new packages (maintenance, size, install scripts) before adding; no packages from unknown sources.
- **File uploads (reviews, returns, admin media):** restrict type and size on the client, and note that the server must re-check and scan.
- **Error messages:** generic to users (no stack traces, no internal IDs of infra); details go to the logger with a correlation id.
- **Clickjacking/embedding:** the app does not allow itself to be framed.
- **Consent:** cookie/analytics consent banner blocks non-essential trackers until accepted.

## 2. Roles and permissions (design now, enforce on the backend later)
Roles: `customer`, `seller`, `support`, `warehouse`, `marketing`, `finance`, `admin`. Permissions are fine-grained strings (`product:write`, `order:refund`). The frontend consumes a `permissions[]` list from the session and uses a `hasPermission` directive/guard to shape the UI.

## 3. Backend rules (recorded for later)
- Password hashing with Argon2id (or bcrypt cost 12+), lockout/throttle, breach-password check.
- JWT access 15 min, rotating refresh tokens with reuse detection; revoke on logout/password change.
- Parameterized queries only (no string-built SQL/Mongo queries); validate all input with schemas (Zod/class-validator); output encode.
- Rate limiting on auth, OTP, search, checkout, coupon-apply; bot protection on register/login.
- Razorpay: verify payment signature server-side and via webhooks (with signature check), idempotency keys, amounts computed server-side only.
- Secrets in env/secret manager (K8s Secrets, later Vault); never in git; `.env.example` only.
- PII encrypted at rest where needed; audit logs for admin and financial actions; least-privilege DB users.
- Containers: non-root, minimal base images, image scanning in CI, network policies in K8s.
- Privacy: consent, data export/erasure endpoints, retention policy; logs scrubbed of PII.

## 4. Review checklist (run before "done")
- [ ] No `innerHTML`/bypass without sanitizer and note
- [ ] No secrets or real PII in code, mock data, or logs
- [ ] New dependency justified and audited
- [ ] User input validated and encoded; redirects allowlisted
- [ ] Sensitive state kept out of `localStorage` (except labelled mock data)
- [ ] Errors do not leak internals
- [ ] Guards/permissions wired, with backend enforcement noted as a dependency
