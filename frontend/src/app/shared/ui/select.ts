import {
  ChangeDetectionStrategy,
  booleanAttribute,
  Component,
  ElementRef,
  computed,
  contentChildren,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

import { cn } from '@shared/utils/cn';
import { Icon, IconName } from './icon';

/** One choice of <app-select>. Its text content is the label. */
@Component({
  selector: 'app-option',
  template: `<ng-content />`,
  host: { class: 'hidden' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectOption<T = string> {
  readonly value = input.required<T>();
  readonly disabled = input(false, { transform: booleanAttribute });
  /** For selects without a bound value: marks the initial choice, like <option selected>. */
  readonly selected = input(false, { transform: booleanAttribute });
  private readonly host = inject(ElementRef<HTMLElement>);

  label(): string {
    return (this.host.nativeElement.textContent ?? '').replace(/\s+/g, ' ').trim();
  }
}

let nextId = 0;

/**
 * Themed dropdown replacing <select>: the native list is drawn by the OS and ignores the theme.
 * Works with Signal Forms (`[formField]`, it is a FormValueControl) or standalone
 * (`[value]` / `(valueChange)`). Options are <app-option> children.
 */
@Component({
  selector: 'app-select',
  imports: [Icon],
  template: `
    <button
      #trigger
      type="button"
      role="combobox"
      [id]="buttonId()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="listId"
      aria-haspopup="listbox"
      [attr.aria-invalid]="invalid() || null"
      [disabled]="disabled()"
      [class]="triggerClass()"
      (click)="toggle()"
      (keydown)="onTriggerKey($event)"
    >
      @if (icon(); as name) {
        <svg appIcon [name]="name" class="size-5 shrink-0 text-primary"></svg>
      }
      <span
        [class]="
          current() ? 'min-w-0 flex-1 truncate' : 'min-w-0 flex-1 truncate text-foreground-muted'
        "
      >
        {{ currentLabel() }}
      </span>
      <svg
        appIcon
        name="chevron-down"
        class="size-4 shrink-0 text-foreground-muted transition-transform"
        [class.rotate-180]="open()"
      ></svg>
    </button>

    @if (open()) {
      <ul
        #list
        role="listbox"
        [id]="listId"
        tabindex="-1"
        [class]="panelClass()"
        (keydown)="onListKey($event)"
      >
        @for (option of options(); track $index; let i = $index) {
          <li
            role="option"
            [attr.aria-selected]="isSelected(option)"
            [attr.aria-disabled]="option.disabled() || null"
            [class]="optionClass(option, i)"
            tabindex="-1"
            (mouseenter)="active.set(i)"
            (keydown.enter)="choose(option)"
            (click)="choose(option)"
          >
            <span class="min-w-0 flex-1">{{ option.label() }}</span>
            @if (isSelected(option)) {
              <svg appIcon name="check" class="size-4 shrink-0 text-primary"></svg>
            }
          </li>
        } @empty {
          <li class="px-3 py-2.5 text-body-sm text-foreground-muted">Aucun choix</li>
        }
      </ul>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block',
    '[attr.id]': 'null',
    '(document:click)': 'closeOutside($event)',
  },
})
export class Select<T = string> implements FormValueControl<T> {
  readonly value = model<T>(null as T);
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touch = output<void>();
  /** Moved onto the inner button so <label for> still points at something focusable. */
  readonly id = input<string>();
  readonly placeholder = input('Choisir…');
  readonly ariaLabel = input('', { alias: 'aria-label' });
  readonly size = input<'md' | 'sm'>('md');
  /** Leading icon, in petrol (home search fields). */
  readonly icon = input<IconName | null>(null);

  protected readonly options = contentChildren(SelectOption<T>);
  protected readonly open = signal(false);
  protected readonly active = signal(-1);
  protected readonly upward = signal(false);
  protected readonly listId = `app-select-list-${nextId++}`;
  protected readonly buttonId = computed(() => this.id() ?? `${this.listId}-button`);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly list = viewChild<ElementRef<HTMLUListElement>>('list');

  /** The bound value, or for an unbound select the option marked `selected`. */
  protected readonly current = computed(() => {
    const value = this.value();
    const options = this.options();
    return (
      options.find((o) => o.value() === value) ??
      (value === null
        ? (options.find((o) => o.selected()) ?? options.find((o) => o.value() === ''))
        : undefined) ??
      null
    );
  });

  protected readonly triggerClass = computed(() =>
    cn(
      'flex w-full items-center gap-2 border-[1.5px] text-left transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-60',
      this.size() === 'sm'
        ? 'h-10 rounded-full bg-surface px-4 text-body-sm'
        : 'h-[52px] rounded-full bg-background-subtle px-4 text-body',
      this.invalid()
        ? 'border-error'
        : this.open()
          ? 'border-accent bg-surface'
          : this.size() === 'sm'
            ? 'border-border hover:border-border-strong focus-visible:border-accent'
            : 'border-transparent hover:border-border focus-visible:border-accent',
    ),
  );

  protected readonly panelClass = computed(() =>
    cn(
      'absolute inset-x-0 z-[70] max-h-64 min-w-48 overflow-y-auto rounded-2xl border border-border-subtle bg-surface p-1.5 shadow-[var(--shadow-raised)] outline-none',
      this.upward() ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
    ),
  );

  protected currentLabel(): string {
    return this.current()?.label() || this.placeholder();
  }

  protected isSelected(option: SelectOption<T>): boolean {
    return this.current() === option;
  }

  protected optionClass(option: SelectOption<T>, index: number): string {
    return cn(
      'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm select-none',
      option.disabled()
        ? 'cursor-not-allowed text-foreground-muted'
        : this.isSelected(option)
          ? 'font-semibold text-primary'
          : 'text-foreground',
      index === this.active() && !option.disabled() && 'bg-background-subtle',
    );
  }

  protected toggle(): void {
    if (this.open()) this.close();
    else this.show();
  }

  protected choose(option: SelectOption<T>): void {
    if (option.disabled()) return;
    this.value.set(option.value());
    this.close();
    this.trigger().nativeElement.focus();
  }

  protected onTriggerKey(event: KeyboardEvent): void {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      this.show();
    }
  }

  protected onListKey(event: KeyboardEvent): void {
    const options = this.options();
    const step = (from: number, delta: number) => {
      for (let i = from + delta; i >= 0 && i < options.length; i += delta)
        if (!options[i]!.disabled()) return i;
      return from;
    };
    switch (event.key) {
      case 'ArrowDown':
        this.active.set(step(this.active(), 1));
        break;
      case 'ArrowUp':
        this.active.set(step(this.active(), -1));
        break;
      case 'Home':
        this.active.set(step(-1, 1));
        break;
      case 'End':
        this.active.set(step(options.length, -1));
        break;
      case 'Enter':
      case ' ': {
        const option = options[this.active()];
        if (option) this.choose(option);
        break;
      }
      case 'Escape':
      case 'Tab':
        this.close();
        if (event.key === 'Escape') this.trigger().nativeElement.focus();
        return;
      default:
        return;
    }
    event.preventDefault();
    this.scrollActive();
  }

  protected closeOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  private show(): void {
    if (this.disabled()) return;
    const box = this.trigger().nativeElement.getBoundingClientRect();
    this.upward.set(
      window.innerHeight - box.bottom < 280 && box.top > window.innerHeight - box.bottom,
    );
    const options = this.options();
    const index = options.findIndex((o) => o === this.current());
    this.active.set(index >= 0 ? index : options.findIndex((o) => !o.disabled()));
    this.open.set(true);
    setTimeout(() => {
      this.list()?.nativeElement.focus();
      this.scrollActive();
    });
  }

  private close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.touch.emit();
  }

  private scrollActive(): void {
    const items = this.list()?.nativeElement.querySelectorAll('[role=option]');
    items?.[this.active()]?.scrollIntoView({ block: 'nearest' });
  }
}
