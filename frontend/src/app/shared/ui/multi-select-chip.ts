import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

import { cn } from '@shared/utils/cn';
import { chipClass, chipCountClass } from './chip';
import { Icon } from './icon';

export interface MultiSelectOption<T> {
  value: T;
  label: string;
}

let nextId = 0;

/**
 * Filter chip that opens a searchable list with several choices (toutestcasa chip + dropdown).
 * Works standalone (`[(value)]`) or with Signal Forms (`[formField]`). Selected when one or more
 * values are chosen; the count shows in the chip.
 */
@Component({
  selector: 'app-multi-select-chip',
  imports: [Icon],
  template: `
    <button
      #trigger
      type="button"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="panelId"
      aria-haspopup="listbox"
      [disabled]="disabled()"
      [class]="triggerClass()"
      (click)="toggle()"
      (keydown.arrowDown)="$event.preventDefault(); show()"
    >
      @if (singleLabel(); as text) {
        <span class="max-w-40 truncate">{{ text }}</span>
      } @else {
        {{ label() }}
        @if (value().length) {
          <span [class]="countClass()">{{ value().length }}</span>
        }
      }
      <svg
        appIcon
        name="chevron-down"
        class="size-4 shrink-0 transition-transform"
        [class.rotate-180]="open()"
      ></svg>
    </button>

    @if (open()) {
      <div
        [id]="panelId"
        tabindex="-1"
        class="absolute top-[calc(100%+6px)] left-0 z-[70] w-72 rounded-2xl border border-border-subtle bg-surface p-1.5 shadow-[var(--shadow-raised)] outline-none"
        (keydown.escape)="close(true)"
      >
        <div class="relative p-1">
          <svg
            appIcon
            name="search"
            class="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-foreground-muted"
          ></svg>
          <input
            #search
            type="search"
            [attr.aria-label]="searchPlaceholder()"
            [placeholder]="searchPlaceholder()"
            class="h-10 w-full rounded-full border-[1.5px] border-border bg-surface pr-3 pl-9 text-body-sm outline-none focus:border-accent"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
            (keydown.enter)="$event.preventDefault(); toggleFirstMatch()"
          />
        </div>
        <ul
          role="listbox"
          aria-multiselectable="true"
          [attr.aria-label]="label()"
          class="max-h-64 overflow-y-auto"
        >
          @for (option of filtered(); track option.value) {
            <li
              role="option"
              [attr.aria-selected]="isChosen(option.value)"
              tabindex="0"
              class="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm text-foreground select-none hover:bg-background-subtle focus-visible:bg-background-subtle focus-visible:outline-none"
              (click)="toggleValue(option.value)"
              (keydown.enter)="$event.preventDefault(); toggleValue(option.value)"
              (keydown.space)="$event.preventDefault(); toggleValue(option.value)"
            >
              <span [class]="boxClass(isChosen(option.value))">
                @if (isChosen(option.value)) {
                  <svg appIcon name="check" class="size-3.5"></svg>
                }
              </span>
              <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
            </li>
          } @empty {
            <li class="px-3 py-2.5 text-body-sm text-foreground-muted">Aucun résultat</li>
          }
        </ul>
        @if (value().length) {
          <div class="mt-1 flex justify-end border-t border-border-subtle px-2 pt-1.5">
            <button
              type="button"
              class="rounded-full px-3 py-1.5 text-body-sm font-semibold text-primary hover:bg-background-subtle"
              (click)="clear()"
            >
              Tout effacer
            </button>
          </div>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-block', '(document:click)': 'closeOutside($event)' },
})
export class MultiSelectChip<T = string> implements FormValueControl<T[]> {
  readonly value = model<T[]>([]);
  readonly disabled = input(false);
  readonly touch = output<void>();
  readonly options = input.required<MultiSelectOption<T>[]>();
  /** Chip text when nothing or several values are chosen ("Services"). */
  readonly label = input.required<string>();
  readonly searchPlaceholder = input('Rechercher…');

  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly panelId = `app-multi-select-${nextId++}`;
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');

  /** Accent- and case-insensitive, so "electricite" finds "Électricité". */
  protected readonly filtered = computed(() => {
    const words = normalize(this.query()).split(/\s+/).filter(Boolean);
    return this.options().filter((option) => {
      const text = normalize(option.label);
      return words.every((word) => text.includes(word));
    });
  });

  /** One choice shows its name in the chip; several show the count. */
  protected readonly singleLabel = computed(() => {
    const chosen = this.value();
    return chosen.length === 1
      ? (this.options().find((option) => option.value === chosen[0])?.label ?? null)
      : null;
  });

  protected readonly triggerClass = computed(() =>
    chipClass(
      this.value().length > 0 || this.open(),
      'disabled:cursor-not-allowed disabled:opacity-60',
    ),
  );

  protected countClass(): string {
    return chipCountClass(true);
  }

  protected boxClass(chosen: boolean): string {
    return cn(
      'grid size-[18px] shrink-0 place-items-center rounded-md border-[1.5px]',
      chosen ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong',
    );
  }

  protected isChosen(value: T): boolean {
    return this.value().includes(value);
  }

  protected toggleValue(value: T): void {
    this.value.update((chosen) =>
      chosen.includes(value) ? chosen.filter((v) => v !== value) : [...chosen, value],
    );
  }

  protected toggleFirstMatch(): void {
    const first = this.filtered()[0];
    if (first) this.toggleValue(first.value);
  }

  protected clear(): void {
    this.value.set([]);
  }

  protected toggle(): void {
    if (this.open()) this.close(false);
    else this.show();
  }

  protected show(): void {
    if (this.disabled()) return;
    this.query.set('');
    this.open.set(true);
    setTimeout(() => this.search()?.nativeElement.focus());
  }

  protected close(focusTrigger: boolean): void {
    if (!this.open()) return;
    this.open.set(false);
    this.touch.emit();
    if (focusTrigger) this.trigger().nativeElement.focus();
  }

  protected closeOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close(false);
  }
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
