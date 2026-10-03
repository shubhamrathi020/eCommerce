import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, type Observable } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminContentApi } from '@ecom/shared/data-access';
import type { ContentBanner } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';

type Field = 'title' | 'subtitle' | 'cta' | 'link' | 'imageUrl' | 'imageAlt' | 'endsAt';

/** `datetime-local` values are local time without a zone; convert to and from ISO. */
const toLocalInput = (iso?: string): string => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '');
const fromLocalInput = (value: string): string | undefined => (value ? new Date(value).toISOString() : undefined);

@Component({
  selector: 'adm-banners',
  imports: [LocaleDatePipe, NgOptimizedImage, ReactiveFormsModule, BadgeComponent, ButtonComponent, EmptyStateComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-semibold">Home banners</h2>
      @if (!editing()) {
        <button uiButton type="button" (click)="startNew()">New banner</button>
      }
    </div>

    @if (editing()) {
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="mb-6 grid gap-4 rounded-lg border border-border p-4 md:grid-cols-2" aria-label="Banner form">
        @if (formError()) {
          <p class="rounded-md border border-danger p-3 text-sm md:col-span-2" role="alert">{{ formError() }}</p>
        }
        <ui-form-field #a="uiFormField" label="Title" [required]="true" [error]="err('title')" class="md:col-span-2">
          <input uiInput [id]="a.id" formControlName="title" maxlength="80" [attr.aria-describedby]="a.describedBy()" [attr.aria-invalid]="err('title') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #b="uiFormField" label="Subtitle" [error]="err('subtitle')" class="md:col-span-2">
          <input uiInput [id]="b.id" formControlName="subtitle" maxlength="160" [attr.aria-describedby]="b.describedBy()" />
        </ui-form-field>
        <ui-form-field #c="uiFormField" label="Button text" [required]="true" [error]="err('cta')">
          <input uiInput [id]="c.id" formControlName="cta" maxlength="30" [attr.aria-describedby]="c.describedBy()" [attr.aria-invalid]="err('cta') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #d="uiFormField" label="Link" [required]="true" [error]="err('link')" hint="For example /c/fashion or https://example.com">
          <input uiInput [id]="d.id" formControlName="link" [attr.aria-describedby]="d.describedBy()" [attr.aria-invalid]="err('link') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #e="uiFormField" label="Image" [required]="true" [error]="err('imageUrl')" hint="Pick a sample image or paste a path or https:// address">
          <input uiInput [id]="e.id" formControlName="imageUrl" list="banner-images" [attr.aria-describedby]="e.describedBy()" [attr.aria-invalid]="err('imageUrl') ? 'true' : null" />
          <datalist id="banner-images">
            @for (img of sampleImages; track img) {
              <option [value]="img"></option>
            }
          </datalist>
        </ui-form-field>
        <ui-form-field #f="uiFormField" label="Image description (alt text)" [required]="true" [error]="err('imageAlt')">
          <input uiInput [id]="f.id" formControlName="imageAlt" [attr.aria-describedby]="f.describedBy()" [attr.aria-invalid]="err('imageAlt') ? 'true' : null" />
        </ui-form-field>
        <ui-form-field #g="uiFormField" label="Show from (optional)">
          <input uiInput type="datetime-local" [id]="g.id" formControlName="startsAt" />
        </ui-form-field>
        <ui-form-field #h="uiFormField" label="Show until (optional)" [error]="err('endsAt')">
          <input uiInput type="datetime-local" [id]="h.id" formControlName="endsAt" [attr.aria-describedby]="h.describedBy()" [attr.aria-invalid]="err('endsAt') ? 'true' : null" />
        </ui-form-field>
        <label class="flex min-h-11 items-center gap-2 text-sm md:col-span-2"><input type="checkbox" class="size-5 accent-primary" formControlName="active" /> Active (shown on the home page when in date)</label>
        <div class="flex gap-2 md:col-span-2">
          <button uiButton type="submit" [loading]="busy()">Save banner</button>
          <button uiButton variant="secondary" type="button" (click)="editing.set(false)">Cancel</button>
        </div>
      </form>
    }

    @if (banners().length) {
      <ol class="space-y-3" aria-label="Banners in display order">
        @for (b of banners(); track b.id; let i = $index; let last = $last) {
          <li class="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
            <img [ngSrc]="b.image.url" width="128" height="45" [alt]="b.image.alt" class="h-12 w-32 rounded object-cover" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ b.title }}</p>
              <p class="text-xs text-text-muted">{{ b.link }} · {{ b.startsAt ? (b.startsAt | date: 'd MMM y') : 'no start' }} to {{ b.endsAt ? (b.endsAt | date: 'd MMM y') : 'no end' }}</p>
            </div>
            <ui-badge [tone]="b.active ? 'success' : 'neutral'">{{ b.active ? 'Active' : 'Inactive' }}</ui-badge>
            <div class="flex gap-1">
              <button type="button" class="min-h-11 min-w-11 rounded-md border border-border-strong hover:bg-surface-alt disabled:opacity-40" [disabled]="i === 0" (click)="move(i, -1)" [attr.aria-label]="'Move ' + b.title + ' up'">↑</button>
              <button type="button" class="min-h-11 min-w-11 rounded-md border border-border-strong hover:bg-surface-alt disabled:opacity-40" [disabled]="last" (click)="move(i, 1)" [attr.aria-label]="'Move ' + b.title + ' down'">↓</button>
              <button type="button" class="min-h-11 px-3 text-sm font-medium text-primary hover:underline" (click)="edit(b)">Edit<span class="sr-only"> {{ b.title }}</span></button>
              <button type="button" class="min-h-11 px-3 text-sm font-medium text-danger hover:underline" (click)="remove(b)">Delete<span class="sr-only"> {{ b.title }}</span></button>
            </div>
          </li>
        }
      </ol>
    } @else if (resource.isLoading()) {
      <ui-skeleton class="h-24" />
    } @else {
      <ui-empty-state title="No banners" description="The home page will show no banner carousel." />
    }
  `,
})
export class BannersPageComponent {
  private readonly api = inject(AdminContentApi);
  private readonly toast = inject(ToastService);

  protected readonly resource = rxResource({ stream: () => this.api.banners() });
  private readonly override = signal<ContentBanner[] | null>(null);
  protected readonly banners = computed<ContentBanner[]>(() => this.override() ?? (this.resource.hasValue() ? this.resource.value() : []));

  protected readonly sampleImages = ['/mock/img/hero-1.svg', '/mock/img/hero-2.svg', '/mock/img/hero-3.svg', '/mock/img/hero-4.svg'];
  protected readonly editing = signal(false);
  protected readonly busy = signal(false);
  protected readonly formError = signal('');
  private readonly serverErrors = signal<Record<string, string>>({});
  private editingId: string | undefined;

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    subtitle: new FormControl('', { nonNullable: true }),
    cta: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    link: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    imageUrl: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    imageAlt: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    startsAt: new FormControl('', { nonNullable: true }),
    endsAt: new FormControl('', { nonNullable: true }),
    active: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    inject(SeoService).set({ title: 'Banners', noindex: true });
  }

  protected err(name: Field): string {
    const server = this.serverErrors()[name];
    if (server) return server;
    const c = this.form.controls[name as keyof typeof this.form.controls];
    return c && c.touched && c.invalid ? 'This field is required' : '';
  }

  protected startNew(): void {
    this.editingId = undefined;
    this.form.reset({ title: '', subtitle: '', cta: 'Shop now', link: '/', imageUrl: this.sampleImages[0], imageAlt: '', startsAt: '', endsAt: '', active: true });
    this.serverErrors.set({});
    this.formError.set('');
    this.editing.set(true);
  }

  protected edit(b: ContentBanner): void {
    this.editingId = b.id;
    this.form.setValue({ title: b.title, subtitle: b.subtitle, cta: b.cta, link: b.link, imageUrl: b.image.url, imageAlt: b.image.alt, startsAt: toLocalInput(b.startsAt), endsAt: toLocalInput(b.endsAt), active: b.active });
    this.serverErrors.set({});
    this.formError.set('');
    this.editing.set(true);
  }

  private async apply(request: Observable<ContentBanner[]>, message: string): Promise<boolean> {
    try {
      this.override.set(await firstValueFrom(request));
      this.toast.success(message);
      return true;
    } catch (e) {
      if (e instanceof ApiException) {
        this.formError.set(this.editing() ? e.message : '');
        this.serverErrors.set(e.fields ?? {});
        if (!this.editing()) this.toast.error(e.message);
      } else {
        this.toast.error('The action failed.');
      }
      return false;
    }
  }

  protected async save(): Promise<void> {
    this.formError.set('');
    this.serverErrors.set({});
    this.form.markAllAsTouched();
    const f = this.form.getRawValue();
    this.busy.set(true);
    const ok = await this.apply(
      this.api.saveBanner({
        ...(this.editingId ? { id: this.editingId } : {}),
        title: f.title,
        subtitle: f.subtitle,
        cta: f.cta,
        link: f.link.trim(),
        image: { url: f.imageUrl.trim(), alt: f.imageAlt, width: 1600, height: 560 },
        active: f.active,
        startsAt: fromLocalInput(f.startsAt),
        endsAt: fromLocalInput(f.endsAt),
      }),
      'Banner saved',
    );
    this.busy.set(false);
    if (ok) this.editing.set(false);
  }

  protected move(index: number, delta: number): Promise<boolean> {
    const ids = this.banners().map((b) => b.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    return this.apply(this.api.reorderBanners(ids), 'Order updated');
  }

  protected remove(b: ContentBanner): Promise<boolean> {
    return this.apply(this.api.deleteBanner(b.id), 'Banner deleted');
  }
}
