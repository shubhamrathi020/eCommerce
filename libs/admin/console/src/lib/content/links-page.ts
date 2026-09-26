import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AdminContentApi } from '@ecom/shared/data-access';
import type { LinkGroup, NavLink } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { ButtonComponent, SkeletonComponent } from '@ecom/shared/ui';

type Row = Omit<NavLink, 'id' | 'order'>;
const GROUPS: { key: LinkGroup; title: string }[] = [
  { key: 'about', title: 'Company links' },
  { key: 'help', title: 'Help links' },
  { key: 'legal', title: 'Legal links' },
];

@Component({
  selector: 'adm-links',
  imports: [FormsModule, ButtonComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="mb-1 text-xl font-semibold">Footer links</h2>
    <p class="mb-4 text-sm text-text-muted">Links shown in the shop footer. Use an internal path such as /pages/faq or an https:// address.</p>
    @if (loaded()) {
      @if (formError()) {
        <p class="mb-3 rounded-md border border-danger p-3 text-sm" role="alert">{{ formError() }}</p>
      }
      <div class="grid gap-6 md:grid-cols-3">
        @for (g of groups; track g.key) {
          <section [attr.aria-labelledby]="'g-' + g.key">
            <h3 [id]="'g-' + g.key" class="mb-2 font-semibold">{{ g.title }}</h3>
            <ul class="space-y-3">
              @for (row of rows(); track $index; let i = $index) {
                @if (row.group === g.key) {
                  <li class="space-y-1 rounded-lg border border-border p-2">
                    <label class="sr-only" [attr.for]="'l-' + i">Label</label>
                    <input [id]="'l-' + i" class="block min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm" placeholder="Label" [ngModel]="row.label" (ngModelChange)="patch(i, { label: $event })" maxlength="40" />
                    <label class="sr-only" [attr.for]="'h-' + i">Address</label>
                    <input [id]="'h-' + i" class="block min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm" placeholder="/pages/example" [ngModel]="row.href" (ngModelChange)="patch(i, { href: $event })" />
                    @if (errors()['links.' + i + '.label'] || errors()['links.' + i + '.href']) {
                      <p class="text-sm text-danger" role="alert">{{ errors()['links.' + i + '.label'] || errors()['links.' + i + '.href'] }}</p>
                    }
                    <div class="flex gap-1">
                      <button type="button" class="min-h-11 min-w-11 rounded-md border border-border-strong text-sm" (click)="move(i, -1)" [attr.aria-label]="'Move ' + (row.label || 'link') + ' up'">↑</button>
                      <button type="button" class="min-h-11 min-w-11 rounded-md border border-border-strong text-sm" (click)="move(i, 1)" [attr.aria-label]="'Move ' + (row.label || 'link') + ' down'">↓</button>
                      <button type="button" class="min-h-11 px-2 text-sm font-medium text-danger hover:underline" (click)="removeAt(i)">Remove<span class="sr-only"> {{ row.label }}</span></button>
                    </div>
                  </li>
                }
              }
            </ul>
            <button uiButton size="sm" variant="secondary" type="button" class="mt-2" (click)="add(g.key)">Add link</button>
          </section>
        }
      </div>
      <button uiButton type="button" class="mt-6" [loading]="busy()" (click)="save()">Save links</button>
    } @else {
      <ui-skeleton class="h-32" />
    }
  `,
})
export class LinksPageComponent {
  private readonly api = inject(AdminContentApi);
  private readonly toast = inject(ToastService);
  private readonly resource = rxResource({ stream: () => this.api.links() });

  protected readonly groups = GROUPS;
  protected readonly rows = signal<Row[]>([]);
  protected readonly loaded = signal(false);
  protected readonly busy = signal(false);
  protected readonly formError = signal('');
  protected readonly errors = signal<Record<string, string>>({});

  constructor() {
    inject(SeoService).set({ title: 'Footer links', noindex: true });
    effect(() => {
      if (this.resource.hasValue()) {
        const links = this.resource.value();
        untracked(() => {
          this.rows.set(links.map(({ label, href, group }) => ({ label, href, group })));
          this.loaded.set(true);
        });
      }
    });
  }

  protected patch(index: number, changes: Partial<Row>): void {
    this.rows.update((r) => r.map((row, i) => (i === index ? { ...row, ...changes } : row)));
  }

  protected add(group: LinkGroup): void {
    this.rows.update((r) => [...r, { label: '', href: '/', group }]);
  }

  protected removeAt(index: number): void {
    this.rows.update((r) => r.filter((_, i) => i !== index));
  }

  /** Swaps with the neighbouring link of the same group. */
  protected move(index: number, delta: number): void {
    this.rows.update((r) => {
      const group = r[index].group;
      let j = index + delta;
      while (j >= 0 && j < r.length && r[j].group !== group) j += delta;
      if (j < 0 || j >= r.length) return r;
      const next = [...r];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  protected async save(): Promise<void> {
    this.formError.set('');
    this.errors.set({});
    this.busy.set(true);
    try {
      const saved = await firstValueFrom(this.api.saveLinks(this.rows()));
      this.rows.set(saved.map(({ label, href, group }) => ({ label, href, group })));
      this.toast.success('Footer links saved');
    } catch (e) {
      if (e instanceof ApiException) {
        this.formError.set(e.message);
        this.errors.set(e.fields ?? {});
      } else {
        this.toast.error('Could not save.');
      }
    } finally {
      this.busy.set(false);
    }
  }
}
