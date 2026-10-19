import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { cn } from '@shared/utils/cn';
import { formatDateTime } from '../helpdesk.format';
import { TicketMessage } from '../helpdesk.types';

/** Conversation of a ticket. Agents also see internal notes (amber). */
@Component({
  selector: 'app-ticket-thread',
  template: `
    <ol class="flex flex-col gap-3">
      <li class="rounded-card border border-border-subtle bg-surface p-4">
        <p class="text-caption text-foreground-muted">
          {{ openedBy() }} · {{ format(openedAt()) }}
        </p>
        <p class="mt-1 whitespace-pre-line text-body">{{ description() }}</p>
      </li>
      @for (message of messages(); track message.id) {
        <li [class]="bubble(message)">
          <p class="text-caption text-foreground-muted">
            {{ author(message) }} · {{ format(message.createdAt) }}
            @if (message.internal) {
              · <strong class="text-warning">Note interne</strong>
            }
          </p>
          <p class="mt-1 whitespace-pre-line text-body">{{ message.body }}</p>
        </li>
      }
    </ol>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketThread {
  readonly description = input.required<string>();
  readonly openedAt = input.required<string>();
  readonly openedBy = input('Vous');
  readonly messages = input.required<TicketMessage[]>();
  /** Agent view shows agent names; the customer sees "Support AutoCare". */
  readonly agentView = input(false);

  protected readonly format = formatDateTime;

  protected author(message: TicketMessage): string {
    if (message.authorType === 'CUSTOMER')
      return this.agentView() ? (message.authorName ?? 'Client') : 'Vous';
    if (message.authorType === 'SYSTEM') return 'AutoCare';
    return this.agentView() ? (message.authorName ?? 'Agent') : 'Support AutoCare';
  }

  protected bubble(message: TicketMessage): string {
    return cn(
      'rounded-card border p-4',
      message.internal
        ? 'border-warning/30 bg-warning-subtle'
        : message.authorType === 'AGENT'
          ? 'border-primary/20 bg-primary-subtle'
          : 'border-border-subtle bg-surface',
    );
  }
}
