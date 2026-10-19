import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { effect } from '@angular/core';

export type LocationSource = 'gps' | 'place';
export type LocationStatus = 'idle' | 'locating' | 'denied' | 'unavailable';

interface LocationState {
  position: { latitude: number; longitude: number } | null;
  /** "Ma position" or a governorate name. */
  label: string | null;
  source: LocationSource | null;
  status: LocationStatus;
  /** Search radius around the position; null = all of Tunisia, nearest first. */
  radiusKm: number | null;
}

const KEY = 'autocare.location';

function restore(): Partial<LocationState> {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<LocationState> | null;
    return saved ?? {};
  } catch {
    return {};
  }
}

/**
 * Where the visitor wants to find a pro. Kept in this browser only (never in URLs or on the
 * server); the position is sent to the API only as search parameters.
 */
export const LocationStore = signalStore(
  { providedIn: 'root' },
  withState<LocationState>({
    position: null,
    label: null,
    source: null,
    status: 'idle',
    radiusKm: 25,
    ...restore(),
  }),
  withMethods((store) => ({
    locate(): void {
      if (!('geolocation' in navigator)) {
        patchState(store, { status: 'unavailable' });
        return;
      }
      patchState(store, { status: 'locating' });
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          patchState(store, {
            position: { latitude: coords.latitude, longitude: coords.longitude },
            label: 'Ma position',
            source: 'gps',
            status: 'idle',
          }),
        (error) =>
          patchState(store, {
            status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
          }),
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
      );
    },
    choosePlace(label: string, latitude: number, longitude: number): void {
      patchState(store, {
        position: { latitude, longitude },
        label,
        source: 'place',
        status: 'idle',
      });
    },
    setRadius(radiusKm: number | null): void {
      patchState(store, { radiusKm });
    },
    clear(): void {
      patchState(store, { position: null, label: null, source: null, status: 'idle' });
    },
  })),
  withHooks({
    onInit(store) {
      effect(() => {
        const { position, label, source, radiusKm } = {
          position: store.position(),
          label: store.label(),
          source: store.source(),
          radiusKm: store.radiusKm(),
        };
        try {
          localStorage.setItem(KEY, JSON.stringify({ position, label, source, radiusKm }));
        } catch {
          // Not critical: the visitor picks again next time.
        }
      });
    },
  }),
);
