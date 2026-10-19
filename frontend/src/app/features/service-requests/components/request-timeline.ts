import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { StatusChange, requestStatusLabels } from '../service-requests.types';

const dateFormat = new Intl.DateTimeFormat('fr-TN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  hourCycle: 'h23',
});

@Component({
  selector: 'app-request-timeline',
  template: `
    <ol class="flex flex-col gap-3 border-l-2 border-border-subtle pl-5">
      @for (change of history(); track $index) {
        <li class="relative">
          <span
            class="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-surface bg-primary"
          ></span>
          <p class="text-label text-foreground">{{ labels[change.toStatus] }}</p>
          <p class="text-caption text-foreground-muted">
            {{ format(change.createdAt) }} ·
            {{ change.actor === 'CLIENT' ? 'Client' : 'Prestataire' }}
          </p>
          @if (change.note; as note) {
            <p class="text-body-sm text-foreground-secondary">« {{ note }} »</p>
          }
        </li>
      }
    </ol>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestTimeline {
  readonly history = input.required<StatusChange[]>();
  protected readonly labels = requestStatusLabels;

  protected format(value: string): string {
    return dateFormat.format(new Date(value));
  }
}
