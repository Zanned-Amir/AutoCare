from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from faststream.kafka import TestKafkaBroker

from app.context import contexts, seen_event_ids
from app.events import assistant_events
from app.events import broker as kafka
from app.main import app

HEADERS = {"X-Internal-Token": "dev-internal-token"}
TOPIC = "autocare.events"


@pytest.fixture(autouse=True)
async def reset():
    contexts.clear()
    seen_event_ids.clear()
    async with TestKafkaBroker(kafka):  # no real Kafka needed in tests
        yield


def event(event_id: str, type_: str, **payload) -> dict:
    return {"eventId": event_id, "type": type_, "userId": 42, "payload": payload}


def test_health():
    with TestClient(app) as client:
        assert client.get("/health").json()["status"] == "UP"


def test_chat_refuses_calls_without_the_internal_token():
    with TestClient(app) as client:
        body = {"userId": 42, "message": "salut"}
        assert client.post("/chat", json=body).status_code == 422
        assert client.post("/chat", json=body, headers={"X-Internal-Token": "x"}).status_code == 401


def test_chat_streams_server_sent_events():
    with TestClient(app) as client:
        r = client.post("/chat", json={"userId": 42, "message": "bruit frein"}, headers=HEADERS)
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/event-stream")
        assert "bruit" in r.text
        assert r.text.rstrip().endswith("data: [DONE]")


async def test_events_build_the_context_and_suggest_a_service_once():
    await kafka.publish(event("e1", "VehicleSaved", vehicleId=7, brand="Renault", model="Clio", year=2019,
                              mileage=50000), topic=TOPIC)
    await kafka.publish(event("e2", "ServiceRequestCompleted", vehicleId=7, mileage=50000), topic=TOPIC)
    # a second delivery of the same event is ignored
    await kafka.publish(event("e2", "ServiceRequestCompleted", vehicleId=7, mileage=99), topic=TOPIC)

    assert "Renault Clio 2019" in contexts[42].summary()
    assert contexts[42].vehicles[7].last_service_mileage == 50000

    await kafka.publish(event("e3", "VehicleSaved", vehicleId=7, brand="Renault", model="Clio", year=2019,
                              mileage=61000), topic=TOPIC)
    await kafka.publish(event("e4", "VehicleSaved", vehicleId=7, brand="Renault", model="Clio", year=2019,
                              mileage=62000), topic=TOPIC)

    assistant_events.mock.assert_called_once()
    sent = assistant_events.mock.call_args.args[0]
    assert sent["type"] == "MaintenanceReminderSuggested"
    assert sent["userId"] == 42
    assert sent["payload"] == {"vehicleId": 7, "mileage": 61000, "kmSinceLastService": 11000}

    await kafka.publish(event("e5", "VehicleDeleted", vehicleId=7, ownerId=42), topic=TOPIC)
    assert contexts[42].vehicles == {}


async def test_replayed_old_events_rebuild_the_context_without_suggesting():
    old = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    await kafka.publish(event("o1", "ServiceRequestCompleted", vehicleId=7, mileage=10000), topic=TOPIC)
    await kafka.publish({**event("o2", "VehicleSaved", vehicleId=7, brand="Kia", model="Rio", year=2020,
                                 mileage=30000), "occurredAt": old}, topic=TOPIC)

    assert contexts[42].vehicles[7].mileage == 30000
    assistant_events.mock.assert_not_called()
