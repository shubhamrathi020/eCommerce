import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminGiftCardApi } from '@ecom/shared/data-access';
import { ApiException, type GiftCard } from '@ecom/shared/models';
import { MoneyPipe } from '@ecom/shared/util';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';
import { rupeesToPaise } from '../list-params';

/** Issue gift cards and see each balance with its full history (PE-05). Balances never go below zero. */
@Component({
  selector: 'adm-gift-cards',
  imports: [LocaleDatePipe, MoneyPipe, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="mb-6 grid max-w-3xl gap-3 sm:grid-cols-5 sm:items-start" (submit)="issue($event)" novalidate aria-label="Issue a gift card">
      <ui-form-field #a="uiFormField" label="Amount (₹)" [required]="true" [error]="errors()['amount'] ?? ''"><input uiInput inputmode="decimal" [id]="a.id" [value]="amount()" [attr.aria-describedby]="a.describedBy()" [attr.aria-invalid]="errors()['amount'] ? 'true' : null" (input)="amount.set($any($event.target).value)" /></ui-form-field>
      <ui-form-field #c="uiFormField" label="Code" hint="Empty = generate" [error]="errors()['code'] ?? ''"><input uiInput [id]="c.id" [value]="code()" [attr.aria-describedby]="c.describedBy()" [attr.aria-invalid]="errors()['code'] ? 'true' : null" (input)="code.set($any($event.target).value)" /></ui-form-field>
      <ui-form-field #t="uiFormField" label="Issued to" hint="Optional"><input uiInput [id]="t.id" [value]="issuedTo()" [attr.aria-describedby]="t.describedBy()" (input)="issuedTo.set($any($event.target).value)" /></ui-form-field>
      <ui-form-field #e="uiFormField" label="Expires on" hint="Optional" [error]="errors()['expiresOn'] ?? ''"><input uiInput type="date" [id]="e.id" [value]="expires()" [attr.aria-describedby]="e.describedBy()" (input)="expires.set($any($event.target).value)" /></ui-form-field>
      <div class="sm:pt-6"><button uiButton type="submit" [loading]="saving()">Issue card</button></div>
    </form>
    @if (formError()) {
      <p class="mb-4 text-sm text-danger" role="alert">{{ formError() }}</p>
    }

    @if (resource.hasValue()) {
      @if (resource.value().length === 0) {
        <ui-empty-state title="No gift cards" description="Issue one above." />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[44rem] text-start text-sm">
            <caption class="sr-only">Gift cards</caption>
            <thead class="bg-surface-alt">
              <tr>
                <th scope="col" class="p-2">Code</th>
                <th scope="col" class="p-2 text-end">Issued</th>
                <th scope="col" class="p-2 text-end">Balance</th>
                <th scope="col" class="p-2">Expires</th>
                <th scope="col" class="p-2">Status</th>
                <th scope="col" class="p-2"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (g of resource.value(); track g.code) {
                <tr>
                  <td class="p-2 font-mono">{{ g.code }}@if (g.issuedTo) { <span class="block font-sans text-xs text-text-muted">{{ g.issuedTo }}</span> }</td>
                  <td class="p-2 text-end">{{ { amount: g.initialAmount, currency: 'INR' } | money }}</td>
                  <td class="p-2 text-end font-medium">{{ { amount: g.balance, currency: 'INR' } | money }}</td>
                  <td class="whitespace-nowrap p-2 text-text-muted">{{ g.expiresAt ? (g.expiresAt | date: 'd MMM y') : 'Never' }}</td>
                  <td class="p-2"><ui-badge [tone]="g.status === 'active' ? 'success' : 'neutral'">{{ g.status === 'active' ? 'Active' : 'Disabled' }}</ui-badge></td>
                  <td class="whitespace-nowrap p-2 text-end">
                    <button uiButton size="sm" variant="ghost" type="button" [attr.aria-expanded]="open() === g.code" (click)="open.set(open() === g.code ? '' : g.code)">History<span class="sr-only"> for {{ g.code }}</span></button>
                    <button uiButton size="sm" variant="ghost" type="button" (click)="toggle(g)">{{ g.status === 'active' ? 'Disable' : 'Enable' }}<span class="sr-only"> {{ g.code }}</span></button>
                  </td>
                </tr>
                @if (open() === g.code) {
                  <tr>
                    <td colspan="6" class="bg-surface-alt p-3">
                      <ul class="space-y-1 text-sm" [attr.aria-label]="'History of ' + g.code">
                        @for (en of g.entries; track en.id) {
                          <li>{{ en.at | date: 'd MMM y, h:mm a' }} · <strong>{{ en.type }}</strong> {{ { amount: en.amount, currency: 'INR' } | money }}@if (en.orderId) { · order {{ en.orderId }} } · {{ en.actor }}</li>
                        }
                      </ul>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-32" />
    }
  `,
})
export class GiftCardsPageComponent {
  private readonly api = inject(AdminGiftCardApi);
  private readonly toast = inject(ToastService);
  protected readonly resource = rxResource({ stream: () => this.api.list() });

  protected readonly amount = signal('');
  protected readonly code = signal('');
  protected readonly issuedTo = signal('');
  protected readonly expires = signal('');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly formError = signal('');
  protected readonly saving = signal(false);
  protected readonly open = signal('');

  constructor() {
    inject(SeoService).set({ title: 'Gift cards', noindex: true });
  }

  protected async issue(event: Event): Promise<void> {
    event.preventDefault();
    this.errors.set({});
    this.formError.set('');
    this.saving.set(true);
    try {
      const card = await firstValueFrom(
        this.api.issue({ amount: rupeesToPaise(this.amount()) ?? Number.NaN, ...(this.code().trim() ? { code: this.code() } : {}), ...(this.issuedTo().trim() ? { issuedTo: this.issuedTo() } : {}), ...(this.expires() ? { expiresOn: this.expires() } : {}) }),
      );
      this.toast.success(`Gift card ${card.code} issued.`);
      this.amount.set('');
      this.code.set('');
      this.issuedTo.set('');
      this.expires.set('');
      this.resource.reload();
    } catch (e) {
      if (e instanceof ApiException) {
        this.errors.set(e.fields ?? {});
        this.formError.set(e.fields ? '' : e.message);
      } else this.formError.set('Could not issue the gift card.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async toggle(g: GiftCard): Promise<void> {
    try {
      await firstValueFrom(this.api.setStatus(g.code, g.status === 'active' ? 'disabled' : 'active'));
      this.resource.reload();
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'That did not work.');
    }
  }
}
