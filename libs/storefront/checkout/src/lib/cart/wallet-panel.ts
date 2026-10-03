import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { I18nService, TranslatePipe } from '@ecom/shared/core';
import { WalletApi } from '@ecom/shared/data-access';
import { ApiException } from '@ecom/shared/models';
import { AuthStore, CartStore } from '@ecom/shared/state';
import { ButtonComponent, FormFieldComponent, InputDirective } from '@ecom/shared/ui';
import { MoneyPipe } from '@ecom/shared/util';

/** Gift card and store credit on the cart (PE-05). The cart prices them; this only asks and refreshes. */
@Component({
  selector: 'app-wallet-panel',
  imports: [FormsModule, TranslatePipe, MoneyPipe, ButtonComponent, FormFieldComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.cart(); as cart) {
      <section class="mb-3 border-b border-border pb-3" [attr.aria-label]="'wallet.label' | t">
        @if (cart.giftCardCode; as code) {
          <p class="mb-2 flex items-center justify-between text-sm">
            <span>{{ 'wallet.applied' | t: { code: code } }}</span>
            <button type="button" class="min-h-11 font-medium text-danger hover:underline" (click)="removeCard()">{{ 'common.remove' | t }}</button>
          </p>
        } @else {
          <form class="flex items-end gap-2" (submit)="applyCard($event)" novalidate>
            <ui-form-field #f="uiFormField" [label]="'wallet.codeLabel' | t" class="flex-1" [error]="error()" [hint]="'wallet.codeHint' | t">
              <input uiInput [id]="f.id" [attr.aria-describedby]="f.describedBy()" [attr.aria-invalid]="error() ? 'true' : null" autocomplete="off" [(ngModel)]="code" name="giftcard" />
            </ui-form-field>
            <button uiButton variant="secondary" type="submit" [loading]="busy()">{{ 'cart.apply' | t }}</button>
          </form>
        }
        @if (auth.loggedIn() && credit() > 0) {
          <label class="mt-2 flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" class="size-5 accent-primary" [checked]="!!cart.useCredit" (change)="toggleCredit($any($event.target).checked)" />
            {{ 'wallet.useCredit' | t: { amount: (creditMoney() | money) } }}
          </label>
        }
      </section>
    }
  `,
})
export class WalletPanelComponent {
  protected readonly store = inject(CartStore);
  protected readonly auth = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly api = inject(WalletApi);

  protected code = '';
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private readonly summary = rxResource({ params: () => this.auth.loggedIn(), stream: () => this.api.summary() });
  protected readonly credit = computed(() => (this.summary.hasValue() ? this.summary.value().credit.amount : 0));
  protected readonly creditMoney = computed(() => ({ amount: this.credit(), currency: 'INR' as const }));

  private async change(input: Parameters<WalletApi['apply']>[0]): Promise<boolean> {
    this.error.set('');
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.apply(input));
      await this.store.refresh();
      return true;
    } catch (e) {
      this.error.set(e instanceof ApiException ? (e.fields?.['code'] ?? e.message) : this.i18n.t('wallet.failed'));
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  protected async applyCard(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.code.trim()) {
      this.error.set(this.i18n.t('wallet.codeEnter'));
      return;
    }
    if (await this.change({ giftCardCode: this.code })) this.code = '';
  }

  protected removeCard(): Promise<boolean> {
    return this.change({ giftCardCode: null });
  }

  protected toggleCredit(on: boolean): Promise<boolean> {
    return this.change({ useCredit: on });
  }
}
