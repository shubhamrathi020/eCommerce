import { PLATFORM_ID, ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { IconComponent } from '../icon/icon';

/** Labelled checkbox with an optional result count (used by filter panels). */
@Component({
  selector: 'ui-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <label class="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
      <input type="checkbox" class="size-5 shrink-0 accent-primary" [checked]="checked()" [disabled]="disabled()" (change)="checked.set($any($event.target).checked)" />
      <span class="flex-1 text-text"><ng-content /></span>
      @if (count() !== null) {
        <span class="text-text-muted">({{ count() }})</span>
      }
    </label>
  `,
})
export class CheckboxComponent {
  readonly checked = model(false);
  readonly disabled = input(false);
  readonly count = input<number | null>(null);
}

/** Removable chip, e.g. an active filter. */
@Component({
  selector: 'ui-chip',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <span class="inline-flex min-h-9 items-center gap-1 rounded-full border border-border-strong bg-surface pl-3 pr-1 text-sm">
      <ng-content />
      @if (removable()) {
        <button type="button" class="inline-flex size-8 items-center justify-center rounded-full hover:bg-surface-alt" [attr.aria-label]="'Remove filter ' + label()" (click)="remove.emit()">
          <ui-icon name="x" [size]="14" />
        </button>
      }
    </span>
  `,
})
export class ChipComponent {
  readonly removable = input(true);
  /** Accessible name for the remove button. */
  readonly label = input('');
  readonly remove = output<void>();
}

/** Counts down to `endsAt`; renders HH:MM:SS. Ticks only in the browser. */
@Component({
  selector: 'ui-countdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block font-mono font-semibold tabular-nums', role: 'timer' },
  template: `{{ text() }}`,
})
export class CountdownComponent {
  readonly endsAt = input.required<string>();
  private readonly now = signal(Date.now());
  protected readonly text = computed(() => {
    const left = Math.max(0, Math.floor((new Date(this.endsAt()).getTime() - this.now()) / 1000));
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;
  });

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    effect((onCleanup) => {
      this.endsAt();
      const id = setInterval(() => this.now.set(Date.now()), 1000);
      onCleanup(() => clearInterval(id));
    });
  }
}
