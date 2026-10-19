import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Badge, Button, Card } from '@shared/ui';
import { DiagnosticResult, urgencyLabels, urgencyTones } from '../diagnostic.types';

@Component({
  selector: 'app-diagnostic-result-card',
  imports: [Badge, Button, Card, RouterLink],
  template: `
    <app-card class="flex flex-col gap-3">
      <span class="text-overline text-foreground-muted">{{ result().symptomLabel }}</span>
      @if (result().matched) {
        @if (result().urgency; as urgency) {
          <app-badge [tone]="tones[urgency]" class="self-start">{{ labels[urgency] }}</app-badge>
        }
        <div>
          <p class="text-caption text-foreground-muted">Cause probable</p>
          <h2 class="text-h3 text-primary">{{ result().possibleCause }}</h2>
        </div>
        <p class="text-body text-foreground-secondary">{{ result().recommendation }}</p>
      } @else {
        <h2 class="text-h4 text-primary">Pas de cause évidente</h2>
        <p class="text-body text-foreground-secondary">
          Vos réponses ne correspondent à aucun cas connu. Un professionnel pourra examiner le
          véhicule.
        </p>
      }
      <p class="text-caption text-foreground-muted">
        Ce résultat est indicatif et ne remplace pas l'avis d'un professionnel.
      </p>
      <div class="flex flex-wrap gap-2 border-t border-border-subtle pt-3">
        @if (result().suggestedService; as service) {
          <a
            appButton
            variant="accent"
            routerLink="/providers"
            [queryParams]="{ serviceId: service.id, diagnosticId: result().id }"
            >Trouver un pro pour : {{ service.name }}</a
          >
        } @else {
          <a
            appButton
            variant="accent"
            routerLink="/providers"
            [queryParams]="{ diagnosticId: result().id }"
            >Trouver un professionnel</a
          >
        }
      </div>
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticResultCard {
  readonly result = input.required<DiagnosticResult>();
  protected readonly labels = urgencyLabels;
  protected readonly tones = urgencyTones;
}
