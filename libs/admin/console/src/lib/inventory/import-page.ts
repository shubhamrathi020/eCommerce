import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AdminInventoryApi } from '@ecom/shared/data-access';
import type { InventoryImportReport } from '@ecom/contracts';
import { ApiException } from '@ecom/contracts';
import { ButtonComponent, InputDirective } from '@ecom/shared/ui';

/** Saves text as a file in the browser (no server round trip). */
function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Spreadsheet round trip: export current levels, edit them, import back with a clear report of skipped rows. */
@Component({
  selector: 'adm-inventory-import',
  imports: [ButtonComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mb-8" aria-labelledby="ex-h">
      <h2 id="ex-h" class="mb-1 text-xl font-semibold">Export</h2>
      <p class="mb-3 text-sm text-text-muted">Download the current stock of every variant and location as a CSV file with the columns sku, product, location and on_hand.</p>
      <button uiButton type="button" variant="secondary" [loading]="exporting()" (click)="exportCsv()">Download stock CSV</button>
    </section>

    <section aria-labelledby="im-h">
      <h2 id="im-h" class="mb-1 text-xl font-semibold">Import</h2>
      <p class="mb-3 text-sm text-text-muted">Set stock levels from a CSV file. Needed columns: sku, location (a location name) and on_hand (units to have there). Bad rows are skipped and listed; all good rows apply together. Each change becomes a correction in the ledger.</p>
      @if (error()) {
        <p class="mb-3 rounded-md border border-danger p-3 text-sm" role="alert">{{ error() }}</p>
      }
      <div class="mb-3">
        <label for="file" class="mb-1 block text-sm font-medium">CSV file</label>
        <input id="file" uiInput type="file" accept=".csv,text/csv" (change)="onFile($event)" />
      </div>
      <div class="mb-3">
        <label for="csv" class="mb-1 block text-sm font-medium">Or paste CSV text</label>
        <textarea id="csv" uiInput rows="6" class="font-mono text-xs" [value]="text()" (input)="text.set($any($event.target).value)" placeholder="sku,location,on_hand"></textarea>
      </div>
      <button uiButton type="button" [loading]="importing()" (click)="runImport()">Import stock levels</button>

      @if (report(); as r) {
        <div class="mt-6 rounded-lg border border-border p-4" role="status" aria-live="polite">
          <p class="font-medium">{{ r.applied }} row(s) applied, {{ r.skipped.length }} skipped.</p>
          @if (r.skipped.length) {
            <div class="mt-3 overflow-x-auto rounded-lg border border-border">
              <table class="w-full min-w-[28rem] text-start text-sm">
                <caption class="sr-only">Skipped rows</caption>
                <thead class="bg-surface-alt"><tr><th scope="col" class="p-2">Line</th><th scope="col" class="p-2">SKU</th><th scope="col" class="p-2">Problem</th></tr></thead>
                <tbody class="divide-y divide-border">
                  @for (s of r.skipped.slice(0, 50); track s.line) {
                    <tr><td class="p-2">{{ s.line }}</td><td class="p-2 font-mono text-xs">{{ s.sku }}</td><td class="p-2">{{ s.message }}</td></tr>
                  }
                </tbody>
              </table>
            </div>
            @if (r.skipped.length > 50) {
              <p class="mt-1 text-sm text-text-muted">Showing the first 50. The error report has all of them.</p>
            }
            <button uiButton class="mt-3" type="button" variant="secondary" (click)="downloadErrors(r)">Download error report</button>
          }
        </div>
      }
    </section>
  `,
})
export class ImportPageComponent {
  private readonly api = inject(AdminInventoryApi);
  private readonly toast = inject(ToastService);

  protected readonly text = signal('');
  protected readonly report = signal<InventoryImportReport | null>(null);
  protected readonly error = signal('');
  protected readonly importing = signal(false);
  protected readonly exporting = signal(false);

  constructor() {
    inject(SeoService).set({ title: 'Stock import and export', noindex: true });
  }

  protected async exportCsv(): Promise<void> {
    this.exporting.set(true);
    try {
      downloadText('stock.csv', await firstValueFrom(this.api.exportCsv()));
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'The export failed.');
    } finally {
      this.exporting.set(false);
    }
  }

  protected async onFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      this.error.set('That file is too large (1 MB at most).');
      return;
    }
    this.error.set('');
    this.text.set(await file.text());
  }

  protected async runImport(): Promise<void> {
    this.error.set('');
    this.report.set(null);
    if (!this.text().trim()) {
      this.error.set('Choose a file or paste some CSV text first.');
      return;
    }
    this.importing.set(true);
    try {
      const report = await firstValueFrom(this.api.importCsv(this.text()));
      this.report.set(report);
      this.toast.success(`${report.applied} row(s) applied`);
    } catch (e) {
      this.error.set(e instanceof ApiException ? e.message : 'The import failed.');
    } finally {
      this.importing.set(false);
    }
  }

  protected downloadErrors(report: InventoryImportReport): void {
    downloadText('stock-import-errors.csv', report.errorCsv);
  }
}
