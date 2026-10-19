import { inject } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';

import { vehicleKeys } from '@features/vehicles/vehicles.queries';
import { MaintenanceApi } from './maintenance.api';
import { MaintenanceRecordValue, MaintenanceReminderValue } from './maintenance.schema';

export const maintenanceKeys = {
  all: ['maintenance'] as const,
  vehicle: (vehicleId: number) => [...maintenanceKeys.all, 'vehicle', vehicleId] as const,
  reminders: (vehicleId: number) => [...maintenanceKeys.all, 'reminders', vehicleId] as const,
  organization: (organizationId: number, page: number) =>
    [...maintenanceKeys.all, 'organization', organizationId, page] as const,
};

export function injectVehicleHistoryQuery(vehicleId: () => number) {
  const api = inject(MaintenanceApi);
  return injectQuery(() => ({
    queryKey: maintenanceKeys.vehicle(vehicleId()),
    queryFn: () => api.listVehicleHistory(vehicleId()),
  }));
}

export function injectRemindersQuery(vehicleId: () => number) {
  const api = inject(MaintenanceApi);
  return injectQuery(() => ({
    queryKey: maintenanceKeys.reminders(vehicleId()),
    queryFn: () => api.listReminders(vehicleId()),
  }));
}

export function injectReminderMutations(vehicleId: () => number) {
  const api = inject(MaintenanceApi);
  const queryClient = inject(QueryClient);
  const onSuccess = () =>
    queryClient.invalidateQueries({ queryKey: maintenanceKeys.reminders(vehicleId()) });
  return {
    save: injectMutation(() => ({
      mutationFn: ({ id, value }: { id: number | null; value: MaintenanceReminderValue }) =>
        api.saveReminder(vehicleId(), id, value),
      onSuccess,
    })),
    complete: injectMutation(() => ({
      mutationFn: (id: number) => api.completeReminder(vehicleId(), id),
      onSuccess,
    })),
    remove: injectMutation(() => ({
      mutationFn: (id: number) => api.deleteReminder(vehicleId(), id),
      onSuccess,
    })),
  };
}

export function injectOrganizationRecordsQuery(organizationId: () => number, page: () => number) {
  const api = inject(MaintenanceApi);
  return injectQuery(() => ({
    queryKey: maintenanceKeys.organization(organizationId(), page()),
    queryFn: () => api.listOrganizationRecords(organizationId(), page()),
  }));
}

/** A manual entry may raise the vehicle mileage, so the vehicle is refreshed too. */
export function injectMaintenanceMutations(vehicleId: () => number) {
  const api = inject(MaintenanceApi);
  const queryClient = inject(QueryClient);
  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicle(vehicleId()) });
    void queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
  };
  return {
    save: injectMutation(() => ({
      mutationFn: ({ id, value }: { id: number | null; value: MaintenanceRecordValue }) =>
        api.saveRecord(vehicleId(), id, value),
      onSuccess,
    })),
    remove: injectMutation(() => ({
      mutationFn: (id: number) => api.deleteRecord(vehicleId(), id),
      onSuccess,
    })),
  };
}

export function injectUpdateReportMutation(organizationId: () => number) {
  const api = inject(MaintenanceApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: (v: { recordId: number; result: string | null; recommendations: string | null }) =>
      api.updateReport(organizationId(), v.recordId, {
        result: v.result,
        recommendations: v.recommendations,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: maintenanceKeys.all }),
  }));
}
