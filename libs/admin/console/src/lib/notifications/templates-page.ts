import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AdminNotificationApi } from '@ecom/shared/data-access';
import type { MessageTemplate } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { BadgeComponent, ButtonComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';

/** Fills `{{variables}}` with sample text, the same as the admin "send test" preview. */
function preview(text: string, vars: readonly string[]): string {
  return vars.reduce((t, v) => t.replaceAll(`{{${v}}}`, `[${v}]`), text);
}

/** Message templates: list, an editor with a live preview, version history and "send a test". */
@Component({
  selector: 'adm-templates',
  imports: [DatePipe, ReactiveFormsModule, BadgeComponent, ButtonComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="mb-4 max-w-2xl text-sm text-text-muted">Edit the wording customers receive. Use only the listed variables, written as <code>{{ '{{name}}' }}</code>; anything else is refused. Every save keeps the previous version so you can go back.</p>

    <div class="grid gap-6 lg:grid-cols-[16rem_1fr]">
      @if (resource.hasValue()) {
        <ul class="space-y-1" aria-label="Templates">
          @for (t of resource.value(); track t.key) {
            <li>
              <button type="button" class="block w-full min-h-11 rounded-md px-3 py-2 text-left text-sm" [class]="selectedKey() === t.key ? 'bg-primary text-primary-contrast' : 'hover:bg-surface-alt'" (click)="select(t)">
                <span class="block font-medium">{{ t.name }}</span>
                <span class="block text-xs opacity-80">v{{ t.version }} · {{ t.updatedAt | date: 'd MMM y' }}</span>
              </button>
            </li>
          }
        </ul>
      } @else {
        <ui-skeleton class="h-48" />
      }

      @if (selected(); as t) {
        <section aria-labelledby="ed-h">
          <h2 id="ed-h" class="mb-1 text-lg font-semibold">{{ t.name }}</h2>
          <p class="mb-3 text-sm text-text-muted">{{ t.description }} Variables: @for (v of t.variables; track v; let last = $last) { <code>{{ '{{' + v + '}}' }}</code>{{ last ? '' : ', ' }} }</p>
          @if (formError()) {
            <p class="mb-3 rounded-md border border-danger p-3 text-sm" role="alert">{{ formError() }}</p>
          }
          <form [formGroup]="form" (ngSubmit)="save(t.key)" novalidate class="mb-6 grid gap-4 lg:grid-cols-2">
            <div class="space-y-4">
              <ui-form-field #a="uiFormField" label="Subject" [error]="err('subject')">
                <input uiInput [id]="a.id" formControlName="subject" [attr.aria-describedby]="a.describedBy()" [attr.aria-invalid]="err('subject') ? 'true' : null" />
              </ui-form-field>
              <ui-form-field #b="uiFormField" label="Message" [error]="err('body')">
                <textarea uiInput rows="6" [id]="b.id" formControlName="body" [attr.aria-describedby]="b.describedBy()" [attr.aria-invalid]="err('body') ? 'true' : null"></textarea>
              </ui-form-field>
              <div class="flex flex-wrap gap-2">
                <button uiButton type="submit" [loading]="saving()">Save (new version)</button>
                <button uiButton variant="secondary" type="button" [loading]="testing()" (click)="sendTest(t.key)">Send test to my mailbox</button>
              </div>
            </div>
            <div>
              <p class="mb-1 text-sm font-medium" id="prev-h">Preview with sample data</p>
              <div class="rounded-md border border-border bg-surface-alt p-3 text-sm" aria-labelledby="prev-h">
                <p class="mb-2 font-semibold">{{ subjectPreview() }}</p>
                <p class="whitespace-pre-wrap">{{ bodyPreview() }}</p>
              </div>
            </div>
          </form>

          <h3 class="mb-2 font-semibold">Previous versions</h3>
          @if (t.history.length > 1) {
            <ul class="divide-y divide-border rounded-lg border border-border text-sm">
              @for (h of t.history; track h.version) {
                <li class="flex flex-wrap items-center justify-between gap-2 p-3">
                  <span>Version {{ h.version }} · {{ h.updatedAt | date: 'd MMM y, h:mm a' }} · {{ h.updatedBy }} @if (h.version === t.version) { <ui-badge tone="success">Current</ui-badge> }</span>
                  @if (h.version !== t.version) {
                    <button type="button" class="min-h-11 px-2 font-medium text-primary hover:underline" (click)="restore(t.key, h.version)">Restore this version</button>
                  }
                </li>
              }
            </ul>
          } @else {
            <p class="text-sm text-text-muted">No earlier versions yet.</p>
          }
        </section>
      }
    </div>
  `,
})
export class TemplatesPageComponent {
  private readonly api = inject(AdminNotificationApi);
  private readonly toast = inject(ToastService);

  protected readonly resource = rxResource({ stream: () => this.api.templates() });
  protected readonly selectedKey = signal<string | null>(null);
  protected readonly selected = computed<MessageTemplate | undefined>(() => (this.resource.hasValue() ? this.resource.value().find((t) => t.key === this.selectedKey()) : undefined));

  protected readonly saving = signal(false);
  protected readonly testing = signal(false);
  protected readonly formError = signal('');
  private readonly serverErrors = signal<Record<string, string>>({});

  protected readonly form = new FormGroup({
    subject: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    body: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  private readonly subjectValue = toSignal(this.form.controls.subject.valueChanges, { initialValue: '' });
  private readonly bodyValue = toSignal(this.form.controls.body.valueChanges, { initialValue: '' });
  protected readonly subjectPreview = computed(() => (this.selected() ? preview(this.subjectValue(), this.selected()?.variables ?? []) : ''));
  protected readonly bodyPreview = computed(() => (this.selected() ? preview(this.bodyValue(), this.selected()?.variables ?? []) : ''));

  constructor() {
    inject(SeoService).set({ title: 'Notification templates', noindex: true });
    // Select the first template once the list loads, so the editor is never empty.
    effect(() => {
      if (!this.resource.hasValue() || this.selectedKey()) return;
      const first = this.resource.value()[0];
      if (first) untracked(() => this.select(first));
    });
  }

  protected select(t: MessageTemplate): void {
    this.selectedKey.set(t.key);
    this.form.setValue({ subject: t.subject, body: t.body });
    this.formError.set('');
    this.serverErrors.set({});
  }

  protected err(name: 'subject' | 'body'): string {
    const server = this.serverErrors()[name];
    if (server) return server;
    const c = this.form.controls[name];
    return c.touched && c.invalid ? 'This field is required' : '';
  }

  protected async save(key: string): Promise<void> {
    this.formError.set('');
    this.serverErrors.set({});
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      const f = this.form.getRawValue();
      await firstValueFrom(this.api.saveTemplate(key, f));
      this.toast.success('Template saved');
      this.resource.reload();
    } catch (e) {
      if (e instanceof ApiException) {
        this.formError.set(e.message);
        this.serverErrors.set(e.fields ?? {});
      } else {
        this.formError.set('Could not save the template.');
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected async restore(key: string, version: number): Promise<void> {
    try {
      const restored = await firstValueFrom(this.api.restoreVersion(key, version));
      this.toast.success(`Restored version ${version}`);
      this.resource.reload();
      this.select(restored);
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'Could not restore that version.');
    }
  }

  protected async sendTest(key: string): Promise<void> {
    this.testing.set(true);
    try {
      await firstValueFrom(this.api.sendTest(key));
      this.toast.success('Test message sent to your mailbox');
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'Could not send the test.');
    } finally {
      this.testing.set(false);
    }
  }
}
