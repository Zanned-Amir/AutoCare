import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import { AuthResponse, SessionScope, SessionUser } from './auth.types';
import { grants } from './permission';

interface AuthState {
  /** Kept in memory only. The refresh token lives in an httpOnly cookie set by the backend. */
  accessToken: string | null;
  scope: SessionScope;
  user: SessionUser | null;
  /** Permissions of the active organization membership (provider workspace). */
  organizationPermissions: string[];
  activeOrganizationId: number | null;
}

const initialState: AuthState = {
  accessToken: null,
  scope: 'customer',
  user: null,
  organizationPermissions: [],
  activeOrganizationId: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ accessToken, user }) => ({
    isAuthenticated: computed(() => accessToken() !== null),
    permissions: computed(() => user()?.permissions ?? []),
  })),
  withMethods((store) => ({
    setSession(response: AuthResponse, scope: SessionScope = 'customer'): void {
      patchState(store, { accessToken: response.accessToken, user: response.user, scope });
    },
    /** After a profile or e-mail change: keep the token, refresh the user shown in the app. */
    updateUser(user: SessionUser): void {
      patchState(store, { user });
    },
    setActiveOrganization(organizationId: number, organizationPermissions: string[]): void {
      patchState(store, { activeOrganizationId: organizationId, organizationPermissions });
    },
    clearSession(): void {
      patchState(store, initialState);
    },
    can(permission: string): boolean {
      return grants(store.permissions(), permission);
    },
    canInOrganization(permission: string): boolean {
      return grants(store.organizationPermissions(), permission);
    },
  })),
);
