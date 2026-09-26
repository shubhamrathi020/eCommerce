import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { AdminCouponApi, AdminDashboardApi, AdminOrderApi, AdminProductApi, AdminUserApi, AuditApi } from './admin.api';
import { MockAdminCouponApi, MockAdminDashboardApi, MockAdminOrderApi, MockAdminProductApi, MockAdminUserApi, MockAuditApi } from '../mock/admin/mock-admin.api';

/** Back-office adapters. Only the admin app provides these, so the storefront bundle stays free of them. */
export function provideAdminDataAccess(options: { useMocks: boolean }): EnvironmentProviders {
  if (!options.useMocks) throw new Error('HTTP adapters are not implemented yet. Set useMocks: true.');
  return makeEnvironmentProviders([
    { provide: AdminProductApi, useClass: MockAdminProductApi },
    { provide: AdminOrderApi, useClass: MockAdminOrderApi },
    { provide: AdminCouponApi, useClass: MockAdminCouponApi },
    { provide: AdminUserApi, useClass: MockAdminUserApi },
    { provide: AdminDashboardApi, useClass: MockAdminDashboardApi },
    { provide: AuditApi, useClass: MockAuditApi },
  ]);
}
