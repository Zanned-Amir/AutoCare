import { effect } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';

type Theme = 'light' | 'dark';

const THEME_KEY = 'autocare.theme';

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Storage can be blocked (private mode); fall back to the OS setting.
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** App-wide UI state only. Server data belongs in TanStack Query, never here. */
export const UiStore = signalStore(
  { providedIn: 'root' },
  withState({ theme: readTheme(), sidebarOpen: false }),
  withMethods((store) => ({
    toggleTheme(): void {
      patchState(store, { theme: store.theme() === 'dark' ? 'light' : 'dark' });
    },
    setSidebarOpen(sidebarOpen: boolean): void {
      patchState(store, { sidebarOpen });
    },
  })),
  withHooks({
    onInit(store) {
      effect(() => {
        const theme = store.theme();
        document.documentElement.classList.toggle('dark', theme === 'dark');
        try {
          localStorage.setItem(THEME_KEY, theme);
        } catch {
          // Not critical.
        }
      });
    },
  }),
);
