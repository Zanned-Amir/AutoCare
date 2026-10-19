import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from './auth.store';

export const requireAuth: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  return auth.isAuthenticated()
    ? true
    : inject(Router).createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

export function requirePermission(permission: string): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
    }
    return auth.can(permission) ? true : router.createUrlTree(['/']);
  };
}

/** /admin pages need a backoffice session (staff login), not a customer one, even for an admin account. */
export function requireBackoffice(permission?: string): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    if (!auth.isAuthenticated() || auth.scope() !== 'backoffice') {
      return router.createUrlTree(['/admin/login'], { queryParams: { redirect: state.url } });
    }
    return !permission || auth.can(permission) ? true : router.createUrlTree(['/admin']);
  };
}

/** Same-origin paths only, so ?redirect= cannot send someone to another site. */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : fallback;
}

/** The welcome flow: signed in, and only until it is finished or skipped. */
export const requireOnboarding: CanActivateFn = (route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
  }
  return auth.user()?.onboardingDone
    ? router.parseUrl(safeRedirect(route.queryParamMap.get('redirect')))
    : true;
};

/** For login/register pages: a signed-in user goes home instead. */
export const requireGuest: CanActivateFn = () =>
  inject(AuthStore).isAuthenticated() ? inject(Router).createUrlTree(['/']) : true;
