import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService, type ThemePreference, ThemeService, TranslatePipe } from '@ecom/shared/core';
import { InputDirective } from '../form-field/form-field';

let nextId = 0;

/** Light, dark or follow-my-device (LX-04). */
@Component({
  selector: 'ui-theme-toggle',
  imports: [InputDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-2 text-sm' },
  template: `
    <label [attr.for]="id" class="text-text-muted">{{ 'theme.label' | t }}</label>
    <select uiInput class="!w-auto !min-h-9 !py-1" [id]="id" (change)="theme.set($any($event.target).value)">
      @for (o of options; track o) {
        <option [value]="o" [selected]="theme.preference() === o">{{ 'theme.' + o | t }}</option>
      }
    </select>
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly id = `theme-${nextId++}`;
  protected readonly options: ThemePreference[] = ['system', 'light', 'dark'];
}

/** Language menu (LX-01). A draft translation is labelled as one. */
@Component({
  selector: 'ui-language-picker',
  imports: [InputDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex flex-col gap-1 text-sm' },
  template: `
    <span class="inline-flex items-center gap-2">
      <label [attr.for]="id" class="text-text-muted">{{ 'lang.label' | t }}</label>
      <select uiInput class="!w-auto !min-h-9 !py-1" [id]="id" (change)="i18n.set($any($event.target).value)">
        @for (l of i18n.available; track l.code) {
          <option [value]="l.code" [attr.lang]="l.html" [selected]="i18n.locale() === l.code">{{ l.label }}{{ l.draft ? ' (' + ('lang.draft' | t) + ')' : '' }}</option>
        }
      </select>
    </span>
    @if (i18n.info().draft) {
      <span class="max-w-md text-xs text-text-muted">{{ 'lang.note' | t }}</span>
    }
  `,
})
export class LanguagePickerComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly id = `lang-${nextId++}`;
}
