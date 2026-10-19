import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { DeleteRoleDialog } from '@features/roles/components/delete-role-dialog';
import { RoleCard } from '@features/roles/components/role-card';
import { injectRoleMutations, injectRolesQuery } from '@features/roles/roles.queries';
import { Role, RolePermissions } from '@features/roles/roles.types';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';
import { Button, FilterGroup, FilterToolbar, FilterValues, Spinner } from '@shared/ui';

const TYPE_GROUP: FilterGroup = {
  key: 'type',
  label: 'Type',
  options: [
    { value: 'system', label: 'Système' },
    { value: 'custom', label: 'Personnalisé' },
    { value: 'backoffice', label: 'Accès backoffice' },
  ],
};

/** toutestcasa "Rôles & permissions": a grid of role cards closed by a "Créer un rôle" tile. */
@Component({
  selector: 'app-admin-roles-page',
  imports: [
    AdminPageHeader,
    Button,
    DeleteRoleDialog,
    FilterToolbar,
    RoleCard,
    RouterLink,
    Spinner,
  ],
  template: `
    <app-admin-page-header
      title="Rôles & permissions"
      subtitle="Définissez les rôles de la plateforme et ce que chacun peut faire."
    >
      @if (canManage()) {
        <a appButton actions routerLink="/admin/roles/new">+ Nouveau rôle</a>
      }
    </app-admin-page-header>
    <div class="flex flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
      <app-filter-toolbar
        searchPlaceholder="Rechercher un rôle"
        [search]="query()"
        [groups]="groups"
        [values]="{ type: type() }"
        [canReset]="!!query() || type() !== null"
        (searchChange)="query.set($event)"
        (filtersChange)="applyFilters($event)"
        (resetAll)="query.set(''); type.set(null)"
      />

      @if (roles.isPending()) {
        <div class="flex justify-center py-16"><app-spinner /></div>
      } @else if (roles.isError()) {
        <p class="py-16 text-center text-body-sm text-error">Impossible de charger les rôles.</p>
      } @else {
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          @for (role of visible(); track role.id) {
            <app-role-card
              [role]="role"
              [canManage]="canManage()"
              (deleted)="deleting.set($event)"
            />
          }
          @if (canManage()) {
            <a
              routerLink="/admin/roles/new"
              class="flex min-h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-border-strong p-6 text-center transition-colors hover:border-accent hover:bg-background-subtle"
            >
              <span class="text-display leading-none text-accent">+</span>
              <span class="text-button text-accent-text">Créer un rôle</span>
              <span class="text-caption text-foreground-muted"
                >Un ensemble de permissions sur mesure.</span
              >
            </a>
          }
        </div>
        @if (!visible().length && !canManage()) {
          <p class="text-body-sm text-foreground-muted">Aucun rôle ne correspond.</p>
        }
      }
    </div>

    <app-delete-role-dialog
      [role]="deleting()"
      [roles]="roles.data() ?? []"
      [busy]="mutations.remove.isPending()"
      [error]="deleteError()"
      (confirmed)="remove($event)"
      (cancelled)="deleting.set(null); deleteError.set(null)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRolesPage {
  private readonly auth = inject(AuthStore);
  protected readonly roles = injectRolesQuery();
  protected readonly mutations = injectRoleMutations();
  protected readonly canManage = computed(() => this.auth.can(RolePermissions.ROLE_MANAGE));
  protected readonly groups = [TYPE_GROUP];
  protected readonly query = signal('');
  protected readonly type = signal<string | null>(null);
  protected readonly deleting = signal<Role | null>(null);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const type = this.type();
    return (this.roles.data() ?? []).filter(
      (role) =>
        (!q || `${role.label} ${role.name} ${role.description ?? ''}`.toLowerCase().includes(q)) &&
        (type === null ||
          (type === 'system' && role.system) ||
          (type === 'custom' && !role.system) ||
          (type === 'backoffice' && role.backoffice)),
    );
  });

  protected applyFilters(values: FilterValues): void {
    this.type.set(values['type'] ?? null);
  }

  protected remove(replacementRoleId: number | null): void {
    const role = this.deleting();
    if (!role) return;
    this.deleteError.set(null);
    this.mutations.remove
      .mutateAsync({ id: role.id, replacementRoleId })
      .then(() => this.deleting.set(null))
      .catch((error: unknown) =>
        this.deleteError.set(problemMessage(error, 'Suppression impossible')),
      );
  }
}
