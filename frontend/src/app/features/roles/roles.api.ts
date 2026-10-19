import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL } from '@core/api/api';
import { Role, RoleValue } from './roles.types';

function toBody(value: RoleValue) {
  return {
    name: value.name.trim(),
    label: value.label.trim(),
    description: value.description.trim() || null,
    permissions: value.permissions,
    backoffice: value.backoffice,
  };
}

@Injectable({ providedIn: 'root' })
export class RolesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_URL}/admin/roles`;

  listRoles(): Promise<Role[]> {
    return firstValueFrom(this.http.get<Role[]>(this.baseUrl));
  }

  getRole(id: number): Promise<Role> {
    return firstValueFrom(this.http.get<Role>(`${this.baseUrl}/${id}`));
  }

  saveRole(id: number | null, value: RoleValue): Promise<Role> {
    return firstValueFrom(
      id === null
        ? this.http.post<Role>(this.baseUrl, toBody(value))
        : this.http.put<Role>(`${this.baseUrl}/${id}`, toBody(value)),
    );
  }

  /** Members of the role move to `replacementRoleId` (required when it has any). */
  deleteRole(id: number, replacementRoleId: number | null): Promise<void> {
    let params = new HttpParams();
    if (replacementRoleId !== null) params = params.set('replacementRoleId', replacementRoleId);
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`, { params }));
  }
}
