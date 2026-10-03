import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MoneyPipe, formatMoney } from '@ecom/shared/util';
import { LocaleDatePipe } from '@ecom/shared/core';

interface Day {
  date: string;
  revenue: number;
  orders: number;
}

const W = 640;
const H = 200;
const PAD = { top: 12, right: 8, bottom: 22, left: 8 };

/** Revenue-per-day bar chart with a text summary and a table alternative for screen readers and keyboard users. */
@Component({
  selector: 'adm-revenue-chart',
  imports: [LocaleDatePipe, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" class="w-full" role="img" [attr.aria-label]="summary()">
      <line [attr.x1]="pad.left" [attr.x2]="w - pad.right" [attr.y1]="baseline" [attr.y2]="baseline" class="stroke-border-strong" stroke-width="1" />
      @for (bar of bars(); track bar.date) {
        <rect [attr.x]="bar.x" [attr.y]="bar.y" [attr.width]="bar.width" [attr.height]="bar.height" rx="2" class="fill-primary"><title>{{ bar.label }}</title></rect>
      }
      <text [attr.x]="pad.left" [attr.y]="h - 6" class="fill-text-muted text-[11px]">{{ first() | date: 'd MMM' }}</text>
      <text [attr.x]="w - pad.right" [attr.y]="h - 6" text-anchor="end" class="fill-text-muted text-[11px]">{{ last() | date: 'd MMM' }}</text>
      <text [attr.x]="w - pad.right" [attr.y]="pad.top + 8" text-anchor="end" class="fill-text-muted text-[11px]">Peak {{ peakLabel() }}</text>
    </svg>
    <details class="mt-2 text-sm">
      <summary class="min-h-11 cursor-pointer py-2 font-medium text-primary">View as table</summary>
      <div class="max-h-64 overflow-auto">
        <table class="w-full text-start">
          <caption class="sr-only">Revenue and orders per day</caption>
          <thead><tr class="border-b border-border"><th scope="col" class="py-1">Date</th><th scope="col" class="py-1 text-end">Orders</th><th scope="col" class="py-1 text-end">Revenue</th></tr></thead>
          <tbody>
            @for (d of data(); track d.date) {
              <tr class="border-b border-border"><th scope="row" class="py-1 font-normal">{{ d.date | date: 'd MMM y' }}</th><td class="py-1 text-end">{{ d.orders }}</td><td class="py-1 text-end">{{ { amount: d.revenue, currency: 'INR' } | money }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </details>
  `,
})
export class RevenueChartComponent {
  readonly data = input.required<Day[]>();

  protected readonly w = W;
  protected readonly h = H;
  protected readonly pad = PAD;
  protected readonly baseline = H - PAD.bottom;

  protected readonly first = computed(() => this.data()[0]?.date);
  protected readonly last = computed(() => this.data()[this.data().length - 1]?.date);
  private readonly peak = computed(() => Math.max(0, ...this.data().map((d) => d.revenue)));
  protected readonly peakLabel = computed(() => formatMoney({ amount: this.peak(), currency: 'INR' }));

  protected readonly bars = computed(() => {
    const days = this.data();
    const inner = W - PAD.left - PAD.right;
    const slot = inner / Math.max(1, days.length);
    const width = Math.max(2, slot * 0.7);
    const max = this.peak() || 1;
    const usable = H - PAD.top - PAD.bottom;
    return days.map((d, i) => {
      const height = (d.revenue / max) * usable;
      return { date: d.date, x: PAD.left + i * slot + (slot - width) / 2, y: H - PAD.bottom - height, width, height, label: `${d.date}: ${formatMoney({ amount: d.revenue, currency: 'INR' })}, ${d.orders} orders` };
    });
  });

  protected readonly summary = computed(() => {
    const days = this.data();
    const total = days.reduce((s, d) => s + d.revenue, 0);
    const best = days.reduce((a, b) => (b.revenue > a.revenue ? b : a), days[0] ?? { date: '', revenue: 0, orders: 0 });
    return `Bar chart of revenue per day over ${days.length} days. Total ${formatMoney({ amount: total, currency: 'INR' })}. Best day ${best.date} with ${formatMoney({ amount: best.revenue, currency: 'INR' })}.`;
  });
}
