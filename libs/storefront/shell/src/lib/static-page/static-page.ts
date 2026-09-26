import { ChangeDetectionStrategy, Component, RESPONSE_INIT, effect, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SeoService } from '@ecom/shared/core';
import { CmsApi } from '@ecom/shared/data-access';
import { ApiException } from '@ecom/shared/models';
import { ErrorStateComponent, NotFoundComponent, SkeletonComponent } from '@ecom/shared/ui';

/** Renders a CMS page by slug. HTML is bound with [innerHTML], so Angular sanitises it. */
@Component({
  selector: 'app-static-page',
  imports: [SkeletonComponent, ErrorStateComponent, NotFoundComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (page.status()) {
      @case ('loading') {
        <ui-skeleton class="h-8 w-1/2" />
        <ui-skeleton class="mt-4 h-4 w-full" />
        <ui-skeleton class="mt-2 h-4 w-3/4" />
      }
      @case ('error') {
        @if (isNotFound()) {
          <ui-not-found />
        } @else {
          <ui-error-state (retry)="page.reload()" />
        }
      }
      @default {
        @if (page.value(); as p) {
          <article class="max-w-3xl">
            @if (p.preview) {
              <p class="mb-4 rounded-md border border-warning p-3 text-sm" role="status">Preview: this draft is not visible to shoppers.</p>
            }
            <h1 class="mb-4 text-3xl font-bold">{{ p.title }}</h1>
            <div class="space-y-3 text-text [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold" [innerHTML]="p.body"></div>
          </article>
        }
      }
    }
  `,
})
export class StaticPageComponent {
  /** Bound from the `:slug` route parameter (withComponentInputBinding). */
  readonly slug = input.required<string>();
  /** `?preview=1`: staff can view a draft before publishing. */
  readonly preview = input<string | undefined>();

  private readonly seo = inject(SeoService);
  private readonly api = inject(CmsApi);
  private readonly response = inject(RESPONSE_INIT, { optional: true });

  protected readonly page = rxResource({
    params: () => ({ slug: this.slug(), preview: this.preview() === '1' }),
    stream: ({ params }) => this.api.page(params.slug, { preview: params.preview }),
  });

  protected isNotFound(): boolean {
    const error = this.page.error();
    return error instanceof ApiException && error.code === 'not_found';
  }

  constructor() {
    effect(() => {
      // value() throws while the resource is in an error state, so guard first.
      if (this.page.hasValue()) {
        const p = this.page.value();
        this.seo.set({ title: p.seo?.title ?? p.title, description: p.seo?.description, path: `/pages/${p.slug}`, noindex: !!p.preview });
      }
    });
    effect(() => {
      if (this.page.error() && this.isNotFound() && this.response) this.response.status = 404;
    });
  }
}
