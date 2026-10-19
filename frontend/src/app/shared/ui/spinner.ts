import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-spinner',
  template: `<span
      class="block size-5 animate-spin rounded-full border-2 border-border border-t-primary"
    ></span>
    <span class="sr-only">Chargement…</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex', role: 'status' },
})
export class Spinner {}
