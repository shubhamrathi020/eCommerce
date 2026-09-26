import type { Banner, Brand, Category, Collection, HomeData, Product, Serviceability } from '@ecom/shared/models';
import type { CatalogData } from './catalog-engine';

export interface HomeFile {
  banners: Banner[];
  categoryTiles: HomeData['categoryTiles'];
}

export type LoadedCatalog = CatalogData & { home: HomeFile };

let dataPromise: Promise<LoadedCatalog> | undefined;

/** JSON fixtures are loaded lazily so they never weigh down the initial bundle. */
export function loadCatalogData(): Promise<LoadedCatalog> {
  dataPromise ??= Promise.all([import('./data/products.json'), import('./data/categories.json'), import('./data/brands.json'), import('./data/collections.json'), import('./data/home.json')]).then(
    ([products, categories, brands, collections, home]) => ({
      products: products.default as unknown as Product[],
      categories: categories.default as unknown as Category[],
      brands: brands.default as Brand[],
      collections: collections.default as Collection[],
      home: home.default as unknown as HomeFile,
    }),
  );
  return dataPromise;
}

const DAY_MS = 86_400_000;

/** Mock delivery rules by pin-code prefix (shared by the product page and checkout). */
export function computeServiceability(pincode: string, now = Date.now()): Serviceability {
  const first = Number(pincode[0]);
  if (first === 9) return { serviceable: false, pincode };
  const days = 2 + (first % 4);
  return { serviceable: true, pincode, estimatedDays: days, estimatedDate: new Date(now + days * DAY_MS).toISOString(), codAvailable: first % 2 === 0 };
}

/** Public URLs for the sitemap (products, categories, brands, collections and published pages). */
export async function loadSitemapSource() {
  const [{ products, categories, brands, collections }, pages] = await Promise.all([loadCatalogData(), import('./data/cms-pages.json')]);
  return {
    products: products.map((p) => ({ slug: p.slug, createdAt: p.createdAt })),
    categories: categories.map((c) => ({ slug: c.slug })),
    brands: brands.map((b) => ({ slug: b.slug })),
    collections: collections.map((c) => ({ slug: c.slug })),
    pages: (pages.default as { slug: string }[]).map((p) => ({ slug: p.slug })),
  };
}
