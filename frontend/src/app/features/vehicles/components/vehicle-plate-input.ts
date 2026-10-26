import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';

import { inputClasses, Select, SelectOption } from '@shared/ui';
import {
  PLATE_FORMATS,
  PlateSegment,
  PlateType,
  emptyParts,
  formatOf,
  parsePlate,
  plateValue,
  validateSegments,
} from '../vehicles.plate';

interface Slot {
  /** Segment index, or -1 for a literal such as "TUN". */
  index: number;
  segment: PlateSegment | null;
  text: string;
}

/**
 * Licence plate editor: a type select (TUN, RS, FCR, Douane, État, Autre) and the matching
 * inputs. `value` is the plate as one string (see vehicle-plate.ts); it is '' when nothing is
 * typed and INVALID_PLATE while the plate is incomplete or wrong, so the form schema blocks it.
 */
@Component({
  selector: 'app-vehicle-plate-input',
  imports: [Select, SelectOption],
  template: `
    <div class="grid gap-2">
      <label class="text-body-sm font-semibold text-primary" for="vehicle-plate-type">
        Immatriculation
        <span class="font-normal text-foreground-muted">(optionnel)</span>
      </label>

      <div class="flex flex-wrap items-start gap-2">
        <app-select
          id="vehicle-plate-type"
          class="w-full sm:w-40"
          aria-label="Type d'immatriculation"
          [value]="type()"
          (valueChange)="onTypeChange($event)"
        >
          @for (format of formats; track format.type) {
            <app-option [value]="format.type">{{ format.label }}</app-option>
          }
        </app-select>

        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          @for (slot of slots(); track $index) {
            @if (slot.segment; as segment) {
              <input
                [id]="'vehicle-plate-' + slot.index"
                [class]="
                  inputClasses + ' font-mono' + (hasError(slot.index) ? ' border-error' : '')
                "
                [style.width]="width(segment)"
                [value]="parts()[slot.index] ?? ''"
                [attr.inputmode]="segment.digitsOnly ? 'numeric' : 'text'"
                [attr.maxlength]="segment.max"
                [attr.placeholder]="segment.placeholder"
                [attr.aria-label]="segment.label"
                [attr.aria-invalid]="hasError(slot.index) || null"
                autocomplete="off"
                (input)="onPartInput(slot.index, $event)"
                (blur)="markTouched(slot.index)"
              />
            } @else {
              <span class="font-mono font-semibold text-foreground-muted">{{ slot.text }}</span>
            }
          }
        </div>
      </div>

      @for (message of messages(); track message) {
        <p class="text-body-sm text-error" role="alert">{{ message }}</p>
      } @empty {
        <p class="text-body-sm text-foreground-muted">
          Aide le garage à reconnaître votre véhicule.
        </p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiclePlateInput {
  readonly value = model('');
  /** Show every error (after a submit attempt), not only those of fields already left. */
  readonly showErrors = input(false);

  protected readonly inputClasses = inputClasses;
  protected readonly formats = PLATE_FORMATS;
  protected readonly type = signal<PlateType>('TUN');
  protected readonly parts = signal<string[]>(emptyParts('TUN'));
  private readonly touched = signal<boolean[]>([]);

  protected readonly slots = computed<Slot[]>(() => {
    const format = formatOf(this.type());
    return format.tokens.map((token) =>
      typeof token === 'number'
        ? { index: token, segment: format.segments[token]!, text: '' }
        : { index: -1, segment: null, text: token },
    );
  });

  private readonly errors = computed(() => validateSegments(this.type(), this.parts()));

  protected readonly messages = computed(() =>
    this.errors().flatMap((error, i) => (error && this.isShown(i) ? [error] : [])),
  );

  constructor() {
    // The form changed the value from outside (reset, vehicle loaded): rebuild type and segments.
    // Changes made here come back with the same value and are ignored.
    effect(() => {
      const incoming = this.value();
      untracked(() => {
        if (incoming === plateValue(this.type(), this.parts())) return;
        const parsed = parsePlate(incoming);
        this.type.set(parsed.type);
        this.parts.set(parsed.parts);
        this.touched.set([]);
      });
    });
  }

  protected hasError(index: number): boolean {
    return !!this.errors()[index] && this.isShown(index);
  }

  protected width(segment: PlateSegment): string {
    return segment.digitsOnly ? `calc(${segment.max}ch + 3rem)` : '100%';
  }

  protected onTypeChange(value: string): void {
    const type = value as PlateType;
    this.type.set(type);
    this.parts.set(emptyParts(type));
    this.touched.set([]);
    this.emit();
  }

  protected onPartInput(index: number, event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.parts.update((parts) => parts.map((part, i) => (i === index ? text : part)));
    this.emit();
  }

  protected markTouched(index: number): void {
    this.touched.update((touched) => {
      const next = [...touched];
      next[index] = true;
      return next;
    });
  }

  private isShown(index: number): boolean {
    return this.showErrors() || !!this.touched()[index];
  }

  private emit(): void {
    this.value.set(plateValue(this.type(), this.parts()));
  }
}
