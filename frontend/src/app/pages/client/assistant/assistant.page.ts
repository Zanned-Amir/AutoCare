import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AssistantChatStore } from '@features/assistant/assistant-chat.store';
import { AssistantChat } from '@features/assistant/components/assistant-chat';

@Component({
  selector: 'app-assistant-page',
  imports: [AssistantChat],
  providers: [AssistantChatStore],
  template: `
    <span class="text-overline text-accent-text">Assistant IA</span>
    <h1 class="text-h2 text-primary">Une question sur votre voiture ?</h1>
    <p class="mt-1 max-w-2xl text-body text-foreground-secondary">
      L’assistant connaît vos véhicules et leur entretien. Il vous aide à comprendre un symptôme et
      à choisir le bon service.
    </p>
    <div class="mt-6 max-w-3xl">
      <app-assistant-chat />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantPage {}
