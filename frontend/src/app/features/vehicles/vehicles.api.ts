import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL } from '@core/api/api';
import { StoredFile } from '@shared/types/stored-file';
import { VehicleFormValue } from './vehicles.schema';
import { Vehicle } from './vehicles.types';

/** Empty plate and VIN are sent as null. */
function toBody(value: VehicleFormValue) {
  return { ...value, plate: value.plate.trim() || null, vin: value.vin.trim() || null };
}

@Injectable({ providedIn: 'root' })
export class VehiclesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_URL}/vehicles`;

  listMyVehicles(): Promise<Vehicle[]> {
    return firstValueFrom(this.http.get<Vehicle[]>(this.baseUrl));
  }

  /** Backoffice: the vehicles of one user. */
  listUserVehicles(userId: number): Promise<Vehicle[]> {
    return firstValueFrom(this.http.get<Vehicle[]>(`${API_URL}/admin/users/${userId}/vehicles`));
  }

  createVehicle(value: VehicleFormValue): Promise<Vehicle> {
    return firstValueFrom(this.http.post<Vehicle>(this.baseUrl, toBody(value)));
  }

  updateVehicle(id: number, value: VehicleFormValue): Promise<Vehicle> {
    return firstValueFrom(this.http.put<Vehicle>(`${this.baseUrl}/${id}`, toBody(value)));
  }

  deleteVehicle(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }

  getVehicle(id: number): Promise<Vehicle> {
    return firstValueFrom(this.http.get<Vehicle>(`${this.baseUrl}/${id}`));
  }

  listPhotos(id: number): Promise<StoredFile[]> {
    return firstValueFrom(this.http.get<StoredFile[]>(`${this.baseUrl}/${id}/photos`));
  }

  uploadPhoto(id: number, file: File): Promise<StoredFile> {
    const body = new FormData();
    body.append('file', file);
    return firstValueFrom(this.http.post<StoredFile>(`${this.baseUrl}/${id}/photos`, body));
  }

  deletePhoto(id: number, fileId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}/photos/${fileId}`));
  }
}
