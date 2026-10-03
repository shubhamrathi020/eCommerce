import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AdminPromotionApi, CategoryApi } from '@ecom/shared/data-access';
import { ApiException, PROMOTION_KIND_LABEL, type Promotion, type PromotionInput, SEGMENT_LABEL, type Segment, type StackingMode } from '@ecom/contracts';
import { ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, SkeletonComponent } from '@ecom/shared/ui';
import { paiseToRupees, rupeesToPaise } from '../list-params';

type Kind = Promotion['kind'];

/** ISO time to the value a datetime-local input wants (local time, minutes). */
const toLocalInput = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (value: string): string | undefined => (value ? new Date(value).toISOString() : undefined);
const list = (text: string) => text.split(/[\s,]+/).filter(Boolean);

/** Create or edit one promotion. The form only collects values; the API validates and explains (field messages come back as-is). */
@Component({
  selector: 'adm-promotion-form',
  imports: [RouterLink, ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (missing()) {
      <ui-not-found />
    } @else if (ready()) {
      <a routerLink="/promotions/list" class="mb-2 inline-flex min-h-11 items-center text-sm text-primary hover:underline">← Back to promotions</a>
      <h2 class="mb-4 text-xl font-bold">{{ id() ? 'Edit promotion' : 'New promotion' }}</h2>
      <form class="max-w-2xl space-y-4" (submit)="save($event)" novalidate>
        <ui-form-field #k="uiFormField" label="Type" [required]="true">
          <select uiInput [id]="k.id" [disabled]="!!id()" (change)="kind.set($any($event.target).value)">
            @for (o of kindOptions; track o.value) {
              <option [value]="o.value" [selected]="kind() === o.value">{{ o.label }}</option>
            }
          </select>
        </ui-form-field>
        <ui-form-field #n="uiFormField" label="Name" [required]="true" [error]="errors()['name'] ?? ''">
          <input uiInput [id]="n.id" [value]="name()" [attr.aria-describedby]="n.describedBy()" [attr.aria-invalid]="errors()['name'] ? 'true' : null" (input)="name.set($any($event.target).value)" />
        </ui-form-field>
        <ui-form-field #d="uiFormField" label="Description" hint="Optional, shown to the team only">
          <input uiInput [id]="d.id" [value]="description()" [attr.aria-describedby]="d.describedBy()" (input)="description.set($any($event.target).value)" />
        </ui-form-field>

        @switch (kind()) {
          @case ('buy_x_get_y') {
            <div class="grid gap-3 sm:grid-cols-3">
              <ui-form-field #b="uiFormField" label="Buy" [required]="true" [error]="errors()['buy'] ?? ''"><input uiInput inputmode="numeric" [id]="b.id" [value]="buy()" [attr.aria-describedby]="b.describedBy()" (input)="buy.set($any($event.target).value)" /></ui-form-field>
              <ui-form-field #g="uiFormField" label="Get" [required]="true" [error]="errors()['get'] ?? ''"><input uiInput inputmode="numeric" [id]="g.id" [value]="get()" [attr.aria-describedby]="g.describedBy()" (input)="get.set($any($event.target).value)" /></ui-form-field>
              <ui-form-field #po="uiFormField" label="Discount on those (%)" hint="100 means free" [required]="true" [error]="errors()['percentOff'] ?? ''"><input uiInput inputmode="numeric" [id]="po.id" [value]="percentOff()" [attr.aria-describedby]="po.describedBy()" (input)="percentOff.set($any($event.target).value)" /></ui-form-field>
            </div>
            <p class="text-sm text-text-muted">The cheapest matching units in each group are the discounted ones.</p>
          }
          @case ('tiered') {
            <ui-form-field #bs="uiFormField" label="Tiers are measured by">
              <select uiInput [id]="bs.id" (change)="basis.set($any($event.target).value)">
                <option value="subtotal" [selected]="basis() === 'subtotal'">Spend (₹)</option>
                <option value="quantity" [selected]="basis() === 'quantity'">Number of items</option>
              </select>
            </ui-form-field>
            <ui-form-field #t="uiFormField" label="Tiers" [required]="true" [hint]="basis() === 'subtotal' ? 'One tier per line: spend in ₹, then percent off. Example: 10000 5' : 'One tier per line: item count, then percent off. Example: 3 10'" [error]="errors()['tiers'] ?? ''">
              <textarea uiInput rows="3" [id]="t.id" [value]="tiersText()" [attr.aria-describedby]="t.describedBy()" [attr.aria-invalid]="errors()['tiers'] ? 'true' : null" (input)="tiersText.set($any($event.target).value)"></textarea>
            </ui-form-field>
          }
          @case ('category_sale') {
            <ui-form-field #pc="uiFormField" label="Percent off" [required]="true" [error]="errors()['percent'] ?? ''"><input uiInput inputmode="numeric" [id]="pc.id" [value]="percent()" [attr.aria-describedby]="pc.describedBy()" (input)="percent.set($any($event.target).value)" /></ui-form-field>
          }
          @case ('flash') {
            <div class="grid gap-3 sm:grid-cols-2">
              <ui-form-field #pi="uiFormField" label="Product id" hint="e.g. p-0001" [required]="true" [error]="errors()['productId'] ?? ''"><input uiInput [id]="pi.id" [value]="productId()" [attr.aria-describedby]="pi.describedBy()" (input)="productId.set($any($event.target).value)" /></ui-form-field>
              <ui-form-field #dp="uiFormField" label="Deal price (₹)" [required]="true" [error]="errors()['dealPrice'] ?? ''"><input uiInput inputmode="decimal" [id]="dp.id" [value]="dealPrice()" [attr.aria-describedby]="dp.describedBy()" (input)="dealPrice.set($any($event.target).value)" /></ui-form-field>
              <ui-form-field #cp="uiFormField" label="Units at the deal price" [required]="true" [error]="errors()['cap'] ?? ''"><input uiInput inputmode="numeric" [id]="cp.id" [value]="cap()" [attr.aria-describedby]="cp.describedBy()" (input)="cap.set($any($event.target).value)" /></ui-form-field>
              <ui-form-field #lm="uiFormField" label="Limit per order" hint="Optional" [error]="errors()['perOrderLimit'] ?? ''"><input uiInput inputmode="numeric" [id]="lm.id" [value]="perOrderLimit()" [attr.aria-describedby]="lm.describedBy()" (input)="perOrderLimit.set($any($event.target).value)" /></ui-form-field>
            </div>
            <p class="text-sm text-text-muted">The deal ends at the end time or when the units run out, whichever comes first.</p>
          }
        }

        @if (kind() !== 'flash') {
          <fieldset>
            <legend class="mb-1 text-sm font-medium">{{ kind() === 'category_sale' ? 'Categories' : 'Limit to categories' }}@if (kind() === 'category_sale') { <span aria-hidden="true" class="text-danger"> *</span> }</legend>
            <ul class="grid gap-1 sm:grid-cols-2">
              @for (c of categories(); track c.id) {
                <li>
                  <label class="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" class="size-5 accent-primary" [checked]="categoryIds().includes(c.id)" (change)="toggleCategory(c.id, $any($event.target).checked)" />
                    {{ c.name }}
                  </label>
                </li>
              }
            </ul>
            @if (errors()['categoryIds']) {
              <p class="text-sm text-danger" role="alert">{{ errors()['categoryIds'] }}</p>
            }
          </fieldset>
          @if (kind() !== 'category_sale') {
            <ui-form-field #pr="uiFormField" label="Limit to product ids" hint="Optional. One per line or comma separated. Leave both empty to cover everything.">
              <textarea uiInput rows="2" [id]="pr.id" [value]="productIds()" [attr.aria-describedby]="pr.describedBy()" (input)="productIds.set($any($event.target).value)"></textarea>
            </ui-form-field>
          }
        }

        <div class="grid gap-3 sm:grid-cols-2">
          <ui-form-field #st="uiFormField" label="Starts" hint="Leave empty to start now" [error]="errors()['startsAt'] ?? ''"><input uiInput type="datetime-local" [id]="st.id" [value]="startsAt()" [attr.aria-describedby]="st.describedBy()" (input)="startsAt.set($any($event.target).value)" /></ui-form-field>
          <ui-form-field #en="uiFormField" label="Ends" [hint]="kind() === 'flash' ? 'Required: this drives the countdown' : 'Leave empty to run until paused'" [required]="kind() === 'flash'" [error]="errors()['endsAt'] ?? ''"><input uiInput type="datetime-local" [id]="en.id" [value]="endsAt()" [attr.aria-describedby]="en.describedBy()" (input)="endsAt.set($any($event.target).value)" /></ui-form-field>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <ui-form-field #sg="uiFormField" label="Who gets it">
            <select uiInput [id]="sg.id" (change)="segment.set($any($event.target).value)">
              @for (s of segmentOptions; track s.value) {
                <option [value]="s.value" [selected]="segment() === s.value">{{ s.label }}</option>
              }
            </select>
          </ui-form-field>
          <ui-form-field #sk="uiFormField" label="Stacking" hint="Exclusive offers never combine">
            <select uiInput [id]="sk.id" (change)="stacking.set($any($event.target).value)">
              <option value="stackable" [selected]="stacking() === 'stackable'">Stackable</option>
              <option value="exclusive" [selected]="stacking() === 'exclusive'">Exclusive</option>
            </select>
          </ui-form-field>
          <ui-form-field #pt="uiFormField" label="Priority" hint="0 to 100, higher first" [error]="errors()['priority'] ?? ''"><input uiInput inputmode="numeric" [id]="pt.id" [value]="priority()" [attr.aria-describedby]="pt.describedBy()" (input)="priority.set($any($event.target).value)" /></ui-form-field>
        </div>

        <label class="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" class="size-5 accent-primary" [checked]="enabled()" (change)="enabled.set($any($event.target).checked)" /> Active</label>

        @if (formError()) {
          <p class="text-sm text-danger" role="alert">{{ formError() }}</p>
        }
        <button uiButton type="submit" [loading]="saving()">Save promotion</button>
      </form>
    } @else if (loadFailed()) {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-96 max-w-2xl" />
    }
  `,
})
export class PromotionFormPageComponent {
  /** Absent when creating. */
  readonly id = input<string | undefined>();

  private readonly api = inject(AdminPromotionApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly resource = rxResource({ stream: () => this.api.list() });
  private readonly tree = rxResource({ stream: () => this.categoryApi.tree() });
  private readonly categoryApi = inject(CategoryApi);

  protected readonly kindOptions = (Object.keys(PROMOTION_KIND_LABEL) as Kind[]).map((value) => ({ value, label: PROMOTION_KIND_LABEL[value] }));
  protected readonly segmentOptions = (Object.keys(SEGMENT_LABEL) as Segment[]).map((value) => ({ value, label: SEGMENT_LABEL[value] }));
  protected readonly categories = computed(() => (this.tree.hasValue() ? this.tree.value() : []));

  protected readonly kind = signal<Kind>('category_sale');
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly priority = signal('5');
  protected readonly segment = signal<Segment>('all');
  protected readonly stacking = signal<StackingMode>('stackable');
  protected readonly enabled = signal(true);
  protected readonly startsAt = signal('');
  protected readonly endsAt = signal('');
  protected readonly buy = signal('2');
  protected readonly get = signal('1');
  protected readonly percentOff = signal('100');
  protected readonly basis = signal<'subtotal' | 'quantity'>('subtotal');
  protected readonly tiersText = signal('');
  protected readonly percent = signal('10');
  protected readonly categoryIds = signal<string[]>([]);
  protected readonly productIds = signal('');
  protected readonly productId = signal('');
  protected readonly dealPrice = signal('');
  protected readonly cap = signal('10');
  protected readonly perOrderLimit = signal('');

  protected readonly errors = signal<Record<string, string>>({});
  protected readonly formError = signal('');
  protected readonly saving = signal(false);
  private readonly loaded = signal(false);

  protected readonly existing = computed(() => (this.id() && this.resource.hasValue() ? this.resource.value().find((p) => p.id === this.id()) : undefined));
  protected readonly missing = computed(() => !!this.id() && this.resource.hasValue() && !this.existing());
  protected readonly loadFailed = computed(() => this.resource.status() === 'error');
  protected readonly ready = computed(() => this.resource.hasValue() && !this.missing() && (!this.id() || this.loaded()));

  constructor() {
    inject(SeoService).set({ title: 'Promotion', noindex: true });
    effect(() => {
      const p = this.existing();
      if (!p) {
        if (this.resource.hasValue()) untracked(() => this.loaded.set(true));
        return;
      }
      untracked(() => {
        this.kind.set(p.kind);
        this.name.set(p.name);
        this.description.set(p.description ?? '');
        this.priority.set(String(p.priority));
        this.segment.set(p.segment);
        this.stacking.set(p.stacking);
        this.enabled.set(p.enabled);
        this.startsAt.set(toLocalInput(p.startsAt));
        this.endsAt.set(toLocalInput(p.endsAt));
        if (p.kind === 'buy_x_get_y') {
          this.buy.set(String(p.buy));
          this.get.set(String(p.get));
          this.percentOff.set(String(p.percentOff));
        }
        if (p.kind === 'tiered') {
          this.basis.set(p.basis);
          this.tiersText.set(p.tiers.map((t) => `${p.basis === 'subtotal' ? paiseToRupees(t.min) : t.min} ${t.percent}`).join('\n'));
        }
        if (p.kind === 'category_sale') this.percent.set(String(p.percent));
        if (p.kind === 'flash') {
          this.productId.set(p.productId);
          this.dealPrice.set(paiseToRupees(p.dealPrice));
          this.cap.set(String(p.cap));
          this.perOrderLimit.set(p.perOrderLimit ? String(p.perOrderLimit) : '');
        }
        if (p.kind !== 'flash') {
          this.categoryIds.set(p.categoryIds ?? []);
          this.productIds.set(p.kind === 'category_sale' ? '' : (p.productIds ?? []).join('\n'));
        }
        this.loaded.set(true);
      });
    });
  }

  protected toggleCategory(id: string, on: boolean): void {
    this.categoryIds.update((l) => (on ? [...new Set([...l, id])] : l.filter((x) => x !== id)));
  }

  /** Builds the request from the form; numbers that don't parse become NaN so the API's own message explains them. */
  private build(): PromotionInput | null {
    const num = (s: string) => (s.trim() === '' ? Number.NaN : Number(s));
    const common = { name: this.name(), description: this.description().trim() || undefined, enabled: this.enabled(), priority: num(this.priority()), segment: this.segment(), stacking: this.stacking(), startsAt: fromLocalInput(this.startsAt()), endsAt: fromLocalInput(this.endsAt()), ...(this.id() ? { id: this.id() } : {}) };
    const scope = { ...(this.categoryIds().length ? { categoryIds: this.categoryIds() } : {}), ...(list(this.productIds()).length ? { productIds: list(this.productIds()) } : {}) };
    switch (this.kind()) {
      case 'buy_x_get_y':
        return { ...common, ...scope, kind: 'buy_x_get_y', buy: num(this.buy()), get: num(this.get()), percentOff: num(this.percentOff()) };
      case 'tiered': {
        const tiers = this.tiersText()
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => {
            const [min, pct] = l.split(/[\s,]+/);
            return { min: this.basis() === 'subtotal' ? (rupeesToPaise(min) ?? Number.NaN) : num(min), percent: num(pct ?? '') };
          });
        return { ...common, ...scope, kind: 'tiered', basis: this.basis(), tiers };
      }
      case 'category_sale':
        return { ...common, kind: 'category_sale', categoryIds: this.categoryIds(), percent: num(this.percent()) };
      case 'flash':
        return { ...common, kind: 'flash', productId: this.productId().trim(), dealPrice: rupeesToPaise(this.dealPrice()) ?? Number.NaN, cap: num(this.cap()), ...(this.perOrderLimit().trim() ? { perOrderLimit: num(this.perOrderLimit()) } : {}) };
    }
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.errors.set({});
    this.formError.set('');
    const input = this.build();
    if (!input) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.save(input));
      this.toast.success('Promotion saved.');
      await this.router.navigate(['/promotions/list']);
    } catch (e) {
      if (e instanceof ApiException) {
        this.errors.set(e.fields ?? {});
        this.formError.set(e.fields ? 'Please check the highlighted fields.' : e.message);
      } else this.formError.set('Could not save the promotion.');
    } finally {
      this.saving.set(false);
    }
  }
}
