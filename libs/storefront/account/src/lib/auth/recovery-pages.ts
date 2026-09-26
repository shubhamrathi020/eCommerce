import { ChangeDetectionStrategy, Component, effect, inject, input, isDevMode, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService } from '@ecom/shared/core';
import { AuthApi } from '@ecom/shared/data-access';
import { ApiException } from '@ecom/shared/models';
import { AuthStore } from '@ecom/shared/state';
import { ButtonComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';
import { PASSWORD_HINT, controlError } from '../form-utils';

/** Asks for an email and always shows the same confirmation, so nobody can probe which emails have accounts. */
@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, FormFieldComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-md">
      <h1 class="mb-4 text-2xl font-bold md:text-3xl">Forgot your password?</h1>
      @if (sent()) {
        <p class="rounded-md border border-success p-3 text-sm" role="status">If an account exists for that email, we have sent a link to reset your password. It works for 30 minutes.</p>
        @if (dev) {
          <p class="mt-3 text-sm text-text-muted">Development only: no real email is sent. <a routerLink="/dev/mailbox" class="text-primary underline">Open the demo mailbox</a>.</p>
        }
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
          <ui-form-field #f="uiFormField" label="Email" [required]="true" [error]="err()">
            <input uiInput type="email" [id]="f.id" formControlName="email" autocomplete="email" inputmode="email" [attr.aria-describedby]="f.describedBy()" [attr.aria-invalid]="err() ? 'true' : null" />
          </ui-form-field>
          <button uiButton type="submit" class="w-full" [loading]="busy()">Send reset link</button>
        </form>
      }
      <p class="mt-4 text-sm"><a routerLink="/account/login" class="text-primary hover:underline">Back to sign in</a></p>
    </div>
  `,
})
export class ForgotPasswordPageComponent {
  private readonly api = inject(AuthApi);
  protected readonly sent = signal(false);
  protected readonly busy = signal(false);
  protected readonly dev = isDevMode();
  protected readonly form = new FormGroup({ email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }) });

  constructor() {
    inject(SeoService).set({ title: 'Forgot password', noindex: true, path: '/account/forgot-password' });
  }

  protected err(): string {
    return controlError(this.form.controls.email, { required: 'Enter your email address' });
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.requestPasswordReset(this.form.controls.email.value));
    } finally {
      this.busy.set(false);
      this.sent.set(true);
    }
  }
}

@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, FormFieldComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-md">
      <h1 class="mb-4 text-2xl font-bold md:text-3xl">Choose a new password</h1>
      @if (done()) {
        <p class="rounded-md border border-success p-3 text-sm" role="status">Your password was changed. You can now sign in.</p>
        <a uiButton routerLink="/account/login" class="mt-4">Sign in</a>
      } @else {
        @if (error()) {
          <p class="mb-4 rounded-md border border-danger p-3 text-sm" role="alert">{{ error() }}</p>
        }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
          <ui-form-field #f="uiFormField" label="New password" [required]="true" [error]="err()" [hint]="hint">
            <input uiInput type="password" [id]="f.id" formControlName="password" autocomplete="new-password" [attr.aria-describedby]="f.describedBy()" [attr.aria-invalid]="err() ? 'true' : null" />
          </ui-form-field>
          <button uiButton type="submit" class="w-full" [loading]="busy()">Change password</button>
        </form>
      }
    </div>
  `,
})
export class ResetPasswordPageComponent {
  /** `?token=` from the emailed link. */
  readonly token = input<string | undefined>();
  private readonly api = inject(AuthApi);
  protected readonly hint = PASSWORD_HINT;
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal('');
  private readonly serverError = signal('');
  protected readonly form = new FormGroup({ password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }) });

  constructor() {
    inject(SeoService).set({ title: 'Reset password', noindex: true, path: '/account/reset-password' });
  }

  protected err(): string {
    return controlError(this.form.controls.password, { minlength: 'Use at least 8 characters.' }, this.serverError());
  }

  protected async submit(): Promise<void> {
    this.error.set('');
    this.serverError.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.resetPassword(this.token() ?? '', this.form.controls.password.value));
      this.done.set(true);
    } catch (e) {
      const message = e instanceof ApiException ? e.message : 'Could not reset the password.';
      if (e instanceof ApiException && e.fields?.['password']) this.serverError.set(message);
      else this.error.set(message);
    } finally {
      this.busy.set(false);
    }
  }
}

@Component({
  selector: 'app-verify-email-page',
  imports: [RouterLink, ButtonComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-md">
      <h1 class="mb-4 text-2xl font-bold md:text-3xl">Verify your email</h1>
      @if (status() === 'working') {
        <ui-skeleton class="h-12" />
      } @else if (status() === 'ok') {
        <p class="rounded-md border border-success p-3 text-sm" role="status">Your email address is verified. Thank you!</p>
        <a uiButton routerLink="/account" class="mt-4">Go to my account</a>
      } @else {
        <p class="rounded-md border border-danger p-3 text-sm" role="alert">{{ message() }}</p>
      }
    </div>
  `,
})
export class VerifyEmailPageComponent {
  readonly token = input<string | undefined>();
  private readonly api = inject(AuthApi);
  private readonly auth = inject(AuthStore);
  protected readonly status = signal<'working' | 'ok' | 'failed'>('working');
  protected readonly message = signal('');

  constructor() {
    inject(SeoService).set({ title: 'Verify email', noindex: true, path: '/account/verify-email' });
    // Inputs are set after construction, so react to the token once it is bound.
    effect(() => {
      const token = this.token();
      untracked(() => void this.run(token ?? ''));
    });
  }

  private async run(token: string): Promise<void> {
    try {
      await firstValueFrom(this.api.verifyEmail(token));
      await this.auth.refresh();
      this.status.set('ok');
    } catch (e) {
      this.message.set(e instanceof ApiException ? e.message : 'We could not verify your email.');
      this.status.set('failed');
    }
  }
}
