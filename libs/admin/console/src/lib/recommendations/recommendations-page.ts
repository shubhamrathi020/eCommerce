import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AdminRecommendationApi } from '@ecom/shared/data-access';
import { ApiException, REC_STRATEGY_LABEL, type RecConfig, type RecPreview, type RecStrategy } from '@ecom/shared/models';
import { ButtonComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';

const STRATEGIES = Object.keys(REC_STRATEGY_LABEL) as RecStrategy[];
const ids = (text: string) => text.split(/[\s,]+/).filter(Boolean);

/** Recommendation controls (RC-05): switch strategies off, pin, exclude or boost products, and preview the result. Changes apply on the next page load, with no deploy. */
@Component({
  selector: 'adm-recommendations',
  imports: [ButtonComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-1 text-2xl font-bold">Recommendations</h1>
    <p class="mb-4 max-w-2xl text-sm text-text-muted">Every row is built from simple rules over anonymous activity (views, carts, purchases), so each product can say why it was chosen. Use these controls to steer them.</p>

    @if (stats.hasValue()) {
      <dl class="mb-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Event data">
        <div class="rounded-lg border border-border p-3"><dt class="text-xs text-text-muted">Events</dt><dd class="text-lg font-semibold">{{ stats.value().events }}</dd></div>
        <div class="rounded-lg border border-border p-3"><dt class="text-xs text-text-muted">Last 7 days</dt><dd class="text-lg font-semibold">{{ stats.value().last7Days }}</dd></div>
        <div class="rounded-lg border border-border p-3"><dt class="text-xs text-text-muted">Anonymous visitors</dt><dd class="text-lg font-semibold">{{ stats.value().visitors }}</dd></div>
        <div class="rounded-lg border border-border p-3"><dt class="text-xs text-text-muted">Purchases</dt><dd class="text-lg font-semibold">{{ stats.value().byName['purchase'] ?? 0 }}</dd></div>
      </dl>
    }

    @if (loaded()) {
      <form class="max-w-2xl space-y-5" (submit)="save($event)" novalidate>
        <fieldset>
          <legend class="mb-1 text-sm font-medium">Strategies</legend>
          <ul>
            @for (s of strategies; track s) {
              <li>
                <label class="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" class="size-5 accent-primary" [checked]="enabled()[s]" (change)="toggle(s, $any($event.target).checked)" />
                  {{ labels[s] }}
                </label>
              </li>
            }
          </ul>
        </fieldset>
        <ui-form-field #p="uiFormField" label="Pinned product ids" hint="Shown first wherever they fit. One per line or comma separated." [error]="errors()['pinned'] ?? ''">
          <textarea uiInput rows="2" [id]="p.id" [value]="pinned()" [attr.aria-describedby]="p.describedBy()" [attr.aria-invalid]="errors()['pinned'] ? 'true' : null" (input)="pinned.set($any($event.target).value)"></textarea>
        </ui-form-field>
        <ui-form-field #x="uiFormField" label="Excluded product ids" hint="Never recommended." [error]="errors()['excluded'] ?? ''">
          <textarea uiInput rows="2" [id]="x.id" [value]="excluded()" [attr.aria-describedby]="x.describedBy()" [attr.aria-invalid]="errors()['excluded'] ? 'true' : null" (input)="excluded.set($any($event.target).value)"></textarea>
        </ui-form-field>
        <ui-form-field #b="uiFormField" label="Boosts" hint="One per line: product id, then a multiplier from 0.1 to 10. Example: p-0003 2" [error]="errors()['boosts'] ?? ''">
          <textarea uiInput rows="3" [id]="b.id" [value]="boosts()" [attr.aria-describedby]="b.describedBy()" [attr.aria-invalid]="errors()['boosts'] ? 'true' : null" (input)="boosts.set($any($event.target).value)"></textarea>
        </ui-form-field>
        <ui-form-field #m="uiFormField" label="Orders needed to count as “bought together”" [error]="errors()['minTogether'] ?? ''">
          <input uiInput inputmode="numeric" [id]="m.id" [value]="minTogether()" [attr.aria-describedby]="m.describedBy()" [attr.aria-invalid]="errors()['minTogether'] ? 'true' : null" (input)="minTogether.set($any($event.target).value)" />
        </ui-form-field>
        @if (formError()) {
          <p class="text-sm text-danger" role="alert">{{ formError() }}</p>
        }
        <button uiButton type="submit" [loading]="saving()">Save rules</button>
      </form>
    } @else {
      <ui-skeleton class="h-64 max-w-2xl" />
    }

    <section class="mt-10 max-w-3xl" aria-labelledby="preview-h">
      <h2 id="preview-h" class="mb-2 text-lg font-semibold">Preview</h2>
      <form class="mb-4 flex flex-wrap items-end gap-2" (submit)="runPreview($event)">
        <ui-form-field #pi="uiFormField" label="Product id" hint="Empty previews the home page for a brand-new visitor"><input uiInput [id]="pi.id" [attr.aria-describedby]="pi.describedBy()" (input)="previewId.set($any($event.target).value)" /></ui-form-field>
        <button uiButton variant="secondary" type="submit" [loading]="previewing()">Preview rows</button>
      </form>
      @if (preview(); as pv) {
        @if (pv.rows.length === 0) {
          <p class="text-sm text-text-muted" role="status">No rows: the data is too thin, or every strategy for this view is off.</p>
        }
        @for (row of pv.rows; track row.strategy) {
          <section class="mb-4 rounded-lg border border-border p-3" [attr.aria-label]="row.title">
            <h3 class="font-semibold">{{ row.title }}@if (row.coldStart) { <span class="ms-2 text-xs font-normal text-text-muted">(cold start)</span> }</h3>
            <p class="mb-2 text-sm text-text-muted">{{ row.subtitle }}</p>
            <ol class="list-decimal space-y-0.5 ps-5 text-sm">
              @for (item of row.items; track item.product.id) {
                <li>{{ item.product.title }} <span class="text-xs text-text-muted">({{ item.product.id }}) · {{ item.reason }}</span></li>
              }
            </ol>
          </section>
        }
      }
    </section>
  `,
})
export class RecommendationsPageComponent {
  private readonly api = inject(AdminRecommendationApi);
  private readonly toast = inject(ToastService);

  protected readonly strategies = STRATEGIES;
  protected readonly labels = REC_STRATEGY_LABEL;
  private readonly config = rxResource({ stream: () => this.api.config() });
  protected readonly stats = rxResource({ stream: () => this.api.stats() });
  protected readonly loaded = computed(() => this.config.hasValue());

  protected readonly enabled = signal<Record<RecStrategy, boolean>>({ similar: true, bought_together: true, trending: true, best_sellers: true, personalised: true });
  protected readonly pinned = signal('');
  protected readonly excluded = signal('');
  protected readonly boosts = signal('');
  protected readonly minTogether = signal('2');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly formError = signal('');
  protected readonly saving = signal(false);

  protected readonly previewId = signal('');
  protected readonly preview = signal<RecPreview | null>(null);
  protected readonly previewing = signal(false);

  constructor() {
    inject(SeoService).set({ title: 'Recommendations', noindex: true });
    effect(() => {
      if (!this.config.hasValue()) return;
      const c: RecConfig = this.config.value();
      untracked(() => {
        this.enabled.set({ ...c.strategies });
        this.pinned.set(c.pinned.join('\n'));
        this.excluded.set(c.excluded.join('\n'));
        this.boosts.set(Object.entries(c.boosts).map(([id, f]) => `${id} ${f}`).join('\n'));
        this.minTogether.set(String(c.minTogether));
      });
    });
  }

  protected toggle(s: RecStrategy, on: boolean): void {
    this.enabled.update((e) => ({ ...e, [s]: on }));
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.errors.set({});
    this.formError.set('');
    const boosts: Record<string, number> = {};
    for (const line of this.boosts().split('\n').map((l) => l.trim()).filter(Boolean)) {
      const [id, factor] = line.split(/[\s,]+/);
      boosts[id] = Number(factor);
    }
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.saveConfig({ strategies: this.enabled(), pinned: ids(this.pinned()), excluded: ids(this.excluded()), boosts, minTogether: Number(this.minTogether()) }));
      this.toast.success('Recommendation rules saved. They apply to the next page load.');
    } catch (e) {
      if (e instanceof ApiException) {
        this.errors.set(e.fields ?? {});
        this.formError.set(e.fields ? 'Please check the highlighted fields.' : e.message);
      } else this.formError.set('Could not save the rules.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async runPreview(event: Event): Promise<void> {
    event.preventDefault();
    this.previewing.set(true);
    try {
      this.preview.set(await firstValueFrom(this.api.preview(this.previewId().trim() || undefined)));
    } finally {
      this.previewing.set(false);
    }
  }
}
