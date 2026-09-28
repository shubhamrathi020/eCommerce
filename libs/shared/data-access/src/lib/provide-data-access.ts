import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { AddressBookApi, AuthApi } from './account.api';
import { CatalogApi } from './catalog.api';
import { CartApi, CheckoutApi, OrderApi, PaymentApi } from './commerce.api';
import { CategoryApi } from './category.api';
import { CmsApi } from './cms.api';
import { ContentApi } from './content.api';
import { ReviewApi } from './review.api';
import { SearchApi } from './search.api';
import { NewsletterApi } from './newsletter.api';
import { AlertApi, NotificationApi, PreferenceApi } from './notification.api';
import { MockAddressBookApi } from '../mock/mock-address-book.api';
import { MockAuthApi } from '../mock/mock-auth.api';
import { MockCartApi } from '../mock/mock-cart.api';
import { MockCatalogApi } from '../mock/mock-catalog.api';
import { MockCheckoutApi } from '../mock/mock-checkout.api';
import { MockOrderApi } from '../mock/mock-order.api';
import { MockSearchApi } from '../mock/mock-search.api';
import { MockReviewApi } from '../mock/mock-review.api';
import { MockPaymentApi } from '../mock/mock-payment.api';
import { MockCategoryApi } from '../mock/mock-category.api';
import { MockCmsApi, MockContentApi } from '../mock/mock-content.api';
import { MockNewsletterApi } from '../mock/mock-newsletter.api';
import { MockAlertApi, MockNotificationApi, MockPreferenceApi } from '../mock/mock-notification.api';
import { HttpAddressBookApi, HttpAuthApi } from '../http/http-auth.api';
import { HttpCatalogApi, HttpCategoryApi, HttpSearchApi } from '../http/http-catalog.api';

/**
 * Wires each API contract to its adapter, selected by `AppConfig.useMocks` and, module by module, the
 * `realAuth`/`realCatalog` flags as each backend BRD lands. Everything not yet listed with a `real...`
 * flag still has no HTTP adapter at all and stays on mocks.
 */
export function provideDataAccess(options: { useMocks: boolean; realAuth?: boolean; realCatalog?: boolean }): EnvironmentProviders {
  if (!options.useMocks) {
    throw new Error('Only identity (BRD 19) and catalog/search (BRD 20) have a real API so far. Keep useMocks: true and set realAuth/realCatalog: true to use them.');
  }
  return makeEnvironmentProviders([
    // Identity (BRD 19) and catalog/search (BRD 20) are the only modules with a real backend so far;
    // everything else stays on mocks until its own BRD lands.
    { provide: CatalogApi, useClass: options.realCatalog ? HttpCatalogApi : MockCatalogApi },
    { provide: AuthApi, useClass: options.realAuth ? HttpAuthApi : MockAuthApi },
    { provide: AddressBookApi, useClass: options.realAuth ? HttpAddressBookApi : MockAddressBookApi },
    // ReviewApi is only the *writing* side (submit/vote/moderate); reading reviews is CatalogApi.reviews(),
    // which already goes real with realCatalog. A review submitted through the still-mock ReviewApi will
    // not appear there until BRD 20's reviews write-path is built for real (a recorded, not silent, gap).
    { provide: ReviewApi, useClass: MockReviewApi },
    { provide: SearchApi, useClass: options.realCatalog ? HttpSearchApi : MockSearchApi },
    { provide: CartApi, useClass: MockCartApi },
    { provide: CheckoutApi, useClass: MockCheckoutApi },
    { provide: OrderApi, useClass: MockOrderApi },
    { provide: PaymentApi, useClass: MockPaymentApi },
    { provide: CategoryApi, useClass: options.realCatalog ? HttpCategoryApi : MockCategoryApi },
    { provide: CmsApi, useClass: MockCmsApi },
    { provide: ContentApi, useClass: MockContentApi },
    { provide: NewsletterApi, useClass: MockNewsletterApi },
    { provide: PreferenceApi, useClass: MockPreferenceApi },
    { provide: AlertApi, useClass: MockAlertApi },
    { provide: NotificationApi, useClass: MockNotificationApi },
  ]);
}
