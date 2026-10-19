import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Button, Icon } from '@shared/ui';

const TEXT: Record<string, { title: string; text: string; cta: string; to: string }> = {
  password: {
    title: 'Mot de passe mis à jour',
    text: 'Vous pouvez vous connecter avec votre nouveau mot de passe. Vos autres appareils ont été déconnectés.',
    cta: 'Se connecter',
    to: '/login',
  },
  email: {
    title: 'Adresse confirmée',
    text: 'Merci, votre adresse e-mail est vérifiée.',
    cta: 'Continuer',
    to: '/',
  },
};

@Component({
  selector: 'app-auth-success-page',
  imports: [Button, Icon, RouterLink],
  template: `
    <div class="text-center">
      <span
        class="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-success-subtle text-success"
        ><svg appIcon name="circle-check" class="size-7"></svg
      ></span>
      <h2 class="text-h3 text-foreground">{{ content().title }}</h2>
      <p class="mt-2 text-body-sm leading-relaxed text-foreground-muted">{{ content().text }}</p>
      <a appButton [routerLink]="content().to" class="mt-8 w-full">{{ content().cta }}</a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthSuccessPage {
  readonly kind = input<string>();
  protected readonly content = computed(() => TEXT[this.kind() ?? 'password'] ?? TEXT['password']!);
}
