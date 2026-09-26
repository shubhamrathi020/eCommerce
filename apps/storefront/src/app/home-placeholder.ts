import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SeoService } from '@ecom/shared/core';

/** Temporary home page; replaced by the catalog home (BRD 02). */
@Component({
  selector: 'app-home-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="py-12 text-center">
      <h1 class="text-3xl font-bold">Welcome to Shop</h1>
      <p class="mt-2 text-text-muted">The catalog arrives in the next slice. The shell, navigation and design system are ready.</p>
    </section>
  `,
})
export class HomePlaceholderComponent {
  constructor() {
    inject(SeoService).set({ title: 'Home', description: 'Fashion, electronics, groceries and more.', path: '/' });
  }
}
