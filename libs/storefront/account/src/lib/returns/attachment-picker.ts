import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ATTACHMENT_LIMITS, type AttachmentMeta, attachmentProblem } from '@ecom/contracts';

let nextId = 0;

/**
 * Chooses photos or documents to attach (RF-08). Type, size and count are checked here for instant feedback and again
 * by the API. Only name, type and size travel in the mock; a real backend would upload the bytes after the same checks.
 */
@Component({
  selector: 'app-attachment-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [attr.for]="id" class="mb-1 block text-sm font-medium">{{ label() }}</label>
    <input [id]="id" type="file" multiple [accept]="accept" class="block w-full text-sm" [attr.aria-describedby]="id + '-hint'" (change)="pick($any($event.target).files)" />
    <p [id]="id + '-hint'" class="mt-1 text-sm text-text-muted">Up to {{ limits.maxCount }} files, JPEG, PNG, WebP or PDF, {{ limits.maxBytes / 1024 / 1024 }} MB each.</p>
    @if (problem()) {
      <p class="mt-1 text-sm text-danger" role="alert">{{ problem() }}</p>
    }
    @if (files().length) {
      <ul class="mt-2 text-sm" aria-label="Chosen files">
        @for (f of files(); track f.name) {
          <li>{{ f.name }} <span class="text-text-muted">({{ kb(f.size) }} KB)</span></li>
        }
      </ul>
    }
  `,
})
export class AttachmentPickerComponent {
  readonly label = input('Attach photos (optional)');
  /** Emits the accepted files; an empty list when the choice has a problem. */
  readonly changed = output<AttachmentMeta[]>();

  protected readonly id = `attachments-${nextId++}`;
  protected readonly limits = ATTACHMENT_LIMITS;
  protected readonly accept = ATTACHMENT_LIMITS.types.join(',');
  protected readonly files = signal<AttachmentMeta[]>([]);
  protected readonly problem = signal('');

  protected kb(size: number): number {
    return Math.max(1, Math.round(size / 1024));
  }

  protected pick(list: FileList | null): void {
    const chosen: AttachmentMeta[] = Array.from(list ?? []).map((f) => ({ name: f.name, type: f.type, size: f.size }));
    const problem = attachmentProblem(chosen);
    this.problem.set(problem ?? '');
    this.files.set(problem ? [] : chosen);
    this.changed.emit(problem ? [] : chosen);
  }
}
