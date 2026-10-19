/** Mirrors the backend MaintenanceRecordResponse. */
export interface MaintenanceRecord {
  id: number;
  vehicleId: number;
  date: string;
  mileage: number;
  description: string;
  result: string | null;
  recommendations: string | null;
  source: 'SERVICE_REQUEST' | 'MANUAL';
  editable: boolean;
  serviceRequestId: number | null;
  service: { id: number; name: string | null } | null;
  organization: { id: number; name: string } | null;
  createdAt: string;
}

/** Mirrors the backend MaintenanceReminderResponse. `due`: within 7 days or 500 km, or overdue. */
export interface MaintenanceReminder {
  id: number;
  vehicleId: number;
  serviceId: number | null;
  title: string;
  dueDate: string | null;
  dueMileage: number | null;
  note: string | null;
  due: boolean;
  doneAt: string | null;
  notifiedAt: string | null;
  createdAt: string;
}

export const MaintenancePermissions = { HISTORY_READ: 'history:read' } as const;
