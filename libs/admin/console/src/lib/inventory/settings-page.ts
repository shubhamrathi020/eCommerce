import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AdminInventoryApi } from '@ecom/shared/data-access';
import { ApiException } from '@ecom/shared/models';
import { ButtonComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';

/** Reservation timeout and the default low-stock threshold. */
@Component({
  selector: 'adm-inventory-settings',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="mb-1 text-xl font-semibold">Inventory settings</h2>
    <p class="mb-4 text-sm text-text-muted">Unpaid online orders hold their stock for the reservation time, then release it. A variant is low when its available units reach the threshold; variants can override the default on the Stock tab.</p>
    @if (settings.hasValue()) {
      @if (formError()) {
        <p class="mb-3 rounded-md border border-danger p-3 text-sm" role="alert">{{ formError() }}</p>
      }
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="grid max-w-xl gap-4 md:grid-cols-2" aria-label="Inventory settings">
        <ui-form-field #a="uiFormField" label="Reservation time (minutes)" [error]="errors()['reservationMinutes'] ?? ''" hint="1 to 1,440">
          <input uiInput inputmode="numeric" [id]="a.id" formControlName="reservationMinutes" [attr.aria-describedby]="a.describedBy()" [attr.aria-invalid]="errors()['reservationMinutes'] ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #b="uiFormField" label="Default low-stock threshold (units)" [error]="errors()['lowStockThreshold'] ?? ''" hint="0 to 1,000">
          <input uiInput inputmode="numeric" [id]="b.id" formControlName="lowStockThreshold" [attr.aria-describedby]="b.describedBy()" [attr.aria-invalid]="errors()['lowStockThreshold'] ? 'true' : null" />
        </ui-form-field>
        <div class="md:col-span-2"><button uiButton type="submit" [loading]="saving()">Save settings</button></div>
      </form>
    } @else {
      <ui-skeleton class="h-32" />
    }
  `,
})
export class SettingsPageComponent {
  private readonly api = inject(AdminInventoryApi);
  private readonly toast = inject(ToastService);

  protected readonly settings = rxResource({ stream: () => this.api.settings() });
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly form = new FormGroup({
    reservationMinutes: new FormControl('15', { nonNullable: true }),
    lowStockThreshold: new FormControl('5', { nonNullable: true }),
  });

  constructor() {
    inject(SeoService).set({ title: 'Inventory settings', noindex: true });
    effect(() => {
      if (!this.settings.hasValue()) return;
      const s = this.settings.value();
      untracked(() => this.form.setValue({ reservationMinutes: String(s.reservationMinutes), lowStockThreshold: String(s.lowStockThreshold) }));
    });
  }

  protected async save(): Promise<void> {
    this.formError.set('');
    this.errors.set({});
    const f = this.form.getRawValue();
    const number = (text: string) => (text.trim() === '' ? Number.NaN : Number(text));
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.saveSettings({ reservationMinutes: number(f.reservationMinutes), lowStockThreshold: number(f.lowStockThreshold) }));
      this.toast.success('Inventory settings saved');
    } catch (e) {
      if (e instanceof ApiException) {
        this.formError.set(e.message);
        this.errors.set(e.fields ?? {});
      } else {
        this.formError.set('The settings could not be saved.');
      }
    } finally {
      this.saving.set(false);
    }
  }
}
