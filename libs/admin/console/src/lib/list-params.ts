import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

/** URL-backed list state (filters, sort, page) so admin lists can be bookmarked and survive refresh. Call in an injection context. */
export function injectListParams() {
  const route = inject(ActivatedRoute);
  const router = inject(Router);
  const params = toSignal(route.queryParamMap, { initialValue: route.snapshot.queryParamMap });

  return {
    str: (name: string): string | undefined => params().get(name) || undefined,
    num: (name: string, fallback: number): number => {
      const n = Number.parseInt(params().get(name) ?? '', 10);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    },
    /** Merges changes into the URL; `null` clears a key. Resets to page 1 unless `keepPage`. */
    patch: (changes: Record<string, string | null>, keepPage = false): void => {
      void router.navigate([], { relativeTo: route, queryParams: { ...changes, ...(keepPage ? {} : { page: null }) }, queryParamsHandling: 'merge' });
    },
  };
}

/** Rupees typed by a person (may include decimals) to paise; NaN-safe. */
export function rupeesToPaise(text: string | number | null | undefined): number | undefined {
  if (text === null || text === undefined || String(text).trim() === '') return undefined;
  const n = Number(String(text).replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : undefined;
}

export function paiseToRupees(paise: number | undefined): string {
  return paise === undefined ? '' : String(Math.round(paise) / 100);
}
