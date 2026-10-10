import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { PaymentSession } from '@ecom/contracts';
import { MOCK_RAZORPAY_KEY_ID } from '@ecom/shared/data-access';
import { AutoPaymentLauncher, MockPaymentLauncher, RazorpayPaymentLauncher } from './payment-launcher';

const session: PaymentSession = { orderId: 'ORD-1', providerOrderId: 'order_ABC', keyId: 'rzp_test_realkey', amount: 230900, currency: 'INR' };

type Handlers = {
  handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
};
type Created = { options: Record<string, unknown> & Handlers; failed?: (r: { error?: { description?: string } }) => void };
type WindowWithRazorpay = Window & { Razorpay?: unknown };

/** A stand-in for Checkout.js that records its options and lets the test play the shopper. */
function fakeCheckout(): Created[] {
  const created: Created[] = [];
  (window as WindowWithRazorpay).Razorpay = class {
    private readonly record: Created;
    constructor(options: Created['options']) {
      this.record = { options };
      created.push(this.record);
    }
    on(_event: string, handler: Created['failed']) {
      this.record.failed = handler;
    }
    open() {
      /* the real one shows its window */
    }
  };
  return created;
}

const waitFor = async (check: () => boolean) => {
  for (let i = 0; i < 50 && !check(); i++) await new Promise((r) => setTimeout(r, 5));
  expect(check()).toBe(true);
};

describe('RazorpayPaymentLauncher', () => {
  let launcher: RazorpayPaymentLauncher;

  beforeEach(() => {
    delete (window as WindowWithRazorpay).Razorpay;
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    launcher = TestBed.inject(RazorpayPaymentLauncher);
  });
  afterEach(() => {
    delete (window as WindowWithRazorpay).Razorpay;
    document.head.querySelectorAll('script[src*="razorpay"]').forEach((s) => s.remove());
  });

  it('opens the window with the order, public key and what the shopper already entered', async () => {
    const created = fakeCheckout();
    const pending = launcher.open(session, { name: 'Asha Rao', email: 'asha@example.com', phone: '9876543210' });
    await waitFor(() => created.length === 1);
    expect(created[0].options).toMatchObject({
      key: 'rzp_test_realkey',
      order_id: 'order_ABC',
      amount: 230900,
      currency: 'INR',
      prefill: { name: 'Asha Rao', email: 'asha@example.com', contact: '+919876543210' },
    });
    created[0].options.modal.ondismiss();
    await pending;
  });

  it('reports the three values the server needs to verify a successful payment', async () => {
    const created = fakeCheckout();
    const pending = launcher.open(session);
    await waitFor(() => created.length === 1);
    created[0].options.handler({ razorpay_order_id: 'order_ABC', razorpay_payment_id: 'pay_XYZ', razorpay_signature: 'sig123' });
    expect(await pending).toEqual({ status: 'success', result: { providerOrderId: 'order_ABC', providerPaymentId: 'pay_XYZ', signature: 'sig123' } });
  });

  it('a failure is reported only when the shopper closes the window, so a retry inside it is not lost', async () => {
    const created = fakeCheckout();
    const pending = launcher.open(session);
    await waitFor(() => created.length === 1);
    created[0].failed?.({ error: { description: 'Your card was declined' } });
    let settled = false;
    void pending.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false); // the window is still open: the shopper may try another method
    created[0].options.modal.ondismiss();
    expect(await pending).toEqual({ status: 'failed', reason: 'Your card was declined' });
  });

  it('a payment that succeeds after a failed first attempt is a success', async () => {
    const created = fakeCheckout();
    const pending = launcher.open(session);
    await waitFor(() => created.length === 1);
    created[0].failed?.({ error: { description: 'Your card was declined' } });
    created[0].options.handler({ razorpay_order_id: 'order_ABC', razorpay_payment_id: 'pay_RETRY', razorpay_signature: 'x' });
    created[0].options.modal.ondismiss(); // Razorpay closes its window afterwards
    expect(await pending).toMatchObject({ status: 'success', result: { providerPaymentId: 'pay_RETRY' } });
  });

  it('closing the window without paying is a dismissal, not a failure', async () => {
    const created = fakeCheckout();
    const pending = launcher.open(session);
    await waitFor(() => created.length === 1);
    created[0].options.modal.ondismiss();
    expect(await pending).toEqual({ status: 'dismissed' });
  });

  it('a script that cannot be loaded is a failed payment and can be tried again', async () => {
    const first = launcher.open(session);
    await waitFor(() => !!document.head.querySelector('script[src*="checkout.razorpay.com"]'));
    document.head.querySelector('script[src*="checkout.razorpay.com"]')?.dispatchEvent(new Event('error'));
    expect(await first).toEqual({ status: 'failed', reason: 'The payment window could not be loaded' });

    const created = fakeCheckout();
    const second = launcher.open(session);
    await waitFor(() => created.length === 1);
    created[0].options.modal.ondismiss();
    expect(await second).toEqual({ status: 'dismissed' });
  });
});

describe('AutoPaymentLauncher', () => {
  it('uses the mock dialog for the mock data layer and Razorpay for any real backend', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const auto = TestBed.inject(AutoPaymentLauncher);
    const openMock = vi.spyOn(TestBed.inject(MockPaymentLauncher), 'open').mockResolvedValue({ status: 'dismissed' });
    const openRazorpay = vi.spyOn(TestBed.inject(RazorpayPaymentLauncher), 'open').mockResolvedValue({ status: 'dismissed' });

    await auto.open({ ...session, keyId: MOCK_RAZORPAY_KEY_ID });
    expect(openMock).toHaveBeenCalledTimes(1);
    expect(openRazorpay).not.toHaveBeenCalled();

    await auto.open(session, { email: 'a@example.com' });
    expect(openRazorpay).toHaveBeenCalledWith(session, { email: 'a@example.com' });
  });
});
