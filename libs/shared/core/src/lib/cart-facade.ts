import { Injectable, InjectionToken, inject } from '@angular/core';
import { ToastService } from './toast.service';

export interface AddToCartRequest {
  productId: string;
  variantId: string;
  quantity: number;
  title: string;
}

/** What catalog UI needs from the cart. The cart module (BRD 04) provides the real implementation. */
export interface CartFacade {
  add(request: AddToCartRequest): void;
}

@Injectable({ providedIn: 'root' })
class PlaceholderCartFacade implements CartFacade {
  private readonly toast = inject(ToastService);

  add(request: AddToCartRequest): void {
    this.toast.info(`"${request.title}" will be added to your cart once the cart module ships.`);
  }
}

export const CART_FACADE = new InjectionToken<CartFacade>('CART_FACADE', {
  providedIn: 'root',
  factory: () => inject(PlaceholderCartFacade),
});
