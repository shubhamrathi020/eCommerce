import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NetworkStatusService } from './network-status.service';

describe('NetworkStatusService saved-copy notice', () => {
  afterEach(() => document.head.querySelector('meta[name="sw-saved-copy"]')?.remove());

  it('is off for a live page', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    expect(TestBed.inject(NetworkStatusService).savedCopy()).toBe(false);
  });

  it('is on when the service worker marked the page as a saved copy', () => {
    const meta = document.createElement('meta');
    meta.name = 'sw-saved-copy';
    meta.content = '2026-10-03T10:00:00.000Z';
    document.head.appendChild(meta);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    expect(TestBed.inject(NetworkStatusService).savedCopy()).toBe(true);
  });
});
