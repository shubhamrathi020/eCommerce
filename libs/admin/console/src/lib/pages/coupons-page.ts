import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, type Observable } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminCouponApi } from '@ecom/shared/data-access';
import type { AdminCoupon, CouponKind } from '@ecom/contracts';
import { ApiException } from '@ecom/contracts';
import { BadgeComponent, ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';
import { MoneyPipe } from '@ecom/shared/util';
import { paiseToRupees, rupeesToPaise } from '../list-params';

const KIND_LABEL: Record<CouponKind, string> = { percent: 'Percent off', flat: 'Flat amount off', free_shipping: 'Free shipping' };

@Component({
  selector: 'adm-coupons',
  imports: [LocaleDatePipe, ReactiveFormsModule, MoneyPipe, BadgeComponent, ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Coupons</h1>
      @if (!editing()) {
        <button uiButton type="button" (click)="startNew()">New coupon</button>
      }
    </div>

    @if (editing()) {
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="mb-6 grid gap-4 rounded-lg border border-border p-4 md:grid-cols-3" aria-label="Coupon form">
        <ui-form-field #a="uiFormField" label="Code" [required]="true" [error]="err('code')">
          <input uiInput [id]="a.id" formControlName="code" maxlength="20" style="text-transform: uppercase" [attr.aria-describedby]="a.describedBy()" [attr.aria-invalid]="err('code') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #b="uiFormField" label="Description" [required]="true" [error]="err('description')" class="md:col-span-2">
          <input uiInput [id]="b.id" formControlName="description" [attr.aria-describedby]="b.describedBy()" [attr.aria-invalid]="err('description') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #c="uiFormField" label="Type">
          <select uiInput [id]="c.id" formControlName="kind">
            @for (k of kinds; track k.value) {
              <option [value]="k.value">{{ k.label }}</option>
            }
          </select>
        </ui-form-field>
        @if (form.controls.kind.value !== 'free_shipping') {
          <ui-form-field #d="uiFormField" [label]="form.controls.kind.value === 'percent' ? 'Percent off' : 'Amount off (₹)'" [error]="err('value')">
            <input uiInput inputmode="decimal" [id]="d.id" formControlName="value" [attr.aria-describedby]="d.describedBy()" [attr.aria-invalid]="err('value') ? 'true' : null" />
          </ui-form-field>
        }
        <ui-form-field #e="uiFormField" label="Minimum order (₹)" [error]="err('minSubtotal')">
          <input uiInput inputmode="decimal" [id]="e.id" formControlName="minSubtotal" [attr.aria-describedby]="e.describedBy()" [attr.aria-invalid]="err('minSubtotal') ? 'true' : null" />
        </ui-form-field>
        @if (form.controls.kind.value === 'percent') {
          <ui-form-field #f="uiFormField" label="Maximum discount (₹, optional)" [error]="err('maxDiscount')">
            <input uiInput inputmode="decimal" [id]="f.id" formControlName="maxDiscount" [attr.aria-describedby]="f.describedBy()" [attr.aria-invalid]="err('maxDiscount') ? 'true' : null" />
          </ui-form-field>
        }
        <ui-form-field #g="uiFormField" label="Expires on (optional)">
          <input uiInput type="date" [id]="g.id" formControlName="expiresAt" />
        </ui-form-field>
        <div class="flex gap-2 md:col-span-3">
          <button uiButton type="submit" [loading]="busy()">Save coupon</button>
          <button uiButton variant="secondary" type="button" (click)="editing.set(false)">Cancel</button>
        </div>
      </form>
    }

    @if (coupons().length) {
      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full min-w-[42rem] text-start text-sm">
          <caption class="sr-only">Coupons</caption>
          <thead class="bg-surface-alt"><tr><th scope="col" class="p-2">Code</th><th scope="col" class="p-2">Offer</th><th scope="col" class="p-2 text-end">Minimum</th><th scope="col" class="p-2">Expires</th><th scope="col" class="p-2 text-end">Used</th><th scope="col" class="p-2">Status</th><th scope="col" class="p-2"><span class="sr-only">Actions</span></th></tr></thead>
          <tbody class="divide-y divide-border">
            @for (c of coupons(); track c.code) {
              <tr>
                <th scope="row" class="p-2 font-mono font-semibold">{{ c.code }}</th>
                <td class="p-2">{{ describe(c) }}<span class="block text-xs text-text-muted">{{ c.description }}</span></td>
                <td class="p-2 text-end">{{ { amount: c.minSubtotal, currency: 'INR' } | money }}</td>
                <td class="p-2">{{ c.expiresAt ? (c.expiresAt | date: 'd MMM y') : 'Never' }}</td>
                <td class="p-2 text-end">{{ c.usageCount }}</td>
                <td class="p-2"><ui-badge [tone]="c.active ? 'success' : 'neutral'">{{ c.active ? 'Active' : 'Inactive' }}</ui-badge></td>
                <td class="p-2 text-end">
                  <button type="button" class="min-h-11 px-2 font-medium text-primary hover:underline" (click)="edit(c)">Edit<span class="sr-only"> {{ c.code }}</span></button>
                  <button type="button" class="min-h-11 px-2 font-medium text-primary hover:underline" (click)="toggle(c)">{{ c.active ? 'Deactivate' : 'Activate' }}<span class="sr-only"> {{ c.code }}</span></button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-32" />
    }
  `,
})
export class CouponsPageComponent {
  private readonly api = inject(AdminCouponApi);
  private readonly toast = inject(ToastService);

  protected readonly kinds = (Object.keys(KIND_LABEL) as CouponKind[]).map((value) => ({ value, label: KIND_LABEL[value] }));
  protected readonly resource = rxResource({ stream: () => this.api.list() });
  private readonly override = signal<AdminCoupon[] | null>(null);
  protected readonly coupons = computed<AdminCoupon[]>(() => this.override() ?? (this.resource.hasValue() ? this.resource.value() : []));

  protected readonly editing = signal(false);
  protected readonly isNew = signal(true);
  protected readonly busy = signal(false);
  private readonly serverErrors = signal<Record<string, string>>({});

  protected readonly form = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    kind: new FormControl<CouponKind>('percent', { nonNullable: true }),
    value: new FormControl('10', { nonNullable: true }),
    minSubtotal: new FormControl('0', { nonNullable: true }),
    maxDiscount: new FormControl('', { nonNullable: true }),
    expiresAt: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    inject(SeoService).set({ title: 'Coupons', noindex: true });
  }

  protected err(name: 'code' | 'description' | 'value' | 'minSubtotal' | 'maxDiscount'): string {
    const server = this.serverErrors()[name];
    if (server) return server;
    const c = this.form.controls[name];
    return c.touched && c.invalid ? 'This field is required' : '';
  }

  protected describe(c: AdminCoupon): string {
    if (c.kind === 'free_shipping') return KIND_LABEL[c.kind];
    return c.kind === 'percent' ? `${c.value}% off${c.maxDiscount ? ` (up to ₹${c.maxDiscount / 100})` : ''}` : `₹${c.value / 100} off`;
  }

  protected startNew(): void {
    this.form.reset({ code: '', description: '', kind: 'percent', value: '10', minSubtotal: '0', maxDiscount: '', expiresAt: '' });
    this.form.controls.code.enable();
    this.serverErrors.set({});
    this.isNew.set(true);
    this.editing.set(true);
  }

  protected edit(c: AdminCoupon): void {
    this.form.setValue({ code: c.code, description: c.description, kind: c.kind, value: c.kind === 'percent' ? String(c.value) : paiseToRupees(c.value), minSubtotal: paiseToRupees(c.minSubtotal), maxDiscount: paiseToRupees(c.maxDiscount), expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '' });
    this.form.controls.code.disable();
    this.serverErrors.set({});
    this.isNew.set(false);
    this.editing.set(true);
  }

  private async apply(request: Observable<AdminCoupon[]>, message: string): Promise<boolean> {
    try {
      this.override.set(await firstValueFrom(request));
      this.toast.success(message);
      return true;
    } catch (e) {
      if (e instanceof ApiException && e.fields) this.serverErrors.set(e.fields);
      else this.toast.error(e instanceof ApiException ? e.message : 'The action failed.');
      return false;
    }
  }

  protected async save(): Promise<void> {
    this.serverErrors.set({});
    this.form.markAllAsTouched();
    const f = this.form.getRawValue();
    const percent = f.kind === 'percent';
    const maxDiscount = rupeesToPaise(f.maxDiscount);
    const coupon: Omit<AdminCoupon, 'usageCount'> = {
      code: f.code.trim().toUpperCase(),
      description: f.description,
      kind: f.kind,
      value: f.kind === 'free_shipping' ? 0 : percent ? Number(f.value) : (rupeesToPaise(f.value) ?? 0),
      minSubtotal: rupeesToPaise(f.minSubtotal) ?? 0,
      ...(percent && maxDiscount !== undefined ? { maxDiscount } : {}),
      ...(f.expiresAt ? { expiresAt: `${f.expiresAt}T23:59:59Z` } : {}),
      active: this.coupons().find((c) => c.code === f.code.trim().toUpperCase())?.active ?? true,
    };
    this.busy.set(true);
    const ok = await this.apply(this.api.save(coupon, this.isNew()), this.isNew() ? 'Coupon created' : 'Coupon saved');
    this.busy.set(false);
    if (ok) this.editing.set(false);
  }

  protected toggle(c: AdminCoupon): Promise<boolean> {
    return this.apply(this.api.setActive(c.code, !c.active), `${c.code} ${c.active ? 'deactivated' : 'activated'}`);
  }
}
