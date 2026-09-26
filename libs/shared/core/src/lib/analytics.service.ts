import { Injectable, inject } from '@angular/core';
import { ConsentService } from './consent.service';

export interface AnalyticsEvent {
  name: string;
  props?: Record<string, string | number | boolean>;
}

/** Interface-first: a real provider replaces the sink later. Never send PII. */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly consent = inject(ConsentService);

  track(event: AnalyticsEvent): void {
    if (!this.consent.analyticsAllowed()) return;
    // No provider yet (no-op sink).
    void event;
  }
}
