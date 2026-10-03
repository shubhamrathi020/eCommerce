import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideCore } from '@ecom/shared/core';
import { provideDataAccess } from '@ecom/shared/data-access';
import type { AppConfig } from '@ecom/shared/models';
import { provideCartFacade } from '@ecom/shared/state';
import { appRoutes } from './app.routes';

/** Seller portal runtime config. Public values only; no secrets in the frontend. */
const CONFIG: AppConfig = {
  useMocks: true,
  // true: sign in against the real API (BRD 19). The seller portal itself still uses mock data: the marketplace has no backend yet.
  realAuth: false,
  realCatalog: false,
  realCommerce: false,
  mockLatencyMs: 200,
  apiBaseUrl: 'http://localhost:3333',
  siteName: 'Seller Centre',
  siteUrl: 'http://localhost:4202',
  storefrontUrl: 'http://localhost:4200',
  features: {},
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    provideCore(CONFIG),
    provideDataAccess({ useMocks: CONFIG.useMocks, realAuth: CONFIG.realAuth, realCatalog: CONFIG.realCatalog, realCommerce: CONFIG.realCommerce }),
    provideCartFacade(),
  ],
};
