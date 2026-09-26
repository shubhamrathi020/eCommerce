import { Pipe, PipeTransform } from '@angular/core';
import type { Money } from '@ecom/shared/models';
import { formatMoney } from './money';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: Money | null | undefined): string {
    return value ? formatMoney(value) : '';
  }
}
