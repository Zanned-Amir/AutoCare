import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL } from '@core/api/api';
import { AuthResponse, SessionScope } from '@core/auth/auth.types';
import { LoginValue, RegisterValue } from './auth.schema';

export type ResetChannel = 'LINK' | 'OTP' | 'SMS' | 'TELEGRAM';

export interface OAuthProvider {
  provider: 'google' | 'facebook' | 'github' | 'apple';
  redirect: boolean;
  idToken: boolean;
}

/** Cookie mode (/auth/c): the refresh token stays in an httpOnly cookie. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  loginUser(value: LoginValue, scope: SessionScope): Promise<AuthResponse> {
    return firstValueFrom(
      this.http.post<AuthResponse>(`${API_URL}/auth/c/login`, { ...value, scope }),
    );
  }

  registerUser(value: RegisterValue): Promise<AuthResponse> {
    const body = { ...value, phone: value.phone.trim() || null };
    return firstValueFrom(this.http.post<AuthResponse>(`${API_URL}/auth/c/register`, body));
  }

  logoutUser(scope: SessionScope): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${API_URL}/auth/c/logout`, null, {
        params: new HttpParams().set('scope', scope),
      }),
    );
  }

  requestPasswordReset(email: string, channel: ResetChannel): Promise<{ retryAfter: number }> {
    return firstValueFrom(
      this.http.post<{ retryAfter: number }>(`${API_URL}/auth/password-reset/request`, {
        email,
        channel,
      }),
    );
  }

  resetPassword(token: string, newPassword: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${API_URL}/auth/password-reset/confirm`, { token, newPassword }),
    );
  }

  resetPasswordWithCode(email: string, code: string, newPassword: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${API_URL}/auth/password-reset/confirm-otp`, {
        email,
        code,
        newPassword,
      }),
    );
  }

  confirmEmail(token: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${API_URL}/auth/email-verification/confirm`, { token }),
    );
  }

  confirmEmailChange(token: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API_URL}/auth/email-change/confirm`, { token }));
  }

  listOAuthProviders(): Promise<OAuthProvider[]> {
    return firstValueFrom(this.http.get<OAuthProvider[]>(`${API_URL}/auth/oauth/providers`));
  }

  /** Full-page navigation to the backend, which redirects to the provider. */
  oauthAuthorizeUrl(provider: string, redirect: string): string {
    return `${API_URL}/auth/oauth/${provider}/authorize?redirect=${encodeURIComponent(redirect)}`;
  }
}
