# Backend module structure

AutoCare's backend is a **Spring Modulith modular monolith**. One deployable app, split into business modules that only talk through **facades**, IDs and **events**. Any module can become a microservice later by swapping its facade implementation for an HTTP client, without touching callers.

Business rules, classes and events per module are in [`docs/MODULES.md`](../docs/MODULES.md). This file is about **where code goes**.

## Coming from NestJS

Each module is laid out like a NestJS module: one folder per kind of class.

| NestJS | AutoCare (Spring) | Folder |
| --- | --- | --- |
| `@Module({ exports })` | `api/` package: what other modules may use | `api/` |
| `*.controller.ts` | `@RestController` | `controller/` |
| `dto/*.dto.ts` + class-validator | `record` + Jakarta validation (`@NotBlank`, `@Size`) | `dto/` |
| `entities/*.entity.ts` (TypeORM) | `@Entity` (JPA/Hibernate) | `entity/` |
| `Repository<T>` | `interface XRepository extends JpaRepository<X, Long>` | `repository/` |
| `*.service.ts` | `@Service` | `service/` |
| Guards `@Permissions(...)` | `@PreAuthorize("@perm.has('...')")` | on controller methods |
| `ConfigService` / `registerAs()` | one `@ConfigurationProperties` record per concern (`JwtProperties`, `StorageProperties`, `TelegramProperties`...) in the package that uses it | `config/` of the module, or `shared/*` |
| Migrations | Flyway SQL files | `resources/db/migration/<module>/` |
| Constructor injection | `@RequiredArgsConstructor` + `private final` fields | everywhere |

## Rules

1. Every direct sub-package of `tn.autocare` is a module. Only add one for a domain listed in `docs/MODULES.md`.
2. A module exposes **only** its `api` package (`@NamedInterface("api")`): the facade interface, DTOs other modules need, events, enums used in those DTOs, and permission constants.
3. All other folders (`controller`, `service`, `entity`...) are private to the module. Other modules never import them.
4. No JPA relation across modules. Store the other module's ID (`vehicleId`, `organizationId`) and ask its facade.
5. One PostgreSQL schema per module (`@Table(schema = "vehicle", ...)`). A module never reads another module's tables.
6. React to another module asynchronously with events (`@ApplicationModuleListener`), synchronously only through its facade.
7. `ModularityTests` fails the build when a rule is broken. Never weaken it to make a change pass.

## Layout

```txt
backend/src/main/java/tn/autocare/
  AutocareApiApplication.java
  shared/                       OPEN module, no business logic, depends on no business module
    config/                     WebAppProperties, CacheConfig, JpaConfig, OpenApiConfig, AsyncConfig, I18nConfig
    exception/                  ErrorCode, AppException
    persistence/                BaseEntity (id, createdAt, updatedAt)
    security/                   SecurityConfig, JwtConfig, PlatformPermissions (@perm), PermissionMatcher, CurrentUser
    storage/                    ObjectStorage + S3/MinIO implementation (only the file module calls it)
    web/                        GlobalExceptionHandler (RFC 9457 problem details, translated detail)
    mail/                       MailService, MailMessage (Thymeleaf e-mails, sent after commit)
    i18n/                       SupportedLocales (fr default, en)
    ratelimit/                  RequestLimiter (Redis cooldowns and attempt limits)
    sms/                        SmsService, LogSmsSender (dev), TwilioSmsSender
    tx/                         AfterCommit

  catalog/                      reference module: copy this one
    package-info.java           @ApplicationModule
    api/                        public contract
      CatalogFacade.java        what other modules may call
      AutoServiceDto.java       data returned by the facade (and by the controllers)
      CatalogPermissions.java   "service:read", "service:manage"
    controller/
      CatalogController.java        GET /catalog/services (public)
      AdminCatalogController.java   /admin/catalog/services (backoffice, @PreAuthorize)
    dto/
      CreateAutoServiceRequest.java, UpdateAutoServiceRequest.java
    entity/
      AutoService.java
    repository/
      AutoServiceRepository.java
    mapper/
      AutoServiceMapper.java    MapStruct entity -> DTO
    service/
      CatalogService.java       business logic, used by the controllers
      CatalogFacadeImpl.java    implements CatalogFacade for other modules (package-private)
    config/
      CatalogCacheConfig.java   module beans

  auth/                         implemented: register/login/refresh/logout, e-mail verification, password reset (link + OTP),
                                account (/me), sessions, admin users, login throttling, new-device alerts, dev admin seeder,
                                customer/backoffice scopes (/auth/c cookie, /auth/h body), OAuth, phone verification
    api/ controller/ dto/ entity/ repository/ service/ config/
  vehicle/                      implemented: a client's own vehicles
    api/ controller/ dto/ entity/ repository/ mapper/ service/
  organization/                 implemented: organizations, members, @orgPerm (service/OrganizationPermissionChecker), admin approval
    api/ controller/ dto/ entity/ repository/ mapper/ service/ config/

  provider/                     implemented: offered services, public search over a ProviderProfile read model fed by events
    api/ controller/ dto/ entity/ repository/ mapper/ service/ event/
  telegram/                     implemented: account linking by deep link, bot polling or webhook, messages
    api/ controller/ dto/ entity/ repository/ service/
  helpdesk/                     implemented: tickets, agent workspace, SLA policies, SlaMonitor (@Scheduled, in service/)
    api/ controller/ dto/ entity/ repository/ service/
  apiaccess/                    implemented: partner API keys; config/ has the /external/** SecurityFilterChain
    controller/ dto/ entity/ repository/ service/ security/ config/
  file/                         implemented: stored file references, type sniffing, signed URLs (endpoints live in the owner modules)
    api/ entity/ repository/ service/
  diagnostic/                   implemented: symptoms, questions, rules, rule engine, runs; config/DiagnosticSeeder seeds a starter set
    api/ controller/ dto/ entity/ repository/ mapper/ service/ config/
  servicerequest/               implemented: requests, ServiceRequestWorkflow (status machine), status history
    api/ controller/ dto/ entity/ repository/ service/
  maintenance/                  implemented: vehicle history fed by ServiceRequestCompleted, manual entries
    api/ controller/ dto/ entity/ repository/ service/ event/
  notification/                 implemented: in-app notifications, SSE stream, Redis pub/sub relay
    api/ controller/ dto/ entity/ repository/ service/ event/ config/
  audit/                        implemented: AuditLog written from other modules' events (event/AuditEventsListener), /admin/audit-logs
    api/ controller/ dto/ entity/ repository/ service/ event/
  marketplace/ subscription/ billing/ review/                                                         V2, empty facade

backend/src/main/resources/
  application.yaml                shared settings (defaults for a local machine), imports ../.env
  application-dev.yaml            dev seed admin, debug logs
  application-prod.yaml           secrets without defaults, secure cookies, no Swagger, JSON logs
  i18n/messages.properties, messages_en.properties   French (default) and English texts
  templates/mail/                 layout.html, fragments.html, one file per e-mail
  db/migration/<module>/V<yyyyMMddHHmm>__<module>_<what>.sql
```

Optional folders when a module needs them: `event/` for `@ApplicationModuleListener` classes reacting to other modules' events, `scheduler/` for `@Scheduled` jobs.

## How a request flows

```txt
HTTP  ->  controller/  (validates dto/, checks @PreAuthorize)
      ->  service/     (@Transactional business logic, throws AppException)
      ->  repository/  (Spring Data)  ->  entity/  ->  PostgreSQL schema of the module
      <-  mapper/      (entity -> DTO, never return entities)

Other module  ->  api/XFacade  ->  service/XFacadeImpl  ->  service/ or repository/
```

## Naming

- Methods, handlers and events are **verb + entity**: `createAutoService`, `updateVehicleMileage`, `listVehicleHistory`, `ServiceRequestCompleted`. Never `create`, `update`, `get` alone.
- Facade `<Module>Facade` in `api/`, implementation `<Module>FacadeImpl` in `service/`, package-private.
- Business service `<Module>Service` (or `<Entity>Service` when a module has several, e.g. `AuthService`, `UserService`).
- HTTP input `<Verb><Entity>Request`, HTTP output `<Entity>Response` or the module's `<Entity>Dto`, all records in `dto/` (or `api/` when other modules use them).
- Events: past tense `<Entity><Happened>` records in `api/` (`OrganizationApproved`).
- Permission constants: `<Module>Permissions` in `api/`, values `resource:action`.
- Tables plural snake_case (`auto_services`), columns snake_case, ID columns `<entity>_id`.

## Adding a feature to a module

1. Migration: `db/migration/<module>/V<timestamp>__<module>_<what>.sql`. Timestamps keep versions unique across modules. Never edit an applied migration.
2. Entity in `entity/`, extending `BaseEntity`, with a static factory and intention-revealing methods instead of setters.
3. Repository in `repository/`.
4. Request/response records in `dto/`, mapper in `mapper/`.
5. Logic in `service/` (`@Transactional` on writes, `readOnly = true` on the class for reads).
6. Endpoint in `controller/` protected with `@PreAuthorize`. Backoffice endpoints start with `/admin/` and live in `Admin<Module>Controller`.
7. Other modules need it? Add a method to the facade in `api/` and implement it in `<Module>FacadeImpl`.
8. New refusal a client must explain? Add an `ErrorCode`, its `error.<CODE>` text in both message bundles, and its French message in `frontend/src/app/core/api/api.ts`.
9. Run `ModularityTests` and add a test (see `auth/AuthFlowTests`).

## HTTP conventions

- Context path `/api`. Public/client routes `/<resource>`, provider routes `/organizations/{organizationId}/...`, admin routes `/admin/...`.
- Lists are paged with Spring Data `Pageable` and returned as `PagedModel<T>` (`{content, page:{size,number,totalElements,totalPages}}`). Only small, bounded lists (catalog) return `List<T>`.
- Errors are `ProblemDetail` with a `code` (see `ErrorCode`) and, for validation, an `errors` map field -> message.
- Platform permission: `@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_READ + "')")`.
- Organization permission: `@PreAuthorize("@orgPerm.has(#organizationId, '...')")` (bean `OrganizationPermissionChecker` in the organization module, backed by `MemberPermissionCache`). The path variable must be named `organizationId`.
- Ownership ("my vehicle") is checked in the service, not by a permission.

## Auth

- `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `GET /me`.
- Access token: JWT HS256, 15 min, claims `sub` (user id), `roles`, `perms`. Sent as `Authorization: Bearer`.
- Refresh token: random, stored as SHA-256 hash, sent only as the httpOnly cookie `autocare_refresh` (path `/api/auth`), rotated on every refresh. Reusing an old one revokes all the user's sessions.
- Dev profile seeds an admin from `autocare.dev.*` in `application.yaml`.
- Current user in code: `CurrentUser.id()`.

## E-mails

- Send with `MailService.send(new MailMessage(to, locale, template, variables))` from a module's service. Inside a transaction the mail leaves after the commit, on a virtual thread; a failure is logged, never thrown.
- One Thymeleaf file per e-mail in `resources/templates/mail/<template>.html`, built on `mail/layout.html` (header, card, footer) and the blocks in `mail/fragments.html` (`lead`, `button`, `ghostButton`, `codeblock`, `note`, `fineprint`). Styles stay inline: many e-mail clients drop `<style>`.
- Every text comes from `i18n/messages*.properties` under `mail.<template>.*`; the subject is `mail.<template>.subject`. Never write French or English text in a template.
- Templates get `webUrl`, `supportEmail` and `year` automatically.
- Add the new template to `MailTemplatesTests` (renders it in French and English). Check it in Mailpit (http://localhost:8025).

## Languages (i18n)

- French is the default, English the alternative (`SupportedLocales`). Bundles: `i18n/messages.properties` (French) and `i18n/messages_en.properties` (English). Add every key to both files.
- API: the request language comes from `Accept-Language`. Error `detail` is the message `error.<ErrorCode>`; validation messages come translated from Hibernate Validator.
- E-mails use the recipient's saved language (`users.locale`, set at sign-up from `Accept-Language`, editable in `PATCH /me`).
- In a message that has `{0}` placeholders, write the apostrophe as `’` (MessageFormat treats `'` as a quote).

## Money

- `BigDecimal` in Java, `NUMERIC(12,3)` in SQL (TND has 3 decimals), serialized as a string. Never `double`/`float`.
- Store a `currency` column next to every amount (`TND` by default).

## Caching

- Spring Cache on Redis. Cache names are `<module>-<what>` (`catalog-active-services`), evicted in the same service method that writes.
- A cache that holds a collection needs a typed configuration: register it in the module's `config/` with `CacheConfig.listOf(Dto.class, ttl)` (see `CatalogCacheConfig`).

## Going to microservices later

- Each module's facade becomes a REST client of the extracted service (same interface, new bean); events move from the in-process registry to a broker (Spring Modulith externalization to Kafka/RabbitMQ).
- Each schema becomes that service's own database.
- JWT switches from HS256 shared secret to RS256 + JWKS so every service can verify tokens alone.
