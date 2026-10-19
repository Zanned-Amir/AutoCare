import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

import { problemMessage } from '@core/api/api';
import { Button, Card, Icon, Select, SelectOption, inputClasses } from '@shared/ui';
import { cn } from '@shared/utils/cn';
import { injectUpdateScheduleMutation } from '../organizations.queries';
import { BookingScheduleValue, Organization } from '../organizations.types';

interface Range {
  start: string;
  end: string;
}

interface DaySchedule {
  key: string;
  label: string;
  open: boolean;
  ranges: Range[];
}

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Lundi' },
  { key: 'tue', label: 'Mardi' },
  { key: 'wed', label: 'Mercredi' },
  { key: 'thu', label: 'Jeudi' },
  { key: 'fri', label: 'Vendredi' },
  { key: 'sat', label: 'Samedi' },
  { key: 'sun', label: 'Dimanche' },
];

// Same default as the backend BookingSchedule when no hours were ever saved.
const DEFAULT_RANGE = '08:00-18:00';
const DEFAULT_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function toDays(hours: Record<string, string>): DaySchedule[] {
  const empty = Object.keys(hours ?? {}).length === 0;
  return DAYS.map(({ key, label }) => {
    const raw = empty ? (DEFAULT_DAYS.includes(key) ? DEFAULT_RANGE : '') : (hours[key] ?? '');
    const ranges = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [start = '', end = ''] = part.split('-');
        return { start, end };
      });
    return {
      key,
      label,
      open: ranges.length > 0,
      ranges: ranges.length ? ranges : [{ start: '08:00', end: '18:00' }],
    };
  });
}

function toValue(
  days: DaySchedule[],
  slotMinutes: number,
  slotCapacity: number,
): BookingScheduleValue {
  const workingHours: Record<string, string> = {};
  for (const day of days) {
    if (day.open) workingHours[day.key] = day.ranges.map((r) => `${r.start}-${r.end}`).join(',');
  }
  return { workingHours, slotMinutes, slotCapacity };
}

/** Same JSON for the same schedule whatever the key order, to compare with what is saved. */
function fingerprint(value: BookingScheduleValue): string {
  const hours = Object.keys(value.workingHours)
    .sort()
    .map((key) => `${key}=${value.workingHours[key]}`);
  return JSON.stringify([hours, value.slotMinutes, value.slotCapacity]);
}

/** Ranges of a day must be ordered, non-empty and must not overlap. */
function dayError(day: DaySchedule): string | null {
  if (!day.open) return null;
  let previousEnd = '';
  for (const range of day.ranges) {
    if (!range.start || !range.end) return 'Heure manquante';
    if (range.start >= range.end) return 'La fin doit être après le début';
    if (previousEnd && range.start < previousEnd) return 'Les plages se chevauchent';
    previousEnd = range.end;
  }
  return null;
}

/** Opening hours and appointment slots of a provider; clients pick a time from them. */
@Component({
  selector: 'app-booking-schedule-form',
  imports: [Button, Card, Icon, Select, SelectOption],
  template: `
    <app-card class="flex flex-col gap-5">
      <div>
        <h2 class="text-h4">Horaires et créneaux</h2>
        <p class="mt-1 text-body-sm text-foreground-secondary">
          Les clients réservent une heure parmi ces créneaux ; un créneau plein n’est plus proposé.
        </p>
      </div>

      <form id="schedule-form" class="flex flex-col gap-5" (submit)="save($event)" novalidate>
        <ul
          class="flex flex-col divide-y divide-border-subtle rounded-xl border border-border-subtle"
        >
          @for (day of days(); track day.key; let index = $index) {
            <li class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start">
              <label class="flex w-36 shrink-0 cursor-pointer items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  class="size-4 accent-primary"
                  [checked]="day.open"
                  (change)="toggleDay(index, $any($event.target).checked)"
                />
                <span class="text-label">{{ day.label }}</span>
              </label>
              @if (day.open) {
                <div class="flex flex-1 flex-col gap-2">
                  @for (range of day.ranges; track $index; let rangeIndex = $index) {
                    <div class="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        step="900"
                        [class]="timeClass"
                        [attr.aria-label]="day.label + ', début de la plage ' + (rangeIndex + 1)"
                        [value]="range.start"
                        (change)="setTime(index, rangeIndex, 'start', $any($event.target).value)"
                      />
                      <span class="text-foreground-muted">à</span>
                      <input
                        type="time"
                        step="900"
                        [class]="timeClass"
                        [attr.aria-label]="day.label + ', fin de la plage ' + (rangeIndex + 1)"
                        [value]="range.end"
                        (change)="setTime(index, rangeIndex, 'end', $any($event.target).value)"
                      />
                      @if (day.ranges.length > 1) {
                        <button
                          type="button"
                          class="grid size-9 place-items-center rounded-full text-foreground-muted hover:bg-background-subtle hover:text-error"
                          [attr.aria-label]="
                            'Retirer la plage ' + (rangeIndex + 1) + ' du ' + day.label
                          "
                          (click)="removeRange(index, rangeIndex)"
                        >
                          <svg appIcon name="trash" class="size-4"></svg>
                        </button>
                      }
                    </div>
                  }
                  <div class="flex flex-wrap items-center gap-3">
                    @if (day.ranges.length < 3) {
                      <button
                        type="button"
                        class="text-body-sm font-semibold text-accent-text hover:underline"
                        (click)="addRange(index)"
                      >
                        + Ajouter une plage
                      </button>
                    }
                    @if (index > 0) {
                      <button
                        type="button"
                        class="text-body-sm text-foreground-secondary hover:underline"
                        (click)="copyPrevious(index)"
                      >
                        Comme la veille
                      </button>
                    }
                  </div>
                  @if (errors()[index]; as message) {
                    <p class="text-caption text-error">{{ message }}</p>
                  }
                </div>
              } @else {
                <p class="pt-2 text-body-sm text-foreground-muted">Fermé</p>
              }
            </li>
          }
        </ul>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <span class="text-[13px] font-medium text-foreground-secondary"
              >Durée d’un créneau</span
            >
            <app-select
              aria-label="Durée d’un créneau"
              [value]="slotMinutes()"
              (valueChange)="slotMinutes.set($event)"
            >
              @for (minutes of durations; track minutes) {
                <app-option [value]="minutes">{{ durationLabel(minutes) }}</app-option>
              }
            </app-select>
          </div>
          <label class="flex flex-col gap-1.5" for="slot-capacity">
            <span class="text-[13px] font-medium text-foreground-secondary"
              >Clients par créneau</span
            >
            <input
              id="slot-capacity"
              type="number"
              min="1"
              max="20"
              inputmode="numeric"
              [class]="inputClasses"
              [attr.aria-invalid]="!capacityValid() || null"
              [value]="slotCapacity()"
              (input)="slotCapacity.set(+$any($event.target).value)"
            />
            <span class="text-caption text-foreground-muted"
              >Nombre de postes ou de techniciens disponibles en même temps (1 à 20).</span
            >
          </label>
        </div>

        @if (noOpenDay()) {
          <p class="text-body-sm text-error">Ouvrez au moins un jour.</p>
        }
        @if (error(); as message) {
          <p class="rounded-control bg-error-subtle px-3 py-2 text-body-sm text-error">
            {{ message }}
          </p>
        }
        @if (saved()) {
          <p class="text-body-sm text-success" role="status">Horaires enregistrés.</p>
        }

        <div class="flex justify-end gap-2">
          <button
            appButton
            variant="secondary"
            type="button"
            [disabled]="!dirty()"
            (click)="discard()"
          >
            Annuler
          </button>
          <button appButton type="submit" [disabled]="!dirty() || !valid() || mutation.isPending()">
            Enregistrer
          </button>
        </div>
      </form>
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingScheduleForm {
  readonly organization = input.required<Organization>();

  protected readonly mutation = injectUpdateScheduleMutation();
  protected readonly inputClasses = inputClasses;
  protected readonly timeClass = cn(inputClasses, 'w-32 tabular-nums');
  protected readonly durations = [15, 30, 45, 60, 90, 120];

  protected readonly days = signal<DaySchedule[]>([]);
  protected readonly slotMinutes = signal(60);
  protected readonly slotCapacity = signal(1);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal(false);
  /** What the server holds; the form is dirty when it differs. */
  private readonly baseline = signal('');

  private readonly current = computed(() =>
    toValue(this.days(), this.slotMinutes(), this.slotCapacity()),
  );
  protected readonly dirty = computed(() => fingerprint(this.current()) !== this.baseline());
  protected readonly errors = computed(() => this.days().map(dayError));
  protected readonly noOpenDay = computed(
    () => this.days().length > 0 && !this.days().some((d) => d.open),
  );
  protected readonly capacityValid = computed(() => {
    const capacity = this.slotCapacity();
    return Number.isInteger(capacity) && capacity >= 1 && capacity <= 20;
  });
  protected readonly valid = computed(
    () => !this.noOpenDay() && this.capacityValid() && this.errors().every((e) => e === null),
  );

  constructor() {
    // Reload from the server only when what it holds changed (not on a refetch of the same data).
    effect(() => {
      const organization = this.organization();
      const server = fingerprint(
        toValue(
          toDays(organization.workingHours),
          organization.slotMinutes,
          organization.slotCapacity,
        ),
      );
      if (server !== this.baseline()) this.load(organization);
    });
  }

  protected durationLabel(minutes: number): string {
    return minutes < 60
      ? `${minutes} min`
      : minutes % 60
        ? `${Math.floor(minutes / 60)} h ${minutes % 60}`
        : `${minutes / 60} h`;
  }

  protected toggleDay(index: number, open: boolean): void {
    this.updateDay(index, (day) => ({ ...day, open }));
  }

  protected setTime(index: number, rangeIndex: number, field: keyof Range, value: string): void {
    this.updateDay(index, (day) => ({
      ...day,
      ranges: day.ranges.map((range, i) =>
        i === rangeIndex ? { ...range, [field]: value } : range,
      ),
    }));
  }

  protected addRange(index: number): void {
    this.updateDay(index, (day) => {
      const last = day.ranges[day.ranges.length - 1];
      const start = last?.end && last.end < '22:00' ? last.end : '14:00';
      return {
        ...day,
        ranges: [...day.ranges, { start, end: start < '18:00' ? '18:00' : '22:00' }],
      };
    });
  }

  protected removeRange(index: number, rangeIndex: number): void {
    this.updateDay(index, (day) => ({
      ...day,
      ranges: day.ranges.filter((_, i) => i !== rangeIndex),
    }));
  }

  protected copyPrevious(index: number): void {
    const previous = this.days()[index - 1];
    if (!previous) return;
    this.updateDay(index, (day) => ({
      ...day,
      open: previous.open,
      ranges: previous.ranges.map((range) => ({ ...range })),
    }));
  }

  protected discard(): void {
    this.load(this.organization());
  }

  protected save(event: Event): void {
    event.preventDefault();
    if (!this.dirty() || !this.valid()) return;
    this.error.set(null);
    this.saved.set(false);
    this.mutation
      .mutateAsync({ id: this.organization().id, value: this.current() })
      .then((organization) => {
        this.load(organization);
        this.saved.set(true);
      })
      .catch((error: unknown) =>
        this.error.set(problemMessage(error, 'Enregistrement impossible')),
      );
  }

  private load(organization: Organization): void {
    this.days.set(toDays(organization.workingHours));
    this.slotMinutes.set(organization.slotMinutes);
    this.slotCapacity.set(organization.slotCapacity);
    this.baseline.set(fingerprint(this.current()));
  }

  private updateDay(index: number, change: (day: DaySchedule) => DaySchedule): void {
    this.saved.set(false);
    this.days.update((days) => days.map((day, i) => (i === index ? change(day) : day)));
  }
}
