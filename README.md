# AutoCare TN

Vehicle owners manage their vehicles, run a guided diagnostic, find garages and mobile services and send them service requests. Providers handle those requests from their workspace.

- **Backend**: Java 25, Spring Boot 4.1, Spring Modulith (modular monolith with facades, ready to split into microservices), PostgreSQL, Redis, MinIO
- **Frontend**: Angular 22, TanStack Query, NgRx Signals, Signal Forms + Zod, Tailwind CSS 4

| Doc | What |
| --- | --- |
| [docs/MODULES.md](docs/MODULES.md) | Modules, classes, permissions, events ([class diagram](docs/diagrams/autocare_class_diagram.html)) |
| [docs/STACK.md](docs/STACK.md) | Versions, choices, and how the NestJS template features map here |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Task list to V1 and V2 |
| [backend/MODULE-STRUCTURE.md](backend/MODULE-STRUCTURE.md) | Where backend code goes |
| [frontend/FOLDER-STRUCTURE.md](frontend/FOLDER-STRUCTURE.md) | Where frontend code goes |
| [frontend/DESIGN-TOKENS.md](frontend/DESIGN-TOKENS.md) | Colors, typography, components |
| [CLAUDE.md](CLAUDE.md) | Rules for Claude Code |

## Getting started

Prerequisites: Docker, Node 24 + npm, JDK 25 (Temurin) for running the API outside Docker.

### One command

`scripts/dev.sh` (Linux, macOS) and `scripts\dev.cmd` (Windows) start and stop everything: the containers, the API and the web app. The API runs with Maven when JDK 25+ is installed, otherwise in Docker (force it with `--docker-api` / `-DockerApi`, or `--local-api` / `-LocalApi`). Logs and process ids go to `.dev/`; data volumes survive a stop.

| Linux / macOS | Windows | |
| --- | --- | --- |
| `./scripts/dev.sh start` | `scripts\dev.cmd start` | Start everything, wait until it answers, print the URLs |
| `./scripts/dev.sh stop` | `scripts\dev.cmd stop` | Stop the API, the web app and the containers |
| `./scripts/dev.sh stop --keep-infra` | `scripts\dev.cmd stop -KeepInfra` | Stop the API and the web app, keep Postgres, Redis, MinIO and Mailpit |
| `./scripts/dev.sh stop --force` | `scripts\dev.cmd stop -Force` | Also kill whatever still holds ports 8080 and 4200 |
| `./scripts/dev.sh restart` | `scripts\dev.cmd restart` | Stop, then start |
| `./scripts/dev.sh status` | `scripts\dev.cmd status` | What is running and answering |
| `./scripts/dev.sh logs web` | `scripts\dev.cmd logs web` | Follow the API (`api`, default) or web app log |

### Step by step

```bash
# 0. local settings: one .env for Docker Compose and Spring Boot (every value has a default)
cp .env.example .env

# 1. infrastructure: Postgres, Redis, MinIO, Mailpit
docker compose -f docker-compose.dev.yml up -d

# 2. API (or add --profile app to step 1 to run it in Docker)
cd backend && ./mvnw spring-boot:run

# 3. web
cd frontend && npm install && npm start
```

| URL | |
| --- | --- |
| http://localhost:4200 | Web app |
| http://localhost:8080/api/docs | Swagger UI |
| http://localhost:8025 | Mailpit (dev emails) |
| http://localhost:9001 | MinIO console (`autocare` / `autocare2026`) |

The `autocare` bucket is created automatically on API start.

### Configuration

| Where | What |
| --- | --- |
| `.env` (from `.env.example`) | Every setting as an environment variable: database, Redis, storage, mail, JWT secret, OAuth, SMS, Telegram. Read by Docker Compose and by Spring (`spring.config.import`); real environment variables win. Never committed. |
| `backend/src/main/resources/application.yaml` | Shared settings with local defaults (`${VAR:default}`). |
| `application-dev.yaml` / `application-prod.yaml` | Profile overrides. `prod` has no default for secrets, so a missing `JWT_SECRET`, database password or storage key stops the start-up. Choose with `SPRING_PROFILES_ACTIVE`. |
| `backend/src/test/resources/application-test.yaml` | Test profile, turned on by Surefire. |
| `frontend/src/environments/` | Public front-end values (`apiUrl`). |
| `frontend/proxy.conf.mjs` | Where `ng serve` forwards `/api` (`API_PROXY_TARGET`). |

The `autocare.*` settings are typed records (`JwtProperties`, `StorageProperties`, `OAuthProperties`...) validated at start-up, with IDE autocompletion from the configuration processor. ### Google sign-in

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` (a Google Cloud "Web application" OAuth client) and restart the API: the Google button then appears on the login and sign-up pages. In the Google Cloud console, add this **Authorized redirect URI** to the client: `{OAUTH_REDIRECT_BASE_URL}/auth/oauth/google/callback`, i.e. `http://localhost:4200/api/auth/oauth/google/callback` in dev (it goes through the Angular proxy so the session cookie lands on the web origin). Facebook and GitHub work the same way with their own keys.

If you open the web app on another origin (a second dev server on :4201, a phone on your LAN), add it to `CORS_ALLOWED_ORIGINS`.

### Dev account

The `dev` profile (default) seeds an admin on first start, set by `DEV_ADMIN_EMAIL` / `DEV_ADMIN_PASSWORD` (`autocare.dev.*` in `application-dev.yaml`):

| Email | Password | Roles |
| --- | --- | --- |
| admin@autocare.tn | Admin@123456 | USER, ADMIN |

Anyone can register a normal `USER` account from http://localhost:4200/register.
