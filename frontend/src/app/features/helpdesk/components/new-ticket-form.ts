import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import {
  FormField as SignalFormField,
  form,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import { z } from 'zod';

import { problemMessage } from '@core/api/api';
import { Button, FormField, inputClasses, Select, SelectOption } from '@shared/ui';
import { injectCustomerTicketMutations } from '../helpdesk.queries';
import { CATEGORIES, Ticket, categoryLabels } from '../helpdesk.types';

const schema = z.object({
  subject: z.string().trim().min(1, 'Le sujet est obligatoire').max(160, '160 caractères maximum'),
  category: z.enum([
    'ACCOUNT',
    'SERVICE_REQUEST',
    'PROVIDER',
    'VEHICLE',
    'BILLING',
    'TECHNICAL',
    'OTHER',
  ]),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']),
  description: z.string().trim().min(10, 'Décrivez le problème (10 caractères minimum)').max(10000),
});
type Value = z.infer<typeof schema>;
const empty: Value = { subject: '', category: 'OTHER', priority: 'NORMAL', description: '' };

@Component({
  selector: 'app-new-ticket-form',
  imports: [Select, SelectOption, Button, FormField, SignalFormField],
  template: `
    <form class="grid gap-4 sm:grid-cols-2" (submit)="save($event)" novalidate>
      <app-form-field
        label="Sujet"
        controlId="ticket-subject"
        [field]="ticketForm.subject"
        class="sm:col-span-2"
      >
        <input
          id="ticket-subject"
          [class]="inputClasses"
          [formField]="ticketForm.subject"
          placeholder="Le garage n'est pas venu"
        />
      </app-form-field>
      <app-form-field
        label="Il s'agit de"
        controlId="ticket-category"
        [field]="ticketForm.category"
      >
        <app-select id="ticket-category" [formField]="ticketForm.category">
          @for (c of categories; track c) {
            <app-option [value]="c">{{ categoryLabels[c] }}</app-option>
          }
        </app-select>
      </app-form-field>
      <app-form-field label="Urgence" controlId="ticket-priority" [field]="ticketForm.priority">
        <app-select id="ticket-priority" [formField]="ticketForm.priority">
          <app-option value="LOW">Pas pressé</app-option>
          <app-option value="NORMAL">Normale</app-option>
          <app-option value="HIGH">Bloquant</app-option>
        </app-select>
      </app-form-field>
      <app-form-field
        label="Description"
        controlId="ticket-description"
        [field]="ticketForm.description"
        class="sm:col-span-2"
      >
        <textarea
          id="ticket-description"
          [class]="inputClasses + ' h-32 py-2'"
          [formField]="ticketForm.description"
        ></textarea>
      </app-form-field>
      @if (error(); as message) {
        <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error sm:col-span-2">
          {{ message }}
        </p>
      }
      <div class="flex justify-end gap-2 sm:col-span-2">
        <button appButton variant="ghost" type="button" (click)="cancelled.emit()">Annuler</button>
        <button appButton type="submit" [disabled]="!canSubmit()">Envoyer la demande</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewTicketForm {
  readonly created = output<Ticket>();
  readonly cancelled = output<void>();

  protected readonly inputClasses = inputClasses;
  protected readonly categories = CATEGORIES;
  protected readonly categoryLabels = categoryLabels;
  protected readonly model = signal<Value>(empty);
  protected readonly ticketForm = form(this.model, (p) => validateStandardSchema(p, schema));
  protected readonly error = signal<string | null>(null);
  private readonly mutations = injectCustomerTicketMutations();
  protected readonly canSubmit = computed(
    () =>
      this.ticketForm().dirty() && this.ticketForm().valid() && !this.mutations.create.isPending(),
  );

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.ticketForm, async () => {
      this.error.set(null);
      try {
        const ticket = await this.mutations.create.mutateAsync(schema.parse(this.model()));
        this.ticketForm().reset(empty);
        this.created.emit(ticket);
      } catch (e) {
        this.error.set(problemMessage(e, 'Envoi impossible'));
      }
      return undefined;
    });
  }
}
