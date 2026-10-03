import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminAnalyticsApi } from '@ecom/shared/data-access';
import { ApiException, REPORT_DAYS, REPORT_LABEL, type ReportKey, type ReportSchedule } from '@ecom/contracts';
import { AuthStore } from '@ecom/shared/state';
import { ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';

const REPORTS = Object.keys(REPORT_LABEL) as ReportKey[];

/** Scheduled reports (AN-06). In this demo they are delivered to the mock mailbox; the real backend sends them by email from a scheduled job. */
@Component({
  selector: 'adm-report-schedules',
  imports: [LocaleDatePipe, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="mb-6 grid max-w-3xl gap-3 sm:grid-cols-5 sm:items-start" (submit)="create($event)" novalidate aria-label="Schedule a report">
      <ui-form-field #r="uiFormField" label="Report" [error]="errors()['report'] ?? ''">
        <select uiInput [id]="r.id" [attr.aria-describedby]="r.describedBy()" (change)="report.set($any($event.target).value)">
          @for (k of reports; track k) {
            <option [value]="k" [selected]="report() === k">{{ labels[k] }}</option>
          }
        </select>
      </ui-form-field>
      <ui-form-field #d="uiFormField" label="Covers" [error]="errors()['days'] ?? ''">
        <select uiInput [id]="d.id" [attr.aria-describedby]="d.describedBy()" (change)="days.set($any($event.target).value)">
          @for (n of periods; track n) {
            <option [value]="n" [selected]="days() === '' + n">Last {{ n }} days</option>
          }
        </select>
      </ui-form-field>
      <ui-form-field #f="uiFormField" label="Sent" [error]="errors()['frequency'] ?? ''">
        <select uiInput [id]="f.id" [attr.aria-describedby]="f.describedBy()" (change)="frequency.set($any($event.target).value)">
          <option value="weekly" [selected]="frequency() === 'weekly'">Every week</option>
          <option value="daily" [selected]="frequency() === 'daily'">Every day</option>
        </select>
      </ui-form-field>
      <ui-form-field #to="uiFormField" label="Send to" [required]="true" [error]="errors()['recipient'] ?? ''">
        <input uiInput type="email" [id]="to.id" [value]="recipient()" [attr.aria-describedby]="to.describedBy()" [attr.aria-invalid]="errors()['recipient'] ? 'true' : null" (input)="recipient.set($any($event.target).value)" />
      </ui-form-field>
      <div class="sm:pt-6"><button uiButton type="submit" [loading]="saving()">Schedule</button></div>
    </form>
    @if (formError()) {
      <p class="mb-4 text-sm text-danger" role="alert">{{ formError() }}</p>
    }

    @if (resource.hasValue()) {
      @if (resource.value().length === 0) {
        <ui-empty-state title="No scheduled reports" description="Schedule one above and it will arrive in the mock mailbox." />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[44rem] text-start text-sm">
            <caption class="sr-only">Scheduled reports</caption>
            <thead class="bg-surface-alt"><tr><th scope="col" class="p-2">Report</th><th scope="col" class="p-2">Sent</th><th scope="col" class="p-2">To</th><th scope="col" class="p-2">Last sent</th><th scope="col" class="p-2">Next</th><th scope="col" class="p-2"><span class="sr-only">Actions</span></th></tr></thead>
            <tbody class="divide-y divide-border">
              @for (s of resource.value(); track s.id) {
                <tr>
                  <td class="p-2">{{ labels[s.report] }}<span class="block text-xs text-text-muted">last {{ s.days }} days</span></td>
                  <td class="p-2">{{ s.frequency === 'daily' ? 'Every day' : 'Every week' }}</td>
                  <td class="p-2">{{ s.recipient }}</td>
                  <td class="whitespace-nowrap p-2 text-text-muted">{{ s.lastRunAt ? (s.lastRunAt | date: 'd MMM, h:mm a') : 'Never' }}</td>
                  <td class="whitespace-nowrap p-2 text-text-muted">{{ s.nextRunAt | date: 'd MMM, h:mm a' }}</td>
                  <td class="whitespace-nowrap p-2 text-end">
                    <button uiButton size="sm" variant="secondary" type="button" (click)="sendNow(s)">Send now<span class="sr-only"> {{ labels[s.report] }}</span></button>
                    <button uiButton size="sm" variant="ghost" type="button" (click)="remove(s)">Remove<span class="sr-only"> {{ labels[s.report] }}</span></button>
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
      <ui-skeleton class="h-32" />
    }
  `,
})
export class ReportSchedulesPageComponent {
  private readonly api = inject(AdminAnalyticsApi);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthStore);
  protected readonly resource = rxResource({ stream: () => this.api.schedules() });

  protected readonly reports = REPORTS;
  protected readonly labels = REPORT_LABEL;
  protected readonly periods = REPORT_DAYS;
  protected readonly report = signal<ReportKey>('products');
  protected readonly days = signal('30');
  protected readonly frequency = signal<ReportSchedule['frequency']>('weekly');
  protected readonly recipient = signal(this.auth.user()?.email ?? '');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly formError = signal('');
  protected readonly saving = signal(false);

  constructor() {
    inject(SeoService).set({ title: 'Scheduled reports', noindex: true });
  }

  protected async create(event: Event): Promise<void> {
    event.preventDefault();
    this.errors.set({});
    this.formError.set('');
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.createSchedule({ report: this.report(), days: Number(this.days()), frequency: this.frequency(), recipient: this.recipient() }));
      this.toast.success('Report scheduled.');
      this.resource.reload();
    } catch (e) {
      if (e instanceof ApiException) {
        this.errors.set(e.fields ?? {});
        this.formError.set(e.fields ? '' : e.message);
      } else this.formError.set('Could not schedule the report.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async sendNow(s: ReportSchedule): Promise<void> {
    try {
      await firstValueFrom(this.api.sendNow(s.id));
      this.toast.success(`${REPORT_LABEL[s.report]} sent to ${s.recipient}.`);
      this.resource.reload();
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'Could not send the report.');
    }
  }

  protected async remove(s: ReportSchedule): Promise<void> {
    try {
      await firstValueFrom(this.api.removeSchedule(s.id));
      this.resource.reload();
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'Could not remove the schedule.');
    }
  }
}
