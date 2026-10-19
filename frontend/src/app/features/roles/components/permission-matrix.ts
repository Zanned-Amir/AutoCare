import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { CatalogModule, PERMISSION_CATALOG, Role, hasPermission } from '../roles.types';

/**
 * toutestcasa PermissionMatrix: one row per action, grouped by module; the first column is
 * the role being viewed or edited, the others are the existing roles, read-only, to compare.
 */
@Component({
  selector: 'app-permission-matrix',
  template: `
    <div class="overflow-x-auto rounded-2xl border border-border-subtle bg-surface">
      <table class="w-full min-w-[560px] border-collapse">
        <thead>
          <tr class="bg-background-subtle">
            <th
              scope="col"
              class="px-5 py-3.5 text-left text-overline tracking-wider text-foreground-secondary uppercase"
            >
              Module / permission
            </th>
            <th
              scope="col"
              class="w-[120px] px-3 py-3.5 text-center text-overline tracking-wider text-primary uppercase"
            >
              {{ label() }}
            </th>
            @for (role of compareWith(); track role.id) {
              <th
                scope="col"
                class="w-[120px] px-3 py-3.5 text-center text-overline tracking-wider text-foreground-muted uppercase"
              >
                {{ role.label }}
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (group of catalog; track group.label) {
            @for (module of group.modules; track module.key) {
              <tr class="bg-background-subtle/50">
                <th
                  scope="rowgroup"
                  [attr.colspan]="compareWith().length + 2"
                  class="px-5 py-2.5 text-left text-label text-foreground"
                >
                  {{ group.label }} : {{ module.label }}
                </th>
              </tr>
              @for (action of module.actions; track action.key) {
                <tr
                  class="border-t border-border-subtle transition-colors hover:bg-background-subtle/40"
                >
                  <td class="px-5 py-3 pl-8 text-body-sm text-foreground">{{ action.label }}</td>
                  <td class="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      class="size-4 cursor-pointer accent-primary disabled:cursor-default"
                      [attr.aria-label]="module.label + ' : ' + action.label"
                      [checked]="has(permissions(), module.key, action.key)"
                      [disabled]="readOnly()"
                      (change)="toggle(module, action.key, $any($event.target).checked)"
                    />
                  </td>
                  @for (role of compareWith(); track role.id) {
                    <td class="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        class="size-4 accent-foreground-muted"
                        tabindex="-1"
                        [attr.aria-label]="role.label + ', ' + module.label + ' : ' + action.label"
                        [checked]="has(role.permissions, module.key, action.key)"
                        disabled
                      />
                    </td>
                  }
                </tr>
              }
            }
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionMatrix {
  readonly label = input.required<string>();
  readonly permissions = input.required<string[]>();
  readonly compareWith = input<Role[]>([]);
  readonly readOnly = input(false);
  readonly toggled = output<{ module: CatalogModule; action: string; checked: boolean }>();

  protected readonly catalog = PERMISSION_CATALOG;

  protected has(permissions: string[], module: string, action: string): boolean {
    return hasPermission(permissions, `${module}:${action}`);
  }

  protected toggle(module: CatalogModule, action: string, checked: boolean): void {
    this.toggled.emit({ module, action, checked });
  }
}
