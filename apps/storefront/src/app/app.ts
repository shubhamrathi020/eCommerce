import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CompareBarComponent } from '@ecom/storefront/catalog';

@Component({
  imports: [RouterOutlet, CompareBarComponent],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <app-compare-bar />
  `,
})
export class App {}
