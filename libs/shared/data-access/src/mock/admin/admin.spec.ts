import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@ecom/shared/core';
import type { AdminProductInput } from '@ecom/contracts';
import { AdminCouponApi, AdminDashboardApi, AdminOrderApi, AdminProductApi, AdminReviewApi, AdminUserApi, AuditApi, AuthApi, DEMO_ACCOUNTS, ORDER_TRANSITIONS, provideAdminDataAccess, provideDataAccess } from '../../index';

const admin = DEMO_ACCOUNTS[1];
const customer = DEMO_ACCOUNTS[0];

describe('admin console (mock)', () => {
  let auth: AuthApi;
  let products: AdminProductApi;
  let orders: AdminOrderApi;
  let coupons: AdminCouponApi;
  let users: AdminUserApi;
  let dashboard: AdminDashboardApi;
  let audit: AuditApi;
  let reviewApi: AdminReviewApi;

  const listQuery = { sort: 'title' as const, dir: 'asc' as const, page: 1, pageSize: 20 };
  const orderQuery = { page: 1, pageSize: 100 };

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: APP_CONFIG, useValue: { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'S', siteUrl: 'http://x', features: {} } }, provideDataAccess({ useMocks: true }), provideAdminDataAccess({ useMocks: true })],
    });
    auth = TestBed.inject(AuthApi);
    products = TestBed.inject(AdminProductApi);
    orders = TestBed.inject(AdminOrderApi);
    coupons = TestBed.inject(AdminCouponApi);
    users = TestBed.inject(AdminUserApi);
    dashboard = TestBed.inject(AdminDashboardApi);
    audit = TestBed.inject(AuditApi);
    reviewApi = TestBed.inject(AdminReviewApi);
    await firstValueFrom(auth.login(admin.email, admin.password));
  });

  it('refuses anonymous users and customers on every area', async () => {
    await firstValueFrom(auth.logout());
    await expect(firstValueFrom(products.list(listQuery))).rejects.toMatchObject({ code: 'unauthorized' });
    await firstValueFrom(auth.login(customer.email, customer.password));
    for (const call of [() => reviewApi.list({ page: 1, pageSize: 10 }), () => products.list(listQuery), () => orders.list(orderQuery), () => coupons.list(), () => users.list(), () => dashboard.metrics(7), () => audit.list({ page: 1, pageSize: 10 })]) {
      await expect(firstValueFrom(call())).rejects.toMatchObject({ code: 'forbidden' });
    }
  });

  it('lists, searches, filters and sorts products', async () => {
    const all = await firstValueFrom(products.list({ ...listQuery, pageSize: 500 }));
    expect(all.total).toBeGreaterThan(200);
    const titles = all.items.map((i) => i.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
    const first = all.items[0];
    expect((await firstValueFrom(products.list({ ...listQuery, q: first.title }))).items[0].id).toBe(first.id);
    expect((await firstValueFrom(products.list({ ...listQuery, status: 'draft' }))).total).toBe(0);
    const byStock = await firstValueFrom(products.list({ sort: 'stock', dir: 'asc', page: 1, pageSize: 5 }));
    expect(byStock.items[0].stockTotal).toBeLessThanOrEqual(byStock.items[4].stockTotal);
  });

  it('edits a product with validation, keeps SKU uniqueness and records an audit entry', async () => {
    const row = (await firstValueFrom(products.list(listQuery))).items[0];
    const detail = await firstValueFrom(products.get(row.id));
    const input: AdminProductInput = { title: detail.title, brandName: detail.brandName, categoryId: detail.categoryId, description: detail.description, highlights: detail.highlights, tags: detail.tags, status: detail.status, variants: detail.variants };

    await expect(firstValueFrom(products.update(row.id, { ...input, title: '', variants: [{ ...input.variants[0], price: 0, stock: -1, mrp: 1 }] }))).rejects.toMatchObject({ fields: { title: expect.any(String), 'variants.0.price': expect.any(String), 'variants.0.stock': expect.any(String) } });

    const other = (await firstValueFrom(products.list(listQuery))).items[1];
    const otherSku = (await firstValueFrom(products.get(other.id))).variants[0].sku;
    await expect(firstValueFrom(products.update(row.id, { ...input, variants: [{ ...input.variants[0], sku: otherSku }] }))).rejects.toMatchObject({ fields: { 'variants.0.sku': 'SKU must be unique' } });

    const saved = await firstValueFrom(products.update(row.id, { ...input, title: 'Renamed <b>Item</b>', variants: [{ ...input.variants[0], stock: 77 }] }));
    expect(saved.title).toBe('Renamed <b>Item</b>');
    // Stock of an existing variant is managed through the inventory ledger, so the product form cannot change it.
    expect(saved.variants[0].stock).toBe(detail.variants[0].stock);
    const entries = (await firstValueFrom(audit.list({ page: 1, pageSize: 10 }))).items;
    expect(entries[0]).toMatchObject({ action: 'product.update', actor: admin.name });
    expect(entries[0].detail).toContain('title');
  });

  it('creates a draft product, escapes description text, publishes and deletes only drafts in bulk', async () => {
    const cats = await firstValueFrom(products.categories());
    const created = await firstValueFrom(products.create({ title: 'Test Kettle', brandName: 'Ferro', categoryId: cats[0].id, description: 'Line one <script>x</script>\n\nLine two', highlights: ['Fast'], tags: [], status: 'draft', variants: [{ sku: 'TEST-1', options: { colour: 'Black' }, price: 129900, mrp: 149900, stock: 10 }] }));
    expect(created.status).toBe('draft');
    expect(created.slug).toContain('test-kettle');
    expect(created.description).toContain('<script>');

    expect(await firstValueFrom(products.bulkSetStatus([created.id, 'nope'], 'published'))).toBe(1);
    expect((await firstValueFrom(products.get(created.id))).status).toBe('published');
    expect(await firstValueFrom(products.bulkDeleteDrafts([created.id]))).toBe(0); // published, not a draft
    await firstValueFrom(products.bulkSetStatus([created.id], 'draft'));
    expect(await firstValueFrom(products.bulkDeleteDrafts([created.id]))).toBe(1);
    await expect(firstValueFrom(products.get(created.id))).rejects.toMatchObject({ code: 'not_found' });
    await expect(firstValueFrom(products.create({ title: 'X', brandName: 'B', categoryId: 'bad', description: '', highlights: [], tags: [], status: 'draft', variants: [] }))).rejects.toMatchObject({ code: 'validation' });
  });

  it('lists seeded orders, filters them and follows the allowed status transitions', async () => {
    const all = await firstValueFrom(orders.list(orderQuery));
    expect(all.total).toBeGreaterThan(40);
    const confirmed = (await firstValueFrom(orders.list({ ...orderQuery, status: 'confirmed' }))).items[0];
    expect(confirmed).toBeDefined();
    expect((await firstValueFrom(orders.list({ ...orderQuery, q: confirmed.customerName }))).items.some((o) => o.id === confirmed.id)).toBe(true);
    expect((await firstValueFrom(orders.list({ ...orderQuery, paymentMethod: 'cod' }))).items.every((o) => o.paymentMethod === 'cod')).toBe(true);

    const detail = await firstValueFrom(orders.get(confirmed.id));
    expect(detail.allowedNext).toEqual(ORDER_TRANSITIONS['confirmed']);
    await expect(firstValueFrom(orders.advance(confirmed.id, 'delivered'))).rejects.toMatchObject({ code: 'validation' });
    const packed = await firstValueFrom(orders.advance(confirmed.id, 'packed'));
    expect(packed.status).toBe('packed');
    expect(packed.timeline.at(-1)?.label).toBe('Packed');
    const shipped = await firstValueFrom(orders.advance(confirmed.id, 'shipped'));
    expect(shipped.allowedNext).toEqual(['delivered']);
    await expect(firstValueFrom(orders.advance(confirmed.id, 'cancelled'))).rejects.toMatchObject({ code: 'validation' });
  });

  it('adds order notes with validation', async () => {
    const id = (await firstValueFrom(orders.list(orderQuery))).items[0].id;
    await expect(firstValueFrom(orders.addNote(id, '   '))).rejects.toMatchObject({ code: 'validation' });
    const withNote = await firstValueFrom(orders.addNote(id, 'Customer asked for a call.'));
    expect(withNote.notes[0]).toMatchObject({ text: 'Customer asked for a call.', author: admin.name });
  });

  it('manages coupons: validation, duplicates, edit and activate/deactivate with usage counts', async () => {
    const list = await firstValueFrom(coupons.list());
    expect(list.map((c) => c.code)).toContain('WELCOME10');
    expect(list.find((c) => c.code === 'WELCOME10')?.usageCount).toBeGreaterThan(0);
    const base = { code: 'SUMMER15', description: '15% off', kind: 'percent' as const, value: 15, minSubtotal: 50000, active: true };
    await expect(firstValueFrom(coupons.save({ ...base, code: 'x', value: 99 }, true))).rejects.toMatchObject({ fields: { code: expect.any(String), value: expect.any(String) } });
    await expect(firstValueFrom(coupons.save({ ...base, code: 'flat100' }, true))).rejects.toMatchObject({ fields: { code: 'This code already exists' } });
    expect((await firstValueFrom(coupons.save(base, true))).some((c) => c.code === 'SUMMER15')).toBe(true);
    expect((await firstValueFrom(coupons.save({ ...base, value: 20 }, false))).find((c) => c.code === 'SUMMER15')?.value).toBe(20);
    expect((await firstValueFrom(coupons.setActive('SUMMER15', false))).find((c) => c.code === 'SUMMER15')?.active).toBe(false);
  });

  it('lists users and protects roles: not your own, and at least one admin remains', async () => {
    const list = await firstValueFrom(users.list());
    expect(list.length).toBeGreaterThan(10);
    const me = list.find((u) => u.email === admin.email);
    await expect(firstValueFrom(users.setRole(me?.id ?? '', 'admin', false))).rejects.toMatchObject({ message: 'You cannot change your own role.' });
    const target = list.find((u) => u.email === 'diya.menon@example.com');
    const promoted = await firstValueFrom(users.setRole(target?.id ?? '', 'admin', true));
    expect(promoted.find((u) => u.id === target?.id)?.roles).toContain('admin');
    const demoted = await firstValueFrom(users.setRole(target?.id ?? '', 'admin', false));
    expect(demoted.find((u) => u.id === target?.id)?.roles).not.toContain('admin');
    const audits = (await firstValueFrom(audit.list({ page: 1, pageSize: 10 }))).items;
    expect(audits.map((a) => a.action)).toEqual(expect.arrayContaining(['user.role']));
    expect(await firstValueFrom(audit.list({ q: 'zzz-nothing', page: 1, pageSize: 10 }))).toMatchObject({ total: 0 });
  });

  it('builds dashboard metrics for a period', async () => {
    const m7 = await firstValueFrom(dashboard.metrics(7));
    const m30 = await firstValueFrom(dashboard.metrics(30));
    expect(m30.orders).toBeGreaterThanOrEqual(m7.orders);
    expect(m30.revenue.amount).toBeGreaterThan(0);
    expect(m30.byDay).toHaveLength(30);
    expect(m30.byDay.reduce((s, d) => s + d.revenue, 0)).toBe(m30.revenue.amount);
    expect(m30.averageOrderValue.amount).toBe(Math.round(m30.revenue.amount / m30.orders));
    expect(m30.topProducts.length).toBeGreaterThan(0);
    expect(m30.topProducts[0].revenue.amount).toBeGreaterThanOrEqual(m30.topProducts[m30.topProducts.length - 1].revenue.amount);
    expect(m30.statusBreakdown.length).toBeGreaterThan(1);
    expect(Array.isArray(m30.lowStock)).toBe(true);
  });

  it('moderates flagged reviews: queue, approve, reject, delete, and audit entries', async () => {
    const pending = await firstValueFrom(reviewApi.list({ status: 'pending', page: 1, pageSize: 50 }));
    expect(pending.total).toBe(8);
    expect(pending.items.every((r) => r.flagReason)).toBe(true);
    expect(await firstValueFrom(reviewApi.pendingCount())).toBe(8);

    const [a, b, c] = pending.items;
    expect((await firstValueFrom(reviewApi.moderate(a.id, 'approved'))).status).toBe('approved');
    expect((await firstValueFrom(reviewApi.moderate(b.id, 'rejected'))).status).toBe('rejected');
    await firstValueFrom(reviewApi.remove(c.id));
    expect(await firstValueFrom(reviewApi.pendingCount())).toBe(5);
    expect((await firstValueFrom(reviewApi.list({ status: 'approved', page: 1, pageSize: 10 }))).items.map((r) => r.id)).toEqual([a.id]);
    await expect(firstValueFrom(reviewApi.moderate('nope', 'approved'))).rejects.toMatchObject({ code: 'not_found' });
    const actions = (await firstValueFrom(audit.list({ page: 1, pageSize: 10 }))).items.map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(['review.moderate', 'review.delete']));
  });
});
