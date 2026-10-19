# Design tokens — "Petrol & Signal"

AutoCare is about cars and trust: someone hands their vehicle to a garage. The palette says **reliable workshop**, not **shop**:

- **Petrol** (deep teal) is the brand: calm, technical, trustworthy. Headings, links, primary actions.
- **Signal** (amber, like a dashboard warning light or a road sign) is the call to action: "Demander un service", "Lancer un diagnostic". Always with dark text on it.
- **Graphite** neutrals (cool greys) for UI chrome, like brushed metal and asphalt.

It is deliberately different from toutestcasa (navy + orange, warm cream surfaces).

All tokens live in [`src/styles.css`](src/styles.css) (`@theme`). Dark mode redefines the semantic tokens under `.dark`.

## Fonts

| Class | Font | Source |
| --- | --- | --- |
| `font-sans` | Inter Variable | `@fontsource-variable/inter` |
| `font-heading` | Instrument Sans 400/600/700 | `src/assets/fonts/instrument-sans/*.ttf` (`@font-face` in styles.css) |

Same type pairing as toutestcasa: a friendly grotesque for headings and buttons, Inter for reading.

## Typography scale

Each class sets font family, size, line height, letter spacing and weight. Do not add `font-*` or `leading-*` on top.

| Class | Size | Weight | Font | Use |
| --- | --- | --- | --- | --- |
| `text-display` | 40–64px (fluid) | 700 | Instrument Sans | Hero headline |
| `text-h1` | 36–48px (fluid) | 700 | Instrument Sans | Page title |
| `text-h2` | 28–36px (fluid) | 700 | Instrument Sans | Section / admin page title |
| `text-h3` | 28px | 600 | Instrument Sans | Subsection |
| `text-h4` | 22px | 600 | Instrument Sans | Card title |
| `text-stat` | 28px | 700 | Instrument Sans, tabular | Dashboard numbers (requests today, mileage) |
| `text-price` | 18px | 700 | Instrument Sans, tabular | Indicative price |
| `text-body-lg` | 18px | 400 | Inter | Intro paragraph |
| `text-body` | 16px | 400 | Inter | Default text |
| `text-body-sm` | 14px | 400 | Inter | Secondary text, table cells |
| `text-button` | 15px | 600 | Inter | Button label |
| `text-label` | 14px | 600 | Inter | Form label, list item title |
| `text-overline` | 12px | 600, uppercase | Inter | Eyebrow / small tag |
| `text-caption` | 12px | 400 | Inter | Hints, footnotes, errors |
| `text-plate` | 14px | 600, mono | Monospace, tabular | Licence plate, VIN, mileage |

## Semantic colors

Use these in components. They switch automatically in dark mode.

| Token | Classes | Light | Purpose |
| --- | --- | --- | --- |
| `background` | `bg-background` | #ffffff | Page background |
| `background-subtle` | `bg-background-subtle` | #f6f8f9 | Admin page background, zebra areas |
| `surface` | `bg-surface` | #ffffff | Cards, inputs, popovers |
| `surface-muted` | `bg-surface-muted` | #eceff1 | Hover rows, neutral badges |
| `background-inverse` | `bg-background-inverse` | #141a1e | Admin sidebar, dark bands |
| `foreground` | `text-foreground` | #141a1e | Main text |
| `foreground-secondary` | `text-foreground-secondary` | #4f5a61 | Secondary text (7.1:1) |
| `foreground-muted` | `text-foreground-muted` | #5f6b73 | Placeholders, metadata (5.5:1) |
| `foreground-inverse` | `text-foreground-inverse` | #ffffff | Text on `background-inverse` |
| `primary` | `bg-primary`, `text-primary`, `border-primary` | #0b6e79 | Brand, primary buttons, page titles (6.0:1) |
| `primary-hover` | `hover:bg-primary-hover` | #0a5862 | Primary hover |
| `primary-foreground` | `text-primary-foreground` | #ffffff | Text on primary |
| `primary-subtle` | `bg-primary-subtle` | #ebf7f8 | Selected rows, info panels |
| `accent` | `bg-accent` | #ffb020 | CTA fill only |
| `accent-hover` | `hover:bg-accent-hover` | #e09200 | CTA hover |
| `accent-foreground` | `text-accent-foreground` | #141a1e | Text on accent (9.6:1) |
| `accent-text` | `text-accent-text` | #8a5a00 | Amber **text** on light backgrounds (5.9:1) |
| `border` | `border-border` | #c4ccd1 | Inputs and controls |
| `border-strong` | `border-border-strong` | #8a959c | Emphasis |
| `border-subtle` | `border-border-subtle`, `divide-border-subtle` | #dde2e5 | Card outlines, row dividers |
| `ring` | `outline-ring` | #12838f | Focus ring |
| `success` / `success-subtle` | `text-success`, `bg-success-subtle` | #15803d | Completed, confirmed |
| `error` / `error-subtle` | `text-error`, `bg-error-subtle` | #c62828 | Rejected, failed, validation |
| `warning` / `warning-subtle` | `text-warning`, `bg-warning-subtle` | #c2410c | Maintenance due, pending approval |
| `info` / `info-subtle` | `text-info`, `bg-info-subtle` | #1d4ed8 | In progress, informational |

## Request status colors

The service request workflow is the heart of the app; keep its colors consistent everywhere (badges, timeline, notifications).

| Status | Badge tone |
| --- | --- |
| `PENDING` | `warning` |
| `CONFIRMED` | `primary` |
| `IN_PROGRESS` | `info` |
| `COMPLETED` | `success` |
| `REJECTED` | `error` |
| `CANCELLED` | `neutral` |

## Raw palettes

`petrol-50…900`, `signal-50…900`, `graphite-50…950`. Use them only for one-off accents, charts and illustrations, never instead of a semantic token.

## Radius and shadow

`rounded-control` (8px) for buttons and inputs, `rounded-card` (12px) for cards, `shadow-card` for raised cards.

## Example

```html
<section class="bg-background text-foreground">
  <span class="text-overline text-accent-text">Entretien auto en Tunisie</span>
  <h1 class="text-display text-primary">Votre voiture, entre de bonnes mains.</h1>
  <p class="text-body-lg text-foreground-secondary">Diagnostic guidé et garages vérifiés.</p>
  <button appButton variant="accent" size="lg">Lancer un diagnostic</button>

  <app-card>
    <app-badge tone="success">Terminé</app-badge>
    <h3 class="text-h4">Vidange + filtre</h3>
    <p class="text-plate text-foreground-secondary">123 TU 4567 · 84 500 km</p>
    <span class="text-price text-primary">{{ formatMoney('85.000') }}</span>
  </app-card>
</section>
```

## Components (UI theme from toutestcasa, our palette)

| Element | Look |
| --- | --- |
| Buttons (`appButton`) | Pills (`rounded-full`), `text-button` in Instrument Sans; primary and accent sit on a shadow tinted with their own colour; secondary = white with `border-border-strong` and petrol text; sizes sm 36px, md 44px, lg 52px |
| Fields (`inputClasses` = `.ac-field`) | 52px pill on `background-subtle`, no border until focus (`border-accent`), error `border-error`; textareas get a 20px radius. Utilities on the element still win (h-9, rounded-…) |
| Labels (`app-form-field`) | 13px medium `foreground-secondary`, red `*` when `required`, caption `hint` under the field |
| Cards (`app-card`) | 24px radius, `border-border-subtle`, soft raised shadow (`--shadow-card`), 24px padding |
| Alerts | `rounded-2xl border border-error bg-error-subtle` with medium `text-error` |
| Chips / filters | Pills with `border-border-strong`; selected = `bg-primary text-primary-foreground` |
| Dropdowns (`app-select` + `app-option`) | Never a native `<select>` (the OS draws its list): trigger like a field (`size="sm"` = 40px pill for filters), panel `rounded-2xl` with a raised shadow, chosen option in petrol with a check. Works with `[formField]` |
| Segmented (`app-segmented`) | Subtle track, chosen segment raised in white; for 2–4 exclusive filters |
| Multi-select chip (`app-multi-select-chip`) | Filter chip (selected when something is chosen: one name, or the count); 288px panel with a search pill (accent- and case-insensitive) and square check boxes, "Tout effacer" |
| Modal (`app-modal`) | Backdrop `background-inverse/40`; bottom sheet on a phone (22px top radius, handle), centred dialog from md (18px radius, sizes 400/520/640/760px); navy `text-h4` title + round close; footer stacked full width on a phone |
| Drawer (`app-drawer`) | 420px panel from the right (full width on a phone), `text-h4 text-primary` title, round `bg-background-subtle` close button, footer pinned under a `border-border-subtle` line |
| Confirm dialog (`app-confirm-dialog`) | Bare modal card: 44px icon chip (`warning` or `danger` subtle), `text-h4` title, one sentence, Annuler + action (danger or primary) |
| Filter toolbar (`app-filter-toolbar`) | 44–48px search pill (`border-border`, accent on focus), secondary "Filtres" button with an accent count badge; 380px popover (bottom sheet on a phone) of chip groups, uppercase overline labels, Réinitialiser + Appliquer; sort as a 40px `app-select`; ghost "Réinitialiser" |
| Drop zone (`app-drop-zone`) | 20px radius, 1.5px dashed `border-border-strong` on `background-subtle` (petrol while dragging), round icon, "parcourir" link; 80px rounded thumbnails with a dark remove dot, or file rows with a trash button |
| Stepper (`app-stepper`) | Desktop: 34px nodes (done = primary with a check, current = accent, next = outlined) joined by 2px lines; phone: "Étape n sur N" over an accent progress bar. `app-step-recap`: `bg-background-subtle` rounded-xl row with an amber "Modifier" |
| Search select (`app-search-select`) | One choice in a field-like 40px pill (icon + value + chevron); panel with a search pill and a check on the chosen row; for long lists such as services |
| Time slots (booking form) | 36px pills, free = `border-border-strong`, chosen = `bg-primary text-primary-foreground`, full = struck-through muted, plus a "Sans heure précise" pill |
| Chat (`app-request-chat`) | `bg-background-subtle` rounded-xl log; own messages right in `bg-primary` with a squared bottom-right corner, the other side left in white with `border-border-subtle`; caption with author and time; textarea + round send button |
| Charts (`app-request-insights`) | Inline SVG, no chart library: `fill-primary` (received) and `fill-accent` (completed) bars with 3px radius, `stroke-border-subtle` grid, 11px `fill-foreground-muted` labels; KPI tiles on `bg-background-subtle`, money in `text-price text-primary`; horizontal bars `h-2 rounded-full` for rankings |
| Reminders (`app-maintenance-reminders`) | Row with a 36px round clock chip (`bg-warning-subtle text-warning` when due), title + badge "Bientôt" (warning) or "En retard" (error), ghost "Fait" button and round icon buttons |
| Opening hours (`app-booking-schedule-form`) | One row per day inside a `border-border-subtle` rounded-xl list: checkbox + day, 128px time fields, accent-text "+ Ajouter une plage" link, "Comme la veille" shortcut |
| Export (`app-export-button`) | Secondary button with a download icon in the page header actions; "Export…" while busy |
| Auth screens | Dark brand panel (overline, two-line heading, short text) + white 440px card with a signal-50 logo tile, centred `text-h3` title, full-width primary button, round provider buttons |

## Brand and chrome

- Logo: `<app-logo>` (`variant="lockup" | "icon"`, `theme="white"` on dark surfaces). Drawn in toutestcasa's logo grammar with our palette: a petrol car body and wheels under a signal cabin drawn like a roof, two windows, a small "care" spark; wordmark "Auto" petrol + "Care" signal-600. The favicon is the mark on a signal-50 disc.
- Client header: `bg-surface/95` + backdrop blur, `border-border-subtle`; search pill `rounded-full bg-background-subtle`; active nav link = `text-primary` with a 2px petrol underline.
- Footer: `bg-primary`, links `text-petrol-100` → `hover:text-white`, bottom bar `bg-petrol-800`.
- Backoffice (admin and pro, toutestcasa BackofficeLayout): 248px `bg-primary` sidebar, active item `bg-background text-primary` with a 3px `bg-accent` bar; white top bar (h-16, 72px from md) with the search pill (Ctrl K jumps to a section), theme, bell (count pinned to its corner), avatar + name + profile menu. Each page starts with `<app-admin-page-header>` (breadcrumbs, `text-h3` title, subtitle, `actions`) and its content in `px-4 py-5 md:px-8 md:py-8`.
- Map pins (`.ac-pin` in styles.css): white pill with a petrol edge, active = petrol fill; dashed = approximate position (governorate centre); blue pulsing dot = the visitor.
- Chips (filters): `rounded-full border`; selected = `bg-foreground text-background` (Uber-like), distance badge the same.

## Assets (frontend/public)

All original artwork in the Petrol & Signal palette, no stock images.

| Path | Use |
| --- | --- |
| `brand/logo-lockup.svg`, `brand/logo-lockup-white.svg` | Full logo for documents, e-mails, partners (white = dark backgrounds) |
| `brand/logo-mark.svg`, `brand/logo-mark-white.svg` | Square mark (avatars, app stores, social profiles) |
| `favicon.svg`, `favicon.ico` (16/32/48) | Browser tab |
| `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png`, `icons/apple-touch-icon.png` | Home screen (`manifest.webmanifest`) |
| `og-image.png` (1200 x 630) | Link previews (WhatsApp, Facebook, LinkedIn, X) |
| `illustrations/*.svg` | `<app-empty-state image="…">` and marketing bands: hero-car, empty-vehicles, empty-requests, empty-search, diagnostic, pro-garage, support, not-found |

In the app, use `<app-logo>` (it follows the theme) rather than the files. The PNGs are renders of the SVG mark: when the mark changes, export it again at the sizes above (iOS and maskable icons on a petrol background, the others transparent). Illustrations are 400 x 300 with a soft petrol-50 backdrop; new ones keep that frame.

## Rules

- Reuse `shared/ui` components (`appButton` variants `primary | accent | secondary | ghost | danger`, `app-card`, `app-badge` tones, `app-form-field`) before writing new styles.
- One `accent` button per view: it is the main action. Everything else is `primary`, `secondary` or `ghost`.
- Amber text is always `text-accent-text`, never `text-accent` (the fill only reaches ~1.8:1 on white).
- Page titles are `text-primary`; body copy is `text-foreground`.
- Card outlines and row dividers use `border-border-subtle`; inputs use `border-border`.
- Plates, VINs, mileage and prices use the tabular classes (`text-plate`, `text-price`, `text-stat`) so digits line up.
- Every text/background pair you add must reach 4.5:1 (3:1 for 20px+ bold). The pairs above are already checked.
- Tailwind v4 syntax only (`@import 'tailwindcss'`, `@theme`, `@utility`). No `tailwind.config.js`.
