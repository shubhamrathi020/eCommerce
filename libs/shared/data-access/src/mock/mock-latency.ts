import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, defer, delay, from, of, throwError } from 'rxjs';
import type { ApiError } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { APP_CONFIG } from '@ecom/shared/core';

/** Wraps a value or an ApiError in an Observable that mimics network latency. */
export function createMockResponder() {
  const latency = inject(APP_CONFIG).mockLatencyMs ?? 200;
  const ms = isPlatformBrowser(inject(PLATFORM_ID)) ? latency : 0;
  return {
    ok<T>(produce: () => T): Observable<T> {
      return defer(() => of(produce())).pipe(delay(ms));
    },
    /** Async producer; a thrown ApiException becomes an observable error. */
    okAsync<T>(produce: () => Promise<T>): Observable<T> {
      return defer(() => from(produce())).pipe(delay(ms));
    },
    fail<T = never>(error: ApiError): Observable<T> {
      return throwError(() => new ApiException(error.code, error.message, error.fields, error.requestId)).pipe(delay(ms));
    },
  };
}
