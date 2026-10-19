import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

/** Merged `data` of the active route chain (the deepest route wins). Layouts use it for chrome. */
export function injectRouteData() {
  const router = inject(Router);
  const read = () => {
    let snapshot: ActivatedRouteSnapshot | null = router.routerState.snapshot.root;
    let data: Record<string, unknown> = {};
    while (snapshot) {
      data = { ...data, ...snapshot.data };
      snapshot = snapshot.firstChild;
    }
    return data;
  };
  return toSignal(
    router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(read),
      startWith(read()),
    ),
    { initialValue: read() },
  );
}
