import { ChangeDetectionStrategy, Component, inject, input, isDevMode, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SeoService } from '@ecom/shared/core';
import { DEMO_ACCOUNTS } from '@ecom/shared/data-access';
import { AuthStore } from '@ecom/shared/state';
import { ButtonComponent, FormFieldComponent, InputDirective } from '@ecom/shared/ui';
import { safeReturnUrl } from '@ecom/shared/util';

const err = (c: { touched: boolean; invalid: boolean; value: string }, emailField = false): string => (c.touched && c.invalid ? (emailField && c.value ? 'Enter a valid email address' : 'This field is required') : '');

/** Sign in. Any account may sign in; the portal shows what that account can do (apply, wait, or work). */
@Component({
  selector: 'sel-login',
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, FormFieldComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto mt-16 max-w-sm p-4">
      <h1 class="mb-1 text-2xl font-bold">Seller Centre</h1>
      <p class="mb-4 text-sm text-text-muted">Sign in to manage your store, or create an account to apply to sell.</p>
      @if (error()) {
        <p class="mb-4 rounded-md border border-danger p-3 text-sm" role="alert">{{ error() }}</p>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
        <ui-form-field #a="uiFormField" label="Email" [required]="true" [error]="e('email')">
          <input uiInput type="email" [id]="a.id" formControlName="email" autocomplete="username" [attr.aria-describedby]="a.describedBy()" [attr.aria-invalid]="e('email') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #b="uiFormField" label="Password" [required]="true" [error]="e('password')">
          <input uiInput type="password" [id]="b.id" formControlName="password" autocomplete="current-password" [attr.aria-describedby]="b.describedBy()" [attr.aria-invalid]="e('password') ? 'true' : null" />
        </ui-form-field>
        <button uiButton type="submit" class="w-full" [loading]="auth.busy()">Sign in</button>
      </form>
      <p class="mt-4 text-sm">New here? <a routerLink="/register" class="font-medium text-primary hover:underline">Create an account to sell</a></p>
      @if (dev) {
        <button type="button" class="mt-6 min-h-11 rounded-md border border-dashed border-border-strong px-3 text-sm text-text-muted" (click)="fillDemo()">Development only: fill demo seller</button>
      }
    </div>
  `,
})
export class SellerLoginComponent {
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
    inject(SeoService).set({ title: 'Seller sign in', noindex: true });
  }

  protected e(name: 'email' | 'password'): string {
    return err(this.form.controls[name], name === 'email');
  }

  protected fillDemo(): void {
    this.form.patchValue({ email: DEMO_ACCOUNTS[2].email, password: DEMO_ACCOUNTS[2].password });
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
    await this.router.navigateByUrl(safeReturnUrl(this.returnUrl(), '/'));
  }
}

/** Creates a customer account, which can then apply to sell. */
@Component({
  selector: 'sel-register',
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, FormFieldComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto mt-16 max-w-sm p-4">
      <h1 class="mb-1 text-2xl font-bold">Create your account</h1>
      <p class="mb-4 text-sm text-text-muted">You will then be asked for your business details. An administrator reviews every application.</p>
      @if (error()) {
        <p class="mb-4 rounded-md border border-danger p-3 text-sm" role="alert">{{ error() }}</p>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
        <ui-form-field #n="uiFormField" label="Full name" [required]="true" [error]="e('name')">
          <input uiInput [id]="n.id" formControlName="name" autocomplete="name" [attr.aria-describedby]="n.describedBy()" [attr.aria-invalid]="e('name') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #m="uiFormField" label="Email" [required]="true" [error]="e('email')">
          <input uiInput type="email" [id]="m.id" formControlName="email" autocomplete="email" [attr.aria-describedby]="m.describedBy()" [attr.aria-invalid]="e('email') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #p="uiFormField" label="Password" [required]="true" hint="At least 8 characters with upper case, lower case and a number." [error]="e('password')">
          <input uiInput type="password" [id]="p.id" formControlName="password" autocomplete="new-password" [attr.aria-describedby]="p.describedBy()" [attr.aria-invalid]="e('password') ? 'true' : null" />
        </ui-form-field>
        <button uiButton type="submit" class="w-full" [loading]="auth.busy()">Create account</button>
      </form>
      <p class="mt-4 text-sm">Already have an account? <a routerLink="/login" class="font-medium text-primary hover:underline">Sign in</a></p>
    </div>
  `,
})
export class SellerRegisterComponent {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });

  constructor() {
    inject(SeoService).set({ title: 'Create a seller account', noindex: true });
  }

  protected e(name: 'name' | 'email' | 'password'): string {
    return err(this.form.controls[name], name === 'email');
  }

  protected async submit(): Promise<void> {
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const result = await this.auth.register(this.form.getRawValue());
    if (!result.ok) {
      this.error.set(result.message ?? 'Could not create the account.');
      return;
    }
    await this.router.navigateByUrl('/apply');
  }
}
