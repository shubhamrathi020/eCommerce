import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogApi } from '@ecom/shared/data-access';
import type { Serviceability } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { ButtonComponent, FormFieldComponent, InputDirective } from '@ecom/shared/ui';
import { LocaleDatePipe } from '@ecom/shared/core';

/** Pin-code delivery estimate. */
@Component({
  selector: 'app-delivery-check',
  imports: [LocaleDatePipe, FormsModule, ButtonComponent, FormFieldComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <form class="flex items-end gap-2" (submit)="check($event)" novalidate>
      <ui-form-field #f="uiFormField" label="Delivery pin code" class="flex-1" [error]="error()">
        <input uiInput [id]="f.id" [attr.aria-describedby]="f.describedBy()" [attr.aria-invalid]="error() ? 'true' : null" inputmode="numeric" maxlength="6" autocomplete="postal-code" placeholder="e.g. 560001" [(ngModel)]="pin" name="pin" />
      </ui-form-field>
      <button uiButton variant="secondary" type="submit" [loading]="busy()">Check</button>
    </form>
    @if (result(); as r) {
      <p class="mt-2 text-sm" role="status">
        @if (r.serviceable) {
          <span class="font-medium text-success">Delivery by {{ r.estimatedDate | date: 'EEE, d MMM' }}</span>
          <span class="text-text-muted"> ({{ r.estimatedDays }} days){{ r.codAvailable ? ', cash on delivery available' : '' }}</span>
        } @else {
          <span class="font-medium text-danger">Sorry, we do not deliver to {{ r.pincode }} yet.</span>
        }
      </p>
    }
  `,
})
export class DeliveryCheckComponent {
  private readonly api = inject(CatalogApi);
  protected pin = '';
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly result = signal<Serviceability | null>(null);

  protected check(event: Event): void {
    event.preventDefault();
    this.error.set('');
    this.result.set(null);
    this.busy.set(true);
    this.api.serviceability(this.pin.trim()).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.result.set(r);
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(e instanceof ApiException ? e.message : 'Could not check delivery. Please try again.');
      },
    });
  }
}
