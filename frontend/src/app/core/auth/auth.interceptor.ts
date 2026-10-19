import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { API_URL } from '@core/api/api';
import { AuthStore } from './auth.store';
import { SessionService } from './session.service';

const AUTH_URL = `${API_URL}/auth/`;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL)) {
    return next(req);
  }
  const auth = inject(AuthStore);
  const session = inject(SessionService);
  const router = inject(Router);

  const withToken = (request: HttpRequest<unknown>) => {
    const token = auth.accessToken();
    if (!token) {
      return request;
    }
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    const orgId = auth.activeOrganizationId();
    if (orgId !== null) {
      headers['X-Organization-Id'] = String(orgId);
    }
    return request.clone({ setHeaders: headers });
  };

  return next(withToken(req)).pipe(
    catchError((error: unknown) => {
      // Access token expired: refresh once, then replay the request. Auth endpoints never retry.
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        req.url.startsWith(AUTH_URL)
      ) {
        return throwError(() => error);
      }
      return from(session.refreshSession()).pipe(
        switchMap((refreshed) => {
          if (!refreshed) {
            void router.navigate([auth.scope() === 'backoffice' ? '/admin/login' : '/login'], {
              queryParams: { redirect: router.url },
            });
            return throwError(() => error);
          }
          return next(withToken(req));
        }),
      );
    }),
  );
};
