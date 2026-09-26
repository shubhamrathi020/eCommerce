import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon';

export interface BreadcrumbItem {
  label: string;
  /** Omit for the current page. */
  link?: string;
}

@Component({
  selector: 'ui-breadcrumb',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <nav aria-label="Breadcrumb">
      <ol class="flex flex-wrap items-center gap-1 text-sm text-text-muted">
        @for (item of items(); track $index; let last = $last) {
          <li class="flex items-center gap-1">
            @if (item.link && !last) {
              <a [routerLink]="item.link" class="rounded underline-offset-2 hover:text-primary hover:underline">{{ item.label }}</a>
              <ui-icon name="chevron-right" [size]="14" />
            } @else {
              <span aria-current="page" class="text-text">{{ item.label }}</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class BreadcrumbComponent {
  readonly items = input.required<BreadcrumbItem[]>();
}
