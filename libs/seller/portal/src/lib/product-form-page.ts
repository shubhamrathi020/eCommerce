import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { CategoryApi, SellerPortalApi } from '@ecom/shared/data-access';
import { ApiException, type CategoryNode } from '@ecom/shared/models';
import { ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, SkeletonComponent } from '@ecom/shared/ui';

const rupeesToPaise = (text: string): number => {
  const n = Number(text.replace(/,/g, ''));
  return text.trim() === '' || !Number.isFinite(n) ? Number.NaN : Math.round(n * 100);
};

/** Create or edit a listing. A new listing starts as a draft; submit it for approval from the product list. */
@Component({
  selector: 'sel-product-form',
  imports: [RouterLink, ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (missing()) {
      <ui-not-found />
    } @else if (ready()) {
      <a routerLink="/products" class="mb-2 inline-flex min-h-11 items-center text-sm text-primary hover:underline">← Back to products</a>
      <h1 class="mb-1 text-2xl font-bold">{{ id() ? 'Edit product' : 'New product' }}</h1>
      @if (existing()?.status === 'approved') {
        <p class="mb-4 max-w-2xl text-sm text-text-muted">This listing is live. Changing the title, brand, category or description sends it back for approval and takes it off sale until then. Price, MRP and stock changes apply at once.</p>
      }
      <form class="max-w-2xl space-y-4" (submit)="save($event)" novalidate>
        <ui-form-field #t="uiFormField" label="Title" [required]="true" [error]="errors()['title'] ?? ''"><input uiInput [id]="t.id" [value]="title()" [attr.aria-describedby]="t.describedBy()" [attr.aria-invalid]="errors()['title'] ? 'true' : null" (input)="title.set($any($event.target).value)" /></ui-form-field>
        <ui-form-field #b="uiFormField" label="Brand" [required]="true" [error]="errors()['brandName'] ?? ''"><input uiInput [id]="b.id" [value]="brand()" [attr.aria-describedby]="b.describedBy()" [attr.aria-invalid]="errors()['brandName'] ? 'true' : null" (input)="brand.set($any($event.target).value)" /></ui-form-field>
        <ui-form-field #c="uiFormField" label="Category" [required]="true" [error]="errors()['categoryId'] ?? ''">
          <select uiInput [id]="c.id" [attr.aria-describedby]="c.describedBy()" [attr.aria-invalid]="errors()['categoryId'] ? 'true' : null" (change)="categoryId.set($any($event.target).value)">
            <option value="">Choose…</option>
            @for (opt of categoryOptions(); track opt.id) {
              <option [value]="opt.id" [selected]="categoryId() === opt.id">{{ opt.label }}</option>
            }
          </select>
        </ui-form-field>
        <ui-form-field #d="uiFormField" label="Description" [required]="true" [error]="errors()['description'] ?? ''"><textarea uiInput rows="5" [id]="d.id" [value]="description()" [attr.aria-describedby]="d.describedBy()" [attr.aria-invalid]="errors()['description'] ? 'true' : null" (input)="description.set($any($event.target).value)"></textarea></ui-form-field>
        <div class="grid gap-3 sm:grid-cols-3">
          <ui-form-field #p="uiFormField" label="Price (₹)" [required]="true" [error]="errors()['price'] ?? ''"><input uiInput inputmode="decimal" [id]="p.id" [value]="price()" [attr.aria-describedby]="p.describedBy()" [attr.aria-invalid]="errors()['price'] ? 'true' : null" (input)="price.set($any($event.target).value)" /></ui-form-field>
          <ui-form-field #m="uiFormField" label="MRP (₹)" hint="Optional. Shown struck through only if it is a believable earlier price." [error]="errors()['mrp'] ?? ''"><input uiInput inputmode="decimal" [id]="m.id" [value]="mrp()" [attr.aria-describedby]="m.describedBy()" [attr.aria-invalid]="errors()['mrp'] ? 'true' : null" (input)="mrp.set($any($event.target).value)" /></ui-form-field>
          <ui-form-field #s="uiFormField" label="Units in stock" [required]="true" [error]="errors()['stock'] ?? ''"><input uiInput inputmode="numeric" [id]="s.id" [value]="stock()" [attr.aria-describedby]="s.describedBy()" [attr.aria-invalid]="errors()['stock'] ? 'true' : null" (input)="stock.set($any($event.target).value)" /></ui-form-field>
        </div>
        @if (formError()) {
          <p class="text-sm text-danger" role="alert">{{ formError() }}</p>
        }
        <button uiButton type="submit" [loading]="saving()">Save</button>
      </form>
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-96 max-w-2xl" />
    }
  `,
})
export class ProductFormPageComponent {
  /** Absent when creating. */
  readonly id = input<string | undefined>();
  private readonly api = inject(SellerPortalApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly categoryApi = inject(CategoryApi);
  protected readonly resource = rxResource({ stream: () => this.api.products() });
  private readonly tree = rxResource({ stream: () => this.categoryApi.tree() });

  protected readonly title = signal('');
  protected readonly brand = signal('');
  protected readonly categoryId = signal('');
  protected readonly description = signal('');
  protected readonly price = signal('');
  protected readonly mrp = signal('');
  protected readonly stock = signal('0');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly formError = signal('');
  protected readonly saving = signal(false);
  private readonly loaded = signal(false);

  protected readonly existing = computed(() => (this.id() && this.resource.hasValue() ? this.resource.value().find((p) => p.id === this.id()) : undefined));
  /** Someone else's id looks exactly like a missing one. */
  protected readonly missing = computed(() => !!this.id() && this.resource.hasValue() && !this.existing());
  protected readonly ready = computed(() => this.resource.hasValue() && !this.missing() && (!this.id() || this.loaded()));
  /** Leaf categories only, labelled with their department. */
  protected readonly categoryOptions = computed(() => {
    const out: { id: string; label: string }[] = [];
    const walk = (nodes: CategoryNode[], prefix: string) => {
      for (const n of nodes) {
        if (n.children.length) walk(n.children, `${prefix}${n.name} › `);
        else if (prefix) out.push({ id: n.id, label: `${prefix}${n.name}` });
      }
    };
    walk(this.tree.hasValue() ? this.tree.value() : [], '');
    return out;
  });

  constructor() {
    inject(SeoService).set({ title: 'Product', noindex: true });
    effect(() => {
      const p = this.existing();
      if (!p) {
        if (this.resource.hasValue()) untracked(() => this.loaded.set(true));
        return;
      }
      untracked(() => {
        this.title.set(p.title);
        this.brand.set(p.brandName);
        this.categoryId.set(p.categoryId);
        this.description.set(p.description);
        this.price.set(String(p.price / 100));
        this.mrp.set(p.mrp ? String(p.mrp / 100) : '');
        this.stock.set(String(p.stock));
        this.loaded.set(true);
      });
    });
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.errors.set({});
    this.formError.set('');
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.api.saveProduct({
          ...(this.id() ? { id: this.id() } : {}),
          title: this.title(),
          brandName: this.brand(),
          categoryId: this.categoryId(),
          description: this.description(),
          price: rupeesToPaise(this.price()),
          ...(this.mrp().trim() ? { mrp: rupeesToPaise(this.mrp()) } : {}),
          stock: this.stock().trim() === '' ? Number.NaN : Number(this.stock()),
        }),
      );
      this.toast.success('Product saved.');
      await this.router.navigateByUrl('/products');
    } catch (e) {
      if (e instanceof ApiException) {
        this.errors.set(e.fields ?? {});
        this.formError.set(e.fields ? 'Please check the highlighted fields.' : e.message);
      } else this.formError.set('Could not save the product.');
    } finally {
      this.saving.set(false);
    }
  }
}
