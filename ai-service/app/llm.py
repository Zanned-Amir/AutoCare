from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from .config import settings
from .schemas import ChatMessage

SYSTEM_PROMPT = """Tu es l'assistant d'AutoCare, une plateforme d'entretien automobile en Tunisie.
Tu aides le client à comprendre l'entretien de sa voiture, à décrire un symptôme
et à choisir le bon service. Réponds dans la langue du client (français, arabe,
derja ou anglais), de façon courte et claire. Tu ne réserves jamais toi-même :
tu proposes, le client confirme dans l'application. En cas de danger (freins,
direction, fumée), conseille d'arrêter de rouler et de contacter un garage.

Véhicules du client :
{vehicles}
"""


async def stream_answer(
    message: str, history: list[ChatMessage], vehicles: str
) -> AsyncIterator[str]:
    if settings.llm_provider == "mock":
        reply = f"(mode démo) J'ai bien reçu : « {message} ». Vos véhicules :\n{vehicles}"
        for word in reply.split(" "):
            yield word + " "
        return

    client = AsyncOpenAI(base_url=settings.llm_base_url, api_key=settings.llm_api_key)
    messages = [{"role": "system", "content": SYSTEM_PROMPT.format(vehicles=vehicles)}]
    messages += [m.model_dump() for m in history[-10:]]
    messages.append({"role": "user", "content": message})

    stream = await client.chat.completions.create(
        model=settings.llm_model, messages=messages, stream=True
    )
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
