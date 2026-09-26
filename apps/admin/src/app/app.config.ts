import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideCore } from '@ecom/shared/core';
import { provideAdminDataAccess, provideDataAccess } from '@ecom/shared/data-access';
import type { AppConfig } from '@ecom/shared/models';
import { provideCartFacade } from '@ecom/shared/state';
import { appRoutes } from './app.routes';

/** Admin runtime config. Public values only; no secrets in the frontend. */
const CONFIG: AppConfig = {
  useMocks: true,
  mockLatencyMs: 200,
  apiBaseUrl: '/api',
  siteName: 'Shop Admin',
  siteUrl: 'http://localhost:4201',
  features: {},
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideCore(CONFIG),
    provideDataAccess({ useMocks: CONFIG.useMocks }),
    provideAdminDataAccess({ useMocks: CONFIG.useMocks }),
    provideCartFacade(),
  ],
};
