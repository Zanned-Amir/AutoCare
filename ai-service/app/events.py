"""Kafka side: listen to AutoCare events, publish assistant events."""

import logging
from datetime import UTC, datetime

from faststream.kafka import KafkaBroker

from .config import settings
from .context import UserContext, VehicleInfo, contexts, seen_event_ids
from .schemas import Event

log = logging.getLogger(__name__)

broker = KafkaBroker(settings.kafka_bootstrap)
assistant_events = broker.publisher(settings.topic_out)

# Events older than this only rebuild the context: replaying the topic on
# start must not send the same suggestions again.
started_at = datetime.now(UTC)


@broker.subscriber(settings.topic_in, auto_offset_reset="earliest")
async def on_autocare_event(event: Event) -> None:
    # Kafka may deliver twice
    if event.event_id in seen_event_ids:
        return
    seen_event_ids.add(event.event_id)

    ctx = contexts[event.user_id]
    p = event.payload

    match event.type:
        case "VehicleSaved":
            vehicle = vehicle_of(ctx, p)
            vehicle.label = f"{p.get('brand', '')} {p.get('model', '')} {p.get('year', '')}".strip()
            vehicle.mileage = p.get("mileage")
            if event.occurred_at >= started_at:
                await maybe_suggest_service(event.user_id, vehicle)
        case "VehicleDeleted":
            ctx.vehicles.pop(int(p["vehicleId"]), None)
        case "ServiceRequestCompleted":
            vehicle = vehicle_of(ctx, p)
            vehicle.last_service_mileage = p.get("mileage")
            vehicle.mileage = max(vehicle.mileage or 0, p.get("mileage") or 0)
            vehicle.reminder_sent = False
        case _:
            log.debug("Ignored event type %s", event.type)


def vehicle_of(ctx: UserContext, payload: dict) -> VehicleInfo:
    vehicle_id = int(payload["vehicleId"])
    return ctx.vehicles.setdefault(vehicle_id, VehicleInfo(vehicle_id))


async def maybe_suggest_service(user_id: int, vehicle: VehicleInfo) -> None:
    if vehicle.mileage is None or vehicle.last_service_mileage is None or vehicle.reminder_sent:
        return
    since = vehicle.mileage - vehicle.last_service_mileage
    if since < settings.service_interval_km:
        return
    vehicle.reminder_sent = True
    await assistant_events.publish(
        Event(
            type="MaintenanceReminderSuggested",
            userId=user_id,
            payload={
                "vehicleId": vehicle.vehicle_id,
                "mileage": vehicle.mileage,
                "kmSinceLastService": since,
            },
        ).model_dump(mode="json", by_alias=True),
        key=str(user_id).encode(),
    )
