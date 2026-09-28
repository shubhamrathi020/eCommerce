import type { AppConfig } from '@ecom/shared/models';

/** Storefront runtime config. Public values only; no secrets in the frontend. */
export const APP_CONFIG_VALUES: AppConfig = {
  useMocks: true,
  // Set to true (and start the API: `pnpm start:api`) to sign in, manage the profile and addresses against
  // the real backend. Everything else keeps using the mock adapters until its own backend BRD is built.
  realAuth: false,
  // Set to true (and start the API: `pnpm start:api`, seeded via `pnpm db:seed:catalog`) to browse and
  // search the real catalog store (BRD 20). Cart, checkout, orders etc. keep using the mock adapters.
  realCatalog: false,
  // Set to true (and start the API + docker compose up -d postgres mongo meilisearch redis) for a real
  // server-side cart, checkout and orders (BRD 21). Cash on delivery works with no further setup; online
  // payment needs your own Razorpay test keys in apps/api/.env (see .env.example) to actually succeed.
  realCommerce: false,
  mockLatencyMs: 250,
  apiBaseUrl: 'http://localhost:3333',
  siteName: 'Shop',
  siteUrl: 'http://localhost:4200',
  features: {},
};
