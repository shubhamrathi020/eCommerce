import { formatDate } from '@angular/common';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

/** A drop-in for Angular's `date` pipe that follows the shop's language: month names, day periods and ordering (LX-02). */
@Pipe({ name: 'date', pure: false })
export class LocaleDatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  // Impure pipes run on every change-detection pass, so remember the last answer for the same inputs and language.
  private key = '';
  private result: string | null = null;

  transform(value: Date | string | number | null | undefined, format = 'mediumDate', timezone?: string): string | null {
    if (value === null || value === undefined || value === '') return null;
    const locale = this.i18n.info().angular;
    const key = `${locale}|${format}|${timezone ?? ''}|${value instanceof Date ? value.getTime() : value}`;
    if (key === this.key) return this.result;
    this.key = key;
    try {
      this.result = formatDate(value, format, locale, timezone);
    } catch {
      this.result = null;
    }
    return this.result;
  }
}
