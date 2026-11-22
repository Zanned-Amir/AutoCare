# autocare-ai

AI assistant microservice for AutoCare (FastAPI + Kafka).

```
Angular ──HTTP──> Spring ──HTTP + SSE──> autocare-ai ──> LLM
                    │                       ▲   │
                    └──> autocare.events ───┘   │   (Kafka)
                    <─── assistant.events <─────┘
```

- **HTTP** `POST /chat`: called only by the Spring backend (header `X-Internal-Token`).
  The answer is streamed as Server-Sent Events: `data: {"delta": "..."}` and finally `data: [DONE]`.
- **Kafka in** `autocare.events`: `VehicleSaved`, `VehicleDeleted`, `ServiceRequestCompleted`
  (sent by the Spring `assistant` module). Used to know the user's cars. Read from the beginning
  on every start (no consumer group), which rebuilds the in-memory context; replayed events never
  send a suggestion again.
- **Kafka out** `assistant.events`: `MaintenanceReminderSuggested` once, when a car passes
  `SERVICE_INTERVAL_KM` (10 000 km) since its last completed service request. Spring turns it into
  an in-app notification.

Event envelope (both topics, key = userId):

```json
{ "eventId": "uuid", "type": "VehicleSaved", "occurredAt": "2026-11-22T10:00:00Z",
  "userId": 42, "payload": { "vehicleId": 7, "ownerId": 42, "brand": "Renault", "model": "Clio",
  "year": 2019, "mileage": 61000 } }
```

## Run

From the repo root: `docker compose -f docker-compose.dev.yml --profile app up -d --build`

- Swagger: http://localhost:8000/docs
- Kafka UI: http://localhost:8090

LLM: `LLM_PROVIDER=mock` (default) answers without any model. For a real model set
`LLM_PROVIDER=openai` and point `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` at any
OpenAI-compatible API (Ollama: `http://host.docker.internal:11434/v1`, model `llama3.2`).

Try it:

```bash
curl -N -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" -H "X-Internal-Token: dev-internal-token" \
  -d '{"userId":42,"message":"Ma voiture fait un bruit au freinage"}'
```

## Develop

```bash
cd ai-service
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements-dev.txt
pytest                      # no Kafka needed (TestKafkaBroker)
uvicorn app.main:app --reload   # needs Kafka on localhost:9094
```
