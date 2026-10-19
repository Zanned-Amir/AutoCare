import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';

import { Badge, Button, Modal, Spinner } from '@shared/ui';
import { injectRolesQuery } from '../roles.queries';
import { summarizeAccess } from '../roles.types';

/** Picks the platform roles of one account (backoffice user page). */
@Component({
  selector: 'app-assign-roles-dialog',
  imports: [Badge, Button, Modal, Spinner],
  template: `
    <app-modal
      title="Rôles du compte"
      description="Les permissions de tous les rôles cochés s’additionnent."
      [open]="open()"
      (closed)="cancelled.emit()"
    >
      @if (roles.isPending()) {
        <app-spinner />
      } @else {
        <ul
          class="flex flex-col divide-y divide-border-subtle rounded-xl border border-border-subtle"
        >
          @for (role of roles.data() ?? []; track role.id) {
            <li>
              <label
                class="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-background-subtle"
              >
                <input
                  type="checkbox"
                  class="mt-1 size-4 accent-primary"
                  [checked]="selected().includes(role.name)"
                  (change)="toggle(role.name, $any($event.target).checked)"
                />
                <span class="min-w-0 flex-1">
                  <span class="flex flex-wrap items-center gap-2">
                    <span class="text-label text-foreground">{{ role.label }}</span>
                    <span class="font-mono text-caption text-foreground-muted">{{
                      role.name
                    }}</span>
                    @if (role.backoffice) {
                      <app-badge tone="primary">Backoffice</app-badge>
                    }
                  </span>
                  <span class="block truncate text-caption text-foreground-secondary">{{
                    access(role.permissions)
                  }}</span>
                </span>
              </label>
            </li>
          }
        </ul>
      }
      @if (error(); as message) {
        <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
          {{ message }}
        </p>
      }
      <button footer appButton variant="secondary" type="button" (click)="cancelled.emit()">
        Annuler
      </button>
      <button
        footer
        appButton
        type="button"
        [disabled]="!canSave() || busy()"
        (click)="saved.emit(selected())"
      >
        Enregistrer
      </button>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignRolesDialog {
  readonly open = input(false);
  readonly current = input<string[]>([]);
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly saved = output<string[]>();
  readonly cancelled = output<void>();

  protected readonly roles = injectRolesQuery(() => this.open());
  // Starts again from the account's roles each time the dialog opens.
  protected readonly selected = linkedSignal(() => (this.open(), [...this.current()].sort()));
  protected readonly canSave = computed(
    () =>
      this.selected().length > 0 && this.selected().join() !== [...this.current()].sort().join(),
  );

  protected access(permissions: string[]): string {
    return summarizeAccess(permissions);
  }

  protected toggle(name: string, checked: boolean): void {
    this.selected.update((names) =>
      (checked ? [...names, name] : names.filter((n) => n !== name)).sort(),
    );
  }
}
