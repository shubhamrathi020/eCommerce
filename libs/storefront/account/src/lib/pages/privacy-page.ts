import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AuthApi } from '@ecom/shared/data-access';
import { ApiException } from '@ecom/contracts';
import { AuthStore } from '@ecom/shared/state';
import { ButtonComponent, FormFieldComponent, InputDirective } from '@ecom/shared/ui';

@Component({
  selector: 'app-privacy-page',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-4 text-2xl font-bold md:text-3xl">Privacy</h1>
    <section class="mb-8 max-w-xl" aria-labelledby="ex">
      <h2 id="ex" class="mb-1 text-lg font-semibold">Export my data</h2>
      <p class="mb-3 text-sm text-text-muted">Download your profile, saved addresses and order numbers as a JSON file.</p>
      <button uiButton variant="secondary" type="button" [loading]="exporting()" (click)="export()">Download my data</button>
    </section>

    <section class="max-w-xl rounded-lg border border-danger p-4" aria-labelledby="del">
      <h2 id="del" class="mb-1 text-lg font-semibold">Delete my account</h2>
      <p class="mb-3 text-sm text-text-muted">This removes your account, saved addresses and sign-in. Past orders are kept for accounting but no longer linked to you. This cannot be undone.</p>
      @if (!confirming()) {
        <button uiButton variant="danger" type="button" (click)="confirming.set(true)">Delete my account</button>
      } @else {
        <form (submit)="delete($event)" novalidate class="space-y-3">
          <ui-form-field #f="uiFormField" label="Confirm with your password" [error]="error()">
            <input uiInput type="password" [id]="f.id" [formControl]="password" autocomplete="current-password" [attr.aria-describedby]="f.describedBy()" [attr.aria-invalid]="error() ? 'true' : null" />
          </ui-form-field>
          <div class="flex gap-2">
            <button uiButton variant="danger" type="submit" [loading]="deleting()">Permanently delete</button>
            <button uiButton variant="ghost" type="button" (click)="confirming.set(false)">Keep my account</button>
          </div>
        </form>
      }
    </section>
  `,
})
export class PrivacyPageComponent {
  private readonly api = inject(AuthApi);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly exporting = signal(false);
  protected readonly confirming = signal(false);
  protected readonly deleting = signal(false);
  protected readonly error = signal('');
  protected readonly password = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  constructor() {
    inject(SeoService).set({ title: 'Privacy', noindex: true, path: '/account/privacy' });
  }

  protected async export(): Promise<void> {
    this.exporting.set(true);
    try {
      const data = await firstValueFrom(this.api.exportData());
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'my-data.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      this.toast.error('Could not export your data.');
    } finally {
      this.exporting.set(false);
    }
  }

  protected async delete(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    if (this.password.invalid) {
      this.error.set('Enter your password to confirm');
      return;
    }
    this.deleting.set(true);
    try {
      await firstValueFrom(this.api.deleteAccount(this.password.value));
      await this.auth.logout();
      this.toast.success('Your account was deleted.');
      await this.router.navigateByUrl('/');
    } catch (e) {
      this.error.set(e instanceof ApiException ? e.message : 'Could not delete the account.');
    } finally {
      this.deleting.set(false);
    }
  }
}
