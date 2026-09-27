import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BottomBarService, CompareStore, ConsentService } from '@ecom/shared/core';
import { ButtonComponent } from '@ecom/shared/ui';

/**
 * Sticky bar that appears once at least one product is chosen for comparison.
 * Stays out of the way of the cookie banner (consent comes first) and, on mobile only, of a page's
 * own full-width action bar such as the product page's "Add to cart" (there is only room for one).
 */
@Component({
  selector: 'app-compare-bar',
  imports: [RouterLink, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.count() > 0 && !consent.needsDecision()) {
      <div
        class="print:hidden fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface p-3 shadow-modal md:bottom-4 md:left-auto md:right-4 md:w-80 md:rounded-lg md:border"
        [class.max-md:hidden]="bottomBar.primaryActionVisible()"
        role="region"
        aria-label="Compare products"
      >
        <p class="mb-2 text-sm" aria-live="polite">{{ store.count() }} of {{ store.limit }} products selected</p>
        <div class="flex gap-2">
          <a uiButton size="sm" routerLink="/compare" class="flex-1">Compare now</a>
          <button uiButton size="sm" variant="secondary" type="button" (click)="store.clear()">Clear</button>
        </div>
      </div>
    }
  `,
})
export class CompareBarComponent {
  protected readonly store = inject(CompareStore);
  protected readonly consent = inject(ConsentService);
  protected readonly bottomBar = inject(BottomBarService);
}
