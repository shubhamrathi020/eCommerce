import { ChangeDetectionStrategy, Component, Directive, input } from '@angular/core';

let nextId = 0;

/** Styles a native input/select/textarea. Wire `id` and `aria-describedby` from the parent form field. */
@Directive({
  selector: 'input[uiInput], textarea[uiInput], select[uiInput]',
  host: {
    class:
      'block min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-text ' +
      'placeholder:text-text-muted disabled:opacity-50 aria-[invalid=true]:border-danger',
  },
})
export class InputDirective {}

/** Label + hint + error wrapper. Give the control `[id]="field.id"` and `[attr.aria-describedby]="field.describedBy()"`. */
@Component({
  selector: 'ui-form-field',
  exportAs: 'uiFormField',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <label [attr.for]="id" class="mb-1 block text-sm font-medium text-text">
      {{ label() }}
      @if (required()) {
        <span aria-hidden="true" class="text-danger">*</span>
      }
    </label>
    <ng-content />
    @if (error()) {
      <p [id]="id + '-error'" class="mt-1 text-sm text-danger" role="alert">{{ error() }}</p>
    } @else if (hint()) {
      <p [id]="id + '-hint'" class="mt-1 text-sm text-text-muted">{{ hint() }}</p>
    }
  `,
})
export class FormFieldComponent {
  readonly id = `ui-field-${nextId++}`;
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly error = input('');
  readonly required = input(false);

  describedBy(): string | null {
    if (this.error()) return `${this.id}-error`;
    if (this.hint()) return `${this.id}-hint`;
    return null;
  }
}
