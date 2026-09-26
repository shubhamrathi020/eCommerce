import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SeoService } from '@ecom/shared/core';
import { AuthStore } from '@ecom/shared/state';
import { ButtonComponent, FormFieldComponent, InputDirective } from '@ecom/shared/ui';
import { safeReturnUrl } from '@ecom/shared/util';
import { PASSWORD_HINT, controlError } from '../form-utils';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, FormFieldComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-md">
      <h1 class="mb-4 text-2xl font-bold md:text-3xl">Create your account</h1>
      @if (error()) {
        <p class="mb-4 rounded-md border border-danger p-3 text-sm" role="alert">{{ error() }}</p>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
        <ui-form-field #f1="uiFormField" label="Full name" [required]="true" [error]="err('name')">
          <input uiInput [id]="f1.id" formControlName="name" autocomplete="name" [attr.aria-describedby]="f1.describedBy()" [attr.aria-invalid]="err('name') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #f2="uiFormField" label="Email" [required]="true" [error]="err('email')">
          <input uiInput type="email" [id]="f2.id" formControlName="email" autocomplete="email" inputmode="email" [attr.aria-describedby]="f2.describedBy()" [attr.aria-invalid]="err('email') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #f3="uiFormField" label="Password" [required]="true" [error]="err('password')" [hint]="hint">
          <input uiInput [type]="show() ? 'text' : 'password'" [id]="f3.id" formControlName="password" autocomplete="new-password" [attr.aria-describedby]="f3.describedBy()" [attr.aria-invalid]="err('password') ? 'true' : null" />
        </ui-form-field>
        <label class="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" class="size-5 accent-primary" [checked]="show()" (change)="show.set(!show())" /> Show password</label>
        <button uiButton type="submit" class="w-full" [loading]="auth.busy()">Create account</button>
      </form>
      <p class="mt-4 text-sm">Already have an account? <a routerLink="/account/login" [queryParams]="returnUrl() ? { returnUrl: returnUrl() } : null" class="font-medium text-primary hover:underline">Sign in</a></p>
    </div>
  `,
})
export class RegisterPageComponent {
  readonly returnUrl = input<string | undefined>();

  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly error = signal('');
  protected readonly show = signal(false);
  protected readonly hint = PASSWORD_HINT;
  private readonly serverFields = signal<Record<string, string>>({});

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });

  constructor() {
    inject(SeoService).set({ title: 'Create account', noindex: true, path: '/account/register' });
  }

  protected err(name: 'name' | 'email' | 'password'): string {
    return controlError(this.form.controls[name], { minlength: 'Use at least 8 characters.' }, this.serverFields()[name] ?? '');
  }

  protected async submit(): Promise<void> {
    this.error.set('');
    this.serverFields.set({});
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const result = await this.auth.register(this.form.getRawValue());
    if (result.ok) {
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
      return;
    }
    this.serverFields.set(result.fields ?? {});
    this.error.set(result.message ?? 'Could not create the account.');
  }
}
