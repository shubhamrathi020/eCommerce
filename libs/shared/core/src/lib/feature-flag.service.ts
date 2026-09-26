import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from './tokens';

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private readonly flags = inject(APP_CONFIG).features;

  isEnabled(flag: string): boolean {
    return this.flags[flag] === true;
  }
}
