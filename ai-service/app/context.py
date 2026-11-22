"""What the assistant knows about each user, built from Kafka events.

Kept in memory: on start the consumer reads `autocare.events` from the
beginning (no consumer group) and rebuilds it. Move it to the service's own
database when it grows.
"""

from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class VehicleInfo:
    vehicle_id: int
    label: str = ""
    mileage: int | None = None
    last_service_mileage: int | None = None
    reminder_sent: bool = False


@dataclass
class UserContext:
    vehicles: dict[int, VehicleInfo] = field(default_factory=dict)

    def summary(self) -> str:
        if not self.vehicles:
            return "Aucun véhicule enregistré."
        lines = []
        for v in self.vehicles.values():
            parts = [v.label or f"Véhicule {v.vehicle_id}"]
            if v.mileage is not None:
                parts.append(f"{v.mileage} km")
            if v.last_service_mileage is not None:
                parts.append(f"dernier entretien à {v.last_service_mileage} km")
            lines.append("- " + ", ".join(parts))
        return "\n".join(lines)


contexts: dict[int, UserContext] = defaultdict(UserContext)
seen_event_ids: set[str] = set()
