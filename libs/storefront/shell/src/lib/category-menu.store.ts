import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CategoryApi } from '@ecom/shared/data-access';

/** Category tree for navigation. Cached for the app lifetime (categories change rarely). */
@Injectable({ providedIn: 'root' })
export class CategoryMenuStore {
  private readonly api = inject(CategoryApi);
  private readonly tree = rxResource({ stream: () => this.api.tree() });

  readonly roots = computed(() => this.tree.value() ?? []);
  readonly loading = this.tree.isLoading;
}
