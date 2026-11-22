import json
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse

from .config import settings
from .context import contexts
from .events import broker
from .llm import stream_answer
from .schemas import ChatRequest



@asynccontextmanager
async def lifespan(_: FastAPI):
    await broker.start()
    yield
    await broker.stop()


app = FastAPI(title="AutoCare AI", version="0.1.0", lifespan=lifespan)


def internal_only(x_internal_token: str = Header()) -> None:
    if x_internal_token != settings.internal_token:
        raise HTTPException(status_code=401, detail="Invalid internal token")


@app.get("/health")
async def health() -> dict:
    return {"status": "UP", "llm": settings.llm_provider}


@app.post("/chat", dependencies=[Depends(internal_only)])
async def chat(req: ChatRequest) -> StreamingResponse:
    vehicles = contexts[req.user_id].summary()

    async def sse():
        try:
            async for delta in stream_answer(req.message, req.history, vehicles):
                yield f"data: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
        except Exception:
            yield f"data: {json.dumps({'error': 'ASSISTANT_UNAVAILABLE'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(sse(), media_type="text/event-stream")
