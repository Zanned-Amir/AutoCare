import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  model,
  viewChildren,
} from '@angular/core';

/** One box per digit; typing moves forward, Backspace goes back, a pasted code fills every box. */
@Component({
  selector: 'app-otp-input',
  template: `
    <div class="flex items-center justify-center gap-2" role="group" [attr.aria-label]="label()">
      @for (index of indexes(); track index) {
        <input
          #box
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="1"
          [attr.aria-label]="'Chiffre ' + (index + 1)"
          [value]="value()[index] ?? ''"
          (input)="type(index, $event)"
          (keydown)="key(index, $event)"
          (paste)="paste($event)"
          class="size-12 rounded-xl border border-border bg-surface text-center text-h4 text-primary outline-none focus:border-2 focus:border-primary sm:size-14"
        />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpInput {
  readonly length = input(6);
  readonly label = input('Code de vérification');
  readonly value = model('');

  protected readonly indexes = computed(() => Array.from({ length: this.length() }, (_, i) => i));
  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('box');

  protected type(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const digit = target.value.replace(/\D/g, '').slice(-1);
    const chars = this.value().padEnd(this.length(), ' ').split('');
    chars[index] = digit || ' ';
    this.value.set(chars.join('').trimEnd());
    target.value = digit;
    if (digit) this.focus(index + 1);
  }

  protected key(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !(event.target as HTMLInputElement).value)
      this.focus(index - 1);
    if (event.key === 'ArrowLeft') this.focus(index - 1);
    if (event.key === 'ArrowRight') this.focus(index + 1);
  }

  protected paste(event: ClipboardEvent): void {
    const digits = (event.clipboardData?.getData('text') ?? '')
      .replace(/\D/g, '')
      .slice(0, this.length());
    if (!digits) return;
    event.preventDefault();
    this.value.set(digits);
    this.focus(Math.min(digits.length, this.length() - 1));
  }

  private focus(index: number): void {
    this.boxes()[index]?.nativeElement.focus();
  }
}
