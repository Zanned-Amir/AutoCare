import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { AuthApi } from '../auth.api';
import { injectOAuthProvidersQuery } from '../auth.queries';

const LABEL: Record<string, string> = { google: 'Google', facebook: 'Facebook', github: 'GitHub' };

/** Round provider buttons (toutestcasa SocialAuthButtons), only for providers enabled on the API. */
@Component({
  selector: 'app-oauth-buttons',
  template: `
    @if (providers().length > 0) {
      <div class="flex items-center gap-3 text-caption text-foreground-muted">
        <span class="h-px flex-1 bg-border-subtle"></span>{{ caption()
        }}<span class="h-px flex-1 bg-border-subtle"></span>
      </div>
      <div class="mt-4 flex items-center justify-center gap-4">
        @for (provider of providers(); track provider.provider) {
          <a
            [href]="api.oauthAuthorizeUrl(provider.provider, redirect())"
            class="flex size-12 items-center justify-center rounded-full border border-border bg-surface transition-colors hover:bg-background-subtle"
            [attr.aria-label]="verb() + ' avec ' + label[provider.provider]"
            [title]="verb() + ' avec ' + label[provider.provider]"
          >
            @switch (provider.provider) {
              @case ('google') {
                <svg class="size-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              }
              @case ('facebook') {
                <svg class="size-5" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                  <path
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                  />
                </svg>
              }
              @case ('github') {
                <svg
                  class="size-5 text-foreground"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    d="M12 .5C5.65.5.5 5.65.5 12.02c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56v-1.96c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.53 11.53 0 0 0 23.5 12.02C23.5 5.65 18.35.5 12 .5Z"
                  />
                </svg>
              }
            }
          </a>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class OAuthButtons {
  /** In-app path to land on after signing in. */
  readonly redirect = input('/');
  readonly intent = input<'login' | 'register'>('login');

  protected readonly api = inject(AuthApi);
  protected readonly label = LABEL;
  protected readonly verb = computed(() =>
    this.intent() === 'register' ? "S'inscrire" : 'Se connecter',
  );
  protected readonly caption = computed(() =>
    this.intent() === 'register' ? 'ou inscrivez-vous avec' : 'ou continuez avec',
  );
  private readonly query = injectOAuthProvidersQuery();
  protected readonly providers = computed(() =>
    (this.query.data() ?? []).filter((p) => p.redirect),
  );
}
