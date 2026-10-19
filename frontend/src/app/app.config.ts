import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideTanStackQuery } from '@tanstack/angular-query-experimental';

import { authInterceptor } from '@core/auth/auth.interceptor';
import { SessionService } from '@core/auth/session.service';
import { createQueryClient } from '@core/query/query-client';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideTanStackQuery(createQueryClient()),
    // Restore the session from the refresh cookie before the first route guard runs.
    provideAppInitializer(() => inject(SessionService).restoreSession()),
  ],
};
