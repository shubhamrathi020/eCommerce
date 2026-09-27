import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AnalyticsService, AppReadyService, RecentSearchesStore } from '@ecom/shared/core';
import { SearchApi } from '@ecom/shared/data-access';
import { IconComponent } from '@ecom/shared/ui';
import { MoneyPipe } from '@ecom/shared/util';

type OptionKind = 'recent' | 'query' | 'product' | 'category' | 'brand';

interface SearchOption {
  id: string;
  kind: OptionKind;
  label: string;
  sub?: string;
  /** Router commands for navigation options; queries run a search instead. */
  link?: unknown[];
  image?: { url: string; width: number; height: number };
  price?: { amount: number; currency: 'INR' };
}

const DEBOUNCE_MS = 150;
const GROUP_TITLES: Record<OptionKind, string> = { recent: 'Recent searches', query: 'Suggestions', product: 'Products', category: 'Categories', brand: 'Brands' };

/** Search field with autocomplete (ARIA combobox). Arrow keys move, Enter selects, Escape closes. */
@Component({
  selector: 'app-search-box',
  imports: [NgOptimizedImage, IconComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block', '(document:click)': 'onDocumentClick($event)' },
  template: `
    <form role="search" class="flex" (submit)="submit($event)">
      <label [attr.for]="idPrefix() + '-input'" class="sr-only">Search products</label>
      <input
        [id]="idPrefix() + '-input'"
        type="search"
        name="q"
        role="combobox"
        autocomplete="off"
        maxlength="100"
        [placeholder]="placeholder()"
        class="min-h-11 w-full rounded-l-md border border-r-0 border-border-strong bg-surface px-3 text-base"
        aria-autocomplete="list"
        [attr.aria-expanded]="open() && options().length > 0"
        [attr.aria-controls]="idPrefix() + '-list'"
        [attr.aria-activedescendant]="active() >= 0 ? idPrefix() + '-opt-' + active() : null"
        [value]="query()"
        (input)="onInput($any($event.target).value)"
        (focus)="open.set(true)"
        (keydown)="onKeydown($event)"
      />
      <button type="submit" [disabled]="!appReady.ready()" class="inline-flex min-h-11 items-center justify-center rounded-r-md bg-primary px-4 text-primary-contrast hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50" aria-label="Search"><ui-icon name="search" /></button>
    </form>

    <p class="sr-only" role="status" aria-live="polite">{{ open() && options().length ? options().length + ' suggestions available' : '' }}</p>

    @if (open() && options().length > 0) {
      <ul [id]="idPrefix() + '-list'" role="listbox" [attr.aria-label]="'Search suggestions'" class="absolute left-0 right-0 top-full z-30 mt-1 max-h-[70vh] overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-popover">
        @for (option of options(); track option.id; let i = $index) {
          @if (i === 0 || options()[i - 1].kind !== option.kind) {
            <li role="presentation" class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{{ groupTitle(option.kind) }}</li>
          }
          <li
            role="option"
            tabindex="-1"
            [id]="idPrefix() + '-opt-' + i"
            [attr.aria-selected]="active() === i"
            class="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-1.5"
            [class]="active() === i ? 'bg-surface-alt' : ''"
            (mousedown)="$event.preventDefault(); choose(option)"
            (mouseenter)="active.set(i)"
          >
            @if (option.image) {
              <img [ngSrc]="option.image.url" [width]="option.image.width" [height]="option.image.height" alt="" class="size-10 shrink-0 rounded object-cover" />
            } @else {
              <ui-icon [name]="option.kind === 'recent' ? 'chevron-right' : 'search'" [size]="16" class="text-text-muted" />
            }
            <span class="min-w-0 flex-1">
              <span class="block truncate">{{ option.label }}</span>
              @if (option.sub) {
                <span class="block truncate text-xs text-text-muted">{{ option.sub }}</span>
              }
            </span>
            @if (option.price) {
              <span class="text-sm font-medium">{{ option.price | money }}</span>
            }
          </li>
        }
      </ul>
    }
  `,
})
export class SearchBoxComponent {
  /** Unique per instance (ids must not clash when the box appears twice). */
  readonly idPrefix = input.required<string>();
  readonly placeholder = input('Search for products, brands and more');

  private readonly router = inject(Router);
  private readonly api = inject(SearchApi);
  private readonly recent = inject(RecentSearchesStore);
  private readonly analytics = inject(AnalyticsService);
  protected readonly appReady = inject(AppReadyService);

  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly active = signal(-1);
  private readonly debounced = signal('');
  private timer: ReturnType<typeof setTimeout> | undefined;

  private readonly suggestions = rxResource({ params: () => this.debounced().trim(), stream: ({ params }) => this.api.suggest(params) });

  protected readonly options = computed<SearchOption[]>(() => {
    const out: SearchOption[] = [];
    const q = this.query().trim();
    if (!q) {
      for (const term of this.recent.ids()) out.push({ id: `recent-${term}`, kind: 'recent', label: term });
    }
    const s = this.suggestions.hasValue() ? this.suggestions.value() : undefined;
    // Ignore a stale answer that belongs to an older query.
    if (!s || this.debounced().trim() !== q) return out;
    for (const term of s.queries) if (!out.some((o) => o.label.toLowerCase() === term.toLowerCase())) out.push({ id: `q-${term}`, kind: 'query', label: term });
    for (const p of s.products) out.push({ id: `p-${p.id}`, kind: 'product', label: p.title, sub: p.brandName, link: ['/p', p.slug], image: p.image, price: p.priceMin });
    for (const c of s.categories) out.push({ id: `c-${c.slug}`, kind: 'category', label: c.name, sub: 'Category', link: ['/c', c.slug] });
    for (const b of s.brands) out.push({ id: `b-${b.slug}`, kind: 'brand', label: b.name, sub: 'Brand', link: ['/b', b.slug] });
    return out;
  });

  protected groupTitle(kind: OptionKind): string {
    return GROUP_TITLES[kind];
  }

  protected onInput(value: string): void {
    this.query.set(value);
    this.open.set(true);
    this.active.set(-1);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.debounced.set(value), DEBOUNCE_MS);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.options().length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      this.open.set(true);
      this.active.set((this.active() + 1) % count);
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      this.active.set(this.active() <= 0 ? count - 1 : this.active() - 1);
    } else if (event.key === 'Enter' && this.active() >= 0) {
      event.preventDefault();
      this.choose(this.options()[this.active()]);
    } else if (event.key === 'Escape') {
      this.open.set(false);
      this.active.set(-1);
    } else if (event.key === 'Tab') {
      this.open.set(false);
    }
  }

  protected onDocumentClick(event: Event): void {
    if (!(event.target as HTMLElement).closest('app-search-box')) this.open.set(false);
    else if (!(event.target as HTMLElement).closest(`#${this.idPrefix()}-input, #${this.idPrefix()}-list, form`)) this.open.set(false);
  }

  protected choose(option: SearchOption): void {
    this.analytics.track({ name: 'search_suggestion_selected', props: { kind: option.kind } });
    if (option.link) {
      this.close();
      void this.router.navigate(option.link);
      return;
    }
    this.run(option.label);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.active() >= 0) return;
    this.run(this.query());
  }

  private run(term: string): void {
    const q = term.trim().slice(0, 100);
    if (!q) return;
    this.recent.add(q);
    this.query.set(q);
    this.close();
    void this.router.navigate(['/search'], { queryParams: { q } });
  }

  private close(): void {
    this.open.set(false);
    this.active.set(-1);
  }
}
