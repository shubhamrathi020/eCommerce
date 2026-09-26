import { Injectable } from '@angular/core';
import type { CmsPage } from '@ecom/shared/models';
import { CmsApi } from '../lib/cms.api';
import { createMockResponder } from './mock-latency';
import pages from './data/cms-pages.json';

@Injectable()
export class MockCmsApi extends CmsApi {
  private readonly respond = createMockResponder();

  page(slug: string) {
    const page = (pages as CmsPage[]).find((p) => p.slug === slug);
    return page
      ? this.respond.ok(() => page)
      : this.respond.fail<CmsPage>({ code: 'not_found', message: 'Page not found' });
  }
}
