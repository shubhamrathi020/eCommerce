import type { AppConfig } from '@ecom/shared/models';

/** Storefront runtime config. Public values only; no secrets in the frontend. */
export const APP_CONFIG_VALUES: AppConfig = {
  useMocks: true,
  // Set to true (and start the API: `pnpm start:api`) to sign in, manage the profile and addresses against
  // the real backend. Everything else keeps using the mock adapters until its own backend BRD is built.
  realAuth: false,
  mockLatencyMs: 250,
  apiBaseUrl: 'http://localhost:3333',
  siteName: 'Shop',
  siteUrl: 'http://localhost:4200',
  features: {},
};
