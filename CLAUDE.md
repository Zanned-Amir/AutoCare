# CLAUDE.md

## Project

AutoCare TN is a platform where vehicle owners manage their vehicles, run a guided diagnostic, find garages and mobile services, and send service requests. Providers (garages, mobile services) handle those requests. A parts marketplace and paid plans come in V2. Student project (TEK-UP), planned to move to microservices next semester.

## Stack

- Backend: Java 25, Spring Boot 4.1, Spring Modulith 2.1 (modular monolith with facades), Spring Security (JWT resource server), Spring Data JPA (Hibernate 7), Flyway, PostgreSQL 18, Redis 8 (cache, permission lookups), MinIO/S3 (AWS SDK v2), springdoc OpenAPI, MapStruct, Lombok, Testcontainers
- Frontend: Angular 22 (standalone, zoneless, signals), TanStack Query (Angular), NgRx Signals (`signalStore`), Angular Signal Forms + Zod 4, Tailwind CSS 4, Vitest
- Infra: Docker Compose (Postgres, Redis, MinIO, Mailpit), GitHub Actions

## Reference docs

@docs/MODULES.md
@backend/MODULE-STRUCTURE.md
@frontend/FOLDER-STRUCTURE.md
@frontend/DESIGN-TOKENS.md
@docs/ROADMAP.md

## Rules

- Check `docs/MODULES.md` for business rules, entities, permissions and events before changing a module.
- Check `backend/MODULE-STRUCTURE.md` before creating, moving or refactoring backend files.
- Check `frontend/FOLDER-STRUCTURE.md` before creating, moving or refactoring frontend files.
- Check `frontend/DESIGN-TOKENS.md` before writing styles, variants or class names.
- Copy the `catalog` module (backend) and `features/catalog` (frontend) as the pattern for new work.
- Do not create new backend modules or new top-level frontend folders unless they are in the docs above.
- Reuse existing shared code (`shared/` in both apps) before creating new helpers or components.
- Prefer incremental changes over broad rewrites. List affected files before writing code.
- If asked to implement, edit or fix something, do it instead of only advising, unless a real blocker needs clarification. Ask only when the request is ambiguous.

## Backend rules

- Each module uses the NestJS-style folders `api/ controller/ dto/ entity/ repository/ mapper/ service/ config/` (see `backend/MODULE-STRUCTURE.md`).
- Modules talk only through another module's `api` package (facade, DTOs, events). Never import another module's `controller`, `service`, `entity`, `repository` or `dto`, never add a JPA relation across modules: store the ID.
- One PostgreSQL schema per module; each entity sets `@Table(schema = "<module>")`. New schemas must also be added to `spring.flyway.schemas`.
- Schema changes go in a new Flyway migration `db/migration/<module>/V<yyyyMMddHHmm>__<module>_<what>.sql`. Never edit an applied migration. `ddl-auto` stays `validate`.
- Name methods, endpoints, commands, DTOs and events as verb + entity (`createVehicle`, `updateVehicleMileage`, `ServiceRequestCompleted`), never just the verb.
- Facade methods are the module's public contract: keep them stable, return DTO records, never entities.
- Cross-module reactions that are not needed immediately use events (`@ApplicationModuleListener`), not facade calls.
- Protect endpoints with `@PreAuthorize` and the module's `*Permissions` constants. Platform permissions: `@perm.has(...)`. Organization permissions: `@orgPerm.has(#organizationId, ...)`. Ownership is checked in the facade implementation.
- `/admin/**` needs a backoffice session (`SESSION_BACKOFFICE`); `/external/**` is for partner API keys only and must call facades, never another module's internals.
- Send texts through `shared/sms` (`SmsService`) and Telegram through `TelegramFacade`; never call Twilio or the Bot API elsewhere.
- Configuration: one `@ConfigurationProperties` record per concern, `@Validated`, in the package that uses it (`shared/*` or the module's `config/`); never a single global properties class. Every new key gets a `${ENV_VAR:default}` in `application.yaml`, a line in `.env.example`, and no default in `application-prod.yaml` when it is a secret.
- Lists use `Pageable` and return `PagedModel<T>`; only small bounded lists may return `List<T>`.
- Errors: throw `AppException` with an `ErrorCode`; add a code when the client must explain a refusal. Never return raw exception messages.
- Money: `BigDecimal` + `NUMERIC(12,3)` + a currency column (TND has 3 decimals). Never `double`/`float`.
- Use constructor injection (`@RequiredArgsConstructor`), records for DTOs/commands/requests, entities with factories and intention-revealing methods instead of public setters.
- Keep `ModularityTests` green; never weaken it.
- User-facing text (e-mails, API error details) comes from `i18n/messages.properties` (French) and `messages_en.properties` (English); add every key to both. E-mails are Thymeleaf templates in `templates/mail/` built on `layout.html` + `fragments.html`, with inline styles; add each new one to `MailTemplatesTests`.

## Frontend rules

- `pages/*` compose routes; `features/*` own API calls, queries, schemas, stores and feature components.
- Server data always goes through TanStack Query (`features/<x>/<x>.queries.ts`); never duplicate it into a signal store.
- Client-only state uses `signalStore` from `@ngrx/signals`: one store per concern, screen stores provided in the page, global ones in `store/`.
- Forms use Signal Forms with the feature's Zod schema (`validateStandardSchema`). Disable the submit button while the form is not dirty, invalid or saving, and `reset()` the form with the saved value after success so the button goes back to disabled.
- Use `AuthStore.can()` / `canInOrganization()` and `requirePermission()` for permission-based UI; every `/admin` route uses `requireBackoffice(permission)` and new backoffice sections go in `layouts/admin-nav.ts`. The backend still enforces every rule.
- Components: standalone, `OnPush`, `input()`/`output()`, built-in control flow (`@if`, `@for`), path aliases (`@core`, `@shared`, `@features`, `@layouts`, `@store`).
- Show request errors with `problemMessage(error, fallback)` from `@core/api/api`, never the raw server text. When the backend gets a new `ErrorCode`, add its French message there.
- Money is displayed with `formatMoney()` from API strings; never do arithmetic on money in the browser.
- UI text is French by default.
- Front-end configuration goes in `src/environments/` (public values only); the API is always `/api` (dev proxy in `proxy.conf.mjs`).
- Layouts follow the toutestcasa shells (see `frontend/FOLDER-STRUCTURE.md`): client pages go under `public-layout`, auth screens under `auth-layout`, backoffice pages use `BackofficeShell` through `admin-layout` or `pro-layout` and set `data.heading`.
- Icons only through `<svg appIcon>` (Lucide); maps only through `AppMap`; the visitor's position only in `LocationStore`, never in URLs.

## Design

- Use the "Petrol & Signal" tokens from `frontend/DESIGN-TOKENS.md`; no hard-coded colors, spacing or fonts.
- When Figma MCP is available and a design exists, inspect it before building UI. Without a design, follow existing components and tokens; do not invent new patterns, variants or spacing.

## Code comments

- Do not add a comment for every change.
- Only comment what the code cannot say (a business rule, a workaround, a tricky edge case). One line when possible.

## Commands

Run backend commands from `backend/`, frontend commands from `frontend/`, Compose from the repo root.

### Infrastructure

- `docker compose -f docker-compose.dev.yml up -d` (Postgres, Redis, MinIO, Mailpit)
- `docker compose -f docker-compose.dev.yml --profile app up -d --build` (also the API container)
- `docker compose -f docker-compose.dev.yml down`

### Backend (needs JDK 25)

- `./mvnw spring-boot:run`
- `./mvnw test`
- `./mvnw verify` (format check + all tests, Testcontainers needs Docker)
- `./mvnw spring-javaformat:apply` (format before committing; `validate` fails on unformatted code)
- `./mvnw -Dtest=ModularityTests test`

### Frontend

- `npm start` (dev server on :4200, proxies `/api` to :8080)
- `npm run build`
- `npm test`
- `npm run lint`

## URLs (dev)

- API http://localhost:8080/api, Swagger UI http://localhost:8080/api/docs
- Web http://localhost:4200
- Mailpit http://localhost:8025, MinIO console http://localhost:9001

## Working style

- Start by identifying the impacted modules, endpoints, pages and files.
- Use npm only, and only the existing `package.json` scripts and Maven wrapper.
- After backend changes run `ModularityTests` and the affected tests; after frontend changes run `npm run build` and `npm run lint`.
