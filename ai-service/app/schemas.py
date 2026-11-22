from datetime import UTC, datetime
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    user_id: int = Field(alias="userId")
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default=[], max_length=20)

    model_config = {"populate_by_name": True}


class Event(BaseModel):
    """Same envelope in both topics. The Kafka key is the user id."""

    event_id: str = Field(default_factory=lambda: str(uuid4()), alias="eventId")
    type: str
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(UTC), alias="occurredAt")
    user_id: int = Field(alias="userId")
    payload: dict[str, Any] = {}

    model_config = {"populate_by_name": True}
