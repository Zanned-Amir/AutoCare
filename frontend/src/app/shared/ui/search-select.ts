import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';

import { cn } from '@shared/utils/cn';
import { Icon, IconName } from './icon';

export interface SearchSelectOption<T> {
  value: T;
  label: string;
  icon?: IconName;
}

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * One choice from a long list, with a search box (the "Position" field's look: icon, small label,
 * value, chevron). `null` is the "all" choice. Keyboard: arrows move, Enter picks, Escape closes.
 */
@Component({
  selector: 'app-search-select',
  imports: [Icon],
  template: `
    <div class="relative">
      <button
        #trigger
        type="button"
        [class]="triggerClass()"
        [attr.aria-expanded]="open()"
        aria-haspopup="listbox"
        (click)="toggle()"
      >
        <span
          [class]="
            value() !== null
              ? 'grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground'
              : 'grid size-8 shrink-0 place-items-center rounded-full bg-primary-subtle text-primary'
          "
        >
          <svg appIcon [name]="current()?.icon ?? icon()" class="size-4"></svg>
        </span>
        <span class="min-w-0 flex-1 leading-tight">
          <span class="block text-caption text-foreground-muted">{{ label() }}</span>
          <span class="block truncate text-body-sm font-semibold text-foreground">{{
            current()?.label ?? allLabel()
          }}</span>
        </span>
        @if (value() !== null) {
          <span
            role="button"
            tabindex="0"
            class="grid size-7 place-items-center rounded-full text-foreground-muted hover:bg-background-subtle hover:text-foreground"
            [attr.aria-label]="'Effacer : ' + label()"
            (click)="$event.stopPropagation(); choose(null)"
            (keydown.enter)="$event.stopPropagation(); choose(null)"
          >
            <svg appIcon name="x" class="size-4"></svg>
          </span>
        }
        <svg
          appIcon
          name="chevron-down"
          [class]="cn('size-4 text-foreground-muted transition-transform', open() && 'rotate-180')"
        ></svg>
      </button>

      @if (open()) {
        <div
          class="absolute inset-x-0 top-[calc(100%+8px)] z-[500] overflow-hidden rounded-card border border-border-subtle bg-surface shadow-[var(--shadow-raised)]"
          tabindex="-1"
          tabindex="-1"
          (keydown.escape)="close()"
        >
          <div class="px-3 pt-3 pb-2">
            <div class="relative">
              <svg
                appIcon
                name="search"
                class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-muted"
              ></svg>
              <input
                #search
                type="search"
                [attr.aria-label]="searchPlaceholder()"
                [placeholder]="searchPlaceholder()"
                class="h-10 w-full rounded-full border border-transparent bg-background-subtle pr-3 pl-9 text-body-sm placeholder:text-foreground-muted focus:border-accent focus:outline-none"
                [value]="query()"
                (input)="query.set($any($event.target).value); active.set(0)"
                (keydown.arrowDown)="$event.preventDefault(); step(1)"
                (keydown.arrowUp)="$event.preventDefault(); step(-1)"
                (keydown.enter)="$event.preventDefault(); pickActive()"
              />
            </div>
          </div>
          <ul role="listbox" [attr.aria-label]="label()" class="max-h-64 overflow-y-auto px-2 pb-2">
            @if (!query()) {
              <li
                role="option"
                [attr.aria-selected]="value() === null"
                [class]="optionClass(value() === null, active() === -1)"
                tabindex="-1"
                tabindex="-1"
                (mouseenter)="active.set(-1)"
                (click)="choose(null)"
                (keydown.enter)="choose(null)"
                (keydown.enter)="choose(null)"
              >
                <svg appIcon name="list" class="size-4 shrink-0 text-foreground-muted"></svg>
                <span class="flex-1 truncate">{{ allLabel() }}</span>
                @if (value() === null) {
                  <svg appIcon name="check" class="size-4 text-primary"></svg>
                }
              </li>
            }
            @for (option of filtered(); track option.value; let i = $index) {
              <li
                role="option"
                [attr.aria-selected]="option.value === value()"
                [class]="optionClass(option.value === value(), active() === i)"
                tabindex="-1"
                tabindex="-1"
                (mouseenter)="active.set(i)"
                (click)="choose(option.value)"
                (keydown.enter)="choose(option.value)"
                (keydown.enter)="choose(option.value)"
              >
                <svg
                  appIcon
                  [name]="option.icon ?? icon()"
                  class="size-4 shrink-0 text-foreground-muted"
                ></svg>
                <span class="flex-1 truncate">{{ option.label }}</span>
                @if (option.value === value()) {
                  <svg appIcon name="check" class="size-4 text-primary"></svg>
                }
              </li>
            } @empty {
              <li class="px-3 py-3 text-body-sm text-foreground-muted">Aucun résultat</li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '(document:click)': 'closeOutside($event)' },
})
export class SearchSelect<T> {
  readonly options = input.required<SearchSelectOption<T>[]>();
  readonly value = model<T | null>(null);
  readonly label = input.required<string>();
  readonly allLabel = input('Tous');
  readonly searchPlaceholder = input('Rechercher…');
  readonly icon = input<IconName>('search');

  protected readonly cn = cn;
  protected readonly open = signal(false);
  protected readonly query = signal('');
  /** Highlighted row: -1 is the "all" row, then the filtered options. */
  protected readonly active = signal(-1);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly current = computed(
    () => this.options().find((option) => option.value === this.value()) ?? null,
  );
  protected readonly filtered = computed(() => {
    const query = fold(this.query());
    return query
      ? this.options().filter((option) => fold(option.label).includes(query))
      : this.options();
  });

  protected readonly triggerClass = computed(() =>
    cn(
      'flex h-[52px] w-full items-center gap-3 rounded-full border bg-surface pr-4 pl-2 text-left transition-colors',
      this.open() ? 'border-primary' : 'border-border hover:border-border-strong',
    ),
  );

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.query.set('');
    this.active.set(-1);
    this.open.set(true);
    setTimeout(() => this.search()?.nativeElement.focus());
  }

  protected choose(value: T | null): void {
    this.value.set(value);
    this.close();
  }

  protected step(delta: number): void {
    const first = this.query() ? 0 : -1;
    const last = this.filtered().length - 1;
    this.active.set(Math.min(Math.max(this.active() + delta, first), last));
  }

  protected pickActive(): void {
    const index = this.active();
    if (index === -1 && !this.query()) this.choose(null);
    else {
      const option = this.filtered()[Math.max(index, 0)];
      if (option) this.choose(option.value);
    }
  }

  protected optionClass(selected: boolean, active: boolean): string {
    return cn(
      'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm',
      selected ? 'font-semibold text-primary' : 'text-foreground',
      active && 'bg-background-subtle',
    );
  }

  protected closeOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node))
      this.open.set(false);
  }

  private close(): void {
    this.open.set(false);
    this.trigger().nativeElement.focus();
  }
}
