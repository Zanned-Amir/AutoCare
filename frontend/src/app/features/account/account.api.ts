import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL } from '@core/api/api';
import { SessionUser } from '@core/auth/auth.types';
import { ChangeEmailValue, ChangePasswordValue, ProfileValue } from './account.schema';
import { OAuthAccount, SentResponse, TelegramStatus, UserSession } from './account.types';

@Injectable({ providedIn: 'root' })
export class AccountApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_URL}/me`;

  updateProfile(value: ProfileValue): Promise<SessionUser> {
    return firstValueFrom(
      this.http.patch<SessionUser>(this.baseUrl, {
        fullName: value.fullName,
        phone: value.phone.trim() || null,
        locale: value.locale,
      }),
    );
  }

  /** Ends the welcome flow after sign-up; `skipped` when closed with "Passer". */
  finishOnboarding(skipped: boolean): Promise<SessionUser> {
    return firstValueFrom(this.http.post<SessionUser>(`${this.baseUrl}/onboarding`, { skipped }));
  }

  changePassword(value: ChangePasswordValue): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/password`, {
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
      }),
    );
  }

  requestEmailChange(value: ChangeEmailValue): Promise<SentResponse> {
    return firstValueFrom(this.http.post<SentResponse>(`${this.baseUrl}/email-change`, value));
  }

  sendEmailVerification(): Promise<SentResponse> {
    return firstValueFrom(
      this.http.post<SentResponse>(`${this.baseUrl}/email-verification/send`, { channel: 'LINK' }),
    );
  }

  listSessions(): Promise<UserSession[]> {
    return firstValueFrom(this.http.get<UserSession[]>(`${this.baseUrl}/sessions`));
  }

  revokeSession(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/sessions/${id}`));
  }

  revokeOtherSessions(): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/sessions`));
  }

  logoutEverywhere(): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.baseUrl}/logout-all`, null));
  }

  listOAuthAccounts(): Promise<OAuthAccount[]> {
    return firstValueFrom(this.http.get<OAuthAccount[]>(`${this.baseUrl}/oauth`));
  }

  startOAuthLink(provider: string): Promise<{ url: string }> {
    return firstValueFrom(
      this.http.post<{ url: string }>(`${this.baseUrl}/oauth/${provider}/link`, null),
    );
  }

  unlinkOAuthAccount(provider: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/oauth/${provider}`));
  }

  sendPhoneVerification(): Promise<SentResponse> {
    return firstValueFrom(
      this.http.post<SentResponse>(`${this.baseUrl}/phone-verification/send`, null),
    );
  }

  confirmPhone(code: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/phone-verification/confirm`, { code }),
    );
  }

  getTelegramStatus(): Promise<TelegramStatus> {
    return firstValueFrom(this.http.get<TelegramStatus>(`${this.baseUrl}/telegram`));
  }

  createTelegramLink(): Promise<{ url: string; expiresInSeconds: number }> {
    return firstValueFrom(
      this.http.post<{ url: string; expiresInSeconds: number }>(
        `${this.baseUrl}/telegram/link`,
        null,
      ),
    );
  }

  unlinkTelegram(): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/telegram`));
  }

  deactivateAccount(currentPassword: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.baseUrl}/deactivate`, { currentPassword }));
  }
}
