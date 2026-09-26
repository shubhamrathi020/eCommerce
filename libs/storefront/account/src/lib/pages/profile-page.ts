import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AuthApi } from '@ecom/shared/data-access';
import { ApiException } from '@ecom/shared/models';
import { AuthStore } from '@ecom/shared/state';
import { ButtonComponent, FormFieldComponent, InputDirective } from '@ecom/shared/ui';
import { PASSWORD_HINT, controlError } from '../form-utils';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-4 text-2xl font-bold md:text-3xl">Profile and password</h1>
    <div class="grid gap-8 md:grid-cols-2">
      <section aria-labelledby="pf">
        <h2 id="pf" class="mb-3 text-lg font-semibold">Your details</h2>
        <form [formGroup]="profile" (ngSubmit)="saveProfile()" novalidate class="space-y-4">
          <ui-form-field #a="uiFormField" label="Full name" [required]="true" [error]="pErr('name')">
            <input uiInput [id]="a.id" formControlName="name" autocomplete="name" [attr.aria-describedby]="a.describedBy()" [attr.aria-invalid]="pErr('name') ? 'true' : null" />
          </ui-form-field>
          <ui-form-field #b="uiFormField" label="Email" hint="Email cannot be changed here.">
            <input uiInput [id]="b.id" [value]="auth.user()?.email ?? ''" disabled />
          </ui-form-field>
          <ui-form-field #c="uiFormField" label="Mobile number" [error]="pErr('phone')" hint="10 digits (optional)">
            <input uiInput type="tel" [id]="c.id" formControlName="phone" autocomplete="tel-national" inputmode="numeric" maxlength="10" [attr.aria-describedby]="c.describedBy()" [attr.aria-invalid]="pErr('phone') ? 'true' : null" />
          </ui-form-field>
          <button uiButton type="submit" [loading]="savingProfile()">Save changes</button>
        </form>
      </section>

      <section aria-labelledby="pw">
        <h2 id="pw" class="mb-3 text-lg font-semibold">Change password</h2>
        <form [formGroup]="password" (ngSubmit)="savePassword()" novalidate class="space-y-4">
          <ui-form-field #d="uiFormField" label="Current password" [required]="true" [error]="wErr('currentPassword')">
            <input uiInput type="password" [id]="d.id" formControlName="currentPassword" autocomplete="current-password" [attr.aria-describedby]="d.describedBy()" [attr.aria-invalid]="wErr('currentPassword') ? 'true' : null" />
          </ui-form-field>
          <ui-form-field #e="uiFormField" label="New password" [required]="true" [error]="wErr('newPassword')" [hint]="hint">
            <input uiInput type="password" [id]="e.id" formControlName="newPassword" autocomplete="new-password" [attr.aria-describedby]="e.describedBy()" [attr.aria-invalid]="wErr('newPassword') ? 'true' : null" />
          </ui-form-field>
          <button uiButton type="submit" [loading]="savingPassword()">Change password</button>
        </form>
      </section>
    </div>
  `,
})
export class ProfilePageComponent {
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(AuthApi);
  private readonly toast = inject(ToastService);
  protected readonly hint = PASSWORD_HINT;
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  private readonly profileServer = signal<Record<string, string>>({});
  private readonly passwordServer = signal<Record<string, string>>({});

  protected readonly profile = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.pattern(/^([6-9]\d{9})?$/)] }),
  });
  protected readonly password = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });

  constructor() {
    inject(SeoService).set({ title: 'Profile', noindex: true, path: '/account/profile' });
    effect(() => {
      const user = this.auth.user();
      if (user) untracked(() => this.profile.patchValue({ name: user.name, phone: user.phone ?? '' }, { emitEvent: false }));
    });
  }

  protected pErr(name: 'name' | 'phone'): string {
    return controlError(this.profile.controls[name], { pattern: 'Enter a valid 10-digit mobile number' }, this.profileServer()[name] ?? '');
  }

  protected wErr(name: 'currentPassword' | 'newPassword'): string {
    return controlError(this.password.controls[name], { minlength: 'Use at least 8 characters.' }, this.passwordServer()[name] ?? '');
  }

  protected async saveProfile(): Promise<void> {
    this.profileServer.set({});
    this.profile.markAllAsTouched();
    if (this.profile.invalid) return;
    this.savingProfile.set(true);
    try {
      const { name, phone } = this.profile.getRawValue();
      await firstValueFrom(this.api.updateProfile({ name, ...(phone ? { phone } : {}) }));
      await this.auth.refresh();
      this.toast.success('Profile updated');
    } catch (e) {
      if (e instanceof ApiException && e.fields) this.profileServer.set(e.fields);
      else this.toast.error('Could not update your profile.');
    } finally {
      this.savingProfile.set(false);
    }
  }

  protected async savePassword(): Promise<void> {
    this.passwordServer.set({});
    this.password.markAllAsTouched();
    if (this.password.invalid) return;
    this.savingPassword.set(true);
    try {
      const { currentPassword, newPassword } = this.password.getRawValue();
      await firstValueFrom(this.api.changePassword(currentPassword, newPassword));
      this.password.reset();
      this.toast.success('Password changed');
    } catch (e) {
      if (e instanceof ApiException && e.fields) this.passwordServer.set(e.fields);
      else this.toast.error('Could not change your password.');
    } finally {
      this.savingPassword.set(false);
    }
  }
}
