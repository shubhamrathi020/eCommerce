import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, type Observable } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminContentApi } from '@ecom/shared/data-access';
import type { ManagedPage, PageStatus } from '@ecom/contracts';
import { ApiException } from '@ecom/contracts';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';
import { renderContent } from '@ecom/shared/util';

type Field = 'slug' | 'title' | 'source' | 'seoDescription';

@Component({
  selector: 'adm-pages',
  imports: [LocaleDatePipe, ReactiveFormsModule, BadgeComponent, ButtonComponent, EmptyStateComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-semibold">Pages</h2>
      @if (!editing()) {
        <button uiButton type="button" (click)="startNew()">New page</button>
      }
    </div>

    @if (editing()) {
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="mb-6 space-y-4 rounded-lg border border-border p-4" aria-label="Page editor">
        @if (formError()) {
          <p class="rounded-md border border-danger p-3 text-sm" role="alert">{{ formError() }}</p>
        }
        <div class="grid gap-4 md:grid-cols-2">
          <ui-form-field #a="uiFormField" label="Title" [required]="true" [error]="err('title')">
            <input uiInput [id]="a.id" formControlName="title" [attr.aria-describedby]="a.describedBy()" [attr.aria-invalid]="err('title') ? 'true' : null" />
          </ui-form-field>
          <ui-form-field #b="uiFormField" label="Address (slug)" [required]="true" [error]="err('slug')" [hint]="isNew() ? 'Becomes /pages/your-slug' : 'The address cannot be changed'">
            <input uiInput [id]="b.id" formControlName="slug" [attr.aria-describedby]="b.describedBy()" [attr.aria-invalid]="err('slug') ? 'true' : null" />
          </ui-form-field>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <ui-form-field #c="uiFormField" label="Text" [error]="err('source')" hint="## Heading, - list item, **bold**, [link text](/path). Blank line starts a new paragraph.">
              <textarea uiInput rows="12" [id]="c.id" formControlName="source" [attr.aria-describedby]="c.describedBy()"></textarea>
            </ui-form-field>
          </div>
          <div>
            <p class="mb-1 text-sm font-medium" id="preview-h">Preview</p>
            <div class="min-h-40 space-y-3 rounded-md border border-border bg-surface-alt p-3 text-sm [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:ps-5 [&_a]:text-primary [&_a]:underline" aria-labelledby="preview-h" [innerHTML]="preview()"></div>
          </div>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <ui-form-field #d="uiFormField" label="Search result title (optional)">
            <input uiInput [id]="d.id" formControlName="seoTitle" maxlength="70" />
          </ui-form-field>
          <ui-form-field #e="uiFormField" label="Search result description (optional)" [error]="err('seoDescription')" hint="Up to 160 characters">
            <input uiInput [id]="e.id" formControlName="seoDescription" maxlength="160" [attr.aria-describedby]="e.describedBy()" />
          </ui-form-field>
        </div>
        <ui-form-field #f="uiFormField" label="Status" class="block max-w-xs">
          <select uiInput [id]="f.id" formControlName="status">
            <option value="draft">Draft (hidden from shoppers)</option>
            <option value="published">Published</option>
          </select>
        </ui-form-field>
        <div class="flex flex-wrap gap-2">
          <button uiButton type="submit" [loading]="busy()">Save page</button>
          <button uiButton variant="secondary" type="button" (click)="editing.set(false)">Cancel</button>
        </div>
      </form>
    }

    @if (pages().length) {
      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full min-w-[36rem] text-start text-sm">
          <caption class="sr-only">Pages</caption>
          <thead class="bg-surface-alt"><tr><th scope="col" class="p-2">Page</th><th scope="col" class="p-2">Address</th><th scope="col" class="p-2">Status</th><th scope="col" class="p-2">Updated</th><th scope="col" class="p-2"><span class="sr-only">Actions</span></th></tr></thead>
          <tbody class="divide-y divide-border">
            @for (p of pages(); track p.slug) {
              <tr>
                <th scope="row" class="p-2 font-medium">{{ p.title }}@if (p.locked) { <span class="ms-1 text-xs text-text-muted">(legal)</span> }</th>
                <td class="p-2 font-mono text-xs">/pages/{{ p.slug }}</td>
                <td class="p-2"><ui-badge [tone]="p.status === 'published' ? 'success' : 'warning'">{{ p.status }}</ui-badge></td>
                <td class="p-2 text-text-muted">{{ p.updatedAt | date: 'd MMM y' }}</td>
                <td class="p-2 text-end">
                  <button type="button" class="min-h-11 px-2 font-medium text-primary hover:underline" (click)="edit(p)">Edit<span class="sr-only"> {{ p.title }}</span></button>
                  @if (!p.locked) {
                    <button type="button" class="min-h-11 px-2 font-medium text-danger hover:underline" (click)="remove(p)">Delete<span class="sr-only"> {{ p.title }}</span></button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (resource.isLoading()) {
      <ui-skeleton class="h-24" />
    } @else {
      <ui-empty-state title="No pages" description="Create your first page." />
    }
  `,
})
export class PagesPageComponent {
  private readonly api = inject(AdminContentApi);
  private readonly toast = inject(ToastService);

  protected readonly resource = rxResource({ stream: () => this.api.pages() });
  private readonly override = signal<ManagedPage[] | null>(null);
  protected readonly pages = computed<ManagedPage[]>(() => this.override() ?? (this.resource.hasValue() ? this.resource.value() : []));

  protected readonly editing = signal(false);
  protected readonly isNew = signal(true);
  protected readonly busy = signal(false);
  protected readonly formError = signal('');
  private readonly serverErrors = signal<Record<string, string>>({});

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    slug: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    source: new FormControl('', { nonNullable: true }),
    seoTitle: new FormControl('', { nonNullable: true }),
    seoDescription: new FormControl('', { nonNullable: true }),
    status: new FormControl<PageStatus>('draft', { nonNullable: true }),
  });

  private readonly sourceValue = toSignal(this.form.controls.source.valueChanges, { initialValue: '' });
  /** Same converter the API uses on save, so the preview matches what is published. */
  protected readonly preview = computed(() => renderContent(this.sourceValue()));

  constructor() {
    inject(SeoService).set({ title: 'Pages', noindex: true });
  }

  protected err(name: Field): string {
    const server = this.serverErrors()[name];
    if (server) return server;
    const c = this.form.controls[name];
    return c.touched && c.invalid ? 'This field is required' : '';
  }

  protected startNew(): void {
    this.form.reset({ title: '', slug: '', source: '', seoTitle: '', seoDescription: '', status: 'draft' });
    this.form.controls.slug.enable();
    this.isNew.set(true);
    this.serverErrors.set({});
    this.formError.set('');
    this.editing.set(true);
  }

  protected edit(p: ManagedPage): void {
    this.form.setValue({ title: p.title, slug: p.slug, source: p.source, seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '', status: p.status });
    this.form.controls.slug.disable();
    this.isNew.set(false);
    this.serverErrors.set({});
    this.formError.set('');
    this.editing.set(true);
  }

  private async apply<T>(request: Observable<T>, message: string): Promise<T | undefined> {
    try {
      const result = await firstValueFrom(request);
      this.toast.success(message);
      return result;
    } catch (e) {
      if (e instanceof ApiException) {
        if (this.editing()) {
          this.formError.set(e.message);
          this.serverErrors.set(e.fields ?? {});
        } else {
          this.toast.error(e.message);
        }
      } else {
        this.toast.error('The action failed.');
      }
      return undefined;
    }
  }

  protected async save(): Promise<void> {
    this.formError.set('');
    this.serverErrors.set({});
    this.form.markAllAsTouched();
    const f = this.form.getRawValue();
    this.busy.set(true);
    const saved = await this.apply(this.api.savePage({ slug: f.slug, title: f.title, source: f.source, status: f.status, seoTitle: f.seoTitle, seoDescription: f.seoDescription }, this.isNew()), 'Page saved');
    this.busy.set(false);
    if (saved) {
      this.editing.set(false);
      this.override.set(await firstValueFrom(this.api.pages()));
    }
  }

  protected async remove(p: ManagedPage): Promise<void> {
    const list = await this.apply(this.api.deletePage(p.slug), 'Page deleted');
    if (list) this.override.set(list);
  }
}
