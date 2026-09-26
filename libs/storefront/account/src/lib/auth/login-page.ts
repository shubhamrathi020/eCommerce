import { ChangeDetectionStrategy, Component, inject, input, isDevMode, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SeoService } from '@ecom/shared/core';
import { DEMO_ACCOUNTS } from '@ecom/shared/data-access';
import { AuthStore } from '@ecom/shared/state';
import { ButtonComponent, FormFieldComponent, InputDirective } from '@ecom/shared/ui';
import { safeReturnUrl } from '@ecom/shared/util';
import { controlError } from '../form-utils';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, FormFieldComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-md">
      <h1 class="mb-4 text-2xl font-bold md:text-3xl">Sign in</h1>
      @if (error()) {
        <p class="mb-4 rounded-md border border-danger p-3 text-sm" role="alert">{{ error() }}</p>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
        <ui-form-field #f1="uiFormField" label="Email" [required]="true" [error]="err('email')">
          <input uiInput type="email" [id]="f1.id" formControlName="email" autocomplete="username" inputmode="email" [attr.aria-describedby]="f1.describedBy()" [attr.aria-invalid]="err('email') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #f2="uiFormField" label="Password" [required]="true" [error]="err('password')">
          <input uiInput [type]="show() ? 'text' : 'password'" [id]="f2.id" formControlName="password" autocomplete="current-password" [attr.aria-describedby]="f2.describedBy()" [attr.aria-invalid]="err('password') ? 'true' : null" />
        </ui-form-field>
        <label class="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" class="size-5 accent-primary" [checked]="show()" (change)="show.set(!show())" /> Show password</label>
        <button uiButton type="submit" class="w-full" [loading]="auth.busy()">Sign in</button>
      </form>
      <p class="mt-4 text-sm"><a routerLink="/account/forgot-password" class="text-primary hover:underline">Forgot your password?</a></p>
      <p class="mt-2 text-sm">New here? <a routerLink="/account/register" [queryParams]="returnUrl() ? { returnUrl: returnUrl() } : null" class="font-medium text-primary hover:underline">Create an account</a></p>
      @if (dev) {
        <button type="button" class="mt-6 min-h-11 rounded-md border border-dashed border-border-strong px-3 text-sm text-text-muted" (click)="fillDemo()">Development only: fill demo customer</button>
      }
    </div>
  `,
})
export class LoginPageComponent {
  /** `?returnUrl=` (validated before use). */
  readonly returnUrl = input<string | undefined>();

  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly error = signal('');
  protected readonly show = signal(false);
  protected readonly dev = isDevMode();

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    inject(SeoService).set({ title: 'Sign in', noindex: true, path: '/account/login' });
  }

  protected err(name: 'email' | 'password'): string {
    return controlError(this.form.controls[name], { required: name === 'email' ? 'Enter your email address' : 'Enter your password' });
  }

  protected fillDemo(): void {
    this.form.patchValue({ email: DEMO_ACCOUNTS[0].email, password: DEMO_ACCOUNTS[0].password });
  }

  protected async submit(): Promise<void> {
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();
    const result = await this.auth.login(email, password);
    if (result.ok) await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    else this.error.set(result.message ?? 'Could not sign in.');
  }
}
