# Roadmap

Task list from the current scaffold to V1, then V2. Each task is small enough for one branch / one PR. IDs are referenced from [`STACK.md`](STACK.md). Business rules for every task are in [`MODULES.md`](MODULES.md).

Order matters only where "Needs" says so; tasks without a dependency can run in parallel.

## Done (scaffold)

- [x] Spring Boot 4.1 / Java 25 project, Spring Modulith with `ModularityTests`
- [x] `shared`: config properties, Redis cache, JPA auditing, OpenAPI, problem-detail errors, JWT resource server, `@perm` platform permission check, MinIO/S3 storage client (creates the bucket in dev)
- [x] Facade contracts (`api` packages) for every V1 module, empty facades for V2 modules
- [x] `catalog` module fully implemented as the reference (entity, Flyway migration + seed, repository, MapStruct, cached facade, public + admin endpoints)
- [x] Docker Compose dev stack (Postgres 18, Redis 8.6, MinIO, Mailpit, API profile), backend Dockerfile
- [x] Angular 22 app: Tailwind 4 tokens "Petrol & Signal" (light + dark), TanStack Query, NgRx Signals, Signal Forms + Zod, ESLint, `/api` dev proxy
- [x] Frontend reference feature `catalog` (home page list, admin catalog page with create/edit form)
- [x] NestJS-style module folders (`api/ controller/ dto/ entity/ repository/ mapper/ service/ config/`)
- [x] CLAUDE.md, module/folder structure docs, design tokens doc

## V1 — Backend

### Auth

- [x] **B-AUTH-1 Register, login, roles in JWT.** `auth.users`, `auth.roles`, `auth.user_roles`, `USER`/`ADMIN` seeded by Flyway, dev admin seeded in the `dev` profile, `AuthFacade` implemented, covered by `AuthFlowTests`.
- [x] **B-AUTH-1b Login rate limit.** 5 wrong passwords per e-mail lock login for 15 min (Redis), `TOO_MANY_LOGIN_ATTEMPTS` with `retryAfter`.
- [x] **B-AUTH-2 Email verification and password reset.** `auth.auth_tokens` (hashed, single use, LINK or 6-digit OTP with 5 tries). Verification link sent at sign-up, `POST /me/email-verification/send|confirm-otp`, `POST /auth/email-verification/confirm`, `POST /auth/password-reset/request|confirm|confirm-otp` (same answer for unknown e-mails, signs out every device). 30 s send cooldown per user (`SEND_COOLDOWN` + `retryAfter`).
- [x] **B-AUTH-3 Refresh tokens.** Hashed `auth.refresh_tokens`, httpOnly `SameSite=Strict` cookie, rotation on `POST /auth/refresh`, reuse revokes every session, `POST /auth/logout`.
- [x] **B-AUTH-3b Sessions.** `sid` claim in the access token; `GET /me/sessions` (device, IP, started, last active, current), `DELETE /me/sessions/{id}`, `DELETE /me/sessions` (others), `POST /me/logout-all`. 10 s rotation grace so two tabs refreshing together are not treated as theft. New-device login alert e-mail.
- [ ] **B-AUTH-3c Instant revoke.** Deny-list revoked `sid`s in Redis so a revoked session's access token stops before it expires.
- [x] **B-AUTH-6 Account.** `PATCH /me` (name, phone), `POST /me/password` (keeps this session, signs out the others, notice e-mail), `POST /me/email-change` + `POST /auth/email-change/confirm` (link to the new address), `POST /me/deactivate`.
- [x] **B-AUTH-7 Admin users.** `GET /admin/users?q`, `POST /admin/users/{id}/suspend|unsuspend` (revokes sessions), `PUT /admin/users/{id}/roles`, `GET /admin/users/roles`; an admin cannot lock themself out.
- [x] **B-AUTH-9 Login scopes.** Customer and backoffice sessions (`scope` on login and refresh, `roles.backoffice`, `SUPPORT` role, 12 h backoffice refresh, separate cookie), `/auth/c` (cookie) and `/auth/h` (body, mobile) transports. Covered by `LoginScopesTests`.
- [x] **B-AUTH-5 OAuth.** Google, Facebook, GitHub by redirect; Google and Apple ID tokens for mobile; link/unlink from `/me/oauth`, accounts without a password. Covered by `OAuthFlowTests`.
- [x] **B-AUTH-10 SMS and Telegram.** Phone verification by SMS (`shared/sms`, Twilio or log), `telegram` module (deep-link linking, polling or webhook), password reset by SMS or Telegram code. Covered by `MessagingChannelsTests`.
- [x] **B-AUTH-8 Avatar.** Upload through `file`. Needs B-FILE-1.

### Organization

- [x] **B-ORG-1 Organizations.** Create (creator becomes owner, status `PENDING`), my organizations, read/update with `@orgPerm`, governorate validated against the 24 governorates. Admin: list by status, approve (publishes `OrganizationApproved`), suspend.
- [x] **B-ORG-2 Members and `@orgPerm`.** Members with `role_key` + JSON permissions copied from `MemberRoleKey`, add existing user by email, change role / permissions (`CUSTOM`) / status, remove. `@orgPerm` backed by a Redis cache evicted on every change. Last-manager and role/type rules enforced. Covered by `OrganizationFlowTests`.
- [ ] **B-ORG-3 Invitations.** Email invitation with hashed token, accept (creates member, account may be created on the way), revoke, expire. Needs B-ORG-2, B-MAIL-1.

### Core domain

- [x] **B-FILE-1 Files.** `file.files` table, `FileFacade` (upload with type/size checks, list by owner, delete, signed URL). Upload endpoint per owner type checks ownership through the owner's facade.
- [x] **B-VEH-1 Vehicles.** CRUD on own vehicles (`/vehicles`), 404 on someone else's vehicle, mileage can only increase (`PATCH /vehicles/{id}/mileage`), `FuelType` enum, `VehicleFacade` implemented, covered by `VehicleFlowTests`.
- [x] **B-VEH-2 Vehicle photos.** Upload/list/delete photos through `FileFacade` (`ownerType = VEHICLE`). Needs B-FILE-1.
- [x] **B-PROV-1 Provider services.** `provider.provider_services` (`atHome`, `indicativePrice NUMERIC(12,3)` nullable = on quote, `currency`), managed under `/organizations/{organizationId}/services` with `service:read` / `service:manage`, only for `PROVIDER` organizations and active catalog services. `ProviderFacade` implemented.
- [x] **B-PROV-2 Provider search.** `provider.provider_profiles` read model synced from `OrganizationProfileChanged` (async `@ApplicationModuleListener`), accent-free prefix full-text search (`tsvector` + GIN) over name, city, zone, description and offered service names, filters `serviceId`, `governorate`, `atHome`, paged. `GET /providers/{organizationId}` public profile. Covered by `ProviderFlowTests`.
- [ ] **B-PROV-3 Search ranking and city filter.** Order by relevance (`ts_rank`) then rating (needs B-REV-1); optional city filter.
- [x] **B-DIAG-1 Diagnostic admin.** Symptoms, ordered questions, rules (JSON conditions, priority, suggested service), cached in Redis. Admin CRUD.
- [x] **B-DIAG-2 Run a diagnostic.** `POST /diagnostics` evaluates answers against rules (highest priority wins), stores the run, returns cause + recommendation + suggested service. Unit-test the rule engine. Needs B-DIAG-1, B-VEH-1.
- [x] **B-REQ-1 Service requests.** Create (checks vehicle ownership, service offered by the org, `atHome` matches location type), list mine, list for an org, detail. Publishes `ServiceRequestCreated`. Needs B-VEH-1, B-PROV-1.
- [x] **B-REQ-2 Status workflow.** Accept/reject (reason required), start, complete, client cancel, each guarded by the permission in MODULES.md and writing `service_request_status_history`. Publishes `ServiceRequestStatusChanged` / `ServiceRequestCompleted`. Implement transitions as a small state machine with unit tests. Needs B-REQ-1, B-ORG-2.
- [x] **B-MAINT-1 Maintenance history.** Listener on `ServiceRequestCompleted` creates the record with current mileage; `GET /vehicles/{id}/history`; provider can fill result/recommendations. Needs B-REQ-2.

### Cross-cutting

- [x] **B-CONF-1 Configuration.** One `.env` for Compose and Spring (`spring.config.import`), `application-{dev,prod,test}.yaml`, one validated `@ConfigurationProperties` record per concern; Angular `environment.ts` files and `proxy.conf.mjs` (`API_PROXY_TARGET`).

- [x] **B-MAIL-1 Email.** `shared/mail`: `MailService` sends after commit on a virtual thread. Thymeleaf layout + fragments ported from the NestJS template (header, card with badge and eyebrow, button, ghost button, code block, note, footer). Templates: verify-email, reset-password, change-email, email-changed, password-changed, new-device-login, welcome. Mailpit in dev and tests; `MailTemplatesTests` renders all of them in fr and en.
- [x] **B-I18N-1 Languages.** French (default) and English message bundles for e-mails and API errors, `Accept-Language` resolution, `users.locale` chosen at sign-up and editable on `/account`.
- [ ] **B-I18N-2 Arabic.** `messages_ar.properties` and right-to-left e-mail layout (`dir="rtl"`).
- [ ] **F-I18N-1 Web app languages.** Translate the Angular UI (fr/en, later ar) and follow the user's locale.
- [x] **B-HELP-1 Helpdesk.** Tickets for customers and organizations, agent workspace (queue, pick, assign, internal notes, status, escalation), SLA policies and monitor, reply/resolved e-mails. Covered by `HelpdeskFlowTests`.
- [x] **B-API-1 Partner API keys.** `apiaccess` module, hashed keys with rotation, IP allowlist, rate limit, daily usage, `/external/v1` (status, catalog, providers). Covered by `ApiKeyFlowTests`.
- [x] **B-NOTIF-1 In-app notifications.** Tables, `NotificationFacade`, listeners for `OrganizationApproved`, `ServiceRequestCreated` (members with `request:read`), `ServiceRequestStatusChanged`, `ServiceRequestCompleted`. List, unread count, mark read/dismiss. Needs B-ORG-2, B-REQ-2.
- [x] **B-NOTIF-2 Live notifications.** SSE endpoint (`SseEmitter`) pushing new notifications; Redis pub/sub so it works with several API instances. Needs B-NOTIF-1.
- [ ] **B-OPS-1 Ops.** Structured JSON logs in prod, health indicators for MinIO and SMTP, `prod` profile hardening (no Swagger, secure cookies, strict CORS).
- [x] **B-TEST-1 Test base.** Shared Testcontainers config (Postgres + Redis), `@ApplicationModuleTest` per module, a JWT helper for MockMvc tests.

## V1 — Frontend

- [x] **F-AUTH-1 Auth screens and session.** Login and register pages, access token in `AuthStore` (memory), session restored from the cookie on start, refresh + replay on 401 with a single in-flight refresh, logout, `requireAuth` / `requirePermission` / `requireGuest` guards.
- [x] **F-AUTH-2 Account.** `/forgot-password`, `/reset-password`, `/verify-email`, `/confirm-email-change`, unverified-e-mail banner with resend, `/account` (profile, password, e-mail, devices, deactivate), "Mot de passe oublié ?" on login, French messages with retry delay.
- [x] **F-AUTH-3 Scopes and OAuth.** `/admin/login` (backoffice session, `requireBackoffice()` per admin route), OAuth buttons and `/oauth/callback`, forgot password by e-mail code or SMS code (link and Telegram stay API-only), "Mon compte" sidebar layout, account panels for linked accounts, phone verification and Telegram.
- [x] **F-HELP-1 Support.** `/support` (my tickets, new ticket) and `/support/:publicId` (thread, reply, close, reopen); backoffice `/admin/helpdesk` (stats, filters, SLA policies) and ticket page (internal notes, pick/release, status, priority, escalate, history).
- [x] **F-API-1 API keys admin.** `/admin/api-keys`: create (key shown once), rotate, disable, revoke, usage.
- [x] **F-SHELL-1 Layouts.** toutestcasa patterns: client header/footer/bottom tabs, split auth layout, shared backoffice shell for admin (graphite) and the new professional backoffice `/pro/:organizationId` (dashboard, requests, services, interventions, profile with map, team), logo and favicon.
- [x] **F-GEO-1 Map and proximity.** Leaflet map of Tunisia on the home, the search (list + map, Uber-like) and the provider profile; "near me" from the browser or a governorate, radius, distance on each result; organizations place themselves on the map. Backend: coordinates, nearest-first search (B-PROV-3 partly: distance ranking).
- [ ] **F-GEO-2 Production tiles.** Pick a tile provider with an account (MapTiler, Stadia) and set `environment.mapTiles`; consider marker clustering when providers grow.
- [ ] **F-SHELL-2 Account area.** Account sidebar like toutestcasa "Mon compte" (profile, vehicles, requests, support in one shell). `client-layout` and `provider-layout` (organization switcher setting `X-Organization-Id` and org permissions), responsive nav, user menu, theme toggle. Needs F-AUTH-1.
- [ ] **F-UI-1 Shared UI.** Dialog (Angular CDK), select, textarea, table + pagination, empty state, toast. Follow DESIGN-TOKENS.
- [x] **F-VEH-1 My vehicles.** `/vehicles` page: list, add/edit form (Signal Forms + Zod, dirty-state save button), delete with confirmation, empty state.
- [x] **F-VEH-2 Vehicle photos and detail page.** Needs B-VEH-2.
- [x] **F-DIAG-1 Diagnostic wizard.** Symptom -> questions one by one -> result -> "find a provider for this service". Needs B-DIAG-2.
- [x] **F-PROV-1 Provider search and profile.** `/providers` (filters in the URL: text, service, governorate, at home; pagination), `/providers/:organizationId` profile with services, prices and contact; home page links into the search; workspace **Services** tab to manage the offer.
- [x] **F-REQ-1 Client requests.** Create request from a provider/service, list, detail with status timeline, cancel. Needs B-REQ-2.
- [x] **F-ORG-1 Organizations UI.** My organizations + create, workspace `/organizations/:id` (profile form, team panel with role/status/remove), admin approval queue `/admin/organizations`.
- [x] **F-REQ-2 Provider workspace.** Incoming requests board by status, accept/reject/start/complete per permission, services management, members and invitations. Needs B-REQ-2, B-ORG-3.
- [x] **F-MAINT-1 Vehicle history.** Timeline per vehicle. Needs B-MAINT-1.
- [x] **F-NOTIF-1 Notifications.** Bell with unread count, list, SSE live updates. Needs B-NOTIF-2.
- [x] **F-ADMIN-1 Backoffice.** Catalog, organization approval queue with documents, users, helpdesk, API keys, diagnostic rules editor; menu filtered by permission.

## V1 — DevOps

- [ ] **D-CI-1 GitHub Actions.** Backend: `./mvnw verify` (Testcontainers on the runner). Frontend: `npm ci`, `npm run lint`, `npm test`, `npm run build`. On every PR.
- [ ] **D-IMG-1 Images.** Frontend Dockerfile (build + nginx serving `dist`, proxy `/api`), push both images to GHCR on `main`.
- [ ] **D-PROD-1 Production compose.** `docker-compose.prod.yml` without defaults (required env vars), named volumes, healthchecks, nginx in front.

## V2

- [ ] **B-AUTH-4** TOTP 2FA for admins.
- [ ] **F-HELP-2** Organization tickets in the provider workspace; assign a ticket to a named agent from the UI.
- [ ] **B-MKT-1** Marketplace listings, categories, favorites, reports + moderation (`MODERATOR`). **B-MKT-2** Conversations/messages over WebSocket (STOMP), `ListingMessageSent`.
- [ ] **B-SUB-1** Plans and subscriptions, plan limits through `SubscriptionFacade` (cached).
- [ ] **B-BILL-1** Invoices on `SubscriptionRenewed`. **B-BILL-2** Payments with Flouci (Tunisia), webhook, `PaymentSucceeded/Failed`.
- [ ] **B-REV-1** Reviews after completed requests, average rating in provider search.
- [ ] **B-AUDIT-1** `audit` module + `@Audited` aspect on admin actions.
- [ ] Frontend screens for each of the above.

## Microservices (next semester)

1. Externalize events (Spring Modulith event externalization to RabbitMQ or Kafka).
2. Switch JWT to RS256 with a JWKS endpoint in `auth`.
3. Extract one module at a time (start with `notification` or `catalog`): move its package to a new Spring Boot app, give it its own database from its schema, and replace its `FacadeImpl` in the monolith with an HTTP client (Spring `@HttpExchange`) implementing the same facade interface.
4. Add an API gateway (Spring Cloud Gateway) in front once there are two services.
