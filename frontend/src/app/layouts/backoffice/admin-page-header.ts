import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Icon } from '@shared/ui';
import { BackofficeChrome } from './backoffice-chrome';

export interface Breadcrumb {
  label: string;
  path?: string;
}

/**
 * White band under the top bar (toutestcasa AdminPageHeader): breadcrumbs, title, subtitle,
 * actions. On a phone the title moves to the top bar, so it is hidden here. Project buttons
 * with the `actions` attribute and badges with `badge`.
 */
@Component({
  selector: 'app-admin-page-header',
  imports: [Icon, RouterLink],
  template: `
    <div
      class="flex flex-col gap-3 border-b border-border-subtle bg-surface px-4 py-3 md:px-8 md:py-5"
    >
      @if (breadcrumbs().length) {
        <nav aria-label="Fil d’Ariane" class="hidden md:block">
          <ol class="flex flex-wrap items-center gap-1.5 text-caption text-foreground-muted">
            @for (crumb of breadcrumbs(); track crumb.label; let last = $last) {
              <li class="flex items-center gap-1.5">
                @if (crumb.path && !last) {
                  <a [routerLink]="crumb.path" class="hover:text-primary hover:underline">{{
                    crumb.label
                  }}</a>
                } @else {
                  <span [class]="last ? 'font-medium text-foreground-secondary' : ''">{{
                    crumb.label
                  }}</span>
                }
                @if (!last) {
                  <svg appIcon name="chevron-right" class="size-3.5"></svg>
                }
              </li>
            }
          </ol>
        </nav>
      }
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex min-w-0 flex-col gap-1 empty:hidden">
          <div class="flex flex-wrap items-center gap-2 empty:hidden">
            <h1 class="hidden text-h3 text-primary md:block">{{ title() }}</h1>
            <ng-content select="[badge]" />
          </div>
          @if (subtitle()) {
            <p class="hidden text-body-sm text-foreground-secondary md:block">{{ subtitle() }}</p>
          }
        </div>
        <div
          class="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] empty:hidden md:mx-0 md:flex-wrap md:items-center md:gap-3 md:overflow-visible md:px-0 [&>*]:shrink-0"
        >
          <ng-content select="[actions]" />
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly breadcrumbs = input<Breadcrumb[]>([]);

  private readonly parent = computed(() => this.breadcrumbs().at(-2)?.path ?? null);

  constructor() {
    const chrome = inject(BackofficeChrome, { optional: true });
    if (!chrome) return;
    effect(() => {
      chrome.title.set(this.title());
      chrome.parentPath.set(this.parent());
    });
    // The next page may already have set its own title by the time this one is destroyed.
    inject(DestroyRef).onDestroy(() => {
      if (chrome.title() !== this.title()) return;
      chrome.title.set(null);
      chrome.parentPath.set(null);
    });
  }
}
