import { provideHttpClient, withFetch } from '@angular/common/http';
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
  // true: staff sign in against the real API (BRD 19); the admin screens themselves still use mock data.
  realAuth: false,
  mockLatencyMs: 200,
  apiBaseUrl: 'http://localhost:3333',
  siteName: 'Shop Admin',
  siteUrl: 'http://localhost:4201',
  features: {},
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    provideCore(CONFIG),
    provideDataAccess({ useMocks: CONFIG.useMocks, realAuth: CONFIG.realAuth }),
    provideAdminDataAccess({ useMocks: CONFIG.useMocks }),
    provideCartFacade(),
  ],
};
