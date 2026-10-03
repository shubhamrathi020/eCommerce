import type { Address } from './order';

export type Role = 'customer' | 'admin';

const CUSTOMER_PERMISSIONS = ['profile:write:own', 'address:write:own', 'order:read:own', 'order:cancel:own', 'return:write:own', 'support:write:own'];
const ADMIN_PERMISSIONS = ['product:read', 'product:write', 'order:read:any', 'order:refund', 'user:read', 'coupon:write', 'review:moderate', 'content:write', 'inventory:write', 'notification:manage', 'return:manage', 'support:manage', 'promotion:manage', 'recommendation:manage', 'analytics:read', 'system:read', 'system:write'];

/**
 * The single source of truth for what each role grants. Both the mock frontend adapters and the real
 * backend (BRD 19) derive permissions from this, so "the same permission names the frontend already
 * handles" (BF-01, BF-04) is a guarantee, not a convention to remember.
 */
/** Password policy shared by the mock and the real API: at least 8 characters with upper case, lower case and a digit. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) return 'Use upper case, lower case and a number.';
  return null;
}

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
