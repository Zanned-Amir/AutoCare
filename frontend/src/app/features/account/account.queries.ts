import { inject } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';

import { AuthStore } from '@core/auth/auth.store';
import { SessionService } from '@core/auth/session.service';
import { AccountApi } from './account.api';
import { ChangeEmailValue, ChangePasswordValue, ProfileValue } from './account.schema';

export const accountKeys = {
  sessions: () => ['account', 'sessions'] as const,
};

export function injectUpdateProfileMutation() {
  const api = inject(AccountApi);
  const auth = inject(AuthStore);
  return injectMutation(() => ({
    mutationFn: (value: ProfileValue) => api.updateProfile(value),
    onSuccess: (user) => auth.updateUser(user),
  }));
}

export function injectFinishOnboardingMutation() {
  const api = inject(AccountApi);
  const auth = inject(AuthStore);
  return injectMutation(() => ({
    mutationFn: (skipped: boolean) => api.finishOnboarding(skipped),
    onSuccess: (user) => auth.updateUser(user),
  }));
}

export function injectChangePasswordMutation() {
  const api = inject(AccountApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: (value: ChangePasswordValue) => api.changePassword(value),
    // Other devices were signed out.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.sessions() }),
  }));
}

export function injectRequestEmailChangeMutation() {
  const api = inject(AccountApi);
  return injectMutation(() => ({
    mutationFn: (value: ChangeEmailValue) => api.requestEmailChange(value),
  }));
}

export function injectSendEmailVerificationMutation() {
  const api = inject(AccountApi);
  return injectMutation(() => ({ mutationFn: () => api.sendEmailVerification() }));
}

export function injectSessionsQuery() {
  const api = inject(AccountApi);
  return injectQuery(() => ({
    queryKey: accountKeys.sessions(),
    queryFn: () => api.listSessions(),
  }));
}

export function injectSessionMutations() {
  const api = inject(AccountApi);
  const auth = inject(AuthStore);
  const queryClient = inject(QueryClient);
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: accountKeys.sessions() });
  const signedOut = () => {
    auth.clearSession();
    queryClient.clear();
  };
  return {
    revoke: injectMutation(() => ({
      mutationFn: (id: number) => api.revokeSession(id),
      onSuccess,
    })),
    revokeOthers: injectMutation(() => ({
      mutationFn: () => api.revokeOtherSessions(),
      onSuccess,
    })),
    logoutEverywhere: injectMutation(() => ({
      mutationFn: () => api.logoutEverywhere(),
      onSuccess: signedOut,
    })),
    deactivate: injectMutation(() => ({
      mutationFn: (currentPassword: string) => api.deactivateAccount(currentPassword),
      onSuccess: signedOut,
    })),
  };
}

export function injectOAuthAccountsQuery() {
  const api = inject(AccountApi);
  return injectQuery(() => ({
    queryKey: ['account', 'oauth'],
    queryFn: () => api.listOAuthAccounts(),
  }));
}

export function injectTelegramStatusQuery() {
  const api = inject(AccountApi);
  return injectQuery(() => ({
    queryKey: ['account', 'telegram'],
    queryFn: () => api.getTelegramStatus(),
  }));
}

/** Small account actions; each refreshes what it changed. */
export function injectAccountLinkMutations() {
  const api = inject(AccountApi);
  const queryClient = inject(QueryClient);
  const session = inject(SessionService);
  return {
    startOAuthLink: injectMutation(() => ({
      mutationFn: (provider: string) => api.startOAuthLink(provider),
    })),
    unlinkOAuth: injectMutation(() => ({
      mutationFn: (provider: string) => api.unlinkOAuthAccount(provider),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account', 'oauth'] }),
    })),
    sendPhoneCode: injectMutation(() => ({ mutationFn: () => api.sendPhoneVerification() })),
    confirmPhone: injectMutation(() => ({
      mutationFn: (code: string) => api.confirmPhone(code),
      onSuccess: () => session.refreshSession(),
    })),
    createTelegramLink: injectMutation(() => ({ mutationFn: () => api.createTelegramLink() })),
    unlinkTelegram: injectMutation(() => ({
      mutationFn: () => api.unlinkTelegram(),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account', 'telegram'] }),
    })),
  };
}
