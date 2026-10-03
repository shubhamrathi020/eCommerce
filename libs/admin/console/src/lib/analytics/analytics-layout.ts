import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '@ecom/shared/core';
import { AdminAnalyticsApi } from '@ecom/shared/data-access';
import { ApiException, REPORT_DAYS, REPORT_LABEL, type ReportKey } from '@ecom/contracts';
import { ButtonComponent, InputDirective } from '@ecom/shared/ui';
import { injectListParams } from '../list-params';

const TABS = [
  { label: 'Funnel', link: '/analytics/funnel' },
  { label: 'Products', link: '/analytics/products' },
  { label: 'Search', link: '/analytics/search' },
  { label: 'Campaigns', link: '/analytics/campaigns' },
  { label: 'Cohorts', link: '/analytics/cohorts' },
  { label: 'Scheduled reports', link: '/analytics/reports' },
];

/** Sub-navigation and the look-back period shared by the analytics screens. The period lives in the URL so a report can be bookmarked. */
@Component({
  selector: 'adm-analytics-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-3 flex flex-wrap items-end justify-between gap-3 print:hidden">
      <h1 class="text-2xl font-bold">Analytics</h1>
      <div>
        <label for="period" class="mb-1 block text-sm font-medium">Period</label>
        <select id="period" uiInput class="!w-44" (change)="list.patch({ days: $any($event.target).value }, true)">
          @for (d of periods; track d) {
            <option [value]="d" [selected]="days() === d">Last {{ d }} days</option>
          }
        </select>
      </div>
    </div>
    <nav aria-label="Analytics sections" class="mb-6 flex flex-wrap gap-1 border-b border-border print:hidden">
      @for (tab of tabs; track tab.link) {
        <a [routerLink]="tab.link" queryParamsHandling="preserve" routerLinkActive="border-primary text-primary" class="min-h-11 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text">{{ tab.label }}</a>
      }
    </nav>
    <p class="mb-4 text-sm text-text-muted">Aggregates over anonymous activity from shoppers who accepted analytics, plus demo data. There is no view of any individual shopper.</p>
    <router-outlet />
  `,
})
export class AnalyticsLayoutComponent {
  protected readonly list = injectListParams();
  protected readonly tabs = TABS;
  protected readonly periods = REPORT_DAYS;
  protected readonly days = computed(() => this.list.num('days', 30));
}

/** CSV download and print-to-PDF for the report on screen (AN-06). */
@Component({
  selector: 'adm-export-bar',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mb-3 flex flex-wrap gap-2 print:hidden' },
  template: `
    <button uiButton variant="secondary" size="sm" type="button" [loading]="busy()" (click)="download()">Export CSV</button>
    <button uiButton variant="secondary" size="sm" type="button" (click)="print()">Print or save as PDF</button>
  `,
})
export class ExportBarComponent {
  readonly report = input.required<ReportKey>();
  readonly days = input(30);
  private readonly api = inject(AdminAnalyticsApi);
  private readonly toast = inject(ToastService);
  protected readonly busy = signal(false);

  protected async download(): Promise<void> {
    this.busy.set(true);
    try {
      const csv = await firstValueFrom(this.api.exportCsv(this.report(), this.days()));
      if (typeof URL.createObjectURL !== 'function') return;
      const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${REPORT_LABEL[this.report()].toLowerCase().replace(/[^a-z]+/g, '-')}-${this.days()}d.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'Could not export the report.');
    } finally {
      this.busy.set(false);
    }
  }

  protected print(): void {
    window.print();
  }
}
