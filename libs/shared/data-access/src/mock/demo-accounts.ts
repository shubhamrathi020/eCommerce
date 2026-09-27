import type { Role } from '@ecom/shared/models';

/**
 * Seeded demo accounts for local development only (see demo-accounts.md).
 * These are test values for this mock; they are never valid against a real backend.
 */
export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  roles: Role[];
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: 'usr_demo_customer', name: 'Demo Customer', email: 'demo@shop.test', password: 'Demo@1234', roles: ['customer'] },
  { id: 'usr_demo_admin', name: 'Demo Admin', email: 'admin@shop.test', password: 'Admin@1234', roles: ['admin'] },
];

/** Role -> permissions now lives in `@ecom/shared/models` (`permissionsFor`), shared with the real backend (BRD 19). */
export { permissionsFor } from '@ecom/shared/models';
