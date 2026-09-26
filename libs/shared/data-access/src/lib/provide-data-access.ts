import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { AddressBookApi, AuthApi } from './account.api';
import { CatalogApi } from './catalog.api';
import { CartApi, CheckoutApi, OrderApi, PaymentApi } from './commerce.api';
import { CategoryApi } from './category.api';
import { CmsApi } from './cms.api';
import { SearchApi } from './search.api';
import { NewsletterApi } from './newsletter.api';
import { MockAddressBookApi } from '../mock/mock-address-book.api';
import { MockAuthApi } from '../mock/mock-auth.api';
import { MockCartApi } from '../mock/mock-cart.api';
import { MockCatalogApi } from '../mock/mock-catalog.api';
import { MockCheckoutApi } from '../mock/mock-checkout.api';
import { MockOrderApi } from '../mock/mock-order.api';
import { MockSearchApi } from '../mock/mock-search.api';
import { MockPaymentApi } from '../mock/mock-payment.api';
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
    { provide: AuthApi, useClass: MockAuthApi },
    { provide: AddressBookApi, useClass: MockAddressBookApi },
    { provide: SearchApi, useClass: MockSearchApi },
    { provide: CartApi, useClass: MockCartApi },
    { provide: CheckoutApi, useClass: MockCheckoutApi },
    { provide: OrderApi, useClass: MockOrderApi },
    { provide: PaymentApi, useClass: MockPaymentApi },
    { provide: CategoryApi, useClass: MockCategoryApi },
    { provide: CmsApi, useClass: MockCmsApi },
    { provide: NewsletterApi, useClass: MockNewsletterApi },
  ]);
}
