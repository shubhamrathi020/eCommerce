import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MoneyPipe } from '@ecom/shared/util';
import { ButtonComponent } from '@ecom/shared/ui';
import { MockPaymentLauncher } from './payment-launcher';

/** Mock payment window for test mode. Clearly labelled; it collects no card details. */
@Component({
  selector: 'app-mock-razorpay',
  imports: [A11yModule, MoneyPipe, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'launcher.dismiss()' },
  template: `
    @if (launcher.pending(); as p) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="pay-title" cdkTrapFocus [cdkTrapFocusAutoCapture]="true" class="w-full max-w-sm rounded-lg bg-surface p-5 shadow-modal">
          <p class="mb-1 inline-block rounded bg-warning px-2 py-0.5 text-xs font-semibold text-white">TEST MODE (mock Razorpay)</p>
          <h2 id="pay-title" class="text-lg font-semibold">Pay {{ { amount: p.session.amount, currency: p.session.currency } | money }}</h2>
          <p class="mt-1 text-sm text-text-muted">Order {{ p.session.orderId }}. No real payment is taken and no card details are needed.</p>
          <div class="mt-4 grid gap-2">
            <button uiButton type="button" (click)="launcher.succeed()">Simulate successful payment</button>
            <button uiButton variant="secondary" type="button" (click)="launcher.fail()">Simulate failed payment</button>
            <button uiButton variant="ghost" type="button" (click)="launcher.dismiss()">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class MockRazorpayComponent {
  protected readonly launcher = inject(MockPaymentLauncher);
}
