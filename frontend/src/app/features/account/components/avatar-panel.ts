import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';

import { API_URL, problemMessage } from '@core/api/api';
import { Button, FileButton } from '@shared/ui';
import { StoredFile } from '@shared/types/stored-file';

const avatarKey = ['account', 'avatar'] as const;

@Component({
  selector: 'app-avatar-panel',
  imports: [Button, FileButton],
  template: `
    <div class="flex items-center gap-4">
      @if (avatar.data(); as current) {
        <img
          [src]="current.url"
          alt="Photo de profil"
          class="size-20 rounded-full border border-border-subtle object-cover"
        />
      } @else {
        <span
          class="grid size-20 place-items-center rounded-full bg-primary-subtle text-h3 text-primary"
          >?</span
        >
      }
      <div class="flex flex-col gap-2">
        <app-file-button [disabled]="upload.isPending()" (picked)="pick($event)">
          {{ avatar.data() ? 'Changer la photo' : 'Ajouter une photo' }}
        </app-file-button>
        @if (avatar.data()) {
          <button appButton variant="ghost" size="sm" type="button" (click)="remove.mutate()">
            Retirer
          </button>
        }
      </div>
    </div>
    @if (error(); as message) {
      <p class="mt-2 text-body-sm text-error">{{ message }}</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarPanel {
  private readonly http = inject(HttpClient);
  private readonly queryClient = inject(QueryClient);
  private readonly url = `${API_URL}/me/avatar`;

  protected readonly error = signal<string | null>(null);
  protected readonly avatar = injectQuery(() => ({
    queryKey: avatarKey,
    // 204 when there is no picture: HttpClient gives null.
    queryFn: () => firstValueFrom(this.http.get<StoredFile | null>(this.url)),
  }));
  protected readonly upload = injectMutation(() => ({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('file', file);
      return firstValueFrom(this.http.put<StoredFile>(this.url, body));
    },
    onSuccess: () => this.queryClient.invalidateQueries({ queryKey: avatarKey }),
  }));
  protected readonly remove = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.http.delete<void>(this.url)),
    onSuccess: () => this.queryClient.invalidateQueries({ queryKey: avatarKey }),
  }));

  protected pick(file: File): void {
    this.error.set(null);
    this.upload.mutate(file, {
      onError: (e) => this.error.set(problemMessage(e, 'Envoi impossible')),
    });
  }
}
