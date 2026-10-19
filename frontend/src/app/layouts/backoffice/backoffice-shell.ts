import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

import { NotificationBell } from '@features/notifications/components/notification-bell';
import { Icon, IconName, Logo } from '@shared/ui';
import { cn } from '@shared/utils/cn';
import { UiStore } from '@store/ui.store';
import { injectRouteData } from '../route-data';
import { BackofficeChrome } from './backoffice-chrome';

export interface ShellNavItem {
  label: string;
  path: string;
  icon: IconName;
  exact?: boolean;
}

export interface ShellSwitchOption {
  id: number;
  label: string;
}

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Backoffice frame (toutestcasa BackofficeLayout): petrol sidebar from lg and a drawer below,
 * white top bar with search (Ctrl K), notifications and the profile menu, bottom tab bar on
 * phones. Pages bring their own <app-admin-page-header>, which also feeds the phone title.
 * The host layout provides BackofficeChrome: pages are projected, so they cannot see our providers.
 */
@Component({
  selector: 'app-backoffice-shell',
  imports: [Icon, Logo, NgTemplateOutlet, NotificationBell, RouterLink, RouterLinkActive],
  template: `
    <ng-template #sidebar>
      <aside class="flex h-full w-[248px] shrink-0 flex-col bg-primary text-primary-foreground">
        <div class="shrink-0 px-[18px] py-4">
          <a
            [routerLink]="homePath()"
            class="inline-flex rounded-lg outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Retour au tableau de bord"
          >
            <app-logo theme="white" size="sm" />
          </a>
        </div>

        @if (switchOptions().length > 1) {
          <div class="shrink-0 px-[14px] pb-3">
            <label class="sr-only" for="shell-switch">Changer d’espace</label>
            <div class="relative">
              <select
                id="shell-switch"
                class="h-11 w-full appearance-none rounded-xl border border-white/15 bg-white/10 pr-9 pl-3 text-body-sm font-semibold text-white outline-none focus:border-white/40"
                (change)="switched.emit(+$any($event.target).value)"
              >
                @for (option of switchOptions(); track option.id) {
                  <option
                    [value]="option.id"
                    [selected]="option.id === switchValue()"
                    class="text-foreground"
                  >
                    {{ option.label }}
                  </option>
                }
              </select>
              <svg
                appIcon
                name="chevron-down"
                class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-white/70"
              ></svg>
            </div>
          </div>
        } @else if (contextLabel()) {
          <div class="shrink-0 px-[22px] pb-3">
            <p class="truncate text-label text-white">{{ contextLabel() }}</p>
            @if (contextSub()) {
              <p class="truncate text-caption text-petrol-100">{{ contextSub() }}</p>
            }
          </div>
        }

        <nav
          class="min-h-0 flex-1 overflow-y-auto px-[14px] py-1 [scrollbar-width:none]"
          aria-label="Menu"
        >
          <ul class="flex flex-col gap-0.5">
            @for (item of items(); track item.path) {
              <li>
                <a
                  [routerLink]="item.path"
                  routerLinkActive=""
                  #rla="routerLinkActive"
                  [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                  [class]="navClass(rla.isActive)"
                >
                  @if (rla.isActive) {
                    <span
                      class="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-sm bg-accent"
                    ></span>
                  }
                  <svg appIcon [name]="item.icon" class="size-[18px]"></svg>
                  <span>{{ item.label }}</span>
                </a>
              </li>
            }
          </ul>
        </nav>

        @if (bottomItems().length) {
          <ul class="flex shrink-0 flex-col gap-0.5 px-[14px] pb-2">
            @for (item of bottomItems(); track item.path) {
              <li>
                <a
                  [routerLink]="item.path"
                  routerLinkActive=""
                  #rlb="routerLinkActive"
                  [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                  [class]="navClass(rlb.isActive)"
                >
                  @if (rlb.isActive) {
                    <span
                      class="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-sm bg-accent"
                    ></span>
                  }
                  <svg appIcon [name]="item.icon" class="size-[18px]"></svg>
                  <span>{{ item.label }}</span>
                </a>
              </li>
            }
          </ul>
        }
        <div class="mx-[18px] h-px shrink-0 bg-white/10"></div>
        <div class="flex shrink-0 items-center gap-3 px-[22px] py-3">
          <span
            class="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-caption font-semibold text-white"
            >{{ initials() }}</span
          >
          <div class="flex min-w-0 flex-col">
            <span class="truncate text-body-sm font-semibold text-white">{{ userName() }}</span>
            <span class="truncate text-caption text-petrol-100">{{ userRole() }}</span>
          </div>
        </div>
        <div class="px-[22px] pb-3">
          <a routerLink="/" class="text-caption text-petrol-100/70 hover:text-white"
            >AutoCare TN · retour au site</a
          >
        </div>
      </aside>
    </ng-template>

    <div class="flex h-dvh overflow-hidden bg-background-subtle">
      <div class="hidden lg:flex"><ng-container [ngTemplateOutlet]="sidebar" /></div>

      <div [class]="drawerClass()" [attr.aria-hidden]="!drawerOpen()">
        <button
          type="button"
          aria-label="Fermer le menu"
          [tabindex]="drawerOpen() ? 0 : -1"
          (click)="drawerOpen.set(false)"
          [class]="overlayClass()"
        ></button>
        <div [class]="drawerPanelClass()">
          @if (drawerOpen()) {
            <ng-container [ngTemplateOutlet]="sidebar" />
          }
        </div>
      </div>

      <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ng-content select="[shellBanner]" />

        <header
          class="flex h-16 shrink-0 items-center gap-3 border-b border-border-subtle bg-surface px-4 md:h-[72px] md:gap-0 md:px-6"
        >
          <button
            type="button"
            class="grid size-10 shrink-0 place-items-center rounded-full text-primary hover:bg-primary-subtle lg:hidden"
            [attr.aria-label]="chrome.parentPath() ? 'Retour' : 'Ouvrir le menu'"
            (click)="menuOrBack()"
          >
            <svg appIcon [name]="chrome.parentPath() ? 'arrow-left' : 'menu'" class="size-5"></svg>
          </button>

          <p class="min-w-0 flex-1 truncate text-h4 text-primary md:hidden">{{ title() }}</p>

          <button
            type="button"
            class="hidden h-10 w-full max-w-md items-center gap-2.5 rounded-full border border-border-subtle bg-background-subtle px-3.5 transition-colors hover:bg-background md:flex"
            (click)="openSearch()"
          >
            <svg appIcon name="search" class="size-4 text-foreground-muted"></svg>
            <span class="truncate font-heading text-body-sm text-foreground-muted">{{
              searchPlaceholder()
            }}</span>
            <kbd
              class="ml-auto hidden shrink-0 rounded border border-border-subtle bg-surface px-1.5 py-0.5 text-caption text-foreground-muted lg:block"
              >Ctrl K</kbd
            >
          </button>

          <div class="ml-auto flex shrink-0 items-center gap-1.5 md:gap-3">
            <button
              type="button"
              class="grid size-10 place-items-center rounded-full text-foreground hover:bg-background-subtle md:hidden"
              aria-label="Rechercher"
              (click)="openSearch()"
            >
              <svg appIcon name="search" class="size-5"></svg>
            </button>
            <button
              type="button"
              class="hidden size-10 place-items-center rounded-full text-foreground hover:bg-background-subtle md:grid"
              [attr.aria-label]="ui.theme() === 'dark' ? 'Mode clair' : 'Mode sombre'"
              (click)="ui.toggleTheme()"
            >
              <svg appIcon [name]="ui.theme() === 'dark' ? 'sun' : 'moon'" class="size-5"></svg>
            </button>
            <app-notification-bell />
            <div class="hidden h-7 w-px bg-border-subtle md:block"></div>

            <div class="relative" #profile>
              <button
                type="button"
                [class]="profileButtonClass()"
                [attr.aria-expanded]="profileOpen()"
                aria-haspopup="menu"
                (click)="profileOpen.set(!profileOpen())"
              >
                <span
                  class="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-caption font-semibold text-primary-foreground"
                  >{{ initials() }}</span
                >
                <span class="hidden max-w-40 truncate text-label text-primary md:inline">{{
                  userName()
                }}</span>
                <svg
                  appIcon
                  name="chevron-down"
                  class="hidden size-4 text-foreground-secondary md:block"
                ></svg>
              </button>
              @if (profileOpen()) {
                <div
                  role="menu"
                  class="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-card border border-border-subtle bg-surface shadow-[var(--shadow-raised)]"
                >
                  <div class="flex items-center gap-3 border-b border-border-subtle px-4 py-4">
                    <span
                      class="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-label text-primary-foreground"
                      >{{ initials() }}</span
                    >
                    <div class="min-w-0">
                      <p class="truncate text-label text-foreground">{{ userName() }}</p>
                      <p class="truncate text-caption text-foreground-muted">{{ userEmail() }}</p>
                    </div>
                  </div>
                  <div class="p-2">
                    <a
                      role="menuitem"
                      [routerLink]="profilePath()"
                      (click)="profileOpen.set(false)"
                      class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm text-foreground hover:bg-background-subtle"
                      ><svg appIcon name="user" class="size-4 text-foreground-muted"></svg>Mon
                      profil</a
                    >
                    <a
                      role="menuitem"
                      routerLink="/"
                      class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm text-foreground hover:bg-background-subtle"
                      ><svg appIcon name="external" class="size-4 text-foreground-muted"></svg
                      >Retour au site</a
                    >
                    <button
                      type="button"
                      role="menuitem"
                      class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm text-foreground hover:bg-background-subtle md:hidden"
                      (click)="ui.toggleTheme()"
                    >
                      <svg
                        appIcon
                        [name]="ui.theme() === 'dark' ? 'sun' : 'moon'"
                        class="size-4 text-foreground-muted"
                      ></svg>
                      {{ ui.theme() === 'dark' ? 'Mode clair' : 'Mode sombre' }}
                    </button>
                  </div>
                  <div class="border-t border-border-subtle p-2">
                    <button
                      type="button"
                      role="menuitem"
                      class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium text-error hover:bg-error-subtle"
                      (click)="profileOpen.set(false); signOut.emit()"
                    >
                      <svg appIcon name="log-out" class="size-4"></svg>Se déconnecter
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </header>

        <main class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <ng-content />
        </main>

        <nav
          aria-label="Navigation principale"
          class="flex shrink-0 items-stretch border-t border-border-subtle bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          @for (item of items().slice(0, 4); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="!text-primary font-semibold"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              class="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-caption text-foreground-muted"
            >
              <svg appIcon [name]="item.icon" class="size-5"></svg>
              <span class="max-w-full truncate px-1">{{ item.label }}</span>
            </a>
          }
          <button
            type="button"
            class="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-caption text-foreground-muted hover:text-foreground"
            (click)="drawerOpen.set(true)"
          >
            <svg appIcon name="more" class="size-5"></svg><span>Plus</span>
          </button>
        </nav>
      </div>
    </div>

    @if (searchOpen()) {
      <div class="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
        <button
          type="button"
          aria-label="Fermer la recherche"
          class="absolute inset-0 bg-black/40"
          (click)="searchOpen.set(false)"
        ></button>
        <div
          role="dialog"
          aria-label="Rechercher"
          class="relative w-full max-w-lg overflow-hidden rounded-card bg-surface shadow-[var(--shadow-raised)]"
        >
          <div class="flex items-center gap-3 border-b border-border-subtle px-4">
            <svg appIcon name="search" class="size-5 text-foreground-muted"></svg>
            <input
              #searchInput
              aria-label="Aller à une section"
              placeholder="Aller à une section…"
              class="h-14 min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-foreground-muted"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
              (keydown.enter)="goFirst()"
            />
            <kbd
              class="rounded border border-border-subtle px-1.5 py-0.5 text-caption text-foreground-muted"
              >Échap</kbd
            >
          </div>
          <ul class="max-h-80 overflow-y-auto p-2">
            @for (item of searchResults(); track item.path; let first = $first) {
              <li>
                <a
                  [routerLink]="item.path"
                  (click)="searchOpen.set(false)"
                  class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm text-foreground hover:bg-background-subtle"
                  [class.bg-background-subtle]="first && !!query()"
                >
                  <span
                    class="grid size-8 place-items-center rounded-full bg-primary-subtle text-primary"
                    ><svg appIcon [name]="item.icon" class="size-4"></svg
                  ></span>
                  <span class="flex-1">{{ item.label }}</span>
                  <svg appIcon name="arrow-right" class="size-4 text-foreground-muted"></svg>
                </a>
              </li>
            } @empty {
              <li class="px-3 py-6 text-center text-body-sm text-foreground-muted">
                Aucune section ne correspond.
              </li>
            }
          </ul>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
    '(document:click)': 'closeProfile($event)',
  },
})
export class BackofficeShell {
  readonly items = input.required<ShellNavItem[]>();
  /** Pinned at the bottom of the sidebar (Support). */
  readonly bottomItems = input<ShellNavItem[]>([]);
  readonly homePath = input('/');
  /** "Mon profil": the admin keeps it inside the backoffice (its own session). */
  readonly profilePath = input('/account');
  readonly contextLabel = input('');
  readonly contextSub = input<string | null>(null);
  readonly switchOptions = input<ShellSwitchOption[]>([]);
  readonly switchValue = input<number | null>(null);
  readonly userName = input('');
  readonly userEmail = input('');
  readonly userRole = input('');
  readonly searchPlaceholder = input('Rechercher dans l’admin…');
  readonly switched = output<number>();
  readonly signOut = output<void>();

  protected readonly ui = inject(UiStore);
  protected readonly chrome = inject(BackofficeChrome);
  protected readonly drawerOpen = signal(false);
  protected readonly profileOpen = signal(false);
  protected readonly searchOpen = signal(false);
  protected readonly query = signal('');
  private readonly profile = viewChild<ElementRef<HTMLElement>>('profile');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly router = inject(Router);
  private readonly data = injectRouteData();

  protected readonly title = computed(
    () =>
      this.chrome.title() ?? (this.data()['heading'] as string | undefined) ?? this.contextLabel(),
  );
  protected readonly initials = computed(() =>
    this.userName()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join(''),
  );
  private readonly allItems = computed(() => [...this.items(), ...this.bottomItems()]);
  protected readonly searchResults = computed(() => {
    const query = fold(this.query().trim());
    return query
      ? this.allItems().filter((item) => fold(item.label).includes(query))
      : this.allItems();
  });
  protected readonly profileButtonClass = computed(() =>
    cn(
      'flex items-center gap-2.5 rounded-full p-1 transition-colors hover:bg-background-subtle md:pr-2',
      this.profileOpen() && 'bg-background-subtle',
    ),
  );
  protected readonly drawerClass = computed(() =>
    cn(
      'fixed inset-0 z-50 lg:hidden',
      this.drawerOpen() ? 'pointer-events-auto' : 'pointer-events-none',
    ),
  );
  protected readonly overlayClass = computed(() =>
    cn(
      'absolute inset-0 bg-black/40 transition-opacity duration-200',
      this.drawerOpen() ? 'opacity-100' : 'opacity-0',
    ),
  );
  protected readonly drawerPanelClass = computed(() =>
    cn(
      'absolute inset-y-0 left-0 flex transition-transform duration-200 ease-out',
      this.drawerOpen() ? 'translate-x-0' : '-translate-x-full',
    ),
  );

  constructor() {
    const subscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.drawerOpen.set(false);
        this.profileOpen.set(false);
        this.searchOpen.set(false);
      });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  protected navClass(active: boolean): string {
    return cn(
      'relative flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 font-heading text-body transition-colors',
      active ? 'bg-background text-primary' : 'text-petrol-100 hover:bg-white/5 hover:text-white',
    );
  }

  protected menuOrBack(): void {
    const parent = this.chrome.parentPath();
    if (parent) void this.router.navigateByUrl(parent);
    else this.drawerOpen.set(true);
  }

  protected openSearch(): void {
    this.query.set('');
    this.searchOpen.set(true);
    setTimeout(() => this.searchInput()?.nativeElement.focus());
  }

  protected goFirst(): void {
    const first = this.searchResults()[0];
    if (first) void this.router.navigateByUrl(first.path);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (this.searchOpen()) this.searchOpen.set(false);
      else this.openSearch();
    } else if (event.key === 'Escape') {
      this.drawerOpen.set(false);
      this.profileOpen.set(false);
      this.searchOpen.set(false);
    }
  }

  protected closeProfile(event: Event): void {
    if (this.profileOpen() && !this.profile()?.nativeElement.contains(event.target as Node))
      this.profileOpen.set(false);
  }
}
