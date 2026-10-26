import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL, Page } from '@core/api/api';
import { CreateUserValue } from './users.schema';
import { AdminUser, UserSearchParams } from './users.types';

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_URL}/admin/users`;

  searchUsers(
    { q, role, active, sort, page }: UserSearchParams,
    size = 20,
  ): Promise<Page<AdminUser>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q.trim()) params = params.set('q', q.trim());
    if (role) params = params.set('role', role);
    if (active !== null) params = params.set('active', active);
    if (sort) params = params.set('sort', sort);
    return firstValueFrom(this.http.get<Page<AdminUser>>(this.baseUrl, { params }));
  }

  getUser(id: number): Promise<AdminUser> {
    return firstValueFrom(this.http.get<AdminUser>(`${this.baseUrl}/${id}`));
  }

  /** Opens the account and e-mails the person a link to choose a password. */
  createUser(value: CreateUserValue): Promise<AdminUser> {
    return firstValueFrom(
      this.http.post<AdminUser>(this.baseUrl, {
        email: value.email.trim(),
        fullName: value.fullName.trim(),
        phone: value.phone.trim() || null,
        locale: value.locale,
        roles: value.roles,
      }),
    );
  }

  resendUserInvitation(id: number): Promise<AdminUser> {
    return firstValueFrom(this.http.post<AdminUser>(`${this.baseUrl}/${id}/invitation`, null));
  }

  suspendUser(id: number): Promise<AdminUser> {
    return firstValueFrom(this.http.post<AdminUser>(`${this.baseUrl}/${id}/suspend`, null));
  }

  unsuspendUser(id: number): Promise<AdminUser> {
    return firstValueFrom(this.http.post<AdminUser>(`${this.baseUrl}/${id}/unsuspend`, null));
  }

  setUserRoles(id: number, roles: string[]): Promise<AdminUser> {
    return firstValueFrom(this.http.put<AdminUser>(`${this.baseUrl}/${id}/roles`, { roles }));
  }
}
