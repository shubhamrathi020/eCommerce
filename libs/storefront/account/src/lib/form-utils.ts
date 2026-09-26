import type { AbstractControl } from '@angular/forms';

/** Password rule shown next to new-password fields (mirrors the server rule). */
export const PASSWORD_HINT = 'At least 8 characters with upper case, lower case and a number.';

/** A readable message for the first problem on a touched control, or ''. `server` wins when present. */
export function controlError(control: AbstractControl, messages: { required?: string; email?: string; pattern?: string; minlength?: string } = {}, server = ''): string {
  if (server) return server;
  if (!(control.touched && control.invalid)) return '';
  const e = control.errors ?? {};
  if (e['required'] || (e['pattern'] && !String(control.value ?? '').trim())) return messages.required ?? 'This field is required';
  if (e['email']) return messages.email ?? 'Enter a valid email address';
  if (e['pattern']) return messages.pattern ?? 'Enter a valid value';
  if (e['minlength']) return messages.minlength ?? 'This is too short';
  return 'Enter a valid value';
}
