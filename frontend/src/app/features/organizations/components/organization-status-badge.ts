import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Badge } from '@shared/ui';
import {
  OrganizationStatus,
  organizationStatusLabels,
  organizationStatusTones,
} from '../organizations.types';

@Component({
  selector: 'app-organization-status-badge',
  imports: [Badge],
  template: '<app-badge [tone]="tones[status()]">{{ labels[status()] }}</app-badge>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationStatusBadge {
  readonly status = input.required<OrganizationStatus>();

  protected readonly tones = organizationStatusTones;
  protected readonly labels = organizationStatusLabels;
}
