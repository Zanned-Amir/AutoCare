import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import { memberRoleLabels, memberStatusLabels } from '@features/organizations/organizations.types';
import { Button, Card, Spinner } from '@shared/ui';
import { injectAuditTrailQuery } from '../audit.queries';
import { AuditLog, AuditTargetType, auditActionLabels } from '../audit.types';

const dateFormat = new Intl.DateTimeFormat('fr-TN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  hourCycle: 'h23',
});

/** Who did what to this user, organization or service, newest first (backoffice detail pages). */
@Component({
  selector: 'app-audit-trail',
  imports: [Button, Card, Spinner],
  template: `
    <app-card class="p-0">
      <div class="px-5 pt-5 pb-3">
        <h2 class="text-h4">Historique des actions</h2>
        <p class="text-caption text-foreground-muted">
          Actions de l’équipe, les plus récentes d’abord
        </p>
      </div>
      @if (trail.isPending()) {
        <div class="px-5 pb-5"><app-spinner /></div>
      } @else if (trail.data(); as page) {
        <ol class="divide-y divide-border-subtle">
          @for (log of page.content; track log.id) {
            <li class="px-5 py-3">
              <p class="text-body-sm text-foreground">
                <span class="font-semibold">{{ log.actorName ?? 'Compte supprimé' }}</span>
                {{ label(log) }}
              </p>
              @if (detail(log); as text) {
                <p class="text-body-sm text-foreground-secondary">{{ text }}</p>
              }
              <p class="text-caption text-foreground-muted">{{ format(log.createdAt) }}</p>
            </li>
          } @empty {
            <li class="px-5 pb-5 text-body-sm text-foreground-muted">
              Aucune action enregistrée pour l’instant.
            </li>
          }
        </ol>
        @if (page.page.totalPages > 1) {
          <div
            class="flex items-center justify-between border-t border-border-subtle px-5 py-3 text-body-sm"
          >
            <span class="text-foreground-secondary"
              >Page {{ page.page.number + 1 }} / {{ page.page.totalPages }}</span
            >
            <div class="flex gap-2">
              <button
                appButton
                variant="secondary"
                size="sm"
                type="button"
                [disabled]="page.page.number === 0"
                (click)="pageIndex.set(page.page.number - 1)"
              >
                Précédent
              </button>
              <button
                appButton
                variant="secondary"
                size="sm"
                type="button"
                [disabled]="page.page.number + 1 >= page.page.totalPages"
                (click)="pageIndex.set(page.page.number + 1)"
              >
                Suivant
              </button>
            </div>
          </div>
        }
      }
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditTrail {
  readonly targetType = input.required<AuditTargetType>();
  readonly targetId = input.required<number>();

  protected readonly pageIndex = signal(0);
  protected readonly trail = injectAuditTrailQuery(() => ({
    type: this.targetType(),
    id: this.targetId(),
    page: this.pageIndex(),
  }));

  protected label(log: AuditLog): string {
    return auditActionLabels[log.action] ?? log.action;
  }

  protected detail(log: AuditLog): string | null {
    const { roles, memberName, value } = log.details;
    if (roles) return `Rôles : ${roles.join(', ')}`;
    if (!memberName && !value) return null;
    const valueLabel =
      value && value in memberRoleLabels
        ? memberRoleLabels[value as keyof typeof memberRoleLabels]
        : value && value in memberStatusLabels
          ? memberStatusLabels[value as keyof typeof memberStatusLabels]
          : value;
    return [memberName, valueLabel].filter(Boolean).join(' · ');
  }

  protected format(value: string): string {
    return dateFormat.format(new Date(value));
  }
}
