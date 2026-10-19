import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

import { Button, ButtonSize, ButtonVariant } from './button';

/** A button that opens the file picker and emits the chosen file. The server checks type and size. */
@Component({
  selector: 'app-file-button',
  imports: [Button],
  template: `
    <input #picker type="file" class="sr-only" [accept]="accept()" (change)="pick($event)" />
    <button
      appButton
      type="button"
      [variant]="variant()"
      [size]="size()"
      [disabled]="disabled()"
      (click)="picker.click()"
    >
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block' },
})
export class FileButton {
  readonly accept = input('image/jpeg,image/png,image/webp');
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('sm');
  readonly disabled = input(false);
  readonly picked = output<File>();

  private readonly picker = viewChild.required<ElementRef<HTMLInputElement>>('picker');

  protected pick(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.picked.emit(file);
    // Same file twice in a row must still trigger a change.
    this.picker().nativeElement.value = '';
  }
}
