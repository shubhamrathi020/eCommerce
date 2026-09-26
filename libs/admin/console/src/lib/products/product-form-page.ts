import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AdminProductApi } from '@ecom/shared/data-access';
import type { AdminProductInput, AdminVariantInput, ProductStatus } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, SkeletonComponent } from '@ecom/shared/ui';
import { paiseToRupees, rupeesToPaise } from '../list-params';

const requiredText = [Validators.required, Validators.pattern(/\S/)];

function parseOptions(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of text.split(';')) {
    const [k, ...rest] = part.split('=');
    if (k?.trim() && rest.join('=').trim()) out[k.trim()] = rest.join('=').trim();
  }
  return out;
}

const formatOptions = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}=${v}`).join('; ');

const variantGroup = () =>
  new FormGroup({
    id: new FormControl('', { nonNullable: true }),
    sku: new FormControl('', { nonNullable: true, validators: requiredText }),
    options: new FormControl('', { nonNullable: true }),
    price: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    mrp: new FormControl('', { nonNullable: true }),
    stock: new FormControl('0', { nonNullable: true, validators: [Validators.required] }),
  });

/** Create or edit a product, including its variants. Money is typed in rupees; the API works in paise. */
@Component({
  selector: 'adm-product-form',
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (missing()) {
      <ui-not-found />
    } @else if (ready()) {
      <a routerLink="/products" class="mb-2 inline-flex min-h-11 items-center text-sm text-primary hover:underline">← Back to products</a>
      <h1 class="mb-4 text-2xl font-bold">{{ id() ? 'Edit product' : 'New product' }}</h1>
      @if (formError()) {
        <p class="mb-4 rounded-md border border-danger p-3 text-sm" role="alert">{{ formError() }}</p>
      }
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="max-w-4xl space-y-6">
        <section class="grid gap-4 md:grid-cols-2" aria-label="Details">
          <ui-form-field #f1="uiFormField" label="Title" [required]="true" [error]="err('title')" class="md:col-span-2">
            <input uiInput [id]="f1.id" formControlName="title" maxlength="120" [attr.aria-describedby]="f1.describedBy()" [attr.aria-invalid]="err('title') ? 'true' : null" />
          </ui-form-field>
          <ui-form-field #f2="uiFormField" label="Brand" [required]="true" [error]="err('brandName')">
            <input uiInput [id]="f2.id" formControlName="brandName" [attr.aria-describedby]="f2.describedBy()" [attr.aria-invalid]="err('brandName') ? 'true' : null" />
          </ui-form-field>
          <ui-form-field #f3="uiFormField" label="Category" [required]="true" [error]="err('categoryId')" [hint]="id() ? 'Category cannot be changed after creation.' : ''">
            <select uiInput [id]="f3.id" formControlName="categoryId" [attr.aria-describedby]="f3.describedBy()" [attr.aria-invalid]="err('categoryId') ? 'true' : null">
              <option value="">Choose a category</option>
              @for (c of categories(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          </ui-form-field>
          <ui-form-field #f4="uiFormField" label="Status">
            <select uiInput [id]="f4.id" formControlName="status">
              @for (s of statuses; track s) {
                <option [value]="s">{{ s }}</option>
              }
            </select>
          </ui-form-field>
          <ui-form-field #f5="uiFormField" label="Tags (comma separated)">
            <input uiInput [id]="f5.id" formControlName="tags" />
          </ui-form-field>
          <ui-form-field #f6="uiFormField" label="Description" class="md:col-span-2" [error]="err('description')" hint="Plain text. Leave a blank line between paragraphs.">
            <textarea uiInput rows="5" [id]="f6.id" formControlName="description" [attr.aria-describedby]="f6.describedBy()"></textarea>
          </ui-form-field>
          <ui-form-field #f7="uiFormField" label="Highlights (one per line)" class="md:col-span-2">
            <textarea uiInput rows="3" [id]="f7.id" formControlName="highlights"></textarea>
          </ui-form-field>
        </section>

        <section aria-labelledby="vh">
          <div class="mb-2 flex items-center justify-between">
            <h2 id="vh" class="text-lg font-semibold">Variants</h2>
            <button uiButton size="sm" variant="secondary" type="button" (click)="addVariant()">Add variant</button>
          </div>
          @if (serverErrors()['variants']) {
            <p class="mb-2 text-sm text-danger" role="alert">{{ serverErrors()['variants'] }}</p>
          }
          <div formArrayName="variants" class="space-y-3">
            @for (group of variants.controls; track group; let i = $index) {
              <fieldset [formGroupName]="i" class="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-6">
                <legend class="px-1 text-sm font-medium">Variant {{ i + 1 }}</legend>
                <ui-form-field #v1="uiFormField" label="SKU" [required]="true" [error]="verr(i, 'sku')" class="md:col-span-2">
                  <input uiInput [id]="v1.id" formControlName="sku" [attr.aria-describedby]="v1.describedBy()" [attr.aria-invalid]="verr(i, 'sku') ? 'true' : null" />
                </ui-form-field>
                <ui-form-field #v2="uiFormField" label="Options" hint="e.g. colour=Black; size=M" class="md:col-span-2">
                  <input uiInput [id]="v2.id" formControlName="options" [attr.aria-describedby]="v2.describedBy()" />
                </ui-form-field>
                <ui-form-field #v3="uiFormField" label="Price (₹)" [required]="true" [error]="verr(i, 'price')">
                  <input uiInput inputmode="decimal" [id]="v3.id" formControlName="price" [attr.aria-describedby]="v3.describedBy()" [attr.aria-invalid]="verr(i, 'price') ? 'true' : null" />
                </ui-form-field>
                <ui-form-field #v4="uiFormField" label="MRP (₹)" [error]="verr(i, 'mrp')">
                  <input uiInput inputmode="decimal" [id]="v4.id" formControlName="mrp" [attr.aria-describedby]="v4.describedBy()" [attr.aria-invalid]="verr(i, 'mrp') ? 'true' : null" />
                </ui-form-field>
                <ui-form-field #v5="uiFormField" [label]="group.controls.id.value ? 'Stock (change in Inventory)' : 'Opening stock'" [required]="true" [error]="verr(i, 'stock')">
                  <input uiInput inputmode="numeric" [id]="v5.id" formControlName="stock" [attr.aria-describedby]="v5.describedBy()" [attr.aria-invalid]="verr(i, 'stock') ? 'true' : null" />
                </ui-form-field>
                @if (variants.length > 1) {
                  <div class="flex items-end md:col-span-6">
                    <button type="button" class="min-h-11 text-sm font-medium text-danger hover:underline" (click)="removeVariant(i)">Remove variant {{ i + 1 }}</button>
                  </div>
                }
              </fieldset>
            }
          </div>
        </section>

        <div class="flex gap-2">
          <button uiButton type="submit" [loading]="saving()">{{ id() ? 'Save changes' : 'Create product' }}</button>
          <a uiButton variant="secondary" routerLink="/products">Cancel</a>
        </div>
      </form>
    } @else if (loadError()) {
      <ui-error-state (retry)="detail.reload()" />
    } @else {
      <ui-skeleton class="h-64" />
    }
  `,
})
export class ProductFormPageComponent {
  /** Route parameter; absent when creating. */
  readonly id = input<string | undefined>();

  private readonly api = inject(AdminProductApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly statuses: ProductStatus[] = ['draft', 'published', 'archived'];
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly serverErrors = signal<Record<string, string>>({});

  private readonly categoryResource = rxResource({ stream: () => this.api.categories() });
  protected readonly categories = computed(() => (this.categoryResource.hasValue() ? this.categoryResource.value() : []));
  protected readonly detail = rxResource({ params: () => this.id(), stream: ({ params }) => this.api.get(params) });

  protected readonly missing = computed(() => this.detail.status() === 'error' && this.detail.error() instanceof ApiException && (this.detail.error() as ApiException).code === 'not_found');
  protected readonly loadError = computed(() => this.detail.status() === 'error' && !this.missing());
  protected readonly ready = computed(() => this.categoryResource.hasValue() && (!this.id() || this.detail.hasValue()));

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: requiredText }),
    brandName: new FormControl('', { nonNullable: true, validators: requiredText }),
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    status: new FormControl<ProductStatus>('draft', { nonNullable: true }),
    tags: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    highlights: new FormControl('', { nonNullable: true }),
    variants: new FormArray([variantGroup()]),
  });

  protected get variants(): FormArray<ReturnType<typeof variantGroup>> {
    return this.form.controls.variants;
  }

  constructor() {
    inject(SeoService).set({ title: 'Product', noindex: true });
    effect(() => {
      if (!this.detail.hasValue()) return;
      const d = this.detail.value();
      untracked(() => {
        this.form.controls.variants.clear();
        for (const v of d.variants) {
          const g = variantGroup();
          g.setValue({ id: v.id ?? '', sku: v.sku, options: formatOptions(v.options), price: paiseToRupees(v.price), mrp: paiseToRupees(v.mrp), stock: String(v.stock) });
          // Stock of an existing variant only changes through the inventory ledger, with a reason.
          if (v.id) g.controls.stock.disable();
          this.form.controls.variants.push(g);
        }
        this.form.patchValue({ title: d.title, brandName: d.brandName, categoryId: d.categoryId, status: d.status, tags: d.tags.join(', '), description: d.description, highlights: d.highlights.join('\n') });
        this.form.controls.categoryId.disable();
      });
    });
  }

  protected err(name: 'title' | 'brandName' | 'categoryId' | 'description'): string {
    const server = this.serverErrors()[name];
    if (server) return server;
    const c = this.form.controls[name];
    return c.touched && c.invalid ? 'This field is required' : '';
  }

  protected verr(index: number, name: 'sku' | 'price' | 'mrp' | 'stock'): string {
    const server = this.serverErrors()[`variants.${index}.${name}`];
    if (server) return server;
    const c = this.variants.at(index).controls[name];
    return c.touched && c.invalid ? 'This field is required' : '';
  }

  protected addVariant(): void {
    this.variants.push(variantGroup());
  }

  protected removeVariant(index: number): void {
    this.variants.removeAt(index);
  }

  private toInput(): AdminProductInput {
    const f = this.form.getRawValue();
    return {
      title: f.title,
      brandName: f.brandName,
      categoryId: f.categoryId,
      description: f.description,
      highlights: f.highlights.split('\n').map((h) => h.trim()).filter(Boolean),
      tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
      status: f.status,
      variants: f.variants.map<AdminVariantInput>((v) => {
        const mrp = rupeesToPaise(v.mrp);
        return { ...(v.id ? { id: v.id } : {}), sku: v.sku, options: parseOptions(v.options), price: rupeesToPaise(v.price) ?? 0, ...(mrp !== undefined ? { mrp } : {}), stock: v.stock.trim() === '' ? -1 : Number(v.stock) };
      }),
    };
  }

  protected async save(): Promise<void> {
    this.formError.set('');
    this.serverErrors.set({});
    this.form.markAllAsTouched();
    this.saving.set(true);
    try {
      const input = this.toInput();
      const saved = this.id() ? await firstValueFrom(this.api.update(this.id() as string, input)) : await firstValueFrom(this.api.create(input));
      this.toast.success(this.id() ? 'Product saved' : 'Product created');
      if (!this.id()) await this.router.navigate(['/products', saved.id]);
    } catch (e) {
      if (e instanceof ApiException) {
        this.formError.set(e.message);
        this.serverErrors.set(e.fields ?? {});
      } else {
        this.formError.set('Could not save the product.');
      }
    } finally {
      this.saving.set(false);
    }
  }
}
