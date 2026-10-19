import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';

import { Button, Icon, Modal, Select, SelectOption } from '@shared/ui';
import { Role } from '../roles.types';

/** toutestcasa DeleteRoleModal: members of the role must move to another role first. */
@Component({
  selector: 'app-delete-role-dialog',
  imports: [Button, Icon, Modal, Select, SelectOption],
  template: `
    <app-modal size="sm" [open]="role() !== null" (closed)="cancelled.emit()">
      @if (role(); as current) {
        <div class="flex flex-col gap-4">
          <span class="grid size-11 place-items-center rounded-xl bg-error-subtle text-error">
            <svg appIcon name="trash" class="size-5"></svg>
          </span>
          <div>
            <h3 class="text-h4 text-foreground">Supprimer le rôle « {{ current.label }} » ?</h3>
            <p class="mt-2 text-body-sm text-foreground-secondary">
              @if (current.memberCount > 0) {
                {{ current.memberCount }} compte{{ current.memberCount > 1 ? 's ont' : ' a' }} ce
                rôle. Choisissez le rôle qu’ils recevront à la place.
              } @else {
                Aucun compte n’a ce rôle.
              }
            </p>
          </div>
          @if (current.memberCount > 0) {
            @if (others().length) {
              <div class="flex flex-col gap-1.5">
                <span class="text-[13px] font-medium text-foreground-secondary">Réattribuer à</span>
                <app-select
                  aria-label="Rôle de remplacement"
                  [value]="replacement()"
                  (valueChange)="replacement.set($event)"
                >
                  @for (other of others(); track other.id) {
                    <app-option [value]="other.id">{{ other.label }}</app-option>
                  }
                </app-select>
              </div>
            } @else {
              <p class="text-body-sm text-error">Créez d’abord un rôle de remplacement.</p>
            }
          }
          @if (error(); as message) {
            <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
              {{ message }}
            </p>
          }
        </div>
      }
      <button footer appButton variant="secondary" type="button" (click)="cancelled.emit()">
        Annuler
      </button>
      <button
        footer
        appButton
        variant="danger"
        type="button"
        [disabled]="!canConfirm() || busy()"
        (click)="confirm()"
      >
        {{ busy() ? 'Suppression…' : 'Supprimer' }}
      </button>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteRoleDialog {
  readonly role = input<Role | null>(null);
  readonly roles = input<Role[]>([]);
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly confirmed = output<number | null>();
  readonly cancelled = output<void>();

  protected readonly others = computed(() =>
    this.roles().filter((role) => role.id !== this.role()?.id),
  );
  protected readonly replacement = linkedSignal<number | null>(
    () => this.others().find((role) => role.name === 'USER')?.id ?? this.others()[0]?.id ?? null,
  );
  protected readonly canConfirm = computed(
    () => (this.role()?.memberCount ?? 0) === 0 || this.replacement() !== null,
  );

  protected confirm(): void {
    if (!this.canConfirm()) return;
    this.confirmed.emit((this.role()?.memberCount ?? 0) > 0 ? this.replacement() : null);
  }
}
