import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

/** Client-only state of the admin catalog screen. Provide it in the page, not in root. */
export const CatalogFiltersStore = signalStore(
  withState({ q: '', page: 0, size: 20, active: null as boolean | null, sort: 'name,asc' }),
  withMethods((store) => ({
    setQuery(q: string): void {
      patchState(store, { q, page: 0 });
    },
    setActive(active: boolean | null): void {
      patchState(store, { active, page: 0 });
    },
    setSort(sort: string): void {
      patchState(store, { sort, page: 0 });
    },
    reset(): void {
      patchState(store, { q: '', active: null, sort: 'name,asc', page: 0 });
    },
    setPage(page: number): void {
      patchState(store, { page });
    },
  })),
);
