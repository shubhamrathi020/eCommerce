import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NetworkStatusService, TranslatePipe } from '@ecom/shared/core';

/** A persistent notice while the browser has no network connection; some actions may not work until it returns. */
@Component({
  selector: 'app-offline-banner',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!network.online()) {
      <div class="print:hidden bg-warning px-4 py-2 text-center text-sm font-medium text-on-status" role="status">{{ 'offline.banner' | t }}</div>
    }
    @if (network.savedCopy()) {
      <div class="print:hidden bg-warning px-4 py-2 text-center text-sm font-medium text-on-status" role="status">{{ 'offline.savedCopy' | t }}</div>
    }
  `,
})
export class OfflineBannerComponent {
  protected readonly network = inject(NetworkStatusService);
}
