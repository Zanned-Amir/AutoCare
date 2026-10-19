import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { AssignRolesDialog } from '@features/roles/components/assign-roles-dialog';
import { RolePermissions } from '@features/roles/roles.types';
import { AuditTrail } from '@features/audit/components/audit-trail';
import { OrganizationStatusBadge } from '@features/organizations/components/organization-status-badge';
import { injectUserMembershipsQuery } from '@features/organizations/organizations.queries';
import { memberRoleLabels, memberStatusLabels } from '@features/organizations/organizations.types';
import { RequestStatusBadge } from '@features/service-requests/components/request-status-badge';
import { injectAdminRequestsQuery } from '@features/service-requests/service-requests.queries';
import { ServiceRequestPermissions } from '@features/service-requests/service-requests.types';
import { UserPermissions } from '@features/users/users.permissions';
import { injectUserMutations, injectUserQuery } from '@features/users/users.queries';
import { injectUserVehiclesQuery } from '@features/vehicles/vehicles.queries';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';
import { Badge, Button, Card, ConfirmDialog, Icon, Spinner } from '@shared/ui';

const dateFormat = new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium' });

/** One account for the backoffice: profile, roles, vehicles, organizations, recent requests. */
@Component({
  selector: 'app-admin-user-detail-page',
  imports: [
    AdminPageHeader,
    AssignRolesDialog,
    AuditTrail,
    Badge,
    Button,
    Card,
    ConfirmDialog,
    Icon,
    OrganizationStatusBadge,
    RequestStatusBadge,
    RouterLink,
    Spinner,
  ],
  template: `
    <app-admin-page-header
      [title]="user.data()?.fullName ?? 'Utilisateur'"
      [subtitle]="user.data()?.email ?? null"
      [breadcrumbs]="[
        { label: 'Utilisateurs', path: '/admin/users' },
        { label: user.data()?.fullName ?? '…' },
      ]"
    >
      @if (user.data(); as current) {
        @if (!current.active) {
          <app-badge badge tone="error">Suspendu</app-badge>
        }
        @if (canManage() && !isMe()) {
          <div actions class="flex flex-wrap gap-2">
            @if (!current.passwordSet) {
              <button
                appButton
                variant="secondary"
                type="button"
                [disabled]="mutations.resendInvitation.isPending()"
                (click)="
                  run(mutations.resendInvitation.mutateAsync(current.id), 'Invitation renvoyée.')
                "
              >
                Renvoyer l’invitation
              </button>
            }
            @if (canAssignRoles()) {
              <button
                appButton
                variant="ghost"
                type="button"
                (click)="rolesError.set(null); assigning.set(true)"
              >
                Gérer les rôles
              </button>
            }
            @if (current.active) {
              <button
                appButton
                variant="secondary"
                type="button"
                (click)="actionError.set(null); confirmSuspend.set(true)"
              >
                Suspendre
              </button>
            } @else {
              <button appButton type="button" (click)="toggleActive()">Réactiver</button>
            }
          </div>
        }
      }
    </app-admin-page-header>

    <app-confirm-dialog
      [open]="confirmSuspend()"
      tone="danger"
      icon="lock"
      title="Suspendre ce compte ?"
      description="La personne ne pourra plus se connecter et toutes ses sessions seront fermées. Vous pourrez la réactiver."
      confirmLabel="Suspendre"
      [busy]="mutations.suspend.isPending()"
      [error]="actionError()"
      (confirmed)="toggleActive()"
      (cancelled)="confirmSuspend.set(false)"
    />

    <div class="px-4 py-5 md:px-8 md:py-8">
      @if (actionError(); as message) {
        <p
          class="mb-4 rounded-2xl border border-error bg-error-subtle px-4 py-3 text-body-sm text-error"
        >
          {{ message }}
        </p>
      }
      @if (notice(); as message) {
        <p class="mb-4 rounded-2xl bg-success-subtle px-4 py-3 text-body-sm text-success">
          {{ message }}
        </p>
      }
      @if (user.isPending()) {
        <app-spinner />
      } @else if (user.data(); as current) {
        <div class="grid gap-6 xl:grid-cols-[3fr_2fr]">
          <div class="flex flex-col gap-6">
            <app-card>
              <h2 class="mb-4 text-h4">Profil</h2>
              <dl class="grid gap-4 text-body-sm sm:grid-cols-2">
                <div>
                  <dt class="text-caption text-foreground-muted">E-mail</dt>
                  <dd class="flex flex-wrap items-center gap-2 text-foreground">
                    {{ current.email }}
                    @if (!current.emailVerified) {
                      <app-badge tone="warning">Non confirmé</app-badge>
                    }
                  </dd>
                </div>
                <div>
                  <dt class="text-caption text-foreground-muted">Téléphone</dt>
                  <dd class="text-foreground">{{ current.phone ?? '—' }}</dd>
                </div>
                <div>
                  <dt class="text-caption text-foreground-muted">Inscrit le</dt>
                  <dd class="text-foreground">{{ format(current.createdAt) }}</dd>
                </div>
                <div>
                  <dt class="text-caption text-foreground-muted">Mot de passe</dt>
                  <dd class="text-foreground">
                    {{ current.passwordSet ? 'Choisi' : 'En attente (invitation envoyée)' }}
                  </dd>
                </div>
                <div class="sm:col-span-2">
                  <dt class="mb-1 text-caption text-foreground-muted">Rôles</dt>
                  <dd class="flex flex-wrap gap-2">
                    @for (role of current.roles; track role) {
                      <app-badge [tone]="role === 'ADMIN' ? 'primary' : 'neutral'">{{
                        role
                      }}</app-badge>
                    }
                  </dd>
                </div>
              </dl>
            </app-card>

            @if (canReadRequests()) {
              <app-card class="p-0">
                <div class="flex items-center justify-between px-5 pt-5 pb-3">
                  <div>
                    <h2 class="text-h4">Demandes récentes</h2>
                    <p class="text-caption text-foreground-muted">
                      {{ requests.data()?.page?.totalElements ?? 0 }} au total
                    </p>
                  </div>
                  <a
                    routerLink="/admin/requests"
                    [queryParams]="{ userId: current.id }"
                    class="text-body-sm font-semibold text-primary"
                    >Tout voir</a
                  >
                </div>
                <ul class="divide-y divide-border-subtle">
                  @for (request of requests.data()?.content ?? []; track request.id) {
                    <li class="flex items-center gap-3 px-5 py-3">
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-label text-foreground">
                          {{ request.service.name ?? 'Service' }}
                        </p>
                        <p class="truncate text-caption text-foreground-muted">
                          {{ request.organization?.name }} · {{ format(request.createdAt) }}
                        </p>
                      </div>
                      <app-request-status-badge [status]="request.status" />
                    </li>
                  } @empty {
                    <li class="px-5 pb-5 text-body-sm text-foreground-muted">
                      Aucune demande envoyée.
                    </li>
                  }
                </ul>
              </app-card>
            }
          </div>

          <div class="flex flex-col gap-6">
            <app-card class="p-0">
              <div class="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 class="text-h4">Véhicules</h2>
                <span class="text-caption text-foreground-muted"
                  >{{ vehicles.data()?.length ?? 0 }} véhicule(s)</span
                >
              </div>
              <ul class="divide-y divide-border-subtle">
                @for (vehicle of vehicles.data() ?? []; track vehicle.id) {
                  <li class="flex items-center gap-3 px-5 py-3">
                    <span
                      class="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-subtle text-primary"
                      ><svg appIcon name="car" class="size-4"></svg
                    ></span>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-label text-foreground">
                        {{ vehicle.brand }} {{ vehicle.model }}
                      </p>
                      <p class="text-caption text-foreground-muted">
                        {{ vehicle.year }} · {{ vehicle.mileage }} km
                        @if (vehicle.plate) {
                          · <span class="text-plate">{{ vehicle.plate }}</span>
                        }
                      </p>
                    </div>
                  </li>
                } @empty {
                  <li class="px-5 pb-5 text-body-sm text-foreground-muted">Aucun véhicule.</li>
                }
              </ul>
            </app-card>

            <app-card class="p-0">
              <div class="px-5 pt-5 pb-3">
                <h2 class="text-h4">Entreprises</h2>
              </div>
              <ul class="divide-y divide-border-subtle">
                @for (membership of memberships.data() ?? []; track membership.memberId) {
                  <li class="flex items-center gap-3 px-5 py-3">
                    <span
                      class="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-subtle text-primary"
                      ><svg appIcon name="building" class="size-4"></svg
                    ></span>
                    <div class="min-w-0 flex-1">
                      <a
                        [routerLink]="['/admin/organizations', membership.organization.id]"
                        class="block truncate text-label text-foreground hover:text-primary"
                        >{{ membership.organization.name }}</a
                      >
                      <p class="text-caption text-foreground-muted">
                        {{ roleLabels[membership.roleKey] }}
                        @if (membership.status !== 'ACTIVE') {
                          · {{ memberStatusLabels[membership.status] }}
                        }
                      </p>
                    </div>
                    <app-organization-status-badge [status]="membership.organization.status" />
                  </li>
                } @empty {
                  <li class="px-5 pb-5 text-body-sm text-foreground-muted">
                    Membre d’aucune entreprise.
                  </li>
                }
              </ul>
            </app-card>

            <app-audit-trail targetType="USER" [targetId]="current.id" />
          </div>
        </div>
      } @else {
        <app-card class="max-w-md">
          <h2 class="text-h4">Utilisateur introuvable</h2>
          <a appButton variant="secondary" class="mt-4" routerLink="/admin/users"
            >Retour à la liste</a
          >
        </app-card>
      }
    </div>

    @if (user.data(); as current) {
      <app-assign-roles-dialog
        [open]="assigning()"
        [current]="current.roles"
        [busy]="mutations.setRoles.isPending()"
        [error]="rolesError()"
        (saved)="saveRoles($event)"
        (cancelled)="assigning.set(false)"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserDetailPage {
  /** Route param, bound by withComponentInputBinding(). */
  readonly userId = input.required<string>();

  private readonly auth = inject(AuthStore);
  private readonly id = computed(() => Number(this.userId()));
  protected readonly user = injectUserQuery(() => this.id());
  protected readonly vehicles = injectUserVehiclesQuery(() => this.id());
  protected readonly memberships = injectUserMembershipsQuery(() => this.id());
  protected readonly requests = injectAdminRequestsQuery(
    () => ({
      status: null,
      organizationId: null,
      userId: this.id(),
      from: null,
      to: null,
      page: 0,
      size: 5,
    }),
    () => this.canReadRequests(),
  );
  protected readonly mutations = injectUserMutations();
  protected readonly roleLabels = memberRoleLabels;
  protected readonly memberStatusLabels = memberStatusLabels;
  protected readonly confirmSuspend = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly canManage = computed(() => this.auth.can(UserPermissions.USER_MANAGE));
  protected readonly canReadRequests = computed(() =>
    this.auth.can(ServiceRequestPermissions.REQUEST_READ),
  );
  protected readonly canAssignRoles = computed(
    () => this.canManage() && this.auth.can(RolePermissions.ROLE_READ),
  );
  protected readonly assigning = signal(false);
  protected readonly rolesError = signal<string | null>(null);
  protected readonly isMe = computed(() => this.auth.user()?.id === this.id());

  protected toggleActive(): void {
    const current = this.user.data();
    if (!current) return;
    const mutation = current.active ? this.mutations.suspend : this.mutations.unsuspend;
    this.run(mutation.mutateAsync(current.id).then(() => this.confirmSuspend.set(false)));
  }

  protected saveRoles(roles: string[]): void {
    const current = this.user.data();
    if (!current) return;
    this.rolesError.set(null);
    this.mutations.setRoles
      .mutateAsync({ id: current.id, roles })
      .then(() => {
        this.assigning.set(false);
        this.notice.set('Rôles mis à jour : ils s’appliquent à la prochaine session du compte.');
      })
      .catch((error: unknown) => this.rolesError.set(problemMessage(error, 'Action impossible')));
  }

  protected run(action: Promise<unknown>, success: string | null = null): void {
    this.actionError.set(null);
    this.notice.set(null);
    action
      .then(() => this.notice.set(success))
      .catch((error: unknown) => this.actionError.set(problemMessage(error, 'Action impossible')));
  }

  protected format(value: string): string {
    return dateFormat.format(new Date(value));
  }
}
