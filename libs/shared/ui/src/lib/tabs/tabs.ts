import { ChangeDetectionStrategy, Component, Directive, TemplateRef, contentChildren, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

/** One tab panel. Content is lazy: rendered only while its tab is selected. */
@Directive({ selector: 'ng-template[uiTab]' })
export class TabDirective {
  readonly label = input.required<string>({ alias: 'uiTab' });
  readonly template = inject(TemplateRef);
}

let nextId = 0;

/** Accessible tabs (arrow keys, Home/End) driven by `<ng-template uiTab="Label">` children. */
@Component({
  selector: 'ui-tabs',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div role="tablist" class="flex gap-1 overflow-x-auto border-b border-border" [attr.aria-label]="label()">
      @for (tab of tabs(); track $index) {
        <button
          type="button"
          role="tab"
          [id]="uid + '-tab-' + $index"
          [attr.aria-selected]="selected() === $index"
          [attr.aria-controls]="uid + '-panel-' + $index"
          [tabindex]="selected() === $index ? 0 : -1"
          class="min-h-11 shrink-0 border-b-2 px-4 font-medium"
          [class]="selected() === $index ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'"
          (click)="select($index)"
          (keydown)="onKeydown($event)"
        >
          {{ tab.label() }}
        </button>
      }
    </div>
    @for (tab of tabs(); track $index) {
      @if (selected() === $index) {
        <div role="tabpanel" tabindex="0" class="pt-4" [id]="uid + '-panel-' + $index" [attr.aria-labelledby]="uid + '-tab-' + $index">
          <ng-container [ngTemplateOutlet]="tab.template" />
        </div>
      }
    }
  `,
})
export class TabsComponent {
  readonly label = input('Sections');
  protected readonly uid = `ui-tabs-${nextId++}`;
  protected readonly tabs = contentChildren(TabDirective);
  protected readonly selected = signal(0);

  protected select(index: number): void {
    this.selected.set(index);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.tabs().length;
    const move = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    let next = this.selected();
    if (move) next = (next + move + count) % count;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = count - 1;
    else return;
    event.preventDefault();
    this.selected.set(next);
    (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  }
}
