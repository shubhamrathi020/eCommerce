import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NetworkStatusService } from '@ecom/shared/core';

/** A persistent notice while the browser has no network connection; some actions may not work until it returns. */
@Component({
  selector: 'app-offline-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!network.online()) {
      <div class="print:hidden bg-warning px-4 py-2 text-center text-sm font-medium text-white" role="status">You're offline. Some things may not work until your connection is back.</div>
    }
  `,
})
export class OfflineBannerComponent {
  protected readonly network = inject(NetworkStatusService);
}
