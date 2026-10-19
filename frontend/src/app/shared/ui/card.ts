import { ChangeDetectionStrategy, Component } from '@angular/core';

/** White surface, 24px radius, hairline border and a soft raised shadow. */
@Component({
  selector: 'app-card',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block rounded-card border border-border-subtle bg-surface p-6 shadow-card' },
})
export class Card {}
