import type { Observable } from 'rxjs';
import type { CmsPage } from '@ecom/shared/models';

export abstract class CmsApi {
  /** Emits the page, or errors with an `ApiError` (`not_found`) for an unknown slug. */
  abstract page(slug: string): Observable<CmsPage>;
}
