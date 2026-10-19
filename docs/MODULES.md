# AutoCare TN - Modules and Classes

Project documentation | TEK-UP University | Backend: Spring Boot modular monolith with facades | Version 3

Related files: [`diagrams/autocare_class_diagram.mermaid`](diagrams/autocare_class_diagram.mermaid) (class diagram source) and [`diagrams/autocare_class_diagram.html`](diagrams/autocare_class_diagram.html) (visual version, open in a browser).

---

## 1. Overview

AutoCare TN is a platform where vehicle owners manage their vehicles, run a guided diagnostic, find professionals and request services. Professionals (garages, mobile services such as Alo Vidange) present their services and handle requests. A marketplace for parts and accessories, and paid plans, are planned for the second phase.

The backend is a **modular monolith**: one deployable application split into business modules. Each module exposes a **facade**, so a module can later become a microservice by changing only the facade implementation.

### Architecture rules

1. One module is one business domain, with its own PostgreSQL schema.
2. Each module exposes a facade. Other modules use only the facade and its DTOs, never its entities or repositories.
3. No JPA relation between modules. A module stores the ID of another module's data (for example `vehicleId`) and asks that module's facade for details.
4. Modules communicate by events when the reaction is not needed immediately (for example, a completed request creates a history record).
5. Spring Modulith verifies these boundaries in a test, so the build fails if one is broken.

### Stack

Spring Boot 4.1 (Java 25), Spring Modulith 2.1, Spring Security with JWT, Spring Data JPA, Flyway, PostgreSQL, Redis (cache and permission lookups), MinIO or S3 (files), Angular 22 (frontend), Docker Compose and GitHub Actions (DevOps).

### Module list

| Module | Purpose | Phase |
|---|---|---|
| `auth` | Accounts, login, platform roles, account tokens | V1 |
| `organization` | Businesses (providers and sellers), members and their permissions | V1 |
| `file` | One generic reference table for all stored files | V1 |
| `vehicle` | Client vehicles | V1 |
| `catalog` | Catalog of automotive services | V1 |
| `provider` | Services offered by provider organizations | V1 |
| `diagnostic` | Guided diagnostic: symptoms, questions, rules | V1 |
| `servicerequest` | Requests sent to providers and their status workflow | V1 |
| `maintenance` | Vehicle maintenance history | V1 |
| `notification` | In-app notifications | V1 |
| `telegram` | Telegram bot: link an account, send codes and alerts | V1 |
| `helpdesk` | Support tickets, agent workspace, SLA | V1 |
| `apiaccess` | API keys for partners and the `/external/v1` API | V1 |
| `marketplace` | Listings of parts, accessories and vehicles, with messaging | V2 |
| `subscription` | Paid plans of the app, for users and organizations | V2 |
| `billing` | Invoices and payments | V2 |
| `review` | Ratings and comments on providers | V2 |
| `audit` | Log of important actions (fed by events) | V1 |
| `shared` | Common configuration, exceptions, storage client (not a business module) | V1 |
| `admin` | Not a separate package: each module has its own `Admin<Module>Controller` under `/admin/...` | V1 |

All V1 modules are implemented. The V2 modules are already in the class diagram and in the project structure; they contain only their facade interface, with no logic. `audit` started as V2 and now keeps the backoffice trail (section 17).

---

## 2. Roles and permissions

Permissions use the format `resource:action`. The wildcard `*` can replace the resource or the action, and `*:*` means everything. A permission `r:a` is granted by `r:a`, `r:*`, `*:a` or `*:*`.

### Platform roles (module `auth`)

Stored in the `Role` table and given to users through `UserRole`. They are loaded at login and put in the JWT.

| Role | Permissions | Phase |
|---|---|---|
| `USER` | `vehicle:*`, `diagnostic:use`, `request:create`, `request:read`, `request:cancel`, `review:create`, `subscription:manage`, `history:read`, `notification:read`, `organization:create`, `ticket:create`, `ticket:read` | V1 |
| `ADMIN` | `*:*` (backoffice) | V1 |
| `SUPPORT` | `ticket:*`, `user:read` (backoffice) | V1 |
| `MODERATOR` | `listing:moderate`, `user:read` | V2 |

A role marked `backoffice` lets its users open a backoffice session (see module `auth`).

Roles are managed in the backoffice ("Rôles & permissions", `/admin/roles`): `role:read` lists them with their member count, `role:manage` creates (`name` in UPPER_SNAKE, fixed once created, `label`, `description`, `permissions`, `backoffice`), edits and deletes them. Seeded roles (`USER`, `ADMIN`, `SUPPORT`) are `system`: never deleted or renamed; `ADMIN` keeps `*:*` and backoffice access, `USER` never gets backoffice access (`ROLE_SYSTEM_LOCKED`). Deleting a role that people hold needs a `replacementRoleId`; they receive it instead (`ROLE_IN_USE` otherwise). Changes reach a user's token at their next refresh (15 min at most). Each change publishes `RoleChanged` (audit `ROLE_CREATED|UPDATED|DELETED`, target `ROLE`). `PUT /admin/users/{id}/roles` assigns them; the backoffice user page picks them from this list.

A backoffice session carries the permissions of all the person's roles, `USER` included, so any staff member has `organization:create`: `POST /admin/organizations` only needs it (often with their own e-mail as owner), while `approve: true` and every other `/admin/organizations` endpoint need `organization:approve`.

Every registered person is a `USER`. A person becomes a provider or a seller by creating or joining an organization, not through a platform role. Permissions on "own" data (for example `vehicle:*`) are enforced in code by checking ownership.

### Organization roles (module `organization`)

Stored in the member itself: `OrganizationMember.roleKey` and `OrganizationMember.permissions` (JSON). The role templates live in code (`MemberRoleKey`), not in a table. Adding a member copies the template permissions. Editing them sets `roleKey = CUSTOM`.

| Role | Organization type | Permissions |
|---|---|---|
| `PROVIDER_OWNER` | PROVIDER | `*:*` |
| `PROVIDER_MANAGER` | PROVIDER | `organization:read`, `organization:update`, `service:*`, `request:*`, `member:read`, `history:read`, `invoice:read` |
| `PROVIDER_RECEPTIONIST` | PROVIDER | `organization:read`, `service:read`, `request:read`, `request:accept`, `request:reject` |
| `PROVIDER_TECHNICIAN` | PROVIDER | `request:read`, `request:update_status`, `history:read` |
| `SELLER_OWNER` | SELLER (V2) | `*:*` |
| `SELLER_MANAGER` | SELLER (V2) | `organization:read`, `organization:update`, `listing:*`, `conversation:*`, `member:read`, `invoice:read` |
| `SELLER_STAFF` | SELLER (V2) | `listing:read`, `listing:create`, `listing:update`, `conversation:*` |

Example of a member:

```json
{
  "organizationId": 12,
  "userId": 45,
  "status": "ACTIVE",
  "roleKey": "PROVIDER_TECHNICIAN",
  "permissions": ["request:read", "request:update_status", "history:read"]
}
```

### Permission catalog

Each module declares its own resources as constants.

| Resource | Actions | Module |
|---|---|---|
| `user` | read, manage | `auth` |
| `role` | read, manage | `auth` |
| `organization` | create, read, update, approve | `organization` |
| `member` | read, manage | `organization` |
| `service` | read, manage | `provider` and `catalog` |
| `vehicle` | read, create, update, delete | `vehicle` |
| `diagnostic` | use, manage | `diagnostic` |
| `request` | create, read, accept, reject, update_status, cancel | `servicerequest` |
| `history` | read | `maintenance` |
| `notification` | read | `notification` |
| `listing` | read, create, update, delete, moderate | `marketplace` |
| `conversation` | read, send | `marketplace` |
| `review` | create, read | `review` |
| `audit` | read | `audit` |
| `invoice` | read | `billing` |
| `subscription` | read, manage | `subscription` |
| `ticket` | create, read, manage | `helpdesk` |
| `helpdesk` | configure (SLA policies) | `helpdesk` |
| `apikey` | manage | `apiaccess` |

### How authorization works

1. Platform endpoints (admin, own vehicles, diagnostics) check the roles and permissions in the JWT. There is no database join per request.
2. Organization endpoints receive the organization in the path (`/organizations/{organizationId}/...`), load the member by `(organizationId, userId)` and check the member's `permissions` (`@orgPerm.has(#organizationId, '...')`). The result is cached in Redis as `autocare:organization-member-permissions::{orgId}:{userId}`; a missing or non-active member gets an empty list.
3. Each organization must keep at least one member with `member:manage` or `*:*`.
4. The cache entry is cleared when a member's role or status changes.
5. The role of a member must match the organization type (`PROVIDER_*` only in `PROVIDER` organizations).

---

## 3. Module `auth`

Handles who the user is and what they can do on the whole platform.

| Class | What it does | Main fields |
|---|---|---|
| `User` | The person using the platform | `id`, `email` (unique), `passwordHash` (BCrypt), `fullName`, `phone`, `locale` (`fr` or `en`, language of e-mails), `active`, `emailVerified`, `createdAt` |
| `RefreshToken` | One login session at one point in time. Each refresh creates a new row and revokes the old one (`ROTATED`) | `id`, `userId`, `tokenHash`, `expiresAt`, `revokedAt`, `revokeReason`, `userAgent`, `ipAddress`, `sessionStartedAt` |
| `AuthToken` | One-time token sent by e-mail, as a link or a 6-digit code, stored hashed and marked used once consumed | `id`, `userId`, `type`, `channel` (`LINK` or `OTP`), `tokenHash`, `targetEmail` (e-mail change), `expiresAt`, `usedAt`, `attempts` |
| `Role` | A named set of platform permissions, seeded by Flyway and editable in the backoffice | `id`, `name`, `label`, `description`, `permissions` (JSON list of `resource:action`), `backoffice`, `system` |
| `OAuthAccount` | A Google, Facebook, GitHub or Apple account linked to a user | `id`, `userId`, `provider`, `providerUserId`, `email`, `linkedAt` |
| `UserRole` | Gives a role to a user (a user can have several) | `id`, `userId`, `roleId` |

Enums: `AuthTokenType` (`EMAIL_VERIFICATION`, `PASSWORD_RESET`, `EMAIL_CHANGE`), `AuthTokenChannel` (`LINK`, `OTP`), `RevokeReason` (`ROTATED`, `LOGOUT`, `LOGOUT_ALL`, `REVOKED_BY_USER`, `PASSWORD_CHANGED`, `REUSE_DETECTED`, `ACCOUNT_DISABLED`).

Rules:
- Access token: JWT, 15 min, claims `sub`, `sid` (session id), `roles`, `perms`. Refresh token: httpOnly cookie, 30 days, rotated on every refresh. A rotated token used again within 10 s gets a new session (two tabs); later, it revokes every session of the user.
- Five wrong passwords for one e-mail lock login for 15 minutes.
- One-time tokens: verification link 24 h, password reset and e-mail change 15 min, OTP 15 min and 5 tries. Issuing a token invalidates the previous one of the same type. One e-mail of each kind per user every 30 s.
- Password reset answers the same for unknown e-mails. Resetting or changing the password signs out the other devices and sends a notice.
- Login from a browser the user never used before sends a new-device alert.
- E-mails: verification (link or code), password reset (link or code), e-mail change (to the new address), e-mail changed (to both addresses), password changed, new-device login, welcome (once the address is confirmed). All in the user's language.
- `active = false` (suspended by an admin or deactivated by the user) refuses login and refresh.
- Two session scopes. `CUSTOMER` is the normal site. `BACKOFFICE` (`/admin`) needs a role with `backoffice = true`, has its own refresh cookie (`autocare_bo_refresh`) and a 12 h refresh token, and its access token carries `scope=BACKOFFICE`. `/admin/**` endpoints refuse any other session. Refresh tokens store their scope, so a customer refresh can never become a backoffice one.
- Two transports. `/auth/c/*` (web) keeps the refresh token in an httpOnly cookie. `/auth/h/*` (mobile) returns it in the body.
- OAuth: Google, Facebook and GitHub by redirect (`/auth/oauth/{provider}/authorize` then callback, state in Redis), Google and Apple ID tokens from the mobile app (`/auth/c|h/oauth/{provider}/id-token`). A new e-mail creates the account (`passwordSet = false`); an existing e-mail must sign in with its password and link the provider from `/me/oauth`. The last login method cannot be unlinked.
- Phone: a 6-digit SMS code confirms the number (`phoneVerified`). Changing the number clears it.
- Password reset can use the e-mail link, an e-mail code, an SMS code (verified phone) or a Telegram code (linked account); if the chosen channel is not available it falls back to e-mail. The web app only offers the e-mail code and the SMS code; LINK and TELEGRAM stay in the API for other clients.

Endpoints: `/auth/c|h/register|login|refresh|logout` (with `scope`), `/auth/oauth/*`, `/me/oauth`, `/me/phone-verification/send|confirm`, `/auth/email-verification/confirm`, `/auth/password-reset/request|confirm|confirm-otp`, `/auth/email-change/confirm` (public); `/me`, `/me/password`, `/me/email-change`, `/me/email-verification/send|confirm-otp`, `/me/sessions`, `/me/logout-all`, `/me/deactivate` (signed in); `/admin/users` (`user:read`: search with `q` (name, e-mail, phone), `role`, `active`, `sort`, `GET /admin/users/{id}`, roles; `user:manage`: suspend, unsuspend, roles, `POST /admin/users`, `POST /admin/users/{id}/invitation`).

Admin-created accounts: `POST /admin/users` (`email`, `fullName`, optional `phone`, `locale`, `roles`, default `USER`) opens the account with a random password (`passwordSet = false`) and sends the `account-invitation` e-mail: a password-reset link valid 3 days to `/reset-password`. Choosing the password confirms the address. `POST /admin/users/{id}/invitation` sends a fresh link while no password is chosen (`USER_PASSWORD_ALREADY_SET` otherwise).

Welcome flow: `users.onboarding_state` (`COMPLETED`, `SKIPPED`, empty until answered) and `onboarding_finished_at`; `GET /me` returns `onboardingDone`, `POST /me/onboarding` (`skipped`) ends it once (a second call changes nothing). Accounts created before the flow were marked `SKIPPED`. The web app sends a new account to `/onboarding` after sign-up, login or OAuth.

Events published: `UserRegistered`, `UserInvited`, `UserSuspended`, `UserUnsuspended`, `UserRolesChanged` (each carries the admin who acted).

Facade: `AuthFacade` (get user, list users by ids, find by e-mail, check platform permission).

---

## 4. Module `organization`

Represents businesses and the people who work in them. The organization type decides what it is: a service provider or a seller.

| Class | What it does | Main fields |
|---|---|---|
| `Organization` | A business such as a garage, a mobile service or a shop | `id`, `name`, `type` (`PROVIDER` or `SELLER`), `status`, `ownerId`, `description`, `phone`, `governorate`, `city`, `address`, `serviceZone`, `workingHours` (JSON), `slotMinutes`, `slotCapacity`, `createdAt` |
| `OrganizationMember` | Links a user to an organization with a role and embedded permissions | `id`, `organizationId`, `userId`, `status`, `roleKey`, `permissions` (JSON), `joinedAt` |
| `OrganizationInvitation` | Invitation sent by email to join an organization. It exists because the invited person may not have an account yet. Accepting it creates the member | `id`, `organizationId`, `email`, `roleKey`, `tokenHash`, `status`, `invitedBy`, `expiresAt`, `createdAt` |

Enums:
- `OrganizationType`: `PROVIDER`, `SELLER`
- `OrganizationStatus`: `PENDING`, `APPROVED`, `SUSPENDED`
- `MemberStatus`: `INVITED`, `ACTIVE`, `SUSPENDED`
- `MemberRoleKey`: `PROVIDER_OWNER`, `PROVIDER_MANAGER`, `PROVIDER_RECEPTIONIST`, `PROVIDER_TECHNICIAN`, `SELLER_OWNER`, `SELLER_MANAGER`, `SELLER_STAFF`, `CUSTOM`
- `InvitationStatus`: `PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`

Rules:
- A user creates an organization (`organization:create`) and becomes its owner.
- An admin approves a new organization before it appears in search.
- An admin can also open an organization for an existing account (`POST /admin/organizations` with `ownerEmail`, `approve` and the profile): that person becomes the owner, and `approve: true` skips the queue. `PUT /admin/organizations/{id}` edits any profile.
- `GET /admin/organizations` filters by `status`, `q` (name, city, phone), `type`, `governorate` and sorts with `sort`.
- An admin manages any team under `/admin/organizations/{id}/members` (`organization:approve`): list, add an existing account (`POST`), change the role (`PUT .../{memberId}/role`) or status (`PUT .../{memberId}/status`), remove (`DELETE .../{memberId}`). The same rules apply as for a manager (role fits the type, one manager stays).
- `GET /admin/users/{userId}/organizations` (`user:read`) lists the memberships of one person, whatever their status, for the backoffice user page.
- A member with `member:manage` invites people by email. The invitation expires and can be revoked.
- `PROVIDER_*` roles are only allowed in `PROVIDER` organizations, and `SELLER_*` roles only in `SELLER` organizations.
- `governorate` must be one of the 24 Tunisian governorates (`Governorates.ALL`, also served at `GET /organizations/governorates`).
- Booking schedule: `workingHours` maps `mon`..`sun` to ranges such as `08:00-12:00,14:00-18:00` (a missing day is closed; an empty map means Monday to Saturday 08:00-18:00). `slotMinutes` (15 to 240) is the length of a bookable slot and `slotCapacity` (1 to 20) how many clients one slot takes. `PUT /organizations/{id}/schedule` (`organization:update`) replaces all three and checks the format (`ORGANIZATION_SCHEDULE_INVALID`); `PUT /organizations/{id}` keeps the hours when it sends none. `OrganizationFacade.getBookingSchedule` serves them to `servicerequest`.
- Until invitations (B-ORG-3) exist, a manager adds people who already have an account, by email.

Facade: `OrganizationFacade` (get organization, check member permission, list members with a permission). Events published: `OrganizationApproved` (with `approvedBy`), `OrganizationSuspended`, `OrganizationProfileChanged`, `OrganizationMemberChanged` (added, role, permissions, status, removed; with the actor).

---

## 5. Module `file`

One generic table for every file stored in object storage (MinIO locally, S3 later). No other module knows about the storage service.

| Class | What it does | Main fields |
|---|---|---|
| `File` | Reference to one stored file and the entity that owns it | `id`, `storageKey`, `originalName`, `contentType`, `sizeBytes`, `ownerType`, `ownerId`, `purpose`, `position`, `uploadedBy`, `createdAt` |

Enums: `FileOwnerType` (`USER`, `ORGANIZATION`, `VEHICLE`, `SERVICE_REQUEST`, `LISTING`) and `FilePurpose` (`AVATAR`, `LOGO`, `PHOTO`, `DOCUMENT`).

Examples: a vehicle photo is `ownerType = VEHICLE`, `purpose = PHOTO`. A provider logo is `ownerType = ORGANIZATION`, `purpose = LOGO`. Approval documents of an organization use `purpose = DOCUMENT`. `position` orders the photos of one owner. Only the `storageKey` is stored in PostgreSQL, never the file itself.

Rules: the real type is read from the first bytes (JPEG, PNG, WebP, PDF), never from the browser's Content-Type. Images up to 5 MB, PDFs up to 10 MB (documents only). Avatars and logos replace the previous one; at most 8 photos and 10 documents per owner. Responses carry a signed URL valid 15 minutes, built on `S3_PUBLIC_ENDPOINT` so the browser can reach it. The owner module checks who may touch its files (vehicle owner, `organization:update`, the user themself) before calling the facade.

Endpoints (in the owner modules): `/vehicles/{id}/photos`, `/me/avatar`, `/organizations/{id}/logo`, `/organizations/{id}/photos` (gallery, up to 8), `/organizations/{id}/documents`, and the same three under `/admin/organizations/{id}/` for staff with `organization:approve` (an organization signed up by phone). The public provider profile returns `photoUrls` (the gallery); search results carry only the first photo as a cover.

Facade: `FileFacade` (upload, list files of an owner, delete one or all, signed URLs of several owners' first file).

---

## 6. Module `vehicle`

| Class | What it does | Main fields |
|---|---|---|
| `Vehicle` | A vehicle registered by a client | `id`, `ownerId`, `brand`, `model`, `year`, `fuelType` (`ESSENCE`, `DIESEL`, `HYBRID`, `ELECTRIC`, `LPG`), `engine`, `mileage`, `plate`, `vin`, `createdAt` |

`plate` (Tunisian registration) and `vin` are optional and stored upper case.

Rules: a client only sees and changes their own vehicles (another user's vehicle answers 404); mileage can only go up; year is between 1950 and next year. Photos come from the `file` module. `GET /admin/users/{userId}/vehicles` (`user:read`) lists one person's vehicles for the backoffice. Facade: `VehicleFacade` (get vehicle, check ownership, update mileage).

---

## 7. Module `catalog`

| Class | What it does | Main fields |
|---|---|---|
| `AutoService` | A type of automotive service (oil change, brakes, tires, battery, suspension, air conditioning, cooling, electrics) | `id`, `name`, `description`, `active`, `icon` |

`icon` is a key of the web icon set (`^[a-z0-9-]{1,40}$`, for example `droplet` or `snowflake`), chosen by the admin and shown to clients when they pick a service; null falls back to a guess from the name.

Managed by the admin and read very often, so it is cached in Redis. `GET /admin/catalog/services` filters by `q` and `active`. `POST /admin/catalog/services/{id}/deactivate` and `/reactivate` (`service:manage`) take a service out of the catalog, provider search and new requests, or put it back; offers and running requests stay. Event published: `AutoServiceActivationChanged` (also when `PUT` flips `active`). Facade: `CatalogFacade`.

---

## 8. Module `provider`

| Class | What it does | Main fields |
|---|---|---|
| `ProviderService` | States that a provider organization offers a service | `id`, `organizationId`, `serviceId`, `atHome`, `indicativePrice` |

`atHome` is here and not on the service, because it depends on the provider: Alo Vidange does an oil change at home, a garage may not. `indicativePrice` is optional (empty means "on quote"), stored as `NUMERIC(12,3)` with a `currency` (`TND`).

| Class | What it does | Main fields |
|---|---|---|
| `ProviderProfile` | Local copy of an organization's public profile, used only by search and the public profile page | `organizationId`, `name`, `description`, `phone`, `governorate`, `city`, `address`, `serviceZone`, `visible`, `searchText` |

Provider search never reads the organization schema. The organization module publishes `OrganizationProfileChanged` on create, update, approve and suspend; the provider module listens (asynchronously, after commit, retried by the event registry) and updates `ProviderProfile`. A profile is `visible` only for an `APPROVED` `PROVIDER` organization. `searchText` holds accent-free, lower-case words from the name, city, governorate, zone, description and offered service names, indexed by a generated `tsvector` column; a query matches when every word is a prefix of an indexed word ("vidan marsa" finds "Vidange" at "La Marsa").

Location: an organization may place itself on the map (`latitude`/`longitude`, both or none, inside Tunisia, else `ORGANIZATION_LOCATION_INVALID`). The profile copies the point, or the governorate's centre (`Governorates.LOCATIONS`) with `approximateLocation = true`. With `lat`/`lng` the search returns the nearest first (great-circle distance in km, `distanceKm` in each result) and `radiusKm` filters.

Endpoints: `GET/POST/PUT/DELETE /organizations/{organizationId}/services` (workspace), `GET /providers?q&serviceId&governorate&atHome&lat&lng&radiusKm&page&size`, `GET /providers/{organizationId}` and `GET /providers/governorates` (centres, public). Backoffice: `GET /admin/organizations/{organizationId}/services` (`organization:approve`) and `GET /admin/catalog/services/provider-counts` (`service:read`, catalog service id to the number of organizations offering it; the count lives here because catalog cannot depend on provider).

Facade: `ProviderFacade` (offered services of an organization, is a service offered at home).

---

## 9. Module `diagnostic`

Implements the flow Symptom, Questions, Rules, Result, Service. The result is informative only and does not replace a professional.

| Class | What it does | Main fields |
|---|---|---|
| `Symptom` | What the user reports (for example, noise when braking) | `id`, `label` |
| `Question` | An ordered question asked for a symptom, with the type of answer and its choices | `id`, `symptomId`, `text`, `answerType`, `options` (JSON), `position` |
| `DiagnosticRule` | If the answers match `conditions`, gives a possible cause, a recommendation and the suggested service | `id`, `symptomId`, `conditions` (JSON), `priority`, `possibleCause`, `recommendation`, `serviceId` |
| `Diagnostic` | The record of one diagnostic run | `id`, `userId`, `vehicleId`, `symptomId`, `ruleId`, `answers` (JSON), `createdAt` |

Enum: `AnswerType` (`YES_NO`, `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `NUMBER`).

The admin manages symptoms, questions and rules. A rule's `conditions` all must match (`EQUALS` for yes/no and single choice, `INCLUDES` for multiple choice, `AT_LEAST`/`AT_MOST` for numbers); a rule without conditions is the fallback. When several rules match, the one with the highest `priority` wins. Every question must be answered. The result is copied into `Diagnostic` so editing a rule never rewrites history, and `urgency` (`LOW`, `MEDIUM`, `HIGH`) tells the client whether to keep driving. A symptom with its questions and rules is cached in Redis and evicted on every change. A starter rule set (six symptoms) is seeded into an empty database by `DiagnosticSeeder`, which finds the suggested services through `CatalogFacade`.

Endpoints: `/diagnostics/symptoms`, `POST /diagnostics`, `/diagnostics` (history) with `diagnostic:use`; `/admin/diagnostics/symptoms/**` with `diagnostic:manage`. Facade: `DiagnosticFacade`.

---

## 10. Module `servicerequest`

The core flow: a client asks a provider organization to perform a service on a vehicle.

| Class | What it does | Main fields |
|---|---|---|
| `ServiceRequest` | A request from a client to a provider | `id`, `userId`, `vehicleId`, `serviceId`, `organizationId`, `desiredDate`, `desiredTime`, `locationType`, `location`, `note`, `rejectionReason`, `status`, quote (`quoteAmount`, `quoteCurrency`, `quoteNote`, `quoteStatus`, `quotedAt`), `createdAt` |
| `RequestMessage` | One chat message between the client and the garage on a request; never edited | `id`, `serviceRequestId`, `authorId`, `authorSide` (`CLIENT`, `PROVIDER`), `body`, `createdAt` |
| `ServiceRequestStatusHistory` | Records each status change: who made it, from which status to which, and when. It gives the client a timeline and helps with disputes | `id`, `serviceRequestId`, `fromStatus`, `toStatus`, `changedBy`, `createdAt` |

Enums: `RequestStatus` (`PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`, `CANCELLED`) and `LocationType` (`HOME`, `AT_PROVIDER`).

Workflow and who may do it:
- `PENDING` to `CONFIRMED` or `REJECTED`: member with `request:accept` or `request:reject` (a rejection needs a reason).
- `CONFIRMED` to `IN_PROGRESS` to `COMPLETED`: member with `request:update_status`.
- `PENDING` or `CONFIRMED` to `CANCELLED`: the client who created it.

Creating a request checks: the vehicle belongs to the client, the organization is an approved provider, it offers the service (at home when `HOME`), the date is between today and 90 days (Tunis time), a home service has an address, and an attached diagnostic is the client's own. Completing it may raise the vehicle mileage and carries the work report (`result`, `recommendations`) in `ServiceRequestCompleted`. The request has a `version`, so two members acting at once get 409 instead of overwriting each other.

Time slots: `desiredTime` is optional. When given, it must be a free slot of the garage's schedule that day (`GET /providers/{orgId}/slots?date=` lists the slot times with the places left; booked slots are the requests still `PENDING`, `CONFIRMED` or `IN_PROGRESS`), otherwise `SERVICE_REQUEST_SLOT_UNAVAILABLE`.

Quotes: on a `PENDING` request a member with `request:accept` sends a price (`POST .../{id}/quote`, `amount` in TND with 3 decimals, optional `note`); a new quote replaces the previous one. The client accepts it (`POST /service-requests/{id}/quote/accept`, which confirms the request) or declines it (the request stays `PENDING`). Errors: `QUOTE_NOT_ALLOWED`, `QUOTE_NOT_PENDING`.

Chat: the client (`/service-requests/{id}/messages`) and the members with `request:read` (`/organizations/{orgId}/service-requests/{id}/messages`) list and post messages (up to 2000 characters). Staff names are hidden from the client (`authorName` null). A `REJECTED` or `CANCELLED` request keeps its messages but takes no new one (`SERVICE_REQUEST_CHAT_CLOSED`). The web app polls every 15 seconds while the chat is open.

Dashboard: `GET /organizations/{orgId}/service-requests/insights?weeks=` (4 to 26, default 12, `request:read`) returns the requests received and completed per Monday-based week, the five most requested services, the accept rate (confirmed among confirmed + refused) and the total of accepted quotes. `GET .../calendar?from&to` (at most 62 days) lists the requests by desired day for the agenda.

Every change writes a `ServiceRequestStatusHistory` row. Events published: `ServiceRequestCreated`, `ServiceRequestStatusChanged`, `ServiceRequestCompleted`, `ServiceRequestQuoted`, `ServiceRequestMessagePosted`.

Endpoints: `/service-requests` (client: create, list, detail, history, cancel); `/organizations/{id}/service-requests` (members: list, counts, detail, history, confirm, reject, start, complete); `/admin/service-requests` (backoffice, `request:read`, read only): `searchServiceRequests` with `status`, `serviceIds` (any of them, comma-separated), `organizationId`, `userId`, `from`, `to` (creation day, Tunis time, both included), `GET /stats` (`total`, `createdToday`, `byStatus`), `GET /{id}` and `GET /{id}/history`. Facade: `ServiceRequestFacade`.

---

## 11. Module `maintenance`

| Class | What it does | Main fields |
|---|---|---|
| `MaintenanceRecord` | One entry of a vehicle's history. It also holds the report of the work | `id`, `vehicleId`, `serviceId`, `organizationId`, `serviceRequestId`, `date`, `mileage`, `description`, `result`, `recommendations` |
| `MaintenanceReminder` | A maintenance the owner plans: due on a date, at a mileage, or whichever comes first | `id`, `vehicleId`, `ownerId`, `serviceId`, `title`, `dueDate`, `dueMileage`, `note`, `doneAt`, `notifiedAt` |

It is created automatically when `ServiceRequestCompleted` is received (once per request, `source = SERVICE_REQUEST`, read-only for the owner). The owner can also add, edit and delete their own entries (`source = MANUAL`, date not in the future; a higher reading raises the vehicle mileage). The provider can complete its report later. The history is deleted with the vehicle (`VehicleDeleted`).

Reminders: the owner lists (`history:read`), creates, edits, marks done (`POST .../{id}/done`) and deletes (`vehicle:update`) them under `/vehicles/{id}/reminders`; a reminder needs a date or a mileage (`MAINTENANCE_REMINDER_DUE_REQUIRED`). `due` is true within 7 days or 500 km of the due point, or past it. `MaintenanceReminderScheduler` runs every day at 08:00 (Tunis) and one hour after start-up: each open reminder that became due is notified once (`MaintenanceReminderDue`); changing its date or mileage arms it again. Reminders are deleted with the vehicle.

Endpoints: `/vehicles/{id}/maintenance-records` (owner), `/vehicles/{id}/reminders` (owner), `/organizations/{id}/maintenance-records` (`history:read`, report with `request:update_status`). Facade: `MaintenanceFacade` (history of a vehicle). Event published: `MaintenanceReminderDue`.

---

## 12. Module `notification`

| Class | What it does | Main fields |
|---|---|---|
| `Notification` | The content of a notification, stored once | `id`, `senderId` (empty for system messages), `organizationId`, `type`, `title`, `body`, `resourceType`, `resourceId`, `createdAt` |
| `NotificationRecipient` | One row per user who receives it, with the read state | `id`, `notificationId`, `userId`, `readAt`, `dismissedAt` |

Example: a new request for a garage creates one `Notification` and one `NotificationRecipient` per member who has `request:read`. Each member marks it read on their own. `resourceType` and `resourceId` point to the related request, listing or invoice. The module listens to events from other modules: `OrganizationApproved` (owner), `ServiceRequestCreated` and a client's cancellation (members with `request:read`), and the other status changes (client), quotes (`SERVICE_REQUEST_QUOTED` to the client, `SERVICE_REQUEST_QUOTE_ACCEPTED` to the members), chat messages (`SERVICE_REQUEST_CLIENT_MESSAGE` to the members, `SERVICE_REQUEST_PROVIDER_MESSAGE` to the client) and due reminders (`MAINTENANCE_REMINDER_DUE`, `resourceType = VEHICLE`). Texts are stored as `type` + `params` and translated when read (`notification.<TYPE>.title` in `i18n/messages`), so each user sees their language. The live unread count goes through Server-Sent Events (`GET /notifications/stream`, read with `fetch()` for the Authorization header); after commit the API publishes the user ids on the Redis channel `autocare:notifications`, so every instance pushes to the streams it holds. Facade: `NotificationFacade`.

---

## 12b. Module `telegram`

| Class | What it does | Main fields |
|---|---|---|
| `TelegramLink` | A user's Telegram chat | `id`, `userId` (unique), `chatId`, `username`, `linkedAt` |

Rules: `POST /me/telegram/link` returns a one-time deep link (`t.me/<bot>?start=<code>`, 10 min). The bot receives `/start <code>` by long polling in dev or by webhook (`/integrations/telegram/webhook`, secret header) in prod, and links the chat. `DELETE /me/telegram` unlinks. Without a bot token the module is off (`TELEGRAM_DISABLED`). Facade: `TelegramFacade` (is linked, send a message), used by `auth` for reset codes.

SMS is not a module: `shared/sms` has `SmsService` with a log sender (dev) and Twilio (prod).

## 12c. Module `helpdesk`

| Class | What it does | Main fields |
|---|---|---|
| `Ticket` | A support request | `publicId` (`TK-XXXXXXXX`), `customerId`, `organizationId` (optional), `subject`, `description`, `status`, `priority`, `category`, `channel`, `assigneeId`, `escalationLevel`, `referenceType`/`referenceId`, SLA due dates and breach dates, `version` |
| `TicketMessage` | A reply; agents can write internal notes | `ticketId`, `authorId`, `authorType`, `body`, `internal` |
| `TicketEvent` | History of the ticket | `ticketId`, `type`, `actorId`, `data` (JSON) |
| `SlaPolicy` | Minutes allowed per priority | `priority`, `firstResponseMinutes`, `resolutionMinutes`, `active` |

Enums: `TicketStatus` (`OPEN`, `IN_PROGRESS`, `WAITING_ON_CUSTOMER`, `RESOLVED`, `CLOSED`), `TicketPriority` (`LOW`, `NORMAL`, `HIGH`, `URGENT`), `TicketCategory`, `TicketEventType`.

Rules:
- Customers cannot choose `URGENT`. A customer only sees their own tickets (404 otherwise) and never sees internal notes. Organization tickets (`/organizations/{id}/helpdesk/tickets`) are shared by the members.
- A public agent reply sets `WAITING_ON_CUSTOMER` by default, which pauses the resolution SLA; the customer's reply resumes it and sets `IN_PROGRESS`. The first public reply records `firstResponseAt`.
- Escalation raises the priority one step and recomputes the due dates.
- `SlaMonitor` runs every minute: it records breaches and closes tickets resolved more than 7 days ago. A closed ticket accepts no reply.
- E-mails to the customer (`HelpdeskNotifier`, sent after commit): agent reply, ticket resolved.

Endpoints: `/helpdesk/tickets` (`ticket:create`, `ticket:read`), `/admin/helpdesk` (`ticket:manage`: stats, queue, tickets, pick, release, assign, messages, status, priority/category, escalate, events; `helpdesk:configure` for `sla-policies`).

## 12d. Module `apiaccess`

| Class | What it does | Main fields |
|---|---|---|
| `ApiKey` | A partner key, secret stored hashed | `keyId`, `secretHash`, `previousSecretHash` + expiry (rotation), `label`, `environment` (`LIVE`/`TEST`), `permissions`, `allowedIps` (CIDR), `rateLimitPerMinute`, `status`, `expiresAt`, `lastUsedAt`/`lastUsedIp` |
| `ApiKeyUsage` | Daily request counters | `apiKeyId`, `day`, `requests`, `rejected` |

Rules: key format `ac_live_<keyId>_<secret>`, shown once at creation or rotation; the old secret stays valid 24 h after a rotation. `/external/**` has its own security chain: the `X-Api-Key` header, IP allowlist, per-key rate limit (Redis) and permission (`status:read`, `catalog:read`, `providers:read`). A disabled or revoked key gets 401. Admin endpoints `/admin/api-keys` (`apikey:manage`). The external API only calls other modules' facades.

## 13. Module `marketplace` (V2)

Lets individuals and professionals publish listings of parts, accessories and vehicles, and contact each other.

| Class | What it does | Main fields |
|---|---|---|
| `Listing` | An item for sale | `id`, `userId` (who posted), `organizationId` (optional, a seller organization), `categoryId`, `title`, `description`, `price`, `itemCondition`, `governorate`, `city`, `compatBrand`, `compatModel`, `compatYearMin`, `compatYearMax`, `status`, `createdAt` |
| `ListingCategory` | Category tree (parts, brakes, pads) | `id`, `name`, `parentId` |
| `Favorite` | A listing saved by a user | `id`, `userId`, `listingId` |
| `Conversation` | A chat between a buyer and a seller about a listing | `id`, `listingId`, `buyerId`, `sellerId` |
| `Message` | One message of a conversation | `id`, `conversationId`, `senderId`, `content`, `sentAt` |
| `ListingReport` | A report by a user about a listing. A moderator reviews it and marks it handled | `id`, `listingId`, `reporterId`, `reason`, `handled`, `createdAt` |

Enums: `ItemCondition` (`NEW`, `USED`) and `ListingStatus` (`ACTIVE`, `SOLD`, `SUSPENDED`).

Rules:
- A user without an organization sells as an individual. A member of a `SELLER` organization with `listing:create` can post for the organization.
- The compatibility fields let a client see parts that fit their registered vehicle.
- Photos come from the `file` module (`ownerType = LISTING`).
- In the first version, buyer and seller agree outside the platform, so there is no online payment.

Event published: `ListingMessageSent` (consumed by `notification`). Possible additions later: seller ratings, orders. Facade: `MarketplaceFacade`.

---

## 14. Module `subscription` (V2)

Paid plans of the app. A subscriber can be a user or an organization.

| Class | What it does | Main fields |
|---|---|---|
| `Plan` | A paid plan of the app for one audience: users, providers or sellers (higher limits, premium profile, featured listings) | `id`, `name`, `audience`, `amount`, `currency`, `interval`, `features` (JSON), `active` |
| `Subscription` | Maps a subscriber (a user or an organization) to its plan. The current plan is the subscription with status `ACTIVE` or `TRIALING` | `id`, `subscriberType`, `subscriberId`, `planId`, `status`, `currentPeriodStart`, `currentPeriodEnd`, `canceledAt` |

Enums: `PlanAudience` (`USER`, `PROVIDER`, `SELLER`), `SubscriberType` (`USER`, `ORGANIZATION`), `SubscriptionStatus` (`TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELED`, `EXPIRED`).

Rules:
- A plan only fits its audience: `USER` plans for users, `PROVIDER` plans for provider organizations, `SELLER` plans for seller organizations.
- A subscriber has one `ACTIVE` or `TRIALING` subscription at a time, enforced by a unique index on (`subscriberType`, `subscriberId`) for those statuses.
- The `features` JSON holds the limits of the plan (for example `maxVehicles`, `maxListings`, `maxMembers`). The facade returns them for a subscriber, cached in Redis, and other modules check them before creating something.
- The module reacts to `PaymentSucceeded` and `PaymentFailed` to extend or suspend a subscription.

Event published: `SubscriptionRenewed`. Facade: `SubscriptionFacade`.

---

## 15. Module `billing` (V2)

| Class | What it does | Main fields |
|---|---|---|
| `Invoice` | A bill for a payer (a user or an organization), usually for a subscription | `id`, `payerType`, `payerId`, `subscriptionId`, `number`, `status`, `currency`, `total`, `items` (JSON lines), `dueDate`, `paidAt` |
| `Payment` | One payment attempt on an invoice | `id`, `invoiceId`, `status`, `amount`, `currency`, `provider`, `providerPaymentId`, `failureReason`, `paidAt` |

Enum: `PayerType` (`USER`, `ORGANIZATION`).

An invoice is created when `SubscriptionRenewed` is received. Events published: `PaymentSucceeded`, `PaymentFailed`. Facade: `BillingFacade`.

---

## 16. Module `review`

Builds trust in the platform by letting clients rate the providers they used.

| Class | What it does | Main fields |
|---|---|---|
| `Review` | A rating and comment from a client about a provider after a completed request | `id`, `serviceRequestId`, `organizationId`, `userId`, `rating` (1 to 5), `comment`, `createdAt` |

Rules:
- Only the client who made a `COMPLETED` request can review it, and only once per request.
- The average rating and review count are shown in provider search.
- The module listens to `ServiceRequestCompleted` and asks `notification` to invite the client to review.

Endpoints: `POST`/`GET /service-requests/{id}/review` (`review:create`, the client), `GET /providers/{orgId}/reviews` and `/rating` (public), `GET /providers/ratings?organizationIds=` (batch, for search cards: `provider` does not depend on `review`), `GET /organizations/{orgId}/reviews` (`organization:read`) and `PUT /organizations/{orgId}/reviews/{id}/reply` (`organization:update`, one public reply). Errors: `REVIEW_NOT_ALLOWED`, `REVIEW_ALREADY_EXISTS`.

Permission: `review:create` for `USER`. Facade: `ReviewFacade`.

---

## 17. Module `audit`

Keeps a trace of sensitive actions, for security and accountability.

| Class | What it does | Main fields |
|---|---|---|
| `AuditLog` | One record of an important action, such as approving or suspending an organization or moderating a listing | `id`, `actorId`, `action`, `targetType` (`USER`, `ORGANIZATION`, `AUTO_SERVICE`), `targetId`, `details` (JSON), `createdAt` |

Records are never edited or deleted. They come from events, so no module depends on `audit`: `AuditEventsListener` (asynchronous, after the action's commit, retried by the event registry) writes `USER_INVITED`, `USER_SUSPENDED`, `USER_UNSUSPENDED`, `USER_ROLES_CHANGED` (`details.roles`), `ORGANIZATION_APPROVED`, `ORGANIZATION_SUSPENDED`, `ORGANIZATION_MEMBER_<ADDED|ROLE_CHANGED|PERMISSIONS_CHANGED|STATUS_CHANGED|REMOVED>` (`details.memberUserId`, `memberName`, `value`), `AUTO_SERVICE_DEACTIVATED` and `AUTO_SERVICE_REACTIVATED`. `GET /admin/audit-logs?targetType&targetId` (`audit:read`, `ADMIN` only) returns them newest first with the actor's name; the user and organization pages of the backoffice show them. Facade: `AuditFacade` (empty: reserved for a synchronous write).

---

## 18. Events between modules

| Event | Published by | Consumed by | Effect |
|---|---|---|---|
| `OrganizationApproved` | `organization` | `notification` | Tells the owner the organization is live |
| `OrganizationProfileChanged` | `organization` | `provider` | Keeps the provider search copy (`ProviderProfile`) up to date |
| `OrganizationApproved`, `OrganizationSuspended`, `OrganizationMemberChanged` | `organization` | `audit` | Audit trail of the organization |
| `UserInvited`, `UserSuspended`, `UserUnsuspended`, `UserRolesChanged` | `auth` | `audit` | Audit trail of the user |
| `AutoServiceActivationChanged` | `catalog` | `audit` | Audit trail of the service |
| `RoleChanged` | `auth` | `audit` | Audit trail of the role |
| `VehicleDeleted` | `vehicle` | `maintenance` | Deletes the vehicle's history and reminders |
| `ServiceRequestCreated` | `servicerequest` | `notification` | Notifies members with `request:read` |
| `ServiceRequestStatusChanged` | `servicerequest` | `notification` | Notifies the client |
| `ServiceRequestCompleted` | `servicerequest` | `maintenance`, `review` (V2) | Creates the maintenance record with the work report, opens the review (the client's notification comes from `ServiceRequestStatusChanged`) |
| `ServiceRequestQuoted` | `servicerequest` | `notification` | Tells the client a quote is waiting |
| `ServiceRequestMessagePosted` | `servicerequest` | `notification` | Tells the other side of the chat |
| `MaintenanceReminderDue` | `maintenance` | `notification` | Tells the owner a planned maintenance is due |
| `ListingMessageSent` (V2) | `marketplace` | `notification` | Notifies the other party |
| `SubscriptionRenewed` (V2) | `subscription` | `billing` | Creates the invoice |
| `PaymentSucceeded`, `PaymentFailed` (V2) | `billing` | `subscription`, `notification` | Extends or suspends the subscription, notifies the payer |

---

## 19. Links between modules (by ID only)

| From | Field | Points to |
|---|---|---|
| `Organization` | `ownerId` | `User` |
| `OrganizationMember` | `userId` | `User` |
| `Vehicle` | `ownerId` | `User` |
| `ProviderService` | `organizationId`, `serviceId` | `Organization`, `AutoService` |
| `DiagnosticRule` | `serviceId` | `AutoService` |
| `Diagnostic` | `userId`, `vehicleId` | `User`, `Vehicle` |
| `ServiceRequest` | `userId`, `vehicleId`, `serviceId`, `organizationId` | `User`, `Vehicle`, `AutoService`, `Organization` |
| `MaintenanceRecord` | `vehicleId`, `serviceId`, `organizationId`, `serviceRequestId` | `Vehicle`, `AutoService`, `Organization`, `ServiceRequest` |
| `NotificationRecipient` | `userId` | `User` |
| `File` | `ownerType` + `ownerId` | any owner type |
| `Listing` | `userId`, `organizationId` | `User`, `Organization` |
| `Subscription` | `subscriberType` + `subscriberId` | `User` or `Organization` |
| `Invoice` | `payerType` + `payerId` | `User` or `Organization` |
| `Review` | `serviceRequestId`, `organizationId`, `userId` | `ServiceRequest`, `Organization`, `User` |
| `AuditLog` | `actorId` | `User` |

---

## 20. Main flows

### V1

1. A user registers, verifies the email and receives the `USER` role.
2. A provider user creates an organization of type `PROVIDER`, becomes its owner, invites staff, and adds the services it offers (`ProviderService`). An admin approves the organization.
3. A client registers a vehicle, optionally runs a diagnostic, searches providers for the suggested service and sends a `ServiceRequest`.
4. A provider member with `request:accept` confirms the request, then updates the status until `COMPLETED`. Each change is recorded in the status history.
5. The completed request creates a `MaintenanceRecord` and notifies the client.

### V2

1. An organization of type `SELLER`, or an individual user, publishes a `Listing` with photos.
2. Buyers search listings, save favorites and send messages. The seller is notified. A user can report a listing and a moderator handles it.
3. A user or an organization subscribes to a `Plan`. Billing creates the invoice and records the payment, and the subscription is extended on success.
4. After a completed request, the client can rate the provider with a `Review`.

---

## 21. Scope note for the cahier des charges

The current cahier des charges lists online payment and the sale of automotive parts as out of scope for the first version. Update section 5 to match this document: V1 covers the modules marked V1, and V2 covers the marketplace, subscription, billing, review and audit modules. Otherwise the jury will see a contradiction.
