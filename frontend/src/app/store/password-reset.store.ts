import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

/**
 * Carries the e-mail and the typed code from /verify-otp to /reset-password (memory only, never in
 * the URL or storage). The backend checks the code with the new password in one call.
 */
export const PasswordResetStore = signalStore(
  { providedIn: 'root' },
  withState<{ email: string; code: string }>({ email: '', code: '' }),
  withMethods((store) => ({
    start(email: string): void {
      patchState(store, { email, code: '' });
    },
    setCode(code: string): void {
      patchState(store, { code });
    },
    clear(): void {
      patchState(store, { email: '', code: '' });
    },
  })),
);
