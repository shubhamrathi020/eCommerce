import type { Address } from './order';

export type Role = 'customer' | 'admin';

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
