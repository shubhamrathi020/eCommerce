import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ReviewApi, REVIEW_LIMITS } from '@ecom/shared/data-access';
import type { Review } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { ButtonComponent, FormFieldComponent, InputDirective, RatingInputComponent } from '@ecom/shared/ui';

/** Write a new review or edit your own. Server rules (length, checks) are applied by the API; this only guides. */
@Component({
  selector: 'app-review-form',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, InputDirective, RatingInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4 rounded-lg border border-border p-4" aria-label="Review form">
      @if (formError()) {
        <p class="rounded-md border border-danger p-3 text-sm" role="alert">{{ formError() }}</p>
      }
      <div>
        <p id="rating-label" class="mb-1 text-sm font-medium">Your rating <span aria-hidden="true" class="text-danger">*</span></p>
        <ui-rating-input label="Your rating" [invalid]="!!ratingError()" [value]="form.controls.rating.value" (valueChange)="setRating($event)" />
        @if (ratingError()) {
          <p class="mt-1 text-sm text-danger" role="alert">{{ ratingError() }}</p>
        }
      </div>
      <ui-form-field #a="uiFormField" label="Title" [required]="true" [error]="fieldError('title')">
        <input uiInput [id]="a.id" formControlName="title" [attr.maxlength]="limits.titleMax" [attr.aria-describedby]="a.describedBy()" [attr.aria-invalid]="fieldError('title') ? 'true' : null" />
      </ui-form-field>
      <ui-form-field #b="uiFormField" label="Your review" [required]="true" [error]="fieldError('body')" [hint]="form.controls.body.value.length + ' / ' + limits.bodyMax + ' characters'">
        <textarea uiInput rows="4" [id]="b.id" formControlName="body" [attr.maxlength]="limits.bodyMax" [attr.aria-describedby]="b.describedBy()" [attr.aria-invalid]="fieldError('body') ? 'true' : null"></textarea>
      </ui-form-field>
      <div class="flex gap-2">
        <button uiButton type="submit" [loading]="busy()">{{ existing() ? 'Save review' : 'Submit review' }}</button>
        <button uiButton variant="secondary" type="button" (click)="cancelled.emit()">Cancel</button>
      </div>
    </form>
  `,
})
export class ReviewFormComponent {
  readonly productId = input.required<string>();
  /** Set when editing. */
  readonly existing = input<Review | undefined>();
  readonly saved = output<Review>();
  readonly cancelled = output<void>();

  private readonly api = inject(ReviewApi);
  protected readonly limits = REVIEW_LIMITS;
  protected readonly busy = signal(false);
  protected readonly formError = signal('');
  private readonly serverFields = signal<Record<string, string>>({});
  private readonly attempted = signal(false);

  protected readonly form = new FormGroup({
    rating: new FormControl(0, { nonNullable: true, validators: [Validators.min(1)] }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    body: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(REVIEW_LIMITS.bodyMin)] }),
  });

  constructor() {
    // Editing: start from the current review.
    effect(() => {
      const e = this.existing();
      if (e) untracked(() => this.form.setValue({ rating: e.rating, title: e.title, body: e.body }));
    });
  }

  protected setRating(value: number): void {
    this.form.controls.rating.setValue(value);
    this.serverFields.update((f) => ({ ...f, rating: '' }));
  }

  protected ratingError(): string {
    return this.serverFields()['rating'] || (this.attempted() && this.form.controls.rating.value < 1 ? 'Choose a rating from 1 to 5 stars' : '');
  }

  protected fieldError(name: 'title' | 'body'): string {
    const server = this.serverFields()[name];
    if (server) return server;
    const c = this.form.controls[name];
    if (!(c.touched && c.invalid)) return '';
    return name === 'body' && c.value.trim() ? `Write at least ${REVIEW_LIMITS.bodyMin} characters` : 'This field is required';
  }

  protected async submit(): Promise<void> {
    this.formError.set('');
    this.serverFields.set({});
    this.attempted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    try {
      const { rating, title, body } = this.form.getRawValue();
      const e = this.existing();
      const review = e ? await firstValueFrom(this.api.updateMine(e.id, { rating, title, body })) : await firstValueFrom(this.api.submit({ productId: this.productId(), rating, title, body }));
      this.saved.emit(review);
    } catch (error) {
      if (error instanceof ApiException) {
        this.formError.set(error.message);
        this.serverFields.set(error.fields ?? {});
      } else {
        this.formError.set('We could not save your review. Please try again.');
      }
    } finally {
      this.busy.set(false);
    }
  }
}
