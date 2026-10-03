import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AdminSellerApi, CategoryApi } from '@ecom/shared/data-access';
import { ApiException, type CommissionRule } from '@ecom/shared/models';
import { ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';

/** Commission rules (MP-03). The most specific one wins: a seller's own override, a rule for the seller, the category (leaf first), then the default. */
@Component({
  selector: 'adm-commission',
  imports: [ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="mb-4 max-w-2xl text-sm text-text-muted">The percentage the marketplace keeps from each sale. A seller's own override (set under Sellers) beats everything. Otherwise the most specific rule here applies: seller, then category, then the default.</p>
    @if (resource.hasValue()) {
      <div class="mb-6 overflow-x-auto rounded-lg border border-border">
        <table class="w-full min-w-[32rem] text-start text-sm">
          <caption class="sr-only">Commission rules</caption>
          <thead class="bg-surface-alt"><tr><th scope="col" class="p-2">Applies to</th><th scope="col" class="p-2 text-end">Commission</th><th scope="col" class="p-2"><span class="sr-only">Actions</span></th></tr></thead>
          <tbody class="divide-y divide-border">
            @for (r of resource.value(); track r.id) {
              <tr>
                <th scope="row" class="p-2 font-normal">{{ describe(r) }}</th>
                <td class="p-2 text-end">{{ r.percent }}%</td>
                <td class="p-2 text-end">
                  @if (r.scope !== 'default') {
                    <button uiButton size="sm" variant="ghost" type="button" (click)="remove(r)">Remove<span class="sr-only"> the rule for {{ describe(r) }}</span></button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <form class="grid max-w-3xl gap-3 sm:grid-cols-4 sm:items-start" (submit)="save($event)" novalidate aria-label="Add or change a rule">
        <ui-form-field #sc="uiFormField" label="Applies to" [error]="errors()['scope'] ?? ''">
          <select uiInput [id]="sc.id" [attr.aria-describedby]="sc.describedBy()" (change)="scope.set($any($event.target).value)">
            <option value="default" [selected]="scope() === 'default'">Everything (default)</option>
            <option value="category" [selected]="scope() === 'category'">A category</option>
            <option value="seller" [selected]="scope() === 'seller'">One seller</option>
          </select>
        </ui-form-field>
        @if (scope() === 'category') {
          <ui-form-field #ct="uiFormField" label="Category" [error]="errors()['categoryId'] ?? ''">
            <select uiInput [id]="ct.id" [attr.aria-describedby]="ct.describedBy()" [attr.aria-invalid]="errors()['categoryId'] ? 'true' : null" (change)="categoryId.set($any($event.target).value)">
              <option value="">Choose…</option>
              @for (c of categories(); track c.id) {
                <option [value]="c.id">{{ c.label }}</option>
              }
            </select>
          </ui-form-field>
        }
        @if (scope() === 'seller') {
          <ui-form-field #sl="uiFormField" label="Seller" [error]="errors()['sellerId'] ?? ''">
            <select uiInput [id]="sl.id" [attr.aria-describedby]="sl.describedBy()" [attr.aria-invalid]="errors()['sellerId'] ? 'true' : null" (change)="sellerId.set($any($event.target).value)">
              <option value="">Choose…</option>
              @for (s of sellers.hasValue() ? sellers.value() : []; track s.id) {
                <option [value]="s.id">{{ s.displayName }}</option>
              }
            </select>
          </ui-form-field>
        }
        <ui-form-field #pc="uiFormField" label="Percent (0 to 50)" [error]="errors()['percent'] ?? ''">
          <input uiInput inputmode="decimal" [id]="pc.id" [attr.aria-describedby]="pc.describedBy()" [attr.aria-invalid]="errors()['percent'] ? 'true' : null" (input)="percent.set($any($event.target).value)" />
        </ui-form-field>
        <div class="sm:pt-6"><button uiButton type="submit" [loading]="saving()">Save rule</button></div>
      </form>
      @if (formError()) {
        <p class="mt-3 text-sm text-danger" role="alert">{{ formError() }}</p>
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class CommissionPageComponent {
  private readonly api = inject(AdminSellerApi);
  private readonly toast = inject(ToastService);
  private readonly categoryApi = inject(CategoryApi);
  protected readonly resource = rxResource({ stream: () => this.api.rules() });
  protected readonly sellers = rxResource({ stream: () => this.api.sellers() });
  private readonly tree = rxResource({ stream: () => this.categoryApi.tree() });

  /** Every category with its parents in the label, so a leaf can be told apart from its department. */
  protected readonly categories = computed(() => {
    const out: { id: string; label: string }[] = [];
    const walk = (nodes: { id: string; name: string; children: unknown[] }[], prefix: string) => {
      for (const n of nodes) {
        out.push({ id: n.id, label: `${prefix}${n.name}` });
        walk(n.children as typeof nodes, `${prefix}${n.name} › `);
      }
    };
    walk(this.tree.hasValue() ? (this.tree.value() as never) : [], '');
    return out;
  });

  protected readonly scope = signal<CommissionRule['scope']>('category');
  protected readonly categoryId = signal('');
  protected readonly sellerId = signal('');
  protected readonly percent = signal('');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly formError = signal('');
  protected readonly saving = signal(false);

  constructor() {
    inject(SeoService).set({ title: 'Commission', noindex: true });
  }

  protected describe(r: CommissionRule): string {
    if (r.scope === 'default') return 'Everything else (default)';
    if (r.scope === 'category') return `Category: ${this.categories().find((c) => c.id === r.categoryId)?.label ?? r.categoryId}`;
    return `Seller: ${(this.sellers.hasValue() ? this.sellers.value() : []).find((s) => s.id === r.sellerId)?.displayName ?? r.sellerId}`;
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.errors.set({});
    this.formError.set('');
    this.saving.set(true);
    try {
      const existing = (this.resource.hasValue() ? this.resource.value() : []).find((r) => r.scope === this.scope() && (this.scope() === 'default' || (this.scope() === 'category' ? r.categoryId === this.categoryId() : r.sellerId === this.sellerId())));
      await firstValueFrom(
        this.api.saveRule({
          ...(existing ? { id: existing.id } : {}),
          scope: this.scope(),
          ...(this.scope() === 'category' ? { categoryId: this.categoryId() } : {}),
          ...(this.scope() === 'seller' ? { sellerId: this.sellerId() } : {}),
          percent: this.percent().trim() === '' ? Number.NaN : Number(this.percent()),
        }),
      );
      this.toast.success('Commission rule saved.');
      this.resource.reload();
    } catch (e) {
      if (e instanceof ApiException) {
        this.errors.set(e.fields ?? {});
        this.formError.set(e.fields ? '' : e.message);
      } else this.formError.set('Could not save the rule.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(r: CommissionRule): Promise<void> {
    try {
      await firstValueFrom(this.api.removeRule(r.id));
      this.resource.reload();
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'Could not remove the rule.');
    }
  }
}
