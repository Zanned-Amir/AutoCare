import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';

import { Badge } from '@shared/ui';
import { Role, summarizeAccess } from '../roles.types';

/** toutestcasa RoleCard: the whole card opens the role; Modifier jumps into edit mode. */
@Component({
  selector: 'app-role-card',
  imports: [Badge],
  template: `
    <div
      role="link"
      tabindex="0"
      class="flex h-full w-full cursor-pointer flex-col gap-3.5 rounded-2xl border border-border-subtle bg-surface p-6 text-left shadow-card transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none"
      (click)="open(false)"
      (keydown.enter)="open(false)"
      (keydown.space)="$event.preventDefault(); open(false)"
    >
      <div class="flex items-center justify-between gap-3">
        <h3 class="truncate text-h4 text-foreground">{{ role().label }}</h3>
        <app-badge tone="neutral" class="shrink-0">{{ members() }}</app-badge>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <span class="font-mono text-caption text-foreground-muted">{{ role().name }}</span>
        @if (role().system) {
          <app-badge tone="info">Système</app-badge>
        }
        @if (role().backoffice) {
          <app-badge tone="primary">Backoffice</app-badge>
        }
      </div>
      <p class="line-clamp-2 text-body-sm text-foreground-secondary">
        {{ role().description || 'Aucune description' }}
      </p>
      <p class="truncate text-caption">
        <span class="text-foreground-muted">Accès : </span>
        <span class="text-primary">{{ access() }}</span>
      </p>
      <div class="mt-auto h-px w-full bg-border-subtle"></div>
      <div class="flex items-center gap-4">
        @if (canManage()) {
          <button
            type="button"
            class="text-button text-primary hover:text-primary-hover"
            (click)="$event.stopPropagation(); open(true)"
          >
            Modifier
          </button>
          @if (!role().system) {
            <button
              type="button"
              class="text-button text-error hover:underline"
              (click)="$event.stopPropagation(); deleted.emit(role())"
            >
              Supprimer
            </button>
          }
        } @else {
          <span class="text-button text-primary">Voir</span>
        }
      </div>
    </div>
  `,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleCard {
  readonly role = input.required<Role>();
  readonly canManage = input(false);
  readonly deleted = output<Role>();

  private readonly router = inject(Router);
  protected readonly access = computed(() => summarizeAccess(this.role().permissions));
  protected readonly members = computed(() => {
    const count = this.role().memberCount;
    return `${count} membre${count > 1 ? 's' : ''}`;
  });

  protected open(edit: boolean): void {
    void this.router.navigate(['/admin/roles', this.role().id], {
      queryParams: edit ? { edit: 1 } : {},
    });
  }
}
