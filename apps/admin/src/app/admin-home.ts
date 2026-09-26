import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Placeholder until the admin BRD is written; proves the app builds on the shared design system. */
@Component({
  selector: 'adm-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen">
      <nav aria-label="Admin" class="w-56 border-r border-border bg-surface-alt p-4">
        <p class="text-lg font-bold text-primary">Shop Admin</p>
      </nav>
      <main class="flex-1 p-6">
        <h1 class="text-2xl font-bold">Admin console</h1>
        <p class="mt-2 text-text-muted">Coming after the storefront slices. See the admin module BRD (not yet written).</p>
      </main>
    </div>
  `,
})
export class AdminHomeComponent {}
