import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminPromotionApi } from '@ecom/shared/data-access';
import { ApiException, PROMOTION_KIND_LABEL, type Promotion, SEGMENT_LABEL } from '@ecom/contracts';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, SkeletonComponent } from '@ecom/shared/ui';

/** All promotions with their schedule and rules of engagement; pause, edit or delete each one. */
@Component({
  selector: 'adm-promotions',
  imports: [LocaleDatePipe, RouterLink, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p class="max-w-2xl text-sm text-text-muted">Automatic offers are applied by the cart. When offers conflict, the best allowed outcome wins; an <strong>exclusive</strong> offer never combines with another offer or a coupon. Test a change in the Simulator before it goes live.</p>
      <a uiButton routerLink="/promotions/list/new">New promotion</a>
    </div>
    @if (resource.hasValue()) {
      @if (resource.value().length === 0) {
        <ui-empty-state title="No promotions" description="Create one to apply savings automatically." />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[56rem] text-start text-sm">
            <caption class="sr-only">Promotions</caption>
            <thead class="bg-surface-alt">
              <tr>
                <th scope="col" class="p-2">Name</th>
                <th scope="col" class="p-2">Type</th>
                <th scope="col" class="p-2">Runs</th>
                <th scope="col" class="p-2">Who</th>
                <th scope="col" class="p-2">Stacking</th>
                <th scope="col" class="p-2">Status</th>
                <th scope="col" class="p-2"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (p of resource.value(); track p.id) {
                <tr>
                  <td class="p-2"><a [routerLink]="['/promotions/list', p.id]" class="font-medium text-primary hover:underline">{{ p.name }}</a><span class="block text-xs text-text-muted">Priority {{ p.priority }}</span></td>
                  <td class="p-2">{{ kinds[p.kind] }}</td>
                  <td class="whitespace-nowrap p-2 text-text-muted">{{ p.startsAt ? (p.startsAt | date: 'd MMM y') : 'Always' }} to {{ p.endsAt ? (p.endsAt | date: 'd MMM y') : 'no end' }}</td>
                  <td class="p-2">{{ segments[p.segment] }}</td>
                  <td class="p-2">{{ p.stacking === 'exclusive' ? 'Exclusive' : 'Stackable' }}</td>
                  <td class="p-2"><ui-badge [tone]="p.enabled ? 'success' : 'neutral'">{{ p.enabled ? 'Active' : 'Paused' }}</ui-badge></td>
                  <td class="whitespace-nowrap p-2 text-end">
                    <button uiButton size="sm" variant="ghost" type="button" (click)="toggle(p)">{{ p.enabled ? 'Pause' : 'Resume' }}<span class="sr-only"> {{ p.name }}</span></button>
                    @if (confirming() === p.id) {
                      <button uiButton size="sm" variant="danger" type="button" (click)="remove(p)">Confirm delete<span class="sr-only"> {{ p.name }}</span></button>
                    } @else {
                      <button uiButton size="sm" variant="ghost" type="button" (click)="confirming.set(p.id)">Delete<span class="sr-only"> {{ p.name }}</span></button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class PromotionsPageComponent {
  private readonly api = inject(AdminPromotionApi);
  private readonly toast = inject(ToastService);
  protected readonly resource = rxResource({ stream: () => this.api.list() });
  protected readonly kinds = PROMOTION_KIND_LABEL;
  protected readonly segments = SEGMENT_LABEL;
  protected readonly confirming = signal('');

  constructor() {
    inject(SeoService).set({ title: 'Promotions', noindex: true });
  }

  protected async toggle(p: Promotion): Promise<void> {
    await this.run(() => firstValueFrom(this.api.setEnabled(p.id, !p.enabled)), p.enabled ? `${p.name} paused.` : `${p.name} is active again.`);
  }

  protected async remove(p: Promotion): Promise<void> {
    this.confirming.set('');
    await this.run(() => firstValueFrom(this.api.remove(p.id)), `${p.name} deleted.`);
  }

  private async run(action: () => Promise<unknown>, done: string): Promise<void> {
    try {
      await action();
      this.toast.success(done);
      this.resource.reload();
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'That did not work. Please try again.');
    }
  }
}
