import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { Card, SegmentOption, Segmented, Spinner } from '@shared/ui';
import { formatMoney } from '@shared/utils/money';
import { injectOrganizationInsightsQuery } from '../service-requests.queries';

const weekFormat = new Intl.DateTimeFormat('fr-TN', { day: 'numeric', month: 'short' });

// Chart box in SVG units; the SVG scales to the card width.
const WIDTH = 600;
const HEIGHT = 200;
const PAD_LEFT = 28;
const PAD_BOTTOM = 24;

/** Garage activity: requests received vs completed per week, key rates and top services. */
@Component({
  selector: 'app-request-insights',
  imports: [Card, Segmented, Spinner],
  template: `
    <app-card class="flex flex-col gap-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-h4">Activité</h2>
          <p class="text-caption text-foreground-muted">
            Demandes reçues et terminées par semaine.
          </p>
        </div>
        <app-segmented
          label="Période"
          [options]="periods"
          [value]="weeks()"
          (valueChange)="weeks.set($event)"
        />
      </div>

      @if (insights.isPending()) {
        <app-spinner />
      } @else if (insights.data(); as data) {
        <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-xl bg-background-subtle p-3">
            <dt class="text-caption text-foreground-muted">Reçues</dt>
            <dd class="text-stat text-foreground">{{ data.received }}</dd>
          </div>
          <div class="rounded-xl bg-background-subtle p-3">
            <dt class="text-caption text-foreground-muted">Terminées</dt>
            <dd class="text-stat text-foreground">{{ data.completed }}</dd>
          </div>
          <div class="rounded-xl bg-background-subtle p-3">
            <dt class="text-caption text-foreground-muted">Taux d’acceptation</dt>
            <dd class="text-stat text-foreground">{{ rate() }}</dd>
          </div>
          <div class="rounded-xl bg-background-subtle p-3">
            <dt class="text-caption text-foreground-muted">Devis acceptés</dt>
            <dd class="text-price text-primary">{{ formatMoney(data.acceptedQuotes) }}</dd>
          </div>
        </dl>

        <figure class="flex flex-col gap-2">
          <svg
            [attr.viewBox]="'0 0 ' + width + ' ' + height"
            class="h-auto w-full"
            role="img"
            [attr.aria-label]="chartLabel()"
          >
            @for (line of gridLines(); track line.value) {
              <line
                [attr.x1]="padLeft"
                [attr.x2]="width"
                [attr.y1]="line.y"
                [attr.y2]="line.y"
                class="stroke-border-subtle"
                stroke-width="1"
              />
              <text
                [attr.x]="padLeft - 6"
                [attr.y]="line.y + 4"
                text-anchor="end"
                class="fill-foreground-muted text-[11px]"
              >
                {{ line.value }}
              </text>
            }
            @for (bar of bars(); track bar.weekStart) {
              <g>
                <title>{{ bar.title }}</title>
                <rect
                  [attr.x]="bar.x"
                  [attr.y]="bar.createdY"
                  [attr.width]="bar.width"
                  [attr.height]="bar.createdHeight"
                  rx="3"
                  class="fill-primary"
                />
                <rect
                  [attr.x]="bar.x + bar.width + 2"
                  [attr.y]="bar.completedY"
                  [attr.width]="bar.width"
                  [attr.height]="bar.completedHeight"
                  rx="3"
                  class="fill-accent"
                />
                @if (bar.label) {
                  <text
                    [attr.x]="bar.x + bar.width"
                    [attr.y]="height - 6"
                    text-anchor="middle"
                    class="fill-foreground-muted text-[11px]"
                  >
                    {{ bar.label }}
                  </text>
                }
              </g>
            }
          </svg>
          <figcaption class="flex gap-4 text-caption text-foreground-secondary">
            <span class="flex items-center gap-1.5"
              ><span class="size-2.5 rounded-sm bg-primary"></span>Reçues</span
            >
            <span class="flex items-center gap-1.5"
              ><span class="size-2.5 rounded-sm bg-accent"></span>Terminées</span
            >
          </figcaption>
        </figure>

        <div class="flex flex-col gap-2">
          <h3 class="text-label">Services les plus demandés</h3>
          @for (service of data.topServices; track service.serviceId) {
            <div class="flex items-center gap-3 text-body-sm">
              <span class="w-32 shrink-0 truncate text-foreground">{{
                service.name ?? 'Service retiré'
              }}</span>
              <span class="h-2 flex-1 overflow-hidden rounded-full bg-background-subtle">
                <span
                  class="block h-full rounded-full bg-primary"
                  [style.width.%]="(service.count / topMax()) * 100"
                ></span>
              </span>
              <span class="w-8 text-right text-foreground-secondary tabular-nums">{{
                service.count
              }}</span>
            </div>
          } @empty {
            <p class="text-body-sm text-foreground-muted">Pas encore de demande sur la période.</p>
          }
        </div>
      }
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestInsights {
  readonly organizationId = input.required<number>();

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly padLeft = PAD_LEFT;
  protected readonly formatMoney = formatMoney;
  protected readonly periods: SegmentOption<number>[] = [
    { value: 4, label: '4 sem.' },
    { value: 12, label: '12 sem.' },
    { value: 26, label: '6 mois' },
  ];
  protected readonly weeks = signal(12);
  protected readonly insights = injectOrganizationInsightsQuery(
    () => this.organizationId(),
    () => this.weeks(),
  );

  /** Rounded up to a multiple of 4 so the 4 grid lines are whole numbers. */
  private readonly max = computed(() => {
    const top = Math.max(
      1,
      ...(this.insights.data()?.weeks ?? []).map((w) => Math.max(w.created, w.completed)),
    );
    return Math.ceil(top / 4) * 4;
  });
  protected readonly topMax = computed(() =>
    Math.max(1, ...(this.insights.data()?.topServices ?? []).map((s) => s.count)),
  );

  protected readonly rate = computed(() => {
    const rate = this.insights.data()?.acceptRate;
    return rate === null || rate === undefined ? '—' : `${Math.round(rate * 100)} %`;
  });

  protected readonly gridLines = computed(() =>
    [0, 1, 2, 3, 4].map((step) => {
      const value = (this.max() / 4) * step;
      return { value, y: this.y(value) };
    }),
  );

  protected readonly bars = computed(() => {
    const weeks = this.insights.data()?.weeks ?? [];
    const slot = (WIDTH - PAD_LEFT) / Math.max(1, weeks.length);
    const width = Math.max(2, Math.min(18, slot / 2 - 4));
    // Keep about 6 date labels whatever the period.
    const every = Math.max(1, Math.round(weeks.length / 6));
    return weeks.map((week, index) => {
      const x = PAD_LEFT + index * slot + (slot - 2 * width - 2) / 2;
      const date = weekFormat.format(new Date(week.weekStart));
      return {
        weekStart: week.weekStart,
        x,
        width,
        createdY: this.y(week.created),
        createdHeight: this.y(0) - this.y(week.created),
        completedY: this.y(week.completed),
        completedHeight: this.y(0) - this.y(week.completed),
        label: index % every === 0 ? date : '',
        title: `Semaine du ${date} : ${week.created} reçue(s), ${week.completed} terminée(s)`,
      };
    });
  });

  protected readonly chartLabel = computed(() => {
    const weeks = this.insights.data()?.weeks ?? [];
    const created = weeks.reduce((sum, w) => sum + w.created, 0);
    const completed = weeks.reduce((sum, w) => sum + w.completed, 0);
    return `${weeks.length} semaines : ${created} demandes reçues, ${completed} terminées`;
  });

  private y(value: number): number {
    return HEIGHT - PAD_BOTTOM - (value / this.max()) * (HEIGHT - PAD_BOTTOM - 8);
  }
}
