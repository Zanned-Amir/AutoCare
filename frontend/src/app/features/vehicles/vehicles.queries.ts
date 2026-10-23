import { inject } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';

import { VehiclesApi } from './vehicles.api';
import { VehicleFormValue } from './vehicles.schema';

export const vehicleKeys = {
  all: ['vehicles'] as const,
  mine: () => [...vehicleKeys.all, 'mine'] as const,
  detail: (id: number) => [...vehicleKeys.all, 'detail', id] as const,
  photos: (id: number) => [...vehicleKeys.all, 'photos', id] as const,
  ofUser: (userId: number) => [...vehicleKeys.all, 'user', userId] as const,
};

/** Backoffice user page. */
export function injectUserVehiclesQuery(userId: () => number) {
  const api = inject(VehiclesApi);
  return injectQuery(() => ({
    queryKey: vehicleKeys.ofUser(userId()),
    queryFn: () => api.listUserVehicles(userId()),
  }));
}

export function injectVehicleQuery(id: () => number) {
  const api = inject(VehiclesApi);
  return injectQuery(() => ({
    queryKey: vehicleKeys.detail(id()),
    queryFn: () => api.getVehicle(id()),
    retry: false,
  }));
}


export function injectVehiclePhotosQuery(vehicleId: () => number) {
  const api = inject(VehiclesApi);
  return injectQuery(() => ({
    queryKey: vehicleKeys.photos(vehicleId()),
    queryFn: () => api.listPhotos(vehicleId()),
    staleTime: 2 * 60 * 1000, // URLs signées (valides 15 min) : on garde une marge
  }));
}


export function injectVehiclePhotoMutations(id: () => number) {
  const api = inject(VehiclesApi);
  const queryClient = inject(QueryClient);
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: vehicleKeys.photos(id()) });
  return {
    upload: injectMutation(() => ({
      mutationFn: (file: File) => api.uploadPhoto(id(), file),
      onSuccess,
    })),
    remove: injectMutation(() => ({
      mutationFn: (fileId: number) => api.deletePhoto(id(), fileId),
      onSuccess,
    })),
  };
}

export function injectMyVehiclesQuery() {
  const api = inject(VehiclesApi);
  return injectQuery(() => ({
    queryKey: vehicleKeys.mine(),
    queryFn: () => api.listMyVehicles(),
  }));
}

export function injectSaveVehicleMutation() {
  const api = inject(VehiclesApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: ({ id, value }: { id: number | null; value: VehicleFormValue }) =>
      id === null ? api.createVehicle(value) : api.updateVehicle(id, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleKeys.all }),
  }));
}

export function injectDeleteVehicleMutation() {
  const api = inject(VehiclesApi);
  const queryClient = inject(QueryClient);
  return injectMutation(() => ({
    mutationFn: (id: number) => api.deleteVehicle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleKeys.all }),
  }));
}

export const vehicleCatalogKey = ['vehicle-catalog'] as const;

export function injectVehicleCatalogQuery() {
  const api = inject(VehiclesApi);
  return injectQuery(() => ({
    queryKey: vehicleCatalogKey,
    queryFn: () => api.getCatalog(),
    staleTime: Infinity,
  }));
}

