import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import {
  FormField as SignalFormField,
  form,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';

import { problemMessage } from '@core/api/api';
import { Button, FormField, Select, SelectOption, inputClasses } from '@shared/ui';
import { injectUserMutations } from '../users.queries';
import { CreateUserValue, createUserSchema } from '../users.schema';
import { AdminUser } from '../users.types';

const emptyValue: CreateUserValue = {
  email: '',
  fullName: '',
  phone: '',
  locale: 'fr',
  admin: false,
};

/** Opens an account for someone (sign-up by phone, at the counter); they get a link to choose a password. */
@Component({
  selector: 'app-user-create-form',
  imports: [Button, FormField, Select, SelectOption, SignalFormField],
  template: `
    <form class="flex flex-col gap-4" (submit)="save($event)" novalidate>
      <app-form-field label="Nom complet" controlId="new-user-name" [field]="userForm.fullName">
        <input
          id="new-user-name"
          [class]="inputClasses"
          [formField]="userForm.fullName"
          placeholder="Sami Ben Ali"
        />
      </app-form-field>
      <app-form-field label="E-mail" controlId="new-user-email" [field]="userForm.email">
        <input
          id="new-user-email"
          type="email"
          [class]="inputClasses"
          [formField]="userForm.email"
          placeholder="sami@exemple.tn"
        />
      </app-form-field>
      <app-form-field
        label="Téléphone"
        controlId="new-user-phone"
        [field]="userForm.phone"
        hint="Facultatif"
      >
        <input
          id="new-user-phone"
          type="tel"
          [class]="inputClasses"
          [formField]="userForm.phone"
          placeholder="+216 20 000 000"
        />
      </app-form-field>
      <app-form-field
        label="Langue des e-mails"
        controlId="new-user-locale"
        [field]="userForm.locale"
      >
        <app-select id="new-user-locale" [formField]="userForm.locale">
          <app-option value="fr">Français</app-option>
          <app-option value="en">English</app-option>
        </app-select>
      </app-form-field>
      <label class="flex items-center gap-2 text-body-sm">
        <input type="checkbox" class="size-4 accent-primary" [formField]="userForm.admin" />
        Donner l’accès administrateur
      </label>

      @if (serverError(); as message) {
        <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
          {{ message }}
        </p>
      }

      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-caption text-foreground-muted">
          Un e-mail l’invite à choisir son mot de passe (lien valable 3 jours).
        </p>
        <div class="flex gap-2">
          <button appButton variant="ghost" type="button" (click)="cancelled.emit()">
            Annuler
          </button>
          <button appButton type="submit" [disabled]="!canSubmit()">Créer et inviter</button>
        </div>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCreateForm {
  readonly saved = output<AdminUser>();
  readonly cancelled = output<void>();

  protected readonly inputClasses = inputClasses;
  protected readonly model = signal<CreateUserValue>(emptyValue);
  protected readonly userForm = form(this.model, (path) =>
    validateStandardSchema(path, createUserSchema),
  );
  protected readonly serverError = signal<string | null>(null);
  private readonly mutations = injectUserMutations();

  protected readonly canSubmit = computed(
    () => this.userForm().dirty() && this.userForm().valid() && !this.mutations.create.isPending(),
  );

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.userForm, async () => {
      this.serverError.set(null);
      try {
        const created = await this.mutations.create.mutateAsync(
          createUserSchema.parse(this.model()),
        );
        this.userForm().reset(emptyValue);
        this.saved.emit(created);
      } catch (error) {
        this.serverError.set(problemMessage(error, 'Création impossible'));
      }
      return undefined;
    });
  }
}
