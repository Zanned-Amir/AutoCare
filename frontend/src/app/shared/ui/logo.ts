import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * AutoCare TN logo: a car whose cabin is drawn like a roof (signal) over a petrol body, plus a
 * small "care" spark. Same drawing as public/brand/*.svg. `theme="white"` for dark surfaces.
 */
@Component({
  selector: 'app-logo',
  template: `
    <span class="inline-flex items-center gap-2">
      <svg viewBox="0 0 64 48" fill="none" [class]="markClass()" aria-hidden="true">
        @if (theme() === 'white') {
          <path
            d="M15 22.6 21.4 14.4c1-1.2 2.4-1.9 4-1.9h11c1.6 0 3.1.7 4.1 1.9l6.6 8.2"
            stroke="var(--color-accent)"
            stroke-width="4.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <rect x="25.2" y="16.2" width="5.4" height="4.4" rx="1" fill="var(--color-accent)" />
          <rect x="32.4" y="16.2" width="5.4" height="4.4" rx="1" fill="var(--color-accent)" />
          <path
            d="M10.6 33H8.5C7.1 33 6 31.9 6 30.5v-3c0-2.2 1.5-4.1 3.7-4.5l5.3-.4h32.1l7.4 1.3c2 .4 3.5 2.1 3.5 4.1v2.5c0 1.4-1.1 2.5-2.5 2.5h-2.2M24.4 33h15.2"
            stroke="#ffffff"
            stroke-width="4.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="17.5" cy="33.5" r="5.2" fill="#ffffff" />
          <circle cx="46.5" cy="33.5" r="5.2" fill="#ffffff" />
          <path
            d="M55 6.8v5.6M52.2 9.6h5.6"
            stroke="var(--color-accent)"
            stroke-width="2.4"
            stroke-linecap="round"
          />
        } @else {
          <path
            d="M15 22.6 21.4 14.4c1-1.2 2.4-1.9 4-1.9h11c1.6 0 3.1.7 4.1 1.9l6.6 8.2"
            stroke="var(--color-accent)"
            stroke-width="4.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <rect x="25.2" y="16.2" width="5.4" height="4.4" rx="1" fill="var(--color-accent)" />
          <rect x="32.4" y="16.2" width="5.4" height="4.4" rx="1" fill="var(--color-accent)" />
          <path
            d="M10.6 33H8.5C7.1 33 6 31.9 6 30.5v-3c0-2.2 1.5-4.1 3.7-4.5l5.3-.4h32.1l7.4 1.3c2 .4 3.5 2.1 3.5 4.1v2.5c0 1.4-1.1 2.5-2.5 2.5h-2.2M24.4 33h15.2"
            stroke="var(--color-primary)"
            stroke-width="4.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="17.5" cy="33.5" r="5.2" fill="var(--color-primary)" />
          <circle cx="46.5" cy="33.5" r="5.2" fill="var(--color-primary)" />
          <path
            d="M55 6.8v5.6M52.2 9.6h5.6"
            stroke="var(--color-primary)"
            stroke-width="2.4"
            stroke-linecap="round"
          />
        }
      </svg>
      @if (variant() === 'lockup') {
        <span [class]="wordClass()">
          <span [class]="theme() === 'white' ? 'text-white' : 'text-primary'">Auto</span
          ><span class="text-signal-600 dark:text-accent">Care</span>
        </span>
      }
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'img', '[attr.aria-label]': '"AutoCare TN"', class: 'inline-flex' },
})
export class Logo {
  readonly variant = input<'lockup' | 'icon'>('lockup');
  readonly theme = input<'default' | 'white'>('default');
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly markClass = computed(
    () => ({ sm: 'h-7 w-auto', md: 'h-9 w-auto', lg: 'h-12 w-auto' })[this.size()],
  );
  protected readonly wordClass = computed(
    () =>
      'font-heading font-semibold tracking-tight ' +
      { sm: 'text-[19px]', md: 'text-[24px]', lg: 'text-[32px]' }[this.size()],
  );
}
