import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Button, Card, Drawer, Icon, SegmentOption, Segmented, Spinner } from '@shared/ui';
import { cn } from '@shared/utils/cn';
import { injectOrganizationCalendarQuery } from '../service-requests.queries';
import {
  RequestStatus,
  ServiceRequest,
  locationLabels,
  requestStatusLabels,
} from '../service-requests.types';
import { RequestChat } from './request-chat';
import { RequestStatusBadge } from './request-status-badge';

type View = 'month' | 'week';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH = new Intl.DateTimeFormat('fr-TN', { month: 'long', year: 'numeric' });
const DAY_LONG = new Intl.DateTimeFormat('fr-TN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const DAY_SHORT = new Intl.DateTimeFormat('fr-TN', { day: 'numeric', month: 'short' });
/** Closed requests stay in history but are hidden by default: the calendar is for upcoming work. */
const CLOSED: RequestStatus[] = ['REJECTED', 'CANCELLED'];
const PILL: Record<RequestStatus, string> = {
  PENDING: 'bg-warning-subtle text-warning',
  CONFIRMED: 'bg-primary-subtle text-primary',
  IN_PROGRESS: 'bg-info-subtle text-info',
  COMPLETED: 'bg-success-subtle text-success',
  REJECTED: 'bg-error-subtle text-error line-through',
  CANCELLED: 'bg-surface-muted text-foreground-muted line-through',
};

interface Day {
  key: string;
  date: Date;
  inMonth: boolean;
  today: boolean;
  requests: ServiceRequest[];
}

/**
 * The workspace calendar: requests by desired day (and time when booked), as a month grid with
 * the chosen day's agenda beside it, or a week of columns. A request opens in a drawer.
 */
@Component({
  selector: 'app-request-calendar',
  imports: [
    Button,
    Card,
    Drawer,
    Icon,
    NgTemplateOutlet,
    RequestChat,
    RequestStatusBadge,
    RouterLink,
    Segmented,
    Spinner,
  ],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <button
          appButton
          variant="secondary"
          size="sm"
          type="button"
          aria-label="Période précédente"
          (click)="move(-1)"
        >
          <svg appIcon name="chevron-left" class="size-4"></svg>
        </button>
        <button
          appButton
          variant="secondary"
          size="sm"
          type="button"
          aria-label="Période suivante"
          (click)="move(1)"
        >
          <svg appIcon name="chevron-right" class="size-4"></svg>
        </button>
        <button appButton variant="ghost" size="sm" type="button" (click)="goToday()">
          Aujourd’hui
        </button>
        <h2 class="ml-1 text-h4 text-foreground first-letter:uppercase">{{ title() }}</h2>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2 text-body-sm text-foreground-secondary">
          <input
            type="checkbox"
            class="size-4 accent-primary"
            [checked]="showClosed()"
            (change)="showClosed.set(!showClosed())"
          />
          Refusées et annulées
        </label>
        <app-segmented
          label="Affichage"
          [options]="views"
          [value]="view()"
          (valueChange)="view.set($event)"
        />
      </div>
    </div>

    <div class="mt-3 flex flex-wrap gap-2" aria-label="Légende">
      @for (status of legend; track status) {
        <span [class]="pillClass(status) + ' px-2.5 py-1'">{{ labels[status] }}</span>
      }
    </div>

    @if (calendar.isPending()) {
      <div class="mt-6"><app-spinner /></div>
    } @else if (view() === 'month') {
      <div class="mt-4 grid gap-6 xl:grid-cols-[1fr_320px]">
        <app-card class="overflow-hidden p-0">
          <div class="grid grid-cols-7 border-b border-border-subtle bg-background-subtle">
            @for (weekday of weekdays; track weekday) {
              <span
                class="px-2 py-2 text-center text-overline text-foreground-secondary uppercase"
                >{{ weekday }}</span
              >
            }
          </div>
          <div class="grid grid-cols-7">
            @for (day of days(); track day.key) {
              <button
                type="button"
                [class]="cellClass(day)"
                [attr.aria-label]="dayLabel(day)"
                [attr.aria-pressed]="day.key === selectedKey()"
                (click)="selectedKey.set(day.key)"
              >
                <span [class]="dateClass(day)">{{ day.date.getDate() }}</span>
                <span class="mt-1 hidden flex-col gap-1 sm:flex">
                  @for (request of day.requests.slice(0, 3); track request.id) {
                    <span [class]="pillClass(request.status) + ' truncate px-1.5 py-0.5 text-left'">
                      {{ time(request) }} {{ request.service.name }}
                    </span>
                  }
                  @if (day.requests.length > 3) {
                    <span class="px-1 text-caption text-foreground-muted"
                      >+{{ day.requests.length - 3 }} autre(s)</span
                    >
                  }
                </span>
                @if (day.requests.length) {
                  <span
                    class="mt-1 grid size-5 place-items-center rounded-full bg-accent text-caption font-semibold text-accent-foreground sm:hidden"
                    >{{ day.requests.length }}</span
                  >
                }
              </button>
            }
          </div>
        </app-card>

        <app-card class="flex flex-col gap-3 p-0">
          <div class="px-5 pt-5">
            <p class="text-overline text-accent-text uppercase">Programme</p>
            <h3 class="text-h4 text-foreground first-letter:uppercase">{{ selectedTitle() }}</h3>
          </div>
          <ul class="flex flex-col gap-2 px-5 pb-5">
            @for (request of selectedRequests(); track request.id) {
              <li>
                <ng-container
                  *ngTemplateOutlet="requestCard; context: { $implicit: request }"
                ></ng-container>
              </li>
            } @empty {
              <li
                class="rounded-xl border border-dashed border-border px-4 py-6 text-center text-body-sm text-foreground-secondary"
              >
                Rien de prévu ce jour-là.
              </li>
            }
          </ul>
        </app-card>
      </div>
    } @else {
      <div class="mt-4 grid gap-3 md:grid-cols-7">
        @for (day of days(); track day.key) {
          <app-card
            [class]="
              day.today ? 'flex flex-col gap-2 border-accent p-3' : 'flex flex-col gap-2 p-3'
            "
          >
            <p class="text-label text-foreground first-letter:uppercase">
              {{ weekdayOf(day) }}
              <span class="font-normal text-foreground-muted">{{ shortDate(day) }}</span>
            </p>
            @for (request of day.requests; track request.id) {
              <ng-container
                *ngTemplateOutlet="requestCard; context: { $implicit: request }"
              ></ng-container>
            } @empty {
              <p class="text-caption text-foreground-muted">—</p>
            }
          </app-card>
        }
      </div>
    }

    <ng-template #requestCard let-request>
      <button
        type="button"
        class="flex w-full flex-col gap-1 rounded-xl border border-border-subtle bg-surface px-3 py-2.5 text-left transition-colors hover:border-primary"
        (click)="opened.set(request)"
      >
        <span class="flex items-center justify-between gap-2">
          <span class="text-label text-foreground">{{ time(request) || 'Journée' }}</span>
          <span [class]="pillClass(request.status) + ' px-2 py-0.5'">{{
            statusLabel(request)
          }}</span>
        </span>
        <span class="truncate text-body-sm text-foreground">{{ request.service.name }}</span>
        <span class="truncate text-caption text-foreground-muted">
          {{ request.customer?.fullName }}
          @if (request.vehicle; as vehicle) {
            · {{ vehicle.brand }} {{ vehicle.model }}
          }
        </span>
      </button>
    </ng-template>

    <app-drawer
      [title]="opened()?.service?.name ?? 'Demande'"
      [description]="opened() ? fullDate(opened()!) : null"
      [open]="opened() !== null"
      (closed)="opened.set(null)"
    >
      @if (opened(); as request) {
        <div class="flex flex-col gap-4 text-body-sm">
          <app-request-status-badge [status]="request.status" />
          <dl class="flex flex-col gap-3">
            @if (request.customer; as customer) {
              <div>
                <dt class="text-caption text-foreground-muted">Client</dt>
                <dd class="text-foreground">{{ customer.fullName }}</dd>
                <dd class="text-foreground-secondary">
                  {{ customer.phone ?? 'Pas de téléphone' }} · {{ customer.email }}
                </dd>
              </div>
            }
            @if (request.vehicle; as vehicle) {
              <div>
                <dt class="text-caption text-foreground-muted">Véhicule</dt>
                <dd class="text-foreground">
                  {{ vehicle.brand }} {{ vehicle.model }} ({{ vehicle.year }}) ·
                  {{ vehicle.mileage }} km
                  @if (vehicle.plate) {
                    · <span class="text-plate">{{ vehicle.plate }}</span>
                  }
                </dd>
              </div>
            }
            <div>
              <dt class="text-caption text-foreground-muted">Lieu</dt>
              <dd class="text-foreground">
                {{ locations[request.locationType] }}
                @if (request.location) {
                  · {{ request.location }}
                }
              </dd>
            </div>
            @if (request.note) {
              <div>
                <dt class="text-caption text-foreground-muted">Note du client</dt>
                <dd class="text-foreground">{{ request.note }}</dd>
              </div>
            }
            @if (request.diagnostic?.possibleCause; as cause) {
              <div>
                <dt class="text-caption text-foreground-muted">Diagnostic</dt>
                <dd class="text-foreground">{{ cause }}</dd>
              </div>
            }
          </dl>
          <div class="flex flex-col gap-2 border-t border-border-subtle pt-4">
            <p class="text-label">Messages avec le client</p>
            <app-request-chat
              [requestId]="request.id"
              [organizationId]="organizationId()"
              [closed]="request.status === 'REJECTED' || request.status === 'CANCELLED'"
            />
          </div>
        </div>
      }
      @if (opened(); as request) {
        <a
          footer
          appButton
          [routerLink]="['..', 'requests']"
          [queryParams]="{ status: request.status }"
          (click)="opened.set(null)"
          >Traiter dans Demandes</a
        >
      }
    </app-drawer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestCalendar {
  readonly organizationId = input.required<number>();

  protected readonly weekdays = WEEKDAYS;
  protected readonly labels = requestStatusLabels;
  protected readonly locations = locationLabels;
  protected readonly legend: RequestStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
  protected readonly views: SegmentOption<View>[] = [
    { value: 'month', label: 'Mois' },
    { value: 'week', label: 'Semaine' },
  ];

  protected readonly view = signal<View>('month');
  protected readonly anchor = signal(startOfDay(new Date()));
  protected readonly selectedKey = signal(toKey(new Date()));
  protected readonly showClosed = signal(false);
  protected readonly opened = signal<ServiceRequest | null>(null);

  /** First and last day shown: whole weeks (Monday to Sunday) around the month or the week. */
  private readonly range = computed(() => {
    const anchor = this.anchor();
    if (this.view() === 'week') {
      const start = mondayOf(anchor);
      return { start, end: addDays(start, 6) };
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { start: mondayOf(first), end: addDays(mondayOf(last), 6) };
  });

  protected readonly calendar = injectOrganizationCalendarQuery(
    () => this.organizationId(),
    () => ({ from: toKey(this.range().start), to: toKey(this.range().end) }),
  );

  protected readonly days = computed<Day[]>(() => {
    const { start, end } = this.range();
    const byDay = new Map<string, ServiceRequest[]>();
    for (const request of this.calendar.data() ?? []) {
      if (!this.showClosed() && CLOSED.includes(request.status)) continue;
      byDay.set(request.desiredDate, [...(byDay.get(request.desiredDate) ?? []), request]);
    }
    const today = toKey(new Date());
    const month = this.anchor().getMonth();
    const days: Day[] = [];
    for (let date = start; date <= end; date = addDays(date, 1)) {
      const key = toKey(date);
      days.push({
        key,
        date,
        inMonth: this.view() === 'week' || date.getMonth() === month,
        today: key === today,
        requests: (byDay.get(key) ?? []).sort((a, b) =>
          (a.desiredTime ?? '').localeCompare(b.desiredTime ?? ''),
        ),
      });
    }
    return days;
  });

  protected readonly title = computed(() => {
    if (this.view() === 'month') return MONTH.format(this.anchor());
    const { start, end } = this.range();
    return `Semaine du ${DAY_SHORT.format(start)} au ${DAY_SHORT.format(end)}`;
  });

  protected readonly selectedRequests = computed(
    () => this.days().find((day) => day.key === this.selectedKey())?.requests ?? [],
  );
  protected readonly selectedTitle = computed(() =>
    DAY_LONG.format(new Date(this.selectedKey() + 'T00:00:00')),
  );

  protected move(step: number): void {
    const anchor = this.anchor();
    this.anchor.set(
      this.view() === 'week'
        ? addDays(anchor, 7 * step)
        : new Date(anchor.getFullYear(), anchor.getMonth() + step, 1),
    );
  }

  protected goToday(): void {
    const today = startOfDay(new Date());
    this.anchor.set(today);
    this.selectedKey.set(toKey(today));
  }

  protected statusLabel(request: ServiceRequest): string {
    return requestStatusLabels[request.status];
  }

  protected time(request: ServiceRequest): string {
    return request.desiredTime ? request.desiredTime.slice(0, 5) : '';
  }

  protected fullDate(request: ServiceRequest): string {
    const day = DAY_LONG.format(new Date(request.desiredDate + 'T00:00:00'));
    return request.desiredTime ? `${day} à ${this.time(request)}` : day;
  }

  protected weekdayOf(day: Day): string {
    return WEEKDAYS[(day.date.getDay() + 6) % 7]!;
  }

  protected shortDate(day: Day): string {
    return DAY_SHORT.format(day.date);
  }

  protected dayLabel(day: Day): string {
    return `${DAY_LONG.format(day.date)}, ${day.requests.length} demande(s)`;
  }

  protected pillClass(status: RequestStatus): string {
    return cn('rounded-full text-caption font-semibold', PILL[status]);
  }

  protected cellClass(day: Day): string {
    return cn(
      'flex min-h-16 flex-col items-start border-r border-b border-border-subtle p-1.5 text-left transition-colors hover:bg-background-subtle sm:min-h-28',
      !day.inMonth && 'bg-background-subtle/60 text-foreground-muted',
      day.key === this.selectedKey() && 'bg-primary-subtle hover:bg-primary-subtle',
    );
  }

  protected dateClass(day: Day): string {
    return cn(
      'grid size-7 place-items-center rounded-full text-body-sm',
      day.today ? 'bg-accent font-semibold text-accent-foreground' : 'text-foreground',
      !day.inMonth && !day.today && 'text-foreground-muted',
    );
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Weeks start on Monday, as in Tunisia's working calendar. */
function mondayOf(date: Date): Date {
  return addDays(date, -((date.getDay() + 6) % 7));
}

/** yyyy-MM-dd in local time (toISOString would shift to UTC). */
function toKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
