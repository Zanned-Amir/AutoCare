import { DestroyRef, effect, inject, Signal } from '@angular/core';

let locks = 0;

/**
 * Locks page scroll while `open()` is true (nested overlays count), and closes on Escape.
 * Shared by Modal and Drawer.
 */
export function bindOverlay(open: Signal<boolean>, close: () => void): void {
  let locked = false;
  const unlock = () => {
    if (!locked) return;
    locked = false;
    locks--;
    if (locks === 0) document.body.style.overflow = '';
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
  };
  effect(() => {
    if (open() && !locked) {
      locked = true;
      locks++;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onKey);
    } else if (!open() && locked) {
      document.removeEventListener('keydown', onKey);
      unlock();
    }
  });
  inject(DestroyRef).onDestroy(() => {
    document.removeEventListener('keydown', onKey);
    unlock();
  });
}
