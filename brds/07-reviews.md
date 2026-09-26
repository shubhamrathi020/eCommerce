# BRD 07: Reviews and Ratings (write side and moderation)

| Field | Value |
|---|---|
| Status | Implemented (mock adapters) |
| Version | 0.2 (2026-09-27) |
| Covers (master BR) | ENG-02 (verified reviews, write flow), ENG-03 (moderation), ENG-04 (helpful votes), NFR-SEC (abuse handling) |
| Depends on | BRD 02, 04, 05, 06 |
| Not in this BRD | Review photos, seller replies, review reminders by email, Q and A |

## 1. Purpose and scope
Let customers who bought a product rate and review it, let other shoppers mark reviews helpful, and let staff moderate reviews that a filter flags. Product ratings shown everywhere update when reviews are added.

Reading reviews already exists (BRD 02). This BRD adds writing, voting and moderation on the same mock foundations.

## 2. User stories
- As a customer who bought a product I can write one review with a rating, a title and text, and later edit or delete it.
- As a shopper I can mark a review helpful once.
- As a visitor who has not bought the product I am told why I cannot review it and how to become eligible.
- As a moderator I see flagged reviews, approve or reject them, and can remove any review.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| RV-01 | Eligibility (verified purchase only, configurable) | The form appears only for a signed-in customer with a confirmed or later order containing the product; others see a clear reason (sign in, or buy first); one review per customer per product |
| RV-02 | Write a review | Star rating 1 to 5 (keyboard-operable), title up to 80 characters, text 10 to 1,000 characters; inline validation; verified badge shown |
| RV-03 | Automatic checks | Text containing blocked words or links is held for moderation ("pending") and hidden from others; clean reviews go live at once |
| RV-04 | Edit and delete own review | Editing a live review re-runs the checks; deleting removes it and updates ratings |
| RV-05 | Ratings stay correct | Average, count and star distribution shown on cards, listings and the product page include new approved reviews |
| RV-06 | Helpful votes | One vote per customer per review, not on your own review; toggling removes the vote; the count updates |
| RV-07 | Moderation queue in the admin console | Lists pending reviews with product, author, text and the reason it was flagged; approve, reject or delete; all actions are audited; needs the moderation permission |
| RV-08 | Security and abuse | Review text is plain text and always escaped; length limits enforced by the API; a customer cannot review for someone else; permissions checked on every call |
| RV-09 | Accessibility and quality | Star input works with arrow keys and has a text alternative; axe reports no serious issues; success and error messages are announced |

## 4. Screens
Review form and states inside the product's Reviews tab; moderation page in the admin console.

## 5. Contracts (summary)
`ReviewApi`: `eligibility(productId)`, `submit(input)`, `updateMine(reviewId, input)`, `removeMine(reviewId)`, `vote(reviewId)`. `AdminReviewApi`: `list(query)`, `moderate(id, decision)`, `remove(id)`.
`Review` gains `status` (`approved`, `pending`, `rejected`), `userId` (private) and `flagReason` (admin only).

## 6. Business rules
1. Only approved reviews are visible to shoppers and counted in ratings.
2. A held review is visible to its author with a "waiting for moderation" note.
3. Blocked-word and link rules are a small starter list, meant to be replaced by a real filter.
4. Moderation needs the `review:moderate` permission (admins have it).

## 7. Non-functional notes
Ratings recomputation is done by the API. The moderation list is paginated.

## 8. Mock-data needs
Seeded pending reviews for the admin queue (flagged text). Existing 1,854 approved reviews.

## 9. Open questions
None (advance approval given for decisions).

## 10. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft | Start of build |
| 2026-09-27 | Implemented RV-01..RV-09: verified-buyer eligibility, review form with keyboard star picker and validation, automatic checks (links and blocked words go to moderation), edit and delete own review, ratings recalculated everywhere, helpful votes (toggle, one per user, not on your own), admin moderation queue (approve, reject, delete, audited, needs `review:moderate`). 69 data-layer tests, storefront review flow tests and admin tests with accessibility checks pass | Slice built |
| 2026-09-27 | "Verified buyers only" is always on in the mock; making it configurable needs the backend settings service | Config service not built |
| 2026-09-27 | The admin console has its own seeded review queue (8 held reviews) because it cannot see the storefront's browser storage; a real backend shares one reviews table | Different browser origins in development |
| 2026-09-27 | Helpful counts combine the seeded number with votes cast on this device | Seeded data is read-only |
| 2026-09-27 | Not built: review photos, seller replies, review reminder emails | Out of scope |
