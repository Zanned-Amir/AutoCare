import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Badge } from '@shared/ui';
import { RequestStatus, requestStatusLabels, requestStatusTones } from '../service-requests.types';

@Component({
  selector: 'app-request-status-badge',
  imports: [Badge],
  template: `<app-badge [tone]="tones[status()]">{{ labels[status()] }}</app-badge>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestStatusBadge {
  readonly status = input.required<RequestStatus>();
  protected readonly labels = requestStatusLabels;
  protected readonly tones = requestStatusTones;
}
