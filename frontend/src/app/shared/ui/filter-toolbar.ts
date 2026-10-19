import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { NgTemplateOutlet } from '@angular/common';

import { Button } from './button';
import { chipClass } from './chip';
import { Icon } from './icon';
import { Modal } from './modal';
import { Select, SelectOption } from './select';

export interface FilterOption {
  value: string;
  label: string;
}

/** One group of single-choice chips in the "Filtres" panel. */
export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  /** A search box above the chips, for long lists (gouvernorats…). */
  searchable?: boolean;
}

/** Chosen value per group key; null (or absent) means no filter. */
export type FilterValues = Record<string, string | null>;

const SEARCH_DELAY_MS = 400;
const VISIBLE_WHEN_SEARCHABLE = 6;

/**
 * toutestcasa FilterToolbar: a search pill that waits for a pause in typing, a "Filtres"
 * button with the number of active filters (a popover from md, a bottom sheet on a phone,
 * chips per group, Réinitialiser + Appliquer), an optional sort, and "Réinitialiser" while the
 * list is narrowed. Extra controls (a multi-select chip, dates) are projected after it.
 */
@Component({
  selector: 'app-filter-toolbar',
  imports: [Button, Icon, Modal, NgTemplateOutlet, Select, SelectOption],
  template: `
    <div class="flex flex-wrap items-center gap-2 md:gap-3">
      <div
        class="flex h-11 min-w-0 flex-[1_1_16rem] items-center gap-2.5 rounded-full border border-border bg-surface pr-1 pl-3.5 focus-within:border-accent md:h-12"
      >
        <svg appIcon name="search" class="size-5 text-foreground-secondary"></svg>
        <input
          type="search"
          [attr.aria-label]="searchPlaceholder()"
          [placeholder]="searchPlaceholder()"
          class="h-full min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-foreground-secondary"
          [value]="draft()"
          (input)="type($any($event.target).value)"
          (keydown.enter)="flush()"
        />
        @if (draft()) {
          <button
            type="button"
            aria-label="Effacer la recherche"
            class="grid size-8 place-items-center rounded-full text-foreground-muted hover:bg-background-subtle"
            (click)="type(''); flush()"
          >
            <svg appIcon name="x" class="size-4"></svg>
          </button>
        }
      </div>

      @if (groups().length) {
        <div class="relative">
          <button
            appButton
            variant="secondary"
            type="button"
            class="relative"
            [attr.aria-expanded]="open()"
            (click)="toggle()"
          >
            <svg appIcon name="sliders" class="size-[18px] md:mr-1.5"></svg>
            <span class="hidden md:inline">Filtres</span>
            @if (activeCount()) {
              <span
                class="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-accent text-caption font-semibold text-accent-foreground"
                >{{ activeCount() }}</span
              >
            }
          </button>
          @if (open() && !phone()) {
            <div
              class="absolute top-[calc(100%+8px)] right-0 z-[70] flex max-h-[70vh] w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-5 shadow-[var(--shadow-raised)] sm:left-0 sm:right-auto"
            >
              <ng-container *ngTemplateOutlet="panel" />
            </div>
          }
        </div>
      }

      @if (sortOptions().length) {
        <app-select
          size="sm"
          icon="sort"
          class="w-52"
          aria-label="Trier"
          [value]="sort()"
          (valueChange)="sortChange.emit($event)"
        >
          @for (option of sortOptions(); track option.value) {
            <app-option [value]="option.value">{{ option.label }}</app-option>
          }
        </app-select>
      }

      <ng-content />

      @if (canReset()) {
        <button appButton variant="ghost" type="button" (click)="clearAll()">
          <svg appIcon name="reset" class="size-4 md:mr-1.5"></svg>
          <span class="hidden md:inline">Réinitialiser</span>
        </button>
      }
    </div>

    <app-modal title="Filtres" [open]="open() && phone()" (closed)="open.set(false)">
      @if (open() && phone()) {
        <div class="flex flex-col gap-4">
          <ng-container *ngTemplateOutlet="panel" />
        </div>
      }
    </app-modal>

    <ng-template #panel>
      @if (!phone()) {
        <div class="flex shrink-0 items-center justify-between">
          <p class="text-h4 text-foreground">Filtres</p>
          <button
            type="button"
            class="text-body-sm font-semibold text-accent-text hover:underline"
            (click)="clearFilters()"
          >
            Réinitialiser
          </button>
        </div>
      }
      <div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
        @for (group of groups(); track group.key) {
          <div class="flex flex-col gap-2.5">
            <p class="text-overline text-foreground-secondary uppercase">{{ group.label }}</p>
            @if (group.searchable) {
              <div class="relative flex items-center">
                <svg
                  appIcon
                  name="search"
                  class="pointer-events-none absolute left-3 size-3.5 text-foreground-muted"
                ></svg>
                <input
                  type="search"
                  [attr.aria-label]="'Rechercher : ' + group.label"
                  [placeholder]="'Rechercher : ' + group.label.toLowerCase() + '…'"
                  class="h-9 w-full rounded-full border border-border bg-surface pr-3 pl-8 text-body-sm outline-none focus:border-accent"
                  [value]="groupSearch()[group.key] ?? ''"
                  (input)="setGroupSearch(group.key, $any($event.target).value)"
                />
              </div>
            }
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                [class]="chip(!draftValues()[group.key])"
                (click)="pick(group.key, null)"
              >
                Tous
              </button>
              @for (option of visibleOptions(group); track option.value) {
                <button
                  type="button"
                  [class]="chip(draftValues()[group.key] === option.value)"
                  (click)="pick(group.key, option.value)"
                >
                  {{ option.label }}
                </button>
              } @empty {
                <p class="text-caption text-foreground-muted">Aucun résultat.</p>
              }
            </div>
            @if (hiddenCount(group); as hidden) {
              <p class="text-caption text-foreground-muted">
                +{{ hidden }} autre(s) : utilisez la recherche ci-dessus.
              </p>
            }
          </div>
        }
      </div>
      <div class="h-px w-full shrink-0 bg-border-subtle"></div>
      <div
        class="flex shrink-0 flex-col-reverse gap-2.5 md:flex-row md:items-center md:justify-between"
      >
        <button appButton variant="ghost" type="button" (click)="clearFilters()">
          Réinitialiser
        </button>
        <button appButton type="button" (click)="apply()">Appliquer</button>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '(document:click)': 'closeOutside($event)' },
})
export class FilterToolbar {
  readonly searchPlaceholder = input('Que recherchez-vous ?');
  /** The search the page applied (restored from the URL, cleared by Réinitialiser). */
  readonly search = input('');
  readonly groups = input<FilterGroup[]>([]);
  readonly values = input<FilterValues>({});
  readonly sortOptions = input<FilterOption[]>([]);
  readonly sort = input<string>('');
  /** True while the list is not at its defaults: shows "Réinitialiser". */
  readonly canReset = input(false);

  /** Sent once typing pauses, not on every key. */
  readonly searchChange = output<string>();
  readonly filtersChange = output<FilterValues>();
  readonly sortChange = output<string>();
  readonly resetAll = output<void>();

  protected readonly open = signal(false);
  protected readonly draft = signal('');
  protected readonly draftValues = signal<FilterValues>({});
  protected readonly groupSearch = signal<Record<string, string>>({});
  protected readonly phone = signal(false);
  protected readonly activeCount = computed(
    () => this.groups().filter((group) => !!this.values()[group.key]).length,
  );

  private readonly host = inject(ElementRef<HTMLElement>);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private sent = '';

  constructor() {
    // A search set by the page (Réinitialiser, back button) replaces what is typed; the echo of
    // our own value does not, so letters typed meanwhile are never lost.
    effect(() => {
      const value = this.search();
      if (value !== this.sent) {
        this.sent = value;
        this.draft.set(value);
      }
    });
    const media = window.matchMedia('(max-width: 767px)');
    this.phone.set(media.matches);
    const onChange = (event: MediaQueryListEvent) => this.phone.set(event.matches);
    media.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => {
      media.removeEventListener('change', onChange);
      clearTimeout(this.timer);
    });
  }

  protected type(value: string): void {
    this.draft.set(value);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), SEARCH_DELAY_MS);
  }

  protected flush(): void {
    clearTimeout(this.timer);
    const value = this.draft().trim();
    if (value !== this.sent.trim()) {
      this.sent = value;
      this.searchChange.emit(value);
    }
  }

  protected toggle(): void {
    if (this.open()) {
      this.open.set(false);
      return;
    }
    this.draftValues.set({ ...this.values() });
    this.groupSearch.set({});
    this.open.set(true);
  }

  protected pick(key: string, value: string | null): void {
    this.draftValues.update((values) => ({ ...values, [key]: value }));
  }

  protected apply(): void {
    this.filtersChange.emit({ ...this.draftValues() });
    this.open.set(false);
  }

  /** Applies at once: clearing is a decision in itself (the panel stays open). */
  protected clearFilters(): void {
    const cleared = Object.fromEntries(this.groups().map((group) => [group.key, null]));
    this.draftValues.set(cleared);
    this.filtersChange.emit(cleared);
  }

  protected clearAll(): void {
    clearTimeout(this.timer);
    this.draft.set('');
    this.sent = '';
    this.open.set(false);
    this.resetAll.emit();
  }

  protected setGroupSearch(key: string, value: string): void {
    this.groupSearch.update((search) => ({ ...search, [key]: value }));
  }

  /** Searchable groups show 6 chips until searched, plus the chosen one if it is further down. */
  protected visibleOptions(group: FilterGroup): FilterOption[] {
    const query = normalize(this.groupSearch()[group.key] ?? '');
    const matches = query
      ? group.options.filter((option) => normalize(option.label).includes(query))
      : group.options;
    if (!group.searchable || query) return matches;
    const shown = matches.slice(0, VISIBLE_WHEN_SEARCHABLE);
    const chosen = matches.find((option) => option.value === this.draftValues()[group.key]);
    return chosen && !shown.includes(chosen) ? [...shown, chosen] : shown;
  }

  protected hiddenCount(group: FilterGroup): number {
    return group.searchable && !(this.groupSearch()[group.key] ?? '')
      ? Math.max(group.options.length - this.visibleOptions(group).length, 0)
      : 0;
  }

  protected chip(selected: boolean): string {
    return chipClass(selected);
  }

  protected closeOutside(event: Event): void {
    if (this.open() && !this.phone() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
