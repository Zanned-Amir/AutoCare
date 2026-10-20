import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import { AuditTrail } from '@features/audit/components/audit-trail';
import { AuditPermissions } from '@features/audit/audit.types';
import { DeleteRoleDialog } from '@features/roles/components/delete-role-dialog';
import { PermissionMatrix } from '@features/roles/components/permission-matrix';
import {
  injectRoleMutations,
  injectRoleQuery,
  injectRolesQuery,
} from '@features/roles/roles.queries';
import {
  CatalogModule,
  FULL_ACCESS,
  Role,
  RolePermissions,
  RoleValue,
  togglePermission,
} from '@features/roles/roles.types';
import { AdminPageHeader } from '@layouts/backoffice/admin-page-header';
import { Badge, Button, Card, Spinner, inputClasses } from '@shared/ui';

const empty = (): RoleValue => ({
  name: '',
  label: '',
  description: '',
  permissions: [],
  backoffice: true,
});

const toValue = (role: Role): RoleValue => ({
  name: role.name,
  label: role.label,
  description: role.description ?? '',
  permissions: [...role.permissions].sort(),
  backoffice: role.backoffice,
});

/** Turns "Agent support" into AGENT_SUPPORT for a new role's key. */
function toKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

/**
 * One role: read-only view, edit mode (`?edit=1` or "Modifier le rôle") and creation
 * (`/admin/roles/new`). The matrix shows the other roles beside it for comparison.
 */
@Component({
  selector: 'app-admin-role-detail-page',
  imports: [
    AdminPageHeader,
    AuditTrail,
    Badge,
    Button,
    Card,
    DeleteRoleDialog,
    PermissionMatrix,
    RouterLink,
    Spinner,
  ],
  template: `
    <app-admin-page-header
      [title]="creating() ? 'Nouveau rôle' : (role.data()?.label ?? 'Rôle')"
      [subtitle]="
        creating()
          ? 'Donnez-lui un nom puis cochez ce qu’il peut faire.'
          : 'Permissions par module, comparées aux autres rôles.'
      "
    >
      @if (!creating() && !editing() && canManage() && role.data()) {
        <button appButton actions type="button" (click)="startEdit()">Modifier le rôle</button>
      }
    </app-admin-page-header>

    <div class="flex flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
      @if (!creating() && role.isPending()) {
        <div class="flex justify-center py-16"><app-spinner /></div>
      } @else if (!creating() && !role.data()) {
        <app-card>
          <p class="text-body-sm">Rôle introuvable.</p>
          <a routerLink="/admin/roles" class="text-body-sm text-primary hover:underline"
            >← Rôles & permissions</a
          >
        </app-card>
      } @else {
        <form class="flex flex-col gap-6" (submit)="save($event)" novalidate>
          <app-card class="flex max-w-3xl flex-col gap-4">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-h4">Nom & description</h2>
              @if (role.data()?.system) {
                <app-badge tone="info">Rôle système</app-badge>
              }
              @if (role.data(); as current) {
                <app-badge tone="neutral"
                  >{{ current.memberCount }} membre{{
                    current.memberCount > 1 ? 's' : ''
                  }}</app-badge
                >
              }
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="flex flex-col gap-1.5" for="role-label">
                <span class="text-[13px] font-medium text-foreground-secondary"
                  >Nom du rôle <span class="text-error">*</span></span
                >
                <input
                  id="role-label"
                  maxlength="80"
                  placeholder="ex : Éditeur catalogue"
                  [class]="inputClasses"
                  [disabled]="!editable()"
                  [value]="value().label"
                  (input)="setLabel($any($event.target).value)"
                />
              </label>
              <label class="flex flex-col gap-1.5" for="role-name">
                <span class="text-[13px] font-medium text-foreground-secondary"
                  >Identifiant <span class="text-error">*</span></span
                >
                <input
                  id="role-name"
                  maxlength="50"
                  placeholder="CATALOG_EDITOR"
                  [class]="inputClasses + ' font-mono uppercase'"
                  [disabled]="!creating()"
                  [attr.aria-invalid]="value().name !== '' && !nameValid()"
                  [value]="value().name"
                  (input)="setName($any($event.target).value)"
                />
                <span class="text-caption text-foreground-muted"
                  >Majuscules et _ ; ne change plus après la création.</span
                >
              </label>
              <label class="flex flex-col gap-1.5 sm:col-span-2" for="role-description">
                <span class="text-[13px] font-medium text-foreground-secondary">Description</span>
                <input
                  id="role-description"
                  maxlength="255"
                  placeholder="À quoi sert ce rôle ?"
                  [class]="inputClasses"
                  [disabled]="!editable()"
                  [value]="value().description"
                  (input)="patch({ description: $any($event.target).value })"
                />
              </label>
            </div>
            <div class="flex flex-col gap-3 border-t border-border-subtle pt-4 sm:flex-row">
              <label class="flex flex-1 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  class="mt-1 size-4 accent-primary"
                  [disabled]="!editable() || isUserRole()"
                  [checked]="value().backoffice"
                  (change)="patch({ backoffice: $any($event.target).checked })"
                />
                <span>
                  <span class="block text-label text-foreground">Accès au backoffice</span>
                  <span class="text-caption text-foreground-muted"
                    >Ses membres peuvent se connecter sur /admin.</span
                  >
                </span>
              </label>
              <label class="flex flex-1 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  class="mt-1 size-4 accent-primary"
                  [disabled]="!editable() || isAdminRole()"
                  [checked]="fullAccess()"
                  (change)="setFullAccess($any($event.target).checked)"
                />
                <span>
                  <span class="block text-label text-foreground">Accès complet (*:*)</span>
                  <span class="text-caption text-foreground-muted"
                    >Toutes les permissions, présentes et futures.</span
                  >
                </span>
              </label>
            </div>
          </app-card>

          <div class="flex flex-col gap-3">
            <h2 class="text-h4">Permissions</h2>
            <app-permission-matrix
              [label]="value().label || 'Ce rôle'"
              [permissions]="value().permissions"
              [compareWith]="others()"
              [readOnly]="!editable() || fullAccess()"
              (toggled)="toggle($event.module, $event.action, $event.checked)"
            />
            <p class="text-caption text-foreground-muted">
              Les changements s’appliquent à chaque compte à son prochain renouvellement de session
              (15 minutes au plus).
            </p>
          </div>

          @if (error(); as message) {
            <p
              class="max-w-3xl rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error"
              role="alert"
            >
              {{ message }}
            </p>
          }

          @if (editable()) {
            <div class="flex flex-wrap items-center gap-3">
              <button appButton type="submit" [disabled]="!canSave()">
                {{ creating() ? 'Créer le rôle' : 'Enregistrer' }}
              </button>
              <button appButton variant="secondary" type="button" (click)="cancel()">
                Annuler
              </button>
              @if (!creating() && !role.data()?.system) {
                <button
                  appButton
                  variant="ghost"
                  type="button"
                  class="ml-auto text-error"
                  (click)="deleting.set(role.data() ?? null)"
                >
                  Supprimer le rôle
                </button>
              }
            </div>
          }
        </form>

        @if (!creating() && canAudit() && role.data(); as current) {
          <app-card class="max-w-3xl">
            <h2 class="mb-3 text-h4">Historique</h2>
            <app-audit-trail targetType="ROLE" [targetId]="current.id" />
          </app-card>
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
export class AdminRoleDetailPage {
  /** Route param; undefined on /admin/roles/new, which has none. */
  readonly roleId = input<string | undefined>();
  /** `?edit=1` opens straight in edit mode. */
  readonly edit = input<string | undefined>();

  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly inputClasses = inputClasses;
  protected readonly creating = computed(() => !this.roleId() || this.roleId() === 'new');
  private readonly id = computed(() => (this.creating() ? null : Number(this.roleId())));
  protected readonly role = injectRoleQuery(() => this.id());
  protected readonly roles = injectRolesQuery();
  protected readonly mutations = injectRoleMutations();
  protected readonly canManage = computed(() => this.auth.can(RolePermissions.ROLE_MANAGE));
  protected readonly canAudit = computed(() => this.auth.can(AuditPermissions.AUDIT_READ));

  protected readonly editing = signal(false);
  protected readonly editable = computed(
    () => this.canManage() && (this.creating() || this.editing()),
  );
  protected readonly value = signal<RoleValue>(empty());
  private readonly saved = signal<RoleValue>(empty());
  private readonly nameTouched = signal(false);
  private readonly editApplied = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly deleting = signal<Role | null>(null);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly others = computed(() =>
    (this.roles.data() ?? []).filter((role) => role.id !== this.id()),
  );
  protected readonly fullAccess = computed(() => this.value().permissions.includes(FULL_ACCESS));
  protected readonly isAdminRole = computed(() => this.role.data()?.name === 'ADMIN');
  protected readonly isUserRole = computed(() => this.role.data()?.name === 'USER');
  protected readonly nameValid = computed(() => /^[A-Z][A-Z0-9_]{1,49}$/.test(this.value().name));
  private readonly dirty = computed(
    () => JSON.stringify(this.value()) !== JSON.stringify(this.saved()),
  );
  protected readonly canSave = computed(
    () =>
      this.dirty() &&
      this.nameValid() &&
      this.value().label.trim().length > 0 &&
      !this.mutations.save.isPending(),
  );

  constructor() {
    effect(() => {
      const role = this.role.data();
      if (this.creating()) {
        this.reset(empty());
      } else if (role && !untracked(() => this.editing() && this.dirty())) {
        // A background refetch must not wipe edits in progress.
        this.reset(toValue(role));
        if (this.edit() && this.canManage() && !untracked(() => this.editApplied())) {
          this.editApplied.set(true);
          this.editing.set(true);
        }
      }
    });
  }

  protected startEdit(): void {
    this.editing.set(true);
  }

  protected patch(change: Partial<RoleValue>): void {
    this.value.update((value) => ({ ...value, ...change }));
  }

  protected setLabel(label: string): void {
    this.patch(this.creating() && !this.nameTouched() ? { label, name: toKey(label) } : { label });
  }

  protected setName(name: string): void {
    this.nameTouched.set(true);
    this.patch({ name: name.toUpperCase() });
  }

  protected setFullAccess(checked: boolean): void {
    const rest = this.value().permissions.filter((permission) => permission !== FULL_ACCESS);
    this.patch({ permissions: checked ? [...rest, FULL_ACCESS].sort() : rest });
  }

  protected toggle(module: CatalogModule, action: string, checked: boolean): void {
    this.patch({
      permissions: togglePermission(this.value().permissions, module, action, checked),
    });
  }

  protected cancel(): void {
    if (this.creating()) {
      void this.router.navigate(['/admin/roles']);
      return;
    }
    this.value.set(this.saved());
    this.editing.set(false);
    this.error.set(null);
  }

  protected save(event: Event): void {
    event.preventDefault();
    if (!this.canSave()) return;
    this.error.set(null);
    this.mutations.save
      .mutateAsync({ id: this.id(), value: this.value() })
      .then((role) => {
        this.reset(toValue(role));
        this.editing.set(false);
        if (this.creating()) void this.router.navigate(['/admin/roles', role.id]);
      })
      .catch((error: unknown) =>
        this.error.set(problemMessage(error, 'Enregistrement impossible')),
      );
  }

  protected remove(replacementRoleId: number | null): void {
    const role = this.deleting();
    if (!role) return;
    this.deleteError.set(null);
    this.mutations.remove
      .mutateAsync({ id: role.id, replacementRoleId })
      .then(() => this.router.navigate(['/admin/roles']))
      .catch((error: unknown) =>
        this.deleteError.set(problemMessage(error, 'Suppression impossible')),
      );
  }

  private reset(value: RoleValue): void {
    this.value.set(value);
    this.saved.set(value);
    this.nameTouched.set(false);
  }
}
