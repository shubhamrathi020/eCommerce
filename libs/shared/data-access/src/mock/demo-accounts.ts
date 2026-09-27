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

const CUSTOMER_PERMISSIONS = ['profile:write:own', 'address:write:own', 'order:read:own', 'order:cancel:own'];
const ADMIN_PERMISSIONS = ['product:read', 'product:write', 'order:read:any', 'order:refund', 'user:read', 'coupon:write', 'review:moderate', 'content:write', 'inventory:write', 'notification:manage'];

export function permissionsFor(roles: Role[]): string[] {
  const set = new Set<string>(CUSTOMER_PERMISSIONS);
  if (roles.includes('admin')) for (const p of ADMIN_PERMISSIONS) set.add(p);
  return [...set];
}
