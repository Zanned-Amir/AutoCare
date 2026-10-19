import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Button, EmptyState, Logo } from '@shared/ui';

@Component({
  selector: 'app-not-found-page',
  imports: [Button, EmptyState, Logo, RouterLink],
  template: `
    <div class="flex min-h-dvh flex-col items-center justify-center bg-background-subtle px-4">
      <a routerLink="/" class="mb-6" aria-label="AutoCare TN, accueil"><app-logo /></a>
      <div class="w-full max-w-lg rounded-card border border-border-subtle bg-surface shadow-card">
        <app-empty-state
          image="not-found"
          title="Page introuvable"
          description="Cette route n'existe pas ou a été déplacée. Pas de panique, on vous ramène sur la bonne voie."
        >
          <a appButton routerLink="/">Retour à l'accueil</a>
          <a appButton variant="secondary" routerLink="/providers">Trouver un pro</a>
        </app-empty-state>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
