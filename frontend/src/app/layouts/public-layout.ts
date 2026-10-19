import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { EmailVerificationBanner } from '@features/account/components/email-verification-banner';
import { ClientBottomNav } from './client/client-bottom-nav';
import { SiteFooter } from './client/site-footer';
import { SiteHeader } from './client/site-header';
import { injectRouteData } from './route-data';

/**
 * Client area. Route data: `fullBleed` lets a page use the whole width (home, map search),
 * `hideFooter` drops the footer under full-height pages. --site-header is the sticky header
 * height, for pages that fill the screen below it.
 */
@Component({
  selector: 'app-public-layout',
  imports: [ClientBottomNav, EmailVerificationBanner, RouterOutlet, SiteFooter, SiteHeader],
  template: `
    <div
      class="flex min-h-dvh flex-col bg-background text-foreground [--site-header:4rem] md:[--site-header:8.5rem]"
    >
      <app-site-header />
      <app-email-verification-banner />
      <main [class]="mainClass()">
        <router-outlet />
      </main>
      @if (!data()['hideFooter']) {
        <app-site-footer />
      }
      <div class="h-16 md:hidden" aria-hidden="true"></div>
      <app-client-bottom-nav />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicLayout {
  protected readonly data = injectRouteData();
  protected readonly mainClass = computed(() =>
    this.data()['fullBleed']
      ? 'flex-1'
      : 'mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8 md:py-10',
  );
}
