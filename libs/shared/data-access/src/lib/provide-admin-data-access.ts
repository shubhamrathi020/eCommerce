import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { AdminContentApi } from './content.api';
import { AdminInventoryApi } from './inventory.api';
import { AdminNotificationApi } from './notification.api';
import { MockAdminInventoryApi } from '../mock/admin/mock-admin-inventory.api';
import { MockAdminNotificationApi } from '../mock/admin/mock-admin-notification.api';
import { MockAdminContentApi } from '../mock/admin/mock-admin-content.api';
import { AdminCouponApi, AdminDashboardApi, AdminOrderApi, AdminProductApi, AdminReviewApi, AdminUserApi, AuditApi } from './admin.api';
import { MockAdminCouponApi, MockAdminDashboardApi, MockAdminOrderApi, MockAdminProductApi, MockAdminReviewApi, MockAdminUserApi, MockAuditApi } from '../mock/admin/mock-admin.api';
import { HttpAdminProductApi } from '../http/http-admin-catalog.api';

/**
 * Back-office adapters. Only the admin app provides these, so the storefront bundle stays free of them.
 * `realCatalog: true` needs `realAuth: true` too — `HttpAdminProductApi` calls the real API as the signed-in
 * user, so without a real access token every call is refused as unauthorized.
 */
export function provideAdminDataAccess(options: { useMocks: boolean; realCatalog?: boolean }): EnvironmentProviders {
  if (!options.useMocks) throw new Error('Only catalog/search (BRD 20) has a real API so far. Keep useMocks: true and set realCatalog: true to use it.');
  return makeEnvironmentProviders([
    { provide: AdminProductApi, useClass: options.realCatalog ? HttpAdminProductApi : MockAdminProductApi },
    { provide: AdminOrderApi, useClass: MockAdminOrderApi },
    { provide: AdminCouponApi, useClass: MockAdminCouponApi },
    { provide: AdminUserApi, useClass: MockAdminUserApi },
    { provide: AdminContentApi, useClass: MockAdminContentApi },
    { provide: AdminInventoryApi, useClass: MockAdminInventoryApi },
    { provide: AdminNotificationApi, useClass: MockAdminNotificationApi },
    { provide: AdminReviewApi, useClass: MockAdminReviewApi },
    { provide: AdminDashboardApi, useClass: MockAdminDashboardApi },
    { provide: AuditApi, useClass: MockAuditApi },
  ]);
}
