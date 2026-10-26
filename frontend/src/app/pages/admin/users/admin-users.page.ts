import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { AssignRolesDialog } from '@features/roles/components/assign-roles-dialog';
import { injectRolesQuery } from '@features/roles/roles.queries';
import { RolePermissions } from '@features/roles/roles.permissions';
import { UserCreateForm } from '@features/users/components/user-create-form';
import { UserPermissions } from '@features/users/users.permissions';
import {
  injectUserMutations,
  injectUsersCsvExport,
  injectUsersQuery,
} from '@features/users/users.queries';
import { AdminUser } from '@features/users/users.types';
import {
  ExportButton,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  FilterGroup,
  FilterToolbar,
  FilterValues,
  Spinner,
} from '@shared/ui';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';

const DEFAULT_SORT = 'createdAt,desc';

/** Used until the role list is loaded, or without role:read. */
const SEEDED_ROLES = [
  { value: 'USER', label: 'Client' },
  { value: 'SUPPORT', label: 'Agent support' },
  { value: 'ADMIN', label: 'Administrateur' },
];

const STATUS_GROUPS: FilterGroup[] = [
  {
    key: 'status',
    label: 'Statut',
    options: [
      { value: 'active', label: 'Actif' },
      { value: 'suspended', label: 'Suspendu' },
    ],
  },
];

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Plus récents' },
  { value: 'createdAt,asc', label: 'Plus anciens' },
  { value: 'fullName,asc', label: 'Nom (A → Z)' },
];

@Component({
  selector: 'app-admin-users-page',
  imports: [
    AdminPageHeader,
    ExportButton,
    Badge,
    Button,
    Card,
    ConfirmDialog,
    Drawer,
    FilterToolbar,
    RouterLink,
    Spinner,
    UserCreateForm,
    AssignRolesDialog,
  ],
  template: `
    <app-admin-page-header
      title="Utilisateurs"
      subtitle="Comptes clients, professionnels et équipe, avec leurs rôles."
    >
      <app-export-button actions [exporter]="exportCsv" />
      @if (canManage()) {
        <button appButton actions type="button" (click)="creating.set(true)">
          Nouvel utilisateur
        </button>
      }
    </app-admin-page-header>
    <div class="px-4 py-5 md:px-8 md:py-8">
      <app-drawer
        title="Nouvel utilisateur"
        description="Pour une personne inscrite par téléphone ou au guichet : elle reçoit un e-mail pour choisir son mot de passe."
        [open]="creating()"
        (closed)="creating.set(false)"
      >
        @if (creating()) {
          <app-user-create-form (saved)="created($event)" (cancelled)="creating.set(false)" />
        }
      </app-drawer>
      <app-confirm-dialog
        [open]="suspending() !== null"
        tone="danger"
        icon="lock"
        title="Suspendre ce compte ?"
        [description]="
          (suspending()?.fullName ?? '') +
          ' ne pourra plus se connecter et toutes ses sessions seront fermées. Vous pourrez le réactiver.'
        "
        confirmLabel="Suspendre"
        [busy]="suspendPending()"
        [error]="actionError()"
        (confirmed)="confirmSuspend()"
        (cancelled)="closeSuspend()"
      />
      @if (createdEmail(); as email) {
        <p class="mb-4 rounded-2xl bg-success-subtle px-4 py-3 text-body-sm text-success">
          Compte créé : l’invitation est partie à {{ email }}.
        </p>
      }
      <app-filter-toolbar
        searchPlaceholder="Nom, e-mail ou téléphone"
        [search]="q()"
        [groups]="filterGroups()"
        [values]="filterValues()"
        [sortOptions]="sortOptions"
        [sort]="sort()"
        [canReset]="narrowed()"
        (searchChange)="q.set($event); pageIndex.set(0)"
        (filtersChange)="applyFilters($event)"
        (sortChange)="sort.set($event); pageIndex.set(0)"
        (resetAll)="resetFilters()"
      />

      @if (actionError(); as message) {
        <p class="mt-4 rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
          {{ message }}
        </p>
      }

      <app-card class="mt-4 p-0">
        @if (users.isPending()) {
          <div class="p-6"><app-spinner /></div>
        } @else if (users.data(); as page) {
          <ul class="divide-y divide-border-subtle">
            @for (user of page.content; track user.id) {
              <li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div class="min-w-0">
                  <a
                    [routerLink]="['/admin/users', user.id]"
                    class="text-label text-foreground hover:text-primary hover:underline"
                    >{{ user.fullName }}</a
                  >
                  <p class="truncate text-body-sm text-foreground-secondary">{{ user.email }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  @for (role of user.roles; track role) {
                    <app-badge [tone]="role === 'ADMIN' ? 'primary' : 'neutral'">{{
                      roleLabel(role)
                    }}</app-badge>
                  }
                  @if (!user.passwordSet) {
                    <app-badge tone="info">Invitation envoyée</app-badge>
                  } @else if (!user.emailVerified) {
                    <app-badge tone="warning">E-mail non confirmé</app-badge>
                  }
                  @if (!user.active) {
                    <app-badge tone="error">Suspendu</app-badge>
                  }
                  @if (canManage() && user.id !== auth.user()?.id) {
                    @if (canReadRoles()) {
                      <button
                        appButton
                        variant="ghost"
                        size="sm"
                        type="button"
                        (click)="rolesError.set(null); assigning.set(user)"
                      >
                        Rôles
                      </button>
                    }
                    <button
                      appButton
                      [variant]="user.active ? 'ghost' : 'secondary'"
                      size="sm"
                      type="button"
                      (click)="toggleActive(user)"
                    >
                      {{ user.active ? 'Suspendre' : 'Réactiver' }}
                    </button>
                  }
                </div>
              </li>
            } @empty {
              <li class="px-4 py-6 text-body-sm text-foreground-muted">Aucun utilisateur.</li>
            }
          </ul>
          @if (page.page.totalPages > 1) {
            <div
              class="flex items-center justify-between border-t border-border-subtle px-4 py-3 text-body-sm"
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
    </div>

    <app-assign-roles-dialog
      [open]="assigning() !== null"
      [current]="assigning()?.roles ?? []"
      [busy]="mutations.setRoles.isPending()"
      [error]="rolesError()"
      (saved)="saveRoles($event)"
      (cancelled)="assigning.set(null)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPage {
  protected readonly auth = inject(AuthStore);
  protected readonly q = signal('');
  /** ?role= (link from a role's members) preselects the filter. */
  readonly role = input<string | undefined>();
  protected readonly roleFilter = linkedSignal<string | null>(() => this.role() ?? null);
  protected readonly active = signal<boolean | null>(null);
  protected readonly sort = signal(DEFAULT_SORT);
  protected readonly pageIndex = signal(0);
  protected readonly actionError = signal<string | null>(null);
  protected readonly canReadRoles = computed(() => this.auth.can(RolePermissions.ROLE_READ));
  private readonly roles = injectRolesQuery(() => this.canReadRoles());
  /** Custom roles appear in the filter once the list is loaded. */
  protected readonly filterGroups = computed<FilterGroup[]>(() => [
    {
      key: 'role',
      label: 'Rôle',
      options:
        this.roles.data()?.map((role) => ({ value: role.name, label: role.label })) ?? SEEDED_ROLES,
    },
    ...STATUS_GROUPS,
  ]);
  protected readonly assigning = signal<AdminUser | null>(null);
  protected readonly rolesError = signal<string | null>(null);
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly filterValues = computed<FilterValues>(() => ({
    role: this.roleFilter(),
    status: this.active() === null ? null : this.active() ? 'active' : 'suspended',
  }));
  protected readonly narrowed = computed(
    () =>
      !!this.q() || !!this.roleFilter() || this.active() !== null || this.sort() !== DEFAULT_SORT,
  );
  protected readonly users = injectUsersQuery(() => ({
    q: this.q(),
    role: this.roleFilter(),
    active: this.active(),
    sort: this.sort(),
    page: this.pageIndex(),
  }));
  private readonly exportUsers = injectUsersCsvExport();
  protected readonly exportCsv = () =>
    this.exportUsers({
      q: this.q(),
      role: this.roleFilter(),
      active: this.active(),
      sort: this.sort(),
      page: 0,
    });
  protected readonly mutations = injectUserMutations();
  protected readonly creating = signal(false);
  protected readonly createdEmail = signal<string | null>(null);

  protected created(user: AdminUser): void {
    this.creating.set(false);
    this.createdEmail.set(user.email);
    this.q.set('');
    this.pageIndex.set(0);
  }

  protected canManage(): boolean {
    return this.auth.can(UserPermissions.USER_MANAGE);
  }

  protected applyFilters(values: FilterValues): void {
    this.roleFilter.set(values['role'] ?? null);
    this.active.set(values['status'] ? values['status'] === 'active' : null);
    this.pageIndex.set(0);
  }

  protected resetFilters(): void {
    this.q.set('');
    this.roleFilter.set(null);
    this.active.set(null);
    this.sort.set(DEFAULT_SORT);
    this.pageIndex.set(0);
  }

  protected readonly suspending = signal<AdminUser | null>(null);

  protected suspendPending(): boolean {
    return this.mutations.suspend.isPending();
  }

  protected toggleActive(user: AdminUser): void {
    this.actionError.set(null);
    if (user.active) this.suspending.set(user);
    else this.run(this.mutations.unsuspend.mutateAsync(user.id));
  }

  protected confirmSuspend(): void {
    const user = this.suspending();
    if (!user) return;
    this.actionError.set(null);
    this.mutations.suspend.mutateAsync(user.id).then(
      () => this.suspending.set(null),
      (error: unknown) => this.actionError.set(problemMessage(error, 'Action impossible')),
    );
  }

  protected closeSuspend(): void {
    this.suspending.set(null);
    this.actionError.set(null);
  }

  protected roleLabel(name: string): string {
    return (
      this.roles.data()?.find((role) => role.name === name)?.label ??
      SEEDED_ROLES.find((role) => role.value === name)?.label ??
      name
    );
  }

  protected saveRoles(roles: string[]): void {
    const user = this.assigning();
    if (!user) return;
    this.rolesError.set(null);
    this.mutations.setRoles
      .mutateAsync({ id: user.id, roles })
      .then(() => this.assigning.set(null))
      .catch((error: unknown) => this.rolesError.set(problemMessage(error, 'Action impossible')));
  }

  private run(action: Promise<unknown>): void {
    this.actionError.set(null);
    action.catch((error: unknown) =>
      this.actionError.set(problemMessage(error, 'Action impossible')),
    );
  }
}
