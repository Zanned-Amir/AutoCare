#!/usr/bin/env bash
# Start and stop the whole local stack on Linux and macOS: infrastructure (Postgres, Redis,
# MinIO, Mailpit), the API and the web app.
#
#   ./scripts/dev.sh start [--docker-api | --local-api]   start everything (default: local API if JDK 25+, else Docker)
#   ./scripts/dev.sh stop [--keep-infra] [--force]        stop everything (--force also frees ports 8080/4200)
#   ./scripts/dev.sh restart [...]                        stop, then start
#   ./scripts/dev.sh status                               what is running
#   ./scripts/dev.sh logs [api|web]                       follow a log (default: api)
#
# Logs and process ids live in .dev/ (git-ignored). Docker volumes are kept: data survives a stop.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE="$ROOT/.dev"
COMPOSE_FILE="$ROOT/docker-compose.dev.yml"
API_PORT="${SERVER_PORT:-8080}"
WEB_PORT=4200
API_URL="http://localhost:$API_PORT/api/actuator/health"
WEB_URL="http://localhost:$WEB_PORT"

mkdir -p "$STATE"

info() { printf '\033[1;36m▸\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m✔\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31m✖\033[0m %s\n' "$*" >&2; exit 1; }

compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

need() { command -v "$1" >/dev/null 2>&1 || fail "$1 is required ($2)."; }

java_major() {
  local major=""
  if command -v java >/dev/null 2>&1; then
    major="$(java -version 2>&1 | awk -F'"' '/version/ { split($2, v, "."); print (v[1] == "1" ? v[2] : v[1]); exit }')"
  fi
  [[ "$major" =~ ^[0-9]+$ ]] && echo "$major" || echo 0
}

port_busy() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  else
    (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
  fi
}

# Any HTTP answer counts (a 401 still means the server is up).
http_up() { curl -s -o /dev/null --max-time 3 "$1"; }

wait_for() {
  local name="$1" url="$2" seconds="$3" pidfile="${4:-}"
  info "Waiting for $name ($url)…"
  for ((i = 0; i < seconds; i += 3)); do
    if http_up "$url"; then ok "$name is up"; return 0; fi
    if [[ -n "$pidfile" && -f "$pidfile" ]] && ! kill -0 "$(cat "$pidfile")" 2>/dev/null; then
      fail "$name stopped while starting, see $STATE/$(basename "$pidfile" .pid).log"
    fi
    sleep 3
  done
  warn "$name did not answer within ${seconds}s, see the log: ./scripts/dev.sh logs"
}

# Runs a command detached in its own process group, so stop can end it with all its children
# (mvnw starts java, npm starts node).
spawn() {
  local name="$1" dir="$2"; shift 2
  set -m
  (cd "$dir" && exec "$@") >"$STATE/$name.log" 2>&1 < /dev/null &
  local pid=$!
  set +m
  echo "$pid" >"$STATE/$name.pid"
  disown "$pid" 2>/dev/null || true
}

kill_group() {
  local name="$1" file="$STATE/$1.pid"
  [[ -f "$file" ]] || return 0
  local pid; pid="$(cat "$file")"
  if kill -0 "$pid" 2>/dev/null; then
    info "Stopping $name (pid $pid)…"
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
    for _ in {1..20}; do kill -0 "$pid" 2>/dev/null || break; sleep 0.5; done
    kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
    ok "$name stopped"
  fi
  rm -f "$file"
}

free_port() {
  command -v lsof >/dev/null 2>&1 || { warn "lsof not found: cannot free port $1"; return; }
  local pids; pids="$(lsof -nP -t -iTCP:"$1" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    warn "Killing what still listens on port $1 ($pids)"
    kill -TERM $pids 2>/dev/null || true
    sleep 1
    kill -KILL $pids 2>/dev/null || true
  fi
}

start() {
  local mode="auto"
  for arg in "$@"; do
    case "$arg" in
      --docker-api) mode="docker" ;;
      --local-api) mode="local" ;;
      *) fail "Unknown option $arg" ;;
    esac
  done
  need docker "Docker Desktop or Docker Engine with the compose plugin"
  need curl "used to wait for the servers"
  need npm "Node 24 + npm"
  docker info >/dev/null 2>&1 || fail "Docker is not running."

  if [[ ! -f "$ROOT/.env" && -f "$ROOT/.env.example" ]]; then
    cp "$ROOT/.env.example" "$ROOT/.env"
    info "Created .env from .env.example"
  fi

  if [[ "$mode" == "auto" ]]; then
    if (( $(java_major) >= 25 )); then mode="local"; else mode="docker"; fi
  fi
  if [[ "$mode" == "local" ]] && (( $(java_major) < 25 )); then
    fail "--local-api needs JDK 25+ (found $(java_major)). Use --docker-api."
  fi

  info "Starting infrastructure (Postgres, Redis, MinIO, Mailpit)…"
  compose up -d --wait database redis minio smtp

  if [[ "$mode" == "docker" ]]; then
    info "Building and starting the API container (first build takes a few minutes)…"
    compose --profile app up -d --build api
    echo docker >"$STATE/api.mode"
    wait_for "API" "$API_URL" 300
  else
    compose --profile app stop api >/dev/null 2>&1 || true
    if [[ -f "$STATE/api.pid" ]] && kill -0 "$(cat "$STATE/api.pid")" 2>/dev/null; then
      ok "API already running (pid $(cat "$STATE/api.pid"))"
    else
      port_busy "$API_PORT" && fail "Port $API_PORT is already used. Run: ./scripts/dev.sh stop --force"
      info "Starting the API with Maven (log: .dev/api.log)…"
      chmod +x "$ROOT/backend/mvnw" 2>/dev/null || true
      spawn api "$ROOT/backend" ./mvnw -q spring-boot:run
      echo local >"$STATE/api.mode"
      wait_for "API" "$API_URL" 300 "$STATE/api.pid"
    fi
  fi

  if [[ -f "$STATE/web.pid" ]] && kill -0 "$(cat "$STATE/web.pid")" 2>/dev/null; then
    ok "Web app already running (pid $(cat "$STATE/web.pid"))"
  else
    port_busy "$WEB_PORT" && fail "Port $WEB_PORT is already used. Run: ./scripts/dev.sh stop --force"
    if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
      info "Installing frontend dependencies…"
      (cd "$ROOT/frontend" && npm install)
    fi
    info "Starting the web app (log: .dev/web.log)…"
    spawn web "$ROOT/frontend" npm start
    wait_for "Web app" "$WEB_URL" 180 "$STATE/web.pid"
  fi

  echo
  ok "AutoCare is running"
  printf '  Web       %s\n  API       http://localhost:%s/api   (Swagger: /api/docs)\n  Mailpit   http://localhost:8025\n  MinIO     http://localhost:9001\n' \
    "$WEB_URL" "$API_PORT"
  printf '  Stop with ./scripts/dev.sh stop\n'
}

stop() {
  local keep_infra=false force=false
  for arg in "$@"; do
    case "$arg" in
      --keep-infra) keep_infra=true ;;
      --force) force=true ;;
      *) fail "Unknown option $arg" ;;
    esac
  done
  kill_group web
  kill_group api
  if $force; then
    free_port "$WEB_PORT"
    free_port "$API_PORT"
  fi
  rm -f "$STATE/api.mode"
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    if $keep_infra; then
      compose --profile app stop api >/dev/null 2>&1 || true
      ok "API container stopped, infrastructure kept"
    else
      info "Stopping the containers (data volumes are kept)…"
      compose --profile app down
      ok "Containers stopped"
    fi
  else
    warn "Docker is not running: containers left as they are"
  fi
}

status() {
  for name in api web; do
    local file="$STATE/$name.pid"
    if [[ -f "$file" ]] && kill -0 "$(cat "$file")" 2>/dev/null; then
      ok "$name process running (pid $(cat "$file"))"
    fi
  done
  http_up "$API_URL" && ok "API answers on :$API_PORT" || warn "API not answering on :$API_PORT"
  http_up "$WEB_URL" && ok "Web app answers on :$WEB_PORT" || warn "Web app not answering on :$WEB_PORT"
  docker info >/dev/null 2>&1 && compose --profile app ps || warn "Docker is not running"
}

logs() {
  local which="${1:-api}"
  case "$which" in
    api)
      if [[ "$(cat "$STATE/api.mode" 2>/dev/null)" == "docker" ]]; then
        compose --profile app logs -f api
      else
        tail -n 200 -f "$STATE/api.log"
      fi
      ;;
    web) tail -n 200 -f "$STATE/web.log" ;;
    *) fail "logs takes api or web" ;;
  esac
}

command="${1:-}"
shift || true
case "$command" in
  start) start "$@" ;;
  stop) stop "$@" ;;
  restart) stop; start "$@" ;;
  status) status ;;
  logs) logs "$@" ;;
  *) sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
