# BRD 03: Search and Discovery

| Field | Value |
|---|---|
| Status | Implemented (mock search engine) |
| Version | 0.2 (2026-09-27) |
| Covers (master BR) | SRCH-01..04, SRCH-06, SRCH-07, SRCH-08 (mock), SRCH-10 (events only) |
| Depends on | BRD 01, BRD 02 |
| Not in this BRD | Real Meilisearch server (comes with the backend), personalised ranking, visual/voice/barcode search (SRCH-05 boosts beyond popularity/stock, SRCH-09, SRCH-11) |

## 1. Purpose and scope
Make finding products fast and forgiving: a search box with suggestions as you type, a results page that tolerates typos and synonyms, and helpful behaviour when nothing matches.

The mock behaves like Meilisearch: prefix matching on the last word, typo tolerance, synonyms, ranking by relevance then popularity and stock, faceted results. The `CatalogApi.listing` contract (with a `q` value) stays the single results path, so the real search server replaces only the data source, not the pages.

## 2. User stories
- As a shopper I type a few letters and see suggested searches, products, categories and brands, and can pick one with the keyboard.
- As a shopper I can misspell a word (for example "sneekers") or use another word ("tee", "mobile") and still find the right products.
- As a shopper with no results I am told what happened, offered a corrected search when there is one, and shown popular searches.
- As a returning shopper I see my recent searches when I focus the empty box.

## 3. Requirements and acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| SC-01 | Full-text search over title, brand, category, tags and specification values (SRCH-01) | "samsung" style brand queries and "cotton shirt" style multi-word queries return only products that contain every word (after typo/synonym expansion) |
| SC-02 | Autocomplete (SRCH-02): suggested queries, top products, matching categories and brands, updated as you type after a short pause | Suggestions appear within one interaction; at most 5 queries, 4 products, 3 categories, 3 brands |
| SC-03 | Typo tolerance (SRCH-03): one typo for words of 5 to 8 letters, two for longer; none for 4 or fewer | "sneekers" finds sneakers; "labtop" finds laptops |
| SC-04 | Synonyms (SRCH-03), for example tee = t-shirt, mobile/phone = smartphone, sofa = couch, tv = television | Searching a synonym returns the same products as the main word |
| SC-05 | Prefix search on the last word | "smart" matches smartphone and smartwatch |
| SC-06 | Relevance ranking: more matched words, exact over typo, title over other fields, then popularity; out-of-stock last | The best match for a full product title is first |
| SC-07 | Results page reuses listing filters, sort and pagination (SRCH-04) and adds a "Relevance" sort (default for search) | Facets and counts reflect the search results |
| SC-08 | "Did you mean" (SRCH-06): when a query has no results but a close spelling has, show results for the corrected query with a link to search the original; when nothing matches show the empty state with popular searches | Both states are visible and accessible |
| SC-09 | Popular searches (SRCH-06) shown in the empty box and on the no-results page | List comes from the search API |
| SC-10 | Recent searches per device, last 8, removable (SRCH-07) | Shown when the focused box is empty; saved only when a search is submitted |
| SC-11 | Search events for analytics (SRCH-10): search performed, zero results, suggestion selected | Sent through the analytics service (respects cookie consent); no personal data |
| SC-12 | Index sync (SRCH-08): the mock index is rebuilt from catalog data when it loads; changes to products appear on the next load | Documented; a real sync (queue-driven) comes with the backend |
| SC-13 | Accessibility: the box is an ARIA combobox (up/down/enter/escape, live count of suggestions); works on mobile | axe passes; keyboard-only use works |
| SC-14 | Security and privacy | Queries are treated as plain text (escaped when displayed); query text is never put into analytics events beyond a length-limited term; recent searches stay on the device |

## 4. Screens
Header search box with dropdown (desktop and mobile), search results page, no-results page.

## 5. Contracts
`SearchApi.suggest(q)` returns `{ queries: string[], products: ProductSummary[], categories: {slug,name}[], brands: {slug,name}[] }`; `SearchApi.popular()` returns `string[]`. `CatalogApi.listing({ q, ... })` results gain `search?: { correctedFrom?: string; didYouMean?: string }`. `SortKey` gains `relevance`.

## 6. Business rules
1. Words shorter than 2 letters are ignored; queries are limited to 100 characters.
2. Every query word must match (AND), each word by exact, prefix (last word only), synonym or typo rule.
3. If the original query has no matches and exactly one close correction has, results are shown for the correction (`correctedFrom` set).
4. Ranking score: exact word 3 points, synonym 2, prefix 2, typo 1, title bonus 2, brand bonus 1; ties by popularity.

## 7. Non-functional notes
Suggestions respond in under 100 ms in the mock (index built once). Debounce 150 ms; stale responses are discarded.

## 8. Mock-data needs
Uses the existing 252 products. A small synonym table and a fixed popular-searches list live in the mock.

## 9. Open questions
None (advance approval given for decisions).

## 10. Change log
| Date | Change | Why |
|---|---|---|
| 2026-09-27 | Initial draft | Start of build |
| 2026-09-27 | Implemented SC-01..SC-14: search engine (words, prefix on last word, typos, synonyms, plural stemming, relevance scoring), autocomplete combobox (recent searches, popular searches, queries, products, categories, brands), results page with Relevance sort, correction notice, and zero-result help. 43 data-layer tests, search-box tests and page tests pass; checked in the browser | Slice built |
| 2026-09-27 | SC-08 deviation: the correction notice has no "search instead for the original" link, because the original query had no matches at all | Nothing useful to link to |
| 2026-09-27 | SC-02 clarification: product titles are shown as product results and are not repeated in the "Suggestions" list | Avoids duplicates |
| 2026-09-27 | SC-03 clarification: words of 4 letters or fewer get no silent typo tolerance, but a close spelling can still trigger the "no exact matches" correction (for example "tvx" shows results for "tv") | Helpful without noisy matches |
| 2026-09-27 | Synonyms widen matches by design (searching "sneakers" also finds "shoe rack"); a real engine would scope synonyms per category | Mock simplicity; revisit with Meilisearch |
| 2026-09-27 | Search analytics events (`search`, `search_zero_results`, `search_suggestion_selected`) go through the analytics service and only run with cookie consent; the term is cut to 50 characters | Privacy |
