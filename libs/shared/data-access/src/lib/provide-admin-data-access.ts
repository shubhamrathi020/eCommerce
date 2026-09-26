import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { AdminContentApi } from './content.api';
import { MockAdminContentApi } from '../mock/admin/mock-admin-content.api';
import { AdminCouponApi, AdminDashboardApi, AdminOrderApi, AdminProductApi, AdminReviewApi, AdminUserApi, AuditApi } from './admin.api';
import { MockAdminCouponApi, MockAdminDashboardApi, MockAdminOrderApi, MockAdminProductApi, MockAdminReviewApi, MockAdminUserApi, MockAuditApi } from '../mock/admin/mock-admin.api';

/** Back-office adapters. Only the admin app provides these, so the storefront bundle stays free of them. */
export function provideAdminDataAccess(options: { useMocks: boolean }): EnvironmentProviders {
  if (!options.useMocks) throw new Error('HTTP adapters are not implemented yet. Set useMocks: true.');
  return makeEnvironmentProviders([
    { provide: AdminProductApi, useClass: MockAdminProductApi },
    { provide: AdminOrderApi, useClass: MockAdminOrderApi },
    { provide: AdminCouponApi, useClass: MockAdminCouponApi },
    { provide: AdminUserApi, useClass: MockAdminUserApi },
    { provide: AdminContentApi, useClass: MockAdminContentApi },
    { provide: AdminReviewApi, useClass: MockAdminReviewApi },
    { provide: AdminDashboardApi, useClass: MockAdminDashboardApi },
    { provide: AuditApi, useClass: MockAuditApi },
  ]);
}
