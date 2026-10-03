import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AdminContentApi } from '@ecom/shared/data-access';
import type { HomeSection } from '@ecom/contracts';
import { ApiException } from '@ecom/contracts';
import { ButtonComponent, SkeletonComponent } from '@ecom/shared/ui';

const DESCRIPTION: Record<string, string> = {
  categories: 'Tiles for each top-level category',
  deals: "Deals with today's countdown",
  featured: 'Popular in-stock products',
  new: 'Newest products',
  best: 'Best-rated products',
  brands: 'Brand links',
  recent: 'What this shopper viewed recently',
};

@Component({
  selector: 'adm-sections',
  imports: [FormsModule, ButtonComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="mb-1 text-xl font-semibold">Home sections</h2>
    <p class="mb-4 text-sm text-text-muted">Choose what appears on the home page and in which order. The banner carousel is managed under Banners.</p>
    @if (draft().length) {
      @if (formError()) {
        <p class="mb-3 rounded-md border border-danger p-3 text-sm" role="alert">{{ formError() }}</p>
      }
      <ol class="mb-4 space-y-2" aria-label="Sections in display order">
        @for (s of draft(); track s.key; let i = $index; let last = $last) {
          <li class="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
            <label class="flex min-h-11 items-center gap-2"><input type="checkbox" class="size-5 accent-primary" [checked]="s.enabled" (change)="patch(i, { enabled: !s.enabled })" /><span class="sr-only">Show {{ s.title }}</span></label>
            <div class="min-w-0 flex-1">
              <label [attr.for]="'title-' + s.key" class="sr-only">Title for {{ s.key }}</label>
              <input [id]="'title-' + s.key" class="block min-h-11 w-full rounded-md border border-border-strong bg-surface px-3" [ngModel]="s.title" (ngModelChange)="patch(i, { title: $event })" maxlength="40" />
              <p class="mt-1 text-xs text-text-muted">{{ description(s.key) }}</p>
              @if (serverErrors()['sections.' + i + '.title']) {
                <p class="text-sm text-danger" role="alert">{{ serverErrors()['sections.' + i + '.title'] }}</p>
              }
            </div>
            <div class="flex gap-1">
              <button type="button" class="min-h-11 min-w-11 rounded-md border border-border-strong hover:bg-surface-alt disabled:opacity-40" [disabled]="i === 0" (click)="move(i, -1)" [attr.aria-label]="'Move ' + s.title + ' up'">↑</button>
              <button type="button" class="min-h-11 min-w-11 rounded-md border border-border-strong hover:bg-surface-alt disabled:opacity-40" [disabled]="last" (click)="move(i, 1)" [attr.aria-label]="'Move ' + s.title + ' down'">↓</button>
            </div>
          </li>
        }
      </ol>
      <button uiButton type="button" [loading]="busy()" (click)="save()">Save sections</button>
    } @else {
      <ui-skeleton class="h-32" />
    }
  `,
})
export class SectionsPageComponent {
  private readonly api = inject(AdminContentApi);
  private readonly toast = inject(ToastService);
  private readonly resource = rxResource({ stream: () => this.api.sections() });

  protected readonly draft = signal<HomeSection[]>([]);
  protected readonly busy = signal(false);
  protected readonly formError = signal('');
  protected readonly serverErrors = signal<Record<string, string>>({});

  constructor() {
    inject(SeoService).set({ title: 'Home sections', noindex: true });
    effect(() => {
      if (this.resource.hasValue()) {
        const value = this.resource.value();
        untracked(() => this.draft.set(value));
      }
    });
  }

  protected description(key: string): string {
    return DESCRIPTION[key] ?? '';
  }

  protected patch(index: number, changes: Partial<HomeSection>): void {
    this.draft.update((list) => list.map((s, i) => (i === index ? { ...s, ...changes } : s)));
  }

  protected move(index: number, delta: number): void {
    this.draft.update((list) => {
      const next = [...list];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }

  protected async save(): Promise<void> {
    this.formError.set('');
    this.serverErrors.set({});
    this.busy.set(true);
    try {
      this.draft.set(await firstValueFrom(this.api.saveSections(this.draft())));
      this.toast.success('Home sections saved');
    } catch (e) {
      if (e instanceof ApiException) {
        this.formError.set(e.message);
        this.serverErrors.set(e.fields ?? {});
      } else {
        this.toast.error('Could not save.');
      }
    } finally {
      this.busy.set(false);
    }
  }
}
