import { EnvironmentProviders, ErrorHandler, makeEnvironmentProviders } from '@angular/core';
import type { AppConfig } from '@ecom/contracts';
import { GlobalErrorHandler } from './global-error-handler';
import { APP_CONFIG } from './tokens';

export function provideCore(config: AppConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: APP_CONFIG, useValue: config },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ]);
}
