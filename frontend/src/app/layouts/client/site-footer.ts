import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { injectActiveAutoServicesQuery } from '@features/catalog/catalog.queries';
import { Icon, Logo } from '@shared/ui';

@Component({
  selector: 'app-site-footer',
  imports: [Icon, Logo, RouterLink],
  template: `
    <footer class="bg-primary text-white">
      <div class="mx-auto max-w-7xl px-5 pt-10 md:px-8 md:pt-14">
        <div class="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-8">
          <div class="col-span-2 md:col-span-1">
            <a routerLink="/" aria-label="AutoCare TN, accueil"><app-logo theme="white" /></a>
            <p class="mt-4 max-w-xs text-body-sm text-petrol-100">
              L'entretien auto, simplement. Diagnostic guidé, garages et services à domicile
              vérifiés, partout en Tunisie.
            </p>
            <p class="mt-4 flex items-center gap-2 text-body-sm">
              <svg appIcon name="phone" class="size-4"></svg>+216 70 000 000
            </p>
            <p class="text-body-sm">contact&#64;autocare.tn</p>
          </div>
          <div>
            <h3 class="mb-3 text-label text-white md:text-h4">Services</h3>
            <ul class="space-y-2 md:space-y-3">
              @for (service of services.data()?.slice(0, 6) ?? []; track service.id) {
                <li>
                  <a
                    routerLink="/providers"
                    [queryParams]="{ serviceId: service.id }"
                    class="text-body-sm text-petrol-100 hover:text-white"
                    >{{ service.name }}</a
                  >
                </li>
              }
            </ul>
          </div>
          <div>
            <h3 class="mb-3 text-label text-white md:text-h4">AutoCare</h3>
            <ul class="space-y-2 md:space-y-3">
              <li>
                <a routerLink="/providers" class="text-body-sm text-petrol-100 hover:text-white"
                  >Trouver un pro près de moi</a
                >
              </li>
              <li>
                <a routerLink="/diagnostic" class="text-body-sm text-petrol-100 hover:text-white"
                  >Diagnostic guidé</a
                >
              </li>
              <li>
                <a routerLink="/vehicles" class="text-body-sm text-petrol-100 hover:text-white"
                  >Carnet d'entretien</a
                >
              </li>
              <li>
                <a routerLink="/organizations" class="text-body-sm text-petrol-100 hover:text-white"
                  >Devenir partenaire</a
                >
              </li>
            </ul>
          </div>
          <div class="col-span-2 md:col-span-1">
            <h3 class="mb-3 text-label text-white md:text-h4">Aide</h3>
            <ul class="space-y-2 md:space-y-3">
              <li>
                <a routerLink="/support" class="text-body-sm text-petrol-100 hover:text-white"
                  >Centre d'aide et support</a
                >
              </li>
              <li>
                <a routerLink="/account" class="text-body-sm text-petrol-100 hover:text-white"
                  >Mon compte</a
                >
              </li>
              <li>
                <a routerLink="/admin/login" class="text-body-sm text-petrol-100 hover:text-white"
                  >Espace équipe</a
                >
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div class="mt-10 bg-petrol-800">
        <div
          class="mx-auto flex max-w-7xl flex-col items-center gap-2 px-5 py-4 text-center md:flex-row md:justify-between md:px-8 md:text-left"
        >
          <p class="text-caption text-petrol-100">
            © {{ year }} AutoCare TN. Tous droits réservés.
          </p>
          <p class="flex items-center gap-1.5 text-caption text-petrol-100">
            <svg appIcon name="map-pin" class="size-3.5"></svg>Fait en Tunisie
          </p>
        </div>
      </div>
    </footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooter {
  protected readonly services = injectActiveAutoServicesQuery();
  protected readonly year = new Date().getFullYear();
}
