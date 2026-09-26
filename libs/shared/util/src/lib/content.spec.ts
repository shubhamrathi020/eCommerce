import { renderContent, htmlToSource } from './content-format';
import { buildRobotsTxt, buildSitemapXml } from './seo-files';

describe('renderContent', () => {
  it('renders headings, paragraphs, lists, bold and safe links', () => {
    const html = renderContent('## Title\n\nHello **world**.\nSecond line.\n\n- one\n- two\n\nSee [FAQ](/pages/faq) and [site](https://example.com/a?x=1&y=2).');
    expect(html).toContain('<h2>Title</h2>');
    expect(html).toContain('<p>Hello <strong>world</strong>.<br>Second line.</p>');
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>');
    expect(html).toContain('<a href="/pages/faq">FAQ</a>');
    expect(html).toContain('href="https://example.com/a?x=1&amp;y=2" rel="noopener noreferrer"');
  });

  it('escapes markup so scripts and handlers cannot run', () => {
    const html = renderContent('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n## <b>hi</b>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<h2>&lt;b&gt;hi&lt;/b&gt;</h2>');
  });

  it('drops unsafe link targets but keeps the text', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', '//evil.test', 'vbscript:x']) {
      const html = renderContent(`[click](${bad})`);
      expect(html).not.toContain('href');
      expect(html).toContain('click');
    }
  });

  it('cannot break out of an attribute', () => {
    const html = renderContent('[x](https://a.test/"onmouseover="alert(1))');
    expect(html).not.toMatch(/"onmouseover/);
  });

  it('round-trips simple seeded HTML into editable text', () => {
    const source = htmlToSource('<h2>FAQ</h2><p>How long? <b>Fast</b></p><ul><li>A</li><li>B</li></ul>');
    expect(source).toContain('## FAQ');
    expect(source).toContain('- A');
    expect(source).not.toContain('<');
  });
});

describe('seo files', () => {
  const source = { products: [{ slug: 'a-1', createdAt: '2026-01-02T00:00:00Z' }], categories: [{ slug: 'mobiles' }], brands: [{ slug: 'nova' }], collections: [{ slug: 'trending' }], pages: [{ slug: 'about' }] };

  it('builds a valid sitemap of public URLs only', () => {
    const x = buildSitemapXml('https://shop.example/', source);
    expect(x).toContain('<loc>https://shop.example/</loc>');
    expect(x).toContain('<loc>https://shop.example/c/mobiles</loc>');
    expect(x).toContain('<loc>https://shop.example/p/a-1</loc><lastmod>2026-01-02</lastmod>');
    expect(x).not.toMatch(/\/(cart|checkout|account|search)/);
    expect(x.startsWith('<?xml')).toBe(true);
  });

  it('escapes special characters in URLs', () => {
    expect(buildSitemapXml('https://x.test', { ...source, pages: [{ slug: 'a&b' }] })).toContain('a&amp;b');
  });

  it('robots blocks private paths and points to the sitemap', () => {
    const r = buildRobotsTxt('https://shop.example');
    for (const p of ['/account', '/cart', '/checkout', '/orders', '/search']) expect(r).toContain(`Disallow: ${p}`);
    expect(r).toContain('Sitemap: https://shop.example/sitemap.xml');
  });
});
