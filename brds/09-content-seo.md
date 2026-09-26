# BRD 09: Content and SEO Management

| Field | Value |
|---|---|
| Status | Draft (planned, not built) |
| Version | 0.1 (2026-09-27) |
| Phase | Phase 1 (frontend completion) |
| Covers (master BR) | CMS-01, CMS-03, CMS-04 (part), ADM-05, UX-09, UX-10, CAT-11 |
| Depends on | BRD 01, 02, 06 |
| Not in this BRD | Image upload and media library (needs the backend), blog (CMS-02, P3), multi-language content (BRD 18) |

## 1. Purpose and scope
Let staff control what shoppers see without a developer: home banners and sections, static pages, footer and menu links, redirects, and the files search engines read (sitemap and robots).

## 2. User stories
- As a marketer I create, schedule and reorder home banners.
- As an admin I edit static pages (About, FAQ, Terms, Privacy) and preview drafts before publishing.
- As an admin I choose which product rows appear on the home page and in what order.
- As an SEO owner I manage redirects and get a sitemap and robots file that stay correct.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| CM-01 | Banner management: title, subtitle, image with required alt text, link, button text, start and end dates, order, active toggle | The storefront home shows only active, in-date banners in the chosen order; an expired banner disappears without a deploy |
| CM-02 | Home section management: enable, disable, rename and reorder rows (featured, new arrivals, top rated, deals, collections) | Changing the order in the admin changes the home page; a disabled section is not requested at all |
| CM-03 | Static page editor with title, slug, safe rich text (headings, paragraphs, lists, links), SEO title and description, and Draft or Published status | Published pages render at `/pages/:slug`; drafts return 404 to shoppers but can be previewed by admins; all HTML is sanitised |
| CM-04 | Footer and header link groups editable in the admin | Link changes show in the storefront footer; broken internal links are flagged in the editor |
| CM-05 | Redirect manager (301) with loop detection, plus automatic redirects when a product or page slug changes | A redirect answers with a real 301; a loop cannot be saved |
| CM-06 | `sitemap.xml` and `robots.txt` generated from published products, categories, brands and pages; canonical URLs for filtered pages | Sitemap lists only indexable URLs and is valid; robots blocks account, cart, checkout and admin paths |
| CM-07 | Draft preview for admins, with a visible preview banner | Previews are never indexed and never visible to shoppers |
| CM-08 | Permissions and audit: `content:write` permission; every change audited | A user without the permission cannot open the content screens; entries appear in the audit log |
| CM-09 | Editor accessibility and safety | Editors are keyboard-operable; alt text is mandatory for images; scripts and event handlers are stripped |

## 4. Deliverables
Admin screens (banners, home sections, pages, links, redirects), storefront changes to read them, sitemap and robots endpoints, mock `ContentApi`.

## 5. Business rules
1. Only published, in-date content is public.
2. A slug must be unique and URL-safe.
3. Legal pages (Terms, Privacy) cannot be deleted, only edited.

## 6. Non-functional notes
Content is cached by the storefront and refreshed on change; the editor autosaves drafts.

## 7. What we need from you before starting
- Brand name, logo and final colour palette (currently placeholders: name "Shop", indigo and amber).
- Real text for About, FAQ, Terms and Privacy pages (currently placeholders).
- Banner images you want to use, or approval to keep generated placeholders.
- The real site URL (used in sitemap and canonical links).

## 8. Open questions
- Should banners support a video background?
- Do you want a blog now or later (currently P3)?
- Who is allowed to publish legal pages?

## 9. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft for review | Planning of the remaining work |
