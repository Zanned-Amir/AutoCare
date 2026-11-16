import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  FormField as SignalFormField,
  form,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';

import { problemMessage } from '@core/api/api';
import { AuthStore } from '@core/auth/auth.store';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  FormField,
  Modal,
  Spinner,
  inputClasses,
  Select,
  SelectOption,
} from '@shared/ui';
import {
  injectAdminOrganizationMembersQuery,
  injectInvitationMutations,
  injectInvitationsQuery,
  injectMemberMutations,
  injectMembersQuery,
} from '../organizations.queries';
import { OrganizationPermissions } from '../organizations.permissions';
import { AddMemberValue, addMemberSchema } from '../organizations.schema';
import {
  Invitation,
  Member,
  MemberRoleKey,
  Organization,
  memberRoleLabels,
  memberStatusLabels,
  roleKeysFor,
} from '../organizations.types';

const dateFormat = new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium' });

@Component({
  selector: 'app-members-panel',
  imports: [
    Select,
    SelectOption,
    Badge,
    Button,
    Card,
    ConfirmDialog,
    FormField,
    Modal,
    SignalFormField,
    Spinner,
  ],
  template: `
    <app-card class="p-0">
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-4"
      >
        <h2 class="text-h4 text-foreground">Équipe</h2>
        @if (canManage()) {
          <div class="flex flex-wrap gap-2">
            @if (!admin()) {
              <button appButton size="sm" type="button" (click)="openInvite()">
                Inviter par e-mail
              </button>
            }
            <button
              appButton
              variant="secondary"
              size="sm"
              type="button"
              (click)="actionError.set(null); adding.set(true)"
            >
              Ajouter un membre
            </button>
          </div>
        }
      </div>

      <app-modal
        title="Inviter par e-mail"
        description="La personne reçoit un lien valable 7 jours. Sans compte, elle le crée avec cette adresse avant de rejoindre l’équipe."
        [open]="inviting()"
        (closed)="inviting.set(false)"
      >
        <form
          id="invite-member-form"
          class="flex flex-col gap-4"
          (submit)="inviteMember($event)"
          novalidate
        >
          <app-form-field label="E-mail" controlId="invite-email" [field]="inviteForm.email">
            <input
              id="invite-email"
              type="email"
              [class]="inputClasses"
              [formField]="inviteForm.email"
              placeholder="technicien@exemple.tn"
            />
          </app-form-field>
          <app-form-field label="Rôle" controlId="invite-role" [field]="inviteForm.roleKey">
            <app-select id="invite-role" [formField]="inviteForm.roleKey">
              @for (role of roleKeys(); track role) {
                <app-option [value]="role">{{ roleLabels[role] }}</app-option>
              }
            </app-select>
          </app-form-field>
          @if (inviteError(); as message) {
            <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
              {{ message }}
            </p>
          }
        </form>
        <button footer appButton variant="secondary" type="button" (click)="inviting.set(false)">
          Annuler
        </button>
        <button footer appButton type="submit" form="invite-member-form" [disabled]="!canInvite()">
          Envoyer l’invitation
        </button>
      </app-modal>

      <app-confirm-dialog
        [open]="revoking() !== null"
        tone="danger"
        icon="mail"
        title="Annuler cette invitation ?"
        [description]="'Le lien envoyé à ' + (revoking()?.email ?? '') + ' ne fonctionnera plus.'"
        confirmLabel="Annuler l’invitation"
        [busy]="invitationMutations.revoke.isPending()"
        [error]="actionError()"
        (confirmed)="revokeInvitation()"
        (cancelled)="revoking.set(null)"
      />

      <app-modal
        title="Ajouter un membre"
        [description]="
          admin()
            ? 'La personne doit déjà avoir un compte AutoCare : sinon, créez-le depuis Utilisateurs.'
            : 'La personne doit déjà avoir un compte AutoCare. Sinon, invitez-la par e-mail.'
        "
        [open]="adding()"
        (closed)="adding.set(false)"
      >
        <form
          id="add-member-form"
          class="flex flex-col gap-4"
          (submit)="addMember($event)"
          novalidate
        >
          <app-form-field label="E-mail du compte" controlId="member-email" [field]="addForm.email">
            <input
              id="member-email"
              type="email"
              [class]="inputClasses"
              [formField]="addForm.email"
              placeholder="technicien@exemple.tn"
            />
          </app-form-field>
          <app-form-field label="Rôle" controlId="member-role" [field]="addForm.roleKey">
            <app-select id="member-role" [formField]="addForm.roleKey">
              @for (role of roleKeys(); track role) {
                <app-option [value]="role">{{ roleLabels[role] }}</app-option>
              }
            </app-select>
          </app-form-field>
          @if (addError(); as message) {
            <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
              {{ message }}
            </p>
          }
        </form>
        <button footer appButton variant="secondary" type="button" (click)="adding.set(false)">
          Annuler
        </button>
        <button footer appButton type="submit" form="add-member-form" [disabled]="!canAdd()">
          Ajouter
        </button>
      </app-modal>

      <app-confirm-dialog
        [open]="removing() !== null"
        tone="danger"
        icon="users"
        title="Retirer ce membre ?"
        [description]="
          (removing()?.fullName ?? removing()?.email ?? '') +
          ' perd l’accès à l’espace de l’entreprise. Vous pourrez l’ajouter à nouveau.'
        "
        confirmLabel="Retirer"
        [busy]="removePending()"
        [error]="actionError()"
        (confirmed)="removeMember()"
        (cancelled)="removing.set(null)"
      />

      @if (actionError(); as message) {
        <p class="mx-4 mt-4 rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
          {{ message }}
        </p>
      }

      @if (members().isPending()) {
        <div class="p-6"><app-spinner /></div>
      } @else if (members().isError()) {
        <p class="p-4 text-body-sm text-error">Impossible de charger l'équipe.</p>
      } @else {
        <ul class="divide-y divide-border-subtle">
          @for (member of members().data(); track member.id) {
            <li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div class="min-w-0">
                <p class="text-label text-foreground">
                  {{ member.fullName ?? 'Utilisateur ' + member.userId }}
                  @if (member.userId === auth.user()?.id) {
                    <span class="text-body-sm font-normal text-foreground-muted">(vous)</span>
                  }
                  @if (admin() && member.userId === organization().ownerId) {
                    <span class="ml-1 text-caption font-normal text-accent-text">propriétaire</span>
                  }
                </p>
                <p class="truncate text-body-sm text-foreground-secondary">{{ member.email }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                @if (member.status !== 'ACTIVE') {
                  <app-badge tone="warning">{{ statusLabels[member.status] }}</app-badge>
                }
                @if (canManage()) {
                  <app-select
                    size="sm"
                    class="w-44"
                    [attr.aria-label]="'Rôle de ' + (member.fullName ?? member.email)"
                    #roleSelect
                    [value]="member.roleKey"
                    (valueChange)="changeRole(member, $event, roleSelect)"
                  >
                    @if (member.roleKey === 'CUSTOM') {
                      <app-option value="CUSTOM" disabled>{{ roleLabels.CUSTOM }}</app-option>
                    }
                    @for (role of roleKeys(); track role) {
                      <app-option [value]="role">{{ roleLabels[role] }}</app-option>
                    }
                  </app-select>
                  <button
                    appButton
                    variant="ghost"
                    size="sm"
                    type="button"
                    (click)="toggleStatus(member)"
                  >
                    {{ member.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver' }}
                  </button>
                  <button
                    appButton
                    variant="ghost"
                    size="sm"
                    type="button"
                    (click)="actionError.set(null); removing.set(member)"
                  >
                    Retirer
                  </button>
                } @else {
                  <app-badge tone="primary">{{ roleLabels[member.roleKey] }}</app-badge>
                }
              </div>
            </li>
          }
        </ul>
      }

      @if (pendingInvitations().length > 0) {
        <div class="border-t border-border-subtle">
          <h3 class="px-4 pt-4 text-label text-foreground-secondary">Invitations en attente</h3>
          <ul class="divide-y divide-border-subtle">
            @for (invitation of pendingInvitations(); track invitation.id) {
              <li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div class="min-w-0">
                  <p class="truncate text-label text-foreground">{{ invitation.email }}</p>
                  <p class="text-body-sm text-foreground-muted">
                    {{ roleLabels[invitation.roleKey] }} · expire le
                    {{ formatDate(invitation.expiresAt) }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  @if (invitation.status === 'EXPIRED') {
                    <app-badge tone="warning">Expirée</app-badge>
                  } @else {
                    <app-badge tone="primary">Envoyée</app-badge>
                  }
                  @if (canManage()) {
                    <button
                      appButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      (click)="actionError.set(null); revoking.set(invitation)"
                    >
                      Annuler
                    </button>
                  }
                </div>
              </li>
            }
          </ul>
        </div>
      }
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembersPanel {
  readonly organization = input.required<Organization>();
  /** Backoffice: any organization, through /admin/organizations, for staff who moderate them. */
  readonly admin = input(false, { transform: booleanAttribute });

  protected readonly auth = inject(AuthStore);
  protected readonly inputClasses = inputClasses;
  protected readonly roleLabels = memberRoleLabels;
  protected readonly statusLabels = memberStatusLabels;
  protected readonly roleKeys = computed(() => roleKeysFor(this.organization().type));
  protected readonly canManage = computed(() =>
    this.admin()
      ? this.auth.can(OrganizationPermissions.ORGANIZATION_APPROVE)
      : this.auth.canInOrganization(OrganizationPermissions.MEMBER_MANAGE),
  );

  private readonly teamMembers = injectMembersQuery(
    () => this.organization().id,
    () => !this.admin() && this.auth.canInOrganization(OrganizationPermissions.MEMBER_READ),
  );
  private readonly adminMembers = injectAdminOrganizationMembersQuery(
    () => this.organization().id,
    () => this.admin(),
  );
  protected readonly members = computed(() =>
    this.admin() ? this.adminMembers : this.teamMembers,
  );
  private readonly mutations = injectMemberMutations(
    () => this.organization().id,
    () => this.admin(),
  );

  private readonly invitations = injectInvitationsQuery(
    () => this.organization().id,
    () => !this.admin() && this.auth.canInOrganization(OrganizationPermissions.MEMBER_READ),
  );
  protected readonly pendingInvitations = computed(() =>
    this.admin() ? [] : (this.invitations.data() ?? []),
  );
  protected readonly invitationMutations = injectInvitationMutations(() => this.organization().id);

  protected readonly inviting = signal(false);
  protected readonly revoking = signal<Invitation | null>(null);
  protected readonly inviteError = signal<string | null>(null);
  protected readonly inviteModel = signal<AddMemberValue>({
    email: '',
    roleKey: 'PROVIDER_TECHNICIAN',
  });
  protected readonly inviteForm = form(this.inviteModel, (path) =>
    validateStandardSchema(path, addMemberSchema),
  );
  protected readonly canInvite = computed(
    () =>
      this.inviteForm().dirty() &&
      this.inviteForm().valid() &&
      !this.invitationMutations.invite.isPending(),
  );

  protected readonly adding = signal(false);
  protected readonly removing = signal<Member | null>(null);
  protected readonly addError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly addModel = signal<AddMemberValue>({
    email: '',
    roleKey: 'PROVIDER_TECHNICIAN',
  });
  protected readonly addForm = form(this.addModel, (path) =>
    validateStandardSchema(path, addMemberSchema),
  );
  protected readonly canAdd = computed(
    () => this.addForm().dirty() && this.addForm().valid() && !this.mutations.add.isPending(),
  );

  protected addMember(event: Event): void {
    event.preventDefault();
    void submit(this.addForm, async () => {
      this.addError.set(null);
      try {
        await this.mutations.add.mutateAsync(this.addModel());
        this.addForm().reset({ email: '', roleKey: this.addModel().roleKey });
        this.adding.set(false);
      } catch (error) {
        this.addError.set(problemMessage(error, "Impossible d'ajouter ce membre"));
      }
      return undefined;
    });
  }

  protected formatDate(value: string): string {
    return dateFormat.format(new Date(value));
  }

  protected openInvite(): void {
    this.inviteError.set(null);
    this.inviteForm().reset({
      email: '',
      roleKey: this.organization().type === 'PROVIDER' ? 'PROVIDER_TECHNICIAN' : 'SELLER_STAFF',
    });
    this.inviting.set(true);
  }

  protected inviteMember(event: Event): void {
    event.preventDefault();
    void submit(this.inviteForm, async () => {
      this.inviteError.set(null);
      try {
        await this.invitationMutations.invite.mutateAsync(this.inviteModel());
        this.inviteForm().reset({ email: '', roleKey: this.inviteModel().roleKey });
        this.inviting.set(false);
      } catch (error) {
        this.inviteError.set(problemMessage(error, "Impossible d'envoyer l'invitation"));
      }
      return undefined;
    });
  }

  protected revokeInvitation(): void {
    const invitation = this.revoking();
    if (!invitation) return;
    this.run(
      this.invitationMutations.revoke
        .mutateAsync(invitation.id)
        .then(() => this.revoking.set(null)),
    );
  }

  protected changeRole(member: Member, value: MemberRoleKey, select: Select<MemberRoleKey>): void {
    const roleKey = value;
    // A refused change leaves the data as it was, so Angular will not redraw the select: restore it here.
    this.run(this.mutations.changeRole.mutateAsync({ memberId: member.id, roleKey }), () => {
      select.value.set(member.roleKey);
    });
  }

  protected toggleStatus(member: Member): void {
    const status = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    this.run(this.mutations.changeStatus.mutateAsync({ memberId: member.id, status }));
  }

  protected removePending(): boolean {
    return this.mutations.remove.isPending();
  }

  protected removeMember(): void {
    const member = this.removing();
    if (!member) return;
    this.run(this.mutations.remove.mutateAsync(member.id).then(() => this.removing.set(null)));
  }

  private run(action: Promise<unknown>, onError?: () => void): void {
    this.actionError.set(null);
    action.catch((error: unknown) => {
      this.actionError.set(problemMessage(error, 'Modification impossible'));
      onError?.();
    });
  }
}
