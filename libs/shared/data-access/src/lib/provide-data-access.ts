import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { CatalogApi } from './catalog.api';
import { CategoryApi } from './category.api';
import { CmsApi } from './cms.api';
import { NewsletterApi } from './newsletter.api';
import { MockCatalogApi } from '../mock/mock-catalog.api';
import { MockCategoryApi } from '../mock/mock-category.api';
import { MockCmsApi } from '../mock/mock-cms.api';
import { MockNewsletterApi } from '../mock/mock-newsletter.api';

/**
 * Wires each API contract to its adapter. Only mock adapters exist for now;
 * HTTP adapters are added with the backend and selected by `AppConfig.useMocks`.
 */
export function provideDataAccess(options: { useMocks: boolean }): EnvironmentProviders {
  if (!options.useMocks) {
    throw new Error('HTTP adapters are not implemented yet. Set useMocks: true.');
  }
  return makeEnvironmentProviders([
    { provide: CatalogApi, useClass: MockCatalogApi },
    { provide: CategoryApi, useClass: MockCategoryApi },
    { provide: CmsApi, useClass: MockCmsApi },
    { provide: NewsletterApi, useClass: MockNewsletterApi },
  ]);
}
