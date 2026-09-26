import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, type Observable } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AddressBookApi, type AddressInput } from '@ecom/shared/data-access';
import type { SavedAddress } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';
import { controlError } from '../form-utils';

type Field = 'label' | 'name' | 'phone' | 'line1' | 'line2' | 'city' | 'state' | 'pincode';
const required = [Validators.required, Validators.pattern(/\S/)];

@Component({
  selector: 'app-addresses-page',
  imports: [ReactiveFormsModule, BadgeComponent, ButtonComponent, EmptyStateComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-bold md:text-3xl">Addresses</h1>
      @if (!editing()) {
        <button uiButton type="button" (click)="startAdd()">Add address</button>
      }
    </div>

    @if (editing()) {
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="mb-6 grid gap-4 rounded-lg border border-border p-4 md:grid-cols-2" aria-label="Address form">
        <ui-form-field #f0="uiFormField" label="Label (for example Home)" [required]="true" [error]="err('label')">
          <input uiInput [id]="f0.id" formControlName="label" maxlength="30" [attr.aria-describedby]="f0.describedBy()" [attr.aria-invalid]="err('label') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #f1="uiFormField" label="Full name" [required]="true" [error]="err('name')">
          <input uiInput [id]="f1.id" formControlName="name" autocomplete="name" [attr.aria-describedby]="f1.describedBy()" [attr.aria-invalid]="err('name') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #f2="uiFormField" label="Mobile number" [required]="true" [error]="err('phone')">
          <input uiInput type="tel" [id]="f2.id" formControlName="phone" autocomplete="tel-national" inputmode="numeric" maxlength="10" [attr.aria-describedby]="f2.describedBy()" [attr.aria-invalid]="err('phone') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #f3="uiFormField" label="Pin code" [required]="true" [error]="err('pincode')">
          <input uiInput [id]="f3.id" formControlName="pincode" autocomplete="postal-code" inputmode="numeric" maxlength="6" [attr.aria-describedby]="f3.describedBy()" [attr.aria-invalid]="err('pincode') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #f4="uiFormField" label="Address line 1" class="md:col-span-2" [required]="true" [error]="err('line1')">
          <input uiInput [id]="f4.id" formControlName="line1" autocomplete="address-line1" [attr.aria-describedby]="f4.describedBy()" [attr.aria-invalid]="err('line1') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #f5="uiFormField" label="Address line 2 (optional)" class="md:col-span-2">
          <input uiInput [id]="f5.id" formControlName="line2" autocomplete="address-line2" />
        </ui-form-field>
        <ui-form-field #f6="uiFormField" label="City" [required]="true" [error]="err('city')">
          <input uiInput [id]="f6.id" formControlName="city" autocomplete="address-level2" [attr.aria-describedby]="f6.describedBy()" [attr.aria-invalid]="err('city') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #f7="uiFormField" label="State" [required]="true" [error]="err('state')">
          <input uiInput [id]="f7.id" formControlName="state" autocomplete="address-level1" [attr.aria-describedby]="f7.describedBy()" [attr.aria-invalid]="err('state') ? 'true' : null" />
        </ui-form-field>
        <div class="flex gap-2 md:col-span-2">
          <button uiButton type="submit" [loading]="busy()">{{ editingId() ? 'Save address' : 'Add address' }}</button>
          <button uiButton variant="secondary" type="button" (click)="cancel()">Cancel</button>
        </div>
      </form>
    }

    @if (list.isLoading() && !addresses().length) {
      <ui-skeleton class="h-24" />
    } @else if (addresses().length === 0 && !editing()) {
      <ui-empty-state title="No saved addresses" description="Add one to speed up checkout." />
    } @else {
      <ul class="grid gap-3 md:grid-cols-2">
        @for (a of addresses(); track a.id) {
          <li class="rounded-lg border border-border p-4">
            <p class="flex items-center gap-2 font-semibold">{{ a.label }} @if (a.isDefault) { <ui-badge tone="primary">Default</ui-badge> }</p>
            <p class="text-sm">{{ a.name }}, {{ a.phone }}</p>
            <p class="text-sm text-text-muted">{{ a.address.line1 }}{{ a.address.line2 ? ', ' + a.address.line2 : '' }}, {{ a.address.city }}, {{ a.address.state }} {{ a.address.pincode }}</p>
            <div class="mt-2 flex flex-wrap gap-1">
              <button type="button" class="min-h-11 px-2 text-sm font-medium text-primary hover:underline" (click)="startEdit(a)">Edit<span class="sr-only"> {{ a.label }}</span></button>
              @if (!a.isDefault) {
                <button type="button" class="min-h-11 px-2 text-sm font-medium text-primary hover:underline" (click)="makeDefault(a)">Make default<span class="sr-only"> {{ a.label }}</span></button>
              }
              <button type="button" class="min-h-11 px-2 text-sm font-medium text-danger hover:underline" (click)="remove(a)">Delete<span class="sr-only"> {{ a.label }}</span></button>
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class AddressesPageComponent {
  private readonly api = inject(AddressBookApi);
  private readonly toast = inject(ToastService);

  protected readonly list = rxResource({ stream: () => this.api.list() });
  private readonly override = signal<SavedAddress[] | null>(null);
  protected readonly addresses = computed<SavedAddress[]>(() => this.override() ?? (this.list.hasValue() ? this.list.value() : []));

  protected readonly editing = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly busy = signal(false);
  private readonly serverFields = signal<Record<string, string>>({});

  protected readonly form = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: required }),
    name: new FormControl('', { nonNullable: true, validators: required }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)] }),
    line1: new FormControl('', { nonNullable: true, validators: required }),
    line2: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true, validators: required }),
    state: new FormControl('', { nonNullable: true, validators: required }),
    pincode: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[1-9]\d{5}$/)] }),
  });

  constructor() {
    inject(SeoService).set({ title: 'Addresses', noindex: true, path: '/account/addresses' });
  }

  protected err(name: Field): string {
    return controlError(this.form.controls[name], { pattern: name === 'phone' ? 'Enter a valid 10-digit mobile number' : 'Enter a valid 6-digit pin code' }, this.serverFields()[name] ?? '');
  }

  protected startAdd(): void {
    this.form.reset();
    this.serverFields.set({});
    this.editingId.set(null);
    this.editing.set(true);
  }

  protected startEdit(a: SavedAddress): void {
    this.form.setValue({ label: a.label, name: a.name, phone: a.phone, line1: a.address.line1, line2: a.address.line2 ?? '', city: a.address.city, state: a.address.state, pincode: a.address.pincode });
    this.serverFields.set({});
    this.editingId.set(a.id);
    this.editing.set(true);
  }

  protected cancel(): void {
    this.editing.set(false);
  }

  private async apply(request: Observable<SavedAddress[]>, success: string): Promise<boolean> {
    try {
      this.override.set(await firstValueFrom(request));
      this.toast.success(success);
      return true;
    } catch (e) {
      if (e instanceof ApiException && e.fields) this.serverFields.set(e.fields);
      else this.toast.error(e instanceof ApiException ? e.message : 'Something went wrong.');
      return false;
    }
  }

  protected async save(): Promise<void> {
    this.serverFields.set({});
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const f = this.form.getRawValue();
    const input: AddressInput = { label: f.label, name: f.name, phone: f.phone, address: { line1: f.line1, ...(f.line2.trim() ? { line2: f.line2 } : {}), city: f.city, state: f.state, pincode: f.pincode } };
    this.busy.set(true);
    const id = this.editingId();
    const ok = await this.apply(id ? this.api.update(id, input) : this.api.add(input), id ? 'Address updated' : 'Address added');
    this.busy.set(false);
    if (ok) this.editing.set(false);
  }

  protected makeDefault(a: SavedAddress): Promise<boolean> {
    return this.apply(this.api.setDefault(a.id), `${a.label} is now your default address`);
  }

  protected remove(a: SavedAddress): Promise<boolean> {
    return this.apply(this.api.remove(a.id), 'Address deleted');
  }
}
