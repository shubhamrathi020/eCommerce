import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { SellerPortalApi } from '@ecom/shared/data-access';
import { ApiException, type SellerApplicationInput } from '@ecom/shared/models';
import { ButtonComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';

type Field = 'displayName' | 'legalName' | 'phone' | 'gstin' | 'pan' | 'address.line1' | 'address.city' | 'address.state' | 'address.pincode' | 'bankHolder' | 'bankAccountNumber' | 'bankIfsc' | 'policies.returns' | 'policies.shipping';

/** Seller application with KYC fields (MP-01). An administrator reviews it; a rejected applicant sees the reason and can apply again. */
@Component({
  selector: 'sel-apply',
  imports: [RouterLink, ButtonComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-1 text-2xl font-bold">Apply to sell</h1>
    @if (me.isLoading()) {
      <ui-skeleton class="h-64 max-w-2xl" />
    } @else if (blocked(); as why) {
      <p class="max-w-2xl rounded-lg border border-border p-4" role="status">{{ why }} <a routerLink="/" class="text-primary underline">Back to the overview</a></p>
    } @else {
      <p class="mb-4 max-w-2xl text-sm text-text-muted">Tell us about your business. We check these details before you can list products. Your bank account number is used for payouts only and we keep just its last four digits.</p>
      @if (me.hasValue() && me.value()?.status === 'rejected') {
        <p class="mb-4 max-w-2xl rounded-lg border border-danger p-3 text-sm" role="alert">Your earlier application was not approved: {{ me.value()?.rejectionReason }}. Fix the details and apply again.</p>
      }
      <form class="max-w-2xl space-y-6" (submit)="submit($event)" novalidate>
        <fieldset class="space-y-4">
          <legend class="mb-1 text-lg font-semibold">Your store</legend>
          @for (f of storeFields; track f.key) {
            <ui-form-field #sf="uiFormField" [label]="f.label" [required]="true" [hint]="f.hint ?? ''" [error]="errors()[f.key] ?? ''">
              <input uiInput [id]="sf.id" [attr.autocomplete]="f.auto ?? 'off'" [attr.inputmode]="f.mode ?? null" [attr.aria-describedby]="sf.describedBy()" [attr.aria-invalid]="errors()[f.key] ? 'true' : null" (input)="set(f.key, $any($event.target).value)" />
            </ui-form-field>
          }
        </fieldset>
        <fieldset class="space-y-4">
          <legend class="mb-1 text-lg font-semibold">Pickup address</legend>
          @for (f of addressFields; track f.key) {
            <ui-form-field #af="uiFormField" [label]="f.label" [required]="true" [error]="errors()[f.key] ?? ''">
              <input uiInput [id]="af.id" [attr.inputmode]="f.mode ?? null" [attr.aria-describedby]="af.describedBy()" [attr.aria-invalid]="errors()[f.key] ? 'true' : null" (input)="set(f.key, $any($event.target).value)" />
            </ui-form-field>
          }
        </fieldset>
        <fieldset class="space-y-4">
          <legend class="mb-1 text-lg font-semibold">Payout account</legend>
          @for (f of bankFields; track f.key) {
            <ui-form-field #bf="uiFormField" [label]="f.label" [required]="true" [hint]="f.hint ?? ''" [error]="errors()[f.key] ?? ''">
              <input uiInput [id]="bf.id" autocomplete="off" [attr.inputmode]="f.mode ?? null" [attr.aria-describedby]="bf.describedBy()" [attr.aria-invalid]="errors()[f.key] ? 'true' : null" (input)="set(f.key, $any($event.target).value)" />
            </ui-form-field>
          }
        </fieldset>
        <fieldset class="space-y-4">
          <legend class="mb-1 text-lg font-semibold">Policies shoppers will see</legend>
          @for (f of policyFields; track f.key) {
            <ui-form-field #pf="uiFormField" [label]="f.label" [required]="true" [error]="errors()[f.key] ?? ''">
              <textarea uiInput rows="2" [id]="pf.id" [attr.aria-describedby]="pf.describedBy()" [attr.aria-invalid]="errors()[f.key] ? 'true' : null" (input)="set(f.key, $any($event.target).value)"></textarea>
            </ui-form-field>
          }
        </fieldset>
        @if (formError()) {
          <p class="text-sm text-danger" role="alert">{{ formError() }}</p>
        }
        <button uiButton type="submit" [loading]="saving()">Submit application</button>
      </form>
    }
  `,
})
export class ApplyPageComponent {
  private readonly api = inject(SellerPortalApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly me = rxResource({ stream: () => this.api.me() });

  protected readonly storeFields: { key: Field; label: string; hint?: string; auto?: string; mode?: string }[] = [
    { key: 'displayName', label: 'Store name', hint: 'Shown to shoppers' },
    { key: 'legalName', label: 'Legal business name' },
    { key: 'phone', label: 'Mobile number', mode: 'numeric', auto: 'tel-national' },
    { key: 'gstin', label: 'GSTIN', hint: '15 characters, for example 27AAAPL1234C1ZV' },
    { key: 'pan', label: 'PAN', hint: '10 characters, for example AAAPL1234C' },
  ];
  protected readonly addressFields: { key: Field; label: string; mode?: string }[] = [
    { key: 'address.line1', label: 'Address' },
    { key: 'address.city', label: 'City' },
    { key: 'address.state', label: 'State' },
    { key: 'address.pincode', label: 'Pin code', mode: 'numeric' },
  ];
  protected readonly bankFields: { key: Field; label: string; hint?: string; mode?: string }[] = [
    { key: 'bankHolder', label: 'Account holder name' },
    { key: 'bankAccountNumber', label: 'Account number', mode: 'numeric', hint: 'Only the last four digits are kept' },
    { key: 'bankIfsc', label: 'IFSC code', hint: 'For example HDFC0001234' },
  ];
  protected readonly policyFields: { key: Field; label: string }[] = [
    { key: 'policies.returns', label: 'Returns policy' },
    { key: 'policies.shipping', label: 'Shipping policy' },
  ];

  private readonly values = signal<Record<string, string>>({});
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly formError = signal('');
  protected readonly saving = signal(false);

  /** Why this account cannot apply right now, if it cannot. */
  protected readonly blocked = computed(() => {
    const seller = this.me.hasValue() ? this.me.value() : null;
    if (!seller || seller.status === 'rejected') return '';
    if (seller.status === 'pending') return 'Your application is being reviewed. We will email you when it is decided.';
    return 'You already have a store.';
  });

  constructor() {
    inject(SeoService).set({ title: 'Apply to sell', noindex: true });
  }

  protected set(key: Field, value: string): void {
    this.values.update((v) => ({ ...v, [key]: value }));
  }

  private build(): SellerApplicationInput {
    const v = this.values();
    const g = (k: Field) => v[k] ?? '';
    return {
      displayName: g('displayName'),
      legalName: g('legalName'),
      phone: g('phone'),
      gstin: g('gstin'),
      pan: g('pan'),
      address: { line1: g('address.line1'), city: g('address.city'), state: g('address.state'), pincode: g('address.pincode') },
      bankHolder: g('bankHolder'),
      bankAccountNumber: g('bankAccountNumber'),
      bankIfsc: g('bankIfsc'),
      policies: { returns: g('policies.returns'), shipping: g('policies.shipping') },
    };
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.errors.set({});
    this.formError.set('');
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.apply(this.build()));
      this.toast.success('Application sent. We will review it shortly.');
      await this.router.navigateByUrl('/');
    } catch (e) {
      if (e instanceof ApiException) {
        this.errors.set(e.fields ?? {});
        this.formError.set(e.fields ? 'Please check the highlighted fields.' : e.message);
      } else this.formError.set('Could not send your application. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
