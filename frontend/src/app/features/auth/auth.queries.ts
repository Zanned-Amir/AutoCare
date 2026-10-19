import { inject } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';

import { AuthStore } from '@core/auth/auth.store';
import { SessionScope } from '@core/auth/auth.types';
import { SessionService } from '@core/auth/session.service';
import { AuthApi, ResetChannel } from './auth.api';
import { LoginValue, RegisterValue } from './auth.schema';

export function injectLoginMutation(scope: () => SessionScope = () => 'customer') {
  const api = inject(AuthApi);
  const auth = inject(AuthStore);
  return injectMutation(() => ({
    mutationFn: (value: LoginValue) => api.loginUser(value, scope()),
    onSuccess: (response) => auth.setSession(response, scope()),
  }));
}

export function injectRegisterMutation() {
  const api = inject(AuthApi);
  const auth = inject(AuthStore);
  return injectMutation(() => ({
    mutationFn: (value: RegisterValue) => api.registerUser(value),
    onSuccess: (response) => auth.setSession(response, 'customer'),
  }));
}

export function injectRequestPasswordResetMutation() {
  const api = inject(AuthApi);
  return injectMutation(() => ({
    mutationFn: ({ email, channel }: { email: string; channel: ResetChannel }) =>
      api.requestPasswordReset(email, channel),
  }));
}

export function injectResetPasswordMutation() {
  const api = inject(AuthApi);
  return injectMutation(() => ({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      api.resetPassword(token, newPassword),
  }));
}

export function injectResetPasswordWithCodeMutation() {
  const api = inject(AuthApi);
  return injectMutation(() => ({
    mutationFn: ({
      email,
      code,
      newPassword,
    }: {
      email: string;
      code: string;
      newPassword: string;
    }) => api.resetPasswordWithCode(email, code, newPassword),
  }));
}

/** Confirms an e-mail link (verification or change), then refreshes the signed-in user if there is one. */
export function injectConfirmEmailTokenMutation(kind: 'verification' | 'change') {
  const api = inject(AuthApi);
  const auth = inject(AuthStore);
  const session = inject(SessionService);
  return injectMutation(() => ({
    mutationFn: (token: string) =>
      kind === 'verification' ? api.confirmEmail(token) : api.confirmEmailChange(token),
    onSuccess: async () => {
      if (auth.isAuthenticated()) {
        await session.refreshSession();
      }
    },
  }));
}

export function injectOAuthProvidersQuery() {
  const api = inject(AuthApi);
  return injectQuery(() => ({
    queryKey: ['auth', 'oauth-providers'],
    queryFn: () => api.listOAuthProviders(),
    staleTime: Infinity,
  }));
}

export function injectLogoutMutation() {
  const api = inject(AuthApi);
  const auth = inject(AuthStore);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: () => api.logoutUser(auth.scope()),
    // Sign out locally even if the call fails (offline, already expired).
    onSettled: () => {
      auth.clearSession();
      queryClient.clear();
    },
  }));
}
