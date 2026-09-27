import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '@ecom/shared/core';
import type { ApiError, ApiErrorCode } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { type Observable, catchError, defer, finalize, from, shareReplay, switchMap, throwError } from 'rxjs';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const CODES: ApiErrorCode[] = ['not_found', 'validation', 'unauthorized', 'forbidden', 'conflict', 'network', 'unknown'];

/** Rebuilds the backend's `{ code, message, fields?, requestId? }` body as the `ApiException` every page already handles. */
export function toApiException(error: unknown): ApiException {
  if (error instanceof ApiException) return error;
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return new ApiException('network', 'We could not reach the server. Check your connection and try again.');
    const body = error.error as Partial<ApiError> | null;
    const code = body?.code && CODES.includes(body.code) ? body.code : error.status >= 500 ? 'unknown' : 'validation';
    return new ApiException(code, body?.message ?? 'Something went wrong. Please try again.', body?.fields, body?.requestId);
  }
  return new ApiException('unknown', 'Something went wrong. Please try again.');
}

const newRequestId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);

/**
 * The single HTTP entry point for the real-API adapters. The short-lived access token lives only here, in memory
 * (never in storage); the refresh token is an HttpOnly cookie the browser handles. A request rejected as
 * `unauthorized` gets one transparent refresh-and-retry; concurrent requests share that single refresh.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(APP_CONFIG).apiBaseUrl.replace(/\/$/, '');
  private accessToken: string | null = null;
  private refreshing: Observable<string> | null = null;

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  hasAccessToken(): boolean {
    return this.accessToken !== null;
  }

  /** Calls an endpoint that needs no access token (sign in, register, refresh, reset ...). */
  public<T>(method: Method, path: string, body?: unknown): Observable<T> {
    return this.send<T>(method, path, body, false).pipe(catchError((e) => throwError(() => toApiException(e))));
  }

  /** Calls an endpoint as the signed-in user, refreshing the access token once if it has expired. */
  authed<T>(method: Method, path: string, body?: unknown): Observable<T> {
    return defer(() => this.send<T>(method, path, body, true)).pipe(
      catchError((error: unknown) => {
        const e = toApiException(error);
        if (e.code !== 'unauthorized') return throwError(() => e);
        return this.refreshToken().pipe(
          switchMap(() => this.send<T>(method, path, body, true)),
          catchError((retry) => throwError(() => toApiException(retry))),
        );
      }),
    );
  }

  /** Registered by the auth adapter: exchanges the refresh cookie for a new access token. */
  refreshWith(refresh: () => Promise<string>): void {
    this.doRefresh = refresh;
  }

  private doRefresh: () => Promise<string> = () => Promise.reject(new ApiException('unauthorized', 'Please sign in.'));

  private refreshToken(): Observable<string> {
    this.refreshing ??= defer(() => from(this.doRefresh())).pipe(
      finalize(() => (this.refreshing = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshing;
  }

  private send<T>(method: Method, path: string, body: unknown, withToken: boolean): Observable<T> {
    let headers = new HttpHeaders({ 'x-request-id': newRequestId() });
    // Custom header the API requires on cookie-authenticated calls (CSRF protection, see the API's CsrfGuard).
    if (path.startsWith('/auth/')) headers = headers.set('x-csrf', '1');
    if (withToken && this.accessToken) headers = headers.set('authorization', `Bearer ${this.accessToken}`);
    return this.http.request<T>(method, `${this.base}${path}`, { body, headers, withCredentials: true });
  }
}
