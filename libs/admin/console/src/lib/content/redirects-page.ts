import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, type Observable } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AdminContentApi } from '@ecom/shared/data-access';
import type { Redirect } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { ButtonComponent, EmptyStateComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';

@Component({
  selector: 'adm-redirects',
  imports: [DatePipe, ReactiveFormsModule, ButtonComponent, EmptyStateComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="mb-1 text-xl font-semibold">Redirects</h2>
    <p class="mb-4 text-sm text-text-muted">Send an old address to a new one with a permanent (301) redirect. Chains are followed and loops are refused.</p>
    <form [formGroup]="form" (ngSubmit)="add()" novalidate class="mb-6 grid items-start gap-3 md:grid-cols-[1fr_1fr_auto]" aria-label="Add a redirect">
      <ui-form-field #a="uiFormField" label="From (old path)" [error]="err('from')">
        <input uiInput [id]="a.id" formControlName="from" placeholder="/old-page" [attr.aria-describedby]="a.describedBy()" [attr.aria-invalid]="err('from') ? 'true' : null" />
      </ui-form-field>
      <ui-form-field #b="uiFormField" label="To (new path or https address)" [error]="err('to')">
        <input uiInput [id]="b.id" formControlName="to" placeholder="/new-page" [attr.aria-describedby]="b.describedBy()" [attr.aria-invalid]="err('to') ? 'true' : null" />
      </ui-form-field>
      <button uiButton type="submit" class="md:mt-6" [loading]="busy()">Add redirect</button>
    </form>

    @if (redirects().length) {
      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full min-w-[32rem] text-left text-sm">
          <caption class="sr-only">Redirects</caption>
          <thead class="bg-surface-alt"><tr><th scope="col" class="p-2">From</th><th scope="col" class="p-2">To</th><th scope="col" class="p-2">Created</th><th scope="col" class="p-2"><span class="sr-only">Actions</span></th></tr></thead>
          <tbody class="divide-y divide-border">
            @for (r of redirects(); track r.id) {
              <tr>
                <th scope="row" class="p-2 font-mono text-xs">{{ r.from }}</th>
                <td class="p-2 font-mono text-xs">{{ r.to }}</td>
                <td class="p-2 text-text-muted">{{ r.createdAt | date: 'd MMM y' }}</td>
                <td class="p-2 text-right"><button type="button" class="min-h-11 px-2 font-medium text-danger hover:underline" (click)="remove(r)">Remove<span class="sr-only"> redirect from {{ r.from }}</span></button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (resource.isLoading()) {
      <ui-skeleton class="h-16" />
    } @else {
      <ui-empty-state title="No redirects yet" description="Add one above when a page moves." />
    }
  `,
})
export class RedirectsPageComponent {
  private readonly api = inject(AdminContentApi);
  private readonly toast = inject(ToastService);

  protected readonly resource = rxResource({ stream: () => this.api.redirects() });
  private readonly override = signal<Redirect[] | null>(null);
  protected readonly redirects = computed<Redirect[]>(() => this.override() ?? (this.resource.hasValue() ? this.resource.value() : []));
  protected readonly busy = signal(false);
  private readonly serverErrors = signal<Record<string, string>>({});

  protected readonly form = new FormGroup({
    from: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    to: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    inject(SeoService).set({ title: 'Redirects', noindex: true });
  }

  protected err(name: 'from' | 'to'): string {
    const server = this.serverErrors()[name];
    if (server) return server;
    const c = this.form.controls[name];
    return c.touched && c.invalid ? 'This field is required' : '';
  }

  private async apply(request: Observable<Redirect[]>, message: string): Promise<boolean> {
    try {
      this.override.set(await firstValueFrom(request));
      this.toast.success(message);
      return true;
    } catch (e) {
      if (e instanceof ApiException) {
        this.serverErrors.set(e.fields ?? {});
        this.toast.error(e.message);
      } else {
        this.toast.error('The action failed.');
      }
      return false;
    }
  }

  protected async add(): Promise<void> {
    this.serverErrors.set({});
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    const ok = await this.apply(this.api.addRedirect(this.form.controls.from.value, this.form.controls.to.value), 'Redirect added');
    this.busy.set(false);
    if (ok) this.form.reset();
  }

  protected remove(r: Redirect): Promise<boolean> {
    return this.apply(this.api.removeRedirect(r.id), 'Redirect removed');
  }
}
