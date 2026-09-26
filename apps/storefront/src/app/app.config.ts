import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideCore } from '@ecom/shared/core';
import { provideDataAccess } from '@ecom/shared/data-access';
import { provideCartFacade } from '@ecom/shared/state';
import { APP_CONFIG_VALUES } from './app-config.values';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideCore(APP_CONFIG_VALUES),
    provideDataAccess({ useMocks: APP_CONFIG_VALUES.useMocks }),
    provideCartFacade(),
  ],
};
