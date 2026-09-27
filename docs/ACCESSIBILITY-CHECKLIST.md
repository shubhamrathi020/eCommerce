# Keyboard and Screen-Reader Checklist (BRD 12, FH-08)

What is already automatically checked, what to check by hand, and how. This complements `docs/VERIFICATION-CHECKLIST.md` (which checks that features work); this one checks that they work **without a mouse and with a screen reader**.

## Already automatically checked

Every page-level component test runs `axe-core` (structure, names, ARIA, form labels, landmark and heading order) with `color-contrast` and `region` disabled, because `jsdom` cannot compute colours or real layout. A serious or critical finding fails the test. Coverage: home, listing, product, cart, checkout, account pages, admin pages (products, orders, content, inventory, notifications, reviews, coupons, users, audit), the shell itself. See any `*-flow.spec.ts` or `*-pages.spec.ts` file for `violations()`/`seriousViolations()`.

Also automated: the search box's combobox behaviour (arrow keys, Enter, Escape) has its own test (`search-box.spec.ts`), and focus moving to the new page's heading after a route change is tested in `shell.spec.ts`.

## What still needs a human, and how

Do this in a real browser with a mouse unplugged (or just don't touch it), using Tab, Shift+Tab, Enter, Space and arrow keys only. Turn on a screen reader for the second pass (Windows: NVDA, free; macOS: VoiceOver, built in, Cmd+F5).

### A. Keyboard only, every main journey
- [ ] **Home → category → product → cart → checkout → order confirmation**: every interactive element (links, filters, quantity stepper, buttons) is reachable, has a visible focus ring, and works with the keyboard alone.
- [ ] **Search**: type a query, arrow through suggestions, Enter to pick one or to search; Escape closes the list without navigating.
- [ ] **Filters drawer / mobile menu**: opens on Enter/Space, traps focus while open (Tab doesn't leave it), closes on Escape and returns focus to the button that opened it.
- [ ] **Sign in / register / account pages**: every field and button reachable in a sensible order; error messages are announced (see screen-reader pass).
- [ ] **Admin**: sign in, reach every nav item, open a table row's actions, save a form, all by keyboard.
- [ ] **"Load more" on mobile listings** (BRD 12, FH-02): Tab reaches it, Enter activates it, and focus doesn't get lost when new products are appended.
- [ ] **The notification bell and its dropdown-free page** (`/notifications`): reachable from the header, each item is a real button, mark-all-read works by keyboard.

### B. Screen reader pass
- [ ] Page title and heading are announced after every navigation (this is what FH-08's focus fix is for — confirm you actually **hear** the new heading, not just "main region").
- [ ] Images either have meaningful alt text or are correctly silent (decorative product thumbnails next to a text link, icons marked `aria-hidden`).
- [ ] Every form field has an announced label and, on error, the error text is read out (not just shown in red).
- [ ] Toasts, the "added to cart" confirmation, and live regions (`aria-live`) are announced without moving focus.
- [ ] The cookie banner, offline banner and any modal/drawer are announced when they appear.

### C. Known, accepted gaps (say so, don't hide them)
- Colour contrast is enforced by design tokens and eyeballed, but never machine-checked (jsdom can't; no visual-regression tool is set up — BRD 12 FH-03/FH-10 were consciously not built, see the BRD 12 change log for why).
- Cross-browser keyboard/screen-reader behaviour has only been exercised in Chromium-based browsers locally; Firefox and Safari/VoiceOver were not available in this environment (see BRD 12 change log, FH-09).

## Result

Record the date, who ran it, and anything found (however small) at the bottom of `docs/VERIFICATION-CHECKLIST.md` section D, or file it as a BRD 12 follow-up if it changes behaviour.
