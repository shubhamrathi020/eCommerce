import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';

/** Users see a generic message; details go to the console with a request id. */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly toast = inject(ToastService);

  handleError(error: unknown): void {
    const requestId = Math.random().toString(36).slice(2, 10);
    console.error(`[app-error ${requestId}]`, error);
    this.toast.error(`Something went wrong. Please try again. (ref ${requestId})`);
  }
}
