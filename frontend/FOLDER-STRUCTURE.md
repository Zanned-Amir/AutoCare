# Frontend folder structure

Angular 22, standalone components, zoneless, signals everywhere. Same split as the toutestcasa web app: **`features/` holds logic, `pages/` composes routes.**

| Concern | Library | toutestcasa (React) equivalent |
| --- | --- | --- |
| Server state | `@tanstack/angular-query-experimental` | React Query |
| Client state | `@ngrx/signals` (`signalStore`) | Zustand |
| Forms | Angular Signal Forms (`@angular/forms/signals`) | React Hook Form |
| Validation | Zod 4 through `validateStandardSchema` | Zod |
| Styling | Tailwind CSS 4 with tokens in `src/styles.css` | Tailwind CSS 4 |
| Permissions | `AuthStore.can()` / `canInOrganization()` | CASL |

## Layout

```txt
frontend/src/
  app/
    core/                       app-wide singletons, imported, never duplicated
      api/api.ts                API_URL (from environment), Page<T>, ProblemDetail, toProblem()
      auth/                     AuthStore (with session scope), SessionService, authInterceptor, requirePermission / requireBackoffice guards, grants()
      query/query-client.ts     QueryClient defaults
    shared/                     reusable, no business knowledge
      ui/                       Button, Card, Badge, Spinner, FormField, Icon (Lucide), Logo, FileButton, Select, chips, MultiSelectChip,
                                Modal, Drawer, ConfirmDialog (overlay.ts: scroll lock + Escape), Stepper + StepRecap,
                                FilterToolbar (search + Filtres + Trier + Réinitialiser), DropZone (drag & drop uploads),
                                SearchSelect (one choice with a search field), ExportButton (CSV download with busy/error state) (+ index.ts barrel)
      ui/map.ts                 AppMap: Leaflet map of Tunisia (pins, "me" dot, pin picker); not in the barrel to keep Leaflet lazy
      utils/                    cn(), formatMoney(), formatNumber(), formatDistance(), csv.ts (toCsv with BOM + formula guard, fetchAllPages, downloadCsv)
    features/                   one folder per backend module the UI talks to
      catalog/                  reference feature: copy this one (catalog.icons.ts: icons an admin can give a service)
        catalog.api.ts          HttpClient calls, one method per endpoint, returns Promises
        catalog.queries.ts      query keys + injectXxxQuery / injectXxxMutation
        catalog.schema.ts       Zod schemas for forms (mirror backend validation)
        catalog.types.ts        API types
        catalog.permissions.ts  permission constants used by guards and templates
        catalog-filters.store.ts  client-only state for a screen (signalStore, provided by the page)
        components/             feature components (forms, cards, tables)
      auth/                     login/register/new-password forms, password reset and e-mail confirmation mutations
      account/                  signed-in user's account: profile, password, e-mail, sessions, deactivate, verification banner
      users/                    backoffice user management (admin only): user-create-form (account + invitation e-mail)
      roles/                    backoffice roles (toutestcasa "Rôles & permissions"): roles.types.ts (PERMISSION_CATALOG, wildcard toggle), permission-matrix (compares with the other roles), role-card, delete-role-dialog (reassign members), assign-roles-dialog (user page)
      vehicles/                 my vehicles: api, queries, schema, vehicle-form (with plate and VIN), vehicle-card
      organizations/            organizations, members, admin approval: organization-application (6-step application with photos), organization-form (edit; mode "admin" picks the owner), booking-schedule-form (opening hours + slot length and capacity), organization-files-panel, members-panel (`admin` manages any team), status badge
      admin-overview/           admin dashboard figures, each query gated by the section permission
      providers/                provider offer + public search: provider-services-panel, provider-service-form, provider-card
      helpdesk/                 support tickets for customers and agents: ticket-thread, new-ticket-form
      api-keys/                 backoffice partner API keys
      diagnostic/               client wizard + backoffice editor: diagnostic-result-card, symptom/question/rule forms
      service-requests/         client requests, provider board and backoffice oversight (admin queries, CSV export): service-request-form (time slots), provider-requests-panel (quotes, chat drawer), request-timeline, request-calendar (agenda), request-chat (polled every 15 s), request-insights (SVG charts of the pro dashboard)
      reviews/                  ratings and reviews: star-rating, review-form, review-card (with the garage reply)
      audit/                    backoffice audit trail: audit-trail (who did what to a user, organization or service)
      maintenance/              vehicle history and planned maintenance: maintenance-timeline, maintenance-record-form, maintenance-reminders
      notifications/            bell, live unread count (notification-stream.ts reads the SSE stream with fetch)
    layouts/                    route shells
      public-layout.ts          client area: client/site-header, site-footer, client-bottom-nav, account-menu
      client/account-layout.ts  "Mon compte" frame inside the client area: sidebar card (desktop) or pills (phone) around account, vehicles, requests, pro space, support
      auth-layout.ts            login, register, password and staff sign-in: brand panel + form (route data "brand")
      backoffice/backoffice-shell.ts  shared backoffice frame: sidebar/drawer (bottomItems pinned low), top bar with search and profile menu, mobile tabs
      backoffice/admin-page-header.ts  white page band: breadcrumbs, title, subtitle, actions; feeds the phone title via backoffice-chrome.ts
      admin-layout.ts           admin backoffice on the shell (dark tone), menu from admin-nav.ts filtered by permission
      pro-layout.ts             professional backoffice on the shell (petrol tone), /pro/:organizationId, org switcher
      pro/pro-context.ts        the organization the pro area shows, provided by ProLayout and read by its pages
      admin-home.guard.ts       /admin opens the first section the user may use
      route-data.ts             injectRouteData(): merged data of the active routes, read by the layouts
      (client-layout.ts, provider-layout.ts when those areas start)
    pages/                      route entry components, thin: compose features
      public/                   home, provider search, provider profile, auth pages (+ onboarding, the welcome flow after sign-up)
      client/                   my vehicles, diagnostic, my requests, history, my organizations + organizations/new (application)
      provider/                 pro backoffice pages: pro-dashboard (activity charts), pro-requests, pro-calendar (agenda), pro-services, pro-history, pro-reviews, pro-profile (profile, hours and slots, files), pro-team
      client/support/           my support tickets
      admin/                    backoffice: login, dashboard, catalog, organizations (list, create, new for any staff with organization:create, detail), requests, users (list, create, detail), roles (grid, detail/edit/new), profile ("Mon profil" inside the backoffice session), helpdesk, API keys, diagnostic rules
      errors/                   not-found, forbidden
    store/                      global client state only: ui.store.ts (theme), location.store.ts (search position, radius)
    app.config.ts  app.routes.ts  app.ts
  (frontend/public)             brand/ (logos), icons/ (PWA), illustrations/, covers/ (Unsplash WebP photos of the auth panels and home hero, CREDITS.md), favicon.*, og-image.png, manifest.webmanifest
  styles.css                    Tailwind import + design tokens (see DESIGN-TOKENS.md)
```

## Configuration

- `src/environments/environment.ts` (production) and `environment.development.ts` (`ng serve`, swapped by `fileReplacements`). Only public values: the file ships to the browser. Never put secrets there.
- `apiUrl` is `/api` everywhere: in dev `proxy.conf.mjs` forwards it to `API_PROXY_TARGET` (default `http://localhost:8080`), in prod nginx serves the API on the same origin, so the refresh cookie stays first-party and no CORS is needed.
- `shared/types/` holds API types used by several features (`StoredFile`); `shared/ui/file-button.ts` opens the file picker.

## Shells (adapted from toutestcasa)

| Area | Layout | Pattern |
| --- | --- | --- |
| Client | `public-layout` | Sticky header (logo, search pill with "Près de moi", bell, account menu) + nav row on desktop, petrol footer, bottom tab bar on mobile. `data: { fullBleed, hideFooter }` for the home and map pages. |
| Auth | `auth-layout` | Dark brand panel on the left from `lg`, form on the right. |
| Pro backoffice | `pro-layout` | `BackofficeShell` in petrol: sidebar with the organization switcher, menu filtered by the member's permissions, status banner. |
| Admin backoffice | `admin-layout` | `BackofficeShell` in graphite: same frame, menu filtered by platform permissions. |

## Rules

- `pages/*` only arranges features and layout. API calls, queries, schemas and business rules live in `features/*`.
- A feature may use another feature's public files (`*.queries.ts`, `*.types.ts`, `*.permissions.ts`), never its `components/` or `*.api.ts`. Pages may compose any features.
- Server data goes through TanStack Query only. Never copy it into a signal store.
- One signal store per concern. Screen-level stores are provided in the page (`providers: [XStore]`), global ones (`providedIn: 'root'`) only in `store/` or `core/`.
- Query keys come from a `<feature>Keys` object; mutations invalidate the feature's keys on success.
- Forms: Signal Forms + the feature's Zod schema. The submit button is disabled while the form is not dirty, invalid or saving, and the form is `reset()` with the saved value after success so it goes back to disabled.
- Permissions: guard routes with `requirePermission(...)` and hide actions with `@if (auth.can(...))`. Every `/admin` route uses `requireBackoffice(permission)`, which also needs a backoffice session. The backend still enforces everything.
- Components use `ChangeDetectionStrategy.OnPush`, `input()` / `output()` signals and the new control flow (`@if`, `@for`).
- Empty lists and dead ends use `<app-empty-state>` with one of the illustrations; never a bare "Aucun…" line.
- Overlays (toutestcasa): create forms beside a list in `<app-drawer>`, short forms and editors in `<app-modal>` (a bottom sheet on a phone), actions that are hard to undo (suspend, remove) behind `<app-confirm-dialog>`; never an inline "Confirmer / Annuler" pair.
- Long forms in steps (toutestcasa checkout): `<app-stepper>` on top, one step per card, `<app-step-recap>` with "Modifier" on the review step, a summary card beside it from `lg`.
- Several choices from a long list: `<app-multi-select-chip>` (chip + searchable dropdown), not a row of checkboxes.
- Backoffice lists start with `<app-filter-toolbar>` (toutestcasa FilterToolbar): the search waits for a pause in typing, filters are chip groups applied together, "Réinitialiser" shows only while the list is narrowed. Status tabs stay as chips above it.
- Uploads go through `<app-drop-zone>` (images as thumbnails, documents as rows); files picked before the owner exists are staged in the browser and sent after creation (organization application).
- Icons: `<svg appIcon name="…">` from `shared/ui/icon.ts`; add a Lucide icon to its `ICONS` map before using a new name. No other icon library.
- Maps: `AppMap` only. Tiles come from `environment.mapTiles` (OpenStreetMap in dev; a keyed provider in production). Marker labels are escaped by AppMap; never build pin HTML elsewhere.
- The visitor's position lives in `LocationStore` (this browser only). Send it to the API as search parameters, never put it in a URL.
- Imports use the path aliases `@core/*`, `@shared/*`, `@features/*`, `@layouts/*`, `@store/*`.
- File names: `kebab-case.ts`, one component per file, pages end in `.page.ts`, stores in `.store.ts`.
