import { Injectable, signal } from '@angular/core';

/**
 * What the current backoffice page tells the shell (toutestcasa AdminPageChrome): its title for
 * the phone top bar, and where "back" goes on a record page. Provided by BackofficeShell.
 */
@Injectable()
export class BackofficeChrome {
  readonly title = signal<string | null>(null);
  readonly parentPath = signal<string | null>(null);
}
