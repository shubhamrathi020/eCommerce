import type { AppConfig } from '@ecom/shared/models';

/** Storefront runtime config. Public values only; no secrets in the frontend. */
export const APP_CONFIG_VALUES: AppConfig = {
  useMocks: true,
  mockLatencyMs: 250,
  apiBaseUrl: '/api',
  siteName: 'Shop',
  siteUrl: 'http://localhost:4200',
  features: {},
};
