import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AdminReturnApi, CategoryApi } from '@ecom/shared/data-access';
import { ApiException } from '@ecom/shared/models';
import { ButtonComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';
import { paiseToRupees, rupeesToPaise } from '../list-params';

/** Return policy (RF-07). Each request keeps a copy of the numbers it was made under, so edits only affect new requests. */
@Component({
  selector: 'adm-return-policy',
  imports: [DatePipe, ButtonComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="mb-4 max-w-2xl text-sm text-text-muted">Changes apply to return requests made from now on. Requests already open keep the rules they were made under. Defaults: a 7-day window, a ₹49 return shipping fee when the customer changes their mind, free pickup when the problem is ours. Refunds only; exchanges are not supported.</p>
    @if (loaded()) {
      <form class="max-w-xl space-y-5" (submit)="save($event)" novalidate>
        <ui-form-field #w="uiFormField" label="Return window (days after delivery)" [required]="true" [error]="errors()['windowDays'] ?? ''">
          <input uiInput type="number" min="0" max="90" [id]="w.id" [value]="windowDays()" [attr.aria-describedby]="w.describedBy()" [attr.aria-invalid]="errors()['windowDays'] ? 'true' : null" (input)="windowDays.set($any($event.target).value)" />
        </ui-form-field>
        <ui-form-field #f="uiFormField" label="Return shipping fee in ₹ (customer's choice returns)" [required]="true" [error]="errors()['returnFee'] ?? ''">
          <input uiInput inputmode="decimal" [id]="f.id" [value]="fee()" [attr.aria-describedby]="f.describedBy()" [attr.aria-invalid]="errors()['returnFee'] ? 'true' : null" (input)="fee.set($any($event.target).value)" />
        </ui-form-field>

        <fieldset>
          <legend class="mb-1 text-sm font-medium">Categories that cannot be returned</legend>
          <ul class="grid gap-1 sm:grid-cols-2">
            @for (c of categories(); track c.id) {
              <li>
                <label class="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" class="size-5 accent-primary" [checked]="excludedCategories().includes(c.id)" (change)="toggleCategory(c.id, $any($event.target).checked)" />
                  {{ c.name }}
                </label>
              </li>
            }
          </ul>
        </fieldset>

        <ui-form-field #p="uiFormField" label="Non-returnable product IDs" hint="One per line or comma separated, e.g. p-0005">
          <textarea uiInput rows="3" [id]="p.id" [value]="products()" [attr.aria-describedby]="p.describedBy()" (input)="products.set($any($event.target).value)"></textarea>
        </ui-form-field>

        @if (formError()) {
          <p class="text-sm text-danger" role="alert">{{ formError() }}</p>
        }
        <button uiButton type="submit" [loading]="saving()">Save policy</button>
        @if (updated()) {
          <p class="text-sm text-text-muted">Last changed {{ updated()!.at | date: 'd MMM y, h:mm a' }} by {{ updated()!.by }}.</p>
        }
      </form>
    } @else {
      <ui-skeleton class="h-64 max-w-xl" />
    }
  `,
})
export class PolicyPageComponent {
  private readonly api = inject(AdminReturnApi);
  private readonly toast = inject(ToastService);
  private readonly resource = rxResource({ stream: () => this.api.policy() });
  private readonly categoryApi = inject(CategoryApi);
  private readonly tree = rxResource({ stream: () => this.categoryApi.tree() });

  protected readonly categories = computed(() => (this.tree.hasValue() ? this.tree.value() : []));
  protected readonly loaded = computed(() => this.resource.hasValue());
  protected readonly windowDays = signal('7');
  protected readonly fee = signal('49');
  protected readonly excludedCategories = signal<string[]>([]);
  protected readonly products = signal('');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly formError = signal('');
  protected readonly saving = signal(false);
  protected readonly updated = signal<{ at: string; by: string } | null>(null);

  constructor() {
    inject(SeoService).set({ title: 'Return policy', noindex: true });
    effect(() => {
      if (!this.resource.hasValue()) return;
      const p = this.resource.value();
      untracked(() => {
        this.windowDays.set(String(p.windowDays));
        this.fee.set(paiseToRupees(p.returnFee));
        this.excludedCategories.set(p.excludedCategoryIds);
        this.products.set(p.excludedProductIds.join('\n'));
        this.updated.set(p.updatedBy === 'system' ? null : { at: p.updatedAt, by: p.updatedBy });
      });
    });
  }

  protected toggleCategory(id: string, on: boolean): void {
    this.excludedCategories.update((list) => (on ? [...new Set([...list, id])] : list.filter((x) => x !== id)));
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.errors.set({});
    this.formError.set('');
    const fee = rupeesToPaise(this.fee());
    const days = Number(this.windowDays());
    const local: Record<string, string> = {};
    if (fee === undefined) local['returnFee'] = 'Enter an amount in rupees';
    if (this.windowDays().trim() === '' || !Number.isInteger(days)) local['windowDays'] = 'Enter a whole number of days';
    if (Object.keys(local).length) {
      this.errors.set(local);
      return;
    }
    this.saving.set(true);
    try {
      const saved = await firstValueFrom(
        this.api.savePolicy({
          windowDays: days,
          returnFee: fee as number,
          excludedCategoryIds: this.excludedCategories(),
          excludedProductIds: this.products()
            .split(/[\s,]+/)
            .filter(Boolean),
        }),
      );
      this.updated.set({ at: saved.updatedAt, by: saved.updatedBy });
      this.toast.success('Return policy saved. It applies to new requests.');
    } catch (e) {
      if (e instanceof ApiException) {
        this.errors.set(e.fields ?? {});
        if (!e.fields) this.formError.set(e.message);
      } else this.formError.set('Could not save the policy.');
    } finally {
      this.saving.set(false);
    }
  }
}
