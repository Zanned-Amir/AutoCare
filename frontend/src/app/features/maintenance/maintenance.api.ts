import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL, Page } from '@core/api/api';
import { MaintenanceRecordValue, MaintenanceReminderValue } from './maintenance.schema';
import { MaintenanceRecord, MaintenanceReminder } from './maintenance.types';

function toBody(value: MaintenanceRecordValue) {
  return {
    date: value.date,
    mileage: value.mileage,
    serviceId: value.serviceId ? Number(value.serviceId) : null,
    description: value.description.trim(),
    result: value.result.trim() || null,
  };
}

function toReminderBody(value: MaintenanceReminderValue) {
  return {
    title: value.title.trim(),
    serviceId: value.serviceId ? Number(value.serviceId) : null,
    dueDate: value.dueDate || null,
    dueMileage: value.dueMileage ? Number(value.dueMileage) : null,
    note: value.note.trim() || null,
  };
}

@Injectable({ providedIn: 'root' })
export class MaintenanceApi {
  private readonly http = inject(HttpClient);

  listVehicleHistory(vehicleId: number): Promise<MaintenanceRecord[]> {
    return firstValueFrom(this.http.get<MaintenanceRecord[]>(this.url(vehicleId)));
  }

  saveRecord(
    vehicleId: number,
    id: number | null,
    value: MaintenanceRecordValue,
  ): Promise<MaintenanceRecord> {
    return firstValueFrom(
      id === null
        ? this.http.post<MaintenanceRecord>(this.url(vehicleId), toBody(value))
        : this.http.put<MaintenanceRecord>(`${this.url(vehicleId)}/${id}`, toBody(value)),
    );
  }

  listReminders(vehicleId: number): Promise<MaintenanceReminder[]> {
    return firstValueFrom(this.http.get<MaintenanceReminder[]>(this.remindersUrl(vehicleId)));
  }

  saveReminder(
    vehicleId: number,
    id: number | null,
    value: MaintenanceReminderValue,
  ): Promise<MaintenanceReminder> {
    const url = this.remindersUrl(vehicleId);
    return firstValueFrom(
      id === null
        ? this.http.post<MaintenanceReminder>(url, toReminderBody(value))
        : this.http.put<MaintenanceReminder>(`${url}/${id}`, toReminderBody(value)),
    );
  }

  completeReminder(vehicleId: number, id: number): Promise<MaintenanceReminder> {
    return firstValueFrom(
      this.http.post<MaintenanceReminder>(`${this.remindersUrl(vehicleId)}/${id}/done`, null),
    );
  }

  deleteReminder(vehicleId: number, id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.remindersUrl(vehicleId)}/${id}`));
  }

  private remindersUrl(vehicleId: number): string {
    return `${API_URL}/vehicles/${vehicleId}/reminders`;
  }

  deleteRecord(vehicleId: number, id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.url(vehicleId)}/${id}`));
  }

  listOrganizationRecords(organizationId: number, page: number): Promise<Page<MaintenanceRecord>> {
    return firstValueFrom(
      this.http.get<Page<MaintenanceRecord>>(
        `${API_URL}/organizations/${organizationId}/maintenance-records`,
        {
          params: { page },
        },
      ),
    );
  }

  updateReport(
    organizationId: number,
    recordId: number,
    report: { result: string | null; recommendations: string | null },
  ): Promise<MaintenanceRecord> {
    return firstValueFrom(
      this.http.put<MaintenanceRecord>(
        `${API_URL}/organizations/${organizationId}/maintenance-records/${recordId}/report`,
        report,
      ),
    );
  }

  private url(vehicleId: number): string {
    return `${API_URL}/vehicles/${vehicleId}/maintenance-records`;
  }
}
