import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
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
import { Button, FormField, inputClasses, Select, SelectOption } from '@shared/ui';
import { injectUpdateProfileMutation } from '../account.queries';
import { ProfileValue, profileSchema } from '../account.schema';

@Component({
  selector: 'app-profile-form',
  imports: [Select, SelectOption, Button, FormField, SignalFormField],
  template: `
    <form class="grid gap-4 sm:grid-cols-2" (submit)="save($event)" novalidate>
      <app-form-field label="Nom complet" controlId="profile-name" [field]="profileForm.fullName">
        <input
          id="profile-name"
          autocomplete="name"
          [class]="inputClasses"
          [formField]="profileForm.fullName"
        />
      </app-form-field>
      <app-form-field label="Téléphone" controlId="profile-phone" [field]="profileForm.phone">
        <input
          id="profile-phone"
          type="tel"
          autocomplete="tel"
          [class]="inputClasses"
          [formField]="profileForm.phone"
        />
      </app-form-field>
      <app-form-field
        label="Langue des e-mails"
        controlId="profile-locale"
        [field]="profileForm.locale"
      >
        <app-select id="profile-locale" [formField]="profileForm.locale">
          <app-option value="fr">Français</app-option>
          <app-option value="en">English</app-option>
        </app-select>
      </app-form-field>
      @if (feedback(); as text) {
        <p class="text-body-sm sm:col-span-2" [class]="failed() ? 'text-error' : 'text-success'">
          {{ text }}
        </p>
      }
      <div class="flex justify-end sm:col-span-2">
        <button appButton type="submit" [disabled]="!canSubmit()">Enregistrer</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileForm {
  private readonly auth = inject(AuthStore);
  protected readonly inputClasses = inputClasses;
  protected readonly model = signal<ProfileValue>({ fullName: '', phone: '', locale: 'fr' });
  protected readonly profileForm = form(this.model, (path) =>
    validateStandardSchema(path, profileSchema),
  );
  protected readonly feedback = signal<string | null>(null);
  protected readonly failed = signal(false);
  private readonly update = injectUpdateProfileMutation();
  protected readonly canSubmit = computed(
    () => this.profileForm().dirty() && this.profileForm().valid() && !this.update.isPending(),
  );

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user && !this.profileForm().dirty()) {
        this.profileForm().reset({
          fullName: user.fullName,
          phone: user.phone ?? '',
          locale: user.locale,
        });
      }
    });
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.profileForm, async () => {
      this.feedback.set(null);
      try {
        const user = await this.update.mutateAsync(profileSchema.parse(this.model()));
        this.profileForm().reset({
          fullName: user.fullName,
          phone: user.phone ?? '',
          locale: user.locale,
        });
        this.failed.set(false);
        this.feedback.set('Profil enregistré.');
      } catch (error) {
        this.failed.set(true);
        this.feedback.set(problemMessage(error, 'Enregistrement impossible'));
      }
      return undefined;
    });
  }
}
