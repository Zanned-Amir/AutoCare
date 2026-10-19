import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import {
  FormField as SignalFormField,
  form,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';

import { problemMessage } from '@core/api/api';
import { injectActiveAutoServicesQuery } from '@features/catalog/catalog.queries';
import {
  Badge,
  BadgeTone,
  Button,
  ConfirmDialog,
  FormField,
  Icon,
  Modal,
  Select,
  SelectOption,
  Spinner,
  inputClasses,
} from '@shared/ui';
import { formatNumber } from '@shared/utils/number';
import { injectReminderMutations, injectRemindersQuery } from '../maintenance.queries';
import { MaintenanceReminderValue, maintenanceReminderSchema } from '../maintenance.schema';
import { MaintenanceReminder } from '../maintenance.types';

const dateFormat = new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium' });
const today = () => new Date().toISOString().slice(0, 10);

const toValue = (reminder: MaintenanceReminder | null): MaintenanceReminderValue =>
  reminder
    ? {
        title: reminder.title,
        serviceId: reminder.serviceId ? String(reminder.serviceId) : '',
        dueDate: reminder.dueDate ?? '',
        dueMileage: reminder.dueMileage === null ? '' : String(reminder.dueMileage),
        note: reminder.note ?? '',
      }
    : { title: '', serviceId: '', dueDate: '', dueMileage: '', note: '' };

/** Planned maintenance of a vehicle; the owner is notified 7 days or 500 km ahead. */
@Component({
  selector: 'app-maintenance-reminders',
  imports: [
    Badge,
    Button,
    ConfirmDialog,
    FormField,
    Icon,
    Modal,
    Select,
    SelectOption,
    SignalFormField,
    Spinner,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-h4">Rappels d’entretien</h2>
          <p class="text-body-sm text-foreground-secondary">
            Prévenu 7 jours ou 500 km avant l’échéance.
          </p>
        </div>
        <button appButton variant="secondary" size="sm" type="button" (click)="openForm(null)">
          <svg appIcon name="bell" class="size-4"></svg>
          Planifier
        </button>
      </div>

      @if (reminders.isPending()) {
        <app-spinner />
      } @else {
        <ul class="flex flex-col divide-y divide-border-subtle">
          @for (reminder of open(); track reminder.id) {
            <li class="flex items-start gap-3 py-3">
              <span
                [class]="
                  'mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ' +
                  (reminder.due
                    ? 'bg-warning-subtle text-warning'
                    : 'bg-background-subtle text-primary')
                "
              >
                <svg appIcon name="clock" class="size-4"></svg>
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-label text-foreground">{{ reminder.title }}</p>
                  @if (status(reminder); as badge) {
                    <app-badge [tone]="badge.tone">{{ badge.label }}</app-badge>
                  }
                </div>
                <p class="text-body-sm text-foreground-secondary">{{ dueText(reminder) }}</p>
                @if (reminder.note; as note) {
                  <p class="text-caption text-foreground-muted">{{ note }}</p>
                }
              </div>
              <div class="flex shrink-0 items-center gap-1">
                <button
                  appButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  [disabled]="mutations.complete.isPending()"
                  (click)="complete(reminder)"
                >
                  <svg appIcon name="check" class="size-4"></svg>
                  Fait
                </button>
                <button
                  type="button"
                  class="grid size-9 place-items-center rounded-full text-foreground-muted hover:bg-background-subtle hover:text-foreground"
                  [attr.aria-label]="'Modifier ' + reminder.title"
                  (click)="openForm(reminder)"
                >
                  <svg appIcon name="settings" class="size-4"></svg>
                </button>
                <button
                  type="button"
                  class="grid size-9 place-items-center rounded-full text-foreground-muted hover:bg-background-subtle hover:text-error"
                  [attr.aria-label]="'Supprimer ' + reminder.title"
                  (click)="removing.set(reminder)"
                >
                  <svg appIcon name="trash" class="size-4"></svg>
                </button>
              </div>
            </li>
          } @empty {
            <li class="py-3 text-body-sm text-foreground-muted">
              Aucun rappel. Planifiez la prochaine vidange, le contrôle technique ou l’assurance.
            </li>
          }
        </ul>
        @if (done().length) {
          <details class="text-body-sm">
            <summary class="cursor-pointer text-foreground-secondary">
              Faits ({{ done().length }})
            </summary>
            <ul class="mt-2 flex flex-col gap-1">
              @for (reminder of done(); track reminder.id) {
                <li class="flex items-center justify-between gap-3 text-foreground-muted">
                  <span class="line-through">{{ reminder.title }}</span>
                  <button
                    type="button"
                    class="text-caption hover:text-error hover:underline"
                    (click)="removing.set(reminder)"
                  >
                    Supprimer
                  </button>
                </li>
              }
            </ul>
          </details>
        }
        @if (actionError(); as message) {
          <p class="text-body-sm text-error" role="alert">{{ message }}</p>
        }
      }
    </div>

    <app-modal
      [title]="editing() ? 'Modifier le rappel' : 'Planifier un entretien'"
      description="Date, kilométrage ou les deux : le premier atteint déclenche le rappel."
      [open]="formOpen()"
      (closed)="formOpen.set(false)"
    >
      <form id="reminder-form" class="grid gap-4 sm:grid-cols-2" (submit)="save($event)" novalidate>
        <app-form-field
          label="Service (optionnel)"
          controlId="reminder-service"
          [field]="reminderForm.serviceId"
          class="sm:col-span-2"
        >
          <app-select
            id="reminder-service"
            [formField]="reminderForm.serviceId"
            (valueChange)="suggestTitle($event)"
          >
            <app-option value="">Autre</app-option>
            @for (service of services.data() ?? []; track service.id) {
              <app-option [value]="'' + service.id">{{ service.name }}</app-option>
            }
          </app-select>
        </app-form-field>
        <app-form-field
          label="Titre"
          controlId="reminder-title"
          [field]="reminderForm.title"
          class="sm:col-span-2"
        >
          <input
            id="reminder-title"
            [class]="inputClasses"
            placeholder="Vidange, contrôle technique, assurance…"
            [formField]="reminderForm.title"
          />
        </app-form-field>
        <app-form-field
          label="Date d’échéance"
          controlId="reminder-date"
          [field]="reminderForm.dueDate"
        >
          <input
            id="reminder-date"
            type="date"
            [min]="today"
            [class]="inputClasses"
            [formField]="reminderForm.dueDate"
          />
        </app-form-field>
        <app-form-field
          label="Ou à (km)"
          controlId="reminder-mileage"
          [field]="reminderForm.dueMileage"
        >
          <input
            id="reminder-mileage"
            inputmode="numeric"
            [class]="inputClasses"
            [placeholder]="mileageHint()"
            [formField]="reminderForm.dueMileage"
          />
        </app-form-field>
        <app-form-field
          label="Note (optionnel)"
          controlId="reminder-note"
          [field]="reminderForm.note"
          class="sm:col-span-2"
        >
          <textarea
            id="reminder-note"
            [class]="inputClasses + ' h-20 py-2'"
            [formField]="reminderForm.note"
          ></textarea>
        </app-form-field>
        @if (serverError(); as message) {
          <p
            class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error sm:col-span-2"
          >
            {{ message }}
          </p>
        }
      </form>
      <button footer appButton variant="secondary" type="button" (click)="formOpen.set(false)">
        Annuler
      </button>
      <button footer appButton type="submit" form="reminder-form" [disabled]="!canSubmit()">
        Enregistrer
      </button>
    </app-modal>

    <app-confirm-dialog
      title="Supprimer ce rappel ?"
      [description]="'« ' + (removing()?.title ?? '') + ' » ne sera plus rappelé.'"
      confirmLabel="Supprimer"
      tone="danger"
      icon="trash"
      [open]="removing() !== null"
      [busy]="mutations.remove.isPending()"
      (confirmed)="remove()"
      (cancelled)="removing.set(null)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceReminders {
  readonly vehicleId = input.required<number>();
  readonly currentMileage = input(0);

  protected readonly today = today();
  protected readonly inputClasses = inputClasses;
  protected readonly services = injectActiveAutoServicesQuery();
  protected readonly reminders = injectRemindersQuery(() => this.vehicleId());
  protected readonly mutations = injectReminderMutations(() => this.vehicleId());

  protected readonly open = computed(() => (this.reminders.data() ?? []).filter((r) => !r.doneAt));
  protected readonly done = computed(() => (this.reminders.data() ?? []).filter((r) => !!r.doneAt));
  protected readonly mileageHint = computed(
    () => `${formatNumber(this.currentMileage() + 10_000)}`,
  );

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<MaintenanceReminder | null>(null);
  protected readonly removing = signal<MaintenanceReminder | null>(null);
  protected readonly serverError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly model = signal<MaintenanceReminderValue>(toValue(null));
  protected readonly reminderForm = form(this.model, (path) =>
    validateStandardSchema(path, maintenanceReminderSchema),
  );
  protected readonly canSubmit = computed(
    () =>
      this.reminderForm().dirty() &&
      this.reminderForm().valid() &&
      !this.mutations.save.isPending(),
  );

  constructor() {
    effect(() => {
      if (!this.formOpen()) return;
      this.reminderForm().reset(toValue(this.editing()));
      this.serverError.set(null);
    });
  }

  protected status(reminder: MaintenanceReminder): { tone: BadgeTone; label: string } | null {
    if (!reminder.due) return null;
    const overdue =
      (reminder.dueDate !== null && reminder.dueDate < this.today) ||
      (reminder.dueMileage !== null && this.currentMileage() >= reminder.dueMileage);
    return overdue ? { tone: 'error', label: 'En retard' } : { tone: 'warning', label: 'Bientôt' };
  }

  protected dueText(reminder: MaintenanceReminder): string {
    const parts: string[] = [];
    if (reminder.dueDate) parts.push(`Le ${dateFormat.format(new Date(reminder.dueDate))}`);
    if (reminder.dueMileage !== null) {
      const left = reminder.dueMileage - this.currentMileage();
      const km = `${formatNumber(reminder.dueMileage)} km`;
      parts.push(left > 0 ? `à ${km} (encore ${formatNumber(left)} km)` : `à ${km} (dépassé)`);
    }
    return parts.join(' ou ');
  }

  protected openForm(reminder: MaintenanceReminder | null): void {
    this.editing.set(reminder);
    this.formOpen.set(true);
  }

  /** Picking a service fills an empty title with its name. */
  protected suggestTitle(serviceId: string): void {
    const service = (this.services.data() ?? []).find((s) => String(s.id) === serviceId);
    if (service && !this.model().title.trim()) {
      this.reminderForm.title().value.set(service.name);
    }
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.reminderForm, async () => {
      this.serverError.set(null);
      try {
        const saved = await this.mutations.save.mutateAsync({
          id: this.editing()?.id ?? null,
          value: maintenanceReminderSchema.parse(this.model()),
        });
        this.reminderForm().reset(toValue(saved));
        this.formOpen.set(false);
      } catch (error) {
        this.serverError.set(problemMessage(error, 'Enregistrement impossible'));
      }
      return undefined;
    });
  }

  protected complete(reminder: MaintenanceReminder): void {
    this.actionError.set(null);
    this.mutations.complete
      .mutateAsync(reminder.id)
      .catch((error: unknown) => this.actionError.set(problemMessage(error, 'Action impossible')));
  }

  protected remove(): void {
    const reminder = this.removing();
    if (!reminder) return;
    this.mutations.remove
      .mutateAsync(reminder.id)
      .then(() => this.removing.set(null))
      .catch((error: unknown) => {
        this.removing.set(null);
        this.actionError.set(problemMessage(error, 'Suppression impossible'));
      });
  }
}
