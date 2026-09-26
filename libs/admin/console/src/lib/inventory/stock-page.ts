import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AdminInventoryApi } from '@ecom/shared/data-access';
import type { AdjustKind, InventoryFilter, InventoryQuery, InventoryRow } from '@ecom/shared/models';
import { ApiException, STOCK_REASONS } from '@ecom/shared/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, PaginationComponent, SkeletonComponent } from '@ecom/shared/ui';
import { injectListParams } from '../list-params';

const PAGE_SIZE = 20;
type Mode = 'adjust' | 'transfer' | 'policy';

const KIND_LABEL: Record<AdjustKind, string> = { receive: 'Receive stock', return: 'Customer return', damage: 'Damaged or lost (remove)', correction: 'Correction (add or remove)' };

/** Stock on hand, reserved and available per variant, with adjust, transfer and policy tools and the low-stock alerts. */
@Component({
  selector: 'adm-inventory-stock',
  imports: [DatePipe, ReactiveFormsModule, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, PaginationComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (alerts.hasValue() && alerts.value().length) {
      <section class="mb-4 rounded-lg border border-warning p-3" aria-labelledby="alerts-h">
        <h2 id="alerts-h" class="mb-1 font-semibold">Low-stock alerts ({{ alerts.value().length }})</h2>
        <p class="mb-2 text-sm text-text-muted">One alert per item until it is restocked above its threshold.</p>
        <ul class="space-y-1 text-sm">
          @for (a of alerts.value().slice(0, 5); track a.variantId) {
            <li>{{ a.title }} <span class="text-text-muted">({{ a.sku }})</span>: <strong>{{ a.available }}</strong> available, threshold {{ a.threshold }} <span class="text-text-muted">since {{ a.at | date: 'd MMM, h:mm a' }}</span></li>
          }
        </ul>
        @if (alerts.value().length > 5) {
          <p class="mt-1 text-sm text-text-muted">and {{ alerts.value().length - 5 }} more. Use the "Low stock" filter to see them all.</p>
        }
      </section>
    }

    <form class="mb-4 flex flex-wrap items-end gap-3" role="search" aria-label="Filter stock" (submit)="search($event)">
      <div>
        <label for="sq" class="mb-1 block text-sm font-medium">Search</label>
        <input id="sq" uiInput type="search" placeholder="Product or SKU" [value]="q() ?? ''" (input)="draft.set($any($event.target).value)" />
      </div>
      <div>
        <label for="sf" class="mb-1 block text-sm font-medium">Show</label>
        <select id="sf" uiInput (change)="list.patch({ filter: $any($event.target).value === 'all' ? null : $any($event.target).value })">
          @for (f of filters; track f.value) {
            <option [value]="f.value" [selected]="filter() === f.value">{{ f.label }}</option>
          }
        </select>
      </div>
      <button uiButton type="submit" variant="secondary">Search</button>
    </form>

    @if (selected(); as row) {
      <section class="mb-6 rounded-lg border border-primary p-4" aria-labelledby="ed-h" role="region">
        <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="ed-h" class="font-semibold">{{ row.title }}</h2>
            <p class="text-sm text-text-muted">{{ row.sku }} · {{ optionsText(row) }} · on hand {{ row.onHand }}, reserved {{ row.reserved }}, available {{ row.available }}</p>
          </div>
          <button uiButton size="sm" variant="ghost" type="button" (click)="close()">Close</button>
        </div>
        <div role="group" aria-label="What to do" class="mb-4 flex flex-wrap gap-1">
          @for (m of modes; track m.value) {
            <button type="button" class="min-h-11 rounded-md border px-3 text-sm font-medium" [class]="mode() === m.value ? 'border-primary bg-primary text-primary-contrast' : 'border-border-strong hover:bg-surface-alt'" [attr.aria-pressed]="mode() === m.value" (click)="setMode(m.value)">{{ m.label }}</button>
          }
        </div>
        @if (formError()) {
          <p class="mb-3 rounded-md border border-danger p-3 text-sm" role="alert">{{ formError() }}</p>
        }

        @switch (mode()) {
          @case ('adjust') {
            <form [formGroup]="adjustForm" (ngSubmit)="saveAdjust()" novalidate class="grid gap-3 md:grid-cols-2" aria-label="Adjust stock">
              <ui-form-field #a1="uiFormField" label="Location" [error]="err('locationId')">
                <select uiInput [id]="a1.id" formControlName="locationId" [attr.aria-describedby]="a1.describedBy()">
                  @for (l of locations(); track l.id) {
                    <option [value]="l.id">{{ l.name }} ({{ row.byLocation[l.id] ?? 0 }} on hand)</option>
                  }
                </select>
              </ui-form-field>
              <ui-form-field #a2="uiFormField" label="Kind of change">
                <select uiInput [id]="a2.id" formControlName="kind">
                  @for (k of kinds; track k) {
                    <option [value]="k">{{ kindLabel[k] }}</option>
                  }
                </select>
              </ui-form-field>
              <ui-form-field #a3="uiFormField" label="Units" [required]="true" [error]="err('quantity')" [hint]="adjustKind() === 'correction' ? 'Use a minus sign to remove units, e.g. -3.' : 'Whole units.'">
                <input uiInput inputmode="numeric" [id]="a3.id" formControlName="quantity" [attr.aria-describedby]="a3.describedBy()" [attr.aria-invalid]="err('quantity') ? 'true' : null" />
              </ui-form-field>
              <ui-form-field #a4="uiFormField" label="Reason" [required]="true" [error]="err('reason')">
                <select uiInput [id]="a4.id" formControlName="reason" [attr.aria-describedby]="a4.describedBy()" [attr.aria-invalid]="err('reason') ? 'true' : null">
                  <option value="">Choose a reason</option>
                  @for (r of reasons(); track r.code) {
                    <option [value]="r.code">{{ r.label }}</option>
                  }
                </select>
              </ui-form-field>
              <ui-form-field #a5="uiFormField" label="Note (optional)" class="md:col-span-2" [error]="err('note')">
                <input uiInput maxlength="200" [id]="a5.id" formControlName="note" [attr.aria-describedby]="a5.describedBy()" />
              </ui-form-field>
              <div class="md:col-span-2"><button uiButton type="submit" [loading]="saving()">Record change</button></div>
            </form>
          }
          @case ('transfer') {
            <form [formGroup]="transferForm" (ngSubmit)="saveTransfer()" novalidate class="grid gap-3 md:grid-cols-3" aria-label="Transfer stock">
              <ui-form-field #t1="uiFormField" label="From" [error]="err('fromLocationId')">
                <select uiInput [id]="t1.id" formControlName="fromLocationId">
                  @for (l of locations(); track l.id) {
                    <option [value]="l.id">{{ l.name }} ({{ row.byLocation[l.id] ?? 0 }})</option>
                  }
                </select>
              </ui-form-field>
              <ui-form-field #t2="uiFormField" label="To" [error]="err('toLocationId')">
                <select uiInput [id]="t2.id" formControlName="toLocationId" [attr.aria-describedby]="t2.describedBy()">
                  @for (l of locations(); track l.id) {
                    <option [value]="l.id">{{ l.name }} ({{ row.byLocation[l.id] ?? 0 }})</option>
                  }
                </select>
              </ui-form-field>
              <ui-form-field #t3="uiFormField" label="Units" [required]="true" [error]="err('quantity')">
                <input uiInput inputmode="numeric" [id]="t3.id" formControlName="quantity" [attr.aria-describedby]="t3.describedBy()" [attr.aria-invalid]="err('quantity') ? 'true' : null" />
              </ui-form-field>
              <div class="md:col-span-3"><button uiButton type="submit" [loading]="saving()">Move stock</button></div>
            </form>
          }
          @case ('policy') {
            <form [formGroup]="policyForm" (ngSubmit)="savePolicy()" novalidate class="grid gap-3 md:grid-cols-3" aria-label="Stock policy">
              <ui-form-field #p1="uiFormField" label="Low-stock threshold" [error]="err('threshold')" hint="Leave empty to use the default.">
                <input uiInput inputmode="numeric" [id]="p1.id" formControlName="threshold" [attr.aria-describedby]="p1.describedBy()" [attr.aria-invalid]="err('threshold') ? 'true' : null" />
              </ui-form-field>
              <div class="flex items-end"><label class="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" class="size-5 accent-primary" formControlName="backorder" /> Allow buying at zero stock (backorder)</label></div>
              <ui-form-field #p2="uiFormField" label="Expected date" [error]="err('expectedDate')" hint="Shown to shoppers for backordered items.">
                <input uiInput type="date" [id]="p2.id" formControlName="expectedDate" [attr.aria-describedby]="p2.describedBy()" />
              </ui-form-field>
              <div class="md:col-span-3"><button uiButton type="submit" [loading]="saving()">Save policy</button></div>
            </form>
          }
        }
      </section>
    }

    @if (resource.hasValue()) {
      @let data = resource.value();
      @if (data.items.length === 0) {
        <ui-empty-state title="Nothing matches" description="Try a different search or filter." />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[46rem] text-left text-sm">
            <caption class="sr-only">Stock by variant</caption>
            <thead class="bg-surface-alt">
              <tr>
                <th scope="col" class="p-2">Product</th>
                <th scope="col" class="p-2 text-right">On hand</th>
                <th scope="col" class="p-2 text-right">Reserved</th>
                <th scope="col" class="p-2 text-right">Available</th>
                <th scope="col" class="p-2">Status</th>
                <th scope="col" class="p-2"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (r of data.items; track r.variantId) {
                <tr>
                  <th scope="row" class="p-2 font-normal">
                    <span class="block max-w-xs truncate font-medium" [attr.title]="r.title">{{ r.title }}</span>
                    <span class="text-xs text-text-muted">{{ r.sku }}@if (optionsText(r)) { · {{ optionsText(r) }} }</span>
                  </th>
                  <td class="p-2 text-right">
                    {{ r.onHand }}
                    <span class="block text-xs text-text-muted">{{ locationSummary(r) }}</span>
                  </td>
                  <td class="p-2 text-right">{{ r.reserved }}</td>
                  <td class="p-2 text-right font-medium" [class.text-danger]="r.available <= 0">{{ r.available }}</td>
                  <td class="p-2">
                    @if (r.available <= 0 && !r.backorder) {
                      <ui-badge tone="danger">Out of stock</ui-badge>
                    } @else if (r.low) {
                      <ui-badge tone="warning">Low (≤ {{ r.threshold }})</ui-badge>
                    } @else {
                      <ui-badge tone="success">OK</ui-badge>
                    }
                    @if (r.backorder) {
                      <ui-badge tone="neutral">Backorder{{ r.expectedDate ? ' ' + (r.expectedDate | date: 'd MMM') : '' }}</ui-badge>
                    }
                  </td>
                  <td class="p-2 text-right"><button type="button" class="min-h-11 px-2 font-medium text-primary hover:underline" (click)="open(r)">Manage<span class="sr-only"> {{ r.title }} {{ r.sku }}</span></button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-sm text-text-muted" aria-live="polite">{{ data.total }} variants</p>
        <ui-pagination class="mt-4" [page]="data.page" [pageSize]="data.pageSize" [total]="data.total" />
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class StockPageComponent {
  private readonly api = inject(AdminInventoryApi);
  private readonly toast = inject(ToastService);
  protected readonly list = injectListParams();

  protected readonly filters: { value: InventoryFilter; label: string }[] = [
    { value: 'all', label: 'All variants' },
    { value: 'low', label: 'Low stock' },
    { value: 'out', label: 'Out of stock' },
    { value: 'backorder', label: 'Backorder enabled' },
  ];
  protected readonly modes: { value: Mode; label: string }[] = [
    { value: 'adjust', label: 'Adjust stock' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'policy', label: 'Threshold and backorder' },
  ];
  protected readonly kinds: AdjustKind[] = ['receive', 'return', 'damage', 'correction'];
  protected readonly kindLabel = KIND_LABEL;

  protected readonly q = computed(() => this.list.str('q'));
  protected readonly filter = computed(() => (this.list.str('filter') as InventoryFilter | undefined) ?? 'all');
  protected readonly draft = signal('');
  private readonly query = computed<InventoryQuery>(() => ({ q: this.q(), filter: this.filter(), page: this.list.num('page', 1), pageSize: PAGE_SIZE }));

  protected readonly resource = rxResource({ params: () => this.query(), stream: ({ params }) => this.api.overview(params) });
  protected readonly alerts = rxResource({ stream: () => this.api.alerts() });
  private readonly locationResource = rxResource({ stream: () => this.api.locations() });
  protected readonly locations = computed(() => (this.locationResource.hasValue() ? this.locationResource.value() : []));

  protected readonly selected = signal<InventoryRow | null>(null);
  protected readonly mode = signal<Mode>('adjust');
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  private readonly serverErrors = signal<Record<string, string>>({});

  protected readonly adjustForm = new FormGroup({
    locationId: new FormControl('loc-main', { nonNullable: true }),
    kind: new FormControl<AdjustKind>('receive', { nonNullable: true }),
    quantity: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    reason: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    note: new FormControl('', { nonNullable: true }),
  });
  protected readonly transferForm = new FormGroup({
    fromLocationId: new FormControl('loc-main', { nonNullable: true }),
    toLocationId: new FormControl('loc-blr', { nonNullable: true }),
    quantity: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly policyForm = new FormGroup({
    threshold: new FormControl('', { nonNullable: true }),
    backorder: new FormControl(false, { nonNullable: true }),
    expectedDate: new FormControl('', { nonNullable: true }),
  });

  protected readonly adjustKind = toSignal(this.adjustForm.controls.kind.valueChanges, { initialValue: this.adjustForm.controls.kind.value });
  protected readonly reasons = computed(() => STOCK_REASONS.filter((r) => r.kinds.includes(this.adjustKind())));

  constructor() {
    inject(SeoService).set({ title: 'Stock', noindex: true });
    effect(() => {
      this.q();
      untracked(() => this.draft.set(this.q() ?? ''));
    });
    // A reason that no longer fits the chosen kind must be picked again.
    effect(() => {
      const kind = this.adjustKind();
      untracked(() => {
        const reason = this.adjustForm.controls.reason;
        if (reason.value && !STOCK_REASONS.find((r) => r.code === reason.value)?.kinds.includes(kind)) reason.setValue('');
      });
    });
  }

  protected optionsText(r: InventoryRow): string {
    return Object.values(r.options).join(' / ');
  }

  protected locationSummary(r: InventoryRow): string {
    return this.locations()
      .map((l) => `${l.name.split(' ')[0]} ${r.byLocation[l.id] ?? 0}`)
      .join(' · ');
  }

  protected search(event: Event): void {
    event.preventDefault();
    this.list.patch({ q: this.draft().trim() || null });
  }

  protected err(name: string): string {
    const server = this.serverErrors()[name];
    if (server) return server;
    return '';
  }

  protected open(row: InventoryRow): void {
    this.selected.set(row);
    this.formError.set('');
    this.serverErrors.set({});
    this.adjustForm.reset({ locationId: 'loc-main', kind: 'receive', quantity: '', reason: '', note: '' });
    this.transferForm.reset({ fromLocationId: 'loc-main', toLocationId: 'loc-blr', quantity: '' });
    this.policyForm.reset({ threshold: row.customThreshold ? String(row.threshold) : '', backorder: row.backorder, expectedDate: row.expectedDate?.slice(0, 10) ?? '' });
    this.mode.set('adjust');
  }

  protected close(): void {
    this.selected.set(null);
  }

  protected setMode(mode: Mode): void {
    this.mode.set(mode);
    this.formError.set('');
    this.serverErrors.set({});
  }

  private async run(action: () => Promise<unknown>, success: string): Promise<void> {
    const row = this.selected();
    if (!row) return;
    this.formError.set('');
    this.serverErrors.set({});
    this.saving.set(true);
    try {
      await action();
      this.toast.success(success);
      this.resource.reload();
      this.alerts.reload();
      this.selected.set(null);
    } catch (e) {
      if (e instanceof ApiException) {
        this.formError.set(e.message);
        this.serverErrors.set(e.fields ?? {});
      } else {
        this.formError.set('The change could not be saved.');
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected async saveAdjust(): Promise<void> {
    const row = this.selected();
    if (!row) return;
    const f = this.adjustForm.getRawValue();
    const quantity = f.quantity.trim() === '' ? Number.NaN : Number(f.quantity);
    await this.run(() => firstValueFrom(this.api.adjust({ variantId: row.variantId, locationId: f.locationId, kind: f.kind, quantity, reason: f.reason, ...(f.note.trim() ? { note: f.note.trim() } : {}) })), 'Stock change recorded');
  }

  protected async saveTransfer(): Promise<void> {
    const row = this.selected();
    if (!row) return;
    const f = this.transferForm.getRawValue();
    const quantity = f.quantity.trim() === '' ? Number.NaN : Number(f.quantity);
    await this.run(() => firstValueFrom(this.api.transfer({ variantId: row.variantId, fromLocationId: f.fromLocationId, toLocationId: f.toLocationId, quantity })), 'Stock moved');
  }

  protected async savePolicy(): Promise<void> {
    const row = this.selected();
    if (!row) return;
    const f = this.policyForm.getRawValue();
    const threshold = f.threshold.trim() === '' ? undefined : Number(f.threshold);
    await this.run(() => firstValueFrom(this.api.setPolicy(row.variantId, { backorder: f.backorder, ...(threshold !== undefined ? { threshold } : {}), ...(f.expectedDate ? { expectedDate: f.expectedDate } : {}) })), 'Policy saved');
  }
}
