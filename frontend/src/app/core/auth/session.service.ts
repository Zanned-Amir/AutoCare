import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL } from '@core/api/api';
import { AuthStore } from './auth.store';
import { AuthResponse, SessionScope } from './auth.types';

/** Restores and refreshes the session from the httpOnly refresh cookie of its scope. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthStore);
  private refreshing: Promise<boolean> | null = null;

  /** At startup: the backoffice session on /admin pages, the customer one elsewhere. */
  restoreSession(): Promise<boolean> {
    return this.refreshSession(location.pathname.startsWith('/admin') ? 'backoffice' : 'customer');
  }

  /** Concurrent 401s share one refresh request, because the backend rotates the token on every call. */
  refreshSession(scope: SessionScope = this.auth.scope()): Promise<boolean> {
    this.refreshing ??= firstValueFrom(
      this.http.post<AuthResponse | null>(`${API_URL}/auth/c/refresh`, null, {
        params: new HttpParams().set('scope', scope),
      }),
    )
      .then((response) => {
        // 204: no refresh cookie, nobody signed in.
        if (!response) {
          this.auth.clearSession();
          return false;
        }
        this.auth.setSession(response, scope);
        return true;
      })
      .catch(() => {
        this.auth.clearSession();
        return false;
      })
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }
}
