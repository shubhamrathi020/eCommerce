import type { Address } from './order';

export type Role = 'customer' | 'admin';

const CUSTOMER_PERMISSIONS = ['profile:write:own', 'address:write:own', 'order:read:own', 'order:cancel:own'];
const ADMIN_PERMISSIONS = ['product:read', 'product:write', 'order:read:any', 'order:refund', 'user:read', 'coupon:write', 'review:moderate', 'content:write', 'inventory:write', 'notification:manage'];

/**
 * The single source of truth for what each role grants. Both the mock frontend adapters and the real
 * backend (BRD 19) derive permissions from this, so "the same permission names the frontend already
 * handles" (BF-01, BF-04) is a guarantee, not a convention to remember.
 */
export function permissionsFor(roles: Role[]): string[] {
  const set = new Set<string>(CUSTOMER_PERMISSIONS);
  if (roles.includes('admin')) for (const p of ADMIN_PERMISSIONS) set.add(p);
  return [...set];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: Role[];
  /** Fine-grained permissions derived from roles, e.g. `order:read:own`, `product:write`. */
  permissions: string[];
  emailVerified: boolean;
  createdAt: string;
}

/** What the browser knows about the signed-in user. No secrets. */
export interface Session {
  user: User;
  expiresAt: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: Address;
  isDefault: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AccountExport {
  exportedAt: string;
  profile: Omit<User, 'permissions'>;
  addresses: SavedAddress[];
  orderIds: string[];
}
