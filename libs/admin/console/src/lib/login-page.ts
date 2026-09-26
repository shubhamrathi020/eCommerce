import { ChangeDetectionStrategy, Component, inject, input, isDevMode, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SeoService } from '@ecom/shared/core';
import { DEMO_ACCOUNTS } from '@ecom/shared/data-access';
import { AuthStore } from '@ecom/shared/state';
import { ButtonComponent, FormFieldComponent, InputDirective } from '@ecom/shared/ui';
import { safeReturnUrl } from '@ecom/shared/util';

/** Admin sign in. Accounts without admin permissions are signed straight back out. */
@Component({
  selector: 'adm-login',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto mt-16 max-w-sm p-4">
      <h1 class="mb-1 text-2xl font-bold">Shop Admin</h1>
      <p class="mb-4 text-sm text-text-muted">Sign in with your staff account.</p>
      @if (error()) {
        <p class="mb-4 rounded-md border border-danger p-3 text-sm" role="alert">{{ error() }}</p>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
        <ui-form-field #a="uiFormField" label="Email" [required]="true" [error]="err('email')">
          <input uiInput type="email" [id]="a.id" formControlName="email" autocomplete="username" [attr.aria-describedby]="a.describedBy()" [attr.aria-invalid]="err('email') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #b="uiFormField" label="Password" [required]="true" [error]="err('password')">
          <input uiInput type="password" [id]="b.id" formControlName="password" autocomplete="current-password" [attr.aria-describedby]="b.describedBy()" [attr.aria-invalid]="err('password') ? 'true' : null" />
        </ui-form-field>
        <button uiButton type="submit" class="w-full" [loading]="auth.busy()">Sign in</button>
      </form>
      @if (dev) {
        <button type="button" class="mt-6 min-h-11 rounded-md border border-dashed border-border-strong px-3 text-sm text-text-muted" (click)="fillDemo()">Development only: fill demo admin</button>
      }
    </div>
  `,
})
export class AdminLoginComponent {
  readonly returnUrl = input<string | undefined>();
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly error = signal('');
  protected readonly dev = isDevMode();

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    inject(SeoService).set({ title: 'Admin sign in', noindex: true });
  }

  protected err(name: 'email' | 'password'): string {
    const c = this.form.controls[name];
    if (!(c.touched && c.invalid)) return '';
    return name === 'email' && c.value ? 'Enter a valid email address' : 'This field is required';
  }

  protected fillDemo(): void {
    this.form.patchValue({ email: DEMO_ACCOUNTS[1].email, password: DEMO_ACCOUNTS[1].password });
  }

  protected async submit(): Promise<void> {
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();
    const result = await this.auth.login(email, password);
    if (!result.ok) {
      this.error.set(result.message ?? 'Could not sign in.');
      return;
    }
    if (!this.auth.hasPermission('order:read:any')) {
      await this.auth.logout();
      this.error.set('This account does not have access to the admin console.');
      return;
    }
    await this.router.navigateByUrl(safeReturnUrl(this.returnUrl(), '/'));
  }
}
