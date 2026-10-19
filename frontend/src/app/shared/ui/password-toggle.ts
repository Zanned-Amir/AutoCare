import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';

import { Icon } from './icon';

/** Wrap a password input to add the show / hide eye: `<app-password-toggle><input type="password" …></app-password-toggle>`. */
@Component({
  selector: 'app-password-toggle',
  imports: [Icon],
  template: `
    <ng-content />
    <button
      type="button"
      class="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-foreground-muted hover:bg-surface-muted hover:text-foreground"
      [attr.aria-label]="visible() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
      [attr.aria-pressed]="visible()"
      (click)="toggle()"
    >
      <svg appIcon [name]="visible() ? 'eye-off' : 'eye'" class="size-5"></svg>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block [&_input]:pr-12' },
})
export class PasswordToggle {
  protected readonly visible = signal(false);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected toggle(): void {
    const input = (this.host.nativeElement as HTMLElement).querySelector('input');
    if (!input) return;
    this.visible.update((v) => !v);
    input.type = this.visible() ? 'text' : 'password';
  }
}
