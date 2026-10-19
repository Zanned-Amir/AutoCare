import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { ADMIN_NAV } from './admin-nav';

/** /admin opens the first section this staff member may use (a support agent lands on the helpdesk). */
export const adminHome: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const first = ADMIN_NAV.find((item) => !item.permission || auth.can(item.permission));
  return inject(Router).createUrlTree(first ? ['/admin', first.path] : ['/']);
};
