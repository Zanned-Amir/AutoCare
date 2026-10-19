import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import { Button } from './button';
import { Icon } from './icon';

/** "Exporter CSV" button: runs `exporter` once at a time and shows a failure inline. */
@Component({
  selector: 'app-export-button',
  imports: [Button, Icon],
  template: `
    <button
      appButton
      variant="secondary"
      type="button"
      [disabled]="busy()"
      [attr.aria-busy]="busy()"
      [title]="error() ?? 'Exporte la liste filtrée (5000 lignes au plus)'"
      (click)="run()"
    >
      <svg appIcon [name]="error() ? 'info' : 'download'" class="size-4"></svg>
      {{ busy() ? 'Export…' : error() ? 'Réessayer l’export' : label() }}
    </button>
  `,
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportButton {
  readonly exporter = input.required<() => Promise<void>>();
  readonly label = input('Exporter CSV');

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected run(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.exporter()()
      .catch(() => this.error.set('Export impossible, réessayez.'))
      .finally(() => this.busy.set(false));
  }
}
