import { InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { AppConfig } from '@ecom/shared/models';

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

/** Minimal storage contract; SSR gets an in-memory implementation. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class MemoryStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

/** Storage that is safe on the server, and tolerant of blocked/full browser storage. */
export const STORAGE = new InjectionToken<KeyValueStorage>('STORAGE', {
  providedIn: 'root',
  factory: () => {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return new MemoryStorage();
    try {
      const probe = '__ecom_probe__';
      localStorage.setItem(probe, probe);
      localStorage.removeItem(probe);
      return localStorage;
    } catch {
      return new MemoryStorage();
    }
  },
});
