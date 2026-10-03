import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PushOptInService } from './push-optin.service';

/** A stand-in for the browser's Notification API. */
function fakeNotification(initial: NotificationPermission, answer: NotificationPermission = 'granted') {
  const shown: { title: string; options?: NotificationOptions }[] = [];
  class Fake {
    static permission = initial;
    static requestPermission = vi.fn(async () => {
      Fake.permission = answer;
      return answer;
    });
    constructor(title: string, options?: NotificationOptions) {
      shown.push({ title, options });
    }
  }
  vi.stubGlobal('Notification', Fake);
  return { Fake, shown };
}

describe('push opt-in (LX-06)', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('asks for nothing until the shopper presses the button, then turns on and can be turned off again', async () => {
    const { Fake } = fakeNotification('default');
    const push = TestBed.inject(PushOptInService);
    expect(push.state()).toBe('off');
    expect(Fake.requestPermission).not.toHaveBeenCalled();

    expect(await push.enable()).toBe('on');
    expect(Fake.requestPermission).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('ecom.push.optin.v1')).toBe('1');

    push.disable();
    expect(push.state()).toBe('off');
    expect(localStorage.getItem('ecom.push.optin.v1')).toBeNull();
  });

  it('remembers an opt-in across visits only while the browser permission is still granted', () => {
    fakeNotification('granted');
    localStorage.setItem('ecom.push.optin.v1', '1');
    expect(TestBed.inject(PushOptInService).state()).toBe('on');

    fakeNotification('denied');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    expect(TestBed.inject(PushOptInService).state()).toBe('blocked');
  });

  it('does not opt in when the shopper refuses, and says the browser is blocking it when it was denied', async () => {
    fakeNotification('default', 'denied');
    const push = TestBed.inject(PushOptInService);
    expect(await push.enable()).toBe('blocked');
    expect(localStorage.getItem('ecom.push.optin.v1')).toBeNull();
  });

  it('reports a browser without notifications', () => {
    vi.stubGlobal('Notification', undefined);
    expect(TestBed.inject(PushOptInService).state()).toBe('unsupported');
  });

  it('shows a test notification only when opted in', async () => {
    const { shown } = fakeNotification('granted');
    const push = TestBed.inject(PushOptInService);
    expect(await push.sendTest('Hello', 'Body')).toBe(false); // granted by the browser, but the shopper never opted in here
    await push.enable();
    expect(await push.sendTest('Hello', 'Body')).toBe(true);
    expect(shown.map((s) => s.title)).toEqual(['Hello']);
  });
});
