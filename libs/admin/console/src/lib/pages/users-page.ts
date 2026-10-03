import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminUserApi } from '@ecom/shared/data-access';
import type { AdminUser } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { AuthStore } from '@ecom/shared/state';
import { BadgeComponent, ErrorStateComponent, SkeletonComponent } from '@ecom/shared/ui';

@Component({
  selector: 'adm-users',
  imports: [LocaleDatePipe, BadgeComponent, ErrorStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-4 text-2xl font-bold">Users</h1>
    @if (users().length) {
      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full min-w-[40rem] text-start text-sm">
          <caption class="sr-only">Users and roles</caption>
          <thead class="bg-surface-alt"><tr><th scope="col" class="p-2">Name</th><th scope="col" class="p-2">Email</th><th scope="col" class="p-2">Roles</th><th scope="col" class="p-2 text-end">Orders</th><th scope="col" class="p-2">Joined</th><th scope="col" class="p-2"><span class="sr-only">Actions</span></th></tr></thead>
          <tbody class="divide-y divide-border">
            @for (u of users(); track u.id) {
              <tr>
                <th scope="row" class="p-2 font-medium">{{ u.name }}</th>
                <td class="p-2">{{ u.email }}@if (!u.emailVerified) { <span class="ms-1 text-xs text-warning">(unverified)</span> }</td>
                <td class="p-2">@for (r of u.roles; track r) { <ui-badge [tone]="r === 'admin' ? 'primary' : 'neutral'" class="me-1">{{ r }}</ui-badge> }</td>
                <td class="p-2 text-end">{{ u.ordersCount }}</td>
                <td class="p-2 text-text-muted">{{ u.createdAt | date: 'd MMM y' }}</td>
                <td class="p-2 text-end">
                  @if (u.id !== me()?.id) {
                    <button type="button" class="min-h-11 px-2 font-medium text-primary hover:underline" (click)="toggleAdmin(u)">{{ isAdmin(u) ? 'Revoke admin' : 'Grant admin' }}<span class="sr-only"> for {{ u.name }}</span></button>
                  } @else {
                    <span class="text-xs text-text-muted">You</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-32" />
    }
  `,
})
export class UsersPageComponent {
  private readonly api = inject(AdminUserApi);
  private readonly toast = inject(ToastService);
  protected readonly me = inject(AuthStore).user;

  protected readonly resource = rxResource({ stream: () => this.api.list() });
  private readonly override = signal<AdminUser[] | null>(null);
  protected readonly users = computed<AdminUser[]>(() => this.override() ?? (this.resource.hasValue() ? this.resource.value() : []));

  constructor() {
    inject(SeoService).set({ title: 'Users', noindex: true });
  }

  protected isAdmin(u: AdminUser): boolean {
    return u.roles.includes('admin');
  }

  protected async toggleAdmin(u: AdminUser): Promise<void> {
    const grant = !this.isAdmin(u);
    try {
      this.override.set(await firstValueFrom(this.api.setRole(u.id, 'admin', grant)));
      this.toast.success(`${grant ? 'Granted' : 'Revoked'} admin for ${u.name}`);
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'Could not change the role.');
    }
  }
}
