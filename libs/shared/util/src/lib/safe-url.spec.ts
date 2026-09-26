import { safeReturnUrl } from './safe-url';

describe('safeReturnUrl', () => {
  it('allows in-app paths, including query strings', () => {
    expect(safeReturnUrl('/orders')).toBe('/orders');
    expect(safeReturnUrl('/p/some-item?variant=p-1-v2')).toBe('/p/some-item?variant=p-1-v2');
  });

  it('rejects other origins and tricks', () => {
    for (const bad of ['https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)', 'orders', '/a\nb', '']) {
      expect(safeReturnUrl(bad)).toBe('/account');
    }
    expect(safeReturnUrl(null)).toBe('/account');
    expect(safeReturnUrl(undefined, '/x')).toBe('/x');
  });

  it('does not loop back to sign in or register', () => {
    expect(safeReturnUrl('/account/login?returnUrl=/x')).toBe('/account');
    expect(safeReturnUrl('/account/register')).toBe('/account');
  });
});
